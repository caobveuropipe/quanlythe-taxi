# BÁO CÁO TỔNG KẾT PHIÊN LÀM VIỆC & RÀ SOÁT TỒN ĐỌNG (SESSION REVIEW)

> **Dự án:** Hệ thống Quản lý Thẻ Taxi Doanh nghiệp (TaxiCard Mini App)  
> **Thời điểm lập:** 18/10/2026  
> **Tài liệu liên quan:** [DU_AN_QUAN_LY_THE_TAXI.md](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/DU_AN_QUAN_LY_THE_TAXI.md), [SO_DO_LUONG_MERMAID.md](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/SO_DO_LUONG_MERMAID.md), [KICH_BAN_TEST_LUONG.md](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/KICH_BAN_TEST_LUONG.md)

---

## I. MỤC TIÊU & DIỄN BIẾN PHIÊN LÀM VIỆC

Trong suốt phiên làm việc, hệ thống đã trải qua các đợt rà soát nghiệp vụ sâu rộng, tập trung vào:
1. **Chuẩn hóa luồng quy trình & Tài liệu:** Tích hợp quy trình 5 khâu duyệt thẻ, vẽ sơ đồ Sequence Diagram và Flowchart Mermaid chuẩn.
2. **Thiết kế & Tối ưu giao diện Admin Mobile:** Giải quyết bài toán giao diện Admin bị quá tải thông tin trên màn hình điện thoại bằng cách thử nghiệm 3 phương án giao diện (PA 1, PA 2, PA 3).
3. **Cơ chế tự động hóa:** Xử lý việc kho hết thẻ và tự động cấp bù thẻ theo nguyên tắc FIFO (hàng đợi đến trước phục vụ trước) khi có thẻ được giải phóng.
4. **Tối ưu trải nghiệm tìm kiếm thời gian thực:** Sửa lỗi tìm kiếm không hiển thị đúng nhân viên hoặc bị lẫn tên nhân sự khác do quét nhầm các trường văn bản phụ.

---

## II. LỊCH SỬ CÁC YÊU CẦU & THẢO LUẬN TỪ NGƯỜI DÙNG (CHRONOLOGICAL LOG)

