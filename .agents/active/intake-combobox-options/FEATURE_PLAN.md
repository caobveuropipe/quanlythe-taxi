# Feature Plan: Custom Searchable Combobox & Popup Thêm Nhanh Cho Dữ Liệu Biểu Mẫu Tiếp Nhận

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: User đã phê duyệt kế hoạch và yêu cầu triển khai toàn bộ các phase
> **Feature slug**: intake-combobox-options
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-10-14

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại trong modal tiếp nhận văn bản ([IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx)), 4 trường thông tin: *Cơ quan / Đơn vị ban hành*, *Người ký & Chức vụ*, *Nơi nhận*, và *Phòng ban xử lý* đang là các ô `<input type="text">` thông thường. Người dùng phải gõ thủ công toàn bộ mỗi lần cấp số/tiếp nhận.
- **Vấn đề cần giải quyết:** Cần hỗ trợ danh sách gợi ý sẵn các mẫu thường dùng để thao tác nhanh và chuẩn hóa dữ liệu, đồng thời vẫn cho phép nhập giá trị tự do nếu có trường hợp mới. Ngoài ra, cần có nút `+` cạnh mỗi input để khi cần, người dùng có thể mở popup thêm nhanh mục mẫu mới và lưu lại dùng cho các lần sau.
- **Mục tiêu:**
  1. Xây dựng component `SearchableCombobox` hỗ trợ: tìm kiếm, chọn từ danh mục đã lưu, gõ tự do, có nút `+` mở popup thêm nhanh.
  2. Tạo file JSON khởi tạo cấu trúc rỗng (`src/data/metadataOptions.json`), không nạp dữ liệu mẫu có sẵn để người dùng hoàn toàn chủ động tự thêm.
  3. Quản lý lưu trữ bền vững (qua `localStorage` và `storage.ts`) để các mục người dùng tự thêm qua nút `+` được lưu lại, không bị mất khi tải lại trang.
  4. Thay thế 4 ô input trong [IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx) bằng `SearchableCombobox`.
- **Kết quả mong đợi:** 4 trường thông tin trong modal tiếp nhận hoạt động trơn tru, người dùng tự thêm các mục của đơn vị mình qua nút `+`, danh sách tự lưu lại, vừa chọn nhanh vừa gõ tự do.

## 2. Phạm vi

### In scope
- Tạo file cấu hình khởi tạo rỗng `src/data/metadataOptions.json` cho 4 trường (mảng rỗng ban đầu `[]`):
  - `issuingAuthorities`: Danh sách cơ quan / đơn vị ban hành
  - `signers`: Danh sách người ký & chức vụ
  - `recipients`: Danh sách nơi nhận
  - `departments`: Danh sách phòng ban xử lý
- Cập nhật [storage.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/services/storage.ts) để quản lý danh sách tùy chọn do người dùng tự thêm vào `localStorage`.
- Tạo component `SearchableCombobox`:
  - Input hiển thị giá trị hiện tại, cho phép gõ tự do.
  - Dropdown hiển thị danh sách options người dùng đã thêm, có filter theo từ khóa khi người dùng gõ.
  - Nút bấm `+` kế bên input để kích hoạt popup thêm mới.
  - Popup/Modal thêm mới nhỏ gọn có trường nhập, nút "Lưu" và nút "Hủy".
  - Khi bấm "Lưu": thêm vào danh mục lưu trữ và tự động chọn giá trị vừa thêm vào input.
- Tích hợp vào [IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx) cho cả 4 trường.

### Out of scope
- Chưa tạo màn hình Quản trị chuyên sâu (Settings Admin Table) để xóa/sửa danh mục (có thể bổ sung ở giai đoạn tiếp theo nếu cần).
- Chưa can thiệp vào các form khác ngoài IntakeModal (như DocumentDetailModal, PrintModal vẫn giữ nguyên hiển thị).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - Kế thừa cơ chế client-side storage bằng `localStorage` đã chốt trong `KNOWLEDGE_BASE.md`, đảm bảo chạy mượt mà độc lập, không phụ thuộc kết nối mạng hay cấu hình database phức tạp.
  - Tuân thủ thiết kế giao diện hiện tại của dự án: Tailwind CSS, Lucide icons, bo góc tròn (`rounded-xl`), màu chủ đạo xanh dương (`blue-600`), font rõ ràng, UX thân thiện.
- **"Cấm kỵ" cần tránh:**
  - Không ép cứng người dùng chỉ được chọn trong danh sách cố định (luôn giữ khả năng gõ tự do `onChange`).
  - Không làm mất khả năng tự động điền khi scan tài liệu bằng OCR/Gemini vào các ô này.

## 4. Giả định và câu hỏi mở

### Giả định
- Dữ liệu thêm mới qua nút `+` được lưu vào `localStorage` của trình duyệt (key: `doc_metadata_options_v1`), đồng thời tự động merge với file JSON tĩnh ban đầu.
- Khi người dùng thêm mới mục từ popup, mục đó sẽ lập tức được set làm giá trị hiện tại của trường đó trong form.
- Với trường Phòng ban xử lý (`departmentCode`), cho phép nhập mã viết tắt (ví dụ `VP`, `HCNS`, `TCKT`) kèm tên hiển thị nếu muốn.

