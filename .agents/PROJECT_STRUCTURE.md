# Project Structure - Quản Lý Thẻ Taxi Nội Bộ

> Tạo ngày: 2026-10-16  
> Cập nhật gần nhất: 2026-10-18  
> Mục đích: Lưu snapshot cấu trúc codebase để AI và Developer có thể onboard và resume nhanh.  

---

## 1. Snapshot Cây Thư Mục

```text
Quan ly the taxi/
|-- .agents/
|   |-- CONTEXT.md                                    # Bản đồ tổng quan dự án cho AI
|   |-- PROJECT_STRUCTURE.md                          # Snapshot cấu trúc, services, commands
|   |-- KNOWLEDGE_BASE.md                             # Các quyết định kiến trúc cốt lõi
|   |-- architecture/
|   |   `-- MASTER.md                                 # Luồng nghiệp vụ & quy tắc vận hành
|   |-- changelog/
|   |   `-- CHANGELOG-FE.md                           # Nhật ký cập nhật frontend & backend fixes
|   |-- testing/
|   |   `-- operational-workflow-enhancements-test-cases.md # Test cases nghiệp vụ
|   |-- history/
|   |   `-- features/                                 # Lưu trữ các feature đã hoàn thành
|   `-- skills/                                       # Bộ skill pack chuẩn hóa
|-- api/
|   `-- telegram.ts                                   # Telegram Webhook & Mini App Proxy (Fail-closed secret & HMAC)
|-- scripts/
|   `-- setup-telegram-webhook.mjs                    # Đăng ký bot webhook với secret token
|-- supabase/
|   `-- migrations/
|       `-- 20261030_enforce_single_active_card_per_request.sql # Unique Partial Index & 3 Atomic RPCs
|-- tests/
|   |-- launch-context.test.ts
|   |-- phase1_rpc.test.ts
|   |-- phase2_webhook_concurrency.test.ts
|   `-- phase3_integration_concurrency.test.ts
|-- src/
|   |-- App.tsx                                       # Điều phối giao diện Telegram Mini App & Role Switcher
|   |-- main.tsx                                      # Entry point React
|   |-- index.css                                     # Tailwind CSS / Styles
|   |-- types/
|   |   `-- index.ts                                  # Định nghĩa toàn bộ Types (TaxiCard, TaxiRequest, UserProfile...)
|   |-- context/
|   |   `-- AppContext.tsx                            # Single-Store Context trung tâm (localStorage: taxicard_app_data_v3)
|   |-- data/
|   |   `-- seedData.ts                               # Dữ liệu mẫu khởi tạo ban đầu (Users, Cards, Requests, Leaders)
|   |-- components/
|   |   |-- TelegramHeader.tsx                        # Giả lập Header của Telegram Mini App
|   |   |-- PreviewToolbar.tsx                        # Thanh công cụ chuyển đổi vai trò (Employee, Leader, Admin, HR)
|   |   |-- UserProfileModal.tsx                      # Modal xem thông tin tài khoản đang chọn
|   |   |-- admin/
|   |   |   |-- AdminActionQueueView.tsx              # Hàng đợi tác vụ Admin (PA 1: 2 Tab Đi/Về: Cấp thẻ - Thu bill)
|   |   |   |-- AdminInventoryView.tsx                # Quản lý kho thẻ vật lý (Available, In Use, Damaged...)
|   |   |   |-- AdminReportsView.tsx                  # Báo cáo chi phí, thống kê sử dụng theo phòng ban/thẻ
|   |   |   |-- AdminSettingsView.tsx                 # Cấu hình hệ thống (hạn mức chuyến, phê duyệt leader)
|   |   |   |-- AdminWebPortalStandbyView.tsx         # Màn hình chờ chuyển đổi Web Portal
|   |   |   |-- DirectDispatchModal.tsx               # Modal xuất thẻ nhanh trực tiếp tại quầy (Ý tưởng 1 & FR-04)
|   |   |   |-- ReleaseCardModal.tsx                  # Modal giải phóng thẻ đã giữ khi nhân sự không nhận
|   |   |   |-- ReturnCardAndBillModal.tsx            # Modal thu hồi thẻ, nhập hóa đơn, ảnh OCR, kiểm tra vượt mức
|   |   |   `-- YieldCardModal.tsx                    # Modal gửi yêu cầu nhường thẻ gấp qua Telegram
|   |   |-- employee/
|   |   |   |-- EmployeeRegisterView.tsx              # Form đăng ký mượn thẻ, chọn lịch đi dự kiến (Ý tưởng 4)
|   |   |   `-- EmployeeRequestsView.tsx              # Danh sách yêu cầu của tôi, xem trạng thái, phản hồi nhường thẻ
|   |   `-- leader/
|   |       `-- LeaderApprovalsView.tsx               # Màn hình Leader duyệt, xem bot Telegram, hoàn tác 90p (Ý tưởng 3)
|-- index.html                                        # HTML Template
|-- vite.config.ts                                    # Cấu hình Vite & Tailwind v4
|-- tsconfig.json                                     # Cấu hình TypeScript compiler
`-- package.json                                      # Dependencies & npm scripts
```

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend Root | [src/main.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/main.tsx) | Mount root React component vào `#root` | Vite bundler |
| Root Component | [src/App.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/App.tsx) | Điều phối Navbar, Preview Toolbar đổi vai trò và chuyển View | Quản lý khung Telegram Mini App |
| State Store | [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) | Single-Store Context quản lý toàn bộ dữ liệu & nghiệp vụ | LocalStorage `taxicard_app_data_v3` |

