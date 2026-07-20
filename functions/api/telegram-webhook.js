// POST /api/telegram-webhook
// Telegram calls this endpoint for every update sent to the bot.
// When a user sends /start or /code, we generate an 8-character access code,
// store it in KV (1 hour TTL, one-time use) and reply with it.
//
// Set the webhook once (see docs/telegram-setup.md):
//   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
//     ?url=https://<your-site>/api/telegram-webhook
//     &secret_token=<WEBHOOK_SECRET>

const CODE_TTL = 3600; // 1 hour
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

export async function onRequestPost(context) {
  const { request, env } = context;

  // Verify the request really came from Telegram (if a secret is configured).
  if (env.WEBHOOK_SECRET) {
    const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (provided !== env.WEBHOOK_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return ok(); // Never make Telegram retry on a bad payload.
  }

  const msg = update && (update.message || update.edited_message);
  if (!msg || typeof msg.text !== "string" || !msg.chat) {
    return ok();
  }

  const chatId = msg.chat.id;
  const text = msg.text.trim().toLowerCase();

  if (text === "/start" || text === "/code" || text.startsWith("/code")) {
    if (!env.CODES) {
      await sendMessage(env, chatId, "⚠️ Server not configured (KV missing).");
      return ok();
    }
    const code = generateCode();
    await env.CODES.put(
      "code:" + code,
      JSON.stringify({ by: msg.from && msg.from.id, at: Date.now() }),
      { expirationTtl: CODE_TTL }
    );
    await sendMessage(
      env,
      chatId,
      "🔐 Your PILOT access code:\n\n`" +
        code +
        "`\n\nIt expires in 1 hour and can be used once. Enter it on the training tracker page."
    );
  } else {
    await sendMessage(
      env,
      chatId,
      "Send /code to get an 8-character access code for the PILOT training tracker."
    );
  }

  return ok();
}

function generateCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function sendMessage(env, chatId, text) {
  if (!env.BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
