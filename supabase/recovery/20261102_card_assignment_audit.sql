-- Read-only audit. Run in Supabase SQL Editor before applying
-- 20261030_enforce_single_active_card_per_request.sql.
-- Keep the output as a snapshot and verify the physical cards with Admin.

-- Requests with more than one active card (the unique index cannot be created yet).
SELECT current_request_id AS request_id,
       array_agg(code || ' (' || status || ')' ORDER BY code) AS active_cards,
       count(*) AS active_card_count
FROM public.taxi_cards
WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use')
GROUP BY current_request_id
HAVING count(*) > 1;

-- Full state of the order in the screenshot, including its card pointers.
SELECT r.id, r.status, r.reserved_card_code, r.actual_card_code,
       c.code, c.status AS card_status, c.current_request_id,
       c.assigned_to_name, c.assigned_to_code
FROM public.taxi_requests r
LEFT JOIN public.taxi_cards c
  ON c.current_request_id = r.id OR c.code IN (r.reserved_card_code, r.actual_card_code)
WHERE r.id = 'REQ-2026-106'
ORDER BY c.code;

-- Orders whose pointer and active card disagree, including pending orders without a card.
SELECT r.id, r.status, r.reserved_card_code, r.actual_card_code,
       array_agg(c.code ORDER BY c.code) FILTER (WHERE c.code IS NOT NULL) AS active_cards
FROM public.taxi_requests r
LEFT JOIN public.taxi_cards c ON c.current_request_id = r.id AND c.status IN ('reserved', 'in_use')
WHERE r.status IN ('pending_handover', 'holding_card', 'waitlist_cards')
GROUP BY r.id, r.status, r.reserved_card_code, r.actual_card_code
HAVING count(c.code) <> CASE WHEN r.status = 'waitlist_cards' THEN 0 ELSE 1 END
   OR (r.status = 'pending_handover' AND bool_or(c.code = r.reserved_card_code) IS NOT TRUE)
   OR (r.status = 'holding_card' AND bool_or(c.code = r.actual_card_code) IS NOT TRUE);
