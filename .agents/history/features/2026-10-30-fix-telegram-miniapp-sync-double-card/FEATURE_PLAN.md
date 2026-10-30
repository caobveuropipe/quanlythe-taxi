# Feature Plan: Khắc phục lỗi không đồng bộ Telegram - MiniApp và cấp trùng 2 thẻ (Multi-card Concurrency & Sync Fix)

> **Trạng thái**: ✅ ĐÃ PHẢN BIỆN & CHỈNH SỬA (HỘI TỤ CODEX R5)  
> **Review gate**: Đã qua phản biện `expert-rebuttal` Round 5  
> **Feature slug**: fix-telegram-miniapp-sync-double-card  
> **Tạo bởi**: feature-plan  
> **Ngày tạo**: 2026-10-30  

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hệ thống vận hành điều phối thẻ taxi nội bộ VCC sử dụng mô hình kết hợp giữa Telegram Mini App (React Context + Supabase Realtime) và Telegram Bot Webhook (`/api/telegram` serverless). Nhiều Admin có thể cùng lúc nhận thông báo và duyệt cấp thẻ cho nhân sự.
- **Vấn đề cần giải quyết:** 
  1. **Lỗi cấp trùng nhiều thẻ (Double-card Allocation):** Khi 2 Admin hoặc 2 nền tảng cùng thao tác, các lệnh ghi rời rạc trên `taxi_cards` và `taxi_requests` không nằm trong một transaction nguyên tử dẫn đến việc một yêu cầu mượn thẻ (`REQ-2026-104`) bị gán cùng lúc cho **cả 2 thẻ vật lý** trong kho (`0006` và `3571`).
  2. **Nghịch lý "Đơn có thẻ nhưng vẫn bắt Chờ thẻ":** Khi kho hết thẻ khả dụng (vì đã bị 2 thẻ gán giữ), Admin bấm `[✅ Duyệt cấp thẻ]` trên Telegram, webhook không tìm thấy thẻ `available` nên tự động ghi đè trạng thái đơn `REQ-2026-104` ngược về `waitlist_cards` (Chờ thẻ), trong khi cả 2 thẻ vật lý vẫn bị chiếm giữ.
  3. **Lệch pha tin nhắn Telegram giữa các Admin:** Bản ghi tracker tin nhắn (`msg_track_req_*`) bị xóa sớm khỏi DB (`keepTracker = false`) ngay khi có bất kỳ thao tác đổi trạng thái nào, khiến webhook không thể tìm thấy danh sách tin nhắn để sửa và gỡ nút bấm trên Telegram của các Admin khác (như Admin Van Cao).
  4. **Rủi ro ranh giới phân quyền RPC:** Khi đưa vào RPC nguyên tử, nếu không định rõ phân quyền và xác thực danh tính ở DB, kẻ xấu có thể gọi RPC qua anon key để thao túng thẻ hoặc giả mạo tên người cấp thẻ. <!-- Sửa theo EFR-08 -->
- **Mục tiêu:** 
  - Khôi phục tính nhất quán dữ liệu có kiểm chứng thực tế cho đơn `REQ-2026-104` và 2 thẻ vật lý `0006`, `3571`.
  - Khóa chặt Invariant nghiệp vụ bằng **PostgreSQL RPC Transaction**, **Unique Partial Index** và **Role-based DB Authorization**: Toàn bộ thao tác khóa request, kiểm tra quyền hạn operator, nhả thẻ cũ, gán thẻ mới và cập nhật request được đóng gói trong một RPC function duy nhất (`assign_taxi_card_atomic`). <!-- Sửa theo EFR-05, EFR-07, EFR-08 -->
  - Ngăn chặn race condition giữa Telegram Webhook và Mini App: Webhook sử dụng chung RPC nguyên tử, không ghi đè đơn về `waitlist_cards` nếu đơn đã được giữ thẻ trước đó.
  - Bảo toàn tracker tin nhắn để mọi tin nhắn thông báo gửi cho nhiều Admin đều được đồng bộ sửa nội dung và gỡ nút bấm triệt để qua mọi khâu trung gian.
- **Kết quả mong đợi:** Đơn `REQ-2026-104` được gắn đúng 1 thẻ ở trạng thái `pending_handover`, thẻ còn lại trả về kho rảnh; triệt tiêu hoàn toàn khả năng 1 đơn giữ 2 thẻ, commit một phần, hoặc gọi RPC trái phép; tin nhắn của tất cả Admin trên Telegram luôn đồng bộ trạng thái với Mini App.

---

## 2. Phạm vi

