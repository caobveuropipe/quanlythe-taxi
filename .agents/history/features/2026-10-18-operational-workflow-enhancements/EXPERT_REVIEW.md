---
source: feature-review
feature: operational-workflow-enhancements
round: 2
timestamp: 2026-10-18T18:14:30+07:00
verdict: ✅ ĐỒNG Ý
---

# Expert Review: operational-workflow-enhancements (Round 2)

## Trạng Thái Các Vấn Đề Cũ (Re-Review Tracking)

- **FR-01: Sai lệch mốc tính thời gian chờ nhận thẻ đối với đơn Waitlist**  
  *Trạng thái:* ✅ ĐÃ ĐÓNG (RESOLVED)  
  *Đánh giá:* Kế hoạch và danh mục nhiệm vụ đã bổ sung trường `handoverReadyAt` vào `TaxiRequest` (Task 3.1) và cam kết cập nhật mốc này tại cả `adminApprove` lẫn `autoAssignCardIfWaitlisted` (Task 3.2). Loại bỏ hoàn toàn nguy cơ báo động giả.

- **FR-02: Xung đột quy tắc "Đơn duy nhất" khi Leader hoàn tác đơn bị từ chối**  
  *Trạng thái:* ✅ ĐÃ ĐÓNG (RESOLVED)  
  *Đánh giá:* Kế hoạch và Task 4.2 đã quy định rõ bước kiểm tra chặn hoàn tác nếu nhân sự sở hữu đơn đã tạo đơn active mới. Bảo vệ tuyệt đối bất biến 1 đơn active / 1 nhân sự.

- **FR-03: Lỗi bất định thuật toán sắp xếp Waitlist khi `estimatedStartTime` rỗng**  
  *Trạng thái:* ✅ ĐÃ ĐÓNG (RESOLVED)  
  *Đánh giá:* Task 2.4 đã chuẩn hóa hàm helper `getEffectiveTime` lấy fallback là `createdAt` khi `estimatedStartTime` thiếu hoặc không hợp lệ, triệt tiêu lỗi so sánh `NaN` trong JavaScript.

- **FR-04: Thiếu quy chuẩn fallback định danh khi Admin xuất thẻ nhanh cho khách ngoài**  
  *Trạng thái:* ✅ ĐÃ ĐÓNG (RESOLVED)  
  *Đánh giá:* Task 1.3 đã bổ sung quy chuẩn fallback `employeeId: 'GUEST-' + Date.now()`, `employeeCode: 'GUEST'`, `department: 'Khách ngoài / Đột xuất'`.

- **FR-05: Cảnh báo Timeline cần chu kỳ làm mới (Tick Timer)**  
  *Trạng thái:* ✅ ĐÃ ĐÓNG (RESOLVED)  
  *Đánh giá:* Task 3.4 đã bổ sung timer định kỳ (mỗi 30s) trong `AdminActionQueueView` để cập nhật hiển thị badge thời gian thực.

---

## Findings

Không có finding mới.

---

## Đánh Giá Quyết Định Chuẩn Hóa UI Admin (Phương Án 1)

- **Chief Architect & UX/Product Reviewer:** Việc người dùng chính thức lựa chọn Phương án 1 (2 Tab Đi/Về: Cấp thẻ - Thu bill) và loại bỏ bong bóng switcher thử nghiệm giúp:
  1. Loại bỏ toàn bộ các state dư thừa và các khối mã của PA 2, PA 3 trong [AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx).
  2. Phân chia rõ ràng 2 chiều nghiệp vụ (Chiều Đi: Duyệt cấp / Hàng chờ / Bàn giao và Chiều Về: Đang giữ thẻ nợ bill / Thẩm định vượt mức).
  3. Tối ưu trải nghiệm sử dụng trên thiết bị di động, không bị quá tải thông tin.

---

## Kết luận

Hội đồng review kỹ thuật kết luận: **✅ ĐỒNG Ý**. Bản kế hoạch [FEATURE_PLAN.md](./FEATURE_PLAN.md) và danh mục nhiệm vụ [FEATURE_TASKS.md](./FEATURE_TASKS.md) đã hoàn toàn hoàn thiện, chặt chẽ về mặt logic, an toàn về dữ liệu và sẵn sàng 100% để chuyển sang giai đoạn thực thi với `feature-coordinator`.
