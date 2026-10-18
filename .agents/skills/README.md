---
description: Hệ thống Multi Agent Skills - quản lý vòng đời tài liệu và thực thi feature cho dự án
---

# Multi Agent Skills (MAS)

Hệ thống skill-based để bootstrap, chuẩn hóa, triển khai, review, và duy trì bộ tài liệu `.agents/` cho một dự án.

## Cách đặt vào dự án

Pack có **hai nửa**, phải copy cả hai:

1. Folder này vào `.agents/skills/` của repo cần dùng — dùng được trên mọi runtime, gọi theo tên hoặc path.
2. Folder `.claude/` vào **root repo** — chỉ Claude Code đọc, và **bắt buộc** đúng đường dẫn đó mới được auto-discover. Copy vào chỗ khác thì slash command và reviewer subagent không tồn tại.

Chỉ copy nửa `.agents/skills/` thì trên Claude Code sẽ mất `/feature-review-claude`, `/expert-rebuttal-claude` và toàn bộ 6 reviewer subagent read-only.

Sau khi copy, cấu trúc tối thiểu sẽ là:

```text
.agents/
|-- skills/
|   |-- README.md
|   |-- project-init/
|   |   `-- SKILL.md
|   |-- feature-plan/
|   |   `-- SKILL.md
|   |-- feature-review/
|   |   `-- SKILL.md
|   |-- spawn-agent-review/
|   |   `-- SKILL.md
|   |-- expert-rebuttal/
|   |   `-- SKILL.md
|   |-- expert-rebuttal-codex/
|   |   `-- SKILL.md
|   |-- feature-coordinator/
|   |   `-- SKILL.md
|   |-- check-issue/
|   |   `-- SKILL.md
|   |-- docs-hygiene/
|   |   `-- SKILL.md
|   |-- update-docs/
|   |   `-- SKILL.md
|   |-- git-sync/
|   |   `-- SKILL.md
|   |-- codebase-audit/
|   |   `-- SKILL.md
|   `-- templates/
|       |-- CONTEXT.template.md
|       |-- KNOWLEDGE_BASE.template.md
|       |-- PROJECT_STRUCTURE.template.md
|       |-- FEATURE_PLAN.template.md
|       |-- FEATURE_TASKS.template.md
|       |-- REVIEW_CORE.md
|       |-- COUNCIL_REVIEW_EXAMPLES.md
|       |-- TESTING.template.md
|       |-- ARCHITECTURE.template.md
|       |-- CHANGELOG-FE.template.md
|       |-- CHANGELOG-BE.template.md
|       |-- CHANGELOG-DB.template.md
|       `-- GCLOUD_DEPLOY_CONFIG.template.json
```

Trên Claude Code, skill review nằm ở đường dẫn riêng vì Claude Code chỉ auto-discover skill trong `.claude/`:

```text
.claude/
|-- skills/
|   |-- feature-review-claude/
|   |   `-- SKILL.md          # review hội đồng, gọi bằng /feature-review-claude
|   |-- expert-rebuttal-claude/
|   |   `-- SKILL.md          # vai tấn công vòng rebuttal, gọi bằng /expert-rebuttal-claude
|   `-- check-issue-claude/
|       `-- SKILL.md          # RCA read-only, gọi bằng /check-issue-claude
`-- agents/
    |-- review-delivery-qa.md # reviewer subagent read-only (tools: Read, Grep, Glob)
    |-- review-security.md
    |-- review-data.md
    |-- review-api-contract.md
    |-- review-operations.md
    `-- review-ux-product.md
```

## Mục tiêu của từng skill

