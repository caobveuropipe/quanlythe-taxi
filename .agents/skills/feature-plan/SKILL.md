---
name: feature-plan
description: Lập kế hoạch cho feature mới hoặc fix bug lớn đã có hướng xử lý rõ ràng. Skill này tạo `.agents/active/[feature-slug]/FEATURE_PLAN.md` và `FEATURE_TASKS.md`, nhận diện vùng rủi ro và điểm cần review, nhưng không thay thế deep review về kiến trúc, bảo mật, và logic end-to-end.
---

# Feature Plan

## Mục tiêu
- Chuyển yêu cầu của User thành kế hoạch thực thi rõ scope, dependencies, risks và phase strategy.
- Tạo bộ file điều phối cho feature tại `.agents/active/[feature-slug]/`.
- Nhận diện `risk hotspots`, `known pitfalls`, `review focus` để handoff tốt cho `feature-review`.
- Giữ bước lập plan đủ gọn để ra quyết định nhanh, không biến nó thành full audit.

## Không dùng skill này khi
- `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md`, hoặc `.agents/PROJECT_STRUCTURE.md` chưa có, thiếu nghiêm trọng, hoặc lệch xa codebase hiện tại. Khi đó dùng `project-init`.
- Là bug lớn nhưng chưa rõ root cause, chưa có repro đáng tin cậy, hoặc chưa biết nên sửa ở đâu. Khi đó dùng `check-issue` trước.
- Cần kết luận sâu về security, architecture, data flow, permission, correctness end-to-end. Khi đó dùng `feature-review`.
- Cần bắt đầu code, cập nhật checklist đang chạy, hoặc triển khai theo phase. Khi đó dùng `feature-coordinator`.

## Nguyên tắc nạp ngữ cảnh
- Luôn bắt đầu từ 3 file core:
  - `.agents/KNOWLEDGE_BASE.md`
  - `.agents/CONTEXT.md`
  - `.agents/PROJECT_STRUCTURE.md`
- Chỉ đọc `.agents/architecture/MASTER.md` khi feature chạm nhiều module/layer, data flow, auth, security, database, infra, deployment, hoặc boundary kiến trúc quan trọng.
- Chỉ quét code ở vùng liên quan và dependency trực tiếp; **KHÔNG** sweep full repo nếu chưa có lý do kỹ thuật rõ ràng.
- Skill này được phép làm `risk triage`, **không** làm `deep review`:
  - Được mở rộng đọc sang auth/permission, validation/schema/migration, API contract/DTO/serialization, config/env/deploy, tests liên quan, và changelog hoặc tài liệu tiền lệ liên quan nếu feature chạm vùng nhạy cảm hoặc đã từng có lỗi tương tự.
  - Mục tiêu của phần mở rộng là xác định `impacted modules`, `risk hotspots`, `known pitfalls`, `review focus`, và `rollout concerns`.
  - **Không** kết luận feature "an toàn", "đúng hoàn toàn", hay "không có lỗ hổng". Phần đó thuộc `feature-review`.
- Chỉ hỏi User khi thiếu thông tin blocking. Mọi giả định không-blocking phải được ghi rõ trong plan ở mục `Giả định`.
- Nếu User chưa cung cấp tên feature, agent tự đề xuất `feature-slug` dạng `kebab-case`. Nếu chưa kịp confirm nhưng slug đủ an toàn, có thể tạm dùng slug đề xuất và ghi rõ trong plan.

## Workflow

### Bước 0: Suitability Check
1. Xác định yêu cầu thuộc một trong các nhóm sau:
   - feature mới
   - large enhancement
   - large refactor có direction rõ
   - fix bug lớn đã có hướng xử lý đủ rõ để lập plan
2. Nếu là bug nhưng root cause chưa rõ hoặc còn mơ hồ về vùng sửa:
   - Dừng lập plan
   - Hướng dẫn User gọi `check-issue` trước
