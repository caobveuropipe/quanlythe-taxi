# Dự án quản lý thẻ taxi — yêu cầu BA phiên bản 2

**Cập nhật:** 04/10/2026  
**Trạng thái:** Thiết kế nghiệp vụ và giao diện; chưa triển khai.  
**Nền tảng:** Một Telegram Mini App theo vai trò cho nhân sự, leader, Admin và HR; Telegram Bot để thông báo; Google Sheets lưu dữ liệu. Có **cổng chờ Web Admin** để thiết kế webapp ở giai đoạn sau.

## 1. Thay đổi quyết định

Bộ yêu cầu BA ngày 04/10/2026 **thay thế** các phần trước đây về đặt theo khung giờ, giờ nhận/trả, gia hạn 15/30 phút, cảnh báo quá hạn thời gian, dự báo khả dụng theo lịch, chi phí dự kiến và hạn mức cá nhân/tháng. Lượt sử dụng thẻ bắt đầu khi bàn giao và kết thúc khi HR/Admin xác nhận nhận lại thẻ; phần bill/chi phí có thể còn chờ bổ sung sau đó. **Không giới hạn thời gian sử dụng.** Hạn mức là **mức chi phí tối đa cho mỗi lượt**; vượt mức được cảnh báo để HR quyết định Accept/Reject.

Các nguyên tắc còn hiệu lực: mỗi thẻ có **mã số riêng**; nhân sự không tự chọn mã thẻ; thẻ chỉ ra/vào kho khi người có quyền xác nhận bàn giao/thu hồi; thẻ ngoài kho, mất, hỏng hoặc tạm khóa không phải thẻ trống; thiếu thẻ có thể vào danh sách chờ và HR/Admin chọn người được cấp khi có thẻ. Mỗi thao tác quan trọng có nhật ký.

## 2. Vai trò và ranh giới

| Vai trò | Nơi thao tác | Trách nhiệm |
|---|---|---|
| Nhân sự | Telegram Mini App | Xác minh tài khoản lần đầu, gửi yêu cầu đơn giản, xem trạng thái và mã thẻ đã được giao, nhận thông báo; đưa thẻ và bill cho HR/Admin khi về |
| Leader/TBP | Telegram Mini App, chỉ khi được cấu hình tham gia duyệt | Nhận bot Telegram thông báo đến Telegram ID được gán; duyệt/từ chối yêu cầu của nhân sự thuộc phạm vi phụ trách |
| Admin | Telegram Mini App, khu vực Admin | Duyệt cuối yêu cầu trong mọi cấu hình; quản lý danh sách nhân sự–leader và bật/tắt bước leader; quản lý thẻ/luồng; xem báo cáo chi phí tháng theo người |
| HR/điều phối | Telegram Mini App, khu vực vận hành | Giao/thu thẻ vật lý, nhập bill và chi phí thực tế, kiểm tra OCR, xử lý vượt chi phí bằng Accept/Reject, xử lý mất/hỏng và danh sách chờ |

Admin có thể kiêm quyền HR nếu được phân công; không mặc định mọi tài khoản Admin đều là người đã giao/nhận thẻ vật lý. Tên người và thời điểm xác nhận thực tế luôn được lưu. Leader không được tự duyệt yêu cầu của chính mình; cần leader thay thế hoặc chuyển Admin theo cấu hình.

**Cần làm rõ trước khi triển khai:** người dùng dùng từ “Admin” và “HR” cho các việc khác nhau. Tài liệu tạm tách quyền trong **cùng Mini App**, cho phép một người kiêm nhiệm. Nếu doanh nghiệp muốn một vai trò chung thì gộp menu/quyền mà vẫn giữ nhật ký người thao tác. Cổng Web Admin hiện chỉ là màn hình chờ, **không chuyển các thao tác bắt buộc sang webapp chưa thiết kế**.

## 3. Định danh nhân sự và leader

