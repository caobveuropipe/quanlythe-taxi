-- Migration: 20261030_enforce_single_active_card_per_request.sql
-- Description: Đảm bảo tính bất biến 1 request tối đa 1 card active (reserved/in_use),
--              cung cấp bộ 3 RPC nguyên tử phân cấp khóa chống deadlock,
--              tự động gán thẻ từ hàng chờ và thiết lập ranh giới bảo mật service_role.

-- 1. Unique Partial Index: Ngăn chặn 1 request giữ > 1 thẻ active (reserved hoặc in_use)
CREATE UNIQUE INDEX IF NOT EXISTS idx_taxi_cards_single_active_request
ON public.taxi_cards(current_request_id)
WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use');

-- 2. RPC: assign_taxi_card_atomic
CREATE OR REPLACE FUNCTION public.assign_taxi_card_atomic(
  p_request_id text,
  p_card_code text DEFAULT NULL,
  p_operator_id text DEFAULT NULL,
  p_is_handover boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operator record;
  v_req record;
  v_card record;
  v_avail_card record;
  v_existing_card record;
BEGIN
  -- Xác thực quyền người thao tác (Admin / Admin HR / Super Admin)
  SELECT * INTO v_operator FROM public.users
  WHERE id = p_operator_id OR telegram_id = p_operator_id
  LIMIT 1;

  IF v_operator IS NULL OR (v_operator.role NOT IN ('admin', 'admin_hr') AND COALESCE(v_operator.telegram_id, '') <> '5139629652') THEN
    RAISE EXCEPTION 'Unauthorized operator: %', p_operator_id USING ERRCODE = '42501';
  END IF;

  -- Level 1: Khóa Request trước (FOR UPDATE)
  SELECT * INTO v_req FROM public.taxi_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req IS NULL THEN
    RAISE EXCEPTION 'Request not found: %', p_request_id USING ERRCODE = 'P0002';
  END IF;

  -- ----------------------------------------------------
  -- Nhánh 1: Bàn giao thẻ thực tế tại quầy (p_is_handover = true)
  -- ----------------------------------------------------
  IF p_is_handover IS TRUE THEN
    IF p_card_code IS NULL OR p_card_code = '' THEN
      RAISE EXCEPTION 'p_card_code is required for handover' USING ERRCODE = '22023';
    END IF;

    -- Level 2: Khóa thẻ chỉ định
    SELECT * INTO v_card FROM public.taxi_cards
    WHERE code = p_card_code
    FOR UPDATE;

    IF v_card IS NULL THEN
      RAISE EXCEPTION 'Card % not found', p_card_code USING ERRCODE = 'P0002';
    END IF;

    IF v_card.status = 'in_use' AND v_card.current_request_id IS DISTINCT FROM p_request_id THEN
      RAISE EXCEPTION 'Card % is already in use by request %', p_card_code, v_card.current_request_id USING ERRCODE = '23505';
    END IF;

    -- Unreserve bất kỳ thẻ cũ nào của đơn này nếu đổi thẻ tại quầy bàn giao
    UPDATE public.taxi_cards
    SET status = 'available', current_request_id = NULL, assigned_to_name = NULL, assigned_to_code = NULL
    WHERE current_request_id = p_request_id AND code <> p_card_code AND status IN ('reserved', 'in_use');

    -- Chuyển thẻ sang in_use
    UPDATE public.taxi_cards
    SET status = 'in_use', current_request_id = p_request_id,
        assigned_to_name = v_req.employee_name, assigned_to_code = v_req.employee_code
    WHERE code = p_card_code;

    -- Cập nhật request sang holding_card
    UPDATE public.taxi_requests
    SET status = 'holding_card', actual_card_code = p_card_code, reserved_card_code = p_card_code,
        handed_over_at = now(), handed_over_by = v_operator.name
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'result', 'handed_over',
      'card_code', p_card_code,
      'status', 'holding_card',
      'operator_name', v_operator.name
    );

  -- ----------------------------------------------------
  -- Nhánh 2: Gán/đổi thẻ chỉ định cụ thể trước bàn giao (p_card_code IS NOT NULL)
  -- ----------------------------------------------------
  ELSIF p_card_code IS NOT NULL AND p_card_code <> '' THEN
    -- Level 2: Khóa thẻ chỉ định
    SELECT * INTO v_card FROM public.taxi_cards
    WHERE code = p_card_code
    FOR UPDATE;

    IF v_card IS NULL THEN
      RAISE EXCEPTION 'Card % not found', p_card_code USING ERRCODE = 'P0002';
    END IF;

    IF v_card.status <> 'available' AND (v_card.current_request_id IS DISTINCT FROM p_request_id OR v_card.status <> 'reserved') THEN
      RAISE EXCEPTION 'Card % is not available (current status: %)', p_card_code, v_card.status USING ERRCODE = '55P03';
    END IF;

    -- Unreserve bất kỳ thẻ cũ nào của đơn
    UPDATE public.taxi_cards
    SET status = 'available', current_request_id = NULL, assigned_to_name = NULL, assigned_to_code = NULL
    WHERE current_request_id = p_request_id AND code <> p_card_code AND status = 'reserved';

    -- Khóa giữ thẻ mới
    UPDATE public.taxi_cards
    SET status = 'reserved', current_request_id = p_request_id,
        assigned_to_name = v_req.employee_name, assigned_to_code = v_req.employee_code
    WHERE code = p_card_code;

    -- Cập nhật đơn sang pending_handover
    UPDATE public.taxi_requests
    SET status = 'pending_handover', is_waitlisted = false, reserved_card_code = p_card_code,
        admin_approval_status = 'approved', admin_approved_at = COALESCE(admin_approved_at, now()),
        admin_approver_name = v_operator.name, handover_ready_at = COALESCE(handover_ready_at, now())
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'result', 'assigned_new',
      'card_code', p_card_code,
      'status', 'pending_handover',
      'operator_name', v_operator.name
    );

  -- ----------------------------------------------------
  -- Nhánh 3: Duyệt nhanh không chỉ định thẻ (Telegram & Mini App adminApprove)
  -- ----------------------------------------------------
  ELSE
    -- Guard trạng thái đã xử lý sau bàn giao
    IF v_req.status IN ('holding_card', 'returned_pending_bill', 'completed', 'card_released', 'cancelled', 'rejected_leader', 'rejected_admin') THEN
      RETURN jsonb_build_object(
        'result', 'already_processed',
        'status', v_req.status,
        'card_code', COALESCE(v_req.actual_card_code, v_req.reserved_card_code)
      );
    END IF;

    -- Idempotency check: Nếu đơn đã có thẻ reserved
    SELECT * INTO v_existing_card FROM public.taxi_cards
    WHERE current_request_id = p_request_id AND status = 'reserved'
    LIMIT 1;

    IF v_existing_card IS NOT NULL THEN
      RETURN jsonb_build_object(
        'result', 'assigned_existing',
        'card_code', v_existing_card.code,
        'status', 'pending_handover',
        'operator_name', v_operator.name
      );
    END IF;

    -- Level 2: Tìm thẻ rảnh với lock_timeout = 2s, sắp xếp theo code ASC
    SET LOCAL lock_timeout = '2s';
    SELECT * INTO v_avail_card FROM public.taxi_cards
    WHERE status = 'available'
    ORDER BY code ASC
    LIMIT 1
    FOR UPDATE;

    IF v_avail_card IS NOT NULL THEN
      -- Gán thẻ rảnh tìm được
      UPDATE public.taxi_cards
      SET status = 'reserved', current_request_id = p_request_id,
          assigned_to_name = v_req.employee_name, assigned_to_code = v_req.employee_code
      WHERE code = v_avail_card.code;

      UPDATE public.taxi_requests
      SET status = 'pending_handover', is_waitlisted = false, reserved_card_code = v_avail_card.code,
          admin_approval_status = 'approved', admin_approved_at = COALESCE(admin_approved_at, now()),
          admin_approver_name = v_operator.name, handover_ready_at = COALESCE(handover_ready_at, now())
      WHERE id = p_request_id;

      RETURN jsonb_build_object(
        'result', 'assigned_new',
        'card_code', v_avail_card.code,
        'status', 'pending_handover',
        'operator_name', v_operator.name
      );
    ELSE
      -- Kho thực sự hết thẻ rảnh -> Chuyển sang waitlist_cards nguyên tử trong transaction
      UPDATE public.taxi_requests
      SET status = 'waitlist_cards', is_waitlisted = true, reserved_card_code = NULL,
          admin_approval_status = 'approved', admin_approved_at = COALESCE(admin_approved_at, now()),
          admin_approver_name = v_operator.name
      WHERE id = p_request_id;

      RETURN jsonb_build_object(
        'result', 'waitlisted',
        'card_code', null,
        'status', 'waitlist_cards',
        'operator_name', v_operator.name
      );
    END IF;
  END IF;
