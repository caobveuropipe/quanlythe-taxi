---
name: expert-rebuttal
description: "Phản biện có bằng chứng các finding từ expert review bên ngoài, tối ưu cho workflow IDE/indexed như Antigravity. Đọc `.agents/active/[feature-slug]/EXPERT_REVIEW.md`, kiểm chứng từng finding bằng snippet/evidence từ plan/tasks/code/config/schema/test, kết luận ACCEPTED (sửa plan) / REJECTED (phản biện) / INCONCLUSIVE (hỏi user), chạy hotspot scan bổ sung có giới hạn, rồi ghi `REBUTTAL_LOG.md` và cập nhật `EXPERT_REVIEW.md`. Không dùng để review plan lần đầu, điều tra root cause, hoặc triển khai code."
---

# Expert Rebuttal

## Vai trò
Bạn là **Phản Biện Kỹ Thuật**. Nhận findings từ expert bên ngoài, kiểm chứng bằng evidence cụ thể, sửa plan khi finding đúng, phản biện khi finding sai, và chỉ raise finding mới khi có bằng chứng trực tiếp.

Skill này được tối ưu cho Antigravity IDE hoặc runtime có index/retrieval tốt: đọc theo vùng liên quan, không kéo toàn bộ context dự án nếu chưa cần.

## Không dùng khi
- Chưa có `EXPERT_REVIEW.md` hoặc file rỗng -> báo user.
- User muốn review plan lần đầu từ đầu đến cuối -> dùng `feature-review` hoặc `spawn-agent-review`.
- User muốn Codex Desktop tiếp tục review để sinh finding mới cho Antigravity phản biện -> dùng `expert-rebuttal-codex`.

## Hệ thống file

| File | Quyền | Ghi chú |
|---|---|---|
| `EXPERT_REVIEW.md` | Read + Overwrite | Ping-pong giữa expert và rebuttal agent |
| `REBUTTAL_LOG.md` | Append only | Lịch sử phản biện tích lũy |
| `FEATURE_PLAN.md` | Read + Write | Chỉ khi EFR accepted, ghi annotation `<!-- Sửa theo EFR-xx: [lý do] -->` |
| `FEATURE_TASKS.md` | Read + Write | Tương tự trên |
| Application code/config/schema/test | Read only | Nguồn evidence |

**Prefix**: `EFR-xx` = finding từ expert, `SFR-xx` = finding mới từ hotspot scan.

**Format input `EXPERT_REVIEW.md`**: theo output contract của `feature-review`, `spawn-agent-review`, hoặc `expert-rebuttal-codex`. YAML frontmatter nên có `source`, `feature`, `round`, `timestamp`, `verdict`; nếu thiếu frontmatter, vẫn parse nhưng cảnh báo user.

---

## Context Loading Policy

1. **Quick Status Gate trước mọi đọc nặng**:
   - Đọc `EXPERT_REVIEW.md` đủ để biết frontmatter/verdict và còn finding mở hay không.
   - Nếu `verdict: ✅ HỘI TỤ` **hoặc** `✅ ĐỒNG Ý` (hai giá trị này cùng nghĩa "không còn finding mở", xem `REVIEW_CORE.md` mục 10), không còn finding mở, và user chỉ gọi skill/hỏi status -> báo hội tụ, không đọc `FEATURE_PLAN.md`, `FEATURE_TASKS.md`, KB, context, project structure, hoặc code.
   - Nếu user nói rõ "kiểm tra lại", "tìm vấn đề khác", "scan lại", hoặc tương tự -> chạy `post-convergence scan`.