### In scope
- **Data Reconcile một lần có kiểm chứng thực tế:** Chụp snapshot DB hiện tại, xác nhận với Admin giữ kho về tình trạng bàn giao thực tế của 2 thẻ (không mặc định cứng thẻ `0006`), chạy script reconcile có điều kiện chỉ khi xác nhận thẻ còn lại đang ở kho, tuyệt đối không tự ý nhả thẻ `in_use`. <!-- Sửa theo EFR-02, EFR-06 -->
- **PostgreSQL RPC Transaction & Phân Quyền Bảo Mật (Trust Boundary):** <!-- Sửa theo EFR-01, EFR-05, EFR-07, EFR-08, EFR-09, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18 -->
  - Tạo migration Supabase (`supabase/migrations/20261030_enforce_single_active_card_per_request.sql`):
    1. Bổ sung Unique Partial Index `idx_taxi_cards_single_active_request` trên `taxi_cards(current_request_id) WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use')`.
    2. Định nghĩa RPC `assign_taxi_card_atomic(p_request_id text, p_card_code text DEFAULT NULL, p_operator_id text DEFAULT NULL, p_is_handover boolean DEFAULT false)` với các chuẩn bảo mật:
       - Cấu hình `SECURITY DEFINER` và cố định `SET search_path = public, pg_temp;` (chống search_path injection).
       - Schema-qualify toàn bộ bảng: `public.taxi_cards`, `public.taxi_requests`, `public.users`.
       - Tự xác minh quyền ở DB: Truy vấn `public.users` theo điều kiện `id = p_operator_id OR telegram_id = p_operator_id` (hỗ trợ cả UUID/ID nội bộ lẫn Telegram ID của Admin/Super Admin) <!-- Sửa theo EFR-11 -->. Nếu role không thuộc `('admin', 'admin_hr')` (hoặc super admin `5139629652`) -> `RAISE EXCEPTION 'Unauthorized: Operator is not an authorized administrator'`.
       - Lấy tên người duyệt/bàn giao trực tiếp từ `users.name` trong DB để ghi vào `admin_approver_name` / `handed_over_by`, triệt tiêu khả năng caller giả mạo tên người thao tác.
       - Khóa hàng request (`SELECT ... FOR UPDATE`), kiểm tra trạng thái hợp lệ.
       - **Xử lý toàn diện mọi nhánh nguyên tử theo loại thao tác (Operation Order) <!-- Sửa theo EFR-14, EFR-15, EFR-16, EFR-17 -->:**
         + **Nhánh 1: Bàn giao thẻ thực tế (`p_is_handover = true`):** <!-- Sửa theo EFR-15 -->
           * Bắt buộc có `p_card_code`. Khóa thẻ chỉ định (`SELECT ... FOR UPDATE`). Kiểm tra thẻ không bị chiếm bởi đơn khác, không ở trạng thái hỏng/mất.
           * Nếu đơn trước đó đã giữ thẻ khác (`reserved_card_code != p_card_code`), unreserve thẻ cũ về `available`.
           * Chuyển thẻ bàn giao sang `in_use`, `current_request_id = p_request_id`.
           * Cập nhật request: `status = 'holding_card'`, `actual_card_code = p_card_code`, `handed_over_at = now()`, `handed_over_by = v_operator.name`.
           * Trả JSON `{ "result": "handed_over", "card_code": p_card_code, "status": "holding_card" }`.
         + **Nhánh 2: Gán/đổi thẻ chỉ định trước bàn giao (`p_card_code IS NOT NULL AND p_card_code != '' AND p_is_handover = false`):** <!-- Sửa theo EFR-15 -->
           * Dành cho Mini App khi chọn thẻ từ dropdown hoặc gán thẻ từ waitlist.
           * Khóa thẻ chỉ định (`FOR UPDATE`). Kiểm tra thẻ khả dụng (`status = 'available'` hoặc đã giữ cho chính đơn này).
           * Unreserve bất kỳ thẻ cũ nào của đơn, claim thẻ mới `status = 'reserved'`.
           * Cập nhật request: `status = 'pending_handover'`, `reserved_card_code = p_card_code`, `is_waitlisted = false`.
           * Trả JSON `{ "result": "assigned_new", "card_code": p_card_code, "status": "pending_handover" }`.
         + **Nhánh 3: Duyệt nhanh không chỉ định thẻ (`p_card_code IS NULL / rỗng AND p_is_handover = false` - Telegram approve & Mini App adminApprove):** <!-- Sửa theo EFR-14, EFR-15, EFR-16, EFR-17, EFR-25 -->
            * Áp dụng thống nhất cho cả nút Duyệt trên Telegram và hàm `adminApprove` trên Mini App: Client không tìm thẻ (`cards.find`) và không tự quyết định `waitlist_cards` ở client; toàn bộ logic kiểm tra tồn kho, khóa thẻ rảnh hoặc đưa vào hàng chờ do Nhánh 3 của RPC thực thi và commit nguyên tử trong DB. Client chỉ phân nhánh hiển thị theo `result` trả về từ RPC.
           * *Guard trạng thái đã xử lý:* Nếu đơn đã ở các trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `completed`, `card_released`, `cancelled`, `rejected_*`), RPC lập tức trả `{ "result": "already_processed", "status": v_req.status }` mà tuyệt đối không mutate dữ liệu, chặn đứng nguy cơ đẩy lùi đơn `holding_card` về `pending_handover` <!-- Sửa theo EFR-17 -->.
           * *Trường hợp 3a (Idempotent):* Nếu đơn đang ở `pending_handover` và đã có thẻ active ở trạng thái `reserved`:
             Giữ nguyên trạng thái và thẻ hiện tại, ghi nhận người duyệt, trả JSON `{ "result": "assigned_existing", "card_code": v_existing_code, "status": "pending_handover" }`.
           * *Trường hợp 3b (Chưa có thẻ - Đơn ở pending_admin / pending_leader):* Tìm thẻ rảnh bằng khóa có thứ tự và timeout an toàn: `SET LOCAL lock_timeout = '2s'; SELECT ... FROM taxi_cards WHERE status = 'available' ORDER BY code ASC LIMIT 1 FOR UPDATE;` (TUYỆT ĐỐI KHÔNG DÙNG SKIP LOCKED <!-- Sửa theo EFR-16 -->).
             - Nếu tìm thấy thẻ rảnh: Claim thẻ `status = 'reserved'`, unreserve thẻ cũ, cập nhật request sang `pending_handover`, trả JSON `{ "result": "assigned_new", "card_code": v_found_code }`.
             - Nếu thực sự hết thẻ rảnh trong kho: Cập nhật request sang `waitlist_cards`, `is_waitlisted = true`, `reserved_card_code = NULL`, `admin_approval_status = 'approved'`, `admin_approved_at = now()` ngay trong transaction; trả JSON `{ "result": "waitlisted", "card_code": null }`. Webhook tuyệt đối không tự chạy UPDATE ngoài RPC.
    3. Định nghĩa RPC `cancel_taxi_request_atomic(p_request_id text, p_reason text, p_operator_id text)` tách biệt luồng hủy đơn kèm Auto-Assign từ hàng chờ: <!-- Sửa theo EFR-10, EFR-11, EFR-13, EFR-18 -->
       - Xác minh danh tính người thao tác qua `public.users` (`id = p_operator_id OR telegram_id = p_operator_id`).
       - Phân quyền & Trạng thái: Chuẩn hóa theo đúng enum hệ thống (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`) <!-- Sửa theo EFR-13 -->. Cho phép người tạo đơn (`employee_id = v_operator.id` hoặc mã nhân viên) tự hủy đơn của chính mình khi đơn ở 4 trạng thái trên, HOẶC cho phép Admin/Admin HR hủy bất kỳ đơn nào chưa bàn giao <!-- Sửa theo EFR-10 -->. Nếu đơn đã ở trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `completed`,...) -> `RAISE EXCEPTION 'Request cannot be cancelled in status: %', v_req.status`.
       - Cập nhật request hiện tại sang `cancelled`, `cancelled_at = now()`, `cancelled_reason = p_reason`.
       - **Tự động chuyển giao thẻ vừa giải phóng cho đơn hàng chờ ưu tiên (Atomic Auto-Assignment) <!-- Sửa theo EFR-18 -->:**
         * Nếu đơn hủy có thẻ liên quan (`v_freed_card_id`): Tìm đơn đang ở hàng chờ có độ ưu tiên cao nhất theo thứ tự chuyến đi gần nhất rồi đến FIFO: `SELECT * FROM public.taxi_requests WHERE status = 'waitlist_cards' ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC LIMIT 1 FOR UPDATE`.
         * Nếu tìm thấy đơn chờ `v_waitlist_req`: Gán ngay thẻ vừa giải phóng cho `v_waitlist_req` (`status = 'pending_handover'`, `is_waitlisted = false`, `reserved_card_code = v_freed_card.code`, `handover_ready_at = now()`), cập nhật thẻ giữ cho đơn chờ. Trả JSON `{ "result": "cancelled_and_auto_assigned", "auto_assigned_to": v_waitlist_req.id, "card_code": v_freed_card.code }`.
         * Nếu không có đơn chờ nào: Trả thẻ về kho `status = 'available'`, `current_request_id = null`. Trả JSON `{ "result": "cancelled_card_available", "card_code": v_freed_card.code }`.
    4. Định nghĩa RPC `release_taxi_card_atomic(p_request_id text DEFAULT NULL, p_card_code text DEFAULT NULL, p_reason text DEFAULT NULL, p_operator_id text DEFAULT NULL, p_action_type text DEFAULT 'release_reservation')` dành riêng cho Admin nhả/thu hồi thẻ trực tiếp và cập nhật toàn vẹn request gốc: <!-- Sửa theo EFR-10, EFR-18, EFR-20, EFR-22, EFR-29, EFR-30 -->
       - Xác thực quyền Admin/Admin HR qua `public.users`.
       - **Thứ tự khóa phân cấp toàn cục (Level 1: All Requests theo ID tăng dần -> Level 2: Card) & Chống Deadlock (EFR-29, EFR-30):**
         * Toàn bộ hệ thống tuân thủ thứ tự phân cấp tài nguyên bất biến: **Khóa TẤT CẢ các Request tham gia trước (Level 1: `ORDER BY id ASC`), sau đó mới khóa Card (Level 2: `ORDER BY code ASC`)**. Tuyệt đối không transaction nào được phép giữ Card mà lại đi chờ khóa Request hàng chờ, triệt tiêu 100% nguy cơ Deadlock 40P01 giữa nhả thẻ và cấp thẻ.
         * *Xác định tập request ứng viên (Level 1):*
           1. Đơn gốc: `v_temp_origin_id = COALESCE(p_request_id, (SELECT current_request_id FROM public.taxi_cards WHERE code = p_card_code))`.
           2. Đơn chờ ứng viên: `v_candidate_waitlist_id = (SELECT id FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_temp_origin_id ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC LIMIT 1)`.
           3. Khóa toàn bộ request ứng viên theo thứ tự ID tăng dần:
              `SELECT * FROM public.taxi_requests WHERE id IN (v_temp_origin_id, v_candidate_waitlist_id) ORDER BY id ASC FOR UPDATE;`
         * *Khóa thẻ (Level 2):*
           Khóa thẻ giải phóng: `SELECT * FROM public.taxi_cards WHERE code = COALESCE(p_card_code, (SELECT reserved_card_code FROM public.taxi_requests WHERE id = p_request_id)) ORDER BY code ASC FOR UPDATE;`
         * *Tái kiểm tra dưới lock (Double-Check under Lock):*
           - Nếu `p_card_code` được truyền vào: Kiểm tra `v_card.current_request_id = v_temp_origin_id`. Nếu thẻ đã bị đổi chủ hoặc unreserve trước khi lấy được lock, ném lỗi retryable `RAISE EXCEPTION 'Card assignment changed concurrently, please retry.' USING ERRCODE = 'T5001'`.
       - **Cập nhật trạng thái request gốc trong cùng transaction <!-- Sửa theo EFR-20, EFR-22, EFR-29 -->:**
         * *Nếu `p_action_type = 'release_reservation'` (hủy lượt giữ thẻ từ `releaseReservedCard`):* Cập nhật request gốc sang `status = 'card_released'`, `released_reason = p_reason`, `released_by = v_operator.name`, `released_at = now()`, `reserved_card_code = NULL`.
         * *Nếu `p_action_type = 'release_card_to_waitlist'` (nhả thẻ từ kho qua `releaseCardDirectly`):* Cập nhật request gốc `v_temp_origin_id` sang `status = 'waitlist_cards'`, `is_waitlisted = true`, `reserved_card_code = NULL`.
       - **Atomic Auto-Assignment cho đơn chờ khác & Cơ chế Bảo vệ Hàng chờ <!-- Sửa theo EFR-18, EFR-20, EFR-22, EFR-30, EFR-31 -->:**
         * Nếu `v_candidate_waitlist_id` tồn tại và dưới lock vẫn ở `status = 'waitlist_cards'`: Gán ngay thẻ vừa giải phóng cho đơn chờ (`status = 'pending_handover'`, `is_waitlisted = false`, `reserved_card_code = v_card.code`), thẻ giữ trạng thái `reserved` cho đơn chờ mới. Trả JSON `{ "result": "released_and_auto_assigned", "origin_request_id": v_temp_origin_id, "origin_status": ..., "auto_assigned_to": v_candidate_waitlist_id, "card_code": v_card.code }`.
         * Nếu candidate `v_candidate_waitlist_id` bị transaction khác xử lý mất (không còn waitlist): Kiểm tra `IF EXISTS (SELECT 1 FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_temp_origin_id)`. Nếu còn đơn khác trong hàng chờ -> `RAISE EXCEPTION 'Waitlist head changed concurrently, please retry.' USING ERRCODE = 'T5002'` để client/proxy tự động thử lại trên snapshot mới, chọn ứng viên kế tiếp. Tuyệt đối không commit thẻ về `available` khi vẫn còn đơn chờ khác trong hệ thống. <!-- Sửa theo EFR-31 -->
         * Chỉ đưa thẻ về kho `status = 'available'`, `current_request_id = NULL` khi đã kiểm chứng hàng chờ thực sự không còn bất kỳ đơn nào khác. Đơn gốc vẫn duy trì trạng thái `waitlist_cards` (hoặc `card_released`). Trả JSON `{ "result": "released_card_available", "origin_request_id": v_temp_origin_id, "card_code": v_card.code }`.
    5. Thiết lập Trust Boundary, Fail-Closed Security & Quy trình Rollout Webhook: <!-- Sửa theo EFR-09, EFR-12, EFR-19, EFR-21 -->
       - Thu hồi quyền thực thi từ public: `REVOKE ALL ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic TO service_role;`.
       - **Chính sách Fail-Closed tuyệt đối cho Webhook Telegram (EFR-21):**
         * Trong `api/telegram.ts`: Nếu biến môi trường `TELEGRAM_WEBHOOK_SECRET` không tồn tại hoặc rỗng, endpoint từ chối xử lý ngay lập tức với `500 Server Misconfiguration: TELEGRAM_WEBHOOK_SECRET missing` và ghi error log bảo mật (không log secret). Tuyệt đối không cho phép webhook request đi tiếp khi thiếu cấu hình bí mật.
         * Đối với mọi Telegram Webhook update thông thường (`update_id`, `callback_query`, `message`): Bắt buộc kiểm tra header `X-Telegram-Bot-Api-Secret-Token`. So khớp bằng constant-time so sánh (`crypto.timingSafeEqual`). Nếu header thiếu hoặc không khớp secret -> từ chối ngay với `401 Unauthorized` trước khi phân tích payload hay gọi bất kỳ logic DB nào.
       - **Phân tách luồng Proxy Mini App vs Webhook Telegram (EFR-21, EFR-27):**
         * Với MỌI request Mini App proxy (`update.custom_action` bao gồm `sendMessage`, `editMessageText`, `assignCardAtomic`, `cancelRequestAtomic`, `releaseCardAtomic`): Không dùng Telegram Webhook Secret Header mà bắt buộc gửi kèm `init_data` từ `window.Telegram?.WebApp?.initData`. Backend `/api/telegram` xác thực chữ ký HMAC-SHA256 với `TELEGRAM_BOT_TOKEN`. Lấy Telegram ID đã được chứng thực từ `initData` đối chiếu với quyền thao tác hoặc quyền gửi/sửa tin nhắn; từ chối `401 Unauthorized` nếu thiếu hoặc sai chữ ký <!-- Sửa theo EFR-09, EFR-12, EFR-21, EFR-27 -->.
       - **Quy trình Rollout Webhook Secret Telegram an toàn (Zero Downtime) (EFR-19, EFR-21):**
         1. Cấu hình biến môi trường `TELEGRAM_WEBHOOK_SECRET` trên Vercel và `.env`.
         2. Chạy script gọi Telegram Bot API `setWebhook(url='https://quanly-thetaxi.vercel.app/api/telegram', secret_token=process.env.TELEGRAM_WEBHOOK_SECRET)`.
         3. Gọi `getWebhookInfo` để xác nhận Telegram đã cập nhật URL webhook thành công và không báo lỗi kết nối (lưu ý: theo Telegram Bot API, `getWebhookInfo` không trả trường `secret_token` vì lý do bảo mật).
         4. Gửi một Telegram callback / event thực tế đến webhook để xác nhận Telegram đang truyền kèm header `X-Telegram-Bot-Api-Secret-Token` và endpoint trả về `200 OK`.
         5. Deploy phiên bản mã nguồn mới có guard Fail-Closed lên production. Có script kiểm thử tự động kiểm tra các trường hợp: thiếu secret trong runtime env -> 500, thiếu/sai secret header -> 401, header chuẩn -> 200.
  - Chuyển toàn bộ các luồng cấp, đổi thẻ, bàn giao, hủy đơn trong [`src/context/AppContext.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) và [`api/telegram.ts`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/api/telegram.ts) sang gọi qua proxy backend hoặc RPC nguyên tử có xác thực danh tính. <!-- Sửa theo EFR-09, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 -->
