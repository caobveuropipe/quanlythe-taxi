# Feature Plan: Bộ 4 Tính Năng Vận Hành Nâng Cao & Chuẩn Hóa Giao Diện Admin PA 1

> **Trạng thái**: ✅ ĐỒNG Ý  
> **Review gate**: Đã qua review hội đồng kỹ thuật (`EXPERT_REVIEW.md`), sẵn sàng chuyển giao cho `feature-coordinator`  
> **Feature slug**: `operational-workflow-enhancements`  
> **Tạo bởi**: feature-plan & feature-review  
> **Ngày cập nhật**: 2026-10-18  

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:**  
  Trong quá trình rà soát vận hành thực tế hệ thống TaxiCard Mini App (ghi nhận tại `TONG_KET_VA_TON_DONG_SESSION.md`) và phản hồi trực tiếp từ User:
  1. *Quyết định giao diện Admin:* Người dùng đã chính thức lựa chọn **Phương án 1: 2 Tab Đi/Về (Cấp thẻ - Thu bill)**. Cần cố định phương án này và gỡ bỏ bong bóng thử nghiệm 3 phương án để giao diện tinh gọn, tập trung.
  2. *Admin xuất thẻ nhanh trực tiếp tại quầy:* Sếp cần xe gấp hoặc khách đột xuất, nhân sự chạy thẳng tới quầy gặp Admin/HR xin thẻ ngay mà không kịp tạo đơn qua app.
  3. *Cảnh báo timeline trước khi giải phóng thẻ:* Đơn đã duyệt cấp thẻ (`pending_handover`) nhưng nhân sự quên/chậm xuống nhận, dẫn đến việc "giam thẻ" lãng phí trong khi người khác cần.
  4. *Leader hoàn tác (Undo) từ chối trong 90 phút:* Leader bấm từ chối trên Telegram nhưng sau khi nhân viên giải trình hợp lý muốn đổi ý duyệt lại mà không bắt nhân viên nộp lại đơn.
  5. *Phân loại ưu tiên Waitlist theo "Thời điểm đi thực tế":* Ưu tiên cấp thẻ cho người có lịch đi gần nhất trong ngày khi có thẻ về kho.

- **Vấn đề cần giải quyết:**  
  - Admin không thể xuất thẻ vật lý nếu chưa có đơn khởi tạo từ nhân sự.
  - Cảnh báo thời gian giữ thẻ thiếu mốc chuẩn xác (`handoverReadyAt`) gây sai lệch với đơn thoát khỏi Waitlist (theo phát hiện `FR-01`).
  - Thiếu kiểm tra chặn xung đột "Đơn duy nhất" khi Leader hoàn tác đơn cũ mà nhân sự đã nộp đơn mới (theo phát hiện `FR-02`).
  - Hàm sort của Waitlist có nguy cơ bất định do `NaN` khi `estimatedStartTime` bị `undefined` (theo phát hiện `FR-03`).
  - Chưa chuẩn hóa fallback `GUEST` cho người nhận ngoài danh sách khi xuất thẻ nhanh (theo phát hiện `FR-04`).
  - Màn hình Admin cần cố định chuẩn PA 1 (2 Tab Đi/Về) và có tick timer cập nhật badge thời gian thực (theo phát hiện `FR-05`).

- **Mục tiêu & Kết quả mong đợi:**  
  - Giao diện Admin cố định chuẩn **PA 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill)**, sạch sẽ, bỏ switcher tạm.
  - Hoàn thiện trọn vẹn 4 tính năng vận hành vào `AppContext.tsx`, hệ thống Type, các View giao diện Admin/Leader/Employee và bộ dữ liệu mẫu `seedData.ts`.
  - Khắc phục triệt để các phát hiện `FR-01` đến `FR-05` từ Council Review.

---

## 2. Phạm vi

### In scope
1. **Chuẩn hóa Giao diện Admin (PA 1 - 2 Tab Đi/Về):**
   - Cố định giao diện [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) theo **Phương án 1**:
     - *Tab 1: Cấp thẻ (Chiều đi):* Gồm Duyệt cấp, Hàng chờ thẻ (Waitlist), Chờ bàn giao thẻ.
     - *Tab 2: Thu thẻ & Bill (Chiều về):* Gồm Đang giữ thẻ/Nợ bill và Thẩm định chi phí vượt hạn mức.
   - Loại bỏ bong bóng chuyển đổi 3 phương án và code thừa của PA 2, PA 3.
