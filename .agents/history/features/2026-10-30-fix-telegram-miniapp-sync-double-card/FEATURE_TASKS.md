# Feature Tasks: Khắc phục lỗi không đồng bộ Telegram - MiniApp và cấp trùng 2 thẻ (Multi-card Concurrency & Sync Fix)

> **Trạng thái**: ✅ Hoàn thành  
> **Liên kết plan**: `FEATURE_PLAN.md`  
> **Review gate**: Đã qua review gate (Round 21 ✅ HỘI TỤ)  
> **Feature slug**: `fix-telegram-miniapp-sync-double-card`  
> **Ngày tạo**: 2026-10-30  

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: DB Invariant Migration & Verified Data Reconcile

**Mục tiêu:** Khôi phục dữ liệu kẹt sau khi kiểm chứng thực tế và thiết lập DB Unique Partial Index cùng 3 RPC Functions nguyên tử có ranh giới bảo mật & phân quyền trên Supabase.

- [x] Task 1.1: Chụp snapshot dữ liệu DB Supabase (`taxi_cards`, `taxi_requests`, tracker) ra file an toàn; tiến hành bước kiểm chứng thực tế với Admin giữ kho về trạng thái 2 thẻ `0006` và `3571`. <!-- Sửa theo EFR-06 -->
- [x] Task 1.2: Chạy script reconcile 1 lần có điều kiện (chỉ thực thi khi có xác nhận thực tế): Cập nhật đơn `REQ-2026-104` sang `pending_handover` với thẻ được xác nhận, thẻ còn lại chuyển về `available` rảnh trong kho; tuyệt đối không tự ý nhả thẻ `in_use`. <!-- Sửa theo EFR-02, EFR-06 -->
- [x] Task 1.3: Tạo migration `supabase/migrations/20261030_enforce_single_active_card_per_request.sql`: <!-- Sửa theo EFR-05, EFR-07, EFR-08, EFR-09, EFR-10, EFR-11, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18 -->
  - Bổ sung Unique Partial Index `idx_taxi_cards_single_active_request` trên `taxi_cards(current_request_id) WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use')`.
  - Định nghĩa RPC `assign_taxi_card_atomic(p_request_id text, p_card_code text DEFAULT NULL, p_operator_id text DEFAULT NULL, p_is_handover boolean DEFAULT false)`:
    + Cấu hình `SECURITY DEFINER` và `SET search_path = public, pg_temp;`.
    + Schema-qualify: `public.taxi_cards`, `public.taxi_requests`, `public.users`.
    + Tự xác thực quyền: Kiểm tra `p_operator_id` trong `public.users` theo `id = p_operator_id OR telegram_id = p_operator_id` (hỗ trợ cả UUID/ID nội bộ lẫn Telegram ID của Admin/Super Admin). Chỉ cho phép role `admin`, `admin_hr` hoặc super admin. Lấy tên hiển thị từ `users.name` trong DB để ghi `admin_approver_name` / `handed_over_by`. <!-- Sửa theo EFR-11 -->
    + Khóa request `FOR UPDATE`, kiểm tra trạng thái hợp lệ. Xử lý nguyên tử theo thứ tự thao tác (Operation Order):
      1. *Nhánh bàn giao (`p_is_handover = true`):* Khóa thẻ chỉ định, unreserve thẻ cũ (nếu đổi thẻ tại quầy), claim thẻ `status = 'in_use'`, cập nhật request `status = 'holding_card'`, `actual_card_code = p_card_code`, `handed_over_at = now()`, `handed_over_by = v_operator.name`. Trả `{ "result": "handed_over", "card_code": p_card_code }`. <!-- Sửa theo EFR-15 -->
      2. *Nhánh gán/đổi thẻ chỉ định (`p_card_code` có giá trị, `p_is_handover = false`):* Khóa thẻ chỉ định, unreserve thẻ cũ, claim thẻ `status = 'reserved'`, cập nhật request sang `pending_handover`, `reserved_card_code = p_card_code`. Trả `{ "result": "assigned_new", "card_code": p_card_code }`. <!-- Sửa theo EFR-15 -->
      3. *Nhánh duyệt nhanh không chỉ định thẻ (Telegram approve):*
         - Guard trạng thái: Nếu đơn đã ở các trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `completed`, `card_released`, `cancelled`, `rejected_*`), trả ngay `{ "result": "already_processed", "status": v_req.status }` mà không mutate dữ liệu. <!-- Sửa theo EFR-17 -->
         - Nếu đơn đang ở `pending_handover` và đã có thẻ active ở trạng thái `reserved`: Trả `{ "result": "assigned_existing", "card_code": v_existing_code }`.
         - Nếu chưa có thẻ (đơn ở `pending_admin`/`pending_leader`): Khóa thẻ rảnh bằng `SET LOCAL lock_timeout = '2s'; SELECT ... FROM taxi_cards WHERE status = 'available' ORDER BY code ASC LIMIT 1 FOR UPDATE;` (TUYỆT ĐỐI KHÔNG DÙNG SKIP LOCKED). Có thẻ -> claim và trả `assigned_new`; hết thẻ -> cập nhật request sang `waitlist_cards`, `is_waitlisted = true` ngay trong transaction và trả `waitlisted`. Webhook không tự UPDATE ngoài RPC. <!-- Sửa theo EFR-14, EFR-16 -->
  - Định nghĩa RPC `cancel_taxi_request_atomic(p_request_id text, p_reason text, p_operator_id text)` kèm Atomic Auto-Assignment: <!-- Sửa theo EFR-10, EFR-11, EFR-13, EFR-18, EFR-30 -->
    + Kiểm tra danh tính qua `public.users` (`id = p_operator_id OR telegram_id = p_operator_id`).
    + Cho phép người tạo đơn (`target_req.employee_id = v_operator.id` hoặc trùng mã nhân viên) tự hủy đơn của chính mình khi đơn ở đúng các trạng thái hợp lệ trước bàn giao (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`), HOẶC Admin/Admin HR hủy bất kỳ đơn nào chưa bàn giao. Nếu đơn đã ở trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `completed`,...) -> quăng lỗi không cho phép hủy. <!-- Sửa theo EFR-13 -->
    + Áp dụng thứ tự khóa phân cấp toàn cục (Level 1: Requests theo ID tăng dần -> Level 2: Card): Tìm candidate waitlist request `v_candidate_waitlist_id`; khóa đồng thời `p_request_id` và `v_candidate_waitlist_id` bằng `SELECT * FROM taxi_requests WHERE id IN (p_request_id, v_candidate_waitlist_id) ORDER BY id ASC FOR UPDATE;` trước khi khóa thẻ ở Level 2. Cập nhật hủy và auto-assign nguyên tử. <!-- Sửa theo EFR-30 -->
  - Định nghĩa RPC `release_taxi_card_atomic(p_request_id text DEFAULT NULL, p_card_code text DEFAULT NULL, p_reason text DEFAULT NULL, p_operator_id text DEFAULT NULL, p_action_type text DEFAULT 'release_reservation')` dành riêng cho Admin nhả thẻ/thu hồi thẻ và cập nhật toàn vẹn request gốc: <!-- Sửa theo EFR-10, EFR-18, EFR-20, EFR-22, EFR-29, EFR-30 -->
    + Áp dụng thứ tự khóa phân cấp toàn cục: **Level 1 (TẤT CẢ các Request tham gia: Đơn gốc + Đơn chờ) theo `ORDER BY id ASC FOR UPDATE`, sau đó Level 2 (Card) theo `ORDER BY code ASC FOR UPDATE`**. Tuyệt đối không giữ khóa Card trước khi khóa đơn chờ. Thực hiện Double-Check dưới lock: nếu `v_card.current_request_id <> v_temp_req_id` thì báo lỗi retryable thay vì commit sai chủ. <!-- Sửa theo EFR-29, EFR-30: Triệt tiêu 100% nguy cơ Deadlock 40P01 giữa release và assign -->
    + Nếu `p_action_type = 'release_reservation'` (hủy lượt giữ thẻ): Cập nhật request gốc sang `status = 'card_released'`, `released_reason = p_reason`, `released_by = v_operator.name`, `released_at = now()`, `reserved_card_code = NULL`.
    + Nếu `p_action_type = 'release_card_to_waitlist'` (nhả thẻ từ kho): Nếu thẻ đang liên kết với request gốc, cập nhật request gốc sang `status = 'waitlist_cards'`, `is_waitlisted = true`, `reserved_card_code = NULL`.
    + Thực hiện Atomic Auto-Assignment thẻ vừa giải phóng cho đơn chờ đã khóa ở Level 1 (`v_candidate_waitlist_id` LOẠI TRỪ đơn gốc). Nếu có đơn chờ hợp lệ -> gán thẻ sang `pending_handover`. Nếu candidate không còn waitlist nhưng trong DB vẫn còn đơn khác chờ -> ném lỗi retryable `T5002` để auto-retry; chỉ đưa thẻ về kho `available` khi đã kiểm chứng hàng chờ thực sự không còn bất kỳ đơn nào khác. Tuyệt đối không gán ngược lại cho chính đơn gốc vừa bị nhả thẻ. <!-- Sửa theo EFR-18, EFR-20, EFR-22, EFR-30, EFR-31 -->
  - Thiết lập Trust Boundary: `REVOKE ALL ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic TO service_role;` <!-- Sửa theo EFR-09 -->.
- [x] Task 1.4: Bổ sung method RPC wrapper trong `src/services/supabaseService.ts`: `assignCardAtomic(requestId, cardCode, operatorId, isHandover)`, `cancelRequestAtomic(requestId, reason, operatorId)` và `releaseCardAtomic(requestId, cardCode, reason, operatorId, actionType)` gọi duy nhất qua backend proxy `/api/telegram` (xác thực `initData`, thực thi với `service_role` server-side); loại bỏ hoàn toàn fallback RPC trực tiếp từ browser client (vì quyền anon/authenticated đã bị revoke trên DB). Khi proxy lỗi, tự động retry tối đa 3 lần với exponential backoff khi gặp mã lỗi retryable (`T5001`, `T5002`, `40P01`), trả kết quả lỗi `{ success: false, message: ... }` rõ ràng nếu quá số lần thử. <!-- Sửa theo EFR-07, EFR-08, EFR-09, EFR-10, EFR-20, EFR-24, EFR-31 -->
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc): Áp dụng migration lên DB; chạy test script xác minh: gọi trực tiếp bằng anon key bị từ chối; gọi qua service role với user `employee` tự hủy đơn mình thành công; employee hủy đơn người khác bị chặn `Unauthorized`; gọi duyệt cấp thẻ với `admin` thành công; thử chèn 2 thẻ active cho 1 request -> Postgres reject Unique Violation. <!-- Sửa theo EFR-09, EFR-10, EFR-11 -->

---

## Phase 2: Atomic RPC Integration & Telegram Webhook Concurrency

**Mục tiêu:** Chuyển đổi toàn bộ các luồng cấp/đổi/nhả thẻ và hủy đơn ở cả AppContext và Webhook `/api/telegram` sang RPC nguyên tử qua backend proxy có xác thực; rollout an toàn Webhook Secret; bảo toàn tracker tin nhắn đa Admin.

- [x] Task 2.0: Rollout Telegram Webhook Secret Token an toàn (Zero Downtime & Fail-Closed): <!-- Sửa theo EFR-19, EFR-21 -->
  - Cấu hình biến môi trường `TELEGRAM_WEBHOOK_SECRET` trên Vercel và file `.env`.
  - Chạy script Node.js gọi Telegram API `setWebhook(url='https://quanly-thetaxi.vercel.app/api/telegram', secret_token=process.env.TELEGRAM_WEBHOOK_SECRET)`.
  - Gọi Telegram API `getWebhookInfo` để xác nhận Telegram đã cập nhật URL thành công và không báo lỗi đồng bộ (lưu ý: `getWebhookInfo` không trả trường `secret_token` vì lý do bảo mật).
  - Gửi 1 test callback / event thực tế từ Telegram đến webhook để xác nhận Telegram đang truyền kèm header `X-Telegram-Bot-Api-Secret-Token` và endpoint xử lý thành công 200 OK.
  - Triển khai code guard Fail-Closed lên `api/telegram.ts`: Bắt buộc kiểm tra sự hiện diện của `TELEGRAM_WEBHOOK_SECRET` (nếu thiếu/rỗng -> trả ngay 500 Misconfiguration, từ chối mọi update); nếu thiếu hoặc sai header `X-Telegram-Bot-Api-Secret-Token` -> từ chối 401 Unauthorized trước khi đọc body/gọi DB.
- [x] Task 2.1: Chuyển toàn bộ các hàm gán/nhả thẻ và hủy đơn trong `src/context/AppContext.tsx` sang bất đồng bộ `Promise<{ success: boolean; message: string }>` gọi RPC nguyên tử thông qua `supabaseService` truyền `currentUser.id`: <!-- Sửa theo EFR-01, EFR-04, EFR-07, EFR-08, EFR-09, EFR-10, EFR-18, EFR-20, EFR-23, EFR-24, SFR-01 -->
  - Cập nhật interface `AppContextType`: Đổi kiểu trả về của `assignCardFromWaitlist`, `adminApprove`, `confirmHandover`, `cancelRequest`, `releaseReservedCard`, `releaseCardDirectly` thành `Promise<{ success: boolean; message: string }>`. <!-- Sửa theo EFR-23 -->
  - Triển khai `async/await` bên trong từng hàm, gọi `supabaseService` qua backend proxy, chỉ cập nhật local state sau khi proxy/RPC server trả về kết quả thành công hoặc refresh lại state nếu gặp lỗi; loại bỏ optimistic update sớm gây lệch trạng thái. <!-- Sửa theo EFR-23 -->
  - `assignCardFromWaitlist`: gọi `await assignCardAtomic(requestId, cardCode, currentUser.id, false)`.
  - `adminApprove`: gọi `await assignCardAtomic(requestId, undefined, currentUser.id, false)` để kích hoạt Nhánh 3 (duyệt nhanh nguyên tử trong RPC). Loại bỏ hoàn toàn việc tìm thẻ (`cards.find`) và tự quyết định `waitlist_cards` ở client; client phân nhánh cập nhật local state và gửi thông báo theo `result` trả về từ RPC (`assigned_new`, `assigned_existing`, `waitlisted`, `already_processed`), tương tự luồng Telegram Webhook. <!-- Sửa theo EFR-25 -->
  - `confirmHandover`: gọi `await assignCardAtomic(requestId, actualCardCode, currentUser.id, true)`.
  - `cancelRequest`: gọi `await cancelRequestAtomic(requestId, reason, currentUser.id)`. Khi RPC trả về `auto_assigned_to`, phát thông báo In-App và Telegram cho người mượn mới được gán thẻ tự động. <!-- Sửa theo EFR-18 -->
  - `releaseReservedCard`: gọi `await releaseCardAtomic(requestId, undefined, reason, currentUser.id, 'release_reservation')`. Đơn gốc chuyển sang `card_released`, xử lý thông báo auto-assign cho đơn chờ nếu có. <!-- Sửa theo EFR-20 -->
  - `releaseCardDirectly`: gọi `await releaseCardAtomic(undefined, cardCode, reason, currentUser.id, 'release_card_to_waitlist')`. Đơn gốc chuyển sang `waitlist_cards`, xử lý thông báo auto-assign cho đơn chờ nếu có. <!-- Sửa theo EFR-20 -->
  - Loại bỏ logic gán thẻ thủ công rời rạc trong helper `autoAssignCardIfWaitlisted` ở client; chuyển toàn bộ trách nhiệm chọn đơn chờ ưu tiên vào transaction RPC. <!-- Sửa theo EFR-18 -->
- [x] Task 2.1b: Cập nhật toàn bộ các UI caller sang bất đồng bộ (`async/await`) và ràng buộc trạng thái loading chặt chẽ: <!-- Sửa theo EFR-23 -->
  - `src/components/admin/AdminActionQueueView.tsx`: Chuyển `handleAdminApprove`, `handleConfirmHandover`, `handleAssignCard` sang `async (req) => { ... }`; khóa `actionLoadingIds[req.id] = true` và chỉ giải phóng sau khi `await` hoàn tất trong khối `finally`; không dùng `setTimeout(..., 800)` cố định để gỡ khóa sớm.
  - `src/components/admin/ReleaseCardModal.tsx`: Chuyển `handleRelease` sang `async (e) => { ... }`; thêm spinner loading trong modal; chỉ gọi `onSuccess()` và `onClose()` sau khi `res.success === true`; hiển thị `setError(res.message)` nếu RPC thất bại mà không đóng modal non.
  - `src/components/admin/AdminInventoryView.tsx`: Chuyển handler `releaseCardDirectly` sang `async`; thêm loading indicator trên nút xác nhận nhả thẻ; chỉ đóng confirm box sau khi promise hoàn tất.
  - `src/components/employee/EmployeeRequestsViewMinimal.tsx`: Chuyển `handleCancel` sang `async`; chờ hủy đơn hoàn tất mới đóng popup xác nhận và cập nhật feedback.
  - `src/components/employee/EmployeeRequestsView.tsx`: Chuyển `handleCancel` sang `async`; chờ hủy đơn hoàn tất mới đóng popup xác nhận và cập nhật feedback. <!-- Sửa theo EFR-26 -->
- [x] Task 2.2: Chuyển đổi handler `approve_req_`, bổ sung xác thực Webhook và proxy RPC trong `api/telegram.ts`: <!-- Sửa theo EFR-01, EFR-05, EFR-07, EFR-08, EFR-09, EFR-11, EFR-12, EFR-14 -->
  - **Xác thực Nguồn Webhook Telegram (Fail-Closed):** Kiểm tra bắt buộc biến môi trường `TELEGRAM_WEBHOOK_SECRET` hiện diện trong runtime (nếu thiếu/rỗng -> chặn toàn bộ với 500 Misconfiguration). Bắt buộc kiểm tra header `X-Telegram-Bot-Api-Secret-Token` so khớp bằng constant-time (`crypto.timingSafeEqual`) so với `process.env.TELEGRAM_WEBHOOK_SECRET` trước khi đọc body hoặc xử lý bất kỳ sự kiện webhook nào; từ chối 401 Unauthorized nếu thiếu hoặc sai bí mật. <!-- Sửa theo EFR-12, EFR-21 -->
  - Truyền `callerUser?.id || callerFromId` vào RPC `assign_taxi_card_atomic` khi Admin bấm nút duyệt trên Telegram (không truyền mã thẻ để RPC tự tìm thẻ rảnh hoặc xếp hàng chờ). <!-- Sửa theo EFR-11, EFR-14 -->
  - **Xác thực Mini App Proxy Action (EFR-09, EFR-12, EFR-27):** Bắt buộc xác thực chữ ký HMAC-SHA256 của Telegram `initData` với `TELEGRAM_BOT_TOKEN` cho TẤT CẢ các custom action từ Mini App, bao gồm cả các action gửi/sửa tin nhắn (`sendMessage`, `editMessageText`) và các action RPC (`assignCardAtomic`, `cancelRequestAtomic`, `releaseCardAtomic`). Lấy Telegram ID đã được chứng thực để đối chiếu quyền, gọi Supabase RPC bằng `service_role`. <!-- Sửa theo EFR-09, EFR-12, EFR-27 -->
  - Thay thế hoàn toàn cụm logic `if (availableCard) ... else ...` và các câu lệnh `update` riêng lẻ bằng việc chỉ phân nhánh hiển thị theo `result` trả về từ RPC:
    + Nếu `result === 'assigned_new'` hoặc `'assigned_existing'`: Webhook cập nhật tin nhắn duyệt thành công (kèm mã thẻ) và gửi thông báo cho nhân viên.
    + Nếu `result === 'waitlisted'`: Webhook cập nhật tin nhắn thông báo đã duyệt (hết thẻ - vào hàng chờ); tuyệt đối không tự chạy lệnh UPDATE `waitlist_cards` ngoài RPC. <!-- Sửa theo EFR-14 -->
- [x] Task 2.3: Bảo toàn & hợp nhất bản ghi `msg_track_req_*` và bảo vệ tin nhắn Telegram: <!-- Sửa theo EFR-03, EFR-27, EFR-28 -->
  - Cập nhật cả `secureSendTelegramMessage` và `secureEditTelegramMessage` trong `src/context/AppContext.tsx` tự động đính kèm `init_data: (window as any).Telegram?.WebApp?.initData || ''` vào payload request gửi sang `/api/telegram`. <!-- Sửa theo EFR-27 -->
  - Sửa `editAllTrackedMessages` trong `api/telegram.ts`: Đặt `keepTracker = true` khi duyệt cấp thẻ thành công, không xóa tracker ở bước trung gian; khi kết thúc hoặc ở callback xử lý đơn đã xong, chỉ xóa tracker (`if (!keepTracker)`) khi TOÀN BỘ lời gọi `editMessageText` thành công (`r && r.ok === true`). Nếu có bất kỳ tin nhắn nào sửa thất bại, giữ lại tracker trong `users` để bảo đảm các tin nhắn của Admin khác không bị mồ côi nút bấm. <!-- Sửa theo EFR-28 -->
  - Sửa `syncEditTelegramMessages` trong `AppContext.tsx`:
    + Giữ `keepTracker = true` ở các bước trung gian (`adminApprove`, `assignCardFromWaitlist`, `confirmHandover`).
    + **Kiểm tra kết quả trước khi xóa Tracker (EFR-27):** Chỉ xóa tracker (`keepTracker = false`) khi đơn kết thúc hoàn toàn (`completed`, `card_released`, `rejected_admin`, `rejected_leader`, `cancelled`) VÀ TOÀN BỘ các lời gọi `secureEditTelegramMessage` trả về thành công (`r?.ok === true`). Nếu có bất kỳ tin nhắn nào sửa thất bại (hoặc lỗi mạng), giữ lại tracker trong bảng `users` để retry, tuyệt đối không xóa non làm mất dấu tin nhắn trên app Telegram của các Admin khác.
  - Sửa logic sau Leader duyệt: Hợp nhất mảng tracker theo tập hợp `(chatId, messageId)` thay vì ghi đè.
- [x] Task 2.4: Đảm bảo luồng tạo đơn `createRequest` trong `AppContext.tsx` `await` đầy đủ tiến trình ghi tracker vào Supabase.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Bắt buộc): Kiểm tra mock webhook call và Mini App cùng gọi RPC, kiểm tra tin nhắn tracker được sửa và không bị xóa non ở các bước trung gian.

---

## Phase 3: Integration Verification, Concurrency & Security Testing

**Mục tiêu:** Kiểm tra tích hợp toàn diện trên giao diện người dùng (Mini App) và Telegram Bot, kiểm thử tính chịu lỗi khi 2 Admin cùng thao tác, kiểm thử phân quyền trust boundary và rollback.

- [x] Task 3.1: Kiểm tra giao diện Admin Action Queue (`AdminActionQueueView.tsx`):
  - Tab 1 *Cấp thẻ (Chiều đi)*: Đơn `REQ-2026-104` hiển thị đúng ở cột *Chờ giao (Chờ bàn giao)*, không còn ở cột *Chờ thẻ*.
  - Bộ đếm rảnh: Hiển thị đúng `Kho: 1 thẻ rảnh`.
- [x] Task 3.2: Kiểm tra giao diện Kho thẻ (`AdminInventoryView.tsx`):
  - Thẻ `0006`: Đã giữ cho `REQ-2026-104 (62.909 Thu Ha Dang)`.
  - Thẻ `3571`: Trong kho sẵn sàng, có nút `⚡ Xuất ngay`.
- [x] Task 3.3: Kiểm tra giao diện Đăng ký mượn thẻ của nhân sự (`EmployeeRegisterViewMinimal.tsx`):
  - Hiển thị badge xanh `Sẵn sàng: 1 thẻ`, không bị hiển thị nhầm `Kho tạm hết thẻ`.
- [x] Task 3.4: Chạy kịch bản kiểm thử Concurrency, Security & Fault Injection: <!-- Sửa theo EFR-05, EFR-07, EFR-08, EFR-09, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21, EFR-22, EFR-23, EFR-24 -->
  - Test UI Async Contract & Error Handling (EFR-23, EFR-24, EFR-25, EFR-26):
    + Giả lập proxy backend có độ trễ mạng 2 giây -> Khẳng định nút bấm trong `AdminActionQueueView` hiển thị loading và duy trì khóa chống double-click trong suốt 2 giây, không bị mở khóa sau 800ms; modal không đóng non trước khi server commit;
    + Giả lập RPC trả về lỗi (hoặc mất mạng) -> Khẳng định UI hiển thị thông báo lỗi, không báo thành công sai lệch, modal giữ nguyên để người dùng retry hoặc hủy, trạng thái local được refresh đồng bộ lại từ server;
    + Khẳng định Mini App không còn bất kỳ nhánh gọi RPC trực tiếp bằng supabase-js anon client; mọi thao tác đi qua proxy `/api/telegram` với xác thực `initData`.
    + Test Mini App Duyệt Nhanh Nguyên tử (EFR-25): (1) Khi kho hết thẻ -> Mini App gọi `adminApprove` nhận `result: "waitlisted"`, đơn chuyển sang `waitlist_cards`, không xảy ra lỗi `availableCard.code` undefined; (2) Khi snapshot client cũ (thẻ đã bị Telegram chiếm) -> RPC tự động gán thẻ rảnh khác hoặc chuyển waitlist; (3) Khi đơn đã được Telegram duyệt trước -> Mini App gọi nhận `assigned_existing` an toàn.
    + Test Hủy đơn trên cả 2 màn hình nhân viên (EFR-26): Kiểm tra `handleCancel` trên cả `EmployeeRequestsView.tsx` và `EmployeeRequestsViewMinimal.tsx` đều chờ RPC commit, đóng modal và hiển thị toast thông báo thành công.
  - Test Mini App Telegram Proxy & Tracker Preservation (EFR-27):
    + Gửi POST custom_action `sendMessage` hoặc `editMessageText` không có/sai chữ ký `initData` -> Bị từ chối 401 Unauthorized;
    + Gửi POST custom_action `sendMessage` hoặc `editMessageText` có `initData` hợp lệ -> Được xử lý 200 OK và gửi/sửa tin nhắn Telegram thành công;
    + Giả lập Telegram API trả về lỗi khi sửa tin nhắn (hoặc lỗi mạng) trong `syncEditTelegramMessages` (Mini App) hoặc `editAllTrackedMessages` (Webhook) kể cả callback trên đơn đã xử lý -> Khẳng định bản ghi tracker `msg_track_req_*` KHÔNG bị xóa khỏi bảng `users`, sẵn sàng cho lần thử lại tiếp theo. <!-- Sửa theo EFR-27, EFR-28 -->
  - Test Trust Boundary & Webhook Rollout Fail-Closed (EFR-09, EFR-12, EFR-19, EFR-21):
    + Gọi RPC trực tiếp từ client anon với ID Admin mạo danh -> Khẳng định bị DB từ chối `permission denied for function`.
    + Test môi trường runtime thiếu `TELEGRAM_WEBHOOK_SECRET` -> Khẳng định route `/api/telegram` từ chối 500 Misconfiguration (fail-closed, không bao giờ mở cửa khi thiếu bí mật).
    + Gửi POST callback không kèm header `X-Telegram-Bot-Api-Secret-Token` -> Khẳng định bị từ chối 401 Unauthorized trước khi đọc body.
    + Gửi POST callback với secret header sai -> Khẳng định bị từ chối 401 Unauthorized.
    + Gọi `getWebhookInfo` xác nhận endpoint Telegram hợp lệ; gửi test callback thực tế từ Telegram kèm secret token hợp lệ -> Khẳng định được xử lý 200 OK.
    + Gửi request Mini App proxy với chữ ký `initData` giả mạo hoặc thiếu `initData` -> Khẳng định bị từ chối 401 Unauthorized.
  - Test Cập nhật Request Gốc & Loại trừ Đơn Gốc khi Release Thẻ (EFR-20, EFR-22):
    + (1) Gọi `releaseReservedCard` -> Đơn gốc chuyển sang `card_released`, `reserved_card_code = NULL`, thẻ chuyển cho đơn waitlist mới (hoặc về `available`);
    + (2) Gọi `releaseCardDirectly` từ kho -> Đơn gốc chuyển sang `waitlist_cards`, `reserved_card_code = NULL`;
    + (3) Test loại trừ đơn gốc (EFR-22): Khi đơn gốc là đơn duy nhất trong `waitlist_cards` -> Admin gọi `releaseCardDirectly` từ kho -> Khẳng định thẻ về kho `available`, đơn gốc giữ nguyên `waitlist_cards`, thẻ TUYỆT ĐỐI KHÔNG bị gán ngược lại cho chính đơn gốc;
    + (4) Khi đơn gốc có giờ đi sớm hơn đơn waitlist B -> Admin gọi `releaseCardDirectly` -> Khẳng định thẻ được chuyển cho đơn B (chứ không phải đơn gốc), đơn gốc vẫn ở `waitlist_cards`; khẳng định không đơn nào trỏ sai mã thẻ.
  - Test Bàn giao & Đổi thẻ (EFR-15): (1) Bàn giao đúng thẻ đã reserved -> chuyển thẻ `in_use`, đơn `holding_card`, ghi nhận `handed_over_at` / `handed_over_by`; (2) Bàn giao đổi sang thẻ khác -> unreserve thẻ cũ, thẻ mới `in_use`; (3) Đổi thẻ trước bàn giao.
  - Test Guard Callback sau Bàn giao (EFR-17): Gọi callback Telegram duyệt nhanh trên đơn đã ở trạng thái `holding_card`, `completed`, `cancelled` -> Khẳng định RPC trả `already_processed` và đơn giữ nguyên trạng thái `holding_card`, không bị đẩy lùi về `pending_handover`.
  - Test Atomic Auto-Assignment từ Waitlist (EFR-18): Tạo đơn waitlist A; nhân viên B tự hủy đơn đang giữ thẻ -> Khẳng định trong 1 transaction thẻ được chuyển ngay sang cho đơn A (`status = 'pending_handover'`, `reserved_card_code` được gán), không bị rơi về `available`; kiểm tra tương tự khi Admin nhả thẻ khi có nhiều đơn chờ -> đơn có chuyến gần nhất được nhận thẻ trước.
  - Test Contention vs False Waitlist (EFR-16): Giả lập transaction A khóa thẻ rảnh rồi rollback trong khi transaction B duyệt nhanh -> Khẳng định B được cấp thẻ hoặc nhận lỗi retryable, không bị commit nhầm sang `waitlist_cards` khi kho vẫn còn thẻ.
  - Test Employee Self-Cancel & Enum Hủy Đơn (EFR-10, EFR-13): Kiểm tra nhân viên tự hủy đơn ở từng trạng thái `pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover` -> Hủy đơn thành công và tự động unreserve thẻ về kho rảnh; thử hủy đơn ở `holding_card` -> Bị từ chối do trạng thái không hợp lệ; gọi hủy đơn của người khác -> Bị từ chối `Unauthorized`.
  - Test Telegram ID Contract (EFR-11): Gọi duyệt từ Webhook Telegram với `telegram_id` khác `users.id` -> Khẳng định RPC tìm đúng operator và duyệt thành công.
  - Test Audit Integrity: Khẳng định `admin_approver_name` được gán chính xác từ `users.name` trong DB.
  - Test Concurrency & Atomic Waitlist (EFR-14): Giả lập 1 Admin duyệt qua Telegram khi kho hết thẻ trong khi 1 Admin khác đồng thời gán thẻ từ Mini App cho cùng 1 đơn -> Khẳng định request và thẻ luôn nhất quán, không xảy ra race condition ghi đè waitlist lên thẻ đã gán.
  - Test Concurrency Deadlock & Thứ tự Khóa Phân cấp Toàn cục (EFR-29, EFR-30):
    + Giả lập Transaction A chạy `assign_taxi_card_atomic` (đổi thẻ/bàn giao cho request R) đồng thời với Transaction B chạy `release_taxi_card_atomic` trên cùng request R và thẻ C -> Khẳng định thứ tự khóa Request -> Card nhất quán, không xảy ra lỗi deadlock (PostgreSQL 40P01), giao dịch commit hoặc rollback có kiểm soát;
    + Giả lập Transaction A chạy `release_taxi_card_atomic` (hoặc `cancel_taxi_request_atomic`) giải phóng thẻ C với auto-assign cho đơn chờ W đồng thời với Transaction B chạy `assign_taxi_card_atomic` gán thẻ C (hoặc thẻ khác) cho đơn W -> Khẳng định không xảy ra Deadlock 40P01 nhờ thứ tự phân cấp Level 1 (Requests theo ID tăng dần) -> Level 2 (Cards), cả 2 transaction hoàn thành tuần tự an toàn; <!-- Sửa theo EFR-30 -->
    + Test Bảo vệ Auto-Assign Hàng chờ khi Candidate đổi trạng thái (EFR-31): Giả lập W1 đứng đầu hàng chờ và W2 đứng thứ hai; Transaction A nhả thẻ C (candidate W1); trong lúc chờ khóa, W1 được transaction khác cấp thẻ; Transaction A phát hiện W1 không còn waitlist và ném lỗi `T5002`; client/proxy tự động retry trên snapshot mới và gán thành công thẻ C cho W2; khẳng định thẻ C KHÔNG bị đưa nhầm về `available` khi W2 vẫn đang chờ thẻ;
    + Giả lập thẻ bị đổi chủ giữa lúc đọc sơ bộ và lúc lấy lock trong `release_taxi_card_atomic` -> Khẳng định Double-Check under Lock phát hiện đổi chủ, không commit sai trên chủ thẻ cũ và trả lỗi retryable rõ ràng.
  - Test Concurrency Double Card (EFR-05, EFR-07): Giả lập 2 Admin đồng thời chọn 2 thẻ khác nhau (`0006` và `3571`) cho cùng 1 đơn -> Khẳng định chỉ 1 RPC commit thành công, đơn duy trì đúng 1 thẻ.
  - Test Rollback: Giả lập lỗi ở bước cập nhật request trong RPC -> Khẳng định trạng thái thẻ rollback nguyên trạng.
- [x] Task 3.5: Chạy kiểm tra TypeScript (`npm run lint` hoặc `tsc --noEmit`) và build production (`npm run build`) để đảm bảo không phát sinh lỗi cú pháp hay gãy contract.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Bắt buộc): Thử nghiệm end-to-end luồng bàn giao thẻ (kèm test đổi thẻ `confirmHandover` và hủy đơn `cancelRequest`) và thu hồi thẻ để đảm bảo vòng đời mượn thẻ vận hành trơn tru từ A đến Z.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-10-30 | Khởi tạo | Plan & Tasks | Tạo kế hoạch và danh sách task cho fix đa thẻ & đồng bộ webhook | done | Kế hoạch ban đầu |
| 2026-10-30 | Review R1 | EFR-01 -> EFR-04, SFR-01 | Phản biện chấp nhận 4 EFR và bổ sung 1 SFR | done | Cập nhật plan và tasks R1 |
| 2026-10-30 | Review R2 | EFR-05, EFR-06 | Bổ sung DB Unique Partial Index, Claim-first, và Verified Reconcile | done | Cập nhật plan và tasks R2 |
| 2026-10-30 | Review R4 | EFR-07 | Chốt kiến trúc PostgreSQL RPC Transaction (`assign_taxi_card_atomic`) cho cả AppContext và Webhook | done | Cập nhật plan và tasks R4 |
| 2026-10-30 | Review R5 | EFR-08 | Thiết lập ranh giới phân quyền & xác thực Role-based DB trong RPC (`SECURITY DEFINER`, `search_path`, chặn anon spoofing) | done | Hoàn thiện kiến trúc bảo mật R5 |
| 2026-10-30 | Phase 1 | Task 1.1 | Chụp snapshot DB Supabase (cards, requests, users) ra snapshot_20261030.json | done | Snapshot hoàn tất an toàn |
| 2026-10-30 | Phase 1 | Task 1.2 | Kiểm chứng thực tế DB: Thẻ 0006 đang in_use cho REQ-2026-104 (đã bàn giao lúc 03:09:52), thẻ 3571 đang available | done | Trạng thái live đã lành lặn, không cần mutate thêm |
| 2026-10-30 | Phase 1 | Task 1.3 | Tạo migration 20261030_enforce_single_active_card_per_request.sql gồm Unique Partial Index, 3 RPCs nguyên tử, khóa phân cấp Level 1 -> Level 2 và thu hồi quyền | done | Migration SQL hoàn tất |
| 2026-10-30 | Phase 1 | Task 1.4 | Thêm RPC wrappers assignCardAtomic, cancelRequestAtomic, releaseCardAtomic vào supabaseService.ts gọi qua proxy với auto-retry T5001, T5002, 40P01 | done | Wrappers & exponential backoff hoàn tất |
| 2026-10-30 | Phase 1 | Task 1.Final | Viết và chạy test suite tests/phase1_rpc.test.ts (11 tests pass) xác minh SQL contracts, security boundaries, và wrapper retry | done | Phase 1 verified |
| 2026-10-30 | Phase 2 | Task 2.0 | Tạo scripts/setup-telegram-webhook.mjs và cấu hình fail-closed TELEGRAM_WEBHOOK_SECRET guard | done | Webhook secret guard sẵn sàng |
| 2026-10-30 | Phase 2 | Task 2.1 | Chuyển toàn bộ hàm nghiệp vụ gán/nhả thẻ và hủy đơn trong AppContext.tsx sang async RPC qua supabaseService | done | AppContext async hoàn tất |
| 2026-10-30 | Phase 2 | Task 2.1b | Cập nhật 5 UI caller sang async/await kèm persistent loading (AdminActionQueueView, ReleaseCardModal, AdminInventoryView, 2 EmployeeRequestsView) | done | UI caller async hoàn tất |
| 2026-10-30 | Phase 2 | Task 2.2 | Chuyển đổi approve_req_ sang RPC assign_taxi_card_atomic, fail-closed secret check, xác thực HMAC initData cho Mini App proxy | done | api/telegram.ts hoàn tất |
| 2026-10-30 | Phase 2 | Task 2.3 | Bảo toàn tracker: chỉ xóa khi allSucceeded = true và !keepTracker; đính kèm initData khi gọi proxy sendMessage/editMessageText | done | Tracker preservation hoàn tất |
| 2026-10-30 | Phase 2 | Task 2.4 | Luồng createRequest await ghi tracker msg_track_req_ vào users trước khi kết thúc | done | Await tracker hoàn tất |
| 2026-10-30 | Phase 2 | Task 2.Final | Viết và chạy test suite tests/phase2_webhook_concurrency.test.ts (13 tests pass) xác minh fail-closed, HMAC auth, và tracker preservation | done | Phase 2 verified |
| 2026-10-30 | Phase 3 | Task 3.1 - 3.3 | Kiểm tra các view UI AdminActionQueueView, AdminInventoryView, EmployeeRegisterViewMinimal | done | Khớp inventory và queue logic |
| 2026-10-30 | Phase 3 | Task 3.4 | Viết và chạy tests/phase3_integration_concurrency.test.ts (6 tests pass): UI anti-double-click, atomic approve, handover/swap, auto-assign, deadlock prevention | done | Phase 3 tests passed |
| 2026-10-30 | Phase 3 | Task 3.5 | Chạy tsc --noEmit (0 errors) và npm run build (Vite production build thành công trong 18.39s) | done | Codebase build sạch |
| 2026-10-30 | Phase 3 | Task 3.Final | Tổng hợp test suite toàn dự án: 33/33 tests pass (100% pass) | done | Toàn bộ 3 phase hoàn thành |
