// The Cottage server's front door. Every request comes through here.
//   /mcp            the Claude connector (needs an OAuth token; see mcp.ts)
//   /authorize      the page where Sophia lets Claude in, with her passphrase
//   /oauth/*        token and registration endpoints (handled by the OAuth library)
//   /api/*          the app's own API (needs her session cookie)
//   everything else the app itself (the files in public/)
import { OAuthProvider, AuthorizationError, CimdFetchError } from "@cloudflare/workers-oauth-provider";
import { mcpHandler } from "./mcp";
import { changesSince, writeDoc, writeDocs, validId, COLS, type Col } from "./db";
import { passphraseMatches, tooManyTries, noteFailure, startSession, endSession, signedIn } from "./auth";
import { aiJson, aiChat } from "./ai";
import { consentPage, messagePage } from "./pages";

export interface Env {
  DB: D1Database;
  OAUTH_KV: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;
  AI_MODEL?: string;
  COTTAGE_PASSPHRASE?: string;   // a secret, set in the Cloudflare dashboard; never in code
  OAUTH_PROVIDER: any;           // added by the OAuth library
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

// ---- the app's API
async function api(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  if (path === "/api/login" && req.method === "POST") {
    if (!env.COTTAGE_PASSPHRASE) return json({ error: "no_passphrase", message: "Set COTTAGE_PASSPHRASE in the Cloudflare dashboard first." }, 503);
    if (await tooManyTries(env, req)) return json({ error: "slow_down", message: "Too many tries. Wait 15 minutes." }, 429);
    const body: any = await req.json().catch(() => ({}));
    if (!(await passphraseMatches(env, String(body.passphrase || "")))) { await noteFailure(env, req); return json({ error: "wrong", message: "That isn't the passphrase." }, 401); }
    return json({ ok: true }, 200, { "Set-Cookie": await startSession(env) });
  }
  if (!(await signedIn(env, req))) return json({ error: "signed_out" }, 401);
  // Changes must come from the app itself: a custom header can't be sent by another site without permission.
  if (req.method !== "GET" && req.headers.get("X-Cottage") !== "1") return json({ error: "bad_request" }, 400);

  if (path === "/api/me") return json({ ok: true });
  if (path === "/api/logout" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": await endSession(env, req) });
  if (path === "/api/sync" && req.method === "GET") return json(await changesSince(env.DB, Math.max(0, Number(url.searchParams.get("since")) || 0)));
  let m = path.match(/^\/api\/doc\/(items|projects|meta)\/([^/]+)$/);
  if (m) {
    const col = m[1] as Col, id = decodeURIComponent(m[2]);
    if (!validId(id)) return json({ error: "bad_id" }, 400);
    if (req.method === "PUT") { const data = await req.json().catch(() => null); if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "bad_body" }, 400); return json({ rev: await writeDoc(env.DB, col, id, data as any) }); }
    if (req.method === "DELETE") return json({ rev: await writeDoc(env.DB, col, id, null) });
  }
  if (path === "/api/batch" && req.method === "POST") {   // many writes at once (restoring a backup)
    const body: any = await req.json().catch(() => ({}));
    const ops = (Array.isArray(body.ops) ? body.ops : []).filter((o: any) => COLS.includes(o.col) && validId(String(o.id))).slice(0, 200);
    return json({ rev: ops.length ? await writeDocs(env.DB, ops.map((o: any) => ({ col: o.col, id: String(o.id), data: o.data && typeof o.data === "object" ? o.data : null }))) : 0, written: ops.length });
  }
  if (path === "/api/ai/json" && req.method === "POST") {
    const body: any = await req.json().catch(() => ({}));
    try { return json({ result: await aiJson(env, String(body.prompt || "")) }); } catch (e: any) { return json({ error: "ai_failed", message: String(e?.message || e) }, 502); }
  }
  if (path === "/api/ai/chat" && req.method === "POST") {
    const body: any = await req.json().catch(() => ({}));
    try { return json({ text: await aiChat(env, Array.isArray(body.messages) ? body.messages : []) }); } catch (e: any) { return json({ error: "ai_failed", message: String(e?.message || e) }, 502); }
  }
  return json({ error: "not_found" }, 404);
}

