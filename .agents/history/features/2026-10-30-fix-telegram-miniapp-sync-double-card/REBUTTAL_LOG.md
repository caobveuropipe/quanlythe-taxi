# Rebuttal Log: fix-telegram-miniapp-sync-double-card

## Round 1 - 2026-10-30T10:24:00+07:00

### Tổng kết
- EFR: 4 (accepted: 4, rejected: 0, inconclusive: 0) | SFR mới: 1 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `src/context/AppContext.tsx:1037-1160,1320-1380,1389-1469,1584-1629,1639-1688,1718-1815` (Call chain gán thẻ, bàn giao, hủy đơn, tracker tin nhắn)
  - `api/telegram.ts:70-116,353-455,680-725` (Call chain webhook duyệt đơn, sửa tin nhắn, tracker)
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-01]: Guard ở React/webhook không chặn được hai giao dịch đồng thời**
  - *Sửa:* Bổ sung cơ chế cập nhật có điều kiện (`WHERE status = 'available'` và kiểm tra rowCount) tại cả Webhook lẫn Context; đảm bảo unreserve các thẻ cũ trước khi gán thẻ mới; bổ sung test case kịch bản 2 transaction tranh chấp 1 thẻ. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 8) và `FEATURE_TASKS.md` (Task 1.3, 2.1).
- **[EFR-02]: Auto-reconcile lúc mọi Mini App khởi động có thể tự ý trả thẻ đang dùng**
  - *Sửa:* Bỏ hoàn toàn cơ chế auto-sửa tùy tiện trong client boot. Thay bằng 1-time script reconcile có điều kiện, kiểm tra kỹ trạng thái DB thực tế và tuyệt đối không tự ý nhả thẻ `in_use` hoặc thẻ đã có chứng cứ bàn giao. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 4) và `FEATURE_TASKS.md` (Task 1.1, 1.2).
- **[EFR-03]: Kế hoạch tracker bỏ sót nhánh webhook và ghi đè danh sách tin nhắn**
  - *Sửa:* Cập nhật `editAllTrackedMessages` trong `api/telegram.ts` (dòng 410) đặt `keepTracker = true` ở nhánh duyệt thành công; sửa logic sau khi Leader duyệt trong cả `AppContext.tsx` và `api/telegram.ts` để hợp nhất danh sách tracker theo `(chatId, messageId)` thay vì ghi đè mảng cũ. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5) và `FEATURE_TASKS.md` (Task 2.2).
- **[EFR-04]: Đường bàn giao thực tế chưa nằm trong invariant guard**
  - *Sửa:* Đưa hàm `confirmHandover` vào phạm vi invariant guard. Khi bàn giao đổi thẻ thực tế, tự động unreserve toàn bộ thẻ cũ mang `currentRequestId` của đơn về `available`, và kiểm tra thẻ đích không bị chiếm bởi đơn khác. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5) và `FEATURE_TASKS.md` (Task 1.4, 3.Final).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- **[SFR-01]: `cancelRequest` chỉ nhả thẻ theo `reservedCardCode`, bỏ sót thẻ mồ côi khi `reservedCardCode` bị null** [Medium][High]
  - *Issue:* Trong `src/context/AppContext.tsx:1137-1139`, hàm `cancelRequest` chỉ kiểm tra `if (target.reservedCardCode) autoAssignCardIfWaitlisted(target.reservedCardCode, requestId)`. Nếu một đơn bị rơi vào tình trạng như `REQ-2026-104` (thẻ đang bị giữ `current_request_id: 'REQ-2026-104'` nhưng trường `reservedCardCode` trên đơn bị null do webhook ghi đè về waitlist), khi Admin hoặc Nhân sự hủy đơn, thẻ vật lý đó sẽ bị kẹt vĩnh viễn ở trạng thái `reserved` mà không bao giờ được giải phóng về kho.
  - *Evidence:* `src/context/AppContext.tsx:1137-1140`.
  - *Impact:* Thẻ vật lý tiếp tục bị khóa mồ côi (orphaned reservation) dù đơn đã bị hủy.
  - *Required Fix:* Trong `cancelRequest`, bổ sung cơ chế giải phóng toàn bộ thẻ mang `currentRequestId === requestId` về kho độc lập với giá trị của `target.reservedCardCode`. Đã thêm vào `FEATURE_PLAN.md` (AC-07) và `FEATURE_TASKS.md` (Task 1.4).

---

## Round 2 - 2026-10-30T10:44:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md`, `FEATURE_TASKS.md`
  - `supabase/migrations/`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-05]: Conditional update trên thẻ vẫn cho phép một đơn giữ hai thẻ khác nhau**
  - *Sửa:* Nâng cấp giải pháp lên tầng Database: Bổ sung migration Supabase chứa Unique Partial Index `idx_taxi_cards_single_active_request` trên `taxi_cards(current_request_id) WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use')`. Đồng thời cài đặt cơ chế Claim Request Trước -> Unreserve thẻ cũ -> Gán thẻ mới. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 3.4).
- **[EFR-06]: Reconcile vẫn mặc định 0006 được xác nhận mà không kiểm chứng thẻ thực tế**
  - *Sửa:* Đưa việc giữ thẻ `0006` về đúng bản chất là giả định chờ kiểm chứng. Quy định bắt buộc chụp snapshot DB và xác nhận trực tiếp với Admin giữ kho về trạng thái 2 thẻ vật lý trước khi chạy lệnh reconcile có điều kiện; tuyệt đối không tự ý nhả thẻ `in_use`. Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 4, 5, 8) và `FEATURE_TASKS.md` (Task 1.1, Task 1.2).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có.

---

## Round 4 - 2026-10-30T11:04:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md`, `FEATURE_TASKS.md`
  - `src/services/supabaseService.ts:174-215`
  - `api/telegram.ts:353-405`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-07]: Cập nhật request và card rời rạc có thể commit một phần; bắt buộc đóng gói PostgreSQL RPC Transaction**
  - *Sửa:* Chốt kiến trúc bắt buộc dùng **PostgreSQL RPC Transaction** (`assign_taxi_card_atomic` và `release_taxi_card_atomic`) tại Supabase làm thao tác nguyên tử duy nhất cho cả Mini App (`AppContext.tsx`) và Webhook (`api/telegram.ts`).
  - RPC thực hiện: Khóa request `SELECT FOR UPDATE`, kiểm tra trạng thái, unreserve thẻ cũ, claim thẻ mới, cập nhật request trong 1 transaction; nếu có bất kỳ lỗi nào sẽ `RAISE EXCEPTION` để tự động rollback toàn bộ.
  - Loại bỏ hoàn toàn các chuỗi lệnh `update` và `upsert` rời rạc ở cả 2 nền tảng.
  - Bổ sung task kiểm thử ép lỗi (fault injection) để chứng minh tính nguyên tử không commit một nửa.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 1, 2, 3, 5, 6, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 2.1, Task 2.2, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có.

