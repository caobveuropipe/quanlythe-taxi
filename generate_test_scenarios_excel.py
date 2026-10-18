# -*- coding: utf-8 -*-
"""
Script tạo file Excel kịch bản kiểm thử toàn bộ luồng Quản lý thẻ Taxi
Đã cập nhật theo cấu trúc thống nhất:
Luồng chính gồm 5 khâu:
  Khâu 1: User Đăng ký
  Khâu 2: Admin duyệt (Duyệt thẳng HOẶC Yêu cầu Leader duyệt)
  Khâu 3: Leader duyệt (Nếu được yêu cầu)
  Khâu 4: Bàn giao thẻ
  Khâu 5: Trả thẻ & Nhập bill
Cùng 5 luồng nhánh/ngoại lệ đặc thù.
"""
import xlsxwriter
import os

output_path = os.path.join(os.path.dirname(__file__), "KICH_BAN_TEST_LUONG_TAXI.xlsx")
wb = xlsxwriter.Workbook(output_path)

# Định dạng màu sắc & style chuẩn báo cáo doanh nghiệp
header_format = wb.add_format({
    'bold': True,
    'bg_color': '#1E3A8A', # Deep blue
    'font_color': '#FFFFFF',
    'align': 'center',
    'valign': 'vcenter',
    'text_wrap': True,
    'border': 1,
    'font_name': 'Arial',
    'font_size': 10
})

sub_header_format = wb.add_format({
    'bold': True,
    'bg_color': '#DBEAFE', # Light blue
    'font_color': '#1E3A8A',
    'align': 'left',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 11
})

title_format = wb.add_format({
    'bold': True,
    'font_size': 14,
    'font_color': '#1E3A8A',
    'valign': 'vcenter',
    'font_name': 'Arial'
})

subtitle_format = wb.add_format({
    'italic': True,
    'font_size': 9,
    'font_color': '#475569',
    'font_name': 'Arial'
})

cell_center = wb.add_format({
    'align': 'center',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 9,
    'text_wrap': True
})

cell_left = wb.add_format({
    'align': 'left',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 9,
    'text_wrap': True
})

cell_bold_left = wb.add_format({
    'bold': True,
    'align': 'left',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 9,
    'text_wrap': True
})

tag_telegram = wb.add_format({
    'bg_color': '#E0F2FE',
    'font_color': '#0369A1',
    'bold': True,
    'align': 'center',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 9
})

tag_miniapp = wb.add_format({
    'bg_color': '#FEF3C7',
    'font_color': '#B45309',
    'bold': True,
    'align': 'center',
    'valign': 'vcenter',
    'border': 1,
    'font_name': 'Arial',
    'font_size': 9
})

# ==============================================================================
# SHEET 1: DANH MỤC CÁC LUỒNG
# ==============================================================================
ws1 = wb.add_worksheet("1_Danh_Muc_Cac_Luong")
ws1.set_tab_color('#2563EB')

ws1.merge_range("A1:G1", "BẢNG DANH MỤC CÁC LUỒNG NGHIỆP VỤ - HỆ THỐNG QUẢN LÝ THẺ TAXI", title_format)
ws1.write("A2", "Dự án Quản lý thẻ taxi VCC | Khâu 2 linh hoạt: Admin duyệt thẳng HOẶC Yêu cầu Leader duyệt", subtitle_format)

headers_1 = [
    "STT",
    "Mã Luồng",
    "Tên Luồng Nghiệp Vụ",
    "Bản Chất & Khâu Vận Hành",
    "Những Ai Tham Gia?",
    "Các Khâu Cụ Thể",
    "Kết Quả Cuối Cùng"
]

for col_idx, h in enumerate(headers_1):
    ws1.write(3, col_idx, h, header_format)

