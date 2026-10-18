---
name: check-issue
description: Phân tích & truy nguyên root cause của bug/sự cố, cung cấp bằng chứng qua test script/mock test hoặc dry-run proposal, đưa ra hướng xử lý, nhưng KHÔNG tự sửa code trong skill này.
---

# Multi Agent Skills - Check Issue (🔍 The Detective)

> 🛡️ **NGUYÊN TẮC AN TOÀN (High-Risk Commands):**
> AI **BẮT BUỘC** phải giải thích và xin phép User trước khi chạy các lệnh terminal rủi ro cao (GCP, Docker, Firebase). 
> Tham chiểu mẫu giải thích tại `README.md` hoặc skill `feature-coordinator`.

## Vai trò
Phân tích và tìm nguyên nhân gốc rễ (Root Cause) của vấn đề. Skill này **chỉ dừng ở điều tra và kết luận**, không thực hiện sửa code.

## Nguyên tắc tối thượng
1. **KHÔNG** chỉnh sửa bất kỳ dòng code nào trong skill này
2. **KHÔNG** tự ý suy đoán nếu thiếu thông tin
3. **LUÔN** đặt câu hỏi nếu ngữ cảnh chưa đầy đủ
4. **TUYỆT ĐỐI KHÔNG** khởi động bất kỳ công cụ chỉnh sửa file nào để sửa code/cấu hình ứng dụng trong skill này
5. **CHỈ quét code theo giả thuyết**: repro/log -> file nghi vấn -> call chain -> KNOWLEDGE_BASE/changelog -> module lân cận khi có bằng chứng
6. **PHẢI có bằng chứng kiểm chứng**: test script/mock data/dry-run proposal hoặc output thực tế nếu đã được User cho phép chạy

## Nguyên tắc nạp ngữ cảnh
- Skill này **được phép đọc rộng** khi cần truy nguyên root cause về kiến trúc, security hoặc logic.
- Nhưng phải đọc **theo giả thuyết**, không quét full repo vô hướng:
  1. Triệu chứng/repro/log/error message
  2. File hoặc route/module trực tiếp liên quan
  3. `.agents/KNOWLEDGE_BASE.md`, `.agents/changelog/*.md`, `.agents/CONTEXT.md`, `.agents/PROJECT_STRUCTURE.md`
  4. Call chain upstream/downstream
  5. Module lân cận nếu có nghi vấn
- Nếu nghi vấn liên quan các vùng sau, **bắt buộc** mở rộng thêm:
  - auth, permission, session/token
  - validation, schema, migration
  - cache, queue, worker, cron
  - config/env/feature flags
  - integration với service ngoài
  - logging, retry, error boundary
- Nếu triệu chứng là một RPC/function DB đột nhiên "quên" logic hoặc invariant từng đúng trước đây (regression không rõ nguyên nhân ở tầng data): grep `database/migrations/` theo tên function đó để tìm migration gần nhất từng `CREATE OR REPLACE FUNCTION` nó — khả năng cao là migration sau đè lên bản migration trước mà không kế thừa đủ logic (tiền lệ: migration 052 từng đè mất invariant "Salary Pending Isolation" của migration 015, xem `.agents/KNOWLEDGE_BASE.md`).
- Chỉ đọc `.agents/architecture/*` khi issue có khả năng là lỗi thiết kế, race condition, dependency cycle, sai data flow hoặc sai boundary giữa module.
- Nếu issue liên quan `database/functions/`, migration, hoặc RPC drift: đọc thêm `.agents/architecture/DATABASE_CANONICAL_GUIDE.md` để xác định đúng canonical source và quy trình generate migration (ADR-001).

## Workflow

### Bước 1: Wisdom Loading (tìm tiền lệ)
1. Đọc `.agents/KNOWLEDGE_BASE.md` — tìm lỗi tương tự từng xảy ra, quyết định kiến trúc liên quan
2. Đọc `.agents/changelog/*.md` phù hợp — tìm thay đổi gần đây có thể gây ra vấn đề
3. Đọc `.agents/CONTEXT.md` — hiểu bản đồ dự án, xác định vùng code liên quan
4. Đọc `.agents/PROJECT_STRUCTURE.md` — xác định entry points, module và config liên quan
5. Đọc `.agents/architecture/MASTER.md` và các tài liệu kiến trúc liên quan nếu issue có dấu hiệu ở tầng thiết kế/hệ thống

### Bước 2: Tiếp nhận & Thu thập ngữ cảnh
Dựa trên mô tả vấn đề của User, AI sẽ:
- Sử dụng các công cụ phù hợp với môi trường hiện tại như tìm kiếm text/file, đọc file, xem diff, log, và cấu hình để rà soát vùng liên quan
- Đọc logs, cấu hình, error messages nếu cần
- Đọc Contract đầu file (nếu có) để hiểu giới hạn của file
- Lần theo call chain để xác định lỗi nằm ở input, transform, persistence, permission hay rendering

### Bước 3: Phân tích & Đặt câu hỏi
AI liệt kê những gì đã tìm thấy và:
- Đặt câu hỏi cụ thể để làm rõ điểm nghi vấn
- Yêu cầu thêm thông tin về bước tái hiện (repro steps) nếu chưa có
- So sánh với changelog: "Thay đổi gần nhất có liên quan không?"

