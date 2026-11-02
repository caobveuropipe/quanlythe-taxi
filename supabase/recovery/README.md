# Khôi phục dữ liệu cấp thẻ trùng

1. Tạm ngừng cấp/nhả thẻ trên Mini App và bot trong lúc sửa dữ liệu.
2. Chạy [`20261102_card_assignment_audit.sql`](./20261102_card_assignment_audit.sql) trên Supabase SQL Editor; lưu kết quả và đối chiếu mã thẻ vật lý đang thực sự được giữ hoặc đã bàn giao.
3. Với mỗi order có nhiều thẻ active, chọn đúng **một** thẻ thực tế. Chỉ chuyển những thẻ chắc chắn chưa bàn giao về `available`, xóa `current_request_id`, `assigned_to_name`, `assigned_to_code`; sửa `reserved_card_code`/`actual_card_code` và `status` của order cho khớp. Thực hiện trong một transaction, kiểm tra lại cả ba truy vấn audit trước khi `COMMIT`.
4. Chạy migration [`20261030_enforce_single_active_card_per_request.sql`](../migrations/20261030_enforce_single_active_card_per_request.sql) trên SQL Editor. Unique index sẽ chặn một order giữ hai thẻ; ba RPC sẽ xử lý cấp, hủy và nhả thẻ trong transaction. Nếu migration báo lỗi duplicate, không bỏ index: quay lại bước 3.
5. Kiểm tra `select proname from pg_proc where proname in ('assign_taxi_card_atomic','cancel_taxi_request_atomic','release_taxi_card_atomic');` và xác nhận index `idx_taxi_cards_single_active_request` tồn tại trước khi mở lại thao tác.
6. Triển khai phiên bản code đã bỏ fallback ghi bảng trực tiếp. Thử một order mới: duyệt một lần, nhấn lại không thêm thẻ; nhả thẻ đã giữ; kiểm tra kho và hàng chờ đồng bộ sau tải lại.

Không chọn thẻ giữ lại chỉ dựa vào mã trên database. Ảnh cho thấy hai thẻ `0006` và `3571` cùng thuộc `REQ-2026-106`, nhưng không cho biết thẻ nào đang cầm ngoài thực tế.