flows_data = [
    (
        1,
        "FLOW-01",
        "LUỒNG CHÍNH: MƯỢN - CẤP - TRẢ THẺ\n(Bao gồm 5 khâu chuẩn)",
        "Là luồng cốt lõi của hệ thống. Tại Khâu 2, Admin có 2 lựa chọn:\n• Nhánh 1A: Admin duyệt thẳng -> Chuyển giao thẻ.\n• Nhánh 1B: Admin yêu cầu Leader duyệt -> Leader duyệt xong -> Chuyển giao thẻ.",
        "1. User (Nhân sự)\n2. Admin (Tiếp nhận & Quyết định)\n3. Leader (Duyệt nếu được yêu cầu)\n4. HR/Điều phối (Giao/Thu thẻ)",
        "Khâu 1: User Đăng ký\nKhâu 2: Admin duyệt (Duyệt thẳng hoặc Yêu cầu Leader)\nKhâu 3: Leader duyệt (Nếu Admin yêu cầu)\nKhâu 4: Bàn giao thẻ vật lý\nKhâu 5: Trả thẻ & Nhập bill",
        "Hoàn tất (completed). Thẻ tốt trở về kho sẵn sàng cấp tiếp. Dữ liệu chi phí chuyến đi được lưu đầy đủ."
    ),
    (
        2,
        "FLOW-02",
        "Luồng Hết Thẻ Trong Kho\n(Waitlist & Cấp bù)",
        "Khi Admin duyệt đơn nhưng kho thẻ có 0 thẻ sẵn sàng. Đơn được xếp vào Danh sách chờ; khi thẻ về kho, HR/Admin chủ động chọn người để cấp bù.",
        "1. User (Yêu cầu)\n2. Admin (Duyệt đưa vào Waitlist)\n3. HR/Admin (Chủ động chọn cấp khi có thẻ)\n4. HR (Giao/Thu thẻ)",
        "Khâu 1: User đăng ký\nKhâu 2: Admin duyệt đưa vào Waitlist\nKhâu 3: Cấp thẻ bù thủ công từ Waitlist\nKhâu 4: Bàn giao thẻ\nKhâu 5: Trả thẻ & Bill",
        "Hoàn tất (completed). Không làm trôi đơn của nhân sự; kiểm soát thứ tự ưu tiên minh bạch."
    ),
    (
        3,
        "FLOW-03",
        "Luồng Từ Chối & Hủy Đơn\n(Admin / Leader / User hủy)",
        "Đơn bị từ chối do không hợp lệ, không đúng mục đích công tác, hoặc User chủ động hủy đơn khi đối tác dời lịch họp.",
        "User + Người từ chối (Admin hoặc Leader)",
        "• Nhánh A: Admin từ chối tại Khâu 2\n• Nhánh B: Leader từ chối tại Khâu 3\n• Nhánh C: User tự hủy tại Khâu 1",
        "Kết thúc đơn (rejected_admin / rejected_leader / cancelled). Lưu lý do giải trình, thẻ kho (nếu có giữ) được giải phóng ngay."
    ),
    (
        4,
        "FLOW-04",
        "Luồng Thu Thẻ Thiếu Hóa Đơn\n(Thiếu dữ liệu bill)",
        "User trả lại thẻ vật lý đúng hẹn để người khác kịp dùng, nhưng chưa lấy được hóa đơn/chưa có số tiền cụ thể.",
        "1. User (Trả thẻ, nợ bill)\n2. HR (Thu thẻ vào kho, tích 'Thiếu dữ liệu')\n3. User/HR (Bổ sung bill sau)",
        "Khâu 1-4: Như luồng chính\nKhâu 5: Thu thẻ vật lý (thẻ vào kho ngay, đơn ở returned_pending_bill)\nKhâu bổ sung: Nhập số tiền & bill sau",
        "Thẻ vật lý không bị giam giữ; đơn chuyển sang completed sau khi bổ sung đầy đủ hóa đơn."
    ),
    (
        5,
        "FLOW-05",
        "Luồng Chi Phí Vượt Hạn Mức\n(HR Thẩm định Over-budget)",
        "Số tiền cước taxi thực tế trên hóa đơn vượt mức tối đa quy định/lượt (> 500.000 VNĐ). Yêu cầu HR có thẩm quyền thẩm định.",
        "1. User (Nộp bill vượt trần)\n2. HR thu thẻ (Nhập số tiền vượt, hệ thống cảnh báo)\n3. HR Thẩm quyền (Accept hoặc Reject)",
        "Khâu 1-4: Như luồng chính\nKhâu 5: Thu thẻ & nhập chi phí phát hiện vượt trần\nKhâu 6: HR xem xét bấm Accept / Reject",
        "Hoàn tất (completed). Số tiền thực tế VẪN ĐƯỢC LƯU VĨNH VIỄN theo luật kế toán, kèm ghi chú quyết định của HR."
    ),
    (
        6,
        "FLOW-06",
        "Luồng Giải Phóng Thẻ Đã Giữ\n(User không đến nhận thẻ)",
        "Đơn đã duyệt và giữ trước mã thẻ kho, nhưng User bị hoãn lịch hoặc không đến nhận thẻ vật lý.",
        "1. User (Không đến nhận)\n2. HR hoặc Admin (Thao tác giải phóng)",
        "Xảy ra giữa Khâu 3 và Khâu 4:\nHủy lệnh giữ thẻ, đưa thẻ trở lại kho sẵn sàng.",
        "Thẻ vật lý lập tức sẵn sàng cho người khác mượn. Đơn chuyển trạng thái card_released kèm lý do."
    )
]

for row_idx, f in enumerate(flows_data, start=4):
    ws1.write(row_idx, 0, f[0], cell_center)
    ws1.write(row_idx, 1, f[1], cell_bold_left)
    ws1.write(row_idx, 2, f[2], cell_bold_left)
    ws1.write(row_idx, 3, f[3], cell_left)
    ws1.write(row_idx, 4, f[4], cell_left)
    ws1.write(row_idx, 5, f[5], cell_left)
    ws1.write(row_idx, 6, f[6], cell_left)

ws1.set_column(0, 0, 6)
ws1.set_column(1, 1, 12)
ws1.set_column(2, 2, 28)
ws1.set_column(3, 3, 36)
ws1.set_column(4, 4, 30)
ws1.set_column(5, 5, 32)
ws1.set_column(6, 6, 30)
ws1.set_row(3, 28)
for r in range(4, 4 + len(flows_data)):
    ws1.set_row(r, 70)

# ==============================================================================
# SHEET 2: KỊCH BẢN CHI TIẾT TỪNG BƯỚC
# ==============================================================================
ws2 = wb.add_worksheet("2_Kich_Ban_Chi_Tiet_Tung_Buoc")
ws2.set_tab_color('#16A34A')

ws2.merge_range("A1:K1", "KỊCH BẢN KIỂM THỬ CHI TIẾT THEO 5 KHÂU CHUẨN - TRẢ LỜI ĐẦY ĐỦ 3 CÂU HỎI", title_format)
ws2.write("A2", "Chi tiết: Ai tham gia? Khâu nào? Nhận tin gì? Ở đâu? Thao tác gì? Ở đâu? Thao tác như thế nào?", subtitle_format)

