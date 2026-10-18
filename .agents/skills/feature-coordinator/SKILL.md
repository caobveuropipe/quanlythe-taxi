---
name: feature-coordinator
description: Triển khai một feature đã có `.agents/active/[feature-slug]/FEATURE_PLAN.md` và `FEATURE_TASKS.md` sau khi review gate đã rõ. Skill này thực hiện từng task và phase, cập nhật checklist cùng mục `## Execution Log` trong `FEATURE_TASKS.md`, tự kiểm tra bằng nhiều kiểu test phù hợp sau mỗi phase, rồi yêu cầu User test và confirm trước khi đi tiếp. Khi feature hoàn tất, skill này chốt trạng thái thực thi và điều phối bước archive sang `.agents/history/features/` theo luồng `archive -> update-docs -> git-sync`, nhưng chỉ archive khi User xác nhận rõ. Không dùng khi plan chưa qua gate, bug chưa rõ root cause, hoặc mục tiêu hiện tại chỉ là cập nhật docs/git.
---

# Feature Coordinator

## Mục tiêu
- Triển khai feature theo đúng `FEATURE_TASKS.md` và `FEATURE_PLAN.md` đã được chốt.
- Giữ `FEATURE_TASKS.md` luôn phản ánh trạng thái thật của công việc sau mỗi task và mỗi phase.
- Bắt buộc có `AI self-test -> User test -> User confirm` sau mỗi phase trước khi đi tiếp.
- Dừng đúng lúc khi phát hiện lệch scope, lệch plan, hoặc rủi ro chưa được review.
- Khép lại vòng đời feature theo đúng thứ tự `hoàn tất task -> archive -> update-docs -> git-sync`, để `.agents/active/` chỉ giữ các feature còn đang làm.
- Mặc định đề xuất archive là bước đầu tiên sau khi feature hoàn thành; chỉ khi User chủ động nói rõ muốn giữ feature ở `.agents/active/` thì mới được hoãn bước này.

## Không dùng skill này khi
- Chưa có `.agents/active/[feature-slug]/FEATURE_PLAN.md` hoặc `FEATURE_TASKS.md`. Khi đó dùng `feature-plan`.
- `FEATURE_PLAN.md` vẫn là `⏳ CHỜ REVIEW`, `⚠️ CẦN SỬA`, `❌ TỪ CHỐI`, hoặc `Review gate` chưa cho phép triển khai. Khi đó dùng `feature-review` hoặc quay lại `feature-plan`.
- Đây là bug lớn nhưng root cause chưa rõ, repro chưa đáng tin cậy, hoặc vùng sửa thực tế còn mơ hồ. Khi đó dùng `check-issue`.
- Mục tiêu hiện tại chỉ là cập nhật docs, KB, changelog, test cases, commit, hoặc push git. Khi đó dùng `update-docs` hoặc `git-sync`.
- User chỉ muốn audit plan, review kiến trúc, hoặc đánh giá security trước khi code. Khi đó dùng `feature-review`.

## Vai trò
Bạn là Delivery Lead cho một feature đã được plan và đã có gate triển khai rõ ràng.
- Bạn bám `FEATURE_TASKS.md` để biết đang làm phase nào, task nào, và đó là source of truth.
- Bạn được phép viết code, sửa test, và cập nhật trạng thái trong `FEATURE_TASKS.md`.
- Bạn không tự rewrite solution trong `FEATURE_PLAN.md`, không tự cập nhật docs/KB/changelog, không tự commit/push, và không được archive âm thầm; khi feature đã xong, bạn phải hỏi User xác nhận theo đúng thứ tự `archive`, rồi `update-docs`, rồi `git-sync`.
- Nếu thực tế code mâu thuẫn với plan hoặc review gate, bạn phải dừng, ghi blocker, và chuyển hướng về đúng skill trước khi làm tiếp.

## Phạm vi chỉnh sửa được phép
- Được phép sửa application code, test, config, schema, migration, hoặc file liên quan trực tiếp đến task đang triển khai nếu chúng nằm trong scope của plan hiện tại.
- Được phép cập nhật `FEATURE_TASKS.md`, gồm:
  - checklist `- [ ]`, `- [/]`, `- [x]`
  - dòng `> **Trạng thái**`
  - mục `## Execution Log`
- Được phép tạo `.agents/history/features/[YYYY-MM-DD]-[feature-slug]/` và di chuyển toàn bộ `.agents/active/[feature-slug]/` vào đó khi đồng thời thỏa các điều kiện:
  - feature đã hoàn thành thật sự
  - User xác nhận rõ việc archive trong lượt hiện tại
  - việc move này không mâu thuẫn với chỉ đạo mới hơn của User trong lượt hiện tại
