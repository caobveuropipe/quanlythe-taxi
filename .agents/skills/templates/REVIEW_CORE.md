# Review Core

Nguồn duy nhất cho phần **runtime-agnostic** của review hội đồng.

Được dùng bởi:

| Skill | Runtime | Execution strategy |
|---|---|---|
| `.agents/skills/feature-review/SKILL.md` | Runtime không delegate được | Một agent, các lượt rà soát tách biệt |
| `.agents/skills/spawn-agent-review/SKILL.md` | Codex có `spawn_agent` | Reviewer tách biệt qua `spawn_agent` |
| `.claude/skills/feature-review-claude/SKILL.md` | Claude Code | Subagent qua `Agent`/`SendMessage`, có mode degrade |

Skill chỉ định nghĩa **execution strategy** và **gate riêng của runtime**. Mọi luật trong file này là bắt buộc và không được override trong skill. Nếu một skill cần lệch khỏi core, phải sửa core, không fork luật.

---

## 1. Gate sử dụng

Không review khi:

- Thiếu `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md` hoặc `.agents/PROJECT_STRUCTURE.md`: dùng `project-init`.
- Chưa có `.agents/active/[feature-slug]/FEATURE_PLAN.md` hoặc `FEATURE_TASKS.md`: dùng `feature-plan`.
- Root cause của bug hoặc solution còn dựa trên hypothesis chưa được chứng minh: dùng `check-issue`.
- User muốn bắt đầu hoặc tiếp tục triển khai: chỉ handoff sang `feature-coordinator` sau khi review qua gate.

Nếu fail gate, dừng review và nêu rõ artifact còn thiếu hoặc skill cần chuyển sang.

## 2. Quyền đọc và ghi

- Có thể đọc Knowledge Base, kiến trúc, code, test, config, schema, migration và contract cần thiết để review.
- Mọi file được tạo hoặc chỉnh sửa phải nằm trong đúng thư mục feature đang review: `.agents/active/[feature-slug]/`.
- Trước khi ghi, resolve đường dẫn tuyệt đối và xác nhận target vẫn nằm dưới thư mục feature đó; không ghi qua symlink hoặc junction trỏ ra ngoài.
- Không sửa application code, file dùng chung trong `.agents/`, hoặc artifact của feature khác.
- Reviewer được delegate là **read-only**: không sửa file, không tạo patch, không spawn thêm agent. Runtime nào enforce được bằng cơ chế thì phải enforce, không chỉ dựa vào prompt.
- Sau verdict, chủ tọa tạo hoặc overwrite `.agents/active/[feature-slug]/EXPERT_REVIEW.md` theo contract ở mục 10.
- Chỉ khi user xác nhận lưu trạng thái review, được chỉnh tối thiểu trong `FEATURE_PLAN.md`: `Trạng thái`, `Review gate` và `## Review Notes`.
- Không tự rewrite scope, solution hoặc task breakdown. Nếu cần thay đổi nội dung plan/tasks, chỉ nêu `Required Fix` để handoff sang `feature-plan`.

## 3. Roster reviewer

Chủ tọa là **Chief Architect / Chủ tọa Hội đồng Review Kỹ thuật** và luôn giữ một pass kiến trúc riêng.

Mặc định:

- `Chief Architect`: architecture fit, boundary, coupling, contract và tính kế thừa Knowledge Base.
- `Delivery and QA Reviewer`: sequencing, acceptance coverage, testability, verification và rollout practicality.

Theo hotspot:

- `Security Reviewer`: auth, permission, validation, upload, PII, secrets, session/token.
- `Data Reviewer`: schema, migration, backfill, consistency, idempotency, queue, cache, retry và concurrency.
- `API Contract Reviewer`: DTO, serialization, request/response contract và backward compatibility.
- `Operations Reviewer`: env, deploy, feature flag, monitoring, alerting và rollback.
- `UX/Product Reviewer`: user-facing flow hoặc trade-off UX trực tiếp.

Chỉ triệu tập reviewer khi có concern material. Chuẩn mặc định là `2 reviewer bắt buộc + tối đa 3 reviewer bổ sung`; chỉ vượt mốc này với feature cross-cutting và phải nêu lý do.

## 4. Project-specific non-negotiable: DB Harness

