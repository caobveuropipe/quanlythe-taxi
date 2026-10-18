# Feature Plan: AI OCR Đọc Văn Bản, Tự Động Trích Yếu & Đồng Bộ API Key Đa Thiết Bị

> **Trạng thái**: ✅ ĐỒNG Ý (Đã qua Expert Review & Rebuttal Round 2)  
> **Review gate**: ✅ Đã hội tụ hoàn toàn với Codex Expert Review (6/6 EFR Accepted & Fixed)  
> **Feature slug**: `ai-ocr-summary-drive-sync`  
> **Tạo bởi**: feature-plan  
> **Ngày tạo**: 2026-10-16  

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:**
  - Hệ thống Quản lý & Cấp số Văn bản hiện tại đã có sẵn bộ khung API `/api/ocr-classify` (dùng thư viện `@google/genai` với prompt chuẩn văn thư Nghị định 30/2020/NĐ-CP) và hàm `triggerOcrAnalysis` trong `IntakeModal.tsx`, nhưng chưa được gắn vào giao diện tiếp nhận văn bản.
  - Dự án phục vụ nhiều người dùng khác nhau trong doanh nghiệp. Mỗi người dùng có thể tự đăng ký Google Gemini API Key miễn phí từ Google AI Studio để không chia sẻ hay làm cạn kiệt hạn ngạch (quota rate-limit) của nhau.
- **Vấn đề cần giải quyết:**
  1. Thiếu nút kích hoạt và luồng trải nghiệm quét OCR tự động điền form trích yếu trong `IntakeModal.tsx`.
  2. Cần cơ chế lưu trữ API Key gắn chặt với từng tài khoản Google (`userEmail`), nhập 1 lần duy nhất và **tự động đồng bộ giữa các thiết bị** (máy tính cơ quan, laptop ở nhà, điện thoại) mà không cần nhập lại.
  3. Đảm bảo tính riêng tư tuyệt đối: Key của ai chỉ người đó dùng, không lưu vào file dữ liệu sổ chung của công ty.
  4. Người không có/chưa nhập API Key vẫn phải sử dụng 100% các chức năng cấp số, nhập liệu, xem sổ bình thường.
- **Mục tiêu:**
  - Hoàn thiện tính năng **"✨ Quét AI & Tự động trích yếu"** một chạm khi tải ảnh/scan văn bản.
  - Xây dựng cơ chế đồng bộ Key qua **Google Drive `appDataFolder`** kết hợp `localStorage` theo namespace email.
  - Cho phép quản lý (xem, sửa, kiểm tra kết nối, xóa) API Key trong menu người dùng.
- **Kết quả mong đợi:**
  - Tải tài liệu lên $\rightarrow$ bấm Quét AI $\rightarrow$ hệ thống tự điền Trích yếu, Tóm tắt, Ngày ban hành, Cơ quan ban hành, Người ký...
  - Nhập Key trên máy tính A $\rightarrow$ đăng nhập trên máy tính B tự động có sẵn Key.
  - Người dùng không có Key không bị lỗi, có popup hướng dẫn nhẹ nhàng nếu muốn dùng thử.

---

## 2. Phạm vi

### In scope
<!-- Sửa theo EFR-02, EFR-03 & EFR-06: Đồng bộ trạng thái có versioning/updatedAt, derive email từ Google OAuth profile đã xác minh, và dùng Tombstone có updatedAt cho thao tác xóa -->
1. **Service quản lý AI Key (`src/services/aiKeyService.ts`)**:
   - Đọc/ghi Key vào `localStorage` theo namespace: `gemini_key_${userEmail}`.
   - Quản lý payload cấu hình chuẩn: `{ apiKey: string, updatedAt: number, isDeleted?: boolean }`.
   - Đọc/ghi đồng bộ file `config_ai.json` trong phân vùng riêng tư `appDataFolder` của Google Drive; xử lý xung đột dựa trên `updatedAt` (Drive là Source of Truth khi online).
   - <!-- Sửa theo EFR-06 --> Khi xóa key, ghi nhận **Tombstone** `{ apiKey: "", updatedAt: Date.now(), isDeleted: true }` lên Drive thay vì xóa vật lý file, giúp bảo toàn mốc thời gian `updatedAt` để các thiết bị khác đồng bộ xóa chính xác và phân biệt rõ với lỗi kết nối Drive.
   - Derive `userEmail` trực tiếp từ phiên xác thực Google Drive đã kiểm chứng; dọn dẹp in-memory key khi chuyển đổi hoặc đăng xuất tài khoản.
   - Hàm kiểm tra tính hợp lệ của API Key (ping test nhanh).
