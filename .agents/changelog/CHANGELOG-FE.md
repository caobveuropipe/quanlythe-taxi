# Changelog Frontend - Quản Lý Thẻ Taxi Nội Bộ

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client  
> Format: [Conventional Commits](https://www.conventionalcommits.org/)  
> Ngôn ngữ: Tiếng Việt  

---

## [2026-10-30] - Khắc phục Lỗi Không Đồng Bộ Telegram - MiniApp và Cấp Trùng 2 Thẻ (Multi-card Concurrency & Sync Fix)

### fix(concurrency): khắc phục lỗi cấp trùng thẻ, đồng bộ webhook telegram và atomic rpc transaction

- **PostgreSQL Atomic RPCs & DB Invariant:**
  - Bổ sung Unique Partial Index `idx_taxi_cards_single_active_request` trên `taxi_cards(current_request_id)` ngăn ngừa triệt để 1 đơn giữ 2 thẻ active.
  - Tích hợp 3 RPC function nguyên tử (`assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic`) tuân thủ Global Lock Hierarchy (Level 1: Requests theo ID tăng dần -> Level 2: Card) loại bỏ hoàn toàn nguy cơ deadlock PostgreSQL `40P01`.
  - Thiết lập Trust Boundary: Thu hồi quyền từ `anon`/`authenticated`/`public`, chỉ cho phép `service_role` thực thi RPC server-side.
  - Files: `supabase/migrations/20261030_enforce_single_active_card_per_request.sql`, `src/services/supabaseService.ts`

- **Webhook Fail-Closed & Mini App Proxy HMAC Auth:**
  - Endpoint `/api/telegram` áp dụng Fail-Closed constant-time check với `TELEGRAM_WEBHOOK_SECRET` qua header `X-Telegram-Bot-Api-Secret-Token`.
  - Toàn bộ custom action proxy từ Mini App (gửi/sửa tin nhắn Telegram, gọi RPC) đều yêu cầu chữ ký HMAC-SHA256 của `initData`.
  - Luồng duyệt nhanh trên Telegram (`approve_req_`) gọi trực tiếp RPC `assign_taxi_card_atomic`, loại bỏ việc đọc/ghi ngoài transaction và chấm dứt nghịch lý ghi đè `waitlist_cards` khi đơn đã có thẻ.
  - Files: `api/telegram.ts`, `.env.example`, `scripts/setup-telegram-webhook.mjs`

- **UI Async Contract & Persistent Anti-Double-Click Lock:**
  - Chuyển toàn bộ các phương thức thao tác thẻ trong `AppContext` (`adminApprove`, `assignCardFromWaitlist`, `confirmHandover`, `cancelRequest`, `releaseReservedCard`, `releaseCardDirectly`) sang `Promise<{ success: boolean; message: string }>`.
  - Cập nhật cả 5 UI views sang `async/await` với trạng thái loading bền bỉ trong `finally`, loại bỏ timeout giải phóng sớm và bảo đảm modal chỉ đóng khi server commit thành công.
  - Files: `src/context/AppContext.tsx`, `src/components/admin/AdminActionQueueView.tsx`, `src/components/admin/ReleaseCardModal.tsx`, `src/components/admin/AdminInventoryView.tsx`, `src/components/employee/EmployeeRequestsView.tsx`, `src/components/employee/EmployeeRequestsViewMinimal.tsx`

- **Bảo toàn Tracker Tin Nhắn Telegram Đa Admin:**
  - Sửa `editAllTrackedMessages` và `syncEditTelegramMessages` chỉ xóa tracker khi đơn kết thúc hoàn toàn VÀ toàn bộ tin nhắn sửa thành công (`allSucceeded === true`).
  - Hợp nhất mảng tracker theo tập hợp `(chatId, messageId)` khi Leader duyệt, chống mất dấu tin nhắn của các Admin khác.
  - Files: `api/telegram.ts`, `src/context/AppContext.tsx`

---

## [2026-10-18] - Chuẩn hóa Giao diện Admin PA 1 & Bộ 4 Tính năng Vận hành Nâng cao

### feat(admin-ops): chuẩn hóa giao diện admin PA 1 và bộ 4 tính năng vận hành nâng cao

- **Chuẩn hóa Giao diện Admin PA 1:** Cố định giao diện Admin thành 2 Tab duy nhất: `1. Cấp thẻ (Chiều đi)` và `2. Thu thẻ & Bill (Chiều về)`. Loại bỏ bong bóng thử nghiệm switcher 3 phương án và dọn dẹp các khối code không dùng của PA 2 và PA 3.
  - Files: [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx)

- **Xuất thẻ nhanh tại quầy (Ý tưởng 1):** Bổ sung modal và hàm `directDispatchCard` cho phép Admin/HR cấp thẻ rảnh trực tiếp tại quầy trong trường hợp khẩn cấp (`REQ-DIRECT-xxx`), tự động đưa thẻ vào `in_use` và đơn vào `holding_card`. Hỗ trợ chọn người nhận từ danh sách hoặc nhập tên khách ngoài tự do với cơ chế fallback an toàn `GUEST` (FR-04). Tích hợp nút xuất nhanh trên header Admin và từng thẻ khả dụng trong kho.
  - Files: [src/components/admin/DirectDispatchModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/DirectDispatchModal.tsx), [src/components/admin/AdminInventoryView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminInventoryView.tsx), [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx), [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts)

- **Lịch đi dự kiến & Ưu tiên Waitlist an toàn (Ý tưởng 4 & FR-03):** Form đăng ký của nhân viên bổ sung trường chọn Ngày & Giờ đi dự kiến (`estimatedStartTime`) kèm các nút chọn nhanh ("Đi ngay", "+30 phút", "+1 giờ", "Sáng mai 08:30"). Thuật toán `autoAssignCardIfWaitlisted` sử dụng helper `getEffectiveTime` để ưu tiên cấp thẻ cho đơn có lịch đi sớm nhất trong ngày khi có thẻ về kho, loại bỏ triệt để rủi ro lỗi `NaN`.
  - Files: [src/components/employee/EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx), [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx), [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts)

- **Cảnh báo Timeline bàn giao chuẩn xác & Timer thời gian thực (Ý tưởng 2, FR-01 & FR-05):** Thêm trường `handoverReadyAt` để đo chính xác thời gian chờ nhận thẻ (cả duyệt trực tiếp lẫn tự động thoát Waitlist). Bổ sung timer 30s cập nhật thời gian thực trên giao diện Admin; phân mức cảnh báo: `< 15p` bình thường, `15-30p` badge vàng nhắc nhở, `> 30p` viền cam/đỏ quá hạn kèm nút `Giải phóng thẻ ngay`.
  - Files: [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx), [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx), [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts)

- **Leader Hoàn tác trong 90 phút & Chặn đơn trùng (Ý tưởng 3 & FR-02):** Xây dựng hàm `leaderUndoReject` kiểm tra mốc 90 phút so với `leaderDecisionAt`. Kiểm tra invariant 1 đơn active duy nhất/nhân sự để chặn xung đột nếu nhân sự đã nộp đơn khác. Tự động kiểm tra kho để giữ thẻ (`pending_handover`) hoặc xếp lại vào danh sách chờ (`waitlist_cards`). Hiển thị danh sách các đơn vừa từ chối trên giao diện Leader kèm đếm ngược và nút hoàn tác trực tiếp.
  - Files: [src/components/leader/LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx), [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx), [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts)

- **Seed Data mẫu:** Bổ sung các kịch bản demo: đơn chờ bàn giao quá hạn 35p (viền đỏ), đơn chờ 18p (badge vàng), 2 đơn Waitlist có lịch đi khác nhau, đơn vừa bị từ chối 15p trước để demo tính năng Hoàn tác.
  - Files: [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts)

---

*Cập nhật tự động bởi update-docs*
