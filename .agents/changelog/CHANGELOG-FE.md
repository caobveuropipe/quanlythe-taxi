# Changelog Frontend - Quản Lý Thẻ Taxi Nội Bộ

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client  
> Format: [Conventional Commits](https://www.conventionalcommits.org/)  
> Ngôn ngữ: Tiếng Việt  

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