2. **Google Drive Integration mở rộng (`src/services/googleDriveService.ts`)**:
   - Bổ sung helper functions: `readAppDataFile(accessToken, filename)` và `saveAppDataFile(accessToken, filename, data)` tương tác với `appDataFolder`.
3. **UI Cài đặt AI Key (`src/components/AiKeyModal.tsx` & `src/components/Navbar.tsx`)**:
   - Thêm nút/menu "⚙️ Cài đặt Gemini AI Key" tại menu thông tin người dùng trong Navbar.
   - Modal nhập key, hiển thị dạng masked (`AIzaSy...****`), nút test kết nối, hướng dẫn lấy key miễn phí trong 30 giây.
<!-- Sửa theo EFR-04: Xóa bỏ dữ liệu giả & confidence giả trong nhánh catch của IntakeModal -->
4. **Tích hợp OCR & Auto-fill trong `src/components/IntakeModal.tsx`**:
   - Nút bấm trực quan "✨ Quét AI & Tự động trích yếu" tại tab Tải tệp và Chụp ảnh.
   - Xử lý mở nhanh Modal nhập key nếu người dùng bấm nút mà chưa cấu hình key.
   - Tự động điền: `title` (Trích yếu), `summary` (Tóm tắt), `documentDate`, `issuingAuthority`, `signer`, `urgency`, `secrecy`, gợi ý `categoryCode`.
   - Xóa bỏ triệt để đoạn catch tự gán title mặc định và `ocrConfidence(85)` giả tạo khi API lỗi; chỉ hiển thị lỗi trung thực và giữ form cho người dùng nhập tay.
<!-- Sửa theo EFR-01 & EFR-05: Bỏ fallback key hệ thống cho OCR endpoint; bổ sung endpoint verify key cho cả Express và Vercel -->
5. **Backend API (`server.ts`, `api/ocr-classify.ts` & `api/verify-gemini-key.ts`)**:
   - Bắt buộc nhận API Key cá nhân từ request header `x-gemini-api-key`.
   - **Tuyệt đối KHÔNG fallback về `process.env.GEMINI_API_KEY` trên endpoint OCR**, trả về lỗi HTTP 401 rõ ràng nếu request thiếu key hoặc key không hợp lệ, đảm bảo cách ly quota người dùng 100%.
   - <!-- Sửa theo EFR-05 --> Bổ sung endpoint `/api/verify-gemini-key` trên cả hai runtime: Express (`server.ts`) và Vercel Serverless (`api/verify-gemini-key.ts`) để nút kiểm tra kết nối hoạt động nhất quán.

### Out of scope
- Hệ thống OCR On-premise tự host bằng Python (PaddleOCR/VietOCR) chạy offline độc lập.
- Quản trị hạn ngạch tính phí tập trung (người dùng tự sở hữu quota miễn phí của Google AI Studio).

---

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - *2026-09-17 Gemini Flash với responseSchema JSON có cấu trúc:* Kế thừa toàn bộ schema trích xuất văn thư chuẩn Nghị định 30/2020/NĐ-CP đang có sẵn trong `server.ts` và `api/ocr-classify.ts`.
  - *2026-09-17 Single-Process Dev Server (Express + Vite) & Vercel deployment:* Giữ nguyên cấu trúc dual-target, cập nhật cả `server.ts` và `api/ocr-classify.ts`.
  - *2026-09-17 Client-side & Google Drive Sync:* Tận dụng hạ tầng Google OAuth hiện có để lưu trữ cấu hình cá nhân.
- **"Cấm kỵ" cần tránh:**
  - **TUYỆT ĐỐI KHÔNG** lưu API Key cá nhân vào file cơ sở dữ liệu chung `vcc_documents_database.json` trên Google Drive (tránh lộ key giữa các đồng nghiệp trong công ty).
  - **KHÔNG** chặn hay bắt buộc người dùng phải có API Key mới được cấp số hay sử dụng ứng dụng.
- **Ràng buộc kiến trúc:**
  - Phân vùng `appDataFolder` là vùng lưu trữ cá nhân ẩn của Google Drive API, chỉ truy cập được qua token của chính user đó.