---

## Round 5 - 2026-10-30T11:08:45+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md`, `FEATURE_TASKS.md`
  - `src/lib/supabaseClient.ts:1-21`
  - `api/telegram.ts:1-15,222-244`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-08]: RPC ghi thẻ chưa có ranh giới xác thực và phân quyền**
  - *Sửa:* Thiết kế ranh giới phân quyền rõ ràng ở tầng Database:
    1. Cấu hình RPC `SECURITY DEFINER` và cố định `SET search_path = public, pg_temp;` (chống search_path injection).
    2. Schema-qualify toàn bộ các bảng trong function: `public.taxi_cards`, `public.taxi_requests`, `public.users`.
    3. Thêm tham số `p_operator_id`: RPC tự động query `public.users` để xác minh role thuộc `('admin', 'admin_hr')` hoặc super admin. Người dùng không có quyền (như role `employee`) bị quăng lỗi `Unauthorized` và rollback tức thì.
    4. Tên người thao tác (`admin_approver_name`, `handed_over_by`) được lấy trực tiếp từ `users.name` trong DB, triệt tiêu nguy cơ giả mạo từ client.
    5. Cấp quyền `GRANT EXECUTE` có kiểm soát cho `anon, authenticated, service_role`, bảo đảm cả Webhook và Mini App gọi được nhưng không thể vượt qua tầng kiểm tra quyền nội tại của RPC.
    6. Bổ sung test case kiểm thử phân quyền: Người dùng `employee` gọi RPC bị từ chối `Unauthorized`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 1, 2, 3, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 2.1, Task 2.2, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có.

---

## Round 6 - 2026-10-30T11:21:00+07:00

### Tổng kết
- EFR: 3 (accepted: 3, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:30-50,80-125,130-160`
  - `FEATURE_TASKS.md:20-85`
  - `src/lib/supabaseClient.ts:1-21`
  - `src/context/AppContext.tsx:142-149,715-770,1120-1160`
  - `api/telegram.ts:1-30,100-160,215-250`
  - `supabase/migrations/20261030_system_ocr_rate_limit.sql`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-09]: Tra role theo p_operator_id tự khai báo không xác thực người gọi RPC**
  - *Sửa:* Thiết lập Trust Boundary chặt chẽ ở tầng DB và API Proxy:
    1. Thu hồi quyền execute từ `anon`: `REVOKE ALL ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION assign_taxi_card_atomic, cancel_taxi_request_atomic, release_taxi_card_atomic TO service_role;`. Ngăn chặn hoàn toàn việc client công khai dùng publishable key gọi trực tiếp RPC với ID của Admin mạo danh.
    2. Mini App chuyển các thao tác ghi thẻ/hủy đơn qua backend proxy `/api/telegram` (chạy với backend `service_role` và xác thực chữ ký Telegram `initData` hoặc context phiên hợp lệ).
    3. Webhook Telegram chỉ thực thi RPC sau khi Telegram server gửi callback đã được kiểm chứng danh tính (`cb.from.id`).
    4. Bổ sung test case kiểm thử: Client anon gọi trực tiếp RPC với ID Admin bị DB từ chối `permission denied`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 2.1, Task 2.2, Task 3.4).

- **[EFR-10]: Quyền Admin-only của release RPC làm hỏng chức năng nhân viên tự hủy đơn**
  - *Sửa:* Tách riêng luồng hủy đơn khỏi nhả thẻ tùy ý:
    1. Tạo RPC riêng `cancel_taxi_request_atomic(p_request_id text, p_reason text, p_operator_id text)`.
    2. Phân quyền hợp lý: Cho phép người tạo đơn (`target_req.employee_id = v_operator.id` hoặc trùng mã nhân viên) tự hủy đơn của chính mình khi đơn còn ở trạng thái trước bàn giao (`pending_approval`, `leader_approved`, `waitlist_cards`, `pending_handover`), HOẶC cho phép Admin/Admin HR hủy bất kỳ đơn nào chưa bàn giao.
    3. Trong cùng 1 transaction nguyên tử, RPC vừa cập nhật request sang `cancelled`, vừa tìm và unreserve toàn bộ thẻ liên quan đưa về `available` trong kho.
    4. Giữ `release_taxi_card_atomic` dành riêng cho Admin nhả thẻ/trả thẻ trực tiếp trong kho mà không hủy đơn.
    5. Cập nhật `AppContext.cancelRequest` gọi `cancelRequestAtomic(requestId, reason, currentUser.id)`.
    6. Bổ sung test case: Nhân viên tự hủy đơn của mình thành công và thẻ được nhả về kho; nhân viên hủy đơn người khác bị chặn `Unauthorized`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 2.1, Task 3.4).

- **[EFR-11]: Task webhook truyền Telegram ID vào tham số yêu cầu users.id**
  - *Sửa:* Đồng bộ hợp đồng ID giữa Webhook Telegram, Mini App và RPC:
    1. Trong RPC (`assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic`), tra cứu thông tin người thao tác theo điều kiện `WHERE id = p_operator_id OR telegram_id = p_operator_id`. Điều này cho phép RPC chấp nhận cả UUID/ID nội bộ từ Mini App lẫn Telegram ID (`cb.from.id` / `SUPER_ADMIN_ID`) từ Webhook mà không bao giờ bị lệch contract.
    2. Trong `api/telegram.ts`, Task 2.2 chuẩn hóa truyền `callerUser?.id || callerFromId` vào RPC sau khi đã tra cứu và xác thực quyền.
    3. Bổ sung test case kiểm thử: Gọi duyệt từ Webhook Telegram với `telegram_id` khác `users.id` vẫn khớp và duyệt thành công.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 2.2, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có.


---

## Round 7 - 2026-10-30T11:28:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:30-55,90-130,140-165`
  - `FEATURE_TASKS.md:20-85`
  - `src/types/index.ts:33-52`
  - `src/context/AppContext.tsx:870,1127-1160,1179,1535`
  - `src/components/employee/EmployeeRequestsViewMinimal.tsx:74-80,342`
  - `api/telegram.ts:118-150,222-244`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-12]: Proxy service_role chưa xác thực nguồn Telegram webhook callback**
  - *Sửa:* Thiết lập xác thực nguồn gọi nghiêm ngặt cho cả 2 đường Webhook và Mini App Proxy:
    1. **Telegram Webhook:** Bắt buộc kiểm tra header `X-Telegram-Bot-Api-Secret-Token` so khớp an toàn với biến môi trường `TELEGRAM_WEBHOOK_SECRET` trước khi xử lý mọi sự kiện webhook (`update.message`, `update.callback_query`). Nếu thiếu hoặc sai token, từ chối tức thì với mã `401 Unauthorized`.
    2. **Mini App Proxy Action:** Bắt buộc gửi `window.Telegram.WebApp.initData` trong header hoặc payload; backend `/api/telegram` xác thực chữ ký HMAC-SHA256 với `TELEGRAM_BOT_TOKEN`, lấy danh tính Telegram ID đã được chứng thực để đối chiếu quyền hạn trước khi gọi RPC với `service_role`.
    3. Bổ sung test case kiểm thử: Gửi POST callback query giả mạo với ID Admin nhưng thiếu/sai secret token bị từ chối 401; gửi request proxy Mini App với chữ ký initData giả bị từ chối 401.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 2.2, Task 3.4).

