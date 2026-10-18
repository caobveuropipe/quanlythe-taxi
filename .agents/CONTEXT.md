# Quản Lý Thẻ Taxi Nội Bộ - Context for AI Assistants

---

## 1. Project Overview

- **Tên dự án**: Hệ thống Quản Lý & Điều Phối Thẻ Taxi Nội Bộ (VCC Taxi Card Management)
- **Mục tiêu**: Quản lý vòng đời mượn - giữ - trả thẻ taxi vật lý nội bộ doanh nghiệp thông qua nền tảng Telegram Mini App kết hợp Admin Dashboard.
- **Trạng thái**: Hoàn thiện toàn bộ các tính năng cốt lõi và 4 tính năng vận hành nâng cao:
  1. Đăng ký mượn thẻ, chọn lịch đi dự kiến và ưu tiên Waitlist tự động.
  2. Leader duyệt mượn thẻ trực tiếp qua Telegram bot hoặc giao diện app, hỗ trợ Hoàn tác trong 90 phút.
  3. Admin phê duyệt, bàn giao thẻ, xuất thẻ nhanh tại quầy khẩn cấp.
  4. Cảnh báo timeline chờ nhận thẻ thời gian thực (15p, 30p, nhả thẻ ngay).
  5. Thu hồi thẻ, nợ bill, bóc tách hóa đơn OCR, thẩm định chi phí vượt hạn mức của HR.
  6. Giao diện Admin chuẩn hóa theo Phương án 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill).

### Tech Stack
- **Frontend**: React 19, TypeScript ~5.8, Tailwind CSS v4 (`@tailwindcss/vite`), Vite 6, Lucide React
- **Architecture**: Single-Store Client-side Architecture với React Context API
- **Persistence**: `localStorage` qua khóa dữ liệu `taxicard_app_data_v3` (kèm nút Nạp lại Mock Data để reset dữ liệu mẫu)
- **UI Paradigm**: Giả lập Telegram Mini App trên mobile và Admin Web Portal trên màn hình lớn

---

## 2. `.agents/` Directory Navigation

### Core Maps
| File | Mô tả |
|------|------|
| [CONTEXT.md](./CONTEXT.md) | Bản đồ nhanh để onboard và resume |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | Quyết định kiến trúc và lý do chiến lược |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Snapshot cấu trúc thư mục, entry points, services và commands |
| [architecture/MASTER.md](./architecture/MASTER.md) | Luồng nghiệp vụ chi tiết và trạng thái yêu cầu mượn thẻ |
| [changelog/CHANGELOG-FE.md](./changelog/CHANGELOG-FE.md) | Nhật ký phát hành các phiên bản tính năng |
| [testing/operational-workflow-enhancements-test-cases.md](./testing/operational-workflow-enhancements-test-cases.md) | Kịch bản kiểm thử các tính năng vận hành nâng cao |

### History
| Thư mục | Mô tả |
|---------|------|
| [history/features/2026-10-18-operational-workflow-enhancements/](./history/features/2026-10-18-operational-workflow-enhancements/) | Tài liệu plan, tasks và review của đợt chuẩn hóa PA 1 và bộ 4 tính năng vận hành |

---

## 3. Critical Files & Responsibilities

| File | Mức độ | Ghi chú |
|------|------|---------|
| [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) | CRITICAL | Single-Store Context quản lý toàn bộ State, nghiệp vụ, invariant 1 đơn active, an toàn GUEST fallback, ưu tiên Waitlist và lưu trữ localStorage |
| [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts) | CRITICAL | Định nghĩa toàn bộ schema: `TaxiRequest`, `TaxiCard`, `UserProfile`, `RequestStatus`, `TripBilling` |
| [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) | HIGH | Giao diện tác vụ Admin chuẩn hóa PA 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill) kèm bộ đếm thời gian thực và cảnh báo timeline |
| [src/components/admin/DirectDispatchModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/DirectDispatchModal.tsx) | HIGH | Modal xuất thẻ nhanh tại quầy cho các tình huống khẩn cấp (`REQ-DIRECT-xxx`) |
| [src/components/leader/LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx) | HIGH | Giao diện duyệt của Leader, mẫu tin bot Telegram, xử lý hoàn tác 90 phút |
| [src/components/employee/EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx) | HIGH | Form đăng ký mượn thẻ kèm chọn lịch đi dự kiến và preset buttons |
| [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts) | HIGH | Dữ liệu khởi tạo mẫu chuẩn cho các kịch bản demo và kiểm thử |
