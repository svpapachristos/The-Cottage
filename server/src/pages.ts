// The two pages the server draws itself: signing in, and letting Claude in as a connector.
const esc = (v: string) => String(v ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const shell = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0c0618"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% -10%,#241240 0%,#0c0618 60%);color:#ffe1fa;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.box{width:min(420px,calc(100% - 32px));background:#150c27;border:2px solid #dc5aff;border-radius:16px;padding:22px 24px}h1{margin:0 0 6px;font-size:26px;font-weight:600}p{color:#cbb6e6;margin:8px 0}
input{width:100%;box-sizing:border-box;background:#1f1336;color:#ffe1fa;border:1.5px solid #34234f;border-radius:8px;padding:10px 12px;font:inherit;margin:10px 0}input:focus{outline:none;border-color:#dc5aff}
button{font:inherit;font-weight:600;border-radius:8px;padding:9px 16px;cursor:pointer;border:1.5px solid #dc5aff;background:#dc5aff;color:#0c0618}button.no{background:none;color:#dc5aff}.err{color:#ff9a80}.warn{color:#ffd070}.row{display:flex;gap:8px;margin-top:6px}</style></head><body><div class="box">${body}</div></body></html>`;

export function consentPage(o: { clientName: string; clientDomain?: string; redirectHost: string; loopback: boolean; handle: string; needPass: boolean; error?: string }) {
  return shell("Let Claude into the cottage?", `<h1>Let ${esc(o.clientName)} into the cottage?</h1>
    <p>${o.clientDomain ? `Published by <strong>${esc(o.clientDomain)}</strong>.` : "This app registered itself, so its name isn't verified."} If you allow it, it can read and write everything in your cottage, and access goes to <strong>${esc(o.redirectHost)}</strong>.</p>
    ${o.loopback ? `<p class="warn">This sends access to an app on your computer. Continue only if you just started connecting from it.</p>` : ""}
    ${o.error ? `<p class="err">${esc(o.error)}</p>` : ""}
    <form method="post"><input type="hidden" name="handle" value="${esc(o.handle)}">
      ${o.needPass ? `<input type="password" name="passphrase" placeholder="Your cottage passphrase" autocomplete="current-password" required autofocus>` : ""}
      <div class="row"><button name="decision" value="approve">Allow</button><button class="no" name="decision" value="deny" formnovalidate>Deny</button></div></form>`);
}
export function messagePage(title: string, text: string, status = 400) {
  return new Response(shell(title, `<h1>${esc(title)}</h1><p>${esc(text)}</p>`), { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