| Bước | Yêu cầu từ Người dùng (User Request) | Phân loại | Tình trạng xử lý |
| :---: | :--- | :--- | :--- |
| **1** | *"tạo lại cổng local host đi"* | Môi trường Dev | ✅ Đã chạy `npm run dev` cổng `3001` |
| **2** | *"chỗ này có thể duyệt luôn bằng button mà không cần mở mini app không?... ý anh là duyệt ngay trên màn hình telegram chứ không phải vào miniapp nhé"* | Nghiệp vụ Leader | ✅ Đã thiết kế & mô phỏng luồng Telegram Inline Buttons |
| **3** | *"Đọc dự án và viết lại cho anh thành 1 file md và 1 file excel toàn bộ kịch bản test từng luồng..."* | Tài liệu kiểm thử | ✅ Đã xuất file `KICH_BAN_TEST_LUONG.md` và script Python sinh Excel |
| **4** | *"Luồng 1 và 2 bản chất chỉ là 1 luồng: Khâu 1: User Đăng ký ➔ Khâu 2: Admin duyệt ➔ Khâu 3: Leader duyệt ➔ Khâu 4: Bàn giao thẻ ➔ Khâu 5: Trả thẻ & Nhập bill"* | Kiến trúc luồng | ✅ Đã chuẩn hóa lại toàn bộ tài liệu về cấu trúc 5 khâu |
| **5** | *"hãy tạo file text dạng mermaid đi để anh đưa vào vẽ luồng thì dễ hình dung hơn"* | Sơ đồ Mermaid | ✅ Đã tạo [SO_DO_LUONG_MERMAID.md](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/SO_DO_LUONG_MERMAID.md) |
| **6** | *"các bước duyệt có thông báo về cho user đăng ký không? Nhất là leader không duyệt?"* | Thông báo Telegram | ✅ Đã bổ sung bước Bot gửi tin nhắn phản hồi kết quả vào sơ đồ |
| **7** | *"anh muốn có 1 nút hoàn tác với leader để chọn lại khi cần... trong vòng 1 tiếng rưỡi thôi. Ở khâu này cũng cần tính đến phương án là sau khi leader đổi ý thì hết thẻ ở trạng thái available"* | Hoàn tác Leader | ⚠️ Đã mô phỏng trên Telegram View, **chưa có hàm logic trên AppContext** |
| **8** | *"chỗ này cần cảnh báo người dùng theo từng timeline trước khi giải phóng thẻ"* | Cảnh báo Timeline | ⚠️ Đã đưa vào phân tích thiết kế, **chưa có bộ đếm giờ trên giao diện** |
| **9** | *"timeline này căn cứ vào thời điểm duyệt hay thời điểm đi đăng ký? Thêm 1 trường hợp là đăng ký trước vài hôm mà đến ngày đi chưa có thẻ available thì sao? Phương án nào để luôn ưu tiên cho người đăng ký trước trong ngày giao thẻ?"* | Ưu tiên Waitlist | ⚠️ Đã xử lý FIFO theo `createdAt`, **chưa có trường ngày/giờ đi thực tế** |
| **10** | *"có cho phép người dùng tự hủy order chưa? Có phương án để admin xin hủy order cho người khác chưa?"* | Hủy đơn & Nhường thẻ | ✅ Đã thêm tính năng `cancelRequest` và Modal `Xin nhường thẻ` |
| **11** | *"trong trường hợp là vai trò admin thì có thể xuất thẻ bất kỳ cho người khác dùng không cần người đó phải order thì phương án xử lý là gì?"* | Cấp thẻ trực tiếp | ⚠️ Đã đề xuất phương án "Admin Direct Dispatch", **chưa code lên giao diện** |
| **12** | *"anh thấy giao điện này của admin dùng trên điện thoại thì hơi nhiều thông tin quá, có thể tin giản lại không?"* | UI/UX Admin | ✅ Đã thiết kế 3 phương án tinh giản giao diện |
| **13** | *"Vẫn cần phải phân thành 5 loại đó à? Có thể đơn giản hơn không"* | Tinh giản Tab | ✅ Đã gom 5 trạng thái thành luồng 2 tab hoặc 1 trang To-Do |
| **14** | *"thử cả 3 và cho anh 1 bong bóng chuyển đổi giữa 3 phương án"* | UI Switcher | ✅ Đã code Bong bóng chuyển đổi trực tiếp trên [AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx) |
| **15** | *"cung cấp cả mock data cho anh"* | Dữ liệu mẫu | ✅ Đã cập nhật 12 đơn mẫu bao quát mọi trạng thái tại [seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts) |
| **16** | *"Chờ duyệt, chờ thẻ, chờ giao là gì? Khi nào dùng?"* | Làm rõ khái niệm | ✅ Đã giải thích chi tiết ý nghĩa và thời điểm sử dụng từng trạng thái |
| **17** | *"Vậy tức là khi có thẻ được giải phóng thì đơn chờ thẻ sẽ được tự động cấp mà không cần admin thao tác đúng không"* | Tự động hóa Waitlist | ✅ Đã cài đặt cơ chế tự động gán thẻ FIFO trong [AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) |
| **18** | *"Chưa có cái nào có thể search được cả"* | Tìm kiếm thời gian thực | ✅ Đã thêm Search bar trên Admin Queue, Kho thẻ và Đơn của tôi |
| **19** | *"vẫn đang có tên nhân viên khác"* | Sửa lỗi tìm kiếm | ✅ Đã cô lập phạm vi tìm kiếm theo `👤 Tên/Mã NV` và bỏ dấu tiếng Việt |
| **20** | *"tóm tắt lại toàn bộ session này xem còn idea nào chưa được fix trên code"* | Tổng kết session | ✅ Đã rà soát toàn diện và lập báo cáo tài liệu này |
| **21** | *"giao diện người dùng trên điện thoại vẫn đang quá nhiều thông tin, quá nhiều chữ, chưa được tối giản lắm, cho anh thêm 1 giao diện tối giản hơn, có bong bóng chuyển đổi để anh test"* | Giao diện Tối giản Mobile | ✅ Đã tạo Giao diện Tối giản (Minimalist Mode) & Bong bóng chuyển đổi trực tiếp trên màn hình |
| **22** | *"Khi gửi yêu cầu thì cần tóm tắt lại thông tin đặc biệt ngày giờ đi để người dùng xác nhận 1 lần hoặc quay lại để sửa"* | Xác nhận trước khi gửi | ✅ Đã tạo Modal/Bottom Sheet tóm tắt thông tin, làm nổi bật Ngày & Giờ đi tiếng Việt và 2 nút "Quay lại để sửa" / "Xác nhận gửi" |
| **23** | *"hồ sơ mới không nhập được thông tin, bấm nút nhập lại thông tin khác không hoạt động..."* | Sửa Onboarding | ✅ Đã cho phép sửa trực tiếp form Onboarding và đồng bộ Supabase |
| **24** | *"Người dùng đã điền tên leader rồi nhưng thông báo của super admin lại bảo là không có, cũng không có chỗ nào cho super admin hoặc admin cấp role..."* | Liên kết Leader & Phân quyền | ✅ Đã tự tạo bản ghi Leader trong `users` và cho phép chọn quyền trực tiếp khi duyệt |
| **25** | *"chỉ có 1 super admin duy nhất nhận được tin nhắn này à? tự động gửi cho tất cả admin_hr, khi 1 admin_hr duyệt thì sẽ thông báo cho những người còn lại là admin đó đã duyệt..."* | Thông báo Đa Admin | ✅ Đã phát tin nhắn cho tất cả tài khoản `admin_hr` và `admin`, kèm thông báo đồng bộ khi 1 admin duyệt |
| **26** | *"Thêm nữa là cần 1 giao diện trên miniapp để quản lý người dùng: tìm kiếm, sửa vai trò, sửa leader"* | Quản lý người dùng MiniApp | ✅ Đã xây dựng [AdminUserManagementView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminUserManagementView.tsx) đầy đủ tính năng tìm kiếm tức thì, lọc vai trò, sửa tên, mã, phòng ban, đổi role và sửa Leader quản lý |
| **27** | *"thêm nữa là khi người dùng order thì không có thông báo cho admin, cũng cần có phương án cho việc này"* | Thông báo Admin khi tạo đơn mượn thẻ | ✅ Đã phát tin nhắn Telegram kèm nút inline `[✅ Duyệt cấp thẻ]` / `[❌ Từ chối]` / `[⭐ Y/c Leader duyệt]` tới toàn bộ `admin_hr` và `admin`, kèm đồng bộ realtime và thông báo cho nhân viên |
| **28** | *"Gửi thông báo cập nhật cho Leader trực tiếp: ... Không cần, chỉ thông báo cho leader trực tiếp khi nào Admin yêu cầu leader duyệt thôi"* | Chuẩn hóa thông báo Leader | ✅ Đã bỏ thông báo Leader khi order, CHỈ gửi Telegram cho Leader kèm nút duyệt khi Admin bấm `Y/c Leader duyệt` (qua Telegram hoặc Mini App) |