3. Nếu thiếu core docs `.agents/`:
   - Dừng lập plan
   - Đề xuất chạy `project-init` ở mode phù hợp

### Bước 1: Wisdom Loading
1. Đọc `.agents/KNOWLEDGE_BASE.md` để nắm:
   - quyết định kiến trúc đã chốt
   - "cấm kỵ" cần tránh
   - tiền lệ liên quan nếu có
2. Đọc `.agents/CONTEXT.md` để hiểu bản đồ dự án và vùng feature nằm ở đâu.
3. Đọc `.agents/PROJECT_STRUCTURE.md` để hiểu entry points, module, commands, config liên quan.
4. Chỉ đọc `.agents/architecture/MASTER.md` nếu feature thực sự chạm boundary kiến trúc quan trọng.

### Bước 2: Targeted Scan và Risk Triage
1. Quét các file, route, service, schema, config, test liên quan trực tiếp đến yêu cầu.
2. Đọc Contract ở đầu file nếu có để biết giới hạn không được vi phạm.
3. Xác định:
   - file/module bị ảnh hưởng
   - dependencies trực tiếp
   - tác động tới data flow, permissions, migrations, config, deploy nếu có
4. Nếu feature đụng vùng nhạy cảm hoặc có tín hiệu từng lỗi tương tự:
   - Mở rộng sang module lân cận theo dependency chain
   - Đọc thêm `.agents/changelog/*.md`, `.agents/history/features/*`, hoặc tài liệu liên quan nếu có bằng chứng là hữu ích
4b. Nếu feature tạo hoặc sửa migration đụng vào một RPC/function/table **đã tồn tại** (đặc biệt `CREATE OR REPLACE FUNCTION`):
   - Grep toàn bộ `database/migrations/` theo tên RPC/function/table đó để liệt kê **mọi** migration trước đây từng định nghĩa hoặc sửa nó.
   - Ghi các migration đó và invariant nghiệp vụ tương ứng vào `known pitfalls` — đây là bằng chứng bắt buộc để `feature-review` đối chiếu carry-forward.
   - Nếu migration mới có assertion/logic phụ thuộc dữ liệu Cloud thật (vd: đếm số dòng cụ thể theo backup) không chạy được trên DB local rỗng, ghi rõ trong plan rằng cần thêm entry vào `database/migrations/local-test-overrides.json` — **không** đề xuất hard-code patch trong `sync-migrations.cjs` hay sửa nội dung migration gốc.
5. Ghi lại các đầu ra của bước triage:
   - `risk hotspots`
   - `review focus areas`
   - `known pitfalls / historical issues`
   - `dependencies / rollout concerns`
6. **Không** biến bước này thành review sâu. Chỉ triage đủ để plan không bị mù.

### Bước 3: Clarify Chỉ Các Điểm Blocking
1. Chỉ hỏi User những câu thật sự chặn việc lập plan.
2. Với các khoảng trống không-blocking:
   - Tự chọn default hợp lý nhất
   - Ghi rõ vào mục `Giả định`
3. Chốt `feature-slug`:
   - Ưu tiên slug do User cung cấp
   - Nếu User chưa nêu, đề xuất slug `kebab-case`

### Bước 4: Đọc Template
Luôn đọc đúng các template sau từ `.agents/skills/templates/`:
- `.agents/skills/templates/FEATURE_PLAN.template.md`
- `.agents/skills/templates/FEATURE_TASKS.template.md`

Không giả định template nằm cạnh file skill.

### Bước 5: Generate Output
1. Tạo folder: `.agents/active/[feature-slug]/`
2. Tạo file `.agents/active/[feature-slug]/FEATURE_PLAN.md` từ `.agents/skills/templates/FEATURE_PLAN.template.md`.
   - KHÔNG tạo `implementation_plan.md`, `task.md`, scratch artifact, Brain artifact, hoặc file kế hoạch tạm ở bất kỳ thư mục nào.
   - Nếu không ghi được trực tiếp vào `.agents/active/[feature-slug]/`, phải dừng và báo blocker cho User; không dùng fallback sang App Data / Brain / scratch.
