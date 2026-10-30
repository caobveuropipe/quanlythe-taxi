// Script: scripts/setup-telegram-webhook.mjs
// Purpose: Register Telegram Webhook with secret_token for fail-closed verification

import fs from 'fs';
import path from 'path';

// Load .env if exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && !process.env[k]) {
        process.env[k] = v.join('=');
      }
    }
  });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://quanly-thetaxi.vercel.app/api/telegram';

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in environment or .env');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('❌ Error: TELEGRAM_WEBHOOK_SECRET is not set in environment or .env');
  process.exit(1);
}

async function run() {
  console.log(`Setting up webhook to ${WEBHOOK_URL}...`);
  const setRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  });
  const setJson = await setRes.json();
  console.log('setWebhook response:', setJson);

  console.log('Verifying webhook status...');
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const infoJson = await infoRes.json();
  console.log('getWebhookInfo response:', infoJson);
}

run().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

