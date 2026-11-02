import assert from 'node:assert/strict';
import test from 'node:test';
import { executeAssignCardHelper } from '../api/telegram';

function fakeDb(cardSnapshots: string[][], rpcResults: any[]) {
  const rpcCalls: any[] = [];
  let cardReads = 0;
  const db = {
    from(table: string) {
      const query: any = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        async maybeSingle() {
          assert.equal(table, 'taxi_requests');
          return { data: { status: 'pending_admin' } };
        },
        async limit() {
          assert.equal(table, 'taxi_cards');
          const cards = cardSnapshots[Math.min(cardReads++, cardSnapshots.length - 1)];
          return { data: cards.map((code) => ({ code })), error: null };
        },
      };
      return query;
    },
    async rpc(_name: string, args: any) {
      rpcCalls.push(args);
      return rpcResults[rpcCalls.length - 1];
    },
  };
  return { db, rpcCalls };
}

test('one approval reserves an available card in the first RPC call', async () => {
  const { db, rpcCalls } = fakeDb([['0006', '3571']], [{ data: { result: 'assigned_new', card_code: '0006' }, error: null }]);
  const result = await executeAssignCardHelper({ requestId: 'REQ-2026-108', operatorId: 'admin-1' }, db as any);
  assert.equal(result.success, true);
  assert.equal(result.data?.card_code, '0006');
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].p_card_code, '0006');
});

test('an inconsistent waitlist result retries with the card that is now available', async () => {
  const { db, rpcCalls } = fakeDb([[], ['0006']], [
    { data: { result: 'waitlisted' }, error: null },
    { data: { result: 'assigned_new', card_code: '0006' }, error: null },
  ]);
  const result = await executeAssignCardHelper({ requestId: 'REQ-2026-108', operatorId: 'admin-1' }, db as any);
  assert.equal(result.success, true);
  assert.equal(result.data?.card_code, '0006');
  assert.deepEqual(rpcCalls.map((call) => call.p_card_code), [null, '0006']);
});

test('a request is waitlisted only when inventory has no available card', async () => {
  const { db, rpcCalls } = fakeDb([[]], [{ data: { result: 'waitlisted' }, error: null }]);
  const result = await executeAssignCardHelper({ requestId: 'REQ-2026-108', operatorId: 'admin-1' }, db as any);
  assert.equal(result.success, true);
  assert.equal(result.data?.result, 'waitlisted');
  assert.equal(rpcCalls.length, 1);
});