- **[EFR-13]: RPC hủy đơn dùng hai trạng thái không tồn tại trong workflow hiện tại**
  - *Sửa:* Chuẩn hóa danh sách enum trạng thái trong RPC `cancel_taxi_request_atomic` khớp 100% với `RequestStatus` trong `src/types/index.ts`:
    1. Thay thế các trạng thái không tồn tại (`pending_approval`, `leader_approved`) bằng đúng enum nghiệp vụ: `'pending_leader'`, `'pending_admin'`, `'waitlist_cards'`, `'pending_handover'`.
    2. Cho phép người tạo đơn (`employee_id = v_operator.id` hoặc trùng mã nhân viên) tự hủy đơn của chính mình khi đơn ở bất kỳ trạng thái nào trong 4 trạng thái trên.
    3. Nếu đơn đã ở các trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `overbudget_pending_hr`, `completed`, `card_released`, `cancelled`), RPC quăng lỗi từ chối không cho phép hủy: `Request cannot be cancelled in status: %`.
    4. Bổ sung test case kiểm thử: Nhân viên tự hủy đơn ở từng trạng thái `pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover` thành công và thẻ được nhả về kho; thử hủy ở `holding_card` bị từ chối.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, `src/types/index.ts:33-52`, `src/context/AppContext.tsx:870,1127-1160,1179,1535`, `src/components/employee/EmployeeRequestsViewMinimal.tsx:74-80,342`, `api/telegram.ts:118-150,222-244`).


---

## Round 8 - 2026-10-30T11:33:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:32-60,85-135,145-165`
  - `FEATURE_TASKS.md:24-75,80-87`
  - `api/telegram.ts:353-445`
  - `src/context/AppContext.tsx:1389-1469`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-14]: Nhánh “hết thẻ” vẫn ghi waitlist ngoài RPC và có thể đè đơn đã được gán thẻ**
  - *Sửa:* Đóng gói toàn bộ logic phân nhánh duyệt (bao gồm cả trường hợp hết thẻ -> waitlist) vào trong PostgreSQL RPC Transaction `assign_taxi_card_atomic`:
    1. Khi Admin duyệt trên Telegram (`p_card_code` để trống):
       - Nếu đơn đã có thẻ active: Giữ nguyên thẻ, cập nhật request sang `pending_handover`, trả `{ "result": "assigned_existing", "card_code": v_existing_code }`.
       - Nếu còn thẻ rảnh trong kho: Claim thẻ rảnh, unreserve thẻ cũ, cập nhật request sang `pending_handover`, trả `{ "result": "assigned_new", "card_code": v_found_code }`.
       - Nếu hết thẻ trong kho: Cập nhật request sang `waitlist_cards`, `is_waitlisted = true`, `reserved_card_code = NULL`, `admin_approval_status = 'approved'`, `admin_approved_at = now()` **ngay trong cùng transaction đang giữ khóa `FOR UPDATE` trên request**; trả `{ "result": "waitlisted", "card_code": null }`.
    2. Trong `api/telegram.ts`, xóa bỏ hoàn toàn lệnh `supabase.from('taxi_requests').update(...)` ở nhánh `else`. Webhook chỉ dựa trên trường `result` từ RPC trả về để hiển thị tin nhắn tương ứng (duyệt thành công hoặc thông báo hết thẻ vào hàng chờ).
    3. Bổ sung test case kiểm thử: Giả lập xen kẽ gọi duyệt webhook khi kho hết thẻ với gọi `assignCardAtomic` từ Mini App cho cùng 1 request -> Khẳng định không bao giờ xảy ra race condition ghi đè waitlist lên thẻ đã gán.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 7, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 2.2, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, `api/telegram.ts:353-445`, `src/context/AppContext.tsx:1389-1469`).


---

## Round 9 - 2026-10-30T11:38:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:32-60,105-180`
  - `FEATURE_TASKS.md:24-89`
  - `src/context/AppContext.tsx:1037-1124,1639-1688`
  - `api/telegram.ts:353-440`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-15]: Nhánh assigned_existing đứng trước p_is_handover/p_card_code làm bỏ qua đổi thẻ và bàn giao**
  - *Sửa:* Sắp xếp lại thứ tự phân nhánh RPC theo Operation (Loại thao tác người dùng):
    1. *Nhánh 1: Bàn giao thẻ thực tế (`p_is_handover = true`):* Được ưu tiên xử lý trước tiên. Khóa thẻ chỉ định, unreserve thẻ cũ (nếu Admin đổi thẻ tại quầy), chuyển thẻ sang `in_use`, cập nhật request sang `holding_card`, ghi nhận `actual_card_code`, `handed_over_at`, `handed_over_by`. Trả `{ "result": "handed_over", "card_code": p_card_code }`.
    2. *Nhánh 2: Gán/đổi thẻ chỉ định (`p_card_code` có giá trị, `p_is_handover = false`):* Khóa thẻ chỉ định, unreserve thẻ cũ, claim thẻ mới `status = 'reserved'`, cập nhật request sang `pending_handover`. Trả `{ "result": "assigned_new", "card_code": p_card_code }`.
    3. *Nhánh 3: Duyệt nhanh không chỉ định thẻ (`p_card_code` null, `p_is_handover = false`):* Chỉ ở nhánh này mới kiểm tra: nếu đã có thẻ active -> idempotent trả `{ "result": "assigned_existing" }`; nếu chưa có thẻ -> tìm thẻ rảnh hoặc xếp hàng chờ `waitlist_cards`.
    4. Bổ sung test cases: (1) Bàn giao đúng thẻ đã reserved; (2) Bàn giao đổi thẻ khác; (3) Đổi thẻ trước bàn giao; (4) Callback Telegram duyệt lặp lại là idempotent.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

