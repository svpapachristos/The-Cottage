// Signing in: one passphrase that only Sophia knows, set as a Worker secret (COTTAGE_PASSPHRASE).
// A successful sign-in gets a long-lived session cookie; sessions live in KV, stored only as hashes.
import type { Env } from "./index";

const COOKIE = "__Host-cottage";
const SESSION_DAYS = 90;
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export async function passphraseMatches(env: Env, given: string): Promise<boolean> {
  const real = env.COTTAGE_PASSPHRASE;
  if (!real || !given) return false;
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(real))]);
  return (crypto.subtle as any).timingSafeEqual(a, b);
}

// Slow down guessing: at most 8 wrong passphrases per 15 minutes from one address.
export async function tooManyTries(env: Env, req: Request): Promise<boolean> {
  const key = "login-fail:" + (req.headers.get("CF-Connecting-IP") || "local");
  return Number((await env.OAUTH_KV.get(key)) || 0) >= 8;
}
export async function noteFailure(env: Env, req: Request) {
  const key = "login-fail:" + (req.headers.get("CF-Connecting-IP") || "local");
  const n = Number((await env.OAUTH_KV.get(key)) || 0) + 1;
  await env.OAUTH_KV.put(key, String(n), { expirationTtl: 15 * 60 });
}

export async function startSession(env: Env): Promise<string> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  await env.OAUTH_KV.put("session:" + (await sha256(token)), JSON.stringify({ created: Date.now() }), { expirationTtl: SESSION_DAYS * 86400 });
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export async function endSession(env: Env, req: Request): Promise<string> {
  const t = readCookie(req);
  if (t) await env.OAUTH_KV.delete("session:" + (await sha256(t)));
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function readCookie(req: Request): string {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  return m ? m[1] : "";
}
export async function signedIn(env: Env, req: Request): Promise<boolean> {
  const t = readCookie(req);
  return !!t && !!(await env.OAUTH_KV.get("session:" + (await sha256(t))));
}
