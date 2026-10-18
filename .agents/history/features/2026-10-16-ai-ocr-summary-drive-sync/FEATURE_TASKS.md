# Feature Tasks: AI OCR Đọc Văn Bản, Tự Động Trích Yếu & Đồng Bộ API Key Đa Thiết Bị

> **Trạng thái**: ✅ Hoàn thành  
> **Liên kết plan**: [FEATURE_PLAN.md](./FEATURE_PLAN.md)  
> **Feature slug**: `ai-ocr-summary-drive-sync`  
> **Ngày tạo**: 2026-10-16  

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Core Service Quản Lý & Đồng Bộ AI Key (Drive appDataFolder + LocalStorage)

**Mục tiêu:** Xây dựng tầng dịch vụ lưu trữ và đồng bộ hóa Gemini API Key giữa các thiết bị theo tài khoản Google Email an toàn và nhất quán.

- [x] Task 1.1: Bổ sung các helper function tương tác với Google Drive `appDataFolder` (`readAppDataFile`, `saveAppDataFile`, `deleteAppDataFile`) trong [src/services/googleDriveService.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/services/googleDriveService.ts).
- [x] Task 1.2: <!-- Sửa theo EFR-02, EFR-03 & EFR-06 --> Xây dựng service quản lý [src/services/aiKeyService.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/services/aiKeyService.ts):
  - Định nghĩa payload: `{ apiKey: string; updatedAt: number; isDeleted?: boolean }`.
  - Derive email trực tiếp từ session Google OAuth (`googleDriveConfig.userEmail`), xác thực token thuộc về email trước khi read/write Drive.
  - `getStoredAiKey(email)`: Đọc cache local, nếu online thì đối chiếu `updatedAt` với `appDataFolder` để giải quyết xung đột (Drive là Source of Truth).
  - `saveAiKey(email, apiKey)`: Lưu local và đẩy lên Drive với `updatedAt = Date.now(), isDeleted: false`.
  - <!-- Sửa theo EFR-06 --> `removeAiKey(email)`: Xóa local và ghi nhận **Tombstone** `{ apiKey: "", updatedAt: Date.now(), isDeleted: true }` vào `config_ai.json` trên Drive để máy khác đồng bộ trạng thái xóa chuẩn xác theo `updatedAt`, không xóa vật lý file.
  - `verifyAiKey(apiKey)`: Kiểm tra tính hợp lệ của API Key bằng request ping nhẹ qua endpoint `/api/verify-gemini-key`.
- [x] Task 1.3: <!-- Sửa theo EFR-03 --> Hook đồng bộ khi khởi động app hoặc login Google: Tự động tải/cập nhật key từ `appDataFolder` về `localStorage` dựa trên `updatedAt`. Khi logout hoặc switch account trong [src/App.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/App.tsx), dọn dẹp in-memory active key của session cũ.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Kiểm tra đọc/ghi `appDataFolder`, test kịch bản A xóa key ghi tombstone $\rightarrow$ B đồng bộ xóa cache, test lỗi mạng Drive không bị xóa nhầm local cache, test switch account).

---

## Phase 2: Cập Nhật Backend API & Giao Diện Quản Lý Cài Đặt AI Key

**Mục tiêu:** Cho phép Backend nhận API Key động theo từng request của người dùng, cô lập hạn ngạch 100% và tạo UI quản lý Key trong ứng dụng trên cả 2 runtime (Express & Vercel).

- [x] Task 2.1: <!-- Sửa theo EFR-01 --> Cập nhật [server.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/server.ts) endpoint `/api/ocr-classify` và `/api/health`:
  - Đọc `req.headers['x-gemini-api-key']` (hoặc `req.body.apiKey`).
  - **Bắt buộc dùng key cá nhân người dùng, TUYỆT ĐỐI KHÔNG fallback về `process.env.GEMINI_API_KEY` trên endpoint OCR.** Nếu thiếu key hoặc key rỗng, trả về HTTP 401 với thông báo rõ ràng.
  - Bổ sung endpoint `/api/verify-gemini-key` để kiểm tra nhanh key người dùng nhập có hoạt động không.
- [x] Task 2.2: <!-- Sửa theo EFR-01 & EFR-05 --> Đồng bộ cập nhật cho môi trường Vercel:
  - Cập nhật [api/ocr-classify.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/api/ocr-classify.ts) (bắt buộc key cá nhân, không fallback key hệ thống).
  - <!-- Sửa theo EFR-05 --> Tạo mới [api/verify-gemini-key.ts](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/api/verify-gemini-key.ts) để hỗ trợ endpoint kiểm tra kết nối trên Vercel Serverless.