- **[EFR-16]: SKIP LOCKED biến thẻ đang tranh chấp thành “hết thẻ” và tạo waitlist sai**
  - *Sửa:* Loại bỏ hoàn toàn `SKIP LOCKED` khỏi truy vấn kho thẻ rảnh:
    1. Trong RPC duyệt nhanh, thay thế `SKIP LOCKED` bằng hàng đợi khóa có thứ tự và timeout ngắn: `SET LOCAL lock_timeout = '2s'; SELECT ... FROM taxi_cards WHERE status = 'available' ORDER BY code ASC LIMIT 1 FOR UPDATE;`.
    2. Nếu thẻ rảnh đang bị một transaction khác khóa tạm thời, Postgres sẽ chờ trong tối đa 2s để transaction kia commit/rollback. Nếu transaction kia rollback, thẻ vẫn còn `available` và được cấp ngay cho đơn, không bị bỏ qua thành "hết thẻ".
    3. Nếu hết timeout do tranh chấp kéo dài, RPC báo lỗi retryable/conflict thay vì commit nhầm sang `waitlist_cards`.
    4. Bổ sung test case kiểm thử: Giả lập transaction A khóa thẻ rảnh rồi rollback trong khi transaction B duyệt nhanh -> Khẳng định B được cấp thẻ hoặc nhận lỗi retryable, không bị commit nhầm sang waitlist khi kho vẫn còn thẻ.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, `src/context/AppContext.tsx:1037-1124,1639-1688`, `api/telegram.ts:353-440`).


---

## Round 10 - 2026-10-30T11:46:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:40-75,120-185`
  - `FEATURE_TASKS.md:25-95`
  - `src/context/AppContext.tsx:1037-1124,1127-1143,1639-1688,1709-1732,1754-1815`
  - `api/telegram.ts:353-405`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-17]: Callback duyệt lặp lại sau bàn giao có thể đẩy đơn holding_card về pending_handover**
  - *Sửa:* Bổ sung Guard trạng thái đã xử lý ngay trước khi vào nhánh duyệt nhanh trong RPC `assign_taxi_card_atomic`:
    1. Nếu request đã ở các trạng thái sau bàn giao (`holding_card`, `returned_pending_bill`, `completed`, `card_released`, `cancelled`, `rejected_*`), RPC lập tức trả `{ "result": "already_processed", "status": v_req.status }` mà tuyệt đối không mutate dữ liệu request hay card.
    2. Chỉ khi đơn đang ở `pending_admin`, `pending_leader`, hoặc `pending_handover` (với thẻ `reserved`) thì mới cho phép xử lý tiếp hoặc trả `assigned_existing`.
    3. Bổ sung test case kiểm thử: Gọi callback Telegram duyệt nhanh trên đơn đã ở trạng thái `holding_card`, `completed`, `cancelled` -> Khẳng định RPC trả `already_processed` và đơn giữ nguyên trạng thái `holding_card`, không bị đẩy lùi về `pending_handover`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

- **[EFR-18]: Nhả/hủy qua RPC bỏ mất tự động gán thẻ vừa rảnh cho đơn hàng chờ**
  - *Sửa:* Gộp toàn bộ logic Auto-Assignment từ hàng chờ vào transaction DB của `cancel_taxi_request_atomic` và `release_taxi_card_atomic`:
    1. Khi một thẻ được giải phóng (do nhân viên hủy đơn hoặc Admin nhả thẻ): RPC tự động tìm đơn chờ ưu tiên cao nhất: `SELECT * FROM public.taxi_requests WHERE status = 'waitlist_cards' ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC LIMIT 1 FOR UPDATE`.
    2. Nếu có đơn chờ: Gán ngay thẻ vừa giải phóng cho đơn chờ (`status = 'pending_handover'`, `is_waitlisted = false`, `reserved_card_code = v_freed_card.code`, `handover_ready_at = now()`), thẻ chuyển sang `reserved` cho đơn chờ đó. Trả JSON `{ "result": "cancelled_and_auto_assigned", "auto_assigned_to": v_waitlist_req.id, "card_code": v_freed_card.code }`.
    3. Nếu không có đơn chờ: Đưa thẻ về `status = 'available'`. Trả JSON `{ "result": "cancelled_card_available", "card_code": v_freed_card.code }`.
    4. Xóa bỏ logic gán thẻ thủ công rời rạc ở helper client `autoAssignCardIfWaitlisted`. Khi nhận kết quả `auto_assigned_to` từ RPC, client/webhook phát thông báo và cập nhật tracker cho người mượn mới.
    5. Bổ sung test case kiểm thử: Nhân viên hủy đơn đang giữ thẻ khi có đơn chờ -> Thẻ chuyển ngay sang đơn chờ ưu tiên trong 1 transaction duy nhất; Admin nhả thẻ khi có nhiều đơn chờ -> Đơn có chuyến gần nhất được gán trước.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 2.1, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, `src/context/AppContext.tsx:1037-1124,1127-1143,1639-1688,1709-1732,1754-1815`, `api/telegram.ts:353-405`).


---

## Round 11 - 2026-10-30T11:52:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:60-85,135-215`
  - `FEATURE_TASKS.md:35-115`
  - `src/context/AppContext.tsx:1037-1124,1709-1732,1754-1815`
  - `api/telegram.ts:118-150`
  - `Telegram Bot API setWebhook documentation`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-19]: Bật kiểm tra webhook secret nhưng chưa có bước cấu hình setWebhook để Telegram gửi header**
  - *Sửa:* Bổ sung Task 2.0 và quy trình Rollout Webhook Secret Telegram an toàn (Zero Downtime):
    1. Cấu hình biến môi trường `TELEGRAM_WEBHOOK_SECRET` trên Vercel và `.env`.
    2. Viết và chạy script gọi Telegram Bot API `setWebhook(url='https://quanly-thetaxi.vercel.app/api/telegram', secret_token=process.env.TELEGRAM_WEBHOOK_SECRET)`.
    3. Gọi Telegram API `getWebhookInfo` xác nhận Telegram đã lưu `secret_token` và bắt đầu gửi header `X-Telegram-Bot-Api-Secret-Token` trước khi deploy code bật guard 401 trên backend.
    4. Trong `api/telegram.ts`: So sánh constant-time với `process.env.TELEGRAM_WEBHOOK_SECRET`; nếu thiếu hoặc sai secret -> từ chối 401. Không làm gián đoạn webhook Telegram đang chạy.
    5. Bổ sung test case: Kiểm tra `getWebhookInfo` và test webhook callback thực tế từ Telegram.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 7, 8, 9) và `FEATURE_TASKS.md` (Task 2.0, Task 3.4).

