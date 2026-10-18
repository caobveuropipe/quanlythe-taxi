---
description: Kiến trúc tổng thể của dự án HC-ADM-CapSoVanBan (Hệ thống Cấp số & Quản lý Văn bản Hành chính)
last_updated: 2026-09-17
---

# HC-ADM-CapSoVanBan - Architecture Master

## 1. Tổng quan kiến trúc

```
 +-----------------------------------------------------------------------------------+
 |                             CLIENT TẦNG TRÌNH DIỄN                                |
 |                                                                                   |
 |  [React 19 + Vite + Tailwind CSS v4 + Motion]                                      |
 |                                                                                   |
 |  +--------------------+  +----------------------+  +---------------------------+  |
 |  |    DashboardStats  |  | DocumentArchiveView  |  |    CategoryConfigModal    |  |
 |  +--------------------+  +----------------------+  +---------------------------+  |
 |                                      ^                                            |
 |                                      |                                            |
 |                         +-------------------------+                               |
 |                         |       IntakeModal       |                               |
 |                         | (Upload/Camera/Email)   |                               |
 |                         +-------------------------+                               |
 |                               |           |                                       |
 |                               v           v                                       |
 |              +--------------------+   +-------------------------------------+     |
 |              |  storage.ts (CRUD) |   | numberGenerator.ts                  |     |
 |              |  (localStorage)    |   | (Sinh số tự động theo quy tắc NĐ30) |     |
 |              +--------------------+   +-------------------------------------+     |
 +-------------------------------|---------------------------------------------------+
                                 | HTTP POST (Base64 / Multipart / JSON)
                                 v
 +-----------------------------------------------------------------------------------+
 |                             BACKEND & AI GATEWAY                                  |
 |                                                                                   |
 |  [Node.js + Express Server (server.ts) - Port 3000]                               |
 |                                                                                   |
 |  +----------------------------------+  +---------------------------------------+  |
 |  | POST /api/ocr-classify           |  | POST /api/parse-email                 |  |
 |  | - Nhận ảnh scan / chụp camera     |  | - Nhận raw text email & attachment    |  |
 |  | - System Prompt thể thức NĐ 30   |  | - Ưu tiên trích xuất file đính kèm    |  |
 |  +----------------------------------+  +---------------------------------------+  |
 |                                      \     /                                      |
 |                                       v   v                                       |
 |                       +-----------------------------------+                       |
 |                       | Google GenAI SDK (@google/genai)  |                       |
 |                       | Model: gemini-3.7-flash           |                       |
 |                       | Output Schema: Strict JSON Format |                       |
 |                       +-----------------------------------+                       |
 +-----------------------------------------|-----------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       | Google Gemini Multimodal Cloud API    |
                       +---------------------------------------+
```

---

## 2. Các luồng xử lý cốt lõi (Core Data Flows)

### 2.1 Luồng Tiếp nhận & Cấp số Văn bản (Intake & Numbering)
1. **Thu thập đầu vào**: Người dùng chọn 1 trong 4 nguồn qua `IntakeModal.tsx`:
   - Tải file ảnh / tài liệu scan (`UPLOAD`)
   - Chụp trực tiếp từ camera thiết bị (`CAMERA`)
   - Dán nội dung email hoặc tệp đính kèm (`EMAIL`)
   - Nhập thông tin thủ công (`MANUAL`)
2. **Trích xuất thông minh (AI Inference)**: 
   - Với nguồn ảnh/scan/camera: Gửi Base64 tới `/api/ocr-classify`.
   - Với nguồn email: Gửi payload tới `/api/parse-email`.
   - Backend sử dụng Gemini 3.7 Flash trích xuất toàn văn OCR, nhận diện loại văn bản (QĐ, CV, TTr, HĐ, ...), trích yếu, người ký, ngày ban hành và độ tin cậy.
3. **Đề xuất & Cấp số tự động**:
   - `numberGenerator.ts` đọc cấu hình danh mục (`prefix`, `suffix`, `paddingDigits`, `formatTemplate`) để sinh số thứ tự tiếp theo.
   - Người dùng xác nhận hoặc điều chỉnh thông tin trên form tiếp nhận.
4. **Lưu trữ & Thống kê**:
   - Lưu trữ bản ghi vào `storage.ts` (`DocumentRecord`).
   - Cập nhật số đếm của danh mục (`currentCount += 1`).
   - Ghi nhận nhật ký lịch sử hành động (`HistoryItem`).

---

## 3. Tech Stack & Boundaries

| Thành phần | Công nghệ | Trách nhiệm |
|------------|-----------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React | Giao diện quản trị, tiếp nhận đa nguồn, sổ văn bản, in ấn nhãn/phiếu |
| Backend API | Express 4, TypeScript (`tsx`), `dotenv` | Proxy xử lý request AI, bảo vệ API key phía server, cấu hình Vite middleware |
| AI Processing | Google Gemini 3.7 Flash (`@google/genai`) | OCR đa ngôn ngữ, phân tích ngữ nghĩa, phân loại thể thức NĐ 30/2020/NĐ-CP |
| Client Storage | `localStorage` (Service `storage.ts`) | Lưu trữ trạng thái ứng dụng, danh mục cấu hình, dữ liệu văn bản offline |

---

## 4. Deployment & Vận hành

| Môi trường | Dịch vụ | Khởi chạy | Ghi chú |
|------------|---------|-----------|---------|
| DEV | Express + Vite Middleware | `npm run dev` | Tích hợp HMR và API trên cùng port `http://localhost:3000` |
| BUILD | Vite + esbuild | `npm run build` | Tạo thư mục tĩnh `dist/` và bundle backend `dist/server.cjs` |
| PRODUCTION | Node.js Runtime | `npm run start` | Chạy `dist/server.cjs` phục vụ cả API và static frontend bundle |

---

*Xem [.agents/CONTEXT.md](../CONTEXT.md) để tra cứu bản đồ điều hướng dự án.*
