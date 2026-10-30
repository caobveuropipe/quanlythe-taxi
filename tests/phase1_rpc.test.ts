import assert from 'node:assert/strict';
import test from 'node:test';
import { supabaseService, RpcResult } from '../src/services/supabaseService';

test('Phase 1: Database Migration SQL Contract & Security Verification', async (t) => {
  const fs = await import('fs');
  const path = await import('path');
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261030_enforce_single_active_card_per_request.sql'), 'utf8');

  await t.test('Migration defines Unique Partial Index on active card requests', () => {
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_taxi_cards_single_active_request/);
    assert.match(sql, /ON public\.taxi_cards\(current_request_id\)/);
    assert.match(sql, /WHERE current_request_id IS NOT NULL AND status IN \('reserved', 'in_use'\)/);
  });

  await t.test('Migration defines assign_taxi_card_atomic with proper security and branches', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.assign_taxi_card_atomic/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /SET search_path = public, pg_temp/);
    assert.match(sql, /p_is_handover boolean/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.assign_taxi_card_atomic.*FROM public, anon, authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.assign_taxi_card_atomic.*TO service_role/);
  });

  await t.test('Migration defines cancel_taxi_request_atomic with Global Lock Hierarchy & Waitlist Retry', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.cancel_taxi_request_atomic/);
    assert.match(sql, /SECURITY DEFINER/);
    // Level 1: Requests locked by ID ASC
    assert.match(sql, /WHERE id IN \(p_request_id, v_candidate_waitlist_id\)[\s\S]*ORDER BY id ASC[\s\S]*FOR UPDATE/);
    // Level 2: Card locked by code ASC
    assert.match(sql, /ORDER BY code ASC[\s\S]*FOR UPDATE/);
    // Error T5002 for waitlist head conflict
    assert.match(sql, /USING ERRCODE = 'T5002'/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.cancel_taxi_request_atomic.*FROM public, anon, authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.cancel_taxi_request_atomic.*TO service_role/);
  });

  await t.test('Migration defines release_taxi_card_atomic with Double-Check under Lock & Global Lock Hierarchy', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.release_taxi_card_atomic/);
    assert.match(sql, /SECURITY DEFINER/);
    // Level 1: Requests locked by ID ASC
    assert.match(sql, /WHERE id IN \(v_temp_origin_id, v_candidate_waitlist_id\)[\s\S]*ORDER BY id ASC[\s\S]*FOR UPDATE/);
    // Level 2: Card locked by code ASC
    assert.match(sql, /ORDER BY code ASC[\s\S]*FOR UPDATE/);
    // Double-check under lock
    assert.match(sql, /v_card\.current_request_id IS DISTINCT FROM v_temp_origin_id/);
    assert.match(sql, /USING ERRCODE = 'T5001'/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.release_taxi_card_atomic.*FROM public, anon, authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.release_taxi_card_atomic.*TO service_role/);
  });
});

test('Phase 1: SupabaseService RPC Wrappers Contract & Retry Mechanism', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.test('assignCardAtomic sends correct proxy action payload', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ success: true, data: { result: 'assigned_new', card_code: '0006' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.assignCardAtomic('REQ-101', '0006', 'admin-01', false);
    assert.equal(res.success, true);
    assert.equal(capturedBody.custom_action, 'assignCardAtomic');
    assert.equal(capturedBody.requestId, 'REQ-101');
    assert.equal(capturedBody.cardCode, '0006');
    assert.equal(capturedBody.operatorId, 'admin-01');
    assert.equal(capturedBody.isHandover, false);
  });

  await t.test('cancelRequestAtomic sends correct proxy action payload', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ success: true, data: { result: 'cancelled_no_card' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.cancelRequestAtomic('REQ-102', 'Lý do cá nhân', 'user-02');
    assert.equal(res.success, true);
    assert.equal(capturedBody.custom_action, 'cancelRequestAtomic');
    assert.equal(capturedBody.requestId, 'REQ-102');
    assert.equal(capturedBody.reason, 'Lý do cá nhân');
    assert.equal(capturedBody.operatorId, 'user-02');
  });

  await t.test('releaseCardAtomic sends correct proxy action payload', async () => {
    let capturedBody: any = null;
    globalThis.fetch = async (url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ success: true, data: { result: 'released_card_available' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.releaseCardAtomic('REQ-103', '3571', 'Thu hồi bảo dưỡng', 'admin-01', 'release_reservation');
    assert.equal(res.success, true);
    assert.equal(capturedBody.custom_action, 'releaseCardAtomic');
    assert.equal(capturedBody.requestId, 'REQ-103');
    assert.equal(capturedBody.cardCode, '3571');
    assert.equal(capturedBody.actionType, 'release_reservation');
  });

  await t.test('Auto-retries up to 3 times on retryable error codes (T5001, T5002, 40P01)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount < 3) {
        return new Response(JSON.stringify({ success: false, code: 'T5001', message: 'Card assignment changed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: { result: 'assigned_new' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.assignCardAtomic('REQ-200', '0006', 'admin-01');
    assert.equal(res.success, true);
    assert.equal(callCount, 3);
  });

  await t.test('Fails immediately without unnecessary retries on non-retryable 42501 (Unauthorized)', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(JSON.stringify({ success: false, code: '42501', message: 'Unauthorized operator' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseService.assignCardAtomic('REQ-201', '0006', 'fake-user');
    assert.equal(res.success, false);
    assert.equal(callCount, 1);
    assert.equal(res.code, '42501');
  });

  // Restore fetch
  globalThis.fetch = originalFetch;
});

