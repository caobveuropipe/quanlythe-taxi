# .agents/KNOWLEDGE_BASE.md - Bộ não của dự án HC-ADM-CapSoVanBan

Lưu trữ những **quyết định kiến trúc** quan trọng và **lý do chiến lược** của dự án.

> ⚠️ **QUY TẮC GHI:**
> - Chỉ ghi quyết định kiến trúc và lý do chiến lược (high-level decisions)
> - Tuyệt đối tránh liệt kê tính năng, changelog chi tiết, hoặc mô tả cấu hình thuần túy
> - Mỗi dòng phải trả lời được câu hỏi: "Tại sao chúng ta quyết định làm vậy?"

---

## Initial Decisions From Repo Scan

- 2026-09-17 Kiến trúc tích hợp Single-Process Dev Server (Express kết hợp Vite MiddlewareMode). Why: Giúp quy trình phát triển và kiểm thử cục bộ mượt mà, không gặp rào cản CORS giữa Frontend và Backend API, đồng thời đơn giản hóa việc deploy thành một container hoặc một Node.js process duy nhất phục vụ cả static asset và API OCR.
- 2026-09-17 Sử dụng Gemini 3.7 Flash (`@google/genai`) với `responseSchema` JSON có cấu trúc cho OCR & phân loại văn bản. Why: Tối ưu hóa độ trễ xử lý đa phương thức (hình ảnh/chụp scan/email text), đồng thời bảo đảm đầu ra JSON nghiêm ngặt khớp trực tiếp với thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP) như trích yếu, cơ quan ban hành, người ký, mã danh mục, mức độ khẩn/mật.
- 2026-09-17 Cơ chế lưu trữ ban đầu bằng Client-side Storage (`localStorage`) có khả năng Import/Export JSON. Why: Cho phép triển khai thử nghiệm độc lập không phụ thuộc cơ sở dữ liệu bên ngoài, dễ dàng chạy offline/demo cho các đơn vị hành chính mà vẫn đảm bảo tính toàn vẹn dữ liệu thông qua cơ chế sao lưu định kỳ.

---

## Ongoing Decisions

- 2026-10-16 Cô lập hạn ngạch AI bằng Dynamic User Gemini API Key & Đồng bộ hai chiều qua Google Drive appDataFolder với cơ chế Tombstone. Why: Triệt tiêu chi phí hạn ngạch tập trung của máy chủ; bảo vệ tính riêng tư của API Key người dùng (không lưu key trên server hay DB chung, chỉ lưu ở phân vùng appDataFolder của chính tài khoản Google của họ); cơ chế so sánh updatedAt và Tombstone khi xóa bảo đảm trạng thái key đồng bộ nhất quán đa thiết bị mà không ảnh hưởng tới người dùng không dùng AI (Non-blocking).