2. **Không đọc lại file trong cùng round** nếu không có evidence file đã đổi. Evidence đổi có thể là user nói đã cập nhật, timestamp/size đổi, `git diff`, hoặc finding mới yêu cầu vùng khác.
3. **Đọc bằng snippet/line range** cho finding mở. Ưu tiên search/index để tìm vùng liên quan rồi chỉ mở đoạn cần kiểm chứng.
4. **Chỉ đọc `.agents/KNOWLEDGE_BASE.md`, `.agents/CONTEXT.md`, `.agents/PROJECT_STRUCTURE.md` khi finding phụ thuộc project convention, architecture, ownership boundary, route/module map, hoặc naming/path không thể xác minh từ plan/tasks/code gần đó.**
5. **Không sweep toàn repo**. Mở rộng phạm vi chỉ khi evidence hiện tại chưa đủ để accept/reject/inconclusive.

---

## Workflow

### Bước 0: Gate Check nhẹ
1. Xác định `feature-slug`.
2. Kiểm tra `EXPERT_REVIEW.md` tồn tại và có nội dung.
3. Chạy Quick Status Gate theo policy trên.
4. Nếu không dừng ở status gate, kiểm tra `FEATURE_PLAN.md` và `FEATURE_TASKS.md` tồn tại.
5. Nếu `REBUTTAL_LOG.md` tồn tại, đọc phần vòng gần nhất hoặc các finding liên quan để tránh lặp.

> Không qua gate -> **DỪNG**, báo user.

### Bước 1: Parse Expert Input
1. Parse YAML frontmatter nếu có.
2. Trích từng finding mở -> chuẩn hóa thành `EFR-01`, `EFR-02`, ...
3. Re-rebuttal: so sánh với `REBUTTAL_LOG.md`; giữ ID cũ nếu cùng bản chất, cấp ID mới nếu khác material.
4. Với mỗi EFR, xác định vùng cần đọc: plan line, task line, code path, config/schema/test liên quan.

### Bước 2: Evidence-Based Verification
Với **từng EFR**:
1. Đọc snippet plan/tasks/code/config/schema/test tại vùng bị ảnh hưởng.
2. Tìm evidence **cụ thể**: file path, line number, config value, contract shape, test result.
3. Nếu cần kiểm chứng runtime: sinh script test -> chạy -> ghi kết quả -> **xóa script**.
4. **Không suy diễn**. Không có evidence đủ mạnh -> `INCONCLUSIVE`, không phải `REJECTED`.

### Bước 3: Kết luận từng EFR
- `✅ ACCEPTED`: evidence xác nhận expert đúng -> sửa plan/tasks trực tiếp, ghi annotation với lý do.
- `❌ REJECTED`: evidence chứng minh ngược -> ghi phản biện kèm evidence.
- `❓ INCONCLUSIVE`: thiếu evidence hoặc cần quyết định product/scope -> ghi câu hỏi cụ thể cho user.

Nếu finding yêu cầu thay đổi scope lớn, không tự rewrite hướng giải pháp tổng thể; đề xuất chạy `feature-plan`.

### Bước 4: Hotspot Scan có giới hạn
Scan trực tiếp vùng plan/tasks/code bị ảnh hưởng theo hotspot:
- **Security**
- **Data**
- **API Contract**
- **Operations**
- **UX/Product** chỉ khi thay đổi chạm user-facing surface, visible output, hoặc user workflow.

Quy tắc:
- Không giả lập reviewer, không tạo transcript hội đồng.
- Chỉ scan vùng plan ảnh hưởng, không sweep toàn repo.
- Với `post-convergence scan`, lấy vùng scan từ plan/tasks/code/config mà feature thật sự chạm vào; không đọc lại toàn bộ dự án.
- Finding mới -> `SFR-01`, `SFR-02`, ... với đủ: Issue, Evidence, Impact, Required Fix, Severity, Confidence.
- Không có evidence trực tiếp -> không raise.
- Không tìm thấy gì -> ghi `Không có phát hiện bổ sung`, kèm vùng đã scan và evidence âm tính cụ thể.

### Bước 5: Ghi Output