Lần đầu mở bot/Mini App, nhân sự liên kết Telegram ID với một dòng trong danh sách nhân sự đã được Admin nhập trước. Hệ thống xác minh bằng phương thức do doanh nghiệp chốt, rồi lấy **Tên, Mã nhân sự, Bộ phận** từ danh sách; ba thông tin này được điền sẵn, không cho tự đổi trong biểu mẫu đặt thẻ. Admin quản lý bảng `Mã nhân sự → Telegram ID → Bộ phận → Leader phụ trách → Telegram ID leader → hiệu lực`. Nếu nhân sự chuyển bộ phận hoặc thay leader, Admin cập nhật ánh xạ; đơn mới dùng ánh xạ mới, lịch sử đơn cũ giữ người đã duyệt.

Bot chỉ gửi được thông báo phù hợp sau khi leader đã liên kết/kích hoạt bot. Cần kiểm tra leader còn hiệu lực khi họ bấm nút từ tin nhắn cũ. Một người có thể có quyền nhân sự và leader, nhưng quyền được kiểm tra theo từng thao tác.

## 4. Thông tin và trạng thái một lượt

| Thời điểm | Thông tin bắt buộc | Người nhập/xác nhận |
|---|---|---|
| Đăng ký | Tên, mã nhân sự, bộ phận lấy tự động từ tài khoản; **mục đích dùng thẻ**, **địa điểm gặp**, **khách thuộc nhãn nào** nếu có | Nhân sự; chỉ nhập ba trường sau, trong đó nhãn khách là tùy chọn |
| Duyệt | Người/bước duyệt, kết quả, lý do từ chối, thời điểm | Leader nếu bật; Admin luôn là bước duyệt cuối |
| Bàn giao | Mã số thẻ vật lý, người giao, người nhận, thời điểm | HR hoặc Admin có quyền bàn giao |
| Trả thẻ/chốt bill | Mã thẻ thu hồi, thời điểm, tình trạng thẻ, **điểm đón**, **điểm trả khách**, ảnh bill, số tiền thực tế, cách nhập tay/OCR, người ghi | HR hoặc Admin có quyền thu hồi và nhập chi phí; nhân sự cung cấp thẻ và bill thực tế |
| Vượt mức | Mức chi phí/lượt, số thực tế, phần vượt, quyết định Accept/Reject, lý do, người quyết định | HR |

Các mốc thời gian giao/thu chỉ dùng để ghi lịch sử và gán lượt vào báo cáo; **không dùng để giới hạn thời gian, tính quá hạn hay tự thu hồi thẻ**. Không yêu cầu nhân sự nhập giờ dự kiến hoặc chi phí dự kiến khi đăng ký.

Các trạng thái tối thiểu: **Chờ leader** (chỉ khi bật), **Chờ Admin**, **Đã duyệt – chờ thẻ**, **Đã duyệt – chờ giao**, **Đang giữ thẻ**, **Đã nhận lại – chờ bill/chi phí**, **Chờ HR xử lý vượt mức**, **Hoàn tất**, **Từ chối/Hủy**. Trạng thái kho thẻ tách riêng: **Trong kho – sẵn sàng**, **Đã giữ cho yêu cầu**, **Đã bàn giao**, **Trong kho – không khả dụng**, **Mất**.

## 5. Luồng duyệt và cấp thẻ

