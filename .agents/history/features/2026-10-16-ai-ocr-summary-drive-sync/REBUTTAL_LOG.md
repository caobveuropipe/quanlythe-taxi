# Rebuttal Log: AI OCR Đọc Văn Bản, Tự Động Trích Yếu & Đồng Bộ API Key Đa Thiết Bị

## Round 1 - 2026-10-16T14:32:00+07:00

### Tổng kết
- EFR: 4 (accepted: 4, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: Có
- Mode: normal
- Context loaded: 
  - `FEATURE_PLAN.md:32-60, 85-130`
  - `FEATURE_TASKS.md:18-75`
  - `src/components/IntakeModal.tsx:414-419`
  - `server.ts:108-142`
  - `api/ocr-classify.ts:9-27`
  - `src/services/googleDriveService.ts:189-197, 490-521`
  - `src/App.tsx:308-337`

### EFR Đã Chấp Nhận
- **[EFR-01]: Fallback key hệ thống cho phép tài khoản chưa nhập key dùng OCR**
  - Đánh giá: ACCEPTED. Yêu cầu của hệ thống là người dùng tự cung cấp key và cách ly quota cá nhân. Fallback về key server sẽ gây rò rỉ quota và vi phạm nguyên tắc chỉ người có key mới được dùng AI.
  - Sửa: Sửa `FEATURE_PLAN.md` (§2, §5, §6, §7) và `FEATURE_TASKS.md` (Task 2.1, Task 2.2, Task 2.Final). Loại bỏ triệt để fallback về `process.env.GEMINI_API_KEY` trên endpoint OCR. Request thiếu key bắt buộc trả về HTTP 401 rõ ràng.
- **[EFR-02]: Đồng bộ chỉ khi local trống làm key cũ hoặc key đã xóa tiếp tục hoạt động**
  - Đánh giá: ACCEPTED. Khi người dùng sửa hoặc xóa key trên thiết bị A, thiết bị B có cache cũ sẽ bị stale nếu chỉ kéo khi local trống.
  - Sửa: Sửa `FEATURE_PLAN.md` (§2, §5) và `FEATURE_TASKS.md` (Task 1.2, Task 1.Final). Định nghĩa cấu trúc payload trên Drive: `{ apiKey: string; updatedAt: number; isDeleted?: boolean }`. Drive là Source of Truth khi online; so sánh `updatedAt` để giải quyết cập nhật hoặc xóa local cache.
- **[EFR-03]: Email và Drive token chưa được kiểm tra là cùng tài khoản**
  - Đánh giá: ACCEPTED. Tránh trường hợp chuyển tài khoản Google A sang B trên cùng trình duyệt nhưng key bị ghi đè chéo vào `appDataFolder` của nhau.
  - Sửa: Sửa `FEATURE_PLAN.md` (§2, §5, §6, §7) và `FEATURE_TASKS.md` (Task 1.2, Task 1.3, Task 1.Final). Derive email trực tiếp từ session Google OAuth đã xác thực; dọn dẹp in-memory active key khi switch/logout account.
- **[EFR-04]: Nhánh lỗi OCR hiện tự điền dữ liệu giả với confidence 85%**
  - Đánh giá: ACCEPTED. Đoạn code mock demo cũ tại `IntakeModal.tsx:414-419` tự gán title mặc định và `ocrConfidence(85)` khi API lỗi, gây hiểu lầm nghiêm trọng cho người dùng.
  - Sửa: Sửa `FEATURE_PLAN.md` (§2, §5, §6) và `FEATURE_TASKS.md` (Task 3.2, Task 3.Final). Loại bỏ hoàn toàn việc gán title mặc định và confidence giả mạo; hiển thị lỗi trung thực, giữ nguyên các trường đã nhập để người dùng nhập tay.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (Hotspot Scan)
- Không có phát hiện bổ sung.

---

## Round 2 - 2026-10-16T14:38:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: Có
- Mode: normal
- Context loaded:
  - `FEATURE_PLAN.md:32-60, 90-120`
  - `FEATURE_TASKS.md:21-55`
  - `vercel.json:1-13`
  - `api/ocr-classify.ts:1-27`

### EFR Đã Chấp Nhận
- **[EFR-05]: Vercel thiếu endpoint kiểm tra key**
  - Đánh giá: ACCEPTED. Nút "Kiểm tra kết nối" tại `AiKeyModal` gọi tới `/api/verify-gemini-key`. Ở local chạy Express `server.ts` có route này, nhưng trên Vercel Serverless định tuyến theo `api/*.ts`. Nếu thiếu `api/verify-gemini-key.ts`, tính năng kiểm tra key sẽ lỗi 404 khi deploy Vercel.
  - Sửa: Bổ sung file `api/verify-gemini-key.ts` vào `FEATURE_PLAN.md` (§2, §5, §6) và `FEATURE_TASKS.md` (Task 2.2, Task 2.Final).
- **[EFR-06]: Xóa vật lý file Drive không truyền được trạng thái xóa theo updatedAt**
  - Đánh giá: ACCEPTED. Nếu xóa vật lý file trên Drive, file biến mất sẽ làm mất mốc thời gian `updatedAt`, khiến thiết bị B có cache cũ không thể phân biệt được trạng thái "User đã chủ động xóa key trên máy A" với "Lỗi mạng / 404 Drive".
  - Sửa: Quy định cơ chế xóa đồng bộ bắt buộc sử dụng **Tombstone** `{ apiKey: "", updatedAt: Date.now(), isDeleted: true }` lưu vào `config_ai.json` trên Drive; cập nhật `FEATURE_PLAN.md` (§2, §5) và `FEATURE_TASKS.md` (Task 1.2, Task 1.Final).

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (Hotspot Scan)
- Không có phát hiện bổ sung.
