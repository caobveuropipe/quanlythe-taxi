import assert from 'node:assert/strict';
import test from 'node:test';
import { notifyReleasedCardOwner } from '../api/telegram';

function fakeDb(telegramId: string | null) {
  return {
    from(table: string) {
      const query: any = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() {
          if (table === 'taxi_requests') return { data: { employee_id: 'user-1' }, error: null };
          return { data: { telegram_id: telegramId }, error: null };
        },
      };
      return query;
    },
  };
}

test('releasing an uncollected card sends the employee the reason and request id', async () => {
  let sentText = '';
  const send = async (chatId: string | number, text: string) => {
    assert.equal(chatId, '123456');
    sentText = text;
    return { ok: true };
  };
  const result = await notifyReleasedCardOwner('REQ-2026-108', '0006', 'Khách <hủy> lịch', fakeDb('123456') as any, send);
  assert.equal(result.sent, true);
  assert.match(sentText, /REQ-2026-108/);
  assert.match(sentText, /0006/);
  assert.match(sentText, /Khách &lt;hủy&gt; lịch/);
});

test('missing Telegram link is reported instead of claiming that a message was sent', async () => {
  const result = await notifyReleasedCardOwner('REQ-2026-108', '0006', null, fakeDb(null) as any);
  assert.equal(result.sent, false);
  assert.match(result.error || '', /chưa liên kết Telegram/);
});
