# SƠ ĐỒ LUỒNG NGHIỆP VỤ & TƯƠNG TÁC GIAO DIỆN (MERMAID)

Tài liệu này chứa các khối mã Mermaid chuẩn 100%, **đã được tối ưu để tương thích hoàn toàn với Draw.io, Mermaid Live Editor, Notion, Obsidian, GitHub**.
* Đã loại bỏ toàn bộ ngoặc lồng `[` `]` và ký tự đặc biệt gây lỗi vỡ khung trong Draw.io.
* **Cơ chế Hoàn tác 90 phút của Leader:** Tự động fallback sang Waitlist nếu kho hết thẻ trống.
* **Timeline Cảnh báo trước khi giải phóng thẻ:** Mốc 30 phút (nhắc nhở lần 1) -> Mốc 60 phút (cảnh báo lần 2) -> Mốc 90 phút (hủy giữ thẻ và giải phóng về kho).

---

## 1. SƠ ĐỒ LƯU ĐỒ KHỐI VẬN HÀNH (FLOWCHART - DÁN VÀO DRAW.IO HOẶC MERMAID LIVE)

```mermaid
flowchart TD
    START([Bắt đầu: User có nhu cầu đi taxi]) --> K1_FORM

    %% Khâu 1: User Đăng ký
    K1_FORM["Khâu 1: User mở Mini App<br/>Nhập Mục đích, Điểm đến, Khách"]
    K1_FORM --> K1_SUBMIT["User bấm nút: Gửi yêu cầu mượn thẻ"]
    K1_SUBMIT --> K1_NOTIF["Hệ thống tạo đơn REQ mới<br/>Bot Telegram gửi tin xác nhận cho User"]

    %% Khâu 2: Admin duyệt
    K1_NOTIF --> K2_OPEN["Khâu 2: Admin mở Mini App<br/>Vào Hàng chờ duyệt xem đơn"]
    K2_OPEN --> K2_CHECK{"Kho còn thẻ<br/>sẵn sàng không?"}
    
    K2_CHECK -- "Hết thẻ" --> FLOW_WAITLIST["FLOW-02: Đưa vào Danh sách chờ Waitlist<br/>Bot gửi tin báo User chờ thẻ"]
    K2_CHECK -- "Còn thẻ" --> K2_DECIDE{"Admin chọn phương án?"}

    K2_DECIDE -- "Không hợp lệ" --> FLOW_REJECT_AD["Admin bấm nút: Từ chối yêu cầu"]
    FLOW_REJECT_AD --> NOTIF_REJECT_AD["Bot Telegram nhắn User:<br/>Đơn bị Admin từ chối kèm lý do"]
    NOTIF_REJECT_AD --> END_REJECT([Kết thúc đơn: Bị từ chối])

    K2_DECIDE -- "Nhánh 2A: Duyệt thẳng" --> K2_DIRECT["Admin bấm nút: Duyệt cấp thẻ ngay<br/>Hệ thống tự động khóa giữ thẻ TAXI-01"]
    K2_DECIDE -- "Nhánh 2B: Cần Leader duyệt" --> K2_REQUEST["Admin bấm nút: Yêu cầu Leader duyệt<br/>Bot tự động gửi tin nhắn sang Leader"]

    %% Khâu 3: Leader duyệt & Cơ chế hoàn tác 90 phút
    K2_REQUEST --> K3_MSG["Khâu 3: Leader nhận tin nhắn trên Telegram chat<br/>Có 3 nút bấm: Duyệt, Từ chối, Mở app"]
    K3_MSG --> K3_ACTION{"Leader chọn thao tác<br/>ngay trên Telegram?"}

    %% Nhánh 3A: Leader Từ chối
    K3_ACTION -- "Bấm nút Từ chối" --> FLOW_REJECT_LD["Leader bấm nút: Từ chối trên Telegram<br/>Mở cửa sổ hoàn tác trong 90 phút"]
    FLOW_REJECT_LD --> NOTIF_REJECT_LD["Bot Telegram nhắn User:<br/>Đơn bị Leader từ chối kèm lý do"]
    
    FLOW_REJECT_LD --> K3_UNDO_REJECT{"Trong 90 phút và HR chưa giao thẻ:<br/>Leader có đổi ý bấm Hoàn tác không?"}
    K3_UNDO_REJECT -- "Hết 90 phút hoặc giữ nguyên" --> END_REJECT
    K3_UNDO_REJECT -- "Leader đổi ý bấm Hoàn tác duyệt lại" --> K3_CHECK_CARD{"Kiểm tra kho thẻ lúc này<br/>còn thẻ sẵn sàng không?"}
    
    K3_CHECK_CARD -- "Kho còn thẻ trống" --> K3_APPROVE
    K3_CHECK_CARD -- "Kho đã hết sạch thẻ trống" --> FLOW_WAITLIST_UNDO["Tự động chuyển vào Danh sách chờ Waitlist<br/>Bot báo User và Leader: Đang chờ thẻ về kho"]
    FLOW_WAITLIST_UNDO --> FINISH_ALL

    %% Nhánh 3B: Leader Duyệt
    K3_ACTION -- "Bấm nút Mở app" --> K3_APP["Mở Mini App xem chi tiết và ghi chú"]
    K3_APP --> K3_APPROVE["Xác nhận duyệt đơn"]
    K3_ACTION -- "Bấm nút Duyệt 1 chạm" --> K3_APPROVE

    K3_APPROVE --> K3_APPROVED_STATE["Đã duyệt - Mở cửa sổ hoàn tác 90 phút<br/>Tự động khóa giữ thẻ kho TAXI-01"]
    K3_APPROVED_STATE --> K3_UNDO_APPROVE{"Trong 90 phút và HR chưa giao thẻ:<br/>Leader có đổi ý bấm Hoàn tác không?"}
    
    K3_UNDO_APPROVE -- "Leader đổi ý bấm Hoàn tác từ chối" --> K3_RELEASE_CARD["Giải phóng thẻ TAXI-01 về kho ngay<br/>Chuyển đơn thành Bị từ chối"]
    K3_RELEASE_CARD --> NOTIF_REJECT_LD
    
    K3_UNDO_APPROVE -- "Giữ nguyên quyết định duyệt" --> NOTIF_LEADER_OK["Bot Telegram nhắn User:<br/>Leader đã duyệt - Chuyển Hành chính chuẩn bị thẻ"]

    %% Khâu 4: Bàn giao thẻ & Timeline cảnh báo
    K2_DIRECT --> K4_NOTIF["Khâu 4: Bot gửi tin nhắn cho User<br/>Mời đến phòng Hành chính nhận thẻ TAXI-01"]
    NOTIF_LEADER_OK --> K4_NOTIF
    
    K4_NOTIF --> K4_CHECK{"User có đến nhận thẻ<br/>tại quầy không?"}

    %% Nhánh nhận thẻ bình thường
    K4_CHECK -- "Đến nhận thẻ" --> K4_HANDOVER["HR trao thẻ nhựa TAXI-01 cho User<br/>Bấm nút: Xác nhận đã giao thẻ trên Mini App<br/>Khóa cứng vĩnh viễn nút hoàn tác của Leader"]
    K4_HANDOVER --> NOTIF_HANDOVER["Bot nhắn User: Bạn đã nhận thẻ TAXI-01<br/>Nhớ giữ hóa đơn cước xe khi về"]

    %% Nhánh Admin xin nhường thẻ cho ca khẩn
    K4_CHECK -- "Admin cần thẻ gấp cho ca khẩn" --> FLOW_YIELD["FLOW-07: Admin bấm nút Xin nhường thẻ trên Mini App"]
    FLOW_YIELD --> BOT_YIELD["Bot Telegram gửi tin nhắn kèm 2 nút cho User:<br/>Dong y nhuong | Khong nhuong"]
    BOT_YIELD --> YIELD_CHECK{"User bấm chọn nút nào<br/>trên tin nhắn Telegram?"}
    YIELD_CHECK -- "Bấm: Đồng ý nhường" --> YIELD_YES["Thẻ TAXI-01 giải phóng về kho ngay<br/>Đơn chuyển sang trạng thái: Đã nhường thẻ"]
    YIELD_YES --> NOTIF_YIELD_YES["Bot nhắn User: Cảm ơn bạn đã nhường thẻ<br/>Báo Admin: Thẻ đã sẵn sàng cấp phát"]
    NOTIF_YIELD_YES --> END_YIELD([Kết thúc: Thẻ về kho sẵn sàng cấp ca khẩn])
    YIELD_CHECK -- "Bấm: Không nhường" --> YIELD_NO["Giữ nguyên thẻ TAXI-01 cho User đi theo lịch<br/>Báo Admin: User từ chối nhường thẻ"]
    YIELD_NO --> K4_CHECK

    %% Nhánh cảnh báo theo Timeline trước khi giải phóng thẻ
    K4_CHECK -- "Chưa đến nhận" --> WARN_T1["Timeline 1: Sau 30 phút chưa nhận<br/>Bot Telegram gửi tin nhắn nhắc nhở lần 1"]
    WARN_T1 --> WARN_T2["Timeline 2: Sau 60 phút chưa nhận<br/>Bot Telegram gửi cảnh báo lần 2: Sắp hủy giữ thẻ"]
    WARN_T2 --> WARN_CHECK{"Sau các cảnh báo<br/>User có đến nhận không?"}

    WARN_CHECK -- "User đến nhận thẻ kịp thời" --> K4_HANDOVER
    WARN_CHECK -- "Quá 90 phút vẫn không đến" --> FLOW_RELEASE["FLOW-06: HR hoặc hệ thống giải phóng thẻ TAXI-01 về kho"]
    FLOW_RELEASE --> NOTIF_RELEASE["Bot nhắn User: Đã hủy lượt giữ thẻ do quá thời hạn 90 phút"]
    NOTIF_RELEASE --> END_RELEASE([Kết thúc đơn: Thẻ đã giải phóng])

    %% Khâu 5: Trả thẻ và nhập bill
    NOTIF_HANDOVER --> K4_HOLDING["Thẻ chuyển sang trạng thái đang dùng<br/>User đi công tác"]
    K4_HOLDING --> K5_RETURN["Khâu 5: User đi về nộp lại thẻ và hóa đơn"]
    K5_RETURN --> K5_MODAL["HR mở popup: Thu hồi thẻ và Nhập bill"]
    
    K5_MODAL --> K5_BILL_CHECK{"User có hóa đơn<br/>ngay chưa?"}

    K5_BILL_CHECK -- "Chưa có bill hoặc quên lấy" --> FLOW_MISSING["FLOW-04: Tích chọn Chưa có hóa đơn<br/>Thẻ vào kho ngay - Đơn ở trạng thái nợ bill"]
    FLOW_MISSING --> NOTIF_MISSING["Bot nhắn User: Vui lòng bổ sung hóa đơn sớm"]
    NOTIF_MISSING --> FINISH_MISSING([KẾT THÚC: Thẻ về kho sẵn sàng - Chờ bill])

    K5_BILL_CHECK -- "Đã có bill" --> K5_INPUT["HR nhập số tiền thực tế<br/>hoặc tải ảnh để OCR tự quét"]

    K5_INPUT --> K5_COST_CHECK{"Chi phí có vượt<br/>hạn mức 500 nghìn không?"}
    K5_COST_CHECK -- "Vượt trên 500 nghìn" --> FLOW_OVERBUDGET["FLOW-05: Chuyển HR thẩm định vượt mức<br/>HR chọn Duyệt chi hoặc Từ chối"]
    FLOW_OVERBUDGET --> NOTIF_HR_DECISION["Bot nhắn User: Kết quả duyệt chi phí vượt mức"]
    NOTIF_HR_DECISION --> FINISH_ALL([KẾT THÚC: Thẻ về kho sẵn sàng - Hoàn tất chuyến đi])

    K5_COST_CHECK -- "Hợp lệ dưới 500 nghìn" --> K5_DONE["HR bấm nút: Lưu và Hoàn tất"]
    K5_DONE --> NOTIF_DONE["Bot nhắn User: Chuyến đi hoàn tất thành công"]
    NOTIF_DONE --> FINISH_ALL
    FLOW_WAITLIST --> FINISH_ALL
```