3. `FEATURE_PLAN.md` bắt buộc phản ánh các nhóm nội dung sau:
   - bối cảnh và mục tiêu
   - in scope / out of scope
   - đối chiếu Knowledge Base
   - giả định và câu hỏi mở
   - acceptance criteria
   - files/modules bị ảnh hưởng
   - risk triage và review focus
   - dependencies, phase strategy, test strategy, rollback
   - **Test Strategy & DB Harness**: BẮT BUỘC chỉ định môi trường test liên quan DB/RPC/Auth/Storage là **Supabase Local Docker CLI** (`supabase start`, `.env.test`/`.env.local`, `127.0.0.1:54321`/`54322`). Tuyệt đối KHÔNG lập kế hoạch test trực tiếp trên Cloud DB.
   - Nếu feature tạo/sửa migration: BẮT BUỘC có task full fresh-reset replay (`pnpm --filter backend test:integration:fresh` hoặc tương đương `sync-migrations` → `supabase db reset --local`) — không chỉ apply riêng migration mới — vì đây là cách duy nhất phát hiện lệch thứ tự phụ thuộc hoặc lệch giữa `database/migrations/` và `supabase/migrations/`.
   - Nếu feature chạm DB/migration/RPC/schema: BẮT BUỘC ghi rõ yêu cầu **Baseline Green Gate** — chạy full fresh-reset replay trên code chưa sửa gì **trước khi bắt đầu code** để chốt mốc đối chiếu. Không có baseline thì khi gate cuối phase fail sẽ không phân biệt được lỗi do feature hay do migration cũ vốn đã hỏng.
   - Nếu feature chạm DB/migration/RPC/schema: đọc `.agents/architecture/DATABASE_CANONICAL_GUIDE.md` trước khi viết task breakdown, để task đúng quy trình canonical source (`database/functions/`) và Per-Feature Dev Baseline (ADR-001 §6.1) — không để task hướng dẫn viết trực tiếp vào file migration mới.
   - Nếu migration đụng RPC/function đã tồn tại: BẮT BUỘC có task test integration khẳng định invariant nghiệp vụ của các migration cũ liên quan (xem mục 7 `known pitfalls`) vẫn đứng vững — full-reset replay chỉ verify migration apply không lỗi, không verify đúng nghiệp vụ.
4. Tạo file `.agents/active/[feature-slug]/FEATURE_TASKS.md` từ `.agents/skills/templates/FEATURE_TASKS.template.md`.
5. `FEATURE_TASKS.md` phải:
   - bám sát acceptance criteria và phase strategy trong plan
   - chia phase đủ nhỏ để `feature-coordinator` triển khai từng bước
   - thêm task cho migration, config, docs, test, deploy nếu feature cần
   - **bắt buộc** có task cuối mỗi phase: `- [ ] Task X.Final: 🧪 Test & Verify Phase X` (trong đó các task test liên quan DB/backend phải chạy trên local harness)
   - nếu feature chạm DB/migration/RPC/schema, **bắt buộc** có task đầu tiên trước mọi phase: `- [ ] Task 0: 🧪 Baseline Green Gate — full fresh-reset replay trên code chưa sửa, ghi kết quả vào Execution Log`
6. Trạng thái ban đầu của plan phải là `⏳ CHỜ REVIEW`.

### Bước 6: Dừng Lại và Trình Bày Cho User
Sau khi tạo xong, dừng tại đây. Báo cáo theo format:

```md
📋 KẾ HOẠCH ĐÃ TẠO:
- Folder: `.agents/active/[feature-slug]/`
- Plan: `FEATURE_PLAN.md`
- Tasks: `FEATURE_TASKS.md`

🎯 Điểm chính:
- Scope: ...
- Risk hotspots: ...
- Review focus: ...
- Assumptions chính: ...

🔍 Bước tiếp theo khuyến nghị:
1. Tự review plan
2. Gọi `feature-review` để phản biện kiến trúc, bảo mật, logic
3. Sau khi plan được `✅ ĐỒNG Ý`, gọi `feature-coordinator` để triển khai
```