---

## III. CHI TIẾT CÁC TÍNH NĂNG ĐÃ TRIỂN KHAI THÀNH CÔNG VÀO CODE

### 1. Bộ chuyển đổi 3 Phương án giao diện Admin (Interactive Layout Switcher)
- **Tập tin:** [src/components/admin/AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx)
- **Nội dung triển khai:**
  - **Phương án 1 (2 Tab Đi/Về):** Chia toàn bộ quy trình thành 2 nhánh tự nhiên:
    - *Tab 1: Cấp thẻ (Chiều đi):* Gồm Chờ duyệt, Chờ thẻ, Chờ bàn giao.
    - *Tab 2: Thu thẻ & Bill (Chiều về):* Gồm Đang giữ thẻ/Nợ bill và Thẩm định chi phí vượt hạn mức.
  - **Phương án 2 (3 Tab nghiệp vụ):** Phân tách theo hành động: `Duyệt cấp` ➔ `Bàn giao thẻ` ➔ `Thu hồi & Bill`.
  - **Phương án 3 (To-Do List 1 trang):** Hiển thị toàn bộ công việc cần xử lý theo 1 danh sách duy nhất, có pill lọc nhanh.
  - **Bong bóng chuyển đổi:** Đặt ngay đầu màn hình Admin, bấm đổi phương án mượt mà trong 1 chạm.