- Không tự chỉnh `FEATURE_PLAN.md` chỉ để "cho khớp" với code mới. Nếu cần đổi scope, sequencing, assumptions, hoặc solution thì phải dừng và quay lại `feature-plan` hoặc `feature-review`.
- Không tự sửa `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md`, `.agents/PROJECT_STRUCTURE.md`, `.agents/changelog/*`, `.agents/testing/*`.
- Không tự commit, push, hay chuyển tài liệu sang `.agents/history/features/` ngoài điều kiện archive đã được User xác nhận rõ.

## Nguyên tắc nạp ngữ cảnh
- Luôn bắt đầu từ 2 file điều phối:
  - `.agents/active/[feature-slug]/FEATURE_TASKS.md`
  - `.agents/active/[feature-slug]/FEATURE_PLAN.md`
- `FEATURE_TASKS.md` là entry file để xác định phase hiện tại, task hiện tại, và log gần nhất. Không đọc lại toàn bộ `.agents/` ở mỗi phase nếu chưa có lý do kỹ thuật rõ ràng.
- Khi resume, ưu tiên đọc:
  1. dòng `> **Trạng thái**` của `FEATURE_TASKS.md`
  2. phase hiện tại và task chưa hoàn thành
  3. các dòng log gần nhất trong mục `## Execution Log`
  4. phần tương ứng trong `FEATURE_PLAN.md`
- Chỉ đọc thêm `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md`, `.agents/PROJECT_STRUCTURE.md`, `.agents/architecture/MASTER.md` khi:
  - task hiện tại mơ hồ
  - task chạm nhiều layer hoặc cross-module
  - task liên quan auth, security, data flow, schema, migration, deploy, config, permission
  - cần xác minh một ràng buộc kiến trúc hoặc "cấm kỵ" trong KB
- Task chạm `database/functions/`, `database/schema/`, migration, hoặc RPC: đọc thêm `.agents/architecture/DATABASE_CANONICAL_GUIDE.md` để bám đúng quy trình canonical source + Per-Feature Dev Baseline (ADR-001).
- Chỉ quét code ở vùng đang làm và dependency trực tiếp; không sweep full repo vô hướng.
- Đọc Contract đầu file nếu có và không phá Contract mà không nêu rõ cần quay lại cập nhật plan hoặc contract.
- Nếu cần đối chiếu format checklist hoặc log, được phép đọc `.agents/skills/templates/FEATURE_TASKS.template.md`.