1. Nhân sự gửi biểu mẫu tối giản. Hệ thống tra cấu hình tại thời điểm gửi và lưu **phiên bản luồng duyệt** trên yêu cầu để thay đổi cấu hình về sau không làm đổi ngầm yêu cầu đang xử lý.
2. **Bật leader duyệt:** Bot gửi tin riêng đến Telegram ID leader được ánh xạ cho nhân sự kèm các nút tương tác trực tiếp (**Telegram Inline Keyboard**): `[Duyệt]`, `[Từ chối]`, và `[Mở Mini App]`. Leader có thể bấm **Duyệt** hoặc **Từ chối** 1 chạm ngay trên màn hình chat Telegram (qua callback bot mà **không cần mở Mini App**). Tin nhắn bot tự động cập nhật trạng thái đã duyệt/từ chối tức thì. Nút `[Mở Mini App]` chỉ dùng khi Leader cần ghi chú phản hồi, xem lộ trình chi tiết hoặc kiểm tra lịch sử của nhân sự. Nếu duyệt, chuyển Admin. Nếu bật bước leader nhưng thiếu ánh xạ/leader chưa kích hoạt bot, giữ yêu cầu ở trạng thái cần Admin xử lý cấu hình, không tự bỏ qua bước. **Tắt leader duyệt:** gửi thẳng Admin. Không có bước leader ẩn trên màn hình nhân sự khi đã tắt.
3. Admin duyệt/từ chối. Nếu có thẻ trong kho chưa được giữ và dùng được, hệ thống có thể **tự gán mã thẻ dự kiến và giữ thẻ** cho yêu cầu này. Mã dự kiến chỉ phục vụ điều phối; HR xác nhận mã thực giao khi giao vật lý. Nếu không đủ, yêu cầu vào danh sách chờ. HR/Admin chọn người từ danh sách chờ khi thẻ về; hệ thống không tự chọn.
4. HR/Admin kiểm tra thẻ đang ở kho, xác nhận giao thẻ thực tế. Từ lúc đó thẻ không tính là trống. Nhân sự thấy mã thẻ đang giữ và hướng dẫn trả trực tiếp; không có nút tự xác nhận nhận/trả.
5. Khi nhân sự đem thẻ và bill về, HR/Admin xác nhận thu hồi. Thẻ tốt trở lại kho; thẻ hỏng vào trạng thái không khả dụng. Nếu thiếu bill/số tiền, lượt ở trạng thái chờ bổ sung chi phí, nhưng thẻ tốt đã thu hồi vẫn có thể cấp tiếp.

Không có lịch theo giờ để dự báo thẻ sẽ về lúc nào. Giao diện chỉ hiển thị **số thẻ sẵn sàng hiện tại** và trạng thái yêu cầu. Thẻ đã giữ cho yêu cầu khác chưa bàn giao không được tự gán cho đơn mới. Vì không có hạn giờ nhận, việc giải phóng một thẻ đã giữ nhưng người yêu cầu không đến là thao tác Admin/HR có lý do, không dùng quy tắc tự động 15/30 phút cũ.

## 6. Chi phí theo lượt, bill và OCR

Admin cấu hình **mức chi phí tối đa cho một lượt**. Mức này có thể là mức chung hoặc theo rule được chốt sau; nhân sự **không xem hạn mức cá nhân** và không có màn hình xin thêm hạn mức. Không kiểm tra vượt mức ở lúc gửi đơn vì chưa có bill/số tiền thực tế.

Ở bước trả thẻ, HR/Admin nhập **điểm đón, điểm trả khách, số tiền thực tế** và ảnh bill. Có hai cách nhập: (1) nhập tay; (2) chụp/tải ảnh để OCR đề xuất số tiền và thông tin đọc được. **OCR chỉ điền bản nháp**, luôn hiển thị ảnh gốc để người nhập kiểm tra/sửa trước khi lưu. Nếu OCR không đọc được hoặc ảnh mờ, vẫn cho nhập tay. Lưu số OCR gợi ý và số cuối được xác nhận để kiểm tra sai lệch; chống tạo hai khoản chi phí khi tải ảnh hoặc bấm lưu lặp.

Nếu số thực tế **không vượt** mức/lượt: ghi nhận bình thường. Nếu **vượt**: cảnh báo HR, hiển thị mức cho phép, số thực tế và phần vượt. HR bấm **Accept** hoặc **Reject** kèm lý do; lưu người và thời điểm. **Reject không được xóa bill hoặc sửa số tiền thực tế**. Cách xử lý tiền sau Reject (doanh nghiệp chịu, nhân sự hoàn trả, hay đưa vào khoản chờ xử lý) **chưa được chốt** và cần quy định riêng. Báo cáo vẫn phải nhận diện chi phí thực tế đã phát sinh và trạng thái ngoại lệ để không che giấu người dùng nhiều tiền.

## 7. Báo cáo tháng cho Admin