| Skill | Vai trò | Dùng khi nào |
|------|------|--------------|
| `project-init` | Scout | Chuẩn hóa, bổ sung, hoặc audit bộ `.agents/` cho repo ở bất kỳ giai đoạn nào, gồm cả việc đưa skill pack vào áp dụng |
| `feature-plan` | Architect | Chuyển yêu cầu thành plan và task breakdown |
| `feature-review` | Reviewer | Soi kiến trúc, security, logic trước khi thực thi trên runtime không delegate được reviewer |
| `spawn-agent-review` | Reviewer | Soi kiến trúc, security, logic trước khi thực thi trên Codex runtime có `spawn_agent`, với delegated council review |
| `.claude/skills/feature-review-claude` | Reviewer | Bản Claude Code của cùng hội đồng: reviewer subagent qua `Agent`/`SendMessage`, có mode degrade về single-agent |
| `.claude/skills/expert-rebuttal-claude` | Claude Reviewer | Bản Claude Code của vai tấn công: sinh finding mới trên plan đã qua review bằng subagent context sạch, để `expert-rebuttal` phản biện |
| `expert-rebuttal` | Rebuttal Agent | Phản biện có bằng chứng các findings từ expert review bên ngoài, tối ưu cho Antigravity/IDE-indexed workflow, chạy hotspot scan bổ sung có giới hạn |
| `expert-rebuttal-codex` | Codex Reviewer | Codex Desktop review pass tiết kiệm context để sinh finding có evidence cho Antigravity phản biện, kể cả khi vòng trước đã hội tụ |
| `feature-coordinator` | Coordinator | Thực thi theo phase, bám checklist và test |
| `check-issue` | Detective | Truy nguyên root cause của bug hoặc sự cố, không tự sửa code |
| `.claude/skills/check-issue-claude` | Claude Detective | Bản Claude Code của cùng vai: read-only nhờ bỏ `Edit` khỏi `allowed-tools`, có mode hunt soi song song nhiều giả thuyết bằng subagent `Explore` |
| `docs-hygiene` | Curator | Rà soát docs stale/dead/orphan, sửa broken paths, và đưa tài liệu giá trị vào read-path của hệ thống |
| `update-docs` | Librarian | Cập nhật docs, KB, test cases sau thay đổi |
| `git-sync` | Syncer | Đồng bộ Git sau khi đã chốt docs và commit message |
| `codebase-audit` | Auditor | Audit codebase có định hướng (security, logic, contract, hiệu năng, khoảng trống test, file rác), tự sinh/chạy test để chứng minh hành vi, xuất báo cáo có bằng chứng — không tự sửa application code |

## Cách gọi

Gọi trực tiếp theo tên skill hoặc đưa đường dẫn đầy đủ tới file `SKILL.md`.

Riêng Claude Code: chỉ skill trong `.claude/skills/` mới được auto-discover và gọi bằng `/tên-skill`. Các skill trong `.agents/skills/` vẫn dùng được trên Claude Code nhưng phải đưa path để agent đọc như tài liệu — không có slash command, không có `allowed-tools` enforcement.

Ví dụ:

```text
Doc `.agents/skills/project-init/SKILL.md` và thực hiện
```

Hoặc:

```text
project-init
feature-plan
feature-review
spawn-agent-review
expert-rebuttal
expert-rebuttal-codex
feature-coordinator
check-issue
docs-hygiene
update-docs
git-sync
codebase-audit
```

## Flow tham khảo

### Chuẩn hóa hoặc onboard repo

```text
project-init
```

`project-init` có thể chạy ở ba mode:
- `bootstrap`: chưa có hoặc thiếu gần hết file core
- `reconcile`: đã có `.agents/` nhưng cần bổ sung hoặc chuẩn hóa
- `audit`: chỉ review và nêu đề xuất

Ngoài bộ core docs, `project-init` cũng là điểm vào đúng khi repo chưa có hoặc đang thiếu `.agents/skills/` và cần đưa skill pack hiện tại vào áp dụng.

### Phát triển feature

```text
feature-plan
-> chọn đúng skill review theo runtime (bảng bên dưới)
-> vòng lặp rebuttal: tấn công -> phản biện -> sửa plan -> tấn công tiếp (bảng vai bên dưới)
-> feature-coordinator
-> archive feature vào `.agents/history/features/`
-> update-docs
-> git-sync
```

#### Chọn skill review theo runtime

| Runtime | Skill | Cách gọi | Execution strategy |
|---|---|---|---|
| Claude Code | `.claude/skills/feature-review-claude/SKILL.md` | `/feature-review-claude [slug]` | Reviewer subagent qua `Agent`/`SendMessage`; degrade về single-agent khi user không cho spawn |
| Codex có `spawn_agent` | `.agents/skills/spawn-agent-review/SKILL.md` | theo tên hoặc path | Reviewer tách biệt qua `spawn_agent` |
| Runtime không delegate được | `.agents/skills/feature-review/SKILL.md` | theo tên hoặc path | Một agent, các lượt rà soát tách biệt |

Cả ba dùng **cùng một core** tại `.agents/skills/templates/REVIEW_CORE.md`: gate, quyền đọc/ghi, roster reviewer, DB Harness non-negotiable, luật findings, severity/confidence/verdict, output contract và `EXPERT_REVIEW.md` contract. Mỗi SKILL.md chỉ định nghĩa execution strategy và gate riêng của runtime.