### 2. Tự động hóa cấp thẻ từ Hàng chờ Waitlist (FIFO Auto-Assign)
- **Tập tin:** [src/context/AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx) (hàm `autoAssignCardIfWaitlisted`)
- **Nội dung triển khai:**
  - Bất cứ khi nào 1 thẻ được giải phóng (Admin thu thẻ xong, nhả thẻ do NV không đến lấy, hoặc NV trả thẻ), hệ thống tự động tìm đơn có trạng thái `waitlist_cards` gửi sớm nhất.
  - Tự động gán thẻ vừa giải phóng sang cho đơn này, chuyển trạng thái đơn sang `pending_handover` (Chờ bàn giao thẻ). Admin không cần bấm gán thẻ thủ công.

### 3. Quy trình "Xin nhường thẻ" khẩn cấp qua Telegram
- **Tập tin:** [src/components/admin/YieldCardModal.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/YieldCardModal.tsx), [AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx), [EmployeeRequestsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRequestsView.tsx)
- **Nội dung triển khai:**
  - Admin bấm nút `Xin nhường` trên các đơn đã giữ thẻ nhưng chưa thực sự lăn bánh.
  - Nhập lý do (ví dụ: *"Có đoàn khách VIP phát sinh đột xuất cần xe đón tại sân bay"*).
  - Hệ thống gắn cờ `yieldStatus: 'pending_user_confirm'` và hiển thị thẻ xác nhận trực tiếp cho người đang giữ thẻ (Đồng ý nhường hoặc Giữ lại thẻ).

### 4. Tìm kiếm thời gian thực thông minh & Bỏ dấu tiếng Việt
- **Tập tin:** [AdminActionQueueView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminActionQueueView.tsx), [AdminInventoryView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/admin/AdminInventoryView.tsx), [EmployeeRequestsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRequestsView.tsx)
- **Nội dung triển khai:**
  - Phân tách phạm vi tìm kiếm rõ ràng:
    - `👤 Tên / Mã NV` (Mặc định): Chỉ tìm kiếm đích danh nhân viên, không bị trùng bởi các từ như *"kỹ thuật"*, *"thuế"* trong nội dung mục đích hay phòng ban.
    - `💳 Mã thẻ`: Tìm kiếm chuyên biệt cho mã thẻ (`TAXI-01`, `TAXI-02`...).
    - `🌐 Tất cả`: Quét toàn bộ các trường khi cần tìm nội dung mở rộng.
  - Chuẩn hóa tiếng Việt `removeVietnameseTones`: Gõ `thu`, `dung`, `tuan` đều tìm ra chính xác `Thu`, `Dũng`, `Tuấn`.

### 5. Dữ liệu mẫu phong phú (12 Kịch bản hoàn chỉnh)
- **Tập tin:** [src/data/seedData.ts](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/data/seedData.ts)
- **Nội dung triển khai:** 12 đơn phản ánh đầy đủ mọi ngóc ngách: Duyệt thẳng, Leader duyệt, Đang xin nhường thẻ, Chờ nhận thẻ, Hết thẻ xếp hàng chờ, Thu thẻ nợ hóa đơn, Vượt hạn mức chờ HR thẩm định.