- Mọi test liên quan DB/RPC/Auth/Storage phải dùng Supabase Local Docker CLI tại `127.0.0.1:54321`/`54322`; cấm test trên Cloud DB.
- `Delivery and QA Reviewer` chịu trách nhiệm kiểm tra Test Strategy và DB Harness.
- Khi có migration, seed hoặc RPC verification, `Data Reviewer` kiểm tra tính cô lập trên local harness.
- `Data Reviewer` PHẢI chặn (`High` trở lên) nếu plan tạo/sửa migration với `CREATE OR REPLACE FUNCTION` lên một RPC/function đã tồn tại mà:
  - không liệt kê đủ lịch sử các migration trước đó từng định nghĩa/sửa function đó (mục `known pitfalls` của plan), hoặc
  - không có task test integration khẳng định invariant nghiệp vụ của các migration cũ đó vẫn đứng vững sau khi apply migration mới.
  - Bằng chứng nền: migration `052_update_org_unit_triggers_and_pending_rpc.sql` từng ghi đè `submit_employee_pending` bằng bản cũ, làm mất invariant "Salary Pending Isolation" từ migration 015 — migration đó vẫn apply thành công 100%, chỉ sai nghiệp vụ.
- `Data Reviewer` PHẢI kiểm tra: nếu migration mới có assertion phụ thuộc dữ liệu Cloud thật, plan có task thêm entry vào `database/migrations/local-test-overrides.json` không — KHÔNG chấp nhận đề xuất hard-code patch trong `sync-migrations.cjs` hoặc sửa nội dung migration gốc đã chạy trên production.
- `Delivery and QA Reviewer` PHẢI xác nhận Test Strategy có task full fresh-reset replay (`test:integration:fresh` trong `backend/package.json`, hoặc tương đương) khi feature tạo/sửa migration — apply riêng migration mới lên DB local đang có sẵn state không đủ để verify.
- `Delivery and QA Reviewer` PHẢI chặn nếu feature chạm DB/migration/RPC/schema mà `FEATURE_TASKS.md` thiếu `Task 0: Baseline Green Gate` (full fresh-reset replay trên code chưa sửa, chạy trước mọi phase). Không có baseline thì khi gate cuối phase fail sẽ không phân biệt được lỗi do feature hay do migration cũ đã hỏng sẵn — đây là nguyên nhân trực tiếp của vòng lặp "fix xong lỗi này lại lòi ra lỗi khác".

## 5. Luật findings và phản biện

1. Mỗi reviewer thực hiện một review pass riêng và có section riêng trong báo cáo.
2. Mỗi finding phải có `Issue`, `Evidence`, `Impact`, `Required Fix`, `Severity` và `Confidence`.
3. Reviewer không có finding mới phải ghi `Không có phát hiện mới.`
4. Chief Architect canonicalize finding thành `FR-01`, `FR-02`, ... và gộp finding trùng lặp.
5. `Critical` hoặc `High` chỉ hợp lệ khi có evidence cụ thể từ plan line, task ID, file path, config, schema, migration, contract hoặc artifact bắt buộc còn thiếu.
6. `Critical/High` với `Confidence: Low` không được dùng để block; chuyển vào `Cần xác thực thêm` hoặc hạ thành khuyến nghị không chặn rollout.
7. Không fabricate finding, conflict, consensus hoặc dissent. Không gọi reviewer là độc lập nếu execution strategy chưa chứng minh được tính độc lập đó.
8. Chỉ mở debate cho conflict material về severity, scope, sequencing, rollout, ownership hoặc trade-off.
9. Rebuttal chỉ có bốn trạng thái: `Giữ nguyên`, `Điều chỉnh`, `Rút lại`, `Đánh dấu trade-off kỹ thuật chưa phân định`.
10. Tối đa hai vòng rebuttal; dừng sớm khi hết conflict material. Nếu vẫn còn conflict, ghi `Bất đồng chưa ngã ngũ`.
11. Reviewer không tự escalate tới user. Chỉ Chief Architect xác định trade-off kinh doanh cần user quyết định.
12. Technical blocker không được trình bày như một lựa chọn A/B cho user.
13. Với re-review, giữ nguyên `FR-xx` nếu concern không đổi bản chất; chỉ cấp ID mới cho concern mới hoặc đã thay đổi material.

## 6. Nạp ngữ cảnh theo rủi ro

Đọc theo tầng, không sweep toàn repo để "cho chắc":

1. `.agents/active/[feature-slug]/FEATURE_PLAN.md`
2. `.agents/active/[feature-slug]/FEATURE_TASKS.md`
3. `.agents/skills/templates/FEATURE_PLAN.template.md`
4. `.agents/skills/templates/FEATURE_TASKS.template.md`
5. `.agents/KNOWLEDGE_BASE.md`
6. `.agents/CONTEXT.md`
7. `.agents/PROJECT_STRUCTURE.md`
8. `.agents/architecture/MASTER.md` khi chạm boundary quan trọng hoặc cross-layer
9. Code, test, config, schema, migration và contract trong vùng bị ảnh hưởng