Sửa luật review thì sửa `REVIEW_CORE.md`, **không** sửa trong từng SKILL.md — nếu không ba bản sẽ drift, và thứ drift trước tiên là DB Harness non-negotiable.

Transcript examples dùng chung tại `.agents/skills/templates/COUNCIL_REVIEW_EXAMPLES.md`, chỉ đọc khi conflict/rebuttal phức tạp.

Cả ba skill review sau khi chốt verdict sẽ tạo `EXPERT_REVIEW.md` trong `.agents/active/[feature-slug]/`. File đó là đầu vào của vòng lặp rebuttal.

#### Vòng lặp rebuttal

Hai vai, phải nằm trên hai context khác nhau để bên tìm lỗi không phải là bên vừa sửa plan:

| Vai | Skill | Chạy ở đâu | Ghi file nào |
|---|---|---|---|
| Tấn công: sinh finding mới | `expert-rebuttal-codex` | Codex Desktop | `EXPERT_REVIEW.md` |
| Tấn công: sinh finding mới | `.claude/skills/expert-rebuttal-claude` | Claude Code, dùng subagent context sạch | `EXPERT_REVIEW.md` |
| Phòng thủ: phản biện và sửa plan | `expert-rebuttal` | Antigravity | `REBUTTAL_LOG.md`, `EXPERT_REVIEW.md`, `FEATURE_PLAN.md`/`FEATURE_TASKS.md` khi finding accepted |

Hai skill tấn công **không** thay thế nhau: khác model thì tìm ra lỗi khác, nên xen kẽ vẫn có giá trị. Bản Claude Code có mặt để đánh thêm một vòng mà không phải mở app khác.

Vai tấn công không dừng chỉ vì `EXPERT_REVIEW.md` đang hội tụ — hội tụ nghĩa là vòng phản biện trước đã đóng, không phải plan hết vấn đề.

Từ vựng dùng chung của `EXPERT_REVIEW.md` (thang severity, prefix `FR`/`EFR`/`SFR`, giá trị `verdict`) chốt tại `REVIEW_CORE.md` mục 10. Mọi skill đọc/ghi file đó phải theo, kể cả skill Codex và Antigravity.

### Sửa lỗi hoặc maintain

```text
check-issue
-> feature-plan (nếu là bug lớn hoặc cần task breakdown)
-> triển khai fix theo workflow phù hợp
-> archive feature vào `.agents/history/features/` (nếu fix đó đi qua `feature-coordinator` và có working state riêng)
-> update-docs
-> git-sync
```

Trên Claude Code, bước RCA gọi `.claude/skills/check-issue-claude/SKILL.md` bằng `/check-issue-claude` — nó đọc `check-issue` làm core rồi thêm phần execution riêng: read-only được `allowed-tools` bảo đảm, mode hunt bằng subagent `Explore`, và danh sách lệnh test bị cấm chạy trong lúc RCA vì chúng reset DB local. Sửa luật RCA thì sửa `check-issue/SKILL.md`, **không** sửa trong bản `-claude`.

### Bảo trì tài liệu hệ thống

```text
docs-hygiene
-> git-sync
```

## Bộ tài liệu trong `.agents/`

### Core maps
- `.agents/CONTEXT.md` - Bản đồ nhanh để onboard và resume
- `.agents/KNOWLEDGE_BASE.md` - Quyết định kiến trúc và lý do chiến lược
- `.agents/PROJECT_STRUCTURE.md` - Snapshot cây thư mục, entry points, modules, config, commands

### Working state
- `.agents/active/[tên-feature]/FEATURE_PLAN.md` - Kế hoạch thực thi của feature
- `.agents/active/[tên-feature]/FEATURE_TASKS.md` - Checklist và execution log, là source of truth khi triển khai
- `.agents/active/[tên-feature]/EXPERT_REVIEW.md` - Findings từ review, phục vụ handoff sang `expert-rebuttal`, `expert-rebuttal-codex`, hoặc expert bên ngoài
- `.agents/active/[tên-feature]/REBUTTAL_LOG.md` - Lịch sử phản biện tích lũy qua các vòng `expert-rebuttal`
- `.agents/history/features/[YYYY-MM-DD]-[tên-feature]/` - Lưu trữ feature đã hoàn thành; `update-docs` có thể đọc lại plan/tasks ở đây khi feature đã được archive trước bước chốt docs