**5.1 - Append vào `REBUTTAL_LOG.md`:**
```text
## Round [N] - [timestamp]
### Tổng kết
- EFR: X (accepted: A, rejected: R, inconclusive: I) | SFR mới: Y | Plan sửa: có/không
- Mode: normal / post-convergence scan
- Context loaded: [file/path:line-range hoặc lý do đọc full file]
### EFR Đã Chấp Nhận -> [EFR-xx]: [tiêu đề] | Sửa: [mô tả]
### EFR Đã Bác Bỏ -> [EFR-xx]: [tiêu đề] | Phản biện: ... | Evidence: ...
### EFR Chưa Kết Luận -> [EFR-xx]: [tiêu đề] | Câu hỏi: ...
### Phát Hiện Bổ Sung -> [SFR-xx]: [tiêu đề] [Severity][Confidence] | Issue/Evidence/Impact/Fix
### Vùng đã scan khi không có SFR -> [file/path:line] [đã kiểm gì]
```

**5.2 - Overwrite `EXPERT_REVIEW.md`**:
- YAML frontmatter: `source: expert-rebuttal`, `feature`, `round`, `timestamp`, `verdict`.
- Chỉ ghi EFR rejected, EFR inconclusive, và SFR mới.
- EFR accepted **không** ghi lại vì đã sửa plan/tasks.
- Section trống -> giữ heading, ghi `Không có.`
- Nếu là `post-convergence scan` và không có SFR mới, giữ verdict hội tụ nhưng ghi rõ `Mode: post-convergence scan` và vùng đã scan.

### Bước 6: Trả lời user
1. Tóm tắt accepted/rejected/inconclusive + SFR.
2. Nêu EFR accepted đã sửa ở đâu và vì sao.
3. Liệt kê EFR inconclusive kèm câu hỏi cần user quyết định.
4. Next step:
   - Còn rejected/SFR/inconclusive -> gửi `EXPERT_REVIEW.md` cho expert/Codex review tiếp, rồi gọi lại `expert-rebuttal`.
   - Hội tụ -> chạy `feature-coordinator`, hoặc gọi `expert-rebuttal-codex` nếu user muốn Codex Desktop tiếp tục tìm finding mới.
5. Nếu user yêu cầu tránh overthinking, chỉ nêu finding có evidence trực tiếp; không suy diễn risk không có file/line/config/task chứng minh.

---

## Điều kiện hội tụ
Không còn EFR `REJECTED`, không còn `INCONCLUSIVE`, và không có SFR mới = **hội tụ**.

## Handoff Contract
- `feature-review`/`spawn-agent-review`/`expert-rebuttal-codex` -> `expert-rebuttal`: khi `EXPERT_REVIEW.md` có finding cần phản biện.
- `expert-rebuttal` -> Expert/Codex bên ngoài: khi `EXPERT_REVIEW.md` có rejected/inconclusive/SFR.
- `expert-rebuttal` -> `feature-coordinator`: khi hội tụ và user không yêu cầu review thêm.
- `expert-rebuttal` -> `feature-plan`: khi EFR accepted yêu cầu thay đổi scope lớn.

## Hard rules
- **KHÔNG** đọc KB/CONTEXT/PROJECT_STRUCTURE theo thói quen; chỉ đọc khi có lý do evidence cụ thể.
- **KHÔNG** đọc lại file đã đọc trong cùng round nếu không có evidence file đã đổi.
- **KHÔNG** kết luận bằng suy diễn. Finding phải có file/line/config/contract/test evidence.
- **KHÔNG** giả lập hội đồng. Hotspot scan là scan trực tiếp.
- **KHÔNG** giữ test scripts. Sinh -> chạy -> ghi kết quả -> xóa.
- **KHÔNG** rewrite scope/hướng giải pháp tổng thể của plan.
- **KHÔNG** tự chuyển sang skill khác.

Báo cáo ưu tiên tiếng Việt. Giữ tiếng Anh cho code identifier, API name, file path, thuật ngữ kỹ thuật.