> 🛡️ **NGUYÊN TẮC AN TOÀN (High-Risk Commands & Test DB Isolation):**
> 1. AI **BẮT BUỘC** phải giải thích và xin phép User trước khi chạy các lệnh rủi ro cao có thể gây mất dữ liệu, phát sinh chi phí, thay đổi hạ tầng, hoặc làm lệch môi trường.
> 2. **QUY TẮC LOCAL DB TEST HARNESS:** Khi thực thi test (unit test, integration test, mock/seed data, migration verification, RPC test): AI **BẮT BUỘC** sử dụng **Supabase Local Docker CLI** (`supabase status`, `.env.test`/`.env.local`, `127.0.0.1:54321`/`54322`). **TUYỆT ĐỐI KHÔNG** chạy test hoặc chọc script mutation vào Database Cloud.
> 3. **QUY TẮC FULL FRESH-RESET REPLAY:** Nếu phase hiện tại tạo hoặc sửa bất kỳ file migration nào, AI **BẮT BUỘC** chạy full fresh reset — replay lại **toàn bộ** lịch sử migration từ đầu (`pnpm --filter backend test:integration:fresh`, hoặc tối thiểu `node scripts/sync-migrations.cjs && supabase db reset --local`) — **KHÔNG** được coi việc chỉ apply riêng migration mới lên DB local đang có sẵn state là đủ. Apply-riêng-file-mới không phát hiện được lệch thứ tự phụ thuộc giữa các migration hay lệch giữa `database/migrations/` và `supabase/migrations/`.
>    - Lượt replay này BẮT BUỘC chạy **cả ở Bước 0.5 (baseline, trước khi code)** lẫn ở gate cuối mỗi phase. Chỉ chạy ở cuối phase là không đủ: không có baseline thì khi fail sẽ không phân biệt được lỗi do thay đổi của phase hay do migration cũ vốn đã hỏng.
> 4. **QUY TẮC CARRY-FORWARD KHI GHI ĐÈ RPC:** Nếu migration mới dùng `CREATE OR REPLACE FUNCTION` lên một RPC/function đã tồn tại, AI phải đối chiếu với các migration trước đó từng định nghĩa/sửa function đó (đã liệt kê trong `FEATURE_PLAN.md` mục risk hotspots/known pitfalls) và chạy test integration khẳng định invariant nghiệp vụ cũ vẫn đứng vững — full-reset replay chỉ verify migration apply không lỗi cú pháp, không verify đúng nghiệp vụ (tiền lệ: migration 052 từng âm thầm làm mất invariant của migration 015, phải vá lại bằng migration 053).
> 5. **QUY TẮC KHÔNG HARD-CODE LOCAL OVERRIDE:** Nếu migration có assertion phụ thuộc dữ liệu Cloud thật khiến nó fail trên DB local rỗng, khai báo entry trong `database/migrations/local-test-overrides.json` — **TUYỆT ĐỐI KHÔNG** thêm hard-code patch theo tên file trong `backend/scripts/sync-migrations.cjs`, và **TUYỆT ĐỐI KHÔNG** sửa nội dung migration gốc đã chạy trên production.
> 6. **QUY TẮC BÀN GIAO USER TEST:** Vì `supabase db reset` xoá sạch dữ liệu, nếu sau bước full fresh-reset test cần bàn giao User test tay với dữ liệu thật, AI phải chạy lại `pnpm db:restore` trước khi hướng dẫn User test — nếu không User sẽ thấy dữ liệu trống và tưởng nhầm là bug mới.
>
> Ví dụ thường gặp:
> 1. **Cloud / Deploy / Infra:** `gcloud`, `gsutil`, `bq`, `terraform`, `firebase deploy`, `kubectl`, `helm`, hoặc lệnh deploy tương tự.
> 2. **Docker / Container / Volume:** đặc biệt các lệnh xóa hoặc prune như `docker rm`, `docker rmi`, `docker volume rm`, `docker system prune`.
> 3. **Database / Data mutation:** script backfill, xóa dữ liệu, migrate dữ liệu khó rollback, hoặc thao tác trực tiếp vào môi trường dùng chung / Cloud DB.
> 4. **Filesystem / Repo state:** `rm`, `del`, `rd`, `Remove-Item`, xóa thư mục, đổi tên hàng loạt, hoặc thao tác ghi đè có thể làm mất file.
> 5. **Git destructive:** `git reset --hard`, `git clean`, force push, rebase rewrite, hoặc lệnh có nguy cơ mất lịch sử.
>
> **Mẫu giải thích bắt buộc:**
> - **Lệnh:** `[Câu lệnh terminal]`
> - **Mục đích:** [Giải thích ngắn gọn bằng tiếng Việt]
> - **Tác động:** [Ảnh hưởng tới hệ thống, dữ liệu, chi phí, hoặc khả năng rollback]
>
> Chỉ sau khi User xác nhận thì mới được chạy lệnh.

## Workflow

### Bước 0: Suitability Check
1. Xác định feature cần triển khai:
   - Nếu User đã nêu `feature-slug`, dùng slug đó.
   - Nếu `.agents/active/` chỉ có một feature, có thể tự chọn.
   - Nếu có nhiều feature và User chưa nói rõ, hỏi User chọn đúng feature.
2. Kiểm tra sự hiện diện của:
   - `.agents/active/[feature-slug]/FEATURE_PLAN.md`
   - `.agents/active/[feature-slug]/FEATURE_TASKS.md`
3. Đọc phần header của `FEATURE_PLAN.md` và kiểm tra tối thiểu:
   - `> **Trạng thái**`
   - `> **Review gate**`
   - `> **Feature slug**`
4. Quy tắc gate:
   - Nếu plan là `⏳ CHỜ REVIEW` hoặc `Review gate` vẫn yêu cầu review trước khi thực thi, **dừng triển khai** và chuyển sang `feature-review`.
   - Nếu plan là `⚠️ CẦN SỬA` hoặc `❌ TỪ CHỐI`, **không được triển khai**. Hướng dẫn quay lại `feature-plan` hoặc `feature-review`.
   - Nếu User muốn bỏ qua review, chỉ tiếp tục khi việc chấp nhận rủi ro đó đã được ghi rõ trong plan hoặc User yêu cầu cập nhật gate trước.
5. Nếu feature thực chất là bug chưa rõ root cause, hoặc code reality cho thấy plan đang sửa sai vùng:
   - dừng triển khai
   - ghi blocker vào `FEATURE_TASKS.md`
   - chuyển sang `check-issue` hoặc `feature-plan`