Bắt buộc mở rộng deep scan khi feature chạm auth, permission, validation, schema, migration, contract, queue, cache, env, deploy, upload, PII, payment, inventory, concurrency, retry hoặc compensation. Đọc contract đầu file nếu có; không đề xuất phá contract mà không nêu rõ contract cần sửa.

Chỉ đọc `.agents/skills/templates/COUNCIL_REVIEW_EXAMPLES.md` khi cần xử lý format conflict/rebuttal phức tạp hoặc transcript hiện tại chưa đủ rõ; không đọc mặc định cho review không có conflict.

## 7. Workflow xương sống

### 0. Suitability

- Xác định `feature-slug` và thư mục feature tuyệt đối.
- Chạy gate ở mục 1, cộng thêm gate riêng của runtime do skill định nghĩa.

### 1. Load Context

- Từ plan: trích status, review gate, scope, assumptions, acceptance criteria, affected files, risk hotspots, phase strategy, test strategy và rollback.
- Từ tasks: trích phase breakdown, `Task X.Final`, migration/config/docs/test/deploy tasks.
- Đối chiếu hai template và ba tài liệu nền bắt buộc.
- Với re-review, trích trạng thái các `FR-xx` cũ từ `Review Notes` hoặc review trước.

### 2. Structural Review

Kiểm tra plan/tasks đủ mục theo template, không còn placeholder material, không mâu thuẫn giữa gate/hotspot/focus, acceptance criteria map vào tasks, mỗi phase có `Task X.Final`, và Test Strategy/Rollback Plan đủ nghiêm túc.

Nếu fail cấu trúc, **không** triệu tập hội đồng và không deep scan toàn repo; trả `⚠️ CẦN SỬA` hoặc `❌ TỪ CHỐI` với evidence.

### 3. Risk-Driven Deep Scan

Quét vùng bị ảnh hưởng, call chain lân cận và các artifact liên quan để chọn reviewer và tạo brief. Với re-review không đổi scope lớn, ưu tiên đóng/mở `FR-xx` cũ; chỉ mở rộng scan cho scope mới, hotspot mới hoặc dấu hiệu regression.

### 4. Council Review

1. `Thiết Lập Hội Đồng`: chọn reviewer, giải thích lý do triệu tập, ghi rõ execution strategy thực tế đã dùng.
2. `Nhận Định Riêng`: **execution do skill định nghĩa**. Mỗi reviewer báo tối đa 5 finding; tối đa 7 khi thực sự khác biệt và material.
3. `Chuẩn Hóa Vấn Đề`: chờ đủ kết quả của mọi reviewer đã triệu tập, gộp finding, gán `FR-xx`, ghi ai raise, bổ sung evidence hoặc disagree.
4. `Ma Trận Bất Đồng`: so sánh severity, scope, sequencing, rollout, ownership và trade-off.
5. `Phản Biện`: chỉ chạy khi có conflict material; mỗi response 3–5 câu, tập trung vào evidence mới hoặc lý do đổi lập trường.
6. `Tư Vấn Cuối Cùng`: kiểm tra ngưỡng evidence và tách blocker, khuyến nghị, cần xác thực thêm, bất đồng, trade-off kinh doanh và điều kiện triển khai.

### 5. Verdict

Theo mục 8.

### 6. Artifacts và trạng thái

- Xuất báo cáo theo mục 9 và tạo `EXPERT_REVIEW.md` theo mục 10 trong đúng thư mục feature.
- Nếu user chỉ muốn xem review, không cập nhật trạng thái trong `FEATURE_PLAN.md`.
- Nếu user xác nhận lưu trạng thái, cập nhật tối thiểu các trường được phép rồi dừng; không tự chuyển sang skill tiếp theo.

## 8. Severity, Confidence, Verdict

Severity:

- `Critical`: blocker nghiêm trọng, không được triển khai.
- `High`: blocker lớn, phải sửa trước triển khai.
- `Medium`: nên sửa trước nếu có thể.
- `Low`: cải tiến hoặc lưu ý không chặn rollout.

Confidence:

- `High`: evidence trực tiếp và đủ mạnh.
- `Medium`: evidence hợp lý nhưng còn giả định nhỏ.
- `Low`: nghi ngờ có cơ sở nhưng chưa đủ chốt blocker.

Verdict:

- `✅ ĐỒNG Ý`: không còn blocker `Critical` hoặc `High`.
- `⚠️ CẦN SỬA`: còn blocker nhưng hướng hiện tại vẫn cứu được.
- `❌ TỪ CHỐI`: plan sai hướng, phá Knowledge Base hoặc thiếu ngữ cảnh đến mức review không đáng tin.

Không đổi verdict thành `✅ ĐỒNG Ý` chỉ vì user chấp nhận bỏ qua blocker; ghi rõ risk acceptance.

## 9. Output contract

