# Khôi phục dữ liệu cấp thẻ trùng

1. Tạm ngừng cấp/nhả thẻ trên Mini App và bot trong lúc sửa dữ liệu.
2. Chạy [`20261102_card_assignment_audit.sql`](./20261102_card_assignment_audit.sql) trên Supabase SQL Editor; lưu kết quả và đối chiếu mã thẻ vật lý đang thực sự được giữ hoặc đã bàn giao.
3. Admin đã xác nhận không giữ thẻ nào cho `REQ-2026-106`. Truy vấn live ngày 2026-11-02 cho thấy order đang `waitlist_cards`, chưa từng bàn giao và cả `0006`/`3571` đều `reserved` cho order này. Chạy [`20261102_release_req_2026_106.sql`](./20261102_release_req_2026_106.sql) sau khi đối chiếu lại audit. Script tự dừng nếu trạng thái live khác. Với các order trùng khác, đối chiếu thẻ vật lý rồi sửa riêng trong transaction; không dùng script này cho order khác.
4. Chạy migration [`20261030_enforce_single_active_card_per_request.sql`](../migrations/20261030_enforce_single_active_card_per_request.sql) trên SQL Editor. Unique index sẽ chặn một order giữ hai thẻ; ba RPC sẽ xử lý cấp, hủy và nhả thẻ trong transaction. Nếu migration báo lỗi duplicate, không bỏ index: quay lại bước 3.
5. Kiểm tra `select proname from pg_proc where proname in ('assign_taxi_card_atomic','cancel_taxi_request_atomic','release_taxi_card_atomic');` và xác nhận index `idx_taxi_cards_single_active_request` tồn tại trước khi mở lại thao tác.
6. Triển khai phiên bản code đã bỏ fallback ghi bảng trực tiếp. Thử một order mới: duyệt một lần, nhấn lại không thêm thẻ; nhả thẻ đã giữ; kiểm tra kho và hàng chờ đồng bộ sau tải lại.

Quyết định giải phóng cả hai thẻ của `REQ-2026-106` dựa trên xác nhận của Admin rằng không giữ thẻ nào ngoài thực tế. Nếu audit cho thấy thẻ đã được bàn giao hoặc trạng thái đã thay đổi, dừng để đối chiếu lại.