## 3. Services / Modules Chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| App State Provider | [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) | Quản lý vòng đời yêu cầu, cấp thẻ, thu hồi, OCR, Waitlist, Leader Undo | [src/types/index.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/types/index.ts), [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts) |
| Admin Action Queue | [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) | Giao diện điều phối Admin theo Phương án 1 (2 Tab Đi/Về) | AppContext, Lucide icons |
| Direct Dispatch Modal | [src/components/admin/DirectDispatchModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/DirectDispatchModal.tsx) | Modal xuất thẻ nhanh tại quầy khẩn cấp (REQ-DIRECT-xxx) | AppContext, Lucide icons |
| Leader Approvals | [src/components/leader/LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx) | Duyệt mượn thẻ, xem mẫu tin bot Telegram, hoàn tác 90 phút | AppContext, Lucide icons |
| Employee Register | [src/components/employee/EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx) | Form đăng ký mượn thẻ kèm chọn ngày & giờ đi dự kiến | AppContext, Lucide icons |

## 4. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy dev | `npm run dev` | Node.js installed | Mở dev server tại `http://localhost:3000` (hoặc 3001/3002) |
| Build production | `npm run build` | TypeScript pass | Đóng gói bundle vào thư mục `dist/` |
| Kiểm tra kiểu | `npm run lint` | TypeScript installed | Chạy `tsc --noEmit` để rà soát lỗi type |
| Preview build | `npm run preview` | Sau khi đã `build` | Chạy server xem trước bản build production |

## 5. Key Boundaries & Invariants

- **Single Active Card Invariant (2026-10-30):** DB Unique Partial Index `idx_taxi_cards_single_active_request` trên `taxi_cards(current_request_id) WHERE current_request_id IS NOT NULL AND status IN ('reserved', 'in_use')` ngăn chặn 1 request liên kết với > 1 thẻ active.
- **Global Lock Hierarchy (2026-10-30):** Toàn bộ transaction RPCs (`assign_taxi_card_atomic`, `cancel_taxi_request_atomic`, `release_taxi_card_atomic`) tuân thủ nghiêm ngặt thứ tự Level 1 (Requests theo ID tăng dần) -> Level 2 (Cards theo mã tăng dần) để triệt tiêu deadlock PostgreSQL 40P01.
- **Fail-Closed Webhook Security (2026-10-30):** Route `/api/telegram` bắt buộc `TELEGRAM_WEBHOOK_SECRET` và xác thực header `X-Telegram-Bot-Api-Secret-Token` qua timingSafeEqual; custom actions từ Mini App bắt buộc chữ ký HMAC-SHA256 của `initData`.
- **Storage Key:** Sử dụng key `taxicard_app_data_v3` trên localStorage cho toàn bộ state.
- **Invariant 1 đơn active duy nhất (FR-02):** Một nhân sự chỉ được có 1 đơn ở các trạng thái active (`pending_leader`, `pending_admin`, `waitlist_cards`, `pending_handover`, `holding_card`, `returned_pending_bill`, `overbudget_pending_hr`). Chặn tạo mới hoặc hoàn tác nếu đã có đơn active.
- **Fallback GUEST an toàn (FR-04):** Khi xuất nhanh tại quầy cho người ngoài danh mục users, luôn fallback an toàn sang `employeeCode: 'GUEST'`, `department: 'Khách ngoài / Đột xuất'`.
- **Ưu tiên Waitlist (FR-03):** Sắp xếp đơn chờ theo `getEffectiveTime(estimatedStartTime || createdAt)` tăng dần.
- **Timeline bàn giao (FR-01):** Sử dụng `handoverReadyAt` để tính thời gian chờ giao thẻ.
