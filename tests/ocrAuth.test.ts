import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTelegramInitData } from '../server/ocrAuth';

const token = 'test-telegram-bot-token';

function signedInitData(authDate: number, user = { id: 12345 }, overrideHash?: string): string {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user), query_id: 'query-1' });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  params.set('hash', overrideHash || hash);
  return params.toString();
}

test('accepts a valid recent Telegram launch', () => {
  assert.equal(verifyTelegramInitData(signedInitData(Math.floor(Date.now() / 1000)), token), '12345');
});

test('rejects tampered and expired Telegram launches', () => {
  const valid = signedInitData(Math.floor(Date.now() / 1000));
  assert.equal(verifyTelegramInitData(valid.replace('12345', '99999'), token), null);
  assert.equal(verifyTelegramInitData(signedInitData(Math.floor(Date.now() / 1000) - 90000), token), null);
  assert.equal(verifyTelegramInitData(signedInitData(Math.floor(Date.now() / 1000), { id: 12345 }, '0'.repeat(64)), token), null);
});