headers_2 = [
    "Mã Test Case",
    "Thuộc Luồng",
    "Khâu Thực Hiện",
    "Ai Tham Gia?",
    "Nhận Thông Tin Gì? (Nội Dung Nhận)",
    "Nhận Ở Đâu?",
    "Thao Tác Tiếp Theo Là Gì?",
    "Thao Tác Ở Đâu?",
    "Thao Tác Như Thế Nào? (Từng Click/Input)",
    "Kết Quả Mong Đợi",
    "Trạng Thái Hệ Thống"
]

for col_idx, h in enumerate(headers_2):
    ws2.write(3, col_idx, h, header_format)

scenarios = [
    # LUỒNG CHÍNH - NHÁNH 1A (ADMIN DUYỆT THẲNG)
    (
        "TC_MAIN_01",
        "FLOW-01 (Nhánh 1A)",
        "Khâu 1: User Đăng ký",
        "User\n(Nguyễn Văn A)",
        "Mở Mini App thấy thông tin cá nhân (Tên, Mã NV, Bộ phận) đã điền sẵn; thấy số thẻ sẵn sàng trong kho hiện tại.",
        "Mini App\n(Tab Đăng ký)",
        "Nhập thông tin công tác và gửi đơn mượn thẻ",
        "Mini App\n(Màn hình Đăng ký)",
        "1. Nhập 'Mục đích dùng thẻ' (bắt buộc)\n2. Nhập 'Địa điểm gặp/di chuyển' (bắt buộc)\n3. Chọn 'Nhãn khách' (tùy chọn)\n4. Bấm nút [Gửi yêu cầu mượn thẻ]",
        "Tạo thành công đơn REQ-xxx. Đơn chuyển tới hàng chờ của Admin.",
        "pending_admin\n(Chờ Admin duyệt)"
    ),
    (
        "TC_MAIN_02A",
        "FLOW-01 (Nhánh 1A)",
        "Khâu 2: Admin duyệt thẳng",
        "Admin\n(Lê Hoàng Nam)",
        "Thấy đơn của Nguyễn Văn A trong danh sách chờ duyệt. Thấy mã thẻ kho sẵn sàng dự kiến (VD: TAXI-01).",
        "Mini App\n(Tab Admin - Hàng chờ)",
        "Admin quyết định duyệt thẳng (không cần Leader)",
        "Mini App\n(Khung Chờ duyệt)",
        "1. Xem thông tin đơn\n2. Bấm trực tiếp nút [Duyệt yêu cầu]\n(Hệ thống tự động khóa giữ thẻ TAXI-01)",
        "Admin duyệt thẳng thành công. Thẻ TAXI-01 chuyển sang 'reserved'. Bỏ qua bước Leader.",
        "pending_handover\n(Chờ bàn giao thẻ)"
    ),
    (
        "TC_MAIN_03A",
        "FLOW-01 (Nhánh 1A)",
        "Khâu 4: Bàn giao thẻ",
        "HR / Điều phối\n(Phạm Thu Hà)",
        "Nhận đơn REQ-xxx ở mục 'Chờ bàn giao thẻ'. Mã thẻ gợi ý sẵn TAXI-01. User đến quầy nhận thẻ.",
        "Mini App & Trực tiếp tại quầy",
        "Xác nhận bàn giao thẻ vật lý cho User",
        "Mini App\n(Thẻ đơn cần giao)",
        "1. Lấy thẻ TAXI-01 trong ngăn kéo\n2. Bấm [Xác nhận đã giao thẻ cho NV]",
        "Thẻ chuyển sang in_use. Ghi nhận người giao và thời gian giao thực tế.",
        "holding_card\n(Đang giữ thẻ)"
    ),
    (
        "TC_MAIN_04A",
        "FLOW-01 (Nhánh 1A)",
        "Khâu 5: Trả thẻ & Nhập bill",
        "HR / Điều phối\n(Phạm Thu Hà)",
        "User đi công tác về, nộp lại thẻ vật lý TAXI-01 và hóa đơn cước taxi.",
        "Trực tiếp tại quầy",
        "Kiểm tra tình trạng thẻ và nhập chi phí chuyến đi",
        "Mini App\n(Modal Thu thẻ & Bill)",
        "1. Bấm [Thu hồi thẻ & Bill] tại đơn REQ-xxx\n2. Chọn tình trạng thẻ: [Tốt - Sẵn sàng dùng tiếp]\n3. Nhập Điểm đón, Điểm trả\n4. Nhập Số tiền thực tế (VD: 245.000 đ) hoặc tải ảnh bill để OCR gợi ý\n5. Bấm [Lưu & Hoàn tất]",
        "Thẻ TAXI-01 trở về available trong kho ngay. Chi phí hợp lệ (<= 500k). Đơn hoàn tất.",
        "completed\n(Hoàn tất)"
    ),

    # LUỒNG CHÍNH - NHÁNH 1B (ADMIN YÊU CẦU LEADER DUYỆT)
    (
        "TC_MAIN_02B",
        "FLOW-01 (Nhánh 1B)",
        "Khâu 2: Admin yêu cầu Leader duyệt",
        "Admin\n(Lê Hoàng Nam)",
        "Thấy đơn của Nguyễn Văn A. Xét thấy chuyến đi xa/đặc biệt, cần quản lý trực tiếp xác nhận trước.",
        "Mini App\n(Tab Admin - Hàng chờ)",
        "Admin bấm chuyển đơn sang cho Leader duyệt",
        "Mini App\n(Khung Chờ duyệt)",
        "1. Mở chi tiết đơn REQ-xxx\n2. Bấm nút [Yêu cầu Leader duyệt]\n(Hệ thống gửi tin nhắn bot Telegram đến Leader Bích Trần)",
        "Đơn chuyển sang trạng thái chờ Leader duyệt. Bot Telegram gửi thông báo riêng cho Leader.",
        "pending_leader\n(Chờ Leader duyệt)"
    ),
    (
        "TC_MAIN_02B_L",
        "FLOW-01 (Nhánh 1B)",
        "Khâu 3: Leader duyệt",
        "Leader\n(Trần Thị Bích)",
        "Nhận tin nhắn Telegram bot riêng: Tóm tắt Mã đơn, Nhân sự, Điểm đến, Khách kèm 3 nút: [Duyệt], [Từ chối], [Mở app].",
        "Tin nhắn chat Telegram\n(Bot riêng)",
        "Duyệt 1 chạm trực tiếp trên Telegram (Không mở app)",
        "Màn hình chat Telegram\n(Bong bóng chat)",
        "1. Đọc nhanh thông tin trên chat Telegram\n2. Bấm thẳng nút inline [Duyệt] màu xanh lá\n(Nếu cần xem thêm hồ sơ mới bấm [Mở app])",
        "Tin nhắn chat Telegram tự sửa thành 'Đã duyệt bởi Leader Bích Trần lúc...'. Đơn chuyển lại Admin duyệt cuối/giao thẻ.",
        "pending_handover\n(Đã duyệt - Chờ giao thẻ)"
    ),
    (
        "TC_MAIN_03B",
        "FLOW-01 (Nhánh 1B)",
        "Khâu 4: Bàn giao thẻ",
        "HR & User",
        "Nhân sự nhận tin báo đến lấy thẻ. HR thấy đơn đã đủ điều kiện giao thẻ.",
        "Mini App & Trực tiếp",
        "Bàn giao thẻ vật lý thực tế",
        "Mini App & Trực tiếp",
        "HR lấy thẻ vật lý đưa User -> Bấm [Xác nhận đã giao thẻ].",
        "Thẻ chuyển in_use. User đang giữ thẻ.",
        "holding_card"
    ),
    (
        "TC_MAIN_04B",
        "FLOW-01 (Nhánh 1B)",
        "Khâu 5: Trả thẻ & Nhập bill",
        "HR & User",
        "User về nộp lại thẻ và bill cho HR.",
        "Trực tiếp tại quầy",
        "Thu thẻ vào kho và nhập chi phí",
        "Mini App",
        "HR chọn thẻ tốt -> Nhập số tiền bill -> Bấm [Lưu & Hoàn tất].",
        "Thẻ trở lại kho sẵn sàng. Đơn hoàn tất.",
        "completed"
    ),

    # FLOW 02: HẾT THẺ (WAITLIST)
    (
        "TC_F02_01",
        "FLOW-02: Hết thẻ",
        "Khâu 2: Duyệt khi kho 0 thẻ",
        "Admin\n(Lê Hoàng Nam)",
        "Có đơn cần duyệt nhưng kho báo '0 thẻ sẵn sàng'.",
        "Mini App\n(Tab Admin)",
        "Duyệt đơn và đưa vào danh sách chờ",
        "Mini App",
        "1. Bấm [Duyệt yêu cầu]\n2. Popup thông báo: 'Kho hết thẻ, đưa vào Danh sách chờ (Waitlist)'",
        "Đơn vào hàng đợi chờ thẻ. Không tự gán thẻ bừa bãi.",
        "waitlist_cards\n(Chờ thẻ)"
    ),
    (
        "TC_F02_02",
        "FLOW-02: Hết thẻ",
        "Khâu cấp bù từ Waitlist",
        "HR / Điều phối\n(Phạm Thu Hà)",
        "Một xe khác về trả thẻ TAXI-02 -> Kho có 1 thẻ sẵn sàng.",
        "Mini App\n(Tab Danh sách chờ thẻ)",
        "Chủ động chọn người để cấp thẻ bù",
        "Mini App\n(Tab Waitlist)",
        "1. Mở danh sách chờ thẻ\n2. Chọn nhân sự cần ưu tiên cấp trước\n3. Chọn mã thẻ TAXI-02 -> Bấm [Cấp thẻ cho nhân sự này]",
        "Thẻ TAXI-02 được gán giữ. Đơn chuyển sang chờ giao thẻ.",
        "pending_handover\n(Chờ giao thẻ)"
    ),

    # FLOW 03: TỪ CHỐI / HỦY
    (
        "TC_F03_01",
        "FLOW-03: Từ chối / Hủy",
        "Nhánh Admin từ chối",
        "Admin\n(Lê Hoàng Nam)",
        "Xem đơn tại Khâu 2 thấy không hợp lệ / sai mục đích.",
        "Mini App\n(Tab Admin)",
        "Từ chối yêu cầu kèm lý do",
        "Mini App",
        "1. Bấm nút [Từ chối yêu cầu]\n2. Nhập lý do từ chối -> Xác nhận",
        "Đơn bị từ chối. Lưu lý do, thông báo về cho User.",
        "rejected_admin"
    ),
    (
        "TC_F03_02",
        "FLOW-03: Từ chối / Hủy",
        "Nhánh Leader từ chối",
        "Leader\n(Trần Thị Bích)",
        "Nhận tin bot Telegram khi Admin yêu cầu duyệt (Khâu 3).",
        "Tin nhắn chat Telegram",
        "Bấm [Từ chối] 1 chạm ngay trên Telegram",
        "Màn hình chat Telegram",
        "1. Bấm nút inline [Từ chối] màu đỏ ngay trong chat Telegram",
        "Tin nhắn chat Telegram tự sửa thành 'Đã từ chối bởi Leader'. Đơn kết thúc.",
        "rejected_leader"
    ),
    (
        "TC_F03_03",
        "FLOW-03: Từ chối / Hủy",
        "Nhánh User tự hủy",
        "User\n(Nguyễn Văn A)",
        "Đơn vừa gửi đi, đối tác dời lịch họp nên không cần mượn thẻ nữa.",
        "Mini App\n(Tab Yêu cầu của tôi)",
        "Chủ động hủy đơn",
        "Mini App",
        "1. Mở đơn của mình -> Bấm nút [Hủy yêu cầu này]\n2. Nhập lý do (tùy chọn) -> Xác nhận",
        "Đơn bị hủy. Giải phóng thẻ kho dự kiến nếu có giữ.",
        "cancelled"
    ),

    # FLOW 04: THIẾU HÓA ĐƠN
    (
        "TC_F04_01",
        "FLOW-04: Thiếu hóa đơn",
        "Khâu 5: Thu thẻ thiếu bill",
        "HR / Điều phối\n(Phạm Thu Hà)",
        "User trả lại thẻ vật lý đúng hẹn nhưng chưa lấy được hóa đơn VAT.",
        "Trực tiếp tại quầy",
        "Thu hồi thẻ vào kho trước, đánh dấu nợ bill",
        "Mini App\n(Modal Thu thẻ & Bill)",
        "1. Chọn tình trạng thẻ: [Tốt]\n2. Điền điểm đón, điểm trả\n3. Tích chọn checkbox: ☑ 'Chưa có hóa đơn / Thiếu dữ liệu chi phí'\n4. Bấm [Xác nhận thu hồi thẻ]",
        "Thẻ vật lý LẬP TỨC TRỞ VỀ KHO available (không bị giam thẻ). Đơn chuyển trạng thái thiếu dữ liệu.",
        "returned_pending_bill\n(Thiếu dữ liệu)"
    ),
    (
        "TC_F04_02",
        "FLOW-04: Thiếu hóa đơn",
        "Khâu bổ sung bill sau",
        "HR / User",
        "User gửi lại ảnh hóa đơn điện tử sau đó.",
        "Zalo/Email/Trực tiếp",
        "Cập nhật bổ sung số tiền và ảnh bill",
        "Mini App\n(Mục Đơn thiếu hóa đơn)",
        "1. Tìm đơn REQ-xxx ở mục Thiếu dữ liệu\n2. Bấm [Bổ sung bill & số tiền]\n3. Nhập số tiền thực tế & đính kèm ảnh -> Bấm Lưu",
        "Đơn cập nhật đầy đủ chi phí và hoàn tất.",
        "completed"
    ),

    # FLOW 05: VƯỢT HẠN MỨC
    (
        "TC_F05_01",
        "FLOW-05: Vượt hạn mức",
        "Khâu 5: Phát hiện vượt mức",
        "HR / Điều phối\n(Phạm Thu Hà)",
        "User nộp bill taxi đi đường dài 720.000 đ (Hạn mức quy định là 500.000 đ).",
        "Mini App\n(Modal Thu thẻ & Bill)",
        "Nhập số tiền và phát hiện vượt trần",
        "Mini App",
        "1. Nhập số tiền: 720.000 đ\n2. Hệ thống báo: Vượt 220.000 đ (> 500.000 đ)\n3. Bấm [Lưu thông tin & Chuyển HR duyệt vượt mức]",
        "Thẻ vật lý vẫn về kho. Đơn chuyển sang chờ HR thẩm định.",
        "overbudget_pending_hr\n(Chờ duyệt vượt mức)"
    ),
    (
        "TC_F05_02",
        "FLOW-05: Vượt hạn mức",
        "Khâu 6: HR duyệt vượt mức",
        "HR Thẩm quyền / Admin\n(Lê Hoàng Nam)",
        "Thấy đơn cảnh báo vượt 220.000 đ tại mục Vận hành.",
        "Mini App\n(Tab HR - Cảnh báo vượt mức)",
        "Thẩm định bill và ra quyết định",
        "Mini App",
        "Lựa chọn 1: Bấm [Accept - Duyệt chi] -> Nhập lý do (VD: Đi ngoại thành chỉ đạo GD).\nLựa chọn 2: Bấm [Reject - Từ chối] -> Nhập lý do (VD: Tự bù tiền vượt mức).",
        "Đơn hoàn tất. SỐ TIỀN THỰC TẾ 720.000 đ VẪN ĐƯỢC LƯU VĨNH VIỄN theo luật kế toán.",
        "completed"
    ),

    # FLOW 06: GIẢI PHÓNG THẺ THEO TIMELINE CẢNH BÁO
    (
        "TC_F06_01",
        "FLOW-06: Cảnh báo Timeline 1",
        "Khâu 4: Sau 30p chưa nhận",
        "Hệ thống (Bot) &\nUser (Nguyễn Văn A)",
        "Đơn REQ-xxx đã duyệt giữ thẻ TAXI-01 được 30 phút nhưng User chưa đến quầy nhận.",
        "Tin nhắn chat Telegram\n(Bot @TaxicardBot)",
        "Gửi tin nhắn nhắc nhở User lần 1",
        "Khung chat Telegram",
        "Hệ thống tự động kích hoạt gửi tin: '⏰ Nhắc nhở lần 1: Thẻ TAXI-01 của bạn đã sẵn sàng tại phòng Hành chính được 30 phút. Vui lòng đến nhận để kịp giờ di chuyển.'",
        "User nhận được tin nhắc nhở. Đơn vẫn giữ nguyên trạng thái pending_handover.",
        "pending_handover\n(Chờ giao thẻ)"
    ),
    (
        "TC_F06_02",
        "FLOW-06: Cảnh báo Timeline 2",
        "Khâu 4: Sau 60p chưa nhận",
        "Hệ thống (Bot) &\nUser (Nguyễn Văn A)",
        "Đã 60 phút trôi qua kể từ khi duyệt, User vẫn chưa đến quầy lấy thẻ.",
        "Tin nhắn chat Telegram\n(Bot @TaxicardBot)",
        "Gửi tin nhắn cảnh báo User lần 2 (chuẩn bị hủy)",
        "Khung chat Telegram",
        "Hệ thống tự động kích hoạt gửi tin: '⚠️ Cảnh báo lần 2: Đã 60 phút bạn chưa đến nhận thẻ. Bạn còn 30 phút nữa để đến nhận trước khi thẻ bị giải phóng về kho!'",
        "User nhận cảnh báo khẩn. Thẻ đơn trên Mini App nhấp nháy cảnh báo sắp hết hạn giữ thẻ.",
        "pending_handover\n(Cảnh báo sắp hết hạn)"
    ),
    (
        "TC_F06_03",
        "FLOW-06: Giải phóng thẻ",
        "Khâu 4: Quá 90p không nhận",
        "HR hoặc Hệ thống &\nUser (Nguyễn Văn A)",
        "Quá 90 phút (1 tiếng rưỡi) kể từ khi duyệt thẻ, User không đến nhận và không phản hồi.",
        "Mini App (Tab Chờ giao) &\nTin nhắn Telegram",
        "Giải phóng thẻ TAXI-01 về kho và hủy lượt giữ thẻ",
        "Mini App (HR) &\nKhung chat Telegram",
        "1. HR bấm nút [Giải phóng thẻ về kho] (hoặc hệ thống tự động quét giải phóng)\n2. Thẻ TAXI-01 lập tức trở về kho available\n3. Bot Telegram nhắn User: '❌ Hết hạn giữ thẻ: Do bạn không đến nhận theo các mốc thông báo, thẻ TAXI-01 đã được giải phóng về kho. Yêu cầu REQ-xxx đã bị hủy.'",
        "Thẻ TAXI-01 được trả tự do ngay cho kho. Đơn chuyển trạng thái card_released.",
        "card_released\n(Thẻ đã giải phóng)"
    ),

    # FLOW 07: ADMIN XIN NHƯỜNG THẺ -> USER XÁC NHẬN TRÊN TELEGRAM
    (
        "TC_F07_01",
        "FLOW-07: Admin xin nhường",
        "Khâu 4: Admin bấm Xin nhường thẻ",
        "Admin (Lê Hoàng Nam)",
        "Đơn REQ-xxx đang giữ thẻ TAXI-01 chờ User đến lấy, nhưng có ca công tác VIP/khẩn cấp phát sinh.",
        "Mini App\n(Tab Chờ bàn giao)",
        "Bấm nút [Xin nhường thẻ]",
        "Mini App (Admin)",
        "1. Admin bấm nút [Xin nhường thẻ]\n2. Nhập lý do (VD: 'Đoàn khách VIP đột xuất cần xe gấp')\n3. Bấm xác nhận gửi",
        "Hệ thống ghi nhận trạng thái pending_user_confirm. Đơn hiển thị badge: 'Đã gửi xin nhường thẻ qua Telegram - Chờ NV xác nhận...'",
        "pending_handover\n(Đang xin nhường thẻ)"
    ),
    (
        "TC_F07_02",
        "FLOW-07: User đồng ý nhường",
        "Khâu 4: User bấm Đồng ý nhường",
        "User (Nguyễn Văn A)",
        "Nhận được tin nhắn riêng từ Bot Telegram: 'Admin xin bạn nhường thẻ TAXI-01 cho ca khẩn cấp... kèm 2 nút'",
        "Khung chat Telegram\n(Bot @TaxicardBot)",
        "Bấm nút [✅ Đồng ý nhường]",
        "Khung chat Telegram\n(1 chạm trực tiếp)",
        "1. User bấm trực tiếp nút [✅ Đồng ý nhường] trên tin nhắn Telegram\n2. Bot đổi nội dung tin: '✅ Cảm ơn bạn đã hỗ trợ nhường thẻ!'\n3. Thẻ TAXI-01 được giải phóng về kho available ngay lập tức\n4. Bot gửi tin báo Admin: 'User A đã đồng ý nhường thẻ TAXI-01'",
        "Thẻ TAXI-01 về kho sẵn sàng cấp phát cho ca khẩn. Đơn chuyển trạng thái cancelled (Đã nhường thẻ).",
        "cancelled\n(Đã nhường thẻ)"
    ),
    (
        "TC_F07_03",
        "FLOW-07: User từ chối nhường",
        "Khâu 4: User bấm Không nhường",
        "User (Nguyễn Văn A)",
        "Nhận được tin nhắn từ Bot Telegram nhưng User vẫn cần đi gặp khách hàng theo đúng lịch.",
        "Khung chat Telegram\n(Bot @TaxicardBot)",
        "Bấm nút [❌ Không nhường]",
        "Khung chat Telegram\n(1 chạm trực tiếp)",
        "1. User bấm nút [❌ Không nhường (Vẫn cần đi)] trên tin nhắn Telegram\n2. Bot đổi nội dung tin: '👌 Bạn đã từ chối nhường thẻ. Thẻ TAXI-01 vẫn giữ cho bạn'\n3. Bot gửi tin báo Admin: 'User A từ chối nhường thẻ (vẫn cần đi)'",
        "Thẻ TAXI-01 vẫn tiếp tục được giữ nguyên cho User. Không có bất kỳ gián đoạn nào tới lịch trình của User.",
        "pending_handover\n(Giữ nguyên thẻ)"
    )
]