### Bước 4: Phân tích & Sinh Test Script/Mock Data kiểm chứng
Để tránh suy diễn, AI **bắt buộc**:
- Chủ động đề xuất hoặc viết inline test script/mock data phù hợp với ngữ cảnh: unit, integration, API, SQL, UI flow hoặc data fixture.
- Mặc định chỉ trình bày test/mock dưới dạng **inline snippet, pseudo-code hoặc dry-run proposal** trong báo cáo RCA.
- Không tự ý ghi file hoặc chạy lệnh kiểm chứng trên disk. Nếu cần chạy thực tế, phải giải thích lý do, xin phép User trước, chỉ dùng thư mục scratch/tạm, và xóa file tạm sau khi chạy.
- Nếu không thể kiểm chứng bằng script, phải nói rõ lý do và thay bằng bằng chứng từ log, diff, call chain hoặc dữ liệu cấu hình.

### Bước 5: Trả lời 6 câu hỏi cốt lõi
Kết luận RCA **bắt buộc** trả lời đủ:

01 · exact symptom: Triệu chứng chính xác là gì.
02 · reproduction steps: Các bước tái hiện cụ thể.
03 · expected vs actual: Hành vi mong muốn so với thực tế.
04 · root cause + file:line: Nguyên nhân gốc rễ và vị trí file/dòng cụ thể.
05 · why now: Vì sao lỗi xuất hiện ở thời điểm hiện tại.
06 · blast radius: Vùng ảnh hưởng và rủi ro nếu sửa.

### Bước 6: Kết luận nguyên nhân
```
🔍 KẾT QUẢ PHÂN TÍCH:

01 · exact symptom: [...]
02 · reproduction steps: [...]
03 · expected vs actual: [...]
04 · root cause + file:line: [...]
05 · why now: [...]
06 · blast radius: [...]

💡 Đề xuất hướng giải quyết:
1. [...] - Ưu tiên
2. [...] - Thay thế

🧪 Kết quả/Đề xuất chạy test kiểm chứng:
- [Inline test/mock/dry-run hoặc output thực tế nếu đã được User cho phép chạy]
- [Bằng chứng chứng minh lỗi hoặc loại trừ giả thuyết]

Bước tiếp theo khuyến nghị:
1. `feature-plan` nếu bug lớn cần task breakdown/review
2. Quay lại workflow triển khai phù hợp nếu đã có plan/gate rõ ràng
3. Dừng tại đây nếu User chỉ cần RCA
```

## Ví dụ sử dụng (Chat Flow)

**Bạn:** "/check-issue Lỗi không render được danh sách bài viết"

**AI:** (Thực hiện quét codebase, đọc logs...) "Tôi đã rà soát và tìm thấy các điểm nghi vấn sau..."

**AI:** 
> 🔍 **KẾT QUẢ PHÂN TÍCH:**
> 
> 01 · exact symptom: Danh sách bài viết không render và màn hình crash khi có bài viết thiếu trường `created_at`.
> 02 · reproduction steps: Tạo hoặc mock một article không có `created_at`, mở trang dashboard, quan sát lỗi khi component render danh sách.
> 03 · expected vs actual: Expected là bài viết vẫn hiển thị với ngày trống/fallback; actual là code truy cập trực tiếp `created_at.seconds` và crash.
> 04 · root cause + file:line: Do biến `articles` đang được map trực tiếp từ Firestore mà không kiểm tra tồn tại của trường `created_at`; vị trí nghi vấn `AdminDashboard.tsx`, dòng 855.
> 05 · why now: Dữ liệu mới có bài viết chưa hoàn thiện hoặc migration/import gần đây không đảm bảo `created_at`.
> 06 · blast radius: Các màn hình/tác vụ dùng cùng shape article có thể crash khi gặp dữ liệu thiếu timestamp.
> 
> 💡 **Đề xuất hướng giải quyết:**
> Thêm kiểm tra optional chaining `article.created_at?.seconds` trước khi format ngày.
> 
> 🧪 **Kết quả/Đề xuất chạy test kiểm chứng:**
> Mock một article thiếu `created_at`, render component hoặc hàm format ngày trong test; expected là không throw và hiển thị fallback.
> 
> **Bước tiếp theo hợp lý:** nếu đây là bug nhỏ, bạn có thể tự sửa theo RCA; nếu đây là bug lớn, hãy gọi `feature-plan`.

**Bạn:** "Chốt RCA, tôi sẽ lập plan sửa"

**AI:** "Tôi đã chốt RCA và đề xuất hướng xử lý. Bước đúng tiếp theo là `feature-plan`." [Skill này dừng tại đây]

## Handoff Contract
- Với `feature-plan`:
  - Dùng khi root cause đã rõ và bug đủ lớn để cần plan, task breakdown, review gate, hoặc triển khai nhiều phase.
- Với `feature-coordinator`:
  - Chỉ quay lại khi đã có `FEATURE_PLAN.md` và `FEATURE_TASKS.md` hợp lệ cho fix tương ứng.
- Với `update-docs`:
  - Chỉ quay lại sau khi thay đổi code đã được thực thi xong; không dùng `update-docs` chỉ từ RCA.

## Lưu ý quan trọng
- **TUYỆT ĐỐI KHÔNG** khởi động bất kỳ công cụ chỉnh sửa file nào trong skill này.
- File này là **template tổng quát** — AI tự xác định file cần quét dựa trên mô tả lỗi
- Đọc KB + Changelog trước giúp tránh lặp lại sai lầm cũ
- **PHẢI** mở rộng đọc sang module lân cận nếu bug có dấu hiệu logic/permission/kiến trúc, không kết luận sớm từ 1 file
- **KHÔNG** quét toàn repo nếu chưa có giả thuyết kỹ thuật rõ ràng
- Chỉ đề xuất giải pháp và bước tiếp theo, **không tự thực hiện sửa code**