END;
$$;

-- 3. RPC: cancel_taxi_request_atomic
CREATE OR REPLACE FUNCTION public.cancel_taxi_request_atomic(
  p_request_id text,
  p_reason text,
  p_operator_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operator record;
  v_target_req record;
  v_candidate_waitlist_id text;
  v_waitlist_req record;
  v_freed_card record;
BEGIN
  -- Xác thực danh tính người thao tác
  SELECT * INTO v_operator FROM public.users
  WHERE id = p_operator_id OR telegram_id = p_operator_id
  LIMIT 1;

  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'Operator not found: %', p_operator_id USING ERRCODE = '42501';
  END IF;

  -- Level 1: Khóa Requests theo ID tăng dần
  -- Bước 1.1: Đọc sơ bộ đơn hủy để kiểm tra phân quyền & trạng thái
  SELECT * INTO v_target_req FROM public.taxi_requests WHERE id = p_request_id;
  IF v_target_req IS NULL THEN
    RAISE EXCEPTION 'Request not found: %', p_request_id USING ERRCODE = 'P0002';
  END IF;

  IF v_operator.role NOT IN ('admin', 'admin_hr') AND COALESCE(v_operator.telegram_id, '') <> '5139629652' THEN
    IF v_target_req.employee_id IS DISTINCT FROM v_operator.id AND v_target_req.employee_code IS DISTINCT FROM v_operator.employee_code THEN
      RAISE EXCEPTION 'Unauthorized: cannot cancel request of another employee' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_target_req.status NOT IN ('pending_leader', 'pending_admin', 'waitlist_cards', 'pending_handover') THEN
    RAISE EXCEPTION 'Request cannot be cancelled in status: %', v_target_req.status USING ERRCODE = '55P03';
  END IF;

  -- Bước 1.2: Tìm candidate waitlist request (loại trừ đơn hủy)
  SELECT id INTO v_candidate_waitlist_id FROM public.taxi_requests
  WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM p_request_id
  ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC
  LIMIT 1;

  -- Bước 1.3: Khóa tất cả các request tham gia theo ORDER BY id ASC (Level 1)
  PERFORM 1 FROM public.taxi_requests
  WHERE id IN (p_request_id, v_candidate_waitlist_id)
  ORDER BY id ASC
  FOR UPDATE;

  -- Re-read target request under lock
  SELECT * INTO v_target_req FROM public.taxi_requests WHERE id = p_request_id;

  -- Level 2: Khóa thẻ vừa giải phóng (nếu có)
  SELECT * INTO v_freed_card FROM public.taxi_cards
  WHERE (code = v_target_req.reserved_card_code)
     OR (current_request_id = p_request_id AND status IN ('reserved', 'in_use'))
  ORDER BY code ASC
  FOR UPDATE
  LIMIT 1;

  -- Cập nhật đơn hiện tại sang cancelled
  UPDATE public.taxi_requests
  SET status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason,
      reserved_card_code = NULL
  WHERE id = p_request_id;

  -- Xử lý chuyển giao thẻ (Auto-Assignment)
  IF v_freed_card IS NOT NULL THEN
    IF v_candidate_waitlist_id IS NOT NULL THEN
      -- Re-check candidate status under lock
      SELECT * INTO v_waitlist_req FROM public.taxi_requests WHERE id = v_candidate_waitlist_id;
      IF v_waitlist_req.status = 'waitlist_cards' THEN
        -- Gán ngay thẻ cho đơn chờ ưu tiên
        UPDATE public.taxi_cards
        SET status = 'reserved', current_request_id = v_waitlist_req.id,
            assigned_to_name = v_waitlist_req.employee_name, assigned_to_code = v_waitlist_req.employee_code
        WHERE code = v_freed_card.code;

        UPDATE public.taxi_requests
        SET status = 'pending_handover', is_waitlisted = false, reserved_card_code = v_freed_card.code,
            handover_ready_at = now()
        WHERE id = v_waitlist_req.id;

        RETURN jsonb_build_object(
          'result', 'cancelled_and_auto_assigned',
          'cancelled_request_id', p_request_id,
          'auto_assigned_to', v_waitlist_req.id,
          'card_code', v_freed_card.code
        );
      ELSE
        -- Candidate đã bị đổi trạng thái đồng thời. Nếu còn đơn khác chờ -> ném lỗi retryable T5002
        IF EXISTS (SELECT 1 FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM p_request_id) THEN
          RAISE EXCEPTION 'Waitlist head changed concurrently, please retry.' USING ERRCODE = 'T5002';
        END IF;
      END IF;
    END IF;

    -- Không có đơn chờ nào (hoặc hàng chờ đã thực sự hết) -> Đưa thẻ về available
    UPDATE public.taxi_cards
    SET status = 'available', current_request_id = NULL,
        assigned_to_name = NULL, assigned_to_code = NULL
    WHERE code = v_freed_card.code;

    RETURN jsonb_build_object(
      'result', 'cancelled_card_available',
      'cancelled_request_id', p_request_id,
      'card_code', v_freed_card.code
    );
  ELSE
    RETURN jsonb_build_object(
      'result', 'cancelled_no_card',
      'cancelled_request_id', p_request_id
    );
  END IF;
END;
$$;

-- 4. RPC: release_taxi_card_atomic
CREATE OR REPLACE FUNCTION public.release_taxi_card_atomic(
  p_request_id text DEFAULT NULL,
  p_card_code text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_operator_id text DEFAULT NULL,
  p_action_type text DEFAULT 'release_reservation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operator record;
  v_temp_origin_id text;
  v_candidate_waitlist_id text;
  v_card record;
  v_waitlist_req record;
BEGIN
  -- Xác thực quyền Admin/Admin HR
  SELECT * INTO v_operator FROM public.users
  WHERE id = p_operator_id OR telegram_id = p_operator_id
  LIMIT 1;

  IF v_operator IS NULL OR (v_operator.role NOT IN ('admin', 'admin_hr') AND COALESCE(v_operator.telegram_id, '') <> '5139629652') THEN
    RAISE EXCEPTION 'Unauthorized operator: %', p_operator_id USING ERRCODE = '42501';
  END IF;

  -- Level 1: Khóa Requests theo ID tăng dần
  -- Bước 1.1: Đọc sơ bộ đơn gốc
  v_temp_origin_id := COALESCE(p_request_id, (SELECT current_request_id FROM public.taxi_cards WHERE code = p_card_code));

  -- Bước 1.2: Đọc sơ bộ đơn hàng chờ ứng viên (loại trừ đơn gốc)
  SELECT id INTO v_candidate_waitlist_id FROM public.taxi_requests
  WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_temp_origin_id
  ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC
  LIMIT 1;

  -- Bước 1.3: Khóa toàn bộ request tham gia theo ORDER BY id ASC (Level 1)
  PERFORM 1 FROM public.taxi_requests
  WHERE id IN (v_temp_origin_id, v_candidate_waitlist_id)
  ORDER BY id ASC
  FOR UPDATE;

  -- Level 2: Khóa thẻ cần giải phóng theo ORDER BY code ASC
  SELECT * INTO v_card FROM public.taxi_cards
  WHERE code = COALESCE(p_card_code, (SELECT reserved_card_code FROM public.taxi_requests WHERE id = p_request_id))
  ORDER BY code ASC
  FOR UPDATE;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002';
  END IF;

  -- Double-Check dưới lock: Nếu thẻ đã bị đổi chủ trước khi lấy được lock
  IF p_card_code IS NOT NULL AND v_card.current_request_id IS DISTINCT FROM v_temp_origin_id THEN
    RAISE EXCEPTION 'Card assignment changed concurrently, please retry.' USING ERRCODE = 'T5001';
  END IF;

  -- Cập nhật đơn gốc trong transaction
  IF p_action_type = 'release_reservation' THEN
    IF v_temp_origin_id IS NOT NULL THEN
      UPDATE public.taxi_requests
      SET status = 'card_released', released_reason = p_reason,
          released_by = v_operator.name, released_at = now(),
          reserved_card_code = NULL
      WHERE id = v_temp_origin_id;
    END IF;
  ELSIF p_action_type = 'release_card_to_waitlist' THEN
    IF v_temp_origin_id IS NOT NULL THEN
      UPDATE public.taxi_requests
      SET status = 'waitlist_cards', is_waitlisted = true,
          reserved_card_code = NULL
      WHERE id = v_temp_origin_id;
    END IF;
  END IF;

  -- Xử lý chuyển giao thẻ (Auto-Assignment)
  IF v_candidate_waitlist_id IS NOT NULL THEN
    -- Re-check candidate status under lock
    SELECT * INTO v_waitlist_req FROM public.taxi_requests WHERE id = v_candidate_waitlist_id;
    IF v_waitlist_req.status = 'waitlist_cards' THEN
      -- Gán thẻ cho đơn chờ ưu tiên
      UPDATE public.taxi_cards
      SET status = 'reserved', current_request_id = v_waitlist_req.id,
          assigned_to_name = v_waitlist_req.employee_name, assigned_to_code = v_waitlist_req.employee_code
      WHERE code = v_card.code;

      UPDATE public.taxi_requests
      SET status = 'pending_handover', is_waitlisted = false, reserved_card_code = v_card.code,
          handover_ready_at = now()
      WHERE id = v_waitlist_req.id;

      RETURN jsonb_build_object(
        'result', 'released_and_auto_assigned',
        'origin_request_id', v_temp_origin_id,
        'auto_assigned_to', v_waitlist_req.id,
        'card_code', v_card.code
      );
    ELSE
      -- Candidate đã bị đổi trạng thái đồng thời. Nếu còn đơn khác chờ -> ném lỗi retryable T5002
      IF EXISTS (SELECT 1 FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_temp_origin_id) THEN
        RAISE EXCEPTION 'Waitlist head changed concurrently, please retry.' USING ERRCODE = 'T5002';
      END IF;
    END IF;
  END IF;

  -- Không có đơn chờ nào (hoặc hàng chờ đã thực sự hết) -> Đưa thẻ về available
  UPDATE public.taxi_cards
  SET status = 'available', current_request_id = NULL,
      assigned_to_name = NULL, assigned_to_code = NULL
  WHERE code = v_card.code;

  RETURN jsonb_build_object(
    'result', 'released_card_available',
    'origin_request_id', v_temp_origin_id,
    'card_code', v_card.code
  );
END;
$$;

-- 5. Trust Boundary & Permissions: Thu hồi từ public/anon/authenticated, chỉ cấp cho service_role
REVOKE ALL ON FUNCTION public.assign_taxi_card_atomic(text, text, text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_taxi_card_atomic(text, text, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_taxi_request_atomic(text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_taxi_request_atomic(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.release_taxi_card_atomic(text, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_taxi_card_atomic(text, text, text, text, text) TO service_role;