### Bước 0.5: Baseline Green Gate (BẮT BUỘC trước khi viết dòng code đầu tiên)

**Áp dụng khi**: feature có bất kỳ task nào tạo/sửa migration, RPC, schema, hoặc chạm DB. Bỏ qua nếu feature thuần frontend/docs không chạm DB.

1. Trước khi bắt đầu bất kỳ task nào, chạy full fresh-reset replay trên **code hiện tại chưa sửa gì** (`pnpm --filter backend test:integration:fresh`, hoặc tối thiểu `node scripts/sync-migrations.cjs && supabase db reset --local` + integration suite).
2. Mục đích: chốt baseline. Nếu không có bước này, khi gate cuối phase fail sẽ **không phân biệt được** lỗi do thay đổi của phase hay do migration cũ vốn đã hỏng sẵn — đây chính là nguyên nhân của vòng lặp "fix xong lỗi này lại lòi ra lỗi khác".
3. Ghi kết quả baseline vào `## Execution Log` của `FEATURE_TASKS.md` ngay lúc đó (số test pass/fail, migration nào fail nếu có). Đây là mốc đối chiếu cho mọi phase sau.
4. Xử lý theo kết quả:
   - **Baseline xanh**: tiếp tục Bước 1 bình thường.
   - **Baseline đỏ**: **DỪNG, không code tiếp**. Báo User rõ: lỗi này đã tồn tại từ trước, không phải do feature hiện tại. Trình bày migration/test nào fail và đề xuất một trong hai hướng — (a) xử lý baseline trước như một issue riêng qua `check-issue`, hoặc (b) User xác nhận chấp nhận baseline đỏ và ghi rõ vào plan phạm vi lỗi được phép bỏ qua. Tuyệt đối không âm thầm gộp việc sửa baseline vào feature hiện tại vì sẽ làm phình scope và che mất nguyên nhân thật.
   - **Không chạy được** (Docker chưa bật, thiếu dependency): báo User để xử lý môi trường trước; không được coi "không chạy được" là "đã pass".
5. Không được dùng kết quả baseline của một session cũ. Baseline phải được chạy lại trong session hiện tại vì `database/migrations/` có thể đã đổi.

### Bước 1: Load Current Execution Context
1. Đọc `FEATURE_TASKS.md` và trích ra:
   - trạng thái hiện tại của feature
   - phase đang làm
   - task đang làm `- [/]` nếu có
   - task tiếp theo `- [ ]` nếu chưa có task nào in progress
   - các dòng gần nhất trong mục `## Execution Log`
2. Đọc `FEATURE_PLAN.md` ở mức đủ dùng để hiểu:
   - scope và out of scope
   - acceptance criteria của phase hiện tại
   - files/modules bị ảnh hưởng
   - risk hotspots, dependencies, rollout concerns
   - test strategy, manual verification, rollback
3. Chỉ mở thêm docs và code liên quan trực tiếp đến phase hiện tại khi cần.

### Bước 2: Chốt Task Hiện Tại Trước Khi Code
1. Xác định task hiện tại:
   - Nếu đã có task `- [/]`, resume task đó.
   - Nếu chưa có task `- [/]`, chọn task `- [ ]` đầu tiên trong phase hiện tại và đổi thành `- [/]`.
2. Cập nhật ngay `FEATURE_TASKS.md` trước khi bắt đầu code:
   - đổi trạng thái task sang `- [/]`
   - nếu feature mới bắt đầu chạy, đổi `> **Trạng thái**` thành `🔄 Đang thực hiện`
   - thêm dòng log phù hợp vào mục `## Execution Log`
3. Không bắt đầu sửa code khi checklist chưa phản ánh đúng task đang làm.

### Bước 3: Thực Thi Task
1. **Pre-Code Contract Verification** (bắt buộc trước khi tạo file script/service mới): Đối chiếu file sắp tạo với đúng dòng khai báo của nó trong bảng `## 6. Files và modules bị ảnh hưởng` của `FEATURE_PLAN.md` và mô tả task tương ứng trong `FEATURE_TASKS.md`, xác nhận khớp: (1) đường dẫn file, (2) input/output — tham số, vị trí đọc/ghi, định dạng, (3) vòng đời — Ephemeral (tạm, có mốc xóa/archive rõ) hay Persistent (tồn tại lâu dài, có thể commit). Nếu plan/task không nói rõ 1 trong 3 mục trên cho file có rủi ro (ghi ra ngoài phạm vi đã công bố, sinh artifact sẽ commit, hoặc path/tên khác dự kiến), dừng lại hỏi User hoặc quay lại `feature-plan`, không tự suy đoán.
2. Triển khai đúng task hiện tại trong scope của phase.
3. Trong lúc triển khai:
   - ưu tiên thay đổi nhỏ, bám acceptance criteria
   - đọc thêm code hoặc docs liên quan trực tiếp nếu phát sinh nhu cầu kỹ thuật thật
   - tôn trọng các ràng buộc trong KB, plan, contract
