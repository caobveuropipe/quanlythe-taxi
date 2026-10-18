---
source: expert-rebuttal-codex
feature: fix-doc-deletion-sync-resilience
round: 13
timestamp: 2026-10-07T16:47:40+07:00
verdict: ✅ HỘI TỤ
---

# Expert Review - Codex Desktop

## Tóm tắt
- Findings mới: 0.
- Findings đã dedupe/không lặp: EFR-20, EFR-21, EFR-22 đã được đưa vào plan/tasks; không lặp lại các vấn đề đã đóng.
- Vùng đã scan: `FEATURE_PLAN.md:13-24,38-96`; `FEATURE_TASKS.md:46-122`; `REBUTTAL_LOG.md` Round 12; `src/services/googleDriveService.ts:555-594,661-727`; `src/App.tsx:100-127,175-187,235-258,412-454`; `src/components/DocumentDetailModal.tsx:730-741`.

## Findings Cần Antigravity Phản Biện

Không có finding mới đủ ngưỡng evidence trong phạm vi đã scan.

## Không Raise Vì Thiếu Evidence / Đã Được Cover
- EFR-22: `resolveCanonicalDriveDatabase` chỉ trả `null` sau khi list thành công và rỗng; lỗi HTTP, mạng, parse hoặc phân trang chưa xong phải throw (`FEATURE_TASKS.md:74-80`). Pull/Push dừng, không POST tạo registry (`FEATURE_TASKS.md:95-101`); Task 4.5 Ca B kiểm tra 401/500/fetch reject và không POST (`FEATURE_TASKS.md:118-120`).
- EFR-21: resolver chung được gọi từ cả Pull và Push (`FEATURE_TASKS.md:81-82,95-98`); Task 4.5 Ca A đi qua entry point thật với hai registry trùng (`FEATURE_TASKS.md:118-119`).
- EFR-20: Tombstone-Wins áp dụng trong merge, push và pull, có test X không hồi sinh trên thiết bị B (`FEATURE_TASKS.md:62-66,71,84-85,99-101,119`).
- `contentRestrictions.readOnly` và Drive upload `If-Match` vẫn cần được xác minh khi triển khai; Task 3.0 là hard gate cho CAS (`FEATURE_TASKS.md:50-56`), Task 4.4 kiểm tra write fence (`FEATURE_TASKS.md:114-117`). Chưa có kết quả provider thực tế, nên không suy diễn rằng các phép thử đã pass.

## Kết Luận
- `✅ HỘI TỤ` trong phạm vi review plan/tasks và code hiện hữu liên quan. Có thể chuyển sang triển khai theo phase. Phase 1 xử lý lỗi `confirm()` độc lập; Phase 3 phải thực hiện Task 3.0 và dừng tại hard gate nếu provider không xác nhận CAS. Verdict này không thay cho kết quả test hoặc xác minh Google Drive thực tế.