- **[EFR-20]: release_taxi_card_atomic chưa cập nhật trạng thái đơn gốc vừa bị nhả thẻ**
  - *Sửa:* Cập nhật dứt điểm trạng thái request gốc trong transaction của RPC `release_taxi_card_atomic`:
    1. Hỗ trợ tham số `p_action_type`:
       - *Với `p_action_type = 'release_reservation'` (hủy lượt giữ thẻ từ `releaseReservedCard`):* Cập nhật request gốc sang `status = 'card_released'`, `released_reason = p_reason`, `released_by = v_operator.name`, `released_at = now()`, `reserved_card_code = NULL`.
       - *Với `p_action_type = 'release_card_to_waitlist'` (nhả thẻ từ kho qua `releaseCardDirectly`):* Cập nhật request gốc sang `status = 'waitlist_cards'`, `is_waitlisted = true`, `reserved_card_code = NULL`.
    2. Sau khi cập nhật request gốc và gỡ liên kết thẻ, RPC tự động gán thẻ cho đơn chờ ưu tiên trong `waitlist_cards` (nếu có đơn chờ), hoặc đưa thẻ về `available` (nếu không có đơn chờ).
    3. Đảm bảo request gốc không bao giờ bị giữ trạng thái `pending_handover` hay trỏ tới mã thẻ đã chuyển chủ.
    4. Bổ sung test case kiểm thử: Kiểm tra `releaseReservedCard` và `releaseCardDirectly` cập nhật chính xác trạng thái của cả request gốc và request nhận thẻ tự động.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 2.1, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, `src/context/AppContext.tsx:1037-1124,1709-1732,1754-1815`, `api/telegram.ts:118-150`).


---

## Round 12 - 2026-10-30T12:35:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:78-91`
  - `FEATURE_TASKS.md:55-75,95-108`
  - `api/telegram.ts:115-155`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-21]: Guard webhook fail-open khi TELEGRAM_WEBHOOK_SECRET thiếu**
  - *Sửa:* Chuyển đổi toàn diện cơ chế bảo vệ Webhook sang **Fail-Closed** tuyệt đối:
    1. Kiểm tra sự hiện diện của `TELEGRAM_WEBHOOK_SECRET` trong runtime: nếu thiếu hoặc rỗng, endpoint từ chối ngay lập tức với `500 Server Misconfiguration` và ghi error log bảo mật (không log secret), tuyệt đối không để lọt bất kỳ webhook request nào khi thiếu cấu hình bí mật.
    2. Đối với mọi Telegram Webhook update (`update_id`, `callback_query`, `message`): Bắt buộc kiểm tra header `X-Telegram-Bot-Api-Secret-Token`. So khớp constant-time (`crypto.timingSafeEqual`) với `process.env.TELEGRAM_WEBHOOK_SECRET`. Nếu header thiếu hoặc sai -> từ chối `401 Unauthorized` trước khi đọc body hoặc tương tác DB.
    3. Phân tách rõ luồng Mini App Proxy (`update.custom_action`): Xác thực chữ ký HMAC-SHA256 của `initData` với `TELEGRAM_BOT_TOKEN`, không dùng Webhook Secret Token header cho Mini App.
    4. Cập nhật quy trình rollout an toàn: Không dùng `getWebhookInfo` để xác nhận secret (vì Telegram API không trả trường này); thay vào đó dùng `getWebhookInfo` để kiểm tra kết nối webhook và gửi 1 test callback thực tế từ Telegram để khẳng định Telegram đang truyền kèm header bí mật.
    5. Bổ sung test cases chi tiết: runtime thiếu secret -> 500, request thiếu/sai secret header -> 401, header chuẩn -> 200, giả mạo/thiếu initData proxy -> 401.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 7, 8, 9) và `FEATURE_TASKS.md` (Task 2.0, Task 2.2, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:78-91`, `FEATURE_TASKS.md:55-75,95-108`, `api/telegram.ts:115-155`).


---

## Round 13 - 2026-10-30T12:43:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:68-80`
  - `FEATURE_TASKS.md:38-48,98-115`
  - `src/context/AppContext.tsx:1037-1060,1795-1815`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-22]: Nhả thẻ từ kho có thể gán lại ngay cho chính request vừa bị nhả**
  - *Sửa:* Loại trừ tường minh `v_origin_req_id` khỏi câu truy vấn Auto-Assignment trong RPC `release_taxi_card_atomic`:
    1. Xác định `v_origin_req_id = COALESCE(p_request_id, (SELECT current_request_id FROM public.taxi_cards WHERE code = p_card_code))`.
    2. Cập nhật request gốc sang `status = 'card_released'` (nếu `release_reservation`) hoặc `status = 'waitlist_cards'` (nếu `release_card_to_waitlist`), xóa `reserved_card_code = NULL`.
    3. Khi tìm đơn hàng chờ ưu tiên, bắt buộc thêm điều kiện loại trừ đơn gốc: `SELECT * FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_origin_req_id ORDER BY COALESCE(estimated_start_time, created_at) ASC, created_at ASC LIMIT 1 FOR UPDATE`.
    4. Nếu có đơn chờ khác: Gán thẻ cho đơn chờ mới (`status = 'pending_handover'`).
    5. Nếu không có đơn chờ nào khác (hoặc đơn gốc là đơn duy nhất trong waitlist): Đưa thẻ về kho `status = 'available'`, `current_request_id = NULL`. Đơn gốc vẫn giữ trạng thái `waitlist_cards`. Tuyệt đối không gán ngược lại thẻ vừa nhả cho chính đơn gốc.
    6. Bổ sung test cases: (a) Đơn gốc là đơn duy nhất trong waitlist -> Admin nhả thẻ từ kho -> Thẻ về `available`, đơn gốc ở `waitlist_cards`; (b) Đơn gốc có giờ đi sớm hơn đơn waitlist B -> Thẻ được gán cho đơn B, đơn gốc vẫn ở `waitlist_cards`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6, 7, 8, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:68-80`, `FEATURE_TASKS.md:38-48,98-115`, `src/context/AppContext.tsx:1037-1060,1795-1815`).


---

## Round 14 - 2026-10-30T12:48:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:144-165`
  - `FEATURE_TASKS.md:44-78,105-130`
  - `src/context/AppContext.tsx:65-90,1584-1675,1755-1815`
  - `src/components/admin/AdminActionQueueView.tsx:158-175,210-245`
  - `src/components/admin/ReleaseCardModal.tsx:20-40`
  - `src/components/admin/AdminInventoryView.tsx:700-725`
  - `src/components/employee/EmployeeRequestsViewMinimal.tsx:70-85`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-23]: Chuyển sang RPC bất đồng bộ nhưng vẫn giữ contract và handler đồng bộ**
  - *Sửa:* Cập nhật toàn diện contract và UI handler sang bất đồng bộ:
    1. Cập nhật `AppContextType`: Đổi kiểu trả về của các method `assignCardFromWaitlist`, `adminApprove`, `confirmHandover`, `cancelRequest`, `releaseReservedCard`, `releaseCardDirectly` từ đồng bộ sang bất đồng bộ `Promise<{ success: boolean; message: string }>`.
    2. Triển khai `async/await` bên trong từng method: gọi backend proxy `/api/telegram` và chỉ cập nhật local state sau khi server commit thành công; nếu lỗi thì refresh state từ server để tránh lệch trạng thái.
    3. Cập nhật toàn bộ các UI caller:
       - `AdminActionQueueView.tsx`: chuyển `handleAdminApprove`, `handleConfirmHandover`, `handleAssignCard` sang `async (req) => { ... }`; duy trì `actionLoadingIds[req.id] = true` trong suốt thời gian promise chạy, giải phóng trong khối `finally`, không dùng timeout 800ms cố định.
       - `ReleaseCardModal.tsx`: chuyển `handleRelease` sang `async`, thêm spinner loading, chỉ đóng modal khi `res.success === true`.
       - `AdminInventoryView.tsx`: chuyển handler `releaseCardDirectly` sang `async`, hiển thị loading trên nút xác nhận.
       - `EmployeeRequestsViewMinimal.tsx`: chuyển `handleCancel` sang `async`, chờ hủy đơn hoàn tất mới đóng popup và báo feedback.
    4. Bổ sung test cases: Giả lập mạng chậm 2 giây (kiểm tra nút bấm bị khóa và loading suốt 2 giây), giả lập RPC lỗi (kiểm tra UI báo lỗi, không đóng modal non, state được đồng bộ lại).
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 6) và `FEATURE_TASKS.md` (Task 2.1, Task 2.1b, Task 3.4).