for row_idx, sc in enumerate(scenarios, start=4):
    ws2.write(row_idx, 0, sc[0], cell_center)
    ws2.write(row_idx, 1, sc[1], cell_bold_left)
    ws2.write(row_idx, 2, sc[2], cell_bold_left)
    ws2.write(row_idx, 3, sc[3], cell_left)
    ws2.write(row_idx, 4, sc[4], cell_left)
    
    if "Telegram" in sc[5]:
        ws2.write(row_idx, 5, sc[5], tag_telegram)
    else:
        ws2.write(row_idx, 5, sc[5], tag_miniapp)
        
    ws2.write(row_idx, 6, sc[6], cell_bold_left)
    
    if "Telegram" in sc[7]:
        ws2.write(row_idx, 7, sc[7], tag_telegram)
    elif "Trực tiếp" in sc[7]:
        ws2.write(row_idx, 7, sc[7], cell_center)
    else:
        ws2.write(row_idx, 7, sc[7], tag_miniapp)
        
    ws2.write(row_idx, 8, sc[8], cell_left)
    ws2.write(row_idx, 9, sc[9], cell_left)
    ws2.write(row_idx, 10, sc[10], cell_center)

ws2.set_column(0, 0, 14)
ws2.set_column(1, 1, 20)
ws2.set_column(2, 2, 22)
ws2.set_column(3, 3, 16)
ws2.set_column(4, 4, 30)
ws2.set_column(5, 5, 18)
ws2.set_column(6, 6, 26)
ws2.set_column(7, 7, 20)
ws2.set_column(8, 8, 35)
ws2.set_column(9, 9, 32)
ws2.set_column(10, 10, 18)
ws2.set_row(3, 30)