- **Sửa Telegram Webhook Race Condition & Idempotency:** Trong [`api/telegram.ts`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/api/telegram.ts), sử dụng duy nhất kết quả trả về từ RPC `assign_taxi_card_atomic`. Webhook không thực thi bất kỳ câu lệnh SQL UPDATE nào lên bảng `taxi_requests` hay `taxi_cards`. Mọi phân nhánh (đã giữ thẻ, gán thẻ mới, hay đưa vào hàng chờ) đều do transaction RPC quyết định và commit nguyên tử. <!-- Sửa theo EFR-14 -->
- **Bảo tồn & Hợp nhất Message Tracker:** <!-- Sửa theo EFR-03, EFR-27, EFR-28 -->
  - Cập nhật cả `secureSendTelegramMessage` và `secureEditTelegramMessage` trong `AppContext.tsx` truyền kèm `init_data` hợp lệ từ Mini App để không bị backend proxy từ chối 401 <!-- Sửa theo EFR-27 -->.
  - Sửa cả `syncEditTelegramMessages` (Mini App) và `editAllTrackedMessages` (Webhook `api/telegram.ts` dòng 410): Luôn đặt `keepTracker = true` ở các bước trung gian.
  - **Kiểm tra kết quả trước khi xóa Tracker ở cả Mini App và Webhook (EFR-27, EFR-28):**
    * Trong `syncEditTelegramMessages` (Mini App) và `editAllTrackedMessages` (Webhook): Chỉ xóa tracker (`keepTracker = false`) khi TOÀN BỘ các lệnh gọi sửa tin nhắn (`secureEditTelegramMessage` / `editMessageText`) đều trả về `{ ok: true }` thành công.
    * Nếu có bất kỳ tin nhắn nào sửa thất bại (do lỗi mạng, rate-limit hoặc Telegram API error), bắt buộc giữ lại bản ghi tracker `msg_track_req_*` trong bảng `users` để retry, tuyệt đối không xóa non làm mất dấu các nút bấm còn hoạt động trên ứng dụng Telegram của các Admin khác. <!-- Sửa theo EFR-28 -->
  - Hợp nhất mảng tracker theo tập hợp `(chatId, messageId)` khi gửi thêm thông báo Admin.

