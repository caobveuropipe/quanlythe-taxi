# Test Cases - Bộ 4 Tính Năng Vận Hành Nâng Cao & Chuẩn Hóa Giao Diện Admin PA 1

> Tạo ngày: 2026-10-18  
> Liên kết feature: `operational-workflow-enhancements` (đã archive)  
> Phạm vi: Frontend, Admin Action Queue, Inventory, Employee Register, Leader Approvals  

---

## 1. Mục tiêu kiểm thử

- Xác nhận giao diện Admin cố định Phương án 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill) hoạt động ổn định, không còn switcher thừa.
- Kiểm tra luồng Xuất thẻ nhanh trực tiếp tại quầy (Ý tưởng 1 & FR-04 fallback GUEST).
- Kiểm tra tính năng chọn Lịch đi dự kiến & thuật toán ưu tiên Waitlist theo thời điểm đi sớm nhất (Ý tưởng 4 & FR-03).
- Kiểm tra hệ thống cảnh báo Timeline bàn giao (FR-01) và bộ đếm thời gian thực 30s (FR-05).
- Kiểm tra tính năng Leader Hoàn tác từ chối sang duyệt trong 90 phút và cơ chế chặn đơn active trùng (Ý tưởng 3 & FR-02).

## 2. Tiền điều kiện

- Môi trường: Local dev server (`npm run dev`) tại `http://localhost:3000` hoặc `http://localhost:3002`.
- Tài khoản test: 
  - Admin: Lê Hoàng Nam (`user-04` - Admin & HR)
  - Leader: Trần Thị Bích (`user-03` - Leader Phòng Kinh Doanh)
  - Nhân viên: Nguyễn Văn A (`user-01`), Lê Thị Mai (`user-02`)
- Seed data: Bấm nút `Nạp lại Mock Data` trên header Admin để nạp dữ liệu chuẩn.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | **Kiểm tra Giao diện Admin PA 1**: Đăng nhập Admin, quan sát thanh điều hướng | Chỉ có 2 Tab duy nhất: `1. Cấp thẻ (Chiều đi)` và `2. Thu thẻ & Bill (Chiều về)`. Không còn bong bóng switcher thử nghiệm. |
| HP-02 | **Xuất thẻ nhanh tại quầy (NV nội bộ)**: Bấm `⚡ Xuất thẻ nhanh tại quầy`, chọn thẻ `TAXI-02`, chọn NV Nguyễn Văn A, chọn lý do *"Sếp cần xe gấp"*, bấm Xác nhận | Thẻ `TAXI-02` chuyển sang `in_use`, sinh đơn `REQ-DIRECT-xxx` vào Tab 2 mục *Đang giữ thẻ*, có thể thu hồi thẻ và nhập bill bình thường. |
| HP-03 | **Đăng ký với Lịch đi dự kiến**: Đăng nhập NV, nhập mục đích, điểm đến, chọn nút nhanh `+30 phút` cho thời gian đi, bấm gửi yêu cầu | Đơn được tạo thành công với `estimatedStartTime` chính xác sau 30 phút. |
| HP-04 | **Ưu tiên Waitlist theo lịch đi gần**: Đơn `REQ-2026-096` đi sau 45p, đơn `REQ-2026-095` đi ngày mai. Thu hồi 1 thẻ về kho | Thẻ vừa thu hồi được tự động cấp ưu tiên cho `REQ-2026-096` thay vì đơn ngày mai. |
| HP-05 | **Cảnh báo Timeline bàn giao**: Xem Tab 1 Cấp thẻ mục Chờ giao | `REQ-2026-100` (chờ 18p) hiển thị badge vàng `Đã chờ 18 phút`. `REQ-2026-099` (chờ 35p) hiển thị viền cam/đỏ quá hạn + badge `Quá hạn nhận 35 phút` + nút `Giải phóng thẻ ngay`. |
| HP-06 | **Leader Hoàn tác trong 90 phút**: Đăng nhập Leader Bích, tại mục "Đơn vừa từ chối trong 90 phút", bấm `↺ Hoàn tác sang DUYỆT` trên đơn `REQ-2026-094` (còn ~75p) | Đơn được duyệt lại thành công, kho thẻ giữ 1 thẻ và đơn chuyển sang chờ Admin bàn giao thẻ. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | **Xuất nhanh cho Khách ngoài (FR-04)**: Bấm Xuất nhanh, nhập tên tự do "Mr. John - Khách VIP" ngoài danh mục users, bấm Xác nhận | Đơn được tạo với `employeeCode: 'GUEST'`, `department: 'Khách ngoài / Đột xuất'`, thẻ chuyển sang `in_use` an toàn, không bị lỗi gãy báo cáo chi phí. |
| RG-02 | **Đơn thoát Waitlist đo timeline chính xác (FR-01)**: Đơn nằm trong Waitlist nhiều ngày, khi có thẻ hoàn về tự động gán sang `pending_handover` | `handoverReadyAt` được gán mốc hiện tại, số phút chờ bắt đầu đếm từ 0 phút, không bị tính nhầm theo `adminApprovedAt` cũ. |
| RG-03 | **Tick Timer 30s (FR-05)**: Mở màn hình Admin tab Chờ giao và giữ nguyên không tải lại trang trong 1 phút | Số phút chờ trên badge tự động tăng thêm 1 phút mà không cần F5/reload trang. |

## 5. Negative Cases & Security

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | **Chặn đơn active trùng khi Leader Hoàn tác (FR-02)**: Nhân sự Trịnh Thùy Linh tạo đơn mới đang ở `pending_admin`. Leader bấm `↺ Hoàn tác` đơn cũ `REQ-2026-094` | Hệ thống từ chối hoàn tác và hiển thị thông báo lỗi rõ: *"Nhân sự hiện đã có yêu cầu khác đang xử lý. Không thể hoàn tác..."*. |
| NG-02 | **Quá hạn 90 phút hoàn tác**: Thử hoàn tác đơn bị từ chối từ hơn 90 phút trước | Nút hoàn tác bị vô hiệu hóa hoặc hệ thống từ chối với lý do đã hết thời hạn 90 phút. |
| NG-03 | **Kho hết thẻ khi xuất nhanh**: Bấm xuất nhanh khi không có thẻ nào ở trạng thái `available` | Nút xác nhận bị disable hoặc dropdown thông báo không có thẻ sẵn sàng trong kho. |

## 6. Ghi chú regression

- Đảm bảo luồng Thu hồi thẻ (`cardReturned`) và Nhập bill/OCR/Thẩm định vượt mức HR vẫn hoạt động trơn tru sau khi chuyển đổi trạng thái từ đơn xuất nhanh tại quầy (`REQ-DIRECT-xxx`).