---

## 4. Giả định và câu hỏi mở

### Giả định
- Scope quyền OAuth hiện tại (`https://www.googleapis.com/auth/drive`) đã bao gồm quyền truy cập `appDataFolder`.
- Người dùng sử dụng các định dạng ảnh phổ biến (`image/jpeg`, `image/png`, `image/webp`) và PDF scan cơ bản.
- Trình duyệt bật tính năng `localStorage` bình thường.

### Câu hỏi mở
- *[Non-blocking]* Có cần mã hóa AES cục bộ chuỗi API Key trước khi lưu vào `appDataFolder`/`localStorage` không? (Đề xuất: Mã hóa Base64/XOR đơn giản để tránh plain-text mắt thường, vì `appDataFolder` vốn đã được bảo vệ bởi phiên đăng nhập Google của người dùng).

---

## 5. Acceptance Criteria

- [ ] Người dùng chưa có API Key vẫn sử dụng 100% chức năng cấp số, xem sổ, upload file bình thường.
- [ ] Khi bấm "✨ Quét AI & Tự động trích yếu" mà chưa có Key: Hệ thống mở popup hướng dẫn nhập Gemini Key kèm link lấy key miễn phí; không bị crash hay đơ web.
- [ ] <!-- Sửa theo EFR-01 --> Khi gọi `/api/ocr-classify` mà request thiếu header `x-gemini-api-key`: Backend trả về lỗi HTTP 401 rõ ràng, KHÔNG tự ý dùng quota của key hệ thống (`process.env.GEMINI_API_KEY`).
- [ ] <!-- Sửa theo EFR-04 --> Khi OCR thất bại (lỗi 401/400/500/mạng): Form giữ nguyên các trường đã nhập để người dùng gõ tay, hiển thị thông báo lỗi rõ ràng, KHÔNG tự điền trích yếu mặc định và KHÔNG hiển thị confidence 85% giả mạo.
- [ ] <!-- Sửa theo EFR-02 & EFR-06 --> Sau khi nhập và lưu Key: Key được lưu vào `localStorage` và tự động đẩy lên `appDataFolder` của Google Drive với timestamp `updatedAt`.
- [ ] <!-- Sửa theo EFR-06 --> Khi xóa Key trên thiết bị A: Ghi nhận Tombstone `{ apiKey: "", updatedAt, isDeleted: true }` trên Drive; thiết bị B đã cache key khi đồng bộ sẽ đối chiếu `updatedAt` và tự động xóa cache local, đồng thời lỗi đọc Drive (404/500/mạng) không bị hiểu nhầm thành lệnh xóa.
- [ ] <!-- Sửa theo EFR-03 --> Khi chuyển đổi tài khoản Google (A sang B) trên cùng trình duyệt: Hệ thống dọn dẹp active key của A, chỉ load key thuộc đúng tài khoản B, tránh ghi đè chéo vào `appDataFolder` của nhau.
- [ ] <!-- Sửa theo EFR-05 --> Endpoint `/api/verify-gemini-key` hoạt động đồng nhất trên cả 2 runtime (Express local và Vercel serverless), cho phép kiểm tra tính hợp lệ của key ngay trên giao diện.
- [ ] Khi tải ảnh văn bản lên và bấm Quét AI: Hệ thống tự động nhận diện chữ, tóm tắt và điền chính xác vào các ô Trích yếu, Tóm tắt, Ngày ban hành, Cơ quan ban hành, Người ký.
- [ ] Menu Navbar có mục xem lại Key (dạng masked `AIzaSy...****`), có nút "Kiểm tra kết nối" và nút "Xóa key".