4. Nếu phát hiện một trong các tình huống sau thì phải dừng:
   - cần đổi solution cốt lõi
   - cần chạm module ngoài bảng impacted area một cách đáng kể
   - phát hiện task breakdown hiện tại thiếu hoặc sai thứ tự
   - root cause thực tế khác với giả định ban đầu
   - file/script vừa tạo có đường dẫn, input/output, hoặc vòng đời khác với khai báo trong `FEATURE_PLAN.md`/`FEATURE_TASKS.md`
5. Khi dừng vì blocker:
   - giữ checklist phản ánh đúng trạng thái thật
   - ghi blocker vào mục `## Execution Log`
   - báo rõ nên quay lại `feature-plan`, `feature-review`, hoặc `check-issue`
6. Khi task hoàn thành:
   - đổi task từ `- [/]` sang `- [x]`
   - cập nhật `FEATURE_TASKS.md` ngay lúc đó
   - ghi log hoàn thành ngay lúc đó

### Bước 4: Gate Bắt Buộc Sau Mỗi Phase
**KHÔNG ĐƯỢC BỎ QUA BƯỚC NÀY**

1. Khi toàn bộ task thường của phase đã xong, chuyển `Task X.Final: 🧪 Test & Verify Phase X` sang `- [/]`.
2. AI **bắt buộc tự test trước** bằng nhiều kiểu test phù hợp với thay đổi của phase.
3. Không bắt buộc chạy mọi kiểu test, nhưng AI **phải chủ động chạy tối đa các kiểu test phù hợp với thay đổi hiện tại trong phạm vi khả thi**, và phải nêu rõ:
   - đã chạy gì
   - kết quả ra sao
   - chưa chạy gì
   - lý do chưa chạy
4. Các kiểu test có thể gồm, tùy phase:
   - `curl` hoặc API smoke test
   - script kiểm tra nhanh hoặc test runner
   - mock data, seed data, fixture
   - unit, integration, e2e nếu có
   - build, lint, typecheck
   - **kiểm tra DB, query, migration, log, queue, cache**: BẮT BUỘC thực thi trên **Supabase Local Docker CLI harness** (`127.0.0.1:54321`/`54322`), tuyệt đối không test trên Cloud DB. Nếu phase tạo/sửa migration: BẮT BUỘC full fresh-reset replay toàn bộ lịch sử migration (`test:integration:fresh` hoặc tương đương), không chỉ apply riêng file mới.
   - UI hoặc manual smoke test nếu phase chạm giao diện
   - **đối chiếu contract**: mọi file mới tạo trong phase khớp đúng path/input-output/vòng đời đã khai báo trong `FEATURE_PLAN.md` §6 và `FEATURE_TASKS.md` — không có artifact nằm ngoài phạm vi đã công bố (vd. output ghi nhầm thư mục, hoặc file lẽ ra ephemeral lại bị commit persistent).
5. Sau khi AI self-test xong, **phải dừng lại và cập nhật `FEATURE_TASKS.md` ngay lúc đó**, gồm:
   - trạng thái các task trong phase
   - trạng thái `Task X.Final`
   - mục `## Execution Log` trong `FEATURE_TASKS.md`
6. Sau đó AI trình bày cho User:
   - phase nào vừa hoàn thành
   - AI đã tự test bằng những cách nào
   - kết quả test
   - những gì chưa test được và vì sao
   - hướng dẫn manual test cho User
   - kết quả mong đợi để User đối chiếu
7. Chỉ khi User xác nhận `OK`, `Đạt`, `Confirm`, hoặc tương đương thì mới được:
   - đổi `Task X.Final` sang `- [x]`
   - ghi log hoàn thành phase
   - chuyển sang phase tiếp theo
8. Nếu User báo lỗi:
   - giữ phase ở trạng thái chưa hoàn tất
   - ghi `retry` hoặc `block` vào `## Execution Log`
   - sửa trong cùng phase rồi test lại
9. Nếu User muốn dừng:
   - giữ `FEATURE_TASKS.md` phản ánh trạng thái thật tại thời điểm dừng
   - ghi log ngắn gọn để lần sau resume nhanh