### Optional docs
- `.agents/architecture/` - Tài liệu kiến trúc chi tiết
- `.agents/changelog/` - Changelog theo 3 layer chuẩn: `CHANGELOG-FE.md`, `CHANGELOG-BE.md`, `CHANGELOG-DB.md`
- `.agents/testing/` - Test cases hoặc use cases cho tester
- `.agents/planning/` - Roadmap hoặc kế hoạch dài hạn
- `.agents/workflows/` - Workflow phụ trợ nếu dự án có dùng
- `.agents/history/docs/[YYYY-MM-DD]-[slug]/` - Lưu trữ tài liệu đã merge, deprecate, hoặc không còn nằm trên đường đọc chính

## Nguyên tắc nạp ngữ cảnh

1. Không sweep toàn bộ `.agents/` chỉ để "cho chắc".
2. Mỗi skill phải có entry files rõ ràng và chỉ mở rộng khi có lý do kỹ thuật.
3. `feature-plan` ưu tiên đọc `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md`, `.agents/PROJECT_STRUCTURE.md`.
4. `feature-coordinator` ưu tiên đọc `.agents/active/[tên-feature]/FEATURE_TASKS.md`, sau đó mới đọc `FEATURE_PLAN.md` ở mức đủ dùng.
5. `update-docs` ưu tiên đọc `git diff`; nếu feature vừa được archive, được phép đọc `FEATURE_PLAN.md` và `FEATURE_TASKS.md` từ `.agents/history/features/...` ở mức đủ dùng.
6. `project-init` ưu tiên quét codebase, Git/GitHub status, rồi mới reconcile tài liệu hiện có.
7. `docs-hygiene` ưu tiên lập doc graph từ `README.md`, các `SKILL.md`, và core docs trước khi sửa nội dung.
8. `expert-rebuttal` ưu tiên Quick Status Gate từ `EXPERT_REVIEW.md`; nếu đã hội tụ và user chỉ hỏi status thì dừng, nếu còn finding thì đọc snippet liên quan từ `REBUTTAL_LOG.md`, `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, rồi chỉ mở rộng khi cần evidence.
9. `expert-rebuttal-codex` luôn chạy một review pass mới khi user gọi, kể cả vòng trước đã hội tụ; đọc snippet/line range theo vùng plan chạm vào, dedupe finding cũ, và ghi finding mới vào `EXPERT_REVIEW.md` cho Antigravity phản biện.
10. `.claude/skills/check-issue-claude` PHẢI đọc `.agents/skills/check-issue/SKILL.md` ngay bước đầu: bản `-claude` chỉ chứa execution strategy nên đọc thiếu core là mất 6 câu hỏi cốt lõi và luật bằng chứng.
11. Mọi skill review và skill vai tấn công (`feature-review`, `spawn-agent-review`, `.claude/skills/feature-review-claude`, `.claude/skills/expert-rebuttal-claude`) PHẢI đọc `.agents/skills/templates/REVIEW_CORE.md` ngay bước đầu, trước cả plan/tasks. SKILL.md của các skill này chỉ chứa execution strategy nên đọc thiếu core là mất toàn bộ luật findings và DB Harness gate. Riêng skill vai tấn công chỉ áp dụng một phần core — bảng đối chiếu nằm trong SKILL.md của nó.

## Nguyên tắc vận hành

1. `FEATURE_TASKS.md` là source of truth khi triển khai.
2. Không tự động sang phase tiếp theo khi chưa có user confirm.
3. Mỗi phase phải có bước AI test, user test, rồi mới confirm.
4. Mỗi feature có folder riêng để tránh trộn ngữ cảnh.
5. Tài liệu và trạng thái do agent tạo phải nằm dưới `.agents/`.
6. Với lệnh terminal rủi ro, phải giải thích mục đích và tác động trước khi chạy.
7. Khi feature đã hoàn thành và user muốn đi hết vòng đời, thứ tự mặc định là `archive -> update-docs -> git-sync`; không nên để feature đã xong nằm lại trong `.agents/active/` chỉ vì đang chờ bước docs/Git.
8. Mọi tài liệu sống và quan trọng phải có đường đọc rõ ràng từ ít nhất một skill, core doc, hoặc workflow; nếu không thì phải được merge vào tài liệu đã có đường đọc hoặc đưa vào archive có chủ đích.