### Out of scope
- Không can thiệp sửa đổi các tính năng khác: OCR đọc hóa đơn, cấu hình hạn mức chuyến, tính năng nhường thẻ khẩn cấp.

---

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - *Single-Store Client-side Architecture kết hợp Supabase Realtime:* Tiếp tục duy trì đồng bộ 2 chiều giữa `AppContext` và bảng `taxi_cards`, `taxi_requests`, `users`.
  - *Invariant 1 đơn active duy nhất (FR-02):* Đã có cho nhân sự, nay bổ sung Invariant ở tầng thẻ: "1 đơn chỉ được giữ tối đa 1 thẻ vật lý active" bảo vệ bằng DB Unique Partial Index và RPC Transaction. <!-- Sửa theo EFR-05, EFR-07 -->
  - *Phương án 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill):* Giữ nguyên cấu trúc giao diện Admin Action Queue.
- **"Cấm kỵ" cần tránh:**
  - Tuyệt đối không tự ý nhả thẻ đang ở trạng thái `in_use` hoặc đã có bằng chứng bàn giao thực tế khi chạy reconcile. <!-- Sửa theo EFR-06 -->
  - Tuyệt đối không tin tưởng mù quáng `operator_name` gửi từ client; danh tính và quyền hạn người thao tác phải được RPC tự đối chiếu với bảng `public.users`. <!-- Sửa theo EFR-08 -->
  - Tuyệt đối không tách rời các lệnh gán thẻ và claim request thành các thao tác rời rạc ngoài client; bắt buộc phải đi qua RPC transaction nguyên tử ở DB. <!-- Sửa theo EFR-07 -->