Báo cáo ưu tiên tiếng Việt tự nhiên; chỉ giữ tiếng Anh cho code identifier, API, file path, tool/runtime hoặc thuật ngữ kỹ thuật cần thiết.

```md
# BÁO CÁO REVIEW FEATURE: [feature-slug]

Kết luận: [verdict]
Cổng review: [handoff hoặc hành động bắt buộc]

## Thiết Lập Hội Đồng
- Chiến lược thực thi: [chuỗi do skill quy định]
- Loại review: review đầu tiên | review lại
- Thành phần và lý do triệu tập

## Nhận Định Riêng
### Vấn Đề Chuẩn Hóa
- FR-xx: [tiêu đề] — nêu bởi/bổ sung/disagree

### [Tên từng reviewer được triệu tập]
1. FR-xx [Severity][Confidence] [tiêu đề]
   - Vấn đề:
   - Bằng chứng:
   - Ảnh hưởng:
   - Yêu cầu sửa:

## Các Vòng Phản Biện
- Ma trận bất đồng và các vòng rebuttal; hoặc:
- Không có bất đồng material. Bỏ qua Vòng 2.

## Tư Vấn Cuối Cùng Của Kiến Trúc Sư Trưởng
- Blocker đã xác nhận
- Khuyến nghị không chặn rollout
- Cần xác thực thêm
- Trade-off kinh doanh cần user quyết định
- Bất đồng chưa ngã ngũ
- Điều kiện trước khi triển khai
- Khuyến nghị bước tiếp theo
```

Với re-review, báo trạng thái đóng/mở của `FR-xx` cũ trước finding mới. Mỗi reviewer được triệu tập phải có section riêng, kể cả khi chỉ ghi `Không có phát hiện mới.`

## 10. `EXPERT_REVIEW.md` contract

Tạo hoặc overwrite `.agents/active/[feature-slug]/EXPERT_REVIEW.md` sau khi có verdict:

```md
---
source: [tên skill review đã chạy]
feature: [feature-slug]
round: [review round]
timestamp: [ISO 8601]
verdict: [verdict]
---

# Expert Review: [feature-slug]

## Findings
### FR-xx: [tiêu đề]
- **Severity**: Critical | High | Medium | Low
- **Confidence**: High | Medium | Low
- **Issue**: ...
- **Evidence**: ...
- **Impact**: ...
- **Required Fix**: ...

## Khuyến nghị không chặn rollout
## Cần xác thực thêm
```

Ghi mọi `FR-xx` đã canonicalize, kể cả finding `Low`, đã điều chỉnh hoặc rút lại. Nếu không có finding, ghi `Không có finding.` dưới `## Findings`.

### Từ vựng dùng chung khi ghi `EXPERT_REVIEW.md`

`EXPERT_REVIEW.md` là file trao đổi giữa nhiều skill và nhiều runtime, nên từ vựng phải thống nhất.

**Severity**: luôn dùng `Critical | High | Medium | Low` theo mục 8. Không dùng thang `P0/P1/P2/P3`. Khi đọc file do skill cũ ghi bằng thang P, quy đổi `P0→Critical`, `P1→High`, `P2→Medium`, `P3→Low` và ghi lại theo thang chuẩn ở vòng tiếp theo.

**Prefix ID**:

- `FR-xx`: finding do review hội đồng canonicalize.
- `EFR-xx`: finding đang chờ phản biện, do skill vai tấn công ghi ra.
- `SFR-xx`: finding mới phát sinh trong lúc phản biện, do `expert-rebuttal` ghi.

**`verdict`** có hai bộ giá trị theo mục đích, không trộn:

- Review hội đồng ghi gate triển khai: `✅ ĐỒNG Ý | ⚠️ CẦN SỬA | ❌ TỪ CHỐI`.
- Skill trong vòng lặp rebuttal ghi trạng thái vòng: `✅ HỘI TỤ | ⚠️ CÒN FINDING`.

Bên đọc phải coi `✅ ĐỒNG Ý` và `✅ HỘI TỤ` là **cùng nghĩa "không còn finding mở"** khi kiểm tra status gate. Chỉ kiểm một trong hai là bug: một plan vừa qua council review sẽ mang `✅ ĐỒNG Ý` chứ không bao giờ mang `✅ HỘI TỤ`.

## 11. Handoff

- `feature-plan`: nêu blocker và `Required Fix`; re-review ưu tiên `FR-xx` cũ.
- `feature-coordinator`: chỉ handoff khi verdict phù hợp và gate rõ.
- `check-issue`: redirect khi solution dựa trên giả thuyết chưa kiểm chứng.
- `expert-rebuttal`: dùng `EXPERT_REVIEW.md` để phản biện hoặc gửi expert ngoài.