// ---- letting Claude in: the OAuth consent page
async function authorize(req: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  try {
    if (req.method === "GET") {
      const request = await oauth.parseAuthRequest(req);
      const details = await oauth.describeConsent(request);
      const consent = await oauth.beginConsent(request);
      consent.headers.set("Content-Type", "text/html; charset=utf-8");
      const page = consentPage({ clientName: details.clientName, clientDomain: details.clientDomain, redirectHost: details.redirectHost, loopback: details.redirectIsLoopback, handle: consent.handle, needPass: !(await signedIn(env, req)) });
      return new Response(page, { headers: consent.headers });
    }
    if (req.method === "POST") {
      const form = await req.formData(), handle = String(form.get("handle") || "");
      if (form.get("decision") !== "approve") { const denied = await oauth.denyConsent(req, handle); return new Response(null, { status: 302, headers: denied.headers }); }
      if (!(await signedIn(env, req))) {
        if (!env.COTTAGE_PASSPHRASE) return messagePage("Not set up yet", "Set COTTAGE_PASSPHRASE in the Cloudflare dashboard first.", 503);
        if (await tooManyTries(env, req)) return messagePage("Too many tries", "Wait 15 minutes, then start connecting again from Claude.", 429);
        if (!(await passphraseMatches(env, String(form.get("passphrase") || "")))) { await noteFailure(env, req); return messagePage("Wrong passphrase", "That isn't your cottage passphrase. Start connecting again from Claude to try once more.", 401); }
      }
      const approved = await oauth.approveConsent(req, handle, { scope: ["cottage"] });
      const { redirectTo } = await oauth.completeAuthorization({ request: approved.request, userId: "sophia", metadata: { label: "Claude connector" }, scope: approved.request.scope?.length ? approved.request.scope : ["cottage"], props: { userId: "sophia" } });
      approved.headers.set("Location", redirectTo);
      return new Response(null, { status: 302, headers: approved.headers });
    }
    return new Response(null, { status: 405 });
  } catch (error: any) {
    if (error instanceof AuthorizationError && (error as any).redirectTo) return Response.redirect((error as any).redirectTo, 302);
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) return messagePage("Couldn't connect", error instanceof AuthorizationError ? (error as any).description || "This request isn't valid." : "This app could not be verified.");
    throw error;
  }
}

const appHandler = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return api(req, env, url);
    if (url.pathname === "/authorize") return authorize(req, env);
    const res = await env.ASSETS.fetch(req);
    // keep the app from being framed by other sites
    const out = new Response(res.body, res); out.headers.set("X-Frame-Options", "DENY"); out.headers.set("Referrer-Policy", "same-origin");
    return out;
  },
};

// The OAuth library needs the server's own address; build one provider per address (workers.dev, a custom domain, local dev).
const providers = new Map<string, OAuthProvider<Env>>();
function providerFor(origin: string) {
  let p = providers.get(origin);
  if (!p) {
    p = new OAuthProvider<Env>({
      apiRoute: "/mcp", apiHandler: mcpHandler as any, defaultHandler: appHandler as any,
      authorizeEndpoint: "/authorize", tokenEndpoint: "/oauth/token", clientRegistrationEndpoint: "/oauth/register",
      scopesSupported: ["cottage"], requiredScopes: ["cottage"],
      resourceMetadata: { resource: origin + "/mcp", authorization_servers: [origin] } as any,
      clientIdMetadataDocumentEnabled: true,
      accessTokenTTL: 3600, refreshTokenTTL: 90 * 86400,
    } as any);
    providers.set(origin, p);
  }
  return p;
}
export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) { return providerFor(new URL(req.url).origin).fetch(req, env, ctx); },
};
