# Telegram-protected checklist — setup & deployment

This adds an access gate + Telegram notifications to the training tracker,
built with Cloudflare Pages Functions. All secrets stay server-side.

## What was added

```
functions/
  api/
    verify-code.js        POST — validates an 8-char code, issues a session token
    check-task.js         POST — sends "task completed" to the Telegram group
    telegram-webhook.js   POST — bot handler: /code → generates & stores a code
pages/training-tracker/
    gate.css              login overlay + toast styling
    gate.js               login logic, session storage, task reporting
pages/training-tracker.html   gate overlay markup + includes (body starts locked)
pages/training-tracker/script.js   sends the task name to Telegram on check
wrangler.toml             Pages + KV binding config
.dev.vars.example         template for local secrets
```

## How it works

1. A user messages the Telegram bot `/code`. The bot generates an 8-character
   code, stores it in KV (`code:<CODE>`, 1-hour TTL) and replies with it.
2. On the tracker page the user enters the code. `verify-code` checks KV,
   **deletes the code (one-time use)**, and returns a random session token
   stored as `sess:<TOKEN>` (1-hour TTL). The token is kept in `localStorage`.
3. Checking a task calls `check-task` with `Authorization: Bearer <token>`.
   The function validates the session, then calls Telegram `sendMessage`.
   Message format: `✅ Task completed: *<task>*`.

Secrets (`BOT_TOKEN`, `CHAT_ID`) are only read inside Functions — never sent to
the browser.

## 1. Create the Telegram bot

1. In Telegram, talk to **@BotFather** → `/newbot` → note the **bot token**.
2. Add the bot to your target group and make it an admin (so it can post).
3. Get the **chat id** of the group: add **@userinfobot** to the group, or call
   `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` after posting a message.
   Group ids look like `-1001234567890`.

## 2. Create the KV namespace

```bash
npx wrangler kv namespace create CODES
```

Copy the returned `id` into `wrangler.toml` (replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`).
In the Pages dashboard you can instead bind it under
**Settings → Functions → KV namespace bindings** with variable name `CODES`.

## 3. Set secrets

**Local dev:** copy the template and fill it in:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars → BOT_TOKEN, CHAT_ID, (optional) WEBHOOK_SECRET
```

**Production (Pages dashboard):** Settings → Environment variables → add for
**Production and Preview**, marked as **encrypted secret**:

- `BOT_TOKEN`
- `CHAT_ID`
- `WEBHOOK_SECRET` (optional but recommended)

## 4. Test locally

```bash
npx wrangler pages dev .
```

Open the printed URL, go to `/pages/training-tracker.html`.

To generate a code without Telegram while developing, write one straight to the
local KV:

```bash
npx wrangler kv key put --binding=CODES "code:ABCD2345" "{}" --local
```

Then enter `ABCD2345` on the page. Checking a task will call the real Telegram
API (needs a valid `BOT_TOKEN`/`CHAT_ID` in `.dev.vars`).

## 5. Deploy

Push to the branch connected to your Pages project, or:

```bash
npx wrangler pages deploy .
```

## 6. Register the Telegram webhook

Point the bot at the deployed webhook (run once):

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-site>/api/telegram-webhook&secret_token=<WEBHOOK_SECRET>"
```

Verify: `https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo`
Then send `/code` to the bot — you should get a code back.

## Security notes

- Codes are single-use and expire after 1 hour; session tokens expire after 1 hour.
- `check-task` rejects requests without a valid session token (401), so the
  group can't be spammed anonymously.
- `WEBHOOK_SECRET` lets the webhook reject calls that aren't from Telegram.
- Anyone who can message the bot can currently obtain a code. To restrict this,
  add an allow-list check on `msg.from.id` in `telegram-webhook.js`.