- [x] Task 2.3: Tạo component [src/components/AiKeyModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/AiKeyModal.tsx):
  - Form nhập API Key có nút ẩn/hiện, nút Paste nhanh.
  - Nút "Kiểm tra kết nối" (Ping test).
  - Hướng dẫn lấy key miễn phí trong 30 giây từ Google AI Studio (kèm link mở tab mới).
  - Trạng thái đã lưu, nút "Xóa key".
- [x] Task 2.4: Tích hợp nút mở "⚙️ Cài đặt Gemini AI Key" vào menu thông tin tài khoản tại [src/components/Navbar.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/Navbar.tsx) kèm badge trạng thái (Đã kích hoạt AI / Chưa cài đặt).
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Test request thiếu key trả về 401 kể cả khi server có env key, test endpoint `/api/verify-gemini-key` trên cả Express và Vercel handler, test lưu key qua modal, kiểm tra dynamic key).

---

## Phase 3: Tích Hợp Nút "Quét AI & Trích Yếu" Vào IntakeModal & Tự Động Điền Form

**Mục tiêu:** Hoàn thiện luồng trải nghiệm người dùng: tải tài liệu $\rightarrow$ quét AI $\rightarrow$ tự động điền trích yếu và các trường văn bản, xử lý lỗi trung thực.

- [x] Task 3.1: Cập nhật giao diện tab Tải tệp & Chụp ảnh trong [src/components/IntakeModal.tsx](file:///d:/Project_VCC/HC-ADM-CapSoVanBan/src/components/IntakeModal.tsx):
  - Bổ sung nút nổi bật **"✨ Quét AI & Tự động trích yếu"** ngay cạnh danh sách trang ảnh/tài liệu.
  - Xử lý trạng thái: Nếu người dùng chưa cấu hình key $\rightarrow$ bấm nút sẽ tự động mở `AiKeyModal` và sau khi lưu xong sẽ tiếp tục quét.
- [x] Task 3.2: <!-- Sửa theo EFR-04 --> Hoàn thiện logic gọi hàm `triggerOcrAnalysis`:
  - Truyền `x-gemini-api-key` lấy từ `aiKeyService` vào request.
  - Xử lý hiệu ứng loading đẹp mắt, hiển thị thanh tiến trình / thông báo đang đọc văn bản.
  - **Loại bỏ triệt để nhánh catch tự gán title mặc định và `ocrConfidence(85)` giả mạo.** Khi gặp lỗi (401/400/500/mạng), giữ nguyên form cho người dùng nhập tay, hiển thị `setOcrError` rõ ràng, đặt `ocrConfidence(null)`.
- [x] Task 3.3: Tự động trích xuất và điền vào các trường form:
  - `title`: Trích yếu văn bản (chuẩn thể thức Nghị định 30).
  - `summary`: Tóm tắt nội dung chính (2-4 câu).
  - `documentDate`: Ngày ban hành văn bản.
  - `issuingAuthority`: Cơ quan ban hành.
  - `signer`: Người ký và chức vụ.
  - `urgency` & `secrecy`: Mức độ khẩn và mật.
  - Khớp và chọn danh mục văn bản phù hợp (`categoryCode`).
- [x] Task 3.4: Đảm bảo kiểm thử hồi quy: Người dùng KHÔNG nhập API Key vẫn có thể cấp số văn bản thủ công, chụp ảnh, tải tệp, upload Google Drive hoàn toàn bình thường không lỗi.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (End-to-End Test: Tải file scan mẫu $\rightarrow$ Quét AI $\rightarrow$ Xem kết quả tự động điền $\rightarrow$ Cấp số thành công vào sổ lưu trữ; test kịch bản API lỗi không sinh dữ liệu giả).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-10-16 | Init | Setup | Khởi tạo FEATURE_PLAN.md và FEATURE_TASKS.md | done | Chờ User duyệt và review gate |
| 2026-10-16 | Phase 1 | 1.1 - 1.Final | Xây dựng googleDriveService appDataFolder & aiKeyService tombstone sync | done | Unit test pass 100% |
| 2026-10-16 | Phase 2 | 2.1 - 2.Final | Backend Express & Vercel dynamic key 401, endpoint verify, UI AiKeyModal & Navbar | done | Unit test handler pass 100% |
| 2026-10-16 | Phase 3 | 3.1 - 3.Final | Tích hợp nút quét AI IntakeModal, auto-fill form, loại bỏ fake confidence, verification | done | Pass typecheck & build |

