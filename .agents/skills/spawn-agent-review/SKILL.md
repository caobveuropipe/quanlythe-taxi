---
name: spawn-agent-review
description: Review hội đồng cho `FEATURE_PLAN.md` và `FEATURE_TASKS.md` bằng delegated reviewers trên Codex runtime có `spawn_agent`. Kiểm tra kiến trúc, bảo mật, data flow, sequencing, test và rollout; xuất transcript và verdict. Không dùng để viết plan, điều tra root cause chưa rõ hoặc triển khai code.
---

# Spawn Agent Review

## Mục tiêu

- Review plan và task breakdown trước khi viết code bằng các reviewer subagent tách biệt.
- Tìm blocker về kiến trúc, bảo mật, logic, data flow, sequencing, test và rollout.
- Xuất transcript audit được với attribution của từng reviewer, không chỉ một câu kết luận.

## BẮT BUỘC: nạp core trước

Đọc `.agents/skills/templates/REVIEW_CORE.md` trước khi làm bất cứ việc gì khác. File đó là source of truth cho:

- gate sử dụng và quyền đọc/ghi (mục 1–2)
- roster reviewer (mục 3)
- DB Harness non-negotiable (mục 4)
- luật findings và phản biện (mục 5)
- thứ tự nạp ngữ cảnh (mục 6)
- workflow xương sống bước 0–6 (mục 7)
- severity/confidence/verdict (mục 8)
- output contract và `EXPERT_REVIEW.md` contract (mục 9–10)
- handoff (mục 11)

SKILL.md này chỉ định nghĩa phần execution riêng của runtime. Không lặp lại luật core ở đây; nếu thấy lệch, sửa core.

## Gate riêng của runtime

Chỉ dùng skill này khi runtime có `spawn_agent` và việc dùng subagents được phép:

- Không có `spawn_agent` → dùng `feature-review`.
- Đang chạy Claude Code → dùng `.claude/skills/feature-review-claude/SKILL.md` (tool là `Agent`/`SendMessage`, không phải `spawn_agent`).

## Execution strategy

- Chiến lược cố định: `reviewer tách biệt qua spawn_agent`.
- Chief Architect giữ pass kiến trúc riêng, cộng quyền điều phối, canonicalization, admissibility check, rebuttal routing và final advisory.
- Không nuốt transcript reviewer và không tuyên bố consensus nếu evidence chưa chứng minh.

### Brief bắt buộc cho mỗi reviewer

- feature slug, đường dẫn tuyệt đối của thư mục feature và vai trò reviewer;
- hotspots cần soi, artifacts tối thiểu phải đọc và vùng code được phép mở rộng;
- yêu cầu read-only và cấm spawn thêm agent;
- output gồm `Issue`, `Evidence`, `Impact`, `Required Fix`, `Severity`, `Confidence`;
- ngưỡng evidence, quy tắc blocker và giới hạn số finding;
- với reviewer chạm DB/migration/RPC: nhắc lại nguyên văn phần liên quan của core mục 4.

Trong Vòng 1, không đưa finding của reviewer khác vào brief. Reviewer phải tự đọc raw artifacts và đưa nhận định riêng.

### Concurrency và vòng đời agent

- Kiểm tra số slot còn trống; Chief Architect/root cũng chiếm một slot.
- Spawn song song tối đa theo capacity của runtime. Nếu reviewer nhiều hơn slot trống, chia thành các wave và chờ wave trước hoàn tất.
- Không bỏ reviewer material chỉ vì hết slot. Không spawn reviewer không có hotspot.
- Chờ kết quả của mọi reviewer đã triệu tập trước khi canonicalize findings.
- Khi rebuttal, reuse đúng reviewer đã raise/disagree bằng `followup_task`; chỉ spawn lại nếu agent cũ không còn khả dụng. Chỉ gửi `FR-xx`, conflict và evidence đối lập cần phản hồi.
- Kết thúc hoặc để reviewer hoàn tất sau khi không còn rebuttal liên quan; không để subagent tiếp tục công việc ngoài review.

## Giá trị cố định cho output

- `Chiến lược thực thi`: `reviewer tách biệt qua spawn_agent`
- `EXPERT_REVIEW.md` frontmatter `source`: `spawn-agent-review`
- Trong `## Thiết Lập Hội Đồng`, ghi thêm wave thực thi thực tế.
