# Feature Tasks: Bộ 4 Tính Năng Vận Hành Nâng Cao & Chuẩn Hóa Giao Diện Admin PA 1

> **Trạng thái**: ✅ Hoàn thành  
> **Liên kết plan**: [FEATURE_PLAN.md](./FEATURE_PLAN.md)  
> **Ngày cập nhật**: 2026-10-18  

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm / Chờ User xác nhận
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Chuẩn hóa Giao diện Admin PA 1 & Ý tưởng 1 (Admin Xuất thẻ nhanh tại quầy)

**Mục tiêu:** Cố định giao diện Admin theo Phương án 1 (2 Tab Đi/Về), dọn dẹp switcher thử nghiệm, và cho phép Admin xuất thẻ nhanh khẩn cấp tại quầy.

- [x] Task 1.1: Chuẩn hóa [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx):
  - Cố định `layoutMode = 'two_tabs'` (PA 1: 2 Tab Đi/Về: Cấp thẻ - Thu bill).
  - Loại bỏ bong bóng thử nghiệm 3 phương án ("✨ Thử nghiệm 3 phương án") và dọn dẹp các khối code không dùng của PA 2 và PA 3.
- [x] Task 1.2: Mở rộng `TaxiRequest` trong [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts) với trường `isDirectDispatch?: boolean;`.
- [x] Task 1.3: Triển khai hàm `directDispatchCard` trong [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx):
  - Tự động sinh mã `REQ-DIRECT-xxx`.
  - Quy chuẩn fallback định danh an toàn theo `FR-04`: nếu người nhận ngoài danh sách `users`, tự động gán `employeeId: 'GUEST-' + Date.now()`, `employeeCode: 'GUEST'`, `department: 'Khách ngoài / Đột xuất'`.
  - Chuyển thẻ đã chọn sang trạng thái `in_use`, gán tên người nhận và mã yêu cầu.
  - Chuyển trạng thái đơn sang `holding_card`, ghi nhận `handedOverBy` và `handedOverAt`.
- [x] Task 1.4: Tạo component modal [src/components/admin/DirectDispatchModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/DirectDispatchModal.tsx):
  - Cho phép chọn thẻ đang sẵn sàng trong kho (`status === 'available'`).
  - Cho phép chọn người nhận từ danh sách nhân viên hoặc nhập tên/mã tự do.
  - Có các chip chọn nhanh lý do khẩn cấp: *"Sếp cần xe gấp"*, *"Đón đối tác tại sân bay"*, *"Sự cố kỹ thuật đột xuất"*.
- [x] Task 1.5: Tích hợp nút `⚡ Xuất thẻ nhanh tại quầy` vào thanh công cụ của [AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) và [AdminInventoryView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminInventoryView.tsx).
- [x] Task 1.Final: 🧪 Test & Verify Phase 1: Giao diện cố định 2 Tab Đi/Về; xuất nhanh 1 thẻ tại quầy vào thẳng `in_use` và `holding_card`.

---

## Phase 2: Ý tưởng 4 — Thêm Ngày/Giờ đi dự kiến & Ưu tiên Waitlist an toàn (Khắc phục FR-03)

**Mục tiêu:** Thu thập thời điểm đi thực tế khi nhân viên đăng ký mượn thẻ và tự động ưu tiên cấp thẻ cho đơn có lịch đi sớm nhất trong ngày khi có thẻ về kho.