### Bước 5: Lặp Lại Theo Phase
Lặp lại Bước 2 đến Bước 4 cho đến khi tất cả phase hoàn thành.

### Bước 6: Hoàn Thành Feature
Khi toàn bộ task của tất cả phases, bao gồm mọi `Task X.Final`, đã là `- [x]`:
0. Nếu **bất kỳ phase nào** của feature đã tạo hoặc sửa migration: chạy thêm một lượt full fresh-reset replay cuối cùng (`test:integration:fresh` hoặc tương đương) + toàn bộ integration suite, trước khi báo hoàn thành — vì tương tác chéo giữa các phase có thể phát sinh lỗi mà từng phase riêng lẻ không lộ ra. Nếu fail, đây là blocker phải xử lý trước khi đổi trạng thái `✅ Hoàn thành`.
1. Cập nhật `> **Trạng thái**` trong `FEATURE_TASKS.md` thành `✅ Hoàn thành`.
2. Ghi log hoàn tất feature trong mục `## Execution Log`.
3. Báo cáo ngắn gọn:
   - phase nào đã hoàn thành
   - vùng code chính đã thay đổi
   - AI đã test những gì
   - còn rủi ro hoặc follow-up nào không
4. Trình bày next-step proposal theo workflow mặc định:
   - `archive`
   - `update-docs`
   - `git-sync`
5. Bắt buộc hỏi User xác nhận trước mỗi bước handoff; không tự động gọi skill tiếp theo.
6. Các dạng xác nhận hợp lệ nên hỗ trợ:
   - `OK archive`
   - `Bỏ qua archive`
   - `OK update-docs`
   - `Bỏ qua update-docs`
   - `OK git-sync`
   - `Bỏ qua git-sync`
7. Mặc định archive là bước đầu tiên sau khi feature hoàn thành. Chỉ khi User chủ động nói rõ muốn giữ feature ở `.agents/active/` thì mới được hoãn bước này và phải nhắc rõ feature chưa đóng vòng đời.

### Bước 7: Archive Completed Feature
1. Chỉ vào bước này khi đồng thời thỏa:
   - `FEATURE_TASKS.md` đã ở trạng thái `✅ Hoàn thành`
   - không còn task `- [ ]` hoặc `- [/]`
2. Trước khi di chuyển file, phải trình bày proposal ngắn:
   - đường dẫn hiện tại trong `.agents/active/[feature-slug]/`
   - đường dẫn archive dự kiến `.agents/history/features/[YYYY-MM-DD]-[feature-slug]/`
   - nhắc rõ sau khi archive thì feature không còn nằm trong tập active
3. Chỉ khi User xác nhận rõ như `OK archive` thì mới được:
   - tạo thư mục archive đích nếu chưa có
   - di chuyển toàn bộ thư mục `.agents/active/[feature-slug]/` sang `.agents/history/features/[YYYY-MM-DD]-[feature-slug]/`
   - báo lại đường dẫn cũ và đường dẫn mới
4. Sau khi archive xong:
   - báo rõ bước kế tiếp mặc định là `update-docs`
   - sau khi docs và commit message đã chốt, bước kế tiếp mặc định là `git-sync`
5. Nếu User chưa duyệt archive:
   - giữ nguyên feature trong `.agents/active/`
   - báo rõ feature đã hoàn thành nhưng chưa archive
   - chỉ handoff tiếp sang `update-docs` nếu User chủ động nói rõ muốn đi tiếp mà tạm hoãn archive

## Quy ước cập nhật `FEATURE_TASKS.md`
- Task chưa làm: `- [ ] Mô tả task`
- Task đang làm: `- [/] Mô tả task`
- Task hoàn thành: `- [x] Mô tả task`
- `Task X.Final: 🧪 Test & Verify Phase X` chỉ được tick `- [x]` khi:
  - AI đã hoàn tất self-test
  - User đã test
  - User đã confirm pass

## Gợi ý dùng `## Execution Log`
Log nằm **trong `FEATURE_TASKS.md`**, không phải file riêng.

Mỗi lần cập nhật nên ghi đủ:
- thời gian
- phase
- task
- hành động ngắn gọn
- trạng thái
- ghi chú nếu có

Có thể dùng các trạng thái như:
- `start`
- `done`
- `block`
- `retry`

## Chat Flow chuẩn hành vi

Các ví dụ dưới đây mô tả **mặc định hành vi phải làm**, không phải gợi ý tùy chọn.

### 1. Có nhiều feature active, phải hỏi rõ `feature-slug`
```text
User: Triển khai feature giúp tôi.
AI: Tôi thấy hiện có nhiều feature trong `.agents/active/`, nên chưa thể tự chọn an toàn.
AI: Bạn chọn đúng `feature-slug` giúp tôi: `invoice-pdf-export` hay `upload-avatar`?
```