---

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/services/aiKeyService.ts` | Tạo mới | Quản lý vòng đời API Key (local + Drive appDataFolder sync, timestamp, tombstone, account isolation) | 🟢 Thấp | Có |
| `src/services/googleDriveService.ts` | Sửa | Thêm hàm đọc/ghi `appDataFolder` | 🟡 Trung bình | Có |
| `src/components/AiKeyModal.tsx` | Tạo mới | Modal giao diện nhập/sửa/test API Key | 🟢 Thấp | Có |
| `src/components/Navbar.tsx` | Sửa | Thêm mục mở modal AI Key trong profile menu | 🟢 Thấp | Có |
| `src/components/IntakeModal.tsx` | Sửa | Gắn nút Quét AI, auto-fill form, loại bỏ fallback dữ liệu/confidence giả khi OCR lỗi | 🟡 Trung bình | Có |
| `server.ts` | Sửa | Bắt buộc nhận dynamic key qua `x-gemini-api-key`, bỏ fallback key hệ thống trên OCR route, thêm route verify | 🟡 Trung bình | Có |
| `api/ocr-classify.ts` | Sửa | Đồng bộ logic nhận dynamic key cho môi trường Vercel, bỏ fallback key hệ thống | 🟡 Trung bình | Có |
| `api/verify-gemini-key.ts` | Tạo mới | Endpoint xác thực key trên Vercel Serverless (khắc phục EFR-05) | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Reset in-memory key state khi logout hoặc switch Google account | 🟢 Thấp | Có |

---

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:**
  1. *Quyền Google Drive `appDataFolder`:* Đảm bảo truy vấn đúng endpoint `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder` mà không ảnh hưởng đến thư mục dữ liệu chung `[VCC] Sổ Văn Bản Điện Tử`.
  2. *Bảo mật API Key:* Đảm bảo API Key chỉ truyền qua HTTPS header và không bị log plain-text trong console/server logs.
  3. *Trải nghiệm Non-blocking:* Đảm bảo khi mất mạng hoặc Google Drive token hết hạn, tính năng cấp số thủ công vẫn hoạt động mượt mà.
  4. <!-- Sửa theo EFR-03 --> *Cách ly tài khoản:* Đảm bảo token và email luôn khớp nhau trước khi ghi `appDataFolder`, dọn sạch cache khi switch account.
- **Review focus areas:**
  - Quy trình đồng bộ 2 chiều (Bidirectional sync) giữa `localStorage` và `appDataFolder` giải quyết xung đột dựa trên `updatedAt`.
  - Loại bỏ hoàn toàn fallback key hệ thống cho OCR endpoint để bảo đảm cách ly quota.

---

## 8. Chiến lược triển khai

- **Phase strategy:** 3 Phases
  - **Phase 1:** Core Service & Google Drive `appDataFolder` Sync (Tầng dữ liệu).
  - **Phase 2:** Backend Support & UI Quản lý Key (Tầng giao diện quản trị & API).
  - **Phase 3:** Tích hợp nút "Quét AI & Trích yếu" trong IntakeModal & Auto-fill hoàn chỉnh (Tầng trải nghiệm người dùng).
- **Thứ tự triển khai:**
  - Viết `googleDriveService` helper $\rightarrow$ Viết `aiKeyService` $\rightarrow$ Cập nhật `server.ts` & `api/ocr-classify.ts` $\rightarrow$ Tạo `AiKeyModal` & tích hợp Navbar $\rightarrow$ Tích hợp `IntakeModal`.

---

## 9. Test Strategy

- **Automated / Script verification:**
  - Test kiểm tra `readAppDataFile` / `saveAppDataFile` với token giả lập hoặc token thật.
  - Test ping API Gemini với key hợp lệ và key không hợp lệ.
- **Manual verification checklist:**
  1. Chưa có key: Mở IntakeModal, tải ảnh, bấm Quét AI $\rightarrow$ hiện modal yêu cầu nhập key.
  2. Nhập key hợp lệ $\rightarrow$ bấm Test kết nối báo thành công $\rightarrow$ lưu key.
  3. Bấm Quét AI lại $\rightarrow$ form tự động điền Trích yếu và tóm tắt.
  4. Mở tab ẩn danh hoặc trình duyệt khác, đăng nhập cùng tài khoản Google $\rightarrow$ kiểm tra key tự động xuất hiện.
  5. Thử nghiệm cấp số văn bản bình thường không dùng AI $\rightarrow$ kiểm tra toàn bộ luồng cấp số cũ không bị lỗi.

---

## 10. Rollback Plan

- Nếu có lỗi liên quan đến `appDataFolder`: Hệ thống tự động fallback về `localStorage` thuần túy để người dùng vẫn dùng được trên thiết bị hiện tại mà không bị gián đoạn.
- Mọi thay đổi không chạm vào cấu trúc database chung `vcc_documents_database.json`, nên hoàn toàn an toàn cho dữ liệu văn bản hiện có của công ty.

---

## 11. Tham chiếu thực thi

- Checklist chi tiết: [FEATURE_TASKS.md](./FEATURE_TASKS.md)