---

## 2. SƠ ĐỒ TUẦN TỰ TOÀN DIỆN (SEQUENCE DIAGRAM - CHI TIẾT TỪNG MÀN HÌNH & KHUNG CHAT)

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 User (Nhân sự)
    participant U_APP as 📱 Mini App (User)
    participant BOT as 🤖 Telegram Bot API
    participant AD_APP as 💻 Mini App (Admin)
    actor AD as 👨‍💼 Admin (Quản trị)
    participant L_CHAT as 💬 Chat Telegram (Leader)
    actor L as 👩‍💼 Leader (Trưởng BP)
    participant HR_APP as 📋 Mini App (HR)
    actor HR as 👩‍💻 HR / Điều phối

    %% KHÂU 1: USER ĐĂNG KÝ
    rect rgb(238, 242, 255)
    Note over U, U_APP: KHÂU 1: USER ĐĂNG KÝ MƯỢN THẺ (TRÊN MINI APP)
    U->>U_APP: Mở Tab Đăng ký (thấy sẵn 3 thẻ trống trong kho)
    U->>U_APP: Nhập Mục đích, Điểm đến, Khách -> Bấm nút Gửi yêu cầu mượn thẻ
    U_APP-->>U: Hiện banner xanh: Đã gửi REQ-2026-101 thành công
    U_APP->>BOT: Ghi nhận đơn mới REQ-2026-101
    BOT-->>U: 📲 Tin nhắn riêng: Đã gửi đơn REQ-2026-101 tới Admin tiếp nhận
    end

    %% KHÂU 2: ADMIN TIẾP NHẬN & PHÊ DUYỆT
    rect rgb(254, 243, 199)
    Note over AD, AD_APP: KHÂU 2: ADMIN XỬ LÝ ĐƠN (TRÊN MINI APP ADMIN)
    AD->>AD_APP: Mở Tab Hàng chờ duyệt, thấy đơn REQ-2026-101 (Mã gợi ý: TAXI-01)
    
    alt NHÁNH 2A: ADMIN DUYỆT THẲNG (Không cần Leader)
        AD->>AD_APP: Bấm nút xanh: Duyệt cấp thẻ ngay
        AD_APP->>AD_APP: Khóa giữ thẻ TAXI-01 (reserved), chuyển đơn sang Chờ giao
        AD_APP->>BOT: Kích hoạt thông báo duyệt cấp thẻ
        BOT-->>U: 📲 Tin nhắn riêng: Yêu cầu REQ-2026-101 đã duyệt cấp thẻ TAXI-01!
    else NHÁNH 2B: ADMIN YÊU CẦU LEADER DUYỆT
        AD->>AD_APP: Bấm nút tím: Yêu cầu Leader duyệt
        AD_APP-->>AD: Đơn đổi nhãn: Đang chờ Leader Bích Trần duyệt
        AD_APP->>BOT: Bắn sự kiện Webhook gửi thông báo Leader
        BOT-->>U: 📲 Tin nhắn riêng: Đơn của bạn đang chờ Leader Bích Trần phê duyệt
        
        %% KHÂU 3: LEADER DUYỆT & CƠ CHẾ HOÀN TÁC 90 PHÚT
        Note over L_CHAT, L: KHÂU 3: LEADER XỬ LÝ (TRỰC TIẾP TRÊN KHUNG CHAT TELEGRAM)
        BOT->>L_CHAT: Gửi tin nhắn kèm 3 nút: Duyệt, Từ chối, Mở app
        Note over L_CHAT: Leader đọc tin tóm tắt ngay trong khung chat Telegram
        
        alt LEADER DUYỆT (KÈM NÚT HOÀN TÁC 90 PHÚT)
            L->>L_CHAT: Bấm nút Duyệt 1 chạm
            BOT-->>L_CHAT: Đổi tin thành: ĐÃ DUYỆT (Kèm nút Hoàn tác trong 90 phút)
            BOT-->>U: 📲 Tin nhắn: Leader Bích Trần ĐÃ DUYỆT đơn REQ-2026-101!
            
            opt Leader đổi ý bấm Hoàn tác trong 90 phút (khi HR chưa giao thẻ)
                L->>L_CHAT: Bấm nút Hoàn tác -> Chọn Từ chối
                BOT-->>L_CHAT: Đổi tin thành: ĐÃ TỪ CHỐI BỞI LEADER
                BOT-->>HR_APP: Giải phóng thẻ TAXI-01 về kho ngay lập tức
                BOT-->>U: 📲 Tin nhắn: Leader đã đổi ý TỪ CHỐI yêu cầu REQ-2026-101
            end

        else LEADER TỪ CHỐI (KÈM NÚT HOÀN TÁC 90 PHÚT)
            L->>L_CHAT: Bấm nút Từ chối trên Telegram
            BOT-->>L_CHAT: Đổi tin thành: ĐÃ TỪ CHỐI (Kèm nút Hoàn tác trong 90 phút)
            BOT-->>U: 📲 Tin nhắn: Yêu cầu REQ-2026-101 ĐÃ BỊ TỪ CHỐI bởi Leader
            
            opt Leader đổi ý bấm Hoàn tác duyệt lại trong 90 phút
                L->>L_CHAT: Bấm nút Hoàn tác -> Chọn Duyệt lại
                alt Kho còn thẻ trống
                    BOT-->>L_CHAT: Đổi tin thành: ĐÃ DUYỆT LẠI (Đã giữ thẻ mới)
                    BOT-->>U: 📲 Tin nhắn: Leader đã đổi ý DUYỆT LẠI! Mời nhận thẻ
                else Kho đã hết sạch thẻ trống (0 thẻ)
                    BOT-->>L_CHAT: Báo Leader: Đã duyệt nhưng kho hết thẻ, đưa vào Waitlist
                    BOT-->>U: 📲 Tin nhắn: Leader đã duyệt lại, đơn vào Danh sách chờ (Waitlist)
                end
            end
        end
    end
    end

    %% KHÂU 4: BÀN GIAO THẺ VẬT LÝ & TIMELINE CẢNH BÁO
    rect rgb(224, 242, 254)
    Note over U, HR: KHÂU 4: BÀN GIAO THẺ & CẢNH BÁO TIMELINE TRƯỚC KHI GIẢI PHÓNG THẺ
    BOT-->>U: 📲 Tin nhắn: Mời bạn đến phòng Hành chính nhận thẻ TAXI-01
    U_APP-->>U: Thẻ đơn đổi màu xanh dương: Đã duyệt - Mời nhận thẻ TAXI-01
    
    alt User đến nhận thẻ bình thường
        U->>HR: Đến quầy gặp trực tiếp chị Hà xin nhận thẻ
        HR->>U: Lấy thẻ nhựa TAXI-01 trong ngăn kéo trao cho User
        HR->>HR_APP: Bấm nút: Xác nhận đã giao thẻ cho NV
        Note over L_CHAT: Nút hoàn tác của Leader lập tức bị KHÓA CỨNG VĨNH VIỄN
        HR_APP->>HR_APP: Thẻ TAXI-01 đổi sang in_use (Đang sử dụng ngoài kho)
        U_APP-->>U: Thẻ đơn đổi màu tím: Đang giữ thẻ TAXI-01
        BOT-->>U: 📲 Tin nhắn: Bạn đã nhận thẻ TAXI-01 lúc 13:30. Nhớ giữ lại hóa đơn taxi!
    else User chưa đến nhận (Cảnh báo theo Timeline)
        Note over BOT, U: Timeline 1: Sau 30 phút chưa nhận
        BOT-->>U: ⏰ Nhắc nhở lần 1: Thẻ TAXI-01 đang chờ bạn tại phòng Hành chính
        Note over BOT, U: Timeline 2: Sau 60 phút chưa nhận
        BOT-->>U: ⚠️ Cảnh báo lần 2: Còn 30 phút để nhận trước khi thẻ bị giải phóng về kho!
        alt User đến nhận kịp thời
            U->>HR: Đến quầy nhận thẻ -> HR giao thẻ
        else Quá 90 phút không đến nhận
            HR->>HR_APP: Bấm nút Giải phóng thẻ về kho
            HR_APP->>HR_APP: Thẻ TAXI-01 trở về trạng thái available
            BOT-->>U: ❌ Tin nhắn: Đã hủy lượt giữ thẻ TAXI-01 do quá thời hạn 90 phút
            U_APP-->>U: Đơn chuyển sang trạng thái: Thẻ đã giải phóng
        end
    else Admin có ca khẩn cấp phát sinh: Bấm Xin nhường thẻ
        AD->>AD_APP: Bấm nút Xin nhường thẻ tại đơn REQ-2026-101
        AD_APP->>BOT: Gửi tin nhắn xin nhường thẻ tới User
        BOT-->>U: 📲 Tin nhắn riêng: Admin xin bạn nhường thẻ TAXI-01 cho ca khẩn cấp<br/>[Dong y nhuong the] [Khong nhuong the]
        alt User bấm Dong y nhuong the ngay trên Telegram
            U->>BOT: Bấm nút Dong y nhuong the
            BOT-->>U: 📲 Đổi tin nhắn: Cảm ơn bạn đã hỗ trợ nhường thẻ!
            BOT-->>AD: 🔔 Thông báo Admin: User đã đồng ý nhường thẻ TAXI-01
            BOT->>AD_APP: Thẻ TAXI-01 trở về kho available ngay lập tức
            U_APP-->>U: Đơn chuyển trạng thái: Đã nhường thẻ cho ca khẩn
        else User bấm Khong nhuong the ngay trên Telegram
            U->>BOT: Bấm nút Khong nhuong the
            BOT-->>U: 📲 Đổi tin nhắn: Bạn đã từ chối nhường. Thẻ TAXI-01 vẫn giữ cho bạn
            BOT-->>AD: 🔔 Thông báo Admin: User từ chối nhường thẻ (vẫn cần đi)
        end
    end
    end

    %% KHÂU 5: TRẢ THẺ & NHẬP BILL
    rect rgb(220, 252, 231)
    Note over U, HR: KHÂU 5: TRẢ THẺ VẬT LÝ & NHẬP HÓA ĐƠN (BILL)
    Note over U: Đi taxi xong, trở về công ty
    U->>HR: Trả lại thẻ nhựa TAXI-01 + đưa hóa đơn cước xe
    HR->>HR_APP: Bấm Thu hồi thẻ và Nhập bill tại đơn REQ-2026-101
    HR->>HR_APP: Chọn tình trạng: Tốt | Nhập điểm đón, trả | Nhập tiền: 245.000 đ
    HR->>HR_APP: Bấm nút: Lưu và Hoàn tất lượt dùng thẻ
    HR_APP->>HR_APP: Thẻ TAXI-01 lập tức cộng về kho available (Kho tăng +1)
    HR_APP->>HR_APP: Đơn REQ-2026-101 chuyển sang trạng thái: completed
    BOT-->>U: 📲 Tin nhắn: Chuyến đi REQ-2026-101 hoàn tất! Chi phí: 245.000 đ. Cảm ơn bạn!
    end
```