Mục tiêu chính: trong một tháng, **mỗi nhân sự dùng tổng bao nhiêu tiền**, ai dùng nhiều/ít. Màn hình gồm bộ lọc tháng, danh sách nhân sự với mã/bộ phận, số lượt có bill, tổng chi phí thực tế và sắp xếp cao→thấp hoặc thấp→cao. Bấm một người mở danh sách các lượt, mã thẻ, ngày nhận lại, số tiền, điểm đón/trả khách và trạng thái vượt mức. Có tổng toàn công ty và có thể lọc bộ phận. Chi phí chưa có bill hiển thị **thiếu dữ liệu**, không coi là 0 đồng.

Xuất Excel/CSV là tiện ích đề xuất, không phải mục đích chính. Chi phí sự cố mất/hỏng tách khỏi chi phí đi taxi. **Chưa chốt tháng ghi nhận**: đề xuất theo ngày HR xác nhận bill/chi phí hoặc ngày trên bill, cần doanh nghiệp chọn một quy tắc và giữ nhất quán. Với Reject, báo cáo phải có cả số thực tế và số được chấp nhận riêng nếu hai số khác nhau; không được loại âm thầm khoản bị Reject.

## 8. Màn hình tối giản trong Telegram Mini App

Mini App dùng chung phần đăng nhập và dữ liệu, mở các khu vực theo vai trò được cấp. Nhân sự chỉ thấy **Đăng ký · Yêu cầu của tôi**. Leader có thêm **Cần duyệt** khi bước leader bật. Admin có ba mục chính **Việc cần xử lý · Kho thẻ · Báo cáo**; màn hình trả thẻ/bill mở từ lượt đang giữ thẻ, **Thiết lập** nằm trong menu phụ. Người kiêm Admin và HR thấy các nút vận hành HR trong đúng màn hình liên quan. Bản demo có thể có bộ chuyển vai trò ở khu vực riêng, không đưa bộ chuyển này vào sản phẩm thật.

| Vai trò/màn hình | Chỉ hiển thị thông tin cần thiết | Nút |
|---|---|---|
| Nhân sự – Trang chính | Số thẻ sẵn sàng hiện tại; yêu cầu của tôi đang ở bước nào; thẻ đang giữ nếu có | **Đăng ký dùng thẻ**, **Yêu cầu của tôi** |
| Nhân sự – Đăng ký | Tên/mã/bộ phận điền sẵn; mục đích, địa điểm gặp, nhãn khách tùy chọn | **Gửi yêu cầu** |
| Nhân sự – Chi tiết | Trạng thái duyệt; chờ thẻ/chờ giao/đang giữ; mã thẻ thực giao; kết quả chi phí khi HR ghi | **Xem chi tiết**, **Hủy** nếu còn được phép; không có nút trả thẻ, gia hạn thời gian, xem hạn mức |
| Nhân sự – Cá nhân | Tên, mã nhân sự, bộ phận, trạng thái liên kết Telegram | Không cần dashboard chi phí/hạn mức |
| Leader – Việc cần duyệt | Nhân sự, bộ phận, mục đích, địa điểm gặp, nhãn khách | **Duyệt**, **Từ chối** kèm lý do; chỉ hiện nếu bật bước leader và đúng ánh xạ |
| Admin – Chờ duyệt | Yêu cầu, ý kiến leader nếu có, số thẻ sẵn sàng, lịch sử | **Duyệt**, **Từ chối** |
| HR/Admin – Kho và bàn giao | Mã từng thẻ, trạng thái, người đang giữ; yêu cầu đã duyệt/danh sách chờ | **Chọn từ danh sách chờ**, **Xác nhận giao**, **Xác nhận thu hồi**, **Tạm khóa thẻ** |
| HR/Admin – Trả thẻ và bill | Mã thẻ, nhân sự, điểm đón/trả, ảnh bill, số tiền, cảnh báo vượt mức | **Nhập tay**, **Đọc bill OCR**, **Sửa kết quả**, **Lưu**, HR **Accept/Reject** khi vượt |
| Admin – Báo cáo | Bộ lọc tháng/bộ phận, số lượt và tổng chi phí từng người, sắp xếp cao/thấp | **Xem chi tiết**, **Xuất** nếu cần |
| Admin – Thiết lập | Bật/tắt leader duyệt, ánh xạ nhân sự–leader–Telegram ID, mức chi phí/lượt, danh mục thẻ và nhân sự | **Lưu cấu hình**, **Ngừng hiệu lực/chuyển leader** |
| Admin – Cổng Web Admin | Tên cổng, mô tả “Sẽ thiết kế webapp quản trị sau”, các nhóm chức năng dự kiến và trạng thái chưa triển khai | **Xem phạm vi dự kiến**; nút mở web chỉ khả dụng khi URL webapp thật được cấu hình về sau |