---

## IV. DANH SÁCH CÁC Ý TƯỞNG ĐÃ THẢO LUẬN NHƯNG CHƯA ĐƯỢC CODE

Dưới đây là 4 ý tưởng quan trọng đã phát sinh trong các cuộc trao đổi nhưng **chưa được chuyển hóa thành code thực thi trong ứng dụng**:

### ⚠️ Ý TƯỞNG 1: Admin xuất thẻ nhanh trực tiếp tại quầy không cần tạo đơn trước
- **Nguồn gốc thảo luận:** Bước 382 (*"trong trường hợp là vai trò admin thì có thể xuất thẻ bất kỳ cho người khác dùng không cần người đó phải order thì phương án xử lý là gì?"*).
- **Vấn đề thực tế:**
  - Trong thực tế công ty, có những trường hợp sếp cần xe gấp hoặc khách phát sinh đột xuất, người đi xe chạy thẳng tới quầy gặp Admin/HR xin thẻ ngay chứ không kịp mở điện thoại tạo đơn.
- **Giải pháp đã thống nhất trong thảo luận:**
  - Bổ sung 1 nút bấm: **`⚡ Xuất thẻ nhanh tại quầy`** trên màn hình Admin (trong thanh công cụ hoặc màn hình Kho thẻ).
  - Khi bấm, mở Modal nhập nhanh:
    1. Chọn thẻ rảnh sẵn có (VD: `TAXI-03`).
    2. Chọn/nhập tên người nhận thẻ (từ danh sách nhân viên hoặc gõ tự do).
    3. Nhập mục đích chuyến đi tóm tắt (hoặc gắn nhãn *"Cấp khẩn cấp tại quầy"*).
  - Khi bấm *"Xác nhận cấp ngay"*: Hệ thống tự động sinh một mã đơn dạng `REQ-DIRECT-xxx`, gán thẳng thẻ và chuyển trạng thái sang `holding_card` (Đang giữ thẻ). Người nhận có thể đem thẻ đi ngay.
- **Tình trạng hiện tại trên code:** **CHƯA CODE**. Admin hiện tại vẫn bắt buộc phải có 1 đơn từ nhân sự tạo trên app mới thực hiện duyệt và bàn giao được.

---

### ⚠️ Ý TƯỞNG 2: Cảnh báo tự động theo Timeline trước khi giải phóng thẻ
- **Nguồn gốc thảo luận:** Bước 221 & 245 (*"chỗ này cần cảnh báo người dùng theo từng timeline trước khi giải phóng thẻ"*).
- **Vấn đề thực tế:**
  - Sau khi Admin duyệt cấp thẻ và gán thẻ dự kiến (`reservedCardCode`), thẻ đó bị "khóa" lại trong kho. Nếu nhân sự được duyệt nhưng bận họp, quên không xuống lấy thẻ thì thẻ đó bị giữ vô ích trong khi người khác đang cần xe.
- **Giải pháp đã thống nhất trong thảo luận:**
  - Thiết lập mốc cảnh báo thời gian chờ (Hold Expiry Threshold - ví dụ 30 phút hoặc 45 phút):
    - **Sau 15 phút:** Gửi tin nhắn Telegram nhắc nhân viên: *"Thẻ TAXI-xx đã sẵn sàng tại quầy, vui lòng xuống nhận trước 10:30"*.
    - **Sau 30 phút (quá hạn):** Trên thẻ của Admin đổi màu sang viền cam/đỏ kèm badge: *"Quá hạn nhận 15 phút - Cần liên hệ hoặc nhả thẻ"*.
    - **Sau 45 phút:** Có thể tự động giải phóng thẻ về kho hoặc Admin bấm 1 nút *"Giải phóng thẻ ngay"* có kèm lý do *"Quá hạn không đến nhận"*.