- [x] Task 2.1: Bổ sung trường `estimatedStartTime?: string;` vào `TaxiRequest` trong [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts).
- [x] Task 2.2: Cập nhật hàm `createRequest` trong [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) nhận tham số `estimatedStartTime` (mặc định lấy thời điểm hiện tại nếu bỏ trống).
- [x] Task 2.3: Bổ sung trường chọn Ngày & Giờ đi dự kiến trên form đăng ký [src/components/employee/EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx) với datetime-local và nút chọn nhanh ("Đi ngay", "+30 phút", "+1 giờ", "Sáng mai 08:30").
- [x] Task 2.4: Nâng cấp thuật toán `autoAssignCardIfWaitlisted` trong [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx):
  - Khắc phục `FR-03`: Viết hàm helper chuẩn hóa: `const getEffectiveTime = (r: TaxiRequest) => r.estimatedStartTime ? new Date(r.estimatedStartTime).getTime() : new Date(r.createdAt).getTime();`.
  - Sắp xếp tăng dần theo `getEffectiveTime` để đơn có lịch đi sớm nhất được ưu tiên cấp thẻ trước, loại bỏ triệt để rủi ro lỗi `NaN`.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2: Nhân viên chọn lịch đi; đơn đi sớm trong Waitlist (`REQ-2026-096`) được ưu tiên nhận thẻ trước đơn đi ngày mai (`REQ-2026-095`).

---

## Phase 3: Ý tưởng 2 — Cảnh báo Timeline chuẩn xác (Khắc phục FR-01) & Tick Timer (Khắc phục FR-05)

**Mục tiêu:** Đo chính xác thời gian chờ nhận thẻ kể từ lúc được gán thẻ (cả duyệt trực tiếp lẫn thoát Waitlist) và cập nhật thời gian thực trên giao diện Admin.

- [x] Task 3.1: Bổ sung trường `handoverReadyAt?: string;` vào `TaxiRequest` trong [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts).
- [x] Task 3.2: Khắc phục `FR-01`: Cập nhật `handoverReadyAt = new Date().toISOString()` tại cả 2 vị trí:
  - Trong `adminApprove` (khi duyệt cấp thẻ trực tiếp).
  - Trong `autoAssignCardIfWaitlisted` (khi đơn tự động thoát Waitlist để chuyển sang `pending_handover`).
- [x] Task 3.3: Viết hàm tiện ích tính khoảng thời gian chờ (elapsed minutes) dựa trên `handoverReadyAt || adminApprovedAt` và xác định mức cảnh báo (`normal`: < 15p, `warning`: 15-30p, `expired`: > 30p).
- [x] Task 3.4: Cập nhật giao diện thẻ `pending_handover` trong [AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx):
  - Khắc phục `FR-05`: Bổ sung timer chạy định kỳ (mỗi 30s) để tự động cập nhật hiển thị số phút chờ thời gian thực.
  - Hiển thị badge: `Đã chờ X phút`. Mức `warning` (15-30p): Badge màu vàng nhắc nhở. Mức `expired` (> 30p): Viền cam/đỏ nổi bật kèm badge "Quá hạn nhận X phút - Cần liên hệ hoặc nhả thẻ".
  - Thêm nút thao tác nhanh `Giải phóng thẻ ngay` kèm lý do điền sẵn.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3: Đơn chờ 18p (`REQ-2026-100`) badge vàng, đơn chờ 35p (`REQ-2026-099`) viền cam/đỏ quá hạn.

---

## Phase 4: Ý tưởng 3 — Leader Hoàn tác 90 phút & Chặn đơn trùng (Khắc phục FR-02)

**Mục tiêu:** Cho phép Leader đổi ý từ chối sang duyệt lại trong vòng 90 phút, tác động trực tiếp vào state thật của ứng dụng và chặn xung đột nếu nhân sự đã có đơn mới.

- [x] Task 4.1: Bổ sung trường `leaderDecisionAt?: string;` vào `TaxiRequest` trong [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts) và cập nhật trong `leaderReject` và `leaderApprove`.
- [x] Task 4.2: Triển khai hàm `leaderUndoReject(requestId: string)` trong [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx):
  - Kiểm tra điều kiện hiệu lực 90 phút so với `leaderDecisionAt`.
  - Khắc phục `FR-02`: Kiểm tra xem nhân sự sở hữu đơn đã có đơn nào khác đang ở trạng thái active hay chưa. Nếu có, từ chối hoàn tác và trả về thông báo lỗi cụ thể.
  - Nếu kho còn thẻ rảnh: Tự động giữ thẻ, ghi nhận `handoverReadyAt`, chuyển trạng thái đơn sang `pending_handover`.
  - Nếu kho đã hết thẻ: Đưa đơn vào `waitlist_cards` và gắn cờ `isWaitlisted: true`.