- **Ràng buộc kiến trúc liên quan:**
  - Cả Mini App (`AppContext.tsx`) và Webhook Telegram (`api/telegram.ts`) đều gọi chung một RPC Function `assign_taxi_card_atomic` tại Supabase.

---

## 4. Giả định và câu hỏi mở

### Giả định
- Dự kiến thẻ `0006` (GSM) đang được giữ cho Thu Hà và thẻ `3571` (Mai Linh) còn ở quầy hành chính, **nhưng bắt buộc phải có bước xác nhận thực tế với Admin kho trước khi chạy lệnh reconcile**. <!-- Sửa theo EFR-06 -->
- Số lượng thẻ vật lý thực tế của công ty hiện tại là 2 thẻ (`0006` và `3571`).

### Câu hỏi mở
- *[Non-blocking]* Admin có mong muốn nhận thêm thông báo pop-up cảnh báo trong Mini App nếu phát hiện đơn vừa được duyệt bởi một Admin khác trên Telegram hay không? (Hiện tại Realtime Toast đã hỗ trợ).

---

## 5. Acceptance Criteria

- [ ] **AC-01 (Data Reconcile Có Kiểm Chứng):** Chụp snapshot DB hiện tại, xác nhận thẻ thực tế với Admin kho; đưa đơn `REQ-2026-104` về `pending_handover` với thẻ được giữ thực tế, thẻ còn lại chuyển về `available` trong kho. <!-- Sửa theo EFR-06 -->
- [ ] **AC-02 (Trạng thái đơn nhất quán):** Đơn `REQ-2026-104` ở tab *Cần xử lý* nằm trong hàng đợi *Chờ giao thẻ* (`pending_handover`), không còn nằm ở hàng đợi *Chờ thẻ* (`waitlist_cards`).
- [ ] **AC-03 (Toàn vẹn Nguyên tử qua DB RPC & Unique Index):** Database có RPC `assign_taxi_card_atomic` và Unique Partial Index chặn đứng việc 1 request mang `> 1` thẻ ở trạng thái `reserved` hoặc `in_use`. Kể cả khi 2 Admin đồng thời chọn 2 thẻ khác nhau cho cùng 1 đơn từ Mini App và Telegram, chỉ có 1 giao dịch commit thành công, giao dịch kia rollback an toàn không để lại thẻ mồ côi. <!-- Sửa theo EFR-01, EFR-05, EFR-07 -->
- [ ] **AC-04 (Webhook Chống Race Condition & Atomic Waitlist Decision):** Khi bấm nút `[✅ Duyệt cấp thẻ]` trên Telegram, webhook gọi duy nhất RPC `assign_taxi_card_atomic`. Cả ba phân nhánh (đã giữ thẻ, cấp thẻ mới, hết thẻ xếp waitlist) đều được quyết định và commit trong transaction RPC đang khóa request; Webhook không bao giờ tự ý UPDATE request ngoài RPC, loại bỏ hoàn toàn race condition làm đè trạng thái `pending_handover` thành `waitlist_cards`. <!-- Sửa theo EFR-14 -->
- [ ] **AC-05 (Đồng bộ tin nhắn Telegram đa Admin):** Khi bất kỳ Admin nào thao tác (duyệt/cấp thẻ/hủy/bàn giao), tin nhắn gốc của **tất cả Admin** trong danh sách nhận thông báo đều được tự động sửa nội dung và gỡ sạch nút bấm inline. Tracker tin nhắn không bị xóa non ở các bước trung gian của cả Webhook lẫn Mini App. <!-- Sửa theo EFR-03 -->
- [ ] **AC-06 (Bộ đếm kho thẻ chính xác):** Màn hình đăng ký mượn thẻ của nhân sự hiển thị đúng số lượng thẻ khả dụng thực tế (`Sẵn sàng: 1 thẻ`), không bị báo sai `Kho tạm hết thẻ`.
- [ ] **AC-07 (An toàn Bàn giao & Hủy đơn qua RPC):** Thao tác `confirmHandover` đổi thẻ thực tế và hoàn tất bàn giao: RPC chuyển thẻ sang `in_use`, unreserve thẻ cũ (nếu đổi thẻ tại quầy), ghi nhận `actual_card_code`, `handed_over_at`, `handed_over_by` và cập nhật đơn sang `holding_card`. Thao tác `cancelRequest` gọi RPC giải phóng sạch mọi thẻ liên quan. Nhân viên tạo đơn được phép tự hủy đơn của chính mình khi đơn ở các trạng thái trước bàn giao (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`) và thẻ được tự động giải phóng/chuyển giao; các trạng thái sau bàn giao bị từ chối; Admin có thể hủy hoặc thu hồi thẻ tùy ý. <!-- Sửa theo EFR-04, SFR-01, EFR-07, EFR-10, EFR-13, EFR-15 -->
- [ ] **AC-08 (RPC Trust Boundary & Authorization):** RPC chỉ cho phép gọi qua `service_role` (hoặc server endpoint `/api/telegram` đã xác thực header `X-Telegram-Bot-Api-Secret-Token` của webhook hoặc chữ ký HMAC-SHA256 của Mini App `initData`); chặn đứng client công khai gọi trực tiếp bằng `anon` key hoặc gửi POST webhook giả mạo với ID Admin. RPC nhận diện người dùng qua cả `users.id` lẫn `telegram_id`, gán tên người duyệt từ `users.name` trong DB. Người dùng không có quyền hoặc mạo danh bị từ chối `Unauthorized`. <!-- Sửa theo EFR-08, EFR-09, EFR-11, EFR-12 -->
- [ ] **AC-09 (Chuyển giao thẻ Tự động từ Hàng chờ & Khóa Callback sau Bàn giao):** Khi một thẻ được giải phóng do nhân viên hủy đơn hoặc Admin nhả thẻ, transaction DB tự động tìm đơn chờ ưu tiên cao nhất (`waitlist_cards` theo thời gian đi rồi FIFO) và gán ngay thẻ đó sang `pending_handover`, phát thông báo cho người mượn mới. Callback duyệt lặp lại trên đơn đã ở trạng thái sau bàn giao (`holding_card`, `completed`,...) trả `already_processed` và tuyệt đối không mutate dữ liệu làm hạ trạng thái đơn. <!-- Sửa theo EFR-17, EFR-18 -->

---

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `supabase/migrations/` | Tạo mới | Bổ sung Unique Partial Index `idx_taxi_cards_single_active_request` và 3 RPC function `assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic` với `SECURITY DEFINER`, auto-assignment từ waitlist trong transaction, guard callback sau bàn giao, enum trạng thái chuẩn xác, revoke từ `anon`, cấp cho `service_role` | 🟡 | Không phá vỡ schema hiện có |
| [`src/services/supabaseService.ts`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/services/supabaseService.ts) | Sửa | Thêm wrapper gọi backend proxy `/api/telegram` có xác thực `initData` cho `assignCardAtomic`, `cancelRequestAtomic`, `releaseCardAtomic`; loại bỏ hoàn toàn fallback RPC trực tiếp từ browser client <!-- Sửa theo EFR-24 --> | 🟢 | Mở rộng service method |
| [`src/context/AppContext.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) | Sửa | Chuyển toàn bộ `assignCardFromWaitlist`, `adminApprove`, `confirmHandover`, `cancelRequest`, `releaseReservedCard`, `releaseCardDirectly` sang bất đồng bộ `Promise<{ success: boolean; message: string }>` gọi qua backend proxy kèm `initData`; chỉ cập nhật local state sau khi server commit thành công <!-- Sửa theo EFR-23 --> | 🟡 | Cập nhật return type của AppContextType sang Promise |
| [`api/telegram.ts`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/api/telegram.ts) | Sửa | Xác thực header `X-Telegram-Bot-Api-Secret-Token` cho Webhook (fail-closed); hỗ trợ proxy RPC backend với xác thực chữ ký Telegram `initData`; chuyển `approve_req_` sang gọi RPC `assign_taxi_card_atomic` với `callerUser?.id || callerFromId`; bảo toàn tracker trong `editAllTrackedMessages`, hợp nhất tin nhắn Admin sau Leader duyệt | 🟡 | Giữ nguyên API contract Telegram Webhook |
| [`src/components/admin/AdminActionQueueView.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) | Sửa | Chuyển các action handler sang `async/await`, giữ `actionLoadingIds` trong suốt vòng đời promise, không giải phóng bằng timeout sớm <!-- Sửa theo EFR-23 --> | 🟢 | Không đổi UI props |
| [`src/components/admin/ReleaseCardModal.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/ReleaseCardModal.tsx) | Sửa | Chuyển `handleRelease` sang `async/await`, thêm loading state, chỉ đóng modal sau khi server commit thành công <!-- Sửa theo EFR-23 --> | 🟢 | Không đổi modal props |
| [`src/components/admin/AdminInventoryView.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminInventoryView.tsx) | Sửa | Chuyển `releaseCardDirectly` sang `async/await`, thêm loading trên nút bấm xác nhận <!-- Sửa theo EFR-23 --> | 🟢 | Không đổi UI props |
| [`src/components/employee/EmployeeRequestsViewMinimal.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRequestsViewMinimal.tsx) | Sửa | Chuyển `handleCancel` sang `async/await`, đóng popup xác nhận và báo thành công sau khi server hoàn tất <!-- Sửa theo EFR-23 --> | 🟢 | Không đổi UI props |
| [`src/components/employee/EmployeeRequestsView.tsx`](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRequestsView.tsx) | Sửa | Chuyển `handleCancel` sang `async/await`, đóng popup xác nhận và báo thành công sau khi server hoàn tất <!-- Sửa theo EFR-26 --> | 🟢 | Không đổi UI props |

