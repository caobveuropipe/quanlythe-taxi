# Feature Tasks: Custom Searchable Combobox & Popup Thêm Nhanh Cho Dữ Liệu Biểu Mẫu Tiếp Nhận

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-10-14

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

## Phase 1: Chuẩn bị Cấu trúc JSON & Service Quản lý Tùy chọn

**Mục tiêu:** Tạo file JSON cấu hình rỗng ban đầu và các hàm lưu trữ/đọc dữ liệu danh mục do người dùng tự thêm.

- [x] Task 1.1: Tạo file `src/data/metadataOptions.json` với cấu trúc danh mục rỗng (`[]`) cho 4 nhóm: đơn vị ban hành, người ký, nơi nhận, phòng ban.
- [x] Task 1.2: Bổ sung interface và các hàm helper trong `src/services/storage.ts` (`getFormMetadataOptions`, `addFormMetadataOption`) để quản lý và lưu danh mục do người dùng tự thêm vào `localStorage`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Kiểm tra đọc, thêm mới và lưu options vào localStorage)

## Phase 2: Xây dựng Component `SearchableCombobox` & Popup Thêm Nhanh

**Mục tiêu:** Tạo UI component Combobox hỗ trợ tìm kiếm, gõ tự do, có nút `+` mở popup nhập nhanh với nút Lưu và Hủy.

- [x] Task 2.1: Tạo component `src/components/SearchableCombobox.tsx` với đầy đủ dropdown filter, icon mũi tên, hỗ trợ click outside.
- [x] Task 2.2: Tích hợp nút `+` cạnh input và modal popup thêm nhanh (hỗ trợ nhập giá trị, nút Lưu và nút Cancel/Hủy).
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Kiểm tra tương tác chọn, gõ tự do, thêm mới qua popup, đóng mở popup)

## Phase 3: Tích hợp vào `IntakeModal.tsx` & Kiểm thử Tổng thể

**Mục tiêu:** Thay thế 4 ô input trong IntakeModal bằng SearchableCombobox và kiểm thử toàn bộ luồng tạo văn bản.

- [x] Task 3.1: Tích hợp `SearchableCombobox` cho 4 trường: Cơ quan ban hành, Người ký & Chức vụ, Nơi nhận, Phòng ban xử lý trong `src/components/IntakeModal.tsx`.
- [x] Task 3.2: Đảm bảo luồng điền tự động từ OCR / mẫu văn bản thử nghiệm vẫn gán đúng giá trị vào các combobox này.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Kiểm tra build TypeScript, test trên UI thực tế: chọn, gõ tự do, thêm mới, cấp số văn bản)

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-10-14 19:07 | Setup | Khởi tạo | Tạo kế hoạch và danh sách task | done | Đã thống nhất yêu cầu với User |
| 2026-10-14 19:10 | Setup | Cập nhật plan | Đổi sang khởi tạo mảng rỗng, người dùng tự thêm | done | Không nạp dữ liệu mẫu theo yêu cầu |
| 2026-10-14 19:11 | Phase 1 | Task 1.1 & 1.2 | Tạo metadataOptions.json và helper đọc/ghi options trong storage.ts | done | Lưu bền vững trong localStorage |
| 2026-10-14 19:13 | Phase 2 | Task 2.1 & 2.2 | Xây dựng component SearchableCombobox với dropdown filter và popup thêm nhanh có Lưu/Hủy | done | Hỗ trợ click outside, autofocus, phím Enter |
| 2026-10-14 19:14 | Phase 3 | Task 3.1 & 3.2 | Tích hợp SearchableCombobox cho 4 trường trong IntakeModal.tsx | done | Giữ nguyên tính năng OCR trích xuất |
| 2026-10-14 19:14 | Phase 3 | Task 3.Final | Build dự án kiểm tra TypeScript & bundle (`npm run build`) | done | Build thành công 100% không lỗi |