### Câu hỏi mở
- [Non-blocking] Khi mở popup thêm mới cho "Người ký & Chức vụ", người dùng có muốn tách thành 2 ô (Họ tên + Chức vụ) rồi tự ghép lại thành dạng `"Nguyễn Văn A - Tổng Giám đốc"` không, hay chỉ cần 1 ô nhập tự do chuỗi `"Tên - Chức vụ"`? *(Tạm thời để 1 ô nhập linh hoạt kèm placeholder gợi ý).*

## 5. Acceptance Criteria

- [ ] File `src/data/metadataOptions.json` chứa cấu trúc khởi tạo rỗng (`[]`) cho 4 nhóm trường.
- [ ] Hàm lấy và lưu options trong [storage.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/services/storage.ts) hoạt động tin cậy, lưu trữ và đọc danh sách người dùng tự thêm từ `localStorage`.
- [ ] Component `SearchableCombobox` hiển thị đẹp, có icon dropdown, tìm kiếm mượt mà, gõ tự do không bị chặn hay mất focus.
- [ ] Bấm nút `+` hiển thị popup thêm mới có nút Lưu/Hủy. Bấm Lưu lưu thành công và tự gán giá trị mới vào input. Bấm Hủy hoặc click ra ngoài thì đóng popup mà không đổi dữ liệu.
- [ ] Cả 4 trường trong [IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx) hoạt động trơn tru, không làm ảnh hưởng đến chức năng tiếp nhận/cấp số văn bản hiện có.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/data/metadataOptions.json` | Tạo | Lưu trữ danh sách giá trị mặc định cho 4 trường | 🟢 Thấp | Chưa |
| `src/services/storage.ts` | Sửa | Thêm hàm đọc/ghi options kết hợp JSON + localStorage | 🟢 Thấp | Chưa |
| `src/components/SearchableCombobox.tsx` | Tạo | Component combobox tìm kiếm + popup thêm nhanh có Lưu/Hủy | 🟢 Thấp | Có |
| `src/components/IntakeModal.tsx` | Sửa | Thay 4 input text bằng SearchableCombobox | 🟡 Trung bình | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Khuyến nghị User duyệt trước khi thực thi
- **Risk hotspots:**
  - Xử lý click outside để đóng dropdown/popup mà không xung đột với modal tiếp nhận văn bản.
  - Đảm bảo khi chức năng OCR trích xuất dữ liệu tự động, giá trị OCR vẫn được điền chính xác vào `SearchableCombobox`.
- **Review focus areas:** Trải nghiệm gõ phím tiếng Việt (Telex/VNI) trong ô input không bị lag hoặc mất chữ khi dropdown gợi ý lọc theo thời gian thực.
- **Dependencies / rollout concerns:** Hoàn toàn là client-side component, không yêu cầu thay đổi schema database hay backend API.

## 8. Chiến lược triển khai

- **Phase 1: Chuẩn bị dữ liệu và Service lưu trữ**
  - Tạo file `src/data/metadataOptions.json` với dữ liệu mẫu chuẩn.
  - Bổ sung helper functions trong `src/services/storage.ts` để đọc/ghi options.
- **Phase 2: Xây dựng Component `SearchableCombobox` kèm Popup Thêm Mới**
  - Tạo component với giao diện Tailwind hiện đại, hỗ trợ click dropdown, lọc danh sách, gõ tự do.
  - Tích hợp nút `+` và modal/popup thêm nhanh với nút Lưu và Hủy (Cancel).
- **Phase 3: Tích hợp vào `IntakeModal.tsx` và Kiểm thử**
  - Thay thế 4 ô input trong [IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx).
  - Kiểm thử đầy đủ các thao tác: chọn mẫu, gõ mới, thêm qua nút `+`, lưu văn bản và tải lại trang.

## 9. Test Strategy

- **Automated tests / Type check:** Chạy `npm run build` hoặc `tsc --noEmit` để đảm bảo không lỗi kiểu dữ liệu TypeScript.
- **Manual verification:**
  - Kiểm tra giao diện hiển thị sắc nét, nút `+` đặt gọn gàng cạnh input.
  - Kiểm tra dropdown tìm kiếm phản hồi nhanh, chọn xong cập nhật giá trị.
  - Bấm nút `+` -> Nhập dữ liệu mới -> Bấm Lưu -> Kiểm tra danh sách có mục mới và input nhận giá trị mới.
  - Bấm nút `+` -> Bấm Hủy -> Popup đóng, dữ liệu không đổi.
  - Refresh (F5) trang -> Mục vừa thêm vẫn còn trong danh sách.
  - Nhập văn bản đầy đủ và bấm "Cấp số ngay" -> Văn bản được lưu chuẩn xác.

## 10. Rollback Plan

- Nếu có sự cố ngoài ý muốn, phục hồi lại các ô `<input>` ban đầu trong `IntakeModal.tsx` qua git checkout.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`