- **Tình trạng hiện tại trên code:** **CHƯA CODE BỘ ĐẾM GIỜ / BADGE CẢNH BÁO**. Hiện tại Admin chỉ có 1 nút bấm thủ công *"Nhả thẻ"* mà không có chỉ báo trực quan xem đơn này đã được duyệt cách đây bao lâu.

---

### ⚠️ Ý TƯỞNG 3: Chức năng Hoàn tác (Undo) của Leader trong 90 phút trên dữ liệu thật
- **Nguồn gốc thảo luận:** Bước 195 & 197 (*"anh muốn có 1 nút hoàn tác với leader để chọn lại khi cần... chỉ cần trong vòng 1 tiếng rưỡi thôi. Ở khâu này cũng cần tính đến phương án là sau khi leader đổi ý thì hết thẻ ở trạng thái available"*).
- **Vấn đề thực tế:**
  - Leader bấm "Từ chối" trên tin nhắn Telegram vì chưa rõ lý do, nhưng sau đó nhân viên gọi điện giải trình hợp lý. Leader muốn đổi ý sang "Duyệt" ngay mà không bắt nhân viên phải tạo lại đơn mới từ đầu.
- **Giải pháp đã thống nhất trong thảo luận:**
  - Trong vòng 90 phút kể từ khi Từ chối: Tin nhắn Telegram hiển thị thêm nút `↺ Hoàn tác sang DUYỆT`.
  - Khi Leader bấm Hoàn tác:
    - *Trường hợp 1 (Kho còn thẻ):* Đơn chuyển sang `pending_admin` hoặc được cấp thẻ bình thường.
    - *Trường hợp 2 (Kho đã hết thẻ):* Hệ thống tự động xếp đơn vào `waitlist_cards` và thông báo cho Leader & User: *"Đã hoàn tác sang duyệt, đơn đang ở danh sách chờ do kho tạm hết thẻ"*.
- **Tình trạng hiện tại trên code:** **MỚI MÔ PHỎNG GIAO DIỆN**. Tính năng này mới chỉ có dạng demo giao diện khung chat trong [LeaderApprovalsView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/leader/LeaderApprovalsView.tsx) (`botSimAction`), **chưa có hàm logic `leaderUndoReject` trong [AppContext.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/context/AppContext.tsx)** để can thiệp vào state dữ liệu thật của ứng dụng.

---

### ⚠️ Ý TƯỞNG 4: Phân loại thứ tự ưu tiên Waitlist theo "Thời điểm đi thực tế"
- **Nguồn gốc thảo luận:** Bước 245 (*"timeline này căn cứ vào thời điểm duyệt hay thời điểm đi đăng ký? Thêm 1 trường hợp là đăng ký trước vài hôm mà đến ngày đi chưa có thẻ available thì sao? Phương án nào để luôn ưu tiên cho người đăng ký trước trong ngày giao thẻ?"*).
- **Vấn đề thực tế:**
  - Nhân viên A tạo đơn vào thứ Hai nhưng lịch đi là chiều thứ Năm.
  - Nhân viên B tạo đơn vào sáng thứ Ba và cần đi gấp lúc 10h sáng thứ Ba.
  - Nếu kho có thẻ trống vào sáng thứ Ba mà hệ thống chỉ xét theo thời gian bấm nút tạo đơn (`createdAt`), thì thẻ sẽ bị cấp cho nhân viên A (trong khi thứ Năm mới đi), làm nhân viên B cần đi ngay lại bị kẹt không có thẻ.