---

## 7. Risk Triage và Review Focus

- **Review required:** Yes (Đã xử lý qua `expert-rebuttal` Round 11)
- **Risk hotspots:**
  - Trust Boundary & Quy trình Rollout Webhook Secret: Bắt buộc gọi Telegram Bot API `setWebhook(url, secret_token)` và xác minh `getWebhookInfo` trước khi bật guard kiểm tra header trên backend; tránh tình trạng deploy code chặn header trước khi Telegram gửi khiến toàn bộ bot Telegram production bị từ chối 401. <!-- Sửa theo EFR-19 -->
  - Cập nhật Toàn Vẹn Request Gốc khi Nhả Thẻ: Khi gọi `release_taxi_card_atomic`, phải cập nhật dứt điểm request gốc sang `card_released` (nếu hủy lượt giữ) hoặc sang `waitlist_cards` (nếu nhả thẻ từ kho), xóa `reserved_card_code` trước khi gán thẻ cho đơn chờ mới; không để đơn gốc tiếp tục hiển thị chờ giao cùng mã thẻ đã chuyển chủ. <!-- Sửa theo EFR-20 -->
  - Guard Trạng thái Callback sau Bàn giao: Chặn đứng nguy cơ một callback Telegram lặp lại làm hạ cấp đơn từ `holding_card` về `pending_handover` hoặc đè trạng thái đơn đã hoàn tất/hủy. <!-- Sửa theo EFR-17 -->
  - Tự động Gán thẻ từ Hàng chờ Nguyên tử (Atomic Auto-Assignment): Gộp bước tìm đơn chờ ưu tiên và gán thẻ vừa giải phóng vào cùng transaction DB với system role; không phụ thuộc quyền employee của người hủy đơn; đảm bảo đúng thứ tự ưu tiên chuyến đi gần nhất -> FIFO. <!-- Sửa theo EFR-18 -->
  - Thứ tự phân nhánh RPC theo Operation: Ưu tiên xử lý nhánh bàn giao (`p_is_handover = true`) và nhánh chỉ định thẻ (`p_card_code`) trước nhánh duyệt nhanh idempotent, bảo đảm các thao tác bàn giao, đổi thẻ vật lý tại quầy không bị nuốt mất thành `assigned_existing`. <!-- Sửa theo EFR-15 -->
  - Tránh False Waitlist do Contention: Bỏ hoàn toàn `SKIP LOCKED` khi kiểm tra kho thẻ rảnh; dùng `ORDER BY code ASC FOR UPDATE` với `SET LOCAL lock_timeout = '2s'` để chờ transaction cạnh tranh commit/rollback, phân biệt rõ kho hết thẻ thật với tranh chấp tạm thời. <!-- Sửa theo EFR-16 -->
  - Quyết định Hàng chờ Nguyên tử (Atomic Waitlist Branch): Loại bỏ hoàn toàn câu lệnh UPDATE rời rạc ngoài RPC khi kho hết thẻ; đưa toàn bộ logic chuyển đơn sang `waitlist_cards` vào transaction RPC đang khóa request, triệt tiêu race condition ghi đè lên đơn đã được gán thẻ. <!-- Sửa theo EFR-14 -->
  - Quyền tự hủy đơn của Nhân viên & Enum trạng thái: Đảm bảo `cancel_taxi_request_atomic` sử dụng đúng danh sách enum trạng thái (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`), cho phép người tạo đơn hủy yêu cầu của chính mình khi chưa bàn giao và tự động hoàn thẻ về kho, không bị chặn bởi quyền Admin. <!-- Sửa theo EFR-10, EFR-13 -->
  - ID Mapping contract: Đảm bảo RPC tra cứu được cả `users.id` lẫn `telegram_id` của operator, tránh lỗi contract mismatch giữa webhook Telegram và Mini App. <!-- Sửa theo EFR-11 -->
  - Đảm bảo RPC transaction rollback toàn bộ khi có lỗi: Nếu một thẻ đã bị người khác claim giữa chừng, RPC phải `RAISE EXCEPTION` để transaction tự động hủy bỏ, không cập nhật request. <!-- Sửa theo EFR-07 -->
  - Rủi ro nhả nhầm thẻ thực tế đang lưu thông khi reconcile (Đã giải quyết bằng bước kiểm chứng thực tế và snapshot). <!-- Sửa theo EFR-06 -->
  - Vòng đời của bản ghi tracker tin nhắn (`msg_track_req_*`).
- **Review focus areas:**
  1. Thứ tự rollout webhook secret có bảo đảm zero downtime cho Telegram Bot không? -> CÓ, cấu hình `setWebhook` trước khi bật chặn header. <!-- Sửa theo EFR-19 -->
  2. Request gốc khi bị nhả thẻ có được cập nhật dứt điểm sang `card_released` hoặc `waitlist_cards` không? -> CÓ, được khóa và cập nhật trong cùng transaction RPC. <!-- Sửa theo EFR-20 -->
  3. Callback lặp lại sau khi đã bàn giao có bị từ chối và bảo toàn nguyên trạng `holding_card` không? -> CÓ, do guard `already_processed`. <!-- Sửa theo EFR-17 -->
  4. Nhân viên hủy đơn có thẻ khi đang có đơn chờ thì thẻ có được tự động gán ngay cho đơn chờ ưu tiên trong cùng transaction không? -> CÓ, thông qua Atomic Auto-Assignment trong RPC. <!-- Sửa theo EFR-18 -->
  5. Thao tác bàn giao (`confirmHandover`) và đổi thẻ có được RPC thực thi chính xác không bị bỏ qua thành `assigned_existing` không? -> CÓ, do thứ tự ưu tiên nhánh Operation. <!-- Sửa theo EFR-15 -->
  6. Transaction duyệt nhanh có bị đưa nhầm vào waitlist khi thẻ rảnh đang bị khóa tạm thời không? -> KHÔNG, do loại bỏ `SKIP LOCKED` và dùng lock queue có timeout. <!-- Sửa theo EFR-16 -->
  7. RPC `assign_taxi_card_atomic` có xử lý nguyên tử cả trường hợp hết thẻ đưa vào waitlist mà không để webhook UPDATE ngoài RPC không? -> CÓ. <!-- Sửa theo EFR-14 -->
  8. RPC `assign_taxi_card_atomic` có chặn đứng cuộc gọi giả mạo quyền từ anon client và webhook giả mạo không? -> CÓ, vì quyền thực thi bị thu hồi khỏi `anon` và đưa qua server endpoint có xác thực chữ ký `initData`/`X-Telegram-Bot-Api-Secret-Token`. <!-- Sửa theo EFR-09, EFR-12 -->
  9. Nhân viên có tự hủy được đơn ở mọi trạng thái trước bàn giao (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`) không? -> CÓ, thông qua `cancel_taxi_request_atomic`. <!-- Sửa theo EFR-10, EFR-13 -->
  10. Cả Mini App và Webhook Telegram có dùng chung cùng một RPC interface không? -> CÓ.