Bot Telegram gửi thông báo: yêu cầu mới cho leader **chỉ khi bật bước leader**, cho Admin khi đến lượt; kết quả duyệt cho nhân sự; thẻ đã sẵn sàng/chờ thẻ; sau khi HR ghi chi phí và quyết định vượt mức. Không gửi cảnh báo theo giờ sử dụng hay giờ trả.

### 8.1. Cổng chờ Web Admin

Cổng chờ nằm trong menu phụ Admin của Mini App, hiển thị **“Web Admin — đang chờ thiết kế”** và ba nhóm dự kiến: quản lý dữ liệu số lượng lớn, nhập/xuất danh sách nhân sự–thẻ, báo cáo chi tiết. Không tạo trang web giả trông như đã hoạt động, không dẫn tới liên kết rỗng và không yêu cầu Admin sang web để hoàn tất luồng hiện tại. Khi webapp được xây sau, cổng có thể mở URL thật; webapp phải dùng cùng quyền và nguồn dữ liệu với Mini App.

## 9. Dữ liệu Google Sheets đề xuất

| Tab | Trường chính |
|---|---|
| `NHAN_SU` | Mã, tên, bộ phận, Telegram ID đã xác minh, trạng thái |
| `PHAN_CONG_LEADER` | Mã nhân sự/bộ phận, mã leader, Telegram ID leader, hiệu lực |
| `CAU_HINH` | Có/không bước leader, mức chi phí/lượt/rule, ngày hiệu lực |
| `THE` | Mã thẻ duy nhất, tình trạng, vị trí kho/ngoài kho, người đang giữ |
| `YEU_CAU` | Mã yêu cầu, nhân sự, mục đích, địa điểm gặp, nhãn khách, phiên bản luồng duyệt, trạng thái |
| `DUYET` | Mã yêu cầu, bước leader/Admin, người duyệt, quyết định, lý do, thời điểm |
| `BAN_GIAO` | Mã yêu cầu/thẻ, người giao/nhận, giờ giao/thu hồi, tình trạng khi trả |
| `BILL_CHI_PHI` | Mã lượt, điểm đón/trả, ảnh bill, số OCR gợi ý, số tiền đã xác nhận, nguồn nhập, ngày ghi nhận |
| `VUOT_MUC` | Mức/lượt, thực tế, phần vượt, HR Accept/Reject, lý do, hướng xử lý tiền |
| `SU_CO` | Mất/hỏng, thẻ, người đang giữ, HR kết luận, tình trạng khóa/sửa/thay |
| `THONG_BAO`, `NHAT_KY` | Người nhận/trạng thái gửi và lịch sử thao tác trước/sau |

Các màn hình gọi chung một bộ xử lý nghiệp vụ; không ghi tùy ý trực tiếp vào Sheets từ trình duyệt. Quyền được kiểm tra phía máy chủ. Kiểm tra và ghi giữ thẻ/bàn giao/thu hồi dưới khóa để không cấp cùng thẻ cho hai lượt. Mã bản ghi ổn định; thao tác gửi lại/bấm lặp không tạo đơn hoặc bill trùng. Ảnh bill cần nơi lưu tệp được phân quyền; trong Sheets chỉ lưu tham chiếu và metadata, không nhét ảnh vào ô.

## 10. Tình huống nghiệm thu