for r in range(4, 4 + len(scenarios)):
    ws2.set_row(r, 68)

# ==============================================================================
# SHEET 3: MA TRẬN PHÂN QUYỀN
# ==============================================================================
ws3 = wb.add_worksheet("3_Ma_Tran_Phan_Quyen")
ws3.set_tab_color('#7C3AED')

ws3.merge_range("A1:F1", "MA TRẬN VAI TRÒ, ĐIỂM CHẠM VÀ PHƯƠNG THỨC TƯƠNG TÁC GIỮA TELEGRAM CHAT & MINI APP", title_format)
ws3.write("A2", "Quy định rõ ràng từng vai trò: Nhận thông tin ở đâu? Thao tác ở đâu? Cơ chế 1 chạm ra sao?", subtitle_format)

headers_3 = [
    "Vai Trò",
    "Đối Tượng Mẫu",
    "Nhận Thông Tin Ở Đâu?",
    "Thao Tác Tiếp Theo Ở Đâu?",
    "Các Thao Tác Chính Thực Hiện",
    "Ràng Buộc Nghiệp Vụ Cần Nhớ (BA Rules)"
]

for col_idx, h in enumerate(headers_3):
    ws3.write(3, col_idx, h, header_format)

roles_matrix = [
    (
        "Nhân sự\n(User / Employee)",
        "Nguyễn Văn A (Kinh Doanh)\nLê Thị Mai (Marketing)",
        "• Tin nhắn Bot Telegram: Nhận thông báo kết quả duyệt đơn, thông báo đến lấy thẻ, cảnh báo từ chối.\n• Telegram Mini App: Xem danh sách yêu cầu của tôi, số thẻ sẵn sàng trong kho hiện tại.",
        "Telegram Mini App\n(Màn hình nhân sự)",
        "1. Tạo yêu cầu mượn thẻ (Khâu 1: Điền mục đích, địa điểm, nhãn khách).\n2. Xem mã thẻ được cấp và hướng dẫn liên hệ HR nhận thẻ.\n3. Hủy đơn khi chưa được cấp thẻ.\n4. Mang thẻ và hóa đơn về nộp cho HR (Khâu 5).",
        "• Thông tin cá nhân lấy tự động từ tài khoản Telegram đã liên kết, không cho sửa tay.\n• Mỗi nhân sự chỉ được giữ 1 đơn active (đang chờ duyệt hoặc đang giữ thẻ).\n• Không tự chọn mã số thẻ; không có nút bấm tự xác nhận nhận/trả thẻ trên app."
    ),
    (
        "Admin\n(Quản trị viên)",
        "Lê Hoàng Nam\n(Ban Quản Trị)",
        "• Telegram Mini App (Khu vực Admin): Danh sách đơn mới cần xử lý (Khâu 2), hàng chờ duyệt cuối, cảnh báo kho thẻ, báo cáo chi phí.",
        "Telegram Mini App\n(Khu vực Quản trị Admin)",
        "1. Khâu 2: Xem xét đơn và chọn DUYỆT THẲNG (tự động giữ thẻ kho).\n2. Khâu 2: HOẶC chọn YÊU CẦU LEADER DUYỆT (đẩy tin bot sang Leader).\n3. Từ chối yêu cầu (kèm lý do bắt buộc).\n4. Quản lý danh mục thẻ, thêm thẻ, cập nhật trạng thái thẻ.\n5. Xem báo cáo chi phí tháng theo từng nhân sự/phòng ban.",
        "• Admin là người nắm quyền quyết định duyệt thẳng hoặc yêu cầu Leader duyệt.\n• Khi duyệt, nếu kho hết thẻ, tự động đẩy vào Danh sách chờ (Waitlist).\n• Mọi thay đổi cấu hình chỉ áp dụng snapshot cho đơn tạo mới."
    ),
    (
        "Leader / TBP\n(Trưởng bộ phận)",
        "Trần Thị Bích (Leader KD)\nVũ Quốc Huy (Leader MKT)",
        "• Tin nhắn Bot Telegram riêng (Khâu 3): Chỉ nhận tin khi Admin chọn 'Yêu cầu Leader duyệt'. Tin nhắn tóm tắt đủ thông tin kèm 3 nút: Duyệt, Từ chối, Mở app.",
        "MÀN HÌNH CHAT TELEGRAM\n(Ưu tiên duyệt 1 chạm)\nhoặc Mini App (khi cần xem thêm)",
        "1. Khâu 3: Bấm nút [Duyệt] 1 chạm ngay trên Telegram: Cập nhật DB tức thì (<0.5s), không cần mở Mini App.\n2. Khâu 3: Bấm nút [Từ chối] 1 chạm ngay trên Telegram.\n3. Bấm nút [Mở app] khi cần ghi chú thêm lý do hoặc xem lịch sử chi tiết.",
        "• Chỉ tham gia ở Khâu 3 khi Admin yêu cầu.\n• Leader KHÔNG ĐƯỢC tự duyệt yêu cầu của chính mình.\n• Chỉ duyệt đơn của nhân sự thuộc bộ phận mình phụ trách."
    ),
    (
        "HR / Điều phối\n(Vận hành thẻ)",
        "Phạm Thu Hà\n(Hành chính nhân sự)",
        "• Telegram Mini App (Khu vực HR Vận hành): Danh sách chờ bàn giao thẻ (Khâu 4), Danh sách chờ thu thẻ & bill (Khâu 5), Danh sách chờ thẻ (Waitlist), Danh sách thiếu bill.",
        "Telegram Mini App &\nTrực tiếp tại quầy",
        "1. Khâu 4: Xác nhận bàn giao thẻ vật lý cho nhân sự (chọn đúng mã thẻ thực giao).\n2. Khâu 5: Xác nhận thu hồi thẻ vật lý vào kho và kiểm tra tình trạng thẻ (Tốt / Hỏng).\n3. Khâu 5: Nhập điểm đón, trả, số tiền thực tế và chụp/tải ảnh bill (OCR hỗ trợ).\n4. Khâu 5: Đánh dấu 'Thiếu dữ liệu' nếu nhân sự chưa có bill (thẻ vật lý vẫn vào kho cấp tiếp).\n5. Phê duyệt Accept/Reject chi phí vượt trần (Over-budget).\n6. Cấp thẻ từ Danh sách chờ (Waitlist) khi có thẻ trả về kho.\n7. Giải phóng thẻ đã giữ nếu nhân sự không đến nhận.",
        "• Thẻ chỉ ra/vào kho khi HR/Admin xác nhận thực tế.\n• Thẻ tốt vào lại kho ngay; thẻ hỏng tách riêng không cộng vào thẻ sẵn sàng.\n• OCR chỉ là bản nháp gợi ý, người nhập luôn kiểm tra và xác nhận số cuối cùng.\n• Từ chối vượt mức (Reject) KHÔNG XÓA số tiền thực tế của bill trong dữ liệu."
    )
]

for row_idx, rm in enumerate(roles_matrix, start=4):
    ws3.write(row_idx, 0, rm[0], cell_bold_left)
    ws3.write(row_idx, 1, rm[1], cell_left)
    ws3.write(row_idx, 2, rm[2], cell_left)
    ws3.write(row_idx, 3, rm[3], tag_miniapp if "Mini App" in rm[3] else tag_telegram)
    ws3.write(row_idx, 4, rm[4], cell_left)
    ws3.write(row_idx, 5, rm[5], cell_left)

ws3.set_column(0, 0, 16)
ws3.set_column(1, 1, 20)
ws3.set_column(2, 2, 32)
ws3.set_column(3, 3, 22)
ws3.set_column(4, 4, 38)
ws3.set_column(5, 5, 38)
ws3.set_row(3, 28)
for r in range(4, 4 + len(roles_matrix)):
    ws3.set_row(r, 95)

wb.close()
print("Excel file generated successfully at:", output_path)