- [x] Task 4.3: Tích hợp hàm `leaderUndoReject` vào [src/components/leader/LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx):
  - Hiển thị danh sách các đơn đã từ chối trong 90 phút kèm số phút còn lại và nút `↺ Hoàn tác sang DUYỆT`.
  - Kết nối trực tiếp với hàm `leaderUndoReject` của AppContext và hiển thị thông báo kết quả.
- [x] Task 4.Final: 🧪 Test & Verify Phase 4: Mở vai trò Leader -> thấy đơn vừa từ chối `REQ-2026-094` (còn 75p) -> bấm Hoàn tác -> đơn chuyển sang chờ giao thẻ thật.

---

## Phase 5: Tích hợp Seed Data, Kiểm thử hồi quy & Nghiệm thu toàn diện

**Mục tiêu:** Cập nhật bộ dữ liệu mẫu ban đầu để sẵn sàng demo cả 4 tính năng mới và kiểm tra tính toàn vẹn hệ thống.

- [x] Task 5.1: Cập nhật [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts) bổ sung:
  - `REQ-2026-099`: Chờ bàn giao 35 phút (demo viền đỏ cảnh báo quá hạn).
  - `REQ-2026-100`: Chờ bàn giao 18 phút (demo badge vàng cảnh báo).
  - `REQ-2026-096` & `REQ-2026-095`: 2 đơn trong Waitlist có lịch đi khác nhau (hôm nay vs ngày mai).
  - `REQ-2026-094`: Đơn vừa bị Leader từ chối 15 phút trước (demo nút Hoàn tác 90 phút).
- [x] Task 5.2: Kiểm tra type an toàn toàn bộ dự án bằng `npm run lint` (`tsc --noEmit`) - PASS 0 lỗi.
- [x] Task 5.Final: 🧪 Test & Verify Phase 5: User đã test nghiệm thu thành công trên local dev và phê duyệt archive.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-10-18 | - | - | Khởi tạo kế hoạch & tích hợp kết quả review hội đồng (FR-01..05) + chốt PA 1 | ✅ Sẵn sàng | Đã qua review gate |
| 2026-10-18 | Phase 1 | 1.1-1.5 | Cố định PA 1 2 Tab Đi/Về, tạo `directDispatchCard` & `DirectDispatchModal` | ✅ Hoàn thành | Đã tích hợp toolbar Admin |
| 2026-10-18 | Phase 2 | 2.1-2.4 | Bổ sung `estimatedStartTime` trên types, context, register view & sort waitlist | ✅ Hoàn thành | Sẵn sàng input datetime & presets |
| 2026-10-18 | Phase 3 | 3.1-3.4 | Gán `handoverReadyAt`, timer 30s, viền cam/đỏ & badge thời gian chờ | ✅ Hoàn thành | Cảnh báo chính xác elapsed time |
| 2026-10-18 | Phase 4 | 4.1-4.3 | Xây dựng `leaderUndoReject` kiểm tra 90p + chặn đơn trùng (FR-02) & tích hợp view | ✅ Hoàn thành | Hiển thị danh sách hoàn tác |
| 2026-10-18 | Phase 5 | 5.1-5.2 | Seed data trực quan demo 4 tính năng & `tsc --noEmit` pass 100% | ✅ Hoàn thành | Build production pass |
| 2026-10-18 | Final | Gate | User test thành công trên local dev và phê duyệt archive sang history | ✅ Hoàn thành | Chuyển sang update-docs |


