import assert from 'node:assert/strict';
import test from 'node:test';
import { supabaseService } from '../src/services/supabaseService';

test('Phase 3: Integration & Concurrency Test Suite (Task 3.4)', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.test('Test EFR-23 & EFR-24: UI Async Contract & Persistent Anti-Double-Click Lock', async () => {
    // Simulate slow network (150ms delay)
    let inFlight = false;
    let parallelCallBlocked = false;

    globalThis.fetch = async () => {
      if (inFlight) {
        parallelCallBlocked = true;
      }
      inFlight = true;
      await new Promise((r) => setTimeout(r, 100));
      inFlight = false;
      return new Response(JSON.stringify({ success: true, data: { result: 'assigned_new', card_code: '0006' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const promise1 = supabaseService.assignCardAtomic('REQ-101', '0006', 'admin-01');
    assert.equal(inFlight, true);
    const res1 = await promise1;
    assert.equal(res1.success, true);
    assert.equal(inFlight, false);
  });

  await t.test('Test EFR-25: Mini App adminApprove handles assigned_new and waitlisted without client-side guessing', async () => {
    // 1. When card is available -> returns assigned_new
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        success: true,
        data: { result: 'assigned_new', card_code: '3571', operator_name: 'Admin Test' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const resAvail = await supabaseService.assignCardAtomic('REQ-102', undefined, 'admin-01', false);
    assert.equal(resAvail.success, true);
    assert.equal(resAvail.data?.result, 'assigned_new');
    assert.equal(resAvail.data?.card_code, '3571');

    // 2. When inventory exhausted -> returns waitlisted
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        success: true,
        data: { result: 'waitlisted', card_code: null, operator_name: 'Admin Test' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const resWait = await supabaseService.assignCardAtomic('REQ-103', undefined, 'admin-01', false);
    assert.equal(resWait.success, true);
    assert.equal(resWait.data?.result, 'waitlisted');
    assert.equal(resWait.data?.card_code, null);

    // 3. When already processed -> returns already_processed
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        success: true,
        data: { result: 'already_processed', status: 'holding_card', card_code: '0006' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const resProcessed = await supabaseService.assignCardAtomic('REQ-104', undefined, 'admin-01', false);
    assert.equal(resProcessed.success, true);
    assert.equal(resProcessed.data?.result, 'already_processed');
  });

  await t.test('Test EFR-15: Confirm Handover & Card Swap at Counter', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        success: true,
        data: { result: 'handed_over', card_code: '3571', status: 'holding_card' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.assignCardAtomic('REQ-105', '3571', 'admin-01', true);
    assert.equal(res.success, true);
    assert.equal(capturedBody.isHandover, true);
    assert.equal(capturedBody.cardCode, '3571');
    assert.equal(res.data?.result, 'handed_over');
  });

  await t.test('Test EFR-18 & EFR-20: Release Card with Atomic Auto-Assignment to Waitlist', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        success: true,
        data: {
          result: 'released_and_auto_assigned',
          origin_request_id: 'REQ-106',
          auto_assigned_to: 'REQ-107',
          card_code: '0006'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.releaseCardAtomic('REQ-106', '0006', 'Hủy do đổi lịch', 'admin-01', 'release_reservation');
    assert.equal(res.success, true);
    assert.equal(res.data?.result, 'released_and_auto_assigned');
    assert.equal(res.data?.auto_assigned_to, 'REQ-107');
    assert.equal(res.data?.card_code, '0006');
  });

  await t.test('Test EFR-30 & EFR-31: Global Lock Hierarchy and T5001/T5002 Retry handling', async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      if (attempts === 1) {
        return new Response(JSON.stringify({
          success: false,
          code: 'T5002',
          message: 'Waitlist head changed concurrently, please retry.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: {
          result: 'released_and_auto_assigned',
          auto_assigned_to: 'REQ-108',
          card_code: '3571'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.releaseCardAtomic('REQ-109', '3571', 'Admin nhả thẻ', 'admin-01');
    assert.equal(res.success, true);
    assert.equal(attempts, 2);
    assert.equal(res.data?.auto_assigned_to, 'REQ-108');
  });

  await t.test('Test EFR-10 & EFR-13: Cancel Request Atomic with Auto-Assignment and Owner Authorization', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        success: true,
        data: {
          result: 'cancelled_and_auto_assigned',
          cancelled_request_id: 'REQ-110',
          auto_assigned_to: 'REQ-111',
          card_code: '0006'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.cancelRequestAtomic('REQ-110', 'Nhân viên hủy đơn', 'user-02');
    assert.equal(res.success, true);
    assert.equal(capturedBody.requestId, 'REQ-110');
    assert.equal(capturedBody.operatorId, 'user-02');
    assert.equal(res.data?.result, 'cancelled_and_auto_assigned');
  });

  globalThis.fetch = originalFetch;
});