### 2. Feature đã qua gate, phải resume đúng task hiện tại rồi mới code
```text
User: Triển khai feature `invoice-pdf-export`.
AI: Tôi sẽ đọc `FEATURE_TASKS.md` trước để kiểm tra phase hiện tại, task `- [/]` nếu có, và log gần nhất; sau đó mới đọc phần tương ứng trong `FEATURE_PLAN.md`.
AI: Nếu đã có task `- [/]`, tôi phải resume đúng task đó. Nếu chưa có, tôi sẽ chọn task `- [ ]` đầu tiên của phase hiện tại.
AI: Feature này hiện ở `Phase 2` và chưa có task in progress, nên tôi chuyển `Task 2.1` sang `- [/]`, cập nhật `> **Trạng thái**` và `## Execution Log` trong `FEATURE_TASKS.md`, rồi mới sửa code.
```

### 3. Plan chưa đủ điều kiện để code
```text
User: Triển khai feature `upload-avatar`.
AI: Tôi thấy `FEATURE_PLAN.md` vẫn ở trạng thái `⏳ CHỜ REVIEW` và `Review gate` chưa cho phép thực thi.
AI: Bước đúng tiếp theo là gọi `feature-review`, không nên code ngay.
```

### 4. Hoàn thành phase, self-test, dừng để User test, rồi mới chốt phase
```text
AI: Các task thường của `Phase 2` đã xong. Tôi đã chuyển `Task 2.Final` sang `- [/]`, cập nhật `## Execution Log`, rồi self-test bằng `curl`, unit test, và typecheck.
AI: `curl` pass, unit test pass, typecheck pass. Tôi chưa chạy e2e vì repo hiện không có suite tương ứng.
AI: Bạn giúp test theo 3 bước sau... Kết quả mong đợi là ... Nếu pass, hãy trả lời `OK`.
User: OK.
AI: Tôi đã chuyển `Task 2.Final` sang `- [x]`, ghi log hoàn thành `Phase 2` vào `## Execution Log`, và chỉ từ thời điểm này mới được chuyển sang phase tiếp theo.
```

### 5. User test fail, phải giữ phase hiện tại và log `retry` hoặc `block`
```text
AI: Bạn giúp test theo 3 bước sau...
User: Bước 2 bị lỗi 500.
AI: Tôi giữ `Task 2.Final` ở `- [/]`, chưa được chốt phase, và cập nhật `## Execution Log` với trạng thái `retry` hoặc `block` tùy mức độ.
AI: Tôi sẽ sửa trong chính `Phase 2`, tự test lại, rồi mới nhờ bạn confirm lại.
```

### 6. User muốn dừng, phải lưu trạng thái thật để resume nhanh
```text
AI: Tôi đã self-test xong và đang chờ bạn manual test.
User: Tạm dừng ở đây.
AI: Tôi giữ `FEATURE_TASKS.md` phản ánh đúng trạng thái hiện tại, thêm log ngắn vào `## Execution Log`, và không tự ý chốt phase hay chuyển phase.
```

### 7. Phát hiện lệch plan trong lúc code, phải handoff đúng skill
```text
AI: Trong lúc triển khai `Task 2.2`, tôi thấy root cause thực tế nằm ở queue worker chứ không phải API layer như plan hiện tại.
AI: Tôi đã dừng, giữ checklist ở trạng thái đúng, và ghi blocker vào mục `## Execution Log` trong `FEATURE_TASKS.md`.
AI: Bước đúng tiếp theo là quay lại `check-issue` để chốt lại root cause. Nếu root cause mới làm đổi scope, sequencing, hoặc solution cốt lõi, cần quay lại `feature-plan` hoặc `feature-review`. Tôi không tự sửa `FEATURE_PLAN.md` trong skill này.
```

### 8. Feature đã xong, phải archive trước rồi mới chốt docs và Git
```text
AI: Tất cả task, gồm cả `Task X.Final`, đã ở `- [x]`. Tôi đã cập nhật `> **Trạng thái**: ✅ Hoàn thành` và ghi log chốt feature.
AI: Theo workflow mặc định, bước tiếp theo là archive feature này sang `.agents/history/features/` trước khi chốt docs và Git. Nếu đồng ý, trả lời `OK archive`.
User: OK archive.
AI: Tôi di chuyển toàn bộ folder feature sang history và báo lại đường dẫn cũ -> đường dẫn mới.
AI: Bước tiếp theo là `update-docs`. Skill đó có thể đọc lại `FEATURE_TASKS.md` và `FEATURE_PLAN.md` từ folder history vừa tạo để chốt changelog, testing, và commit message.
User: OK update-docs.
AI: Sau khi `update-docs` xong và commit message đã chốt, bước kế tiếp là `git-sync`. Nếu đồng ý, trả lời `OK git-sync`.
User: OK git-sync.
```

## Handoff Contract
- Với `feature-plan`:
  - Quay lại khi cần đổi scope, assumptions, sequencing, impacted files, hoặc solution cốt lõi.
  - Không tự sửa plan chỉ để hợp thức hóa thay đổi phát sinh.
- Với `feature-review`:
  - Quay lại khi plan cần review lại do thay đổi thiết kế, risk profile, migration, permission, rollout, hoặc User muốn bỏ qua gate hiện có.
  - Không tự xem mình thay thế được review.
- Với `check-issue`:
  - Quay lại khi phát hiện root cause thực tế chưa rõ, khác với giả định trong plan, hoặc bug behavior không khớp vùng sửa hiện tại.
- Với `update-docs`:
  - Ưu tiên handoff sau khi feature đã được archive xong.
  - Nếu User cố tình giữ feature ở `.agents/active/`, phải nói rõ đây là ngoại lệ của workflow mặc định.
  - Phải có xác nhận rõ của User trước khi chuyển sang bước này.
  - Coordinator chỉ tóm tắt thay đổi và gợi ý bước tiếp theo, không tự ghi docs.
- Với `git-sync`:
  - Chỉ nên gọi sau khi `update-docs` đã chốt commit message hoặc User đã cung cấp commit message phù hợp.
  - Phải có xác nhận rõ của User trước khi chuyển sang bước này.
  - `git-sync` không thay thế bước archive; nếu feature vẫn còn ở `.agents/active/` thì đó là dấu hiệu workflow chưa được đóng đúng chuẩn.

## Output kỳ vọng
- Code, test, config, hoặc migration của phase hiện tại được triển khai đúng scope.
- `FEATURE_TASKS.md` luôn phản ánh đúng task đang làm, task đã xong, và trạng thái thật của feature.
- Sau mỗi phase luôn có:
  - AI self-test bằng nhiều kiểu phù hợp
  - báo cáo test rõ ràng
  - hướng dẫn User test
  - User confirm trước khi đi tiếp
- Khi feature hoàn thành, workflow kết thúc đúng thứ tự `archive -> update-docs -> git-sync`; không có việc tự động gọi các bước này khi User chưa xác nhận.

## Lưu ý quan trọng
- **BẮT BUỘC** đọc `FEATURE_TASKS.md` trước khi bắt đầu triển khai.
- **BẮT BUỘC** kiểm tra `> **Trạng thái**` và `> **Review gate**` trong `FEATURE_PLAN.md` trước khi code.
- **BẮT BUỘC** chạy Baseline Green Gate (Bước 0.5) trước dòng code đầu tiên nếu feature chạm DB/migration; baseline đỏ thì dừng và báo User, không tự gộp việc sửa baseline vào feature hiện tại.
- **BẮT BUỘC** đối chiếu path/input-output/vòng đời (Ephemeral vs Persistent) của file script/service mới tạo với đúng khai báo trong `FEATURE_PLAN.md` §6 và `FEATURE_TASKS.md` — trước khi tạo file, và trước khi tick task `- [x]`.
- **BẮT BUỘC** cập nhật checklist và mục `## Execution Log` trong `FEATURE_TASKS.md` ngay sau mỗi task và sau mỗi phase.
- **BẮT BUỘC** dừng sau mỗi phase để AI self-test, User test, và User confirm.
- **BẮT BUỘC** khi feature hoàn thành phải đề xuất bước archive theo luồng `archive -> update-docs -> git-sync`.
- **BẮT BUỘC** hỏi User xác nhận trước khi handoff sang `archive`, `update-docs`, hoặc `git-sync`; không auto-chain skill.
- **KHÔNG** được tick `Task X.Final` khi User chưa confirm pass.
- **KHÔNG** tự động tiếp phase tiếp theo khi chưa có xác nhận của User.
- **KHÔNG** sweep toàn repo nếu phase hiện tại chỉ chạm một vùng nhỏ.
- **KHÔNG** tự sửa plan, docs, KB, changelog, commit, push, hoặc archive ngoài phạm vi được phép và ngoài thứ tự workflow đã chốt.
- `FEATURE_TASKS.md` là source of truth; không dựa vào trí nhớ trong context để thay file.