---

## 8. Chiến lược triển khai

- **Phase strategy:** 3 Phase rõ ràng:
  - **Phase 1: DB Invariant Migration & Verified Data Reconcile:** Tạo DB Unique Partial Index và 3 RPC function (`assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic`) có `SECURITY DEFINER`, thiết lập Trust Boundary (revoke từ anon, cấp cho service_role), phân nhánh chuẩn theo Operation, cập nhật toàn vẹn request gốc khi nhả thẻ, loại bỏ `SKIP LOCKED`, hỗ trợ tra cứu cả `users.id` lẫn `telegram_id`, bảo vệ trạng thái `holding_card` và tích hợp Atomic Auto-Assignment từ waitlist; chụp snapshot DB và kiểm chứng thực tế thẻ với Admin kho trước khi chạy script reconcile đưa `REQ-2026-104` về `pending_handover`. <!-- Sửa theo EFR-05, EFR-06, EFR-07, EFR-08, EFR-09, EFR-10, EFR-11, EFR-15, EFR-16, EFR-17, EFR-18, EFR-20 -->
  - **Phase 2: Atomic RPC Integration, Rollout Webhook Secret & Telegram Concurrency:** 
    1. Cấu hình biến môi trường `TELEGRAM_WEBHOOK_SECRET` và gọi Telegram API `setWebhook` kèm `secret_token`, kiểm tra `getWebhookInfo` hoạt động ổn định trước khi bật guard header. <!-- Sửa theo EFR-19 -->
    2. Chuyển đổi toàn bộ các hàm gán/nhả thẻ và hủy đơn trong `AppContext` và `api/telegram.ts` sang sử dụng backend proxy hoặc RPC nguyên tử truyền `operatorId` (với `callerUser?.id || callerFromId`); xử lý thông báo auto-assigned khi có kết quả trả về từ RPC; bảo toàn và hợp nhất tracker tin nhắn Telegram. <!-- Sửa theo EFR-01, EFR-03, EFR-04, EFR-07, EFR-08, EFR-09, EFR-10, EFR-11, EFR-14, EFR-15, EFR-17, EFR-18, EFR-19, EFR-20, SFR-01 -->
  - **Phase 3: Integration Verification, Concurrency & Security Testing:** Kiểm thử kịch bản 2 Admin cùng lúc chọn 2 thẻ khác nhau cho 1 đơn; kiểm thử bảo mật trust boundary (chặn anon tự gọi RPC với ID admin mạo danh, cho phép employee tự hủy đơn của mình và chặn hủy đơn người khác); kiểm thử bàn giao và đổi thẻ tại quầy; kiểm thử release thẻ cập nhật đúng request gốc; kiểm thử tranh chấp kho rảnh không sinh waitlist nhầm; kiểm thử callback lặp lại sau bàn giao; kiểm thử auto-assign từ hàng chờ khi hủy/nhả thẻ; kiểm thử ép lỗi rollback (fault injection) và kiểm tra đồng bộ Realtime. <!-- Sửa theo EFR-05, EFR-07, EFR-08, EFR-09, EFR-10, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20 -->
