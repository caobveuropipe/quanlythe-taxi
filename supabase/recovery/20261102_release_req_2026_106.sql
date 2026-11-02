-- One-time recovery for REQ-2026-106 after the operator confirmed that
-- neither physical card 0006 nor 3571 is held or handed over.
-- Run in Supabase SQL Editor before the atomic-card migration.
-- This script deliberately stops if the live state differs from the screenshot.

BEGIN;

DO $$
DECLARE
  v_request public.taxi_requests%ROWTYPE;
  v_card_count integer;
  v_other_active_count integer;
BEGIN
  SELECT * INTO v_request
  FROM public.taxi_requests
  WHERE id = 'REQ-2026-106'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQ-2026-106 not found; no data changed';
  END IF;

  -- Lock both cards in deterministic order and recheck under the locks.
  PERFORM 1 FROM public.taxi_cards
  WHERE code IN ('0006', '3571')
  ORDER BY code
  FOR UPDATE;

  SELECT count(*) INTO v_card_count
  FROM public.taxi_cards
  WHERE code IN ('0006', '3571')
    AND status = 'reserved'
    AND current_request_id = 'REQ-2026-106';

  SELECT count(*) INTO v_other_active_count
  FROM public.taxi_cards
  WHERE current_request_id = 'REQ-2026-106'
    AND status IN ('reserved', 'in_use')
    AND code NOT IN ('0006', '3571');

  IF v_request.status NOT IN ('pending_handover', 'waitlist_cards')
     OR v_request.actual_card_code IS NOT NULL
     OR v_request.handed_over_at IS NOT NULL
     OR v_card_count <> 2
     OR v_other_active_count <> 0 THEN
    RAISE EXCEPTION 'Live order/card state changed. Re-run the read-only audit; no data changed';
  END IF;

  UPDATE public.taxi_cards
  SET status = 'available',
      current_request_id = NULL,
      assigned_to_name = NULL,
      assigned_to_code = NULL
  WHERE code IN ('0006', '3571');

  UPDATE public.taxi_requests
  SET status = 'card_released',
      is_waitlisted = false,
      reserved_card_code = NULL,
      actual_card_code = NULL,
      released_reason = 'Khôi phục dữ liệu: cả hai thẻ chưa được bàn giao; Admin xác nhận không giữ thẻ',
      released_by = 'Manual recovery',
      released_at = now()
  WHERE id = 'REQ-2026-106';
END;
$$;

COMMIT;

-- Confirm the result before applying the migration.
SELECT id, status, reserved_card_code, actual_card_code
FROM public.taxi_requests WHERE id = 'REQ-2026-106';
SELECT code, status, current_request_id
FROM public.taxi_cards WHERE code IN ('0006', '3571') ORDER BY code;
