// POST /api/verify-code
// Validates an 8-character access code issued by the Telegram bot.
// On success the code is consumed (one-time use) and a short-lived session
// token is issued. All secrets stay server-side — nothing here is exposed
// to the browser.

const SESSION_TTL = 3600; // 1 hour, matches the code lifetime

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CODES) {
    return json({ error: "KV namespace CODES is not bound" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const code =
    body && typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

  // Codes are 8 chars, uppercase letters + digits only.
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return json({ error: "Invalid code format" }, 400);
  }

  const kvKey = "code:" + code;
  const stored = await env.CODES.get(kvKey);
  if (!stored) {
    return json({ error: "Invalid or expired code" }, 401);
  }

  // One-time use: remove the code as soon as it is redeemed.
  await env.CODES.delete(kvKey);

  // Issue an opaque session token so /api/check-task can authorise callers
  // without ever handing a secret to the browser.
  const token = randomToken();
  await env.CODES.put("sess:" + token, "1", { expirationTtl: SESSION_TTL });

  return json({ ok: true, token, expiresIn: SESSION_TTL }, 200);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