- **Thứ tự triển khai:** Phase 1 -> Phase 2 -> Phase 3.

---

## 9. Test Strategy

- **DB/Test Harness:** Kiểm thử trên Supabase và dev server cục bộ.
- **Automated / Unit tests:**
  - Script kiểm tra Trust Boundary & Phân quyền RPC: Thử gọi trực tiếp RPC bằng anon key với ID của Admin -> Khẳng định bị từ chối do không có quyền execute hoặc thiếu xác thực server. Thử gửi POST callback giả mạo đến webhook không có/sai `X-Telegram-Bot-Api-Secret-Token` -> Khẳng định bị từ chối 401. Thử gọi `cancel_taxi_request_atomic` với vai trò nhân viên tạo đơn ở các trạng thái trước bàn giao (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`) -> Thành công và giải phóng thẻ; thử ở trạng thái sau bàn giao -> Bị từ chối không cho phép hủy; thử với tài khoản nhân viên khác -> Bị từ chối `Unauthorized`. <!-- Sửa theo EFR-08, EFR-09, EFR-10, EFR-12, EFR-13 -->
  - Script kiểm tra Webhook Secret Rollout (EFR-19): Gọi `getWebhookInfo` xác nhận URL kết nối Telegram webhook thành công; gửi test callback thực tế từ Telegram xác nhận có header `X-Telegram-Bot-Api-Secret-Token` và được xử lý 200 OK.
  - Script kiểm tra Cập nhật Request Gốc khi Release Thẻ (EFR-20): (1) Gọi `releaseReservedCard` -> Đơn gốc chuyển sang `card_released`, thẻ chuyển sang cho đơn chờ (hoặc về `available`); (2) Gọi `releaseCardDirectly` từ kho -> Đơn gốc chuyển sang `waitlist_cards`, thẻ chuyển sang đơn chờ mới (hoặc về `available`); xác nhận không có đơn nào còn trỏ tới mã thẻ đã chuyển chủ.
  - Script kiểm tra Bàn giao & Đổi thẻ (EFR-15): (1) Bàn giao đúng thẻ đã reserved -> chuyển thẻ `in_use`, đơn `holding_card`, ghi nhận `handed_over_at` / `handed_over_by`; (2) Bàn giao đổi sang thẻ khác -> unreserve thẻ cũ, thẻ mới `in_use`; (3) Đổi thẻ trước bàn giao.
  - Script kiểm tra Guard Callback sau Bàn giao (EFR-17): Gọi callback Telegram duyệt nhanh trên đơn đã ở trạng thái `holding_card`, `completed`, `cancelled` -> Khẳng định RPC trả `already_processed` và đơn giữ nguyên trạng thái `holding_card`, không bị đẩy lùi về `pending_handover`.
  - Script kiểm tra Atomic Auto-Assignment từ Waitlist (EFR-18): Tạo đơn waitlist A; nhân viên B tự hủy đơn đang giữ thẻ -> Khẳng định trong 1 transaction thẻ được chuyển ngay sang cho đơn A (`status = 'pending_handover'`, `reserved_card_code` được gán), không bị rơi về `available`; kiểm tra tương tự khi Admin nhả thẻ khi có nhiều đơn chờ -> đơn có chuyến gần nhất được nhận thẻ trước.
  - Script kiểm tra Tranh chấp Kho rảnh & False Waitlist (EFR-16): Giả lập transaction A khóa thẻ rảnh rồi rollback trong khi transaction B duyệt nhanh -> Khẳng định B được cấp thẻ hoặc nhận lỗi retryable, không bị commit nhầm sang `waitlist_cards` khi kho vẫn còn thẻ.
  - Script kiểm tra DB RPC & Unique Constraint: Thử chạy RPC với 2 thẻ khác nhau cho cùng 1 đơn đồng thời -> Khẳng định chỉ 1 RPC commit thành công, RPC kia rollback toàn bộ. <!-- Sửa theo EFR-05, EFR-07 -->
  - Script kiểm tra ID Mapping contract: Kiểm tra `p_operator_id` hoạt động với cả `users.id` và `telegram_id`. <!-- Sửa theo EFR-11 -->
  - Script kiểm tra Fault Injection: Giả lập lỗi ở bước cập nhật request trong RPC -> Khẳng định thẻ không bị đổi trạng thái (atomic rollback). <!-- Sửa theo EFR-07 -->
  - Script kiểm tra Webhook `approve_req_` với RPC.
- **Manual verification:**
  1. Xác minh thẻ thực tế tại bàn Admin.
  2. Kiểm tra màn hình Kho thẻ, Cần xử lý, Đăng ký.
  3. Bấm thử các nút duyệt trên Telegram trên cả 2 tài khoản Admin.

---

## 10. Rollback Plan

- Nếu có lỗi phát sinh, hoàn tác git commit về commit `a7a3351`, drop function `assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic`, drop index `idx_taxi_cards_single_active_request` và khôi phục trạng thái từ snapshot DB đã lưu.

---

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`