- **[EFR-24]: Fallback RPC trực tiếp từ Mini App mâu thuẫn với quyền EXECUTE đã bị thu hồi**
  - *Sửa:* Loại bỏ hoàn toàn fallback RPC trực tiếp từ browser client trong `src/services/supabaseService.ts`:
    1. Do DB đã thực hiện `REVOKE ALL ON FUNCTION ... FROM public, anon, authenticated` và chỉ cấp quyền cho `service_role`, client Mini App không thể gọi trực tiếp RPC mà không vi phạm trust boundary hoặc lộ `service_role` key.
    2. Wrapper `supabaseService.ts` chỉ gọi duy nhất qua backend proxy endpoint `/api/telegram` có chứng thực chữ ký HMAC-SHA256 của `initData`.
    3. Khi proxy gặp lỗi mạng hoặc server error, trả về `{ success: false, message: ... }` rõ ràng để UI xử lý và giữ nguyên trạng thái; tuyệt đối không fallback gọi RPC từ client.
    4. Bổ sung test cases: Khẳng định Mini App không còn bất kỳ lệnh gọi RPC trực tiếp nào qua client anon.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5, 6) và `FEATURE_TASKS.md` (Task 1.4, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:144-165`, `FEATURE_TASKS.md:44-78,105-130`, UI components `AdminActionQueueView`, `ReleaseCardModal`, `AdminInventoryView`, `EmployeeRequestsViewMinimal`).


---

## Round 15 - 2026-10-30T13:38:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:48-65,145-165`
  - `FEATURE_TASKS.md:60-80,105-130`
  - `src/context/AppContext.tsx:1390-1481`
  - `src/components/employee/EmployeeRequestsView.tsx:70-85`
  - `src/components/employee/EmployeeRequestsViewMinimal.tsx:70-85`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-25]: Mini App adminApprove vẫn quyết định thẻ ở client, bỏ qua nhánh duyệt nguyên tử của RPC**
  - *Sửa:* Chuyển đổi `adminApprove` trong Mini App để sử dụng cùng Nhánh 3 (duyệt nhanh nguyên tử) với Telegram Webhook:
    1. Trong `src/context/AppContext.tsx`: `adminApprove` gọi `await assignCardAtomic(requestId, undefined, currentUser.id, false)` (không truyền mã thẻ `p_card_code`).
    2. Loại bỏ hoàn toàn việc tìm thẻ rảnh tại client (`cards.find`) và nhánh tự chuyển sang `waitlist_cards` rời rạc ở client.
    3. Toàn bộ quyết định kiểm tra tồn kho, khóa thẻ rảnh theo thứ tự (`ORDER BY code ASC FOR UPDATE`) hoặc đưa vào `waitlist_cards` được giao phó cho Nhánh 3 của RPC thực thi và commit nguyên tử trong DB.
    4. Client chỉ phân nhánh cập nhật local state và gửi thông báo theo `result` trả về từ RPC (`assigned_new`, `assigned_existing`, `waitlisted`, `already_processed`).
    5. Bổ sung test cases: Duyệt khi kho hết thẻ (không lỗi undefined), duyệt khi snapshot client cũ (RPC tự gán thẻ khác hoặc waitlist), duyệt khi đơn đã được Telegram giữ thẻ trước (trả `assigned_existing`).
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 6) và `FEATURE_TASKS.md` (Task 2.1, Task 3.4).