- **Giải pháp đã thống nhất trong thảo luận:**
  - Thêm trường **`Ngày & Giờ đi dự kiến`** (`estimatedStartTime` hoặc `tripDate`) vào form đăng ký của nhân viên ([EmployeeRegisterView.tsx](file:///d:/Project_VCC/Quan%20ly%20the%20taxi/src/components/employee/EmployeeRegisterView.tsx)).
  - Trong hàm `autoAssignCardIfWaitlisted`: Ưu tiên cấp thẻ cho đơn nào có **thời điểm đi gần nhất trong ngày** trước, sau đó mới xét đến thứ tự nộp đơn FIFO.
- **Tình trạng hiện tại trên code:** **CHƯA CODE**. Hiện tại form đăng ký chỉ có `purpose`, `destination`, `clientTag`, và logic tự động cấp thẻ vẫn đang sắp xếp thuần túy theo `createdAt`.

---

## V. CẬP NHẬT MỚI: GIẢI PHÁP ĐỒNG BỘ TIN NHẮN TELEGRAM & CHỐNG TRÀN TIN (ĐÃ HOÀN THÀNH)

- **Vấn đề phát sinh từ người dùng:** Khi hệ thống gửi thông báo duyệt thành viên mới hoặc đơn mượn thẻ tới nhiều Admin/HR qua Telegram:
  - Các tin nhắn xuất hiện riêng lẻ trong chat của từng Admin, đều có các nút bấm `[Duyệt]`, `[Từ chối]`.
  - Khi 1 Admin đã xử lý, tin nhắn của các Admin khác vẫn còn nguyên nút bấm, không biết đơn nào đã duyệt, dẫn đến tình trạng loạn tin nhắn và bấm trùng lặp.
- **Giải pháp kỹ thuật đã triển khai:**
  1. **Message Tracking metadata**: Lưu trữ danh sách `{ chatId, messageId }` của tất cả Admin nhận tin vào Supabase (`msg_track_user_${id}` và `msg_track_req_${id}`).
  2. **Đồng bộ thời gian thực & Gỡ nút bấm (`inline_keyboard: []`)**:
     - Khi bất kỳ Admin nào bấm Duyệt/Từ chối trên **Telegram Bot** HOẶC trên **Mini App**: Hệ thống tự động gọi Telegram API `editMessageText` để cập nhật trực tiếp nội dung tin nhắn của **tất cả** các Admin khác kèm gỡ sạch toàn bộ nút bấm.
     - Tin nhắn được cập nhật rõ: người đã duyệt, thời gian, trạng thái kết quả.
  3. **Loại bỏ tin nhắn spam thừa**: Không gửi thêm các tin nhắn broadcast ("Admin A vừa duyệt...") làm tràn màn hình chat của Admin.
  4. **Chống bấm trùng lặp**: Nếu Admin bấm vào tin nhắn cũ đã xử lý, hệ thống trả lời pop-up cảnh báo và tự động gỡ sạch nút trên tin nhắn đó.

---

## VI. ĐỀ XUẤT LỘ TRÌNH TRIỂN KHAI TIẾP THEO

| Thứ tự | Hạng mục công việc đề xuất | Mức độ ưu tiên | Tệp tin dự kiến thay đổi |
| :---: | :--- | :---: | :--- |
| **Ưu tiên 1** | **Xây dựng tính năng "Cấp thẻ nhanh tại quầy không cần đơn" cho Admin** (Giải quyết triệt để ca khẩn cấp) | ⭐⭐⭐ Rất cao | `AppContext.tsx`, `AdminActionQueueView.tsx`, `AdminInventoryView.tsx` |
| **Ưu tiên 2** | **Thêm Ngày/Giờ đi dự kiến vào form đăng ký & thuật toán ưu tiên cấp thẻ** | ⭐⭐⭐ Rất cao | `types/index.ts`, `EmployeeRegisterView.tsx`, `AppContext.tsx` |
| **Ưu tiên 3** | **Hiển thị Badge cảnh báo thời gian chờ nhận thẻ trên thẻ Admin (Timeline alert)** | ⭐⭐ Cao | `AdminActionQueueView.tsx` |
| **Ưu tiên 4** | **Bổ sung hàm logic Hoàn tác Leader (Undo) vào AppContext** | ⭐⭐ Trung bình | `AppContext.tsx`, `LeaderApprovalsView.tsx` |

