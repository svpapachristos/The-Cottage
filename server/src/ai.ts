// Munin's brain on the Cottage server: a small open model on Cloudflare's Workers AI (free up to 10,000 Neurons a day).
import type { Env } from "./index";

const FALLBACKS = ["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/mistralai/mistral-small-3.1-24b-instruct", "@cf/meta/llama-3.1-8b-instruct-fast"];
type Msg = { role: "system" | "user" | "assistant"; content: string };

async function run(env: Env, messages: Msg[], maxTokens: number): Promise<string> {
  const models = [env.AI_MODEL, ...FALLBACKS].filter((m, i, a) => m && a.indexOf(m) === i) as string[];
  let last: unknown = null;
  for (const model of models) {
    try {
      const out: any = await env.AI.run(model as any, { messages, max_tokens: maxTokens } as any);
      const text = typeof out === "string" ? out : out?.response ?? out?.result?.response ?? out?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text;
      if (out?.response && typeof out.response === "object") return JSON.stringify(out.response);
    } catch (e) { last = e; }
  }
  throw last || new Error("no model answered");
}
const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "\n(cut short)" : s);

// Ask for JSON and pull the first JSON value out of the answer.
export async function aiJson(env: Env, prompt: string): Promise<unknown> {
  const text = await run(env, [
    { role: "system", content: "You reply with valid JSON only. No commentary, no code fences." },
    { role: "user", content: trim(prompt, 24000) },
  ], 1200);
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (!m) throw new Error("the model didn't return JSON");
  return JSON.parse(m[0]);
}
export async function aiChat(env: Env, messages: Msg[]): Promise<string> {
  const msgs = messages.slice(-8).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: trim(String(m.content || ""), 60000) })) as Msg[];
  return run(env, msgs, 900);
}