- **[EFR-26]: Bỏ sót EmployeeRequestsView khi đổi cancelRequest sang Promise**
  - *Sửa:* Bổ sung `src/components/employee/EmployeeRequestsView.tsx` vào danh sách UI caller cần chuyển đổi:
    1. Thêm `EmployeeRequestsView.tsx` vào bảng Module bị ảnh hưởng trong `FEATURE_PLAN.md` (mục 6) và danh sách UI caller trong `FEATURE_TASKS.md` (Task 2.1b).
    2. Chuyển hàm `handleCancel` trong `EmployeeRequestsView.tsx` sang `async (reqId) => { ... }`, dùng `await cancelRequest(...)`, chỉ đóng popup xác nhận và cập nhật feedback sau khi server RPC hoàn tất.
    3. Bổ sung test case kiểm thử hành vi hủy đơn trên cả 2 màn hình `EmployeeRequestsView.tsx` và `EmployeeRequestsViewMinimal.tsx`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 6) và `FEATURE_TASKS.md` (Task 2.1b, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:48-65,145-165`, `FEATURE_TASKS.md:60-80,105-130`, `src/context/AppContext.tsx:1390-1481`, `src/components/employee/EmployeeRequestsView.tsx`).


---

## Round 16 - 2026-10-30T13:42:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:80-100`
  - `FEATURE_TASKS.md:78-95,120-135`
  - `src/context/AppContext.tsx:715-785`
  - `api/telegram.ts:140-150`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-27]: Bật xác thực mọi custom_action làm hỏng các helper gửi/sửa tin Telegram của Mini App**
  - *Sửa:* Đính kèm `initData` vào toàn bộ helper client và bảo vệ tracker khi sửa tin thất bại:
    1. Trong `src/context/AppContext.tsx`: Cập nhật `secureSendTelegramMessage` và `secureEditTelegramMessage` tự động đính kèm `init_data: (window as any).Telegram?.WebApp?.initData || ''` vào body request.
    2. Trong `api/telegram.ts`: Xác thực chữ ký HMAC-SHA256 của `init_data` với `TELEGRAM_BOT_TOKEN` cho TẤT CẢ các custom actions (`sendMessage`, `editMessageText`, `assignCardAtomic`, `cancelRequestAtomic`, `releaseCardAtomic`); từ chối 401 nếu thiếu hoặc sai chữ ký.
    3. Trong `syncEditTelegramMessages` (`AppContext.tsx`): Kiểm tra kết quả phản hồi của từng tin nhắn (`r?.ok === true`). Chỉ xóa bản ghi tracker (`keepTracker = false`) trong bảng `users` khi TOÀN BỘ các tin nhắn đã được Telegram xác nhận sửa thành công. Nếu có tin nhắn lỗi (401, lỗi mạng, lỗi Telegram API), giữ lại tracker để bảo đảm không làm mất dấu các nút bấm còn hoạt động trên màn hình của các Admin khác.
    4. Bổ sung test cases: (a) Gửi/sửa tin không có hoặc sai chữ ký `initData` -> bị 401; (b) Có `initData` chuẩn -> 200 OK; (c) Giả lập lỗi khi sửa tin -> tracker `msg_track_req_*` không bị xóa khỏi DB.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5) và `FEATURE_TASKS.md` (Task 2.2, Task 2.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:80-100`, `FEATURE_TASKS.md:78-95,120-135`, `src/context/AppContext.tsx:715-785`, `api/telegram.ts:140-150`).


---

## Round 17 - 2026-10-30T13:46:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:95-102`
  - `FEATURE_TASKS.md:85-93,125-135`
  - `api/telegram.ts:50-115,353-375`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-28]: Webhook vẫn xóa tracker khi sửa tin Telegram thất bại**
  - *Sửa:* Áp dụng điều kiện kiểm tra kết quả sửa tin trước khi xóa tracker cho cả `editAllTrackedMessages` trong Webhook `api/telegram.ts`:
    1. Trong `api/telegram.ts`: Thu thập toàn bộ kết quả của `editMessageText` khi sửa tin đa Admin: `const results = await Promise.all(tracked.map(m => editMessageText(m.chatId, m.messageId, text, { inline_keyboard: [] }).catch(() => null)));`.
    2. Chỉ thực thi lệnh xóa tracker `supabase.from('users').delete().eq('id', trackId)` khi `!keepTracker` VÀ TOÀN BỘ các tin nhắn đã được Telegram xác nhận sửa thành công (`results.length > 0 && results.every(r => r && r.ok === true)`).
    3. Nếu có bất kỳ tin nhắn nào bị lỗi (rate-limit, Telegram API lỗi, lỗi mạng), bắt buộc giữ lại bản ghi tracker `msg_track_req_*` trong bảng `users` (kể cả trong callback xử lý đơn đã kết thúc) để đảm bảo không làm mất danh sách tin nhắn cần retry và không để lại các nút bấm mồ côi trên màn hình các Admin khác.
    4. Bổ sung test cases: Giả lập Telegram API trả về lỗi khi webhook sửa tin trên đơn đã xử lý -> Khẳng định bản ghi tracker không bị xóa khỏi bảng `users`.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 5) và `FEATURE_TASKS.md` (Task 2.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:95-102`, `FEATURE_TASKS.md:85-93,125-135`, `api/telegram.ts:50-115,353-375`).


---

## Round 18 - 2026-10-30T13:50:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:70-85,205-225`
  - `FEATURE_TASKS.md:38-48,125-145`
  - `api/telegram.ts:50-115`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-29]: RPC nhả thẻ đọc chủ thẻ trước khóa và đảo thứ tự khóa so với RPC cấp thẻ**
  - *Sửa:* Thiết lập thứ tự khóa tài nguyên toàn cục nhất quán (Request -> Card) và cơ chế Double-Check under Lock trong `release_taxi_card_atomic`:
    1. Toàn bộ hệ thống tuân thủ thứ tự khóa tài nguyên duy nhất: **Khóa Request trước, Khóa Card sau** để loại trừ nguy cơ Deadlock giữa `assign_taxi_card_atomic` và `release_taxi_card_atomic`.
    2. Trong `release_taxi_card_atomic`:
       - Nếu có `p_request_id` (`releaseReservedCard`): Khóa request `p_request_id` trước (`FOR UPDATE`), sau đó khóa thẻ `reserved_card_code` (`FOR UPDATE`).
       - Nếu chỉ có `p_card_code` (`releaseCardDirectly`): Đọc định hướng `v_temp_req_id = (SELECT current_request_id FROM taxi_cards WHERE code = p_card_code)`. Nếu `v_temp_req_id IS NOT NULL`, khóa request `v_temp_req_id` trước (`FOR UPDATE`), sau đó mới khóa thẻ `p_card_code` (`FOR UPDATE`).
       - Tái kiểm tra dưới lock (Double-Check under Lock): Nếu `v_card.current_request_id <> v_temp_req_id`, transaction phát hiện thẻ đã đổi chủ hoặc bị thay đổi trạng thái trước khi lấy lock và ném lỗi retryable `RAISE EXCEPTION 'Card assignment changed concurrently, please retry.' USING ERRCODE = 'T5001'`, ngăn chặn việc commit nhầm trên chủ thẻ cũ.
    3. Cập nhật dòng kiểm thử `FEATURE_PLAN.md:211` để khớp với việc `getWebhookInfo` không trả `secret_token`.
    4. Bổ sung test cases: (a) Giả lập 2 transaction chạy xen kẽ `assign_taxi_card_atomic` và `release_taxi_card_atomic` trên cùng request/thẻ -> Không xảy ra deadlock (PostgreSQL 40P01), commit/rollback có kiểm soát; (b) Giả lập thẻ đổi chủ trước khi lấy lock -> Double-check phát hiện và trả lỗi retryable rõ ràng.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2, 9) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:70-85,205-225`, `FEATURE_TASKS.md:38-48,125-145`, `api/telegram.ts:50-115`).


---

## Round 19 - 2026-10-30T13:54:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:60-85,205-225`
  - `FEATURE_TASKS.md:35-50,135-155`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-30]: Auto-assign vẫn khóa Card trước Request hàng chờ, phá thứ tự khóa toàn cục**
  - *Sửa:* Thiết lập thứ tự khóa phân cấp toàn cục bất biến (Level 1: Requests -> Level 2: Card) cho cả `release_taxi_card_atomic` và `cancel_taxi_request_atomic`:
    1. **Quy tắc phân cấp tài nguyên:** Khóa TẤT CẢ các Request tham gia trước (Level 1: theo `ORDER BY id ASC FOR UPDATE`), sau đó mới khóa Card (Level 2: theo `ORDER BY code ASC FOR UPDATE`). Tuyệt đối không giữ khóa Card trước khi khóa đơn chờ.
    2. Trong `release_taxi_card_atomic`:
       - *Level 1 (Khóa Requests):* Xác định tập request ứng viên (đơn gốc `v_temp_origin_id` và đơn chờ ứng viên `v_candidate_waitlist_id`). Khóa đồng thời theo thứ tự ID tăng dần: `SELECT * FROM taxi_requests WHERE id IN (v_temp_origin_id, v_candidate_waitlist_id) ORDER BY id ASC FOR UPDATE;`.
       - *Level 2 (Khóa Card):* Khóa thẻ cần giải phóng: `SELECT * FROM taxi_cards WHERE code = ... ORDER BY code ASC FOR UPDATE;`.
       - *Dưới lock:* Thực hiện Double-Check, cập nhật đơn gốc, và auto-assign sang `v_candidate_waitlist_id` nếu vẫn ở `waitlist_cards` (hoặc trả về `available` nếu không có đơn chờ).
    3. Trong `cancel_taxi_request_atomic`:
       - *Level 1 (Khóa Requests):* Xác định đơn hủy `p_request_id` và đơn chờ ứng viên `v_candidate_waitlist_id`. Khóa đồng thời theo `ORDER BY id ASC FOR UPDATE;`.
       - *Level 2 (Khóa Card):* Khóa thẻ vừa giải phóng theo `ORDER BY code ASC FOR UPDATE;`.
       - *Dưới lock:* Cập nhật đơn hủy sang `cancelled` và auto-assign thẻ cho đơn chờ (hoặc trả về `available`).
    4. Bổ sung test cases: Giả lập Transaction A chạy `release_taxi_card_atomic` (hoặc `cancel_taxi_request_atomic`) giải phóng thẻ C với auto-assign cho đơn chờ W đồng thời với Transaction B chạy `assign_taxi_card_atomic` gán thẻ C (hoặc thẻ khác) cho đơn W -> Khẳng định không xảy ra Deadlock 40P01, cả 2 giao dịch hoàn thành tuần tự và dữ liệu nhất quán 100%.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2) và `FEATURE_TASKS.md` (Task 1.3, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:60-85,205-225`, `FEATURE_TASKS.md:35-50,135-155`).


---

## Round 20 - 2026-10-30T13:58:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:65-90`
  - `FEATURE_TASKS.md:37-50,135-155`
  - `.agents/active/fix-telegram-miniapp-sync-double-card/EXPERT_REVIEW.md`

---

### EFR Đã Chấp Nhận
- **[EFR-31]: Candidate waitlist hết hợp lệ thì thẻ về available dù còn đơn khác đang chờ**
  - *Sửa:* Bổ sung cơ chế bảo vệ hàng chờ và mã lỗi retryable `T5002` trong `release_taxi_card_atomic` và `cancel_taxi_request_atomic`:
    1. Trong cả 2 RPC: Dưới lock, nếu candidate waitlist request `v_candidate_waitlist_id` bị transaction khác xử lý mất (không còn `status = 'waitlist_cards'`):
       - Kiểm tra xem trong DB còn đơn nào khác đang ở hàng chờ không: `IF EXISTS (SELECT 1 FROM public.taxi_requests WHERE status = 'waitlist_cards' AND id IS DISTINCT FROM v_origin_id)`.
       - Nếu CÒN đơn khác chờ: Ném lỗi retryable `RAISE EXCEPTION 'Waitlist head changed concurrently, please retry.' USING ERRCODE = 'T5002';`. Tuyệt đối không commit thẻ về `available` khi vẫn còn đơn chờ khác trong hệ thống.
       - Chỉ đưa thẻ về kho `status = 'available'` khi đã kiểm chứng hàng chờ thực sự không còn bất kỳ đơn nào khác.
    2. Trong `src/services/supabaseService.ts`: Bổ sung cơ chế tự động thử lại (auto-retry tối đa 3 lần với exponential backoff 50ms-150ms) đối với các mã lỗi retryable (`T5001`, `T5002`, `40P01`). Khi thử lại trên snapshot mới, RPC sẽ tự động chọn candidate tiếp theo (W2) ở Level 1 và gán thẻ thành công.
    3. Bổ sung test cases: Giả lập W1 đứng đầu hàng chờ và W2 đứng thứ hai. Transaction A nhả thẻ C (candidate W1); trong lúc chờ khóa, W1 được transaction khác cấp thẻ; Transaction A phát hiện W1 không còn waitlist và ném lỗi `T5002`; client/proxy tự động retry trên snapshot mới và gán thành công thẻ C cho W2; khẳng định thẻ C KHÔNG bị đưa nhầm về `available` khi W2 vẫn đang chờ thẻ.
  - Đã cập nhật vào `FEATURE_PLAN.md` (mục 2) và `FEATURE_TASKS.md` (Task 1.3, Task 1.4, Task 3.4).

---

### EFR Đã Bác Bỏ
- Không có.

---

### EFR Chưa Kết Luận
- Không có.

---

### Phát Hiện Bổ Sung
- Không có. (Vùng đã scan: `FEATURE_PLAN.md:65-90`, `FEATURE_TASKS.md:37-50,135-155`).
