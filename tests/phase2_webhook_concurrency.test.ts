import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import handler from '../api/telegram';

const BOT_TOKEN = 'test_bot_token_12345';
const WEBHOOK_SECRET = 'secret_webhook_token_abcdef123456';

function signedInitData(authDate: number, user = { id: 12345, first_name: 'Test' }, overrideHash?: string): string {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user), query_id: 'query-1' });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  params.set('hash', overrideHash || hash);
  return params.toString();
}

function createMockReqRes({
  method = 'POST',
  headers = {},
  body = {},
}: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  let statusCode = 200;
  let responseData: any = null;
  const responseHeaders: Record<string, string> = {};

  const req = {
    method,
    headers,
    body,
  };

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(key: string, val: string) {
      responseHeaders[key] = val;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    end() {
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
  };

  return { req, res };
}

test('Phase 2: Telegram Webhook Fail-Closed Security (Task 2.0 & Task 2.2)', async (t) => {
  const originalEnvSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;

  await t.test('Fails-Closed with 500 when TELEGRAM_WEBHOOK_SECRET is not configured in env', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const { req, res } = createMockReqRes({
      body: { message: { text: '/start', chat: { id: 100 } } },
    });
    await handler(req, res);
    assert.equal(res.getStatusCode(), 500);
    assert.match(res.getData().error, /TELEGRAM_WEBHOOK_SECRET is not configured/);
  });

  await t.test('Rejects with 401 when X-Telegram-Bot-Api-Secret-Token is missing', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { req, res } = createMockReqRes({
      headers: {},
      body: { message: { text: '/start', chat: { id: 100 } } },
    });
    await handler(req, res);
    assert.equal(res.getStatusCode(), 401);
    assert.match(res.getData().error, /Missing secret token/);
  });

  await t.test('Rejects with 401 when X-Telegram-Bot-Api-Secret-Token is incorrect', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const { req, res } = createMockReqRes({
      headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret-token' },
      body: { message: { text: '/start', chat: { id: 100 } } },
    });
    await handler(req, res);
    assert.equal(res.getStatusCode(), 401);
    assert.match(res.getData().error, /Invalid secret token/);
  });

  // Restore env
  if (originalEnvSecret) process.env.TELEGRAM_WEBHOOK_SECRET = originalEnvSecret;
  else delete process.env.TELEGRAM_WEBHOOK_SECRET;
  if (originalBotToken) process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
  else delete process.env.TELEGRAM_BOT_TOKEN;
});

test('Phase 2: Mini App Custom Action Authentication (EFR-09, EFR-12, EFR-27)', async (t) => {
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;

  await t.test('Rejects custom_action with 401 when init_data is missing', async () => {
    const { req, res } = createMockReqRes({
      body: { custom_action: 'assignCardAtomic', requestId: 'REQ-01' },
    });
    await handler(req, res);
    assert.equal(res.getStatusCode(), 401);
    assert.match(res.getData().error, /Invalid or missing Telegram initData/);
  });

  await t.test('Rejects custom_action with 401 when init_data signature is tampered', async () => {
    const validInitData = signedInitData(Math.floor(Date.now() / 1000));
    const tampered = validInitData.replace('12345', '99999');
    const { req, res } = createMockReqRes({
      body: { custom_action: 'assignCardAtomic', init_data: tampered, requestId: 'REQ-01' },
    });
    await handler(req, res);
    assert.equal(res.getStatusCode(), 401);
    assert.match(res.getData().error, /Invalid or missing Telegram initData/);
  });

  await t.test('Accepts valid init_data and proxies sendMessage without exposing bot token', async () => {
    const validInitData = signedInitData(Math.floor(Date.now() / 1000));
    const originalFetch = globalThis.fetch;
    let fetchCalledWith: any = null;

    globalThis.fetch = async (url: any, init: any) => {
      fetchCalledWith = { url, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ ok: true, result: { message_id: 888 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const { req, res } = createMockReqRes({
      body: {
        custom_action: 'sendMessage',
        init_data: validInitData,
        chat_id: 12345,
        text: 'Xin chào test',
      },
    });

    await handler(req, res);
    assert.equal(res.getStatusCode(), 200);
    assert.equal(res.getData().ok, true);
    assert.match(fetchCalledWith.url, /api\.telegram\.org\/bot.*\/sendMessage/);
    assert.equal(fetchCalledWith.body.chat_id, 12345);

    globalThis.fetch = originalFetch;
  });

  if (originalBotToken) process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
  else delete process.env.TELEGRAM_BOT_TOKEN;
});

test('Phase 2: Message Tracker Preservation on Partial Failures (EFR-27, EFR-28)', async (t) => {
  const fs = await import('fs');
  const path = await import('path');
  const telegramCode = fs.readFileSync(path.join(process.cwd(), 'api/telegram.ts'), 'utf8');
  const appContextCode = fs.readFileSync(path.join(process.cwd(), 'src/context/AppContext.tsx'), 'utf8');

  await t.test('api/telegram.ts only deletes tracker when allSucceeded is true and keepTracker is false', () => {
    assert.match(telegramCode, /const allSucceeded = editResults\.every/);
    assert.match(telegramCode, /if \(!keepTracker\) \{[\s\S]*?if \(allSucceeded\)/);
  });

  await t.test('AppContext.tsx only deletes tracker when allSucceeded is true and keepTracker is false', () => {
    assert.match(appContextCode, /const allSucceeded = editResults\.every/);
    assert.match(appContextCode, /if \(!keepTracker\) \{[\s\S]*?if \(allSucceeded\)/);
  });

  await t.test('createRequest in AppContext.tsx awaits tracker creation', () => {
    const createReqMatch = appContextCode.match(/const createRequest = async[\s\S]*?\/\/ 1b\. Direct Dispatch Card/);
    assert.ok(createReqMatch, 'createRequest function found');
    assert.doesNotMatch(createReqMatch[0], /\(async \(\) => \{/);
    assert.match(createReqMatch[0], /for \(const adminId of Array\.from\(recipientSet\)\)/);
    assert.match(createReqMatch[0], /await supabase\.from\('users'\)\.upsert/);
  });

  await t.test('Leader approval merges tracked messages without duplicate (chatId, messageId)', () => {
    assert.match(telegramCode, /combinedTracked\.push\(oldM\)/);
    assert.match(appContextCode, /combinedTracked\.push\(oldM\)/);
  });
});
