---
name: feature-review
description: Review hội đồng cho `FEATURE_PLAN.md` và `FEATURE_TASKS.md` trên runtime không delegate được (không có `spawn_agent`, không có subagent). Kiểm tra kiến trúc, bảo mật, data flow, sequencing, test và rollout trước triển khai; xuất transcript và verdict. Không dùng để viết plan, điều tra root cause chưa rõ hoặc triển khai code.
---

# Feature Review

## Mục tiêu

- Review plan và task breakdown trước khi viết code.
- Tìm blocker về kiến trúc, bảo mật, logic, data flow, sequencing, test và rollout.
- Xuất transcript audit được, không chỉ một câu kết luận.

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

Chỉ dùng skill này khi runtime **không** delegate được reviewer:

- Có `spawn_agent` (Codex) → dùng `spawn-agent-review`.
- Đang chạy Claude Code → dùng `.claude/skills/feature-review-claude/SKILL.md`.

Đây là bản degrade có chủ đích. Chọn nó khi không còn cách nào tách reviewer, không phải vì tiện.

## Execution strategy

- Chiến lược cố định: `một agent, các lượt rà soát tách biệt`.
- Mỗi reviewer là một lượt rà soát riêng, viết ra section riêng, đọc lại raw artifact cho vai trò của mình trước khi kết luận.
- **Không** gọi các reviewer là độc lập và **không** tuyên bố đồng thuận: cùng một context vừa raise vừa phản biện, transcript không chứng minh được tính độc lập. Đây là giới hạn phải ghi rõ trong báo cáo, không phải chi tiết bỏ qua được.
- Rủi ro chính của mode này là tự hợp lý hoá. Khi chạy pass reviewer thứ N, ưu tiên tìm lý do finding của pass trước **sai**, không tìm lý do nó đúng.

## Bước 4.2 — Nhận Định Riêng

Với mỗi reviewer đã triệu tập, theo đúng thứ tự:

1. Tuyên bố vai trò và hotspot được phân công.
2. Đọc lại artifact/code thuộc hotspot đó, không tái sử dụng kết luận của pass trước.
3. Báo tối đa 5 finding (tối đa 7 khi thực sự khác biệt và material), đủ 6 trường theo core mục 5 luật 2.
4. Nếu không có gì mới, ghi `Không có phát hiện mới.`

## Giá trị cố định cho output

- `Chiến lược thực thi`: `một agent, các lượt rà soát tách biệt`
- `EXPERT_REVIEW.md` frontmatter `source`: `feature-review`
- Trong `## Thiết Lập Hội Đồng`, thêm một dòng cảnh báo giới hạn: reviewer không độc lập về context.