2. **Ý tưởng 1 (Admin Direct Dispatch):**
   - Modal xuất thẻ nhanh: Chọn thẻ `available`, chọn từ danh sách nhân viên hoặc nhập tự do (áp dụng fallback `GUEST` theo `FR-04`), ghi chú mục đích.
   - Hàm `directDispatchCard` trong `AppContext.tsx`: Sinh mã đơn dạng `REQ-DIRECT-xxx`, gán thẻ vào `in_use`, đơn chuyển thẳng `holding_card`.
   - Nút gọi modal trên toolbar của `AdminActionQueueView.tsx` và `AdminInventoryView.tsx`.
3. **Ý tưởng 2 (Hold Timeline Alert):**
   - Thêm trường `handoverReadyAt?: string;` vào `TaxiRequest` (theo `FR-01`), được cập nhật khi Admin duyệt cấp thẻ hoặc khi đơn tự động thoát Waitlist.
   - Hiển thị badge trực quan trên thẻ `pending_handover`:
     - `< 15 phút`: Bình thường (xanh dương/xám).
     - `15 - 30 phút`: Cảnh báo nhắc nhở (vàng).
     - `> 30 phút`: Cảnh báo quá hạn (viền đỏ/cam, badge nổi bật) kèm nút thao tác nhanh `Giải phóng thẻ ngay`.
   - Bổ sung `useInterval` nhẹ (30s - 60s) để cập nhật thời gian thực (theo `FR-05`).
4. **Ý tưởng 3 (Leader 90-min Real Undo):**
   - Bổ sung `leaderDecisionAt?: string;` vào `TaxiRequest`.
   - Hàm `leaderUndoReject(requestId: string)` trong `AppContext.tsx`:
     - Kiểm tra mốc 90 phút.
     - Kiểm tra chặn xung đột: Nếu nhân sự đã có đơn active mới thì từ chối hoàn tác (theo `FR-02`).
     - Nếu kho còn thẻ rảnh: Giữ thẻ và chuyển `pending_handover`.
     - Nếu kho hết thẻ: Chuyển `waitlist_cards`.
   - Kết nối nút `↺ Hoàn tác sang DUYỆT` trong `LeaderApprovalsView.tsx` với hàm `leaderUndoReject` thật.
5. **Ý tưởng 4 (Waitlist Priority by Trip Time):**
   - Bổ sung trường `estimatedStartTime?: string;` vào `TaxiRequest`.
   - Bổ sung trường chọn Ngày & Giờ đi dự kiến trong `EmployeeRegisterView.tsx`.
   - Nâng cấp thuật toán `autoAssignCardIfWaitlisted` với hàm helper chuẩn hóa `getEffectiveTime` xử lý an toàn giá trị rỗng/undefined (theo `FR-03`).
6. **Cập nhật dữ liệu mẫu (Seed Data):**
   - Cập nhật các kịch bản mẫu tương ứng vào `src/data/seedData.ts`.

### Out of scope
- Tích hợp thực tế với Telegram Bot API live qua Webhook ngoài đời.
- Backend SQL bên ngoài (tiếp tục duy trì `localStorage` qua key `taxicard_app_data_v3`).

---

## 3. Đối chiếu Knowledge Base & Council Review

- **Kế thừa và Tuân thủ:**
  - Bất biến thẻ: 1 thẻ chỉ ở 1 trạng thái, không cấp trùng.
  - Bất biến đơn: 1 nhân sự tại 1 thời điểm chỉ có tối đa 1 đơn active (được bảo vệ bởi `FR-02`).
  - Giao diện Admin: Chuẩn hóa 2 Tab Đi/Về giúp tinh giản tối đa thao tác trên mobile.
  - Dữ liệu thời gian: Dùng `handoverReadyAt` để đo chính xác thời lượng giữ thẻ thực tế (`FR-01`).

---

## 4. Acceptance Criteria