Nếu có `risk hotspots` ở auth, security, schema, migration, deploy, permission, data flow, hoặc integration nhạy cảm, phải ghi rõ là **khuyến nghị mạnh** hoặc **bắt buộc review** trước khi thực thi.

## Chat Flow tham khảo

### 1. Feature mới, đủ ngữ cảnh
```text
User: Lập plan cho tính năng export invoice PDF.
AI: Tôi sẽ đọc KB, CONTEXT, PROJECT_STRUCTURE, quét vùng billing/invoice hiện có, rồi tạo plan + tasks. Nếu chưa có tên feature, tôi sẽ đề xuất một slug phù hợp.
AI: Tôi đề xuất feature slug là `invoice-pdf-export`. Tôi ghi nhận 2 giả định không-blocking và đã đánh dấu review focus ở phần file generation + permission download.
```

### 2. Thiếu core docs
```text
User: Lập plan cho onboarding flow mới.
AI: Tôi chưa thấy đủ `.agents/KNOWLEDGE_BASE.md` / `.agents/CONTEXT.md` / `.agents/PROJECT_STRUCTURE.md` để lập plan đáng tin cậy.
AI: Bước đúng tiếp theo là chạy `project-init` ở mode `reconcile`, rồi quay lại `feature-plan`.
```

### 3. Bug lớn nhưng chưa rõ nguyên nhân
```text
User: Lập plan sửa lỗi thanh toán thỉnh thoảng bị double charge.
AI: Đây là bug lớn nhưng root cause chưa rõ. Nếu lập plan ngay bây giờ thì plan sẽ rất dễ sai vùng sửa.
AI: Bước đúng tiếp theo là gọi `check-issue` để truy nguyên root cause, sau đó mới quay lại `feature-plan`.
```

## Handoff Contract
- Với `feature-review`:
  - Đọc `FEATURE_PLAN.md` và `FEATURE_TASKS.md` vừa tạo
  - Ưu tiên soi các mục `Đối chiếu Knowledge Base`, `Files và modules bị ảnh hưởng`, `Risk Triage và Review Focus`, `Chiến lược triển khai`, `Test Strategy`
  - Mục tiêu là kết luận `✅ ĐỒNG Ý`, `⚠️ CẦN SỬA`, hoặc `❌ TỪ CHỐI`
- Với `feature-coordinator`:
  - Chỉ triển khai khi plan đã được đánh dấu `✅ ĐỒNG Ý`, hoặc User đã xác nhận rõ việc bỏ qua review và rủi ro đó được ghi vào plan
  - `FEATURE_TASKS.md` là source of truth để triển khai
- Skill này **không tự động gọi** skill tiếp theo. Chỉ gợi ý bước tiếp theo phù hợp với workflow của User.

## Output kỳ vọng
- `.agents/active/[feature-slug]/FEATURE_PLAN.md`
- `.agents/active/[feature-slug]/FEATURE_TASKS.md`
- Plan phản ánh đúng scope, assumptions, risks, dependencies, acceptance criteria
- Plan đủ sâu để handoff tốt sang `feature-review`, nhưng không trùng vai trò với `feature-review`

## Lưu ý quan trọng
- **BẮT BUỘC** đọc `.agents/KNOWLEDGE_BASE.md` trước khi lập plan
- **KHÔNG** tạo file scratch implementation plan
- **KHÔNG** dùng cách "đọc hết `.agents/`" để lập plan
- **KHÔNG** thay thế `feature-review` bằng một bản plan quá dài và quá sâu
- **KHÔNG** tự đoán ý User nếu thiếu thông tin blocking
- **KHÔNG** bắt đầu code, sửa file ứng dụng, hay triển khai phase
- Plan phải **thừa kế** các quyết định trong KB, không được phá vỡ