- Cấu hình không cần leader: nhân sự gửi → Admin nhận thông báo/duyệt; không có bước leader trên giao diện.
- Cấu hình cần leader: đúng Telegram ID của leader được báo → leader duyệt → Admin duyệt; leader cũ không duyệt được qua tin nhắn cũ.
- Đủ thẻ: hệ thống giữ một mã thẻ duy nhất sau duyệt, HR/Admin xác nhận mã thực giao; thiếu thẻ: vào danh sách chờ, HR/Admin chọn người.
- Thẻ chưa thu hồi không tính vào kho; không có cảnh báo quá hạn thời gian.
- Trả thẻ có bill: nhập tay hoặc OCR → người nhập kiểm tra/sửa → lưu đúng một khoản chi phí thực tế.
- Vượt mức/lượt: HR nhìn thấy số vượt và Accept/Reject có lý do; Reject vẫn giữ bill và chi phí thực tế.
- Báo cáo tháng xếp người nhiều/ít theo chi phí thực tế; lượt thiếu bill không bị tính là 0; không công khai hạn mức cá nhân trên Mini App.
- Admin hoàn tất duyệt, giao/thu thẻ nếu có quyền HR, bill/OCR, xử lý vượt mức và xem báo cáo ngay trong Mini App; cổng Web Admin thể hiện rõ chưa triển khai và không có liên kết hỏng.

## 11. Câu hỏi còn cần doanh nghiệp chốt

| Câu hỏi | Vì sao cần chốt |
|---|---|
| Admin và HR là hai nhóm người riêng hay cùng một người kiêm nhiệm trong thực tế? Ai được giao/thu thẻ và tải bill? | Quyền, màn hình và nhật ký |
| Mức chi phí/lượt là một mức chung hay thay đổi theo bộ phận, mục đích, nhãn khách? Mức cụ thể bao nhiêu? | Cấu hình cảnh báo vượt mức |
| Sau HR **Reject** phần vượt, khoản tiền được xử lý thế nào? | Báo cáo và quyết toán phải phản ánh số thực tế lẫn số được chấp nhận |
| Tháng chi phí tính theo ngày trên bill, ngày trả thẻ hay ngày HR xác nhận số tiền? | Tổng tháng của từng người và giao dịch đến muộn |
| Nếu một nhân sự thuộc nhiều bộ phận/leader hoặc leader vắng mặt, chuyển duyệt cho ai? | Tránh yêu cầu chờ vô hạn |
| Khi đã duyệt nhưng nhân sự không đến lấy thẻ, ai được hủy/giải phóng thẻ đang giữ? | Không còn thời hạn tự động theo giờ |
| Bill thiếu/không đọc được, có bắt buộc phải có ảnh trước khi hoàn tất không? | Trạng thái chờ bill và tính đầy đủ báo cáo |

## 12. Nhật ký quyết định

| Ngày | Quyết định |
|---|---|
| 24–28/09/2026 | Bản đầu thiết kế theo khung giờ, duyệt TBP→HR, gia hạn 15/30 phút, hạn mức theo rule và báo cáo mở rộng |
| 04/10/2026 | BA thay bằng duyệt leader tùy chọn, Admin luôn duyệt; không giới hạn thời gian, chỉ kiểm soát chi phí/lượt dựa bill; HR xử lý vượt mức Accept/Reject |
| 04/10/2026 | Biểu mẫu nhân sự chỉ có thông tin định danh tự điền, mục đích, địa điểm gặp, nhãn khách tùy chọn; trả thẻ và chi phí có điểm đón/trả, bill nhập tay/OCR |
| 04/10/2026 | Mini App cá nhân tối giản, không hiển thị hạn mức cá nhân; báo cáo Admin tập trung tổng chi phí tháng theo người, nhiều/ít; thông báo leader gửi đến Telegram ID trong danh sách ánh xạ |
| 04/10/2026 | Chuyển giao diện Admin và HR sang Telegram Mini App theo quyền; thêm cổng chờ Web Admin để thiết kế webapp ở giai đoạn sau, không để luồng hiện tại phụ thuộc cổng chờ |
