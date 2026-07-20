// POST /api/check-task
// Sends a "task completed" message to the configured Telegram group.
// Requires a valid session token (issued by /api/verify-code) so the group
// cannot be spammed by anonymous callers. BOT_TOKEN and CHAT_ID never leave
// the server.

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CODES) {
    return json({ error: "KV namespace CODES is not bound" }, 500);
  }

  // --- Authorise the caller via the session token ---
  const token = bearerToken(request);
  if (!token || !(await env.CODES.get("sess:" + token))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // --- Validate input ---
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const task =
    body && typeof body.task === "string" ? body.task.trim() : "";
  if (!task || task.length > 300) {
    return json({ error: "Invalid task" }, 400);
  }

  if (!env.BOT_TOKEN || !env.CHAT_ID) {
    return json({ error: "Server not configured" }, 500);
  }

  // --- Send to Telegram ---
  const text = "✅ Task completed: *" + escapeMarkdown(task) + "*";
  const tgRes = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!tgRes.ok) {
    return json({ error: "Telegram send failed" }, 502);
  }

  return json({ ok: true }, 200);
}

function bearerToken(request) {
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+([A-Za-z0-9]+)$/);
  return m ? m[1] : null;
}

// Escape the characters that legacy Telegram Markdown treats as formatting,
// so a task name can't break the message or inject markup.
function escapeMarkdown(s) {
  return s.replace(/([_*`\[])/g, "\\$1");
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