- [ ] **AC 1 (Chuẩn hóa UI Admin PA 1):** Màn hình Admin Action Queue hiển thị mặc định và cố định theo Phương án 1 (2 Tab Đi/Về), không còn bong bóng switcher thử nghiệm 3 phương án.
- [ ] **AC 2 (Xuất thẻ trực tiếp & Fallback GUEST):** Admin có nút `⚡ Xuất thẻ nhanh tại quầy`. Nếu nhập người nhận ngoài danh sách, hệ thống tự động gán fallback `GUEST` an toàn (`FR-04`), sinh đơn `REQ-DIRECT-xxx`, thẻ vào `in_use`, đơn ở `holding_card`.
- [ ] **AC 3 (Timeline cảnh báo chính xác):** Đơn `pending_handover` tính thời gian chờ theo `handoverReadyAt` (`FR-01`). Có cảnh báo viền đỏ/cam khi quá 30 phút, timer tự động cập nhật theo thời gian thực (`FR-05`).
- [ ] **AC 4 (Leader Hoàn tác thật & Chặn đơn trùng):** Leader có thể hoàn tác trong vòng 90 phút. Nếu nhân sự đã nộp đơn active khác, hệ thống chặn hoàn tác và báo lỗi rõ ràng (`FR-02`). Nếu kho hết thẻ, tự động chuyển vào Waitlist.
- [ ] **AC 5 (Ưu tiên Waitlist xác định):** Form đăng ký có chọn giờ đi dự kiến. Thuật toán `autoAssignCardIfWaitlisted` so sánh an toàn bằng `getEffectiveTime` (`FR-03`), luôn ưu tiên đơn có lịch đi sớm nhất trong ngày.
- [ ] **AC 6 (Type Safety & Regression):** Toàn bộ dự án vượt qua kiểm tra `npm run lint` (`tsc --noEmit`).

---

## 5. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro |
|-------------|-----------|----------------|--------|
| [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts) | Sửa | Thêm `handoverReadyAt`, `leaderDecisionAt`, `estimatedStartTime`, `isDirectDispatch` | 🟢 Thấp |
| [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) | Sửa | Thêm `directDispatchCard`, `leaderUndoReject`, sửa `autoAssignCardIfWaitlisted` và `createRequest` | 🟡 Trung bình |
| [src/components/admin/DirectDispatchModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/DirectDispatchModal.tsx) | Tạo mới | Modal xuất thẻ nhanh tại quầy kèm chọn lý do khẩn cấp | 🟢 Thấp |
| [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) | Sửa | Cố định PA 1 (2 Tab Đi/Về), gỡ switcher, thêm nút xuất thẻ nhanh, badge timeline và tick timer | 🟡 Trung bình |
| [src/components/admin/AdminInventoryView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminInventoryView.tsx) | Sửa | Thêm nút xuất nhanh trên kho thẻ | 🟢 Thấp |
| [src/components/leader/LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx) | Sửa | Kết nối nút Hoàn tác với state thật, hiển thị tab đơn từ chối có thể hoàn tác trong 90p | 🟡 Trung bình |
| [src/components/employee/EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx) | Sửa | Thêm trường chọn Ngày & Giờ đi dự kiến | 🟢 Thấp |
| [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts) | Sửa | Bổ sung các kịch bản test mẫu cho các tính năng mới | 🟢 Thấp |

---

## 6. Chiến lược triển khai

- **Phase 1: Chuẩn hóa Giao diện Admin PA 1 & Ý tưởng 1 (Admin Direct Dispatch)**
- **Phase 2: Ý tưởng 4 — Ngày/Giờ đi dự kiến & Ưu tiên Waitlist an toàn (`FR-03`)**
- **Phase 3: Ý tưởng 2 — Cảnh báo Timeline chuẩn xác (`FR-01`) & Tick Timer (`FR-05`)**
- **Phase 4: Ý tưởng 3 — Leader Hoàn tác 90 phút & Chặn đơn trùng (`FR-02`)**
- **Phase 5: Cập nhật Seed Data & Tổng kiểm thử nghiệm thu**

---

## 7. Tham chiếu thực thi

- Checklist chi tiết theo từng phase: [FEATURE_TASKS.md](./FEATURE_TASKS.md)
