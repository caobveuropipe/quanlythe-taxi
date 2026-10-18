# Rebuttal Log: fix-doc-deletion-sync-resilience

## Round 2 - 2026-10-07T15:15:30+07:00

### Tổng kết
- EFR: 5 (accepted: 5, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `DocumentDetailModal.tsx:730-745`, `App.tsx:150-165,235-258,410-455`, `realtimeService.ts:70-145`, `storage.ts:345-356`

### EFR Đã Chấp Nhận
- **EFR-01: Plan bỏ sót nguyên nhân trực tiếp (Iframe sandbox chặn window.confirm())**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Đưa việc thay thế `confirm()` bằng In-App Confirmation Modal vào Phase 1 trong `FEATURE_PLAN.md` và Task 1.1 trong `FEATURE_TASKS.md`.
- **EFR-02: Tombstone bị prune hoặc xóa trước khi registry xác nhận xóa**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thêm cờ `driveSynced: boolean` vào `TombstoneRecord`, chỉ prune các mục đã được xác nhận sync trên registry đám mây.
- **EFR-03: Đẩy snapshot local khi sync có thể ghi đè tài liệu mới**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Khi sync phát hiện tombstone còn trên remote, hợp nhất bằng cách lọc trực tiếp trên `remoteData.documents` thay vì ghi đè bằng snapshot cục bộ cũ.
- **EFR-04: Xóa tệp trước commit sổ tạo bản ghi trỏ tới tệp mất**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Đảo thứ tự: Commit xóa bản ghi trên Local DB và Drive Registry trước, sau đó mới dọn dẹp file asset trên Drive; kiểm tra kết quả trả về của hàm push.
- **EFR-05: Tiêu chí WebSocket 520 và test chưa khả thi**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Chặn `if (isCircuitBroken) return;` tại đầu hàm `connectWebSocket()` cho mọi đường gọi; dựa trên số lần đóng bất thường thay vì cố đọc mã HTTP 520.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `DocumentDetailModal.tsx:730-745` (xác nhận chỉ còn 1 chỗ gọi `confirm()`)
- `CategoryConfigModal.tsx:115-135` (kiểm tra các modal khác có dùng confirm không)


## Round 3 - 2026-10-07T15:23:55+07:00

### Tổng kết
- EFR: 4 (accepted: 4, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `DocumentDetailModal.tsx:36-55,730-745`, `App.tsx:235-258,380-408,412-454`, `googleDriveService.ts:523-538,661-693`, `storage.ts:345-356`

### EFR Đã Chấp Nhận
- **EFR-06: Merge từ remote vẫn không ngăn ghi đè đồng thời và hồi sinh**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thiết kế Shared Tombstone Protocol (`deletedRecords: { id, deletedAt }[]`) trên Google Drive JSON registry `vcc_documents_database.json`. Mọi đường push từ bất kỳ thiết bị nào đều phải đọc và merge shared tombstones trước khi ghi đè, chặn hoàn toàn việc Thiết bị B hồi sinh tài liệu Thiết bị A đã xóa.
- **EFR-07: Xóa asset thất bại sẽ mất thông tin dọn dẹp sau prune**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Tách trạng thái `registrySynced: boolean` và `assetCleaned: boolean` trong `TombstoneRecord`. Chỉ prune khi cả 2 trạng thái đều hoàn thành (hoặc sau 30 ngày). Tự động dọn dẹp bù các file có `assetCleaned === false` khi có kết nối Drive.
- **EFR-08: UI không có hợp đồng kết quả bất đồng bộ của thao tác xóa**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Chuẩn hóa hợp đồng `onDelete: (id: string) => Promise<boolean>`. Trong `DocumentDetailModal` và `DocumentArchiveView`, hiển thị spinner loading, vô hiệu hóa các nút chống double-click, và chỉ đóng dialog khi Promise trả về `true`.
- **EFR-09: Gate kiểm thử không có task cho các ca dữ liệu quyết định**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Bổ sung `Phase 4: Comprehensive Verification & Edge-Case Testing` vào `FEATURE_TASKS.md` với các task kiểm thử iframe sandbox, retry xóa asset lỗi, và mô phỏng 2 thiết bị thao tác xen kẽ.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `DocumentDetailModal.tsx:36-55,730-745`
- `DocumentArchiveView.tsx:36-50`
- `App.tsx:235-258,412-454`


## Round 4 - 2026-10-07T15:28:20+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `DocumentDetailModal.tsx:36-42,733-736`, `App.tsx:235-258,393-401,412-453`, `googleDriveService.ts:661-693`, `storage.ts:345-356`

### EFR Đã Chấp Nhận
- **EFR-10: Shared tombstones vẫn bị mất do read–modify–write không điều kiện**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Bổ sung `revision?: number` trong `DriveDatabasePayload` và xây dựng hàm `saveDatabaseWithConflictResolution` trong `googleDriveService.ts`. Mọi đường push đều đọc remote, union danh sách `deletedRecords` và documents, kiểm tra xung đột và retry tới 3 lần, đảm bảo tombstone không bao giờ bị ghi đè mất bởi client khác.
- **EFR-11: Promise<boolean> mâu thuẫn với việc đã xóa local trước khi Drive lỗi**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Lưu đầy đủ snapshot (`id`, `docNumber`, `driveFileId`, `deletedAt`) vào Tombstone ngay từ bước đầu. Chuẩn hóa hợp đồng `onDelete: (id: string) => Promise<{ success: boolean; driveSynced: boolean; message?: string }>`. Nếu local xóa thành công, modal đóng an toàn và toast báo rõ trạng thái Drive (đang chờ đồng bộ), tránh việc lỗi Drive làm kẹt modal mà không thể retry.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `DocumentDetailModal.tsx:36-42,733-736`
- `DocumentArchiveView.tsx:36-50`
- `App.tsx:235-258,412-453`

## Round 5 - 2026-10-07T15:37:30+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:15-80`, `FEATURE_TASKS.md:40-85`, `googleDriveService.ts:545-600,660-730`, `App.tsx:180-195,240-255`

### EFR Đã Chấp Nhận
- **EFR-12: Tăng revision trong JSON không tạo được ghi nguyên tử**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Đưa điều kiện HTTP cấp máy chủ `If-Match: etag` vào lệnh PATCH của Google Drive API. Khi server phát hiện ghi đè đồng thời sẽ trả về HTTP `412 Precondition Failed`; client bắt mã lỗi này để tự động lấy lại file và etag mới nhất, re-apply `updateFn` (union `deletedRecords` và documents) rồi retry với backoff tối đa 3 lần. Cập nhật AC-2, Task 3.2 và Task 4.3.
- **EFR-13: Hai thiết bị cùng khởi tạo registry có thể mất dữ liệu do xóa bản trùng**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Loại bỏ hoàn toàn việc gọi `deleteFileFromGoogleDrive` tự động trong nền tại `findDriveFileByName`. Xây dựng hàm `reconcileDuplicateDriveDatabases` để đọc nội dung tất cả các file trùng tên, hợp nhất an toàn (union `documents`, `categories`, và `deletedRecords`), cập nhật vào file chính với `If-Match`, và chỉ xóa các bản sao phụ sau khi file chính đã lưu thành công. Bổ sung Task 4.4 kiểm thử kịch bản hai registry tạo trùng.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `googleDriveService.ts:545-600,660-730`
- `App.tsx:180-195,240-255`

## Round 6 - 2026-10-07T15:58:45+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:13-89`, `FEATURE_TASKS.md:40-101`, `googleDriveService.ts:545-730`, `server.ts:1-60`

### EFR Đã Chấp Nhận
- **EFR-14: Plan giả định lấy được etag File v3 và PATCH If-Match sẽ trả 412**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Bổ sung Task 3.0 (Provider Verification Probe Gate) để kiểm chứng trực tiếp phản hồi của Google Drive API v3 (header `ETag` từ GET/HEAD và mã HTTP trả về khi gửi `If-Match: etag_cũ` trên PATCH). Thiết kế kiến trúc phòng thủ đa tầng (Defense-in-depth): Tầng 1 là CAS `If-Match` + 412 retry; Tầng 2 là Semantic 3-way Union Merge (luôn union `deletedRecords` và `documents`), bảo đảm an toàn dữ liệu không phụ thuộc độc nhất vào một tính năng của provider. Cập nhật AC-2, AC-5, Task 3.0 và Task 4.3.
- **EFR-15: Hợp nhất rồi xóa registry phụ vẫn có thể mất ghi mới**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thiết kế quy trình Safe Decommission & Re-check cho `reconcileDuplicateDriveDatabases`. Trước khi chuyển file phụ vào thùng rác, thực hiện Re-check metadata/etag của file phụ để phát hiện và merge bất kỳ thay đổi mới nào phát sinh trong quá trình merge; ghi marker `deprecated: true, canonicalFileId: ...` lên file phụ; các client khi phát hiện file deprecated hoặc 404 sẽ tự động chuyển hướng sang canonical file và retry. Bổ sung Task 4.4 kiểm thử writer đồng thời trên file phụ.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:13-89`
- `FEATURE_TASKS.md:40-101`
- `googleDriveService.ts:545-730`

## Round 7 - 2026-10-07T16:07:00+07:00

### Tổng kết
- EFR: 2 (accepted: 2, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:12-95`, `FEATURE_TASKS.md:43-111`, `googleDriveService.ts:556-585,661-729`, `server.ts:1-60`

### EFR Đã Chấp Nhận
- **EFR-16: Semantic union không thể làm fallback cho CAS chưa được xác minh**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Biến Task 3.0 thành **Hard Decision Gate**. Không tự xưng Semantic Union là phương án bảo đảm tính nguyên tử khi thiếu CAS của máy chủ. Nếu Probe Gate chứng minh Google Drive upload thực thi `If-Match: etag` và từ chối ghi cũ bằng HTTP 412, tiếp tục triển khai CAS-based Drive synchronization. Nếu Probe thất bại, DỪNG NGAY Phase 3 và báo User để chuyển sang backend coordinator (`server.ts` mutex) hoặc thu hẹp cam kết nhất quán đồng thời. Cập nhật AC-2, Task 3.0 và Task 4.3.
- **EFR-17: Re-check file phụ vẫn có khoảng đua trước khi trash**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thiết lập **Zero-Deletion Policy cho Duplicate Registries**. Loại bỏ hoàn toàn việc gọi `deleteFileFromGoogleDrive` hay đưa file phụ vào thùng rác (`trashed = true`). Thay vào đó, quy trình `reconcileDuplicateDriveDatabases` chỉ hợp nhất toàn bộ dữ liệu vào canonical file, đổi tên các file phụ thành `.bak`, gắn marker `deprecated: true`. Client ghi luôn query `findDriveFileByName` ngay trước khi chuẩn bị payload (không cache `fileId` cũ). Nhờ vậy, ngay cả khi client khác ghi vào file phụ, dữ liệu không bao giờ bị xóa mất khỏi Drive. Cập nhật AC-2, Task 3.2 và Task 4.4.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:12-95`
- `FEATURE_TASKS.md:43-111`
- `googleDriveService.ts:556-729`

## Round 8 - 2026-10-07T16:13:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:15-89`, `FEATURE_TASKS.md:46-105`, `googleDriveService.ts:556-594,661-729`

### EFR Đã Chấp Nhận
- **EFR-18: Writer cũ ghi vào file .bak sau rename, dữ liệu biến mất khỏi sổ chung**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thiết lập cơ chế bảo vệ 2 tầng cho file phụ sau khi rename:
    1. **Write Fence (Server-side)**: Gắn thuộc tính `contentRestrictions: [{ readOnly: true, reason: "Migrated to canonical" }]` khi đổi tên file phụ thành `.bak`. Nếu client cũ gửi PATCH vào file phụ, server Drive từ chối với HTTP 403; client bắt lỗi 403 để tự động query lại `findDriveFileByName` lấy canonical file và ghi lại.
    2. **Continuous Backup Scan**: Trong mỗi chu kỳ sync/reconcile, tự động quét các file `.bak` (`name contains '.merged.' and trashed = false`); nếu phát hiện `modifiedTime` mới hơn thời điểm merge (`mergedAt`), tự động trích xuất các văn bản mới và union tiếp vào canonical registry.
    3. Cập nhật AC-2, AC-5, Task 3.2 và Task 4.4.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:15-89`
- `FEATURE_TASKS.md:46-105`
- `googleDriveService.ts:556-729`

## Round 9 - 2026-10-07T16:24:30+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:15-85`, `FEATURE_TASKS.md:46-105`, `googleDriveService.ts:555-594,661-729`

### EFR Đã Chấp Nhận
- **EFR-19: Bản ghi đến giữa lần đọc file phụ và lúc khóa ghi chưa được bảo toàn**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Tái cấu trúc quy trình `reconcileDuplicateDriveDatabases` theo nguyên lý **Lock-First**:
    1. **Khóa ghi trước (Lock First)**: Cập nhật metadata các file phụ (`name = .bak`, `contentRestrictions: [{ readOnly: true }]`, `properties: { deprecated: "true", canonicalFileId }`) - tuyệt đối không gửi media PATCH ghi đè JSON body của file phụ.
    2. **Đọc snapshot đóng băng cuối cùng (Read Final Frozen Snapshot)**: Sau khi Drive xác nhận file phụ đã khóa, đọc nội dung cuối cùng. Mọi ghi chép của writer B trước lúc khóa đều nằm trong snapshot này; mọi ghi chép sau lúc khóa đều bị Drive từ chối (403) và tự động chuyển hướng sang canonical file.
    3. **Hợp nhất và lưu CAS vào Canonical Registry**: Union documents và tombstones từ snapshot cuối cùng và lưu vào canonical file với `If-Match`.
    4. Cập nhật AC-2, AC-5, Task 3.2 và Task 4.4 (bổ sung test barrier B PATCH sát thời điểm trước và trong lúc khóa).

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:15-85`
- `FEATURE_TASKS.md:46-105`
- `googleDriveService.ts:555-729`

## Round 10 - 2026-10-07T16:32:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:15-90`, `FEATURE_TASKS.md:50-105`, `src/App.tsx:145-175`, `src/services/googleDriveService.ts:555-729`

### EFR Đã Chấp Nhận
- **EFR-20: Dấu xóa chưa được áp dụng khi hợp nhất và tải dữ liệu xuống**
  - **Quyết định**: `✅ ACCEPTED`
  - **Sửa**: Thiết lập quy tắc **Tombstone-Wins** nhất quán trên cả 3 luồng: Reconcile, Push, và Pull:
    1. **Hàm dùng chung `mergeDocumentsAndTombstones`**: Luôn lấy `deletedIds = Set(tombstones.map(t => t.id))` và lọc sạch `documents.filter(d => !deletedIds.has(d.id))`.
    2. **Quy trình Reconcile Duplicate Registries**: Áp dụng `mergeDocumentsAndTombstones` khi gộp snapshot file phụ vào canonical file, ngăn chặn việc văn bản cũ trong file phụ đưa vào canonical registry khi đã có tombstone.
    3. **Đường Pull `syncWithGoogleDrive` trong `src/App.tsx`**: Đọc `remoteData.deletedRecords` kết hợp với local tombstones thành `effectiveDeletedIds`, lưu tombstone mới vào local DB, và lọc sạch `remoteData.documents` trước khi ghi vào IndexedDB.
    4. Cập nhật AC-2, AC-5, Task 3.2, Task 3.4 và Task 4.5 (kiểm thử A xóa X, file phụ còn X, reconcile và B pull -> X vắng mặt hoàn toàn ở canonical và trên B).

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:15-90`
- `FEATURE_TASKS.md:50-105`
- `src/App.tsx:145-175`
- `src/services/googleDriveService.ts:555-729`

## Round 11 - 2026-10-07T16:38:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:13-90`, `FEATURE_TASKS.md:46-120`, `src/App.tsx:100-127,175-187`, `src/services/googleDriveService.ts:555-729`

### EFR Đã Chấp Nhận
- **EFR-21: Hàm hợp nhất file Drive trùng chưa có đường gọi trong luồng đồng bộ thật**
  - **Quyết định**: `✅ ACCEPTED`
  - **Lý do**: Codex chỉ ra chính xác rằng `findDriveFileByName` chỉ trả về single file và `reconcileDuplicateDriveDatabases` mới chỉ được định nghĩa trong hàm riêng, chưa có đường gọi tự động từ luồng thật (`syncWithGoogleDrive` và `saveDatabaseWithConflictResolution`). Nếu hai máy tạo duplicate registries, người dùng không thể tự hợp nhất vì app thật không kích hoạt quy trình này.
  - **Sửa**:
    1. **Điểm nhập chung `resolveCanonicalDriveDatabase(accessToken, folderId)`**: Liệt kê đầy đủ file có tên trùng khớp (loại bỏ `.bak`, trashed); nếu có > 1 file trùng, tự động gọi và await `reconcileDuplicateDriveDatabases`. Nếu reconcile thất bại, ném ngoại lệ dừng luồng; nếu thành công, trả về canonical file.
    2. **Đường Pull (`syncWithGoogleDrive`)**: Gọi `resolveCanonicalDriveDatabase` trước khi tải dữ liệu để đảm bảo các bản ghi trùng trên remote đã được khóa và hợp nhất vào canonical file.
    3. **Đường Push (`saveDatabaseWithConflictResolution`)**: Thay thế lệnh gọi tìm file đơn lẻ bằng `resolveCanonicalDriveDatabase` trước khi chuẩn bị payload và PATCH CAS.
    4. **Dọn dẹp bản plan**: Xóa dòng `AC-6` trùng lặp và cập nhật trạng thái `Round 11`.
    5. **Cập nhật Task 4.5**: Bổ sung kịch bản kiểm thử entry point thật (`syncWithGoogleDrive` / `saveDatabaseWithConflictResolution`) khi tồn tại 2 registry trùng, xác nhận hệ thống tự động phát hiện, kích hoạt reconciliation và áp dụng Tombstone-Wins.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:13-90`
- `FEATURE_TASKS.md:46-120`
- `src/App.tsx:100-187`
- `src/services/googleDriveService.ts:555-729`

## Round 12 - 2026-10-07T16:44:00+07:00

### Tổng kết
- EFR: 1 (accepted: 1, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: có
- Mode: normal
- Context loaded: `FEATURE_PLAN.md:15-95`, `FEATURE_TASKS.md:46-130`, `src/App.tsx:100-127,175-187`, `src/services/googleDriveService.ts:555-729`

### EFR Đã Chấp Nhận
- **EFR-22: Lỗi liệt kê Drive có thể bị hiểu nhầm là không có registry và tạo thêm bản trùng**
  - **Quyết định**: `✅ ACCEPTED`
  - **Lý do**: Codex chỉ ra chính xác lỗ hổng hợp đồng: nếu `resolveCanonicalDriveDatabase` trả về `null` khi gặp lỗi HTTP (!res.ok) hoặc lỗi mạng (như `findDriveFileByName` cũ đang làm), caller trong luồng Push/Pull sẽ hiểu nhầm rằng Drive chưa có registry và gọi POST tạo file mới. Điều này vô tình sinh ra thêm file trùng do lỗi mạng tạm thời hoặc token hết hạn.
  - **Sửa**:
    1. **Quy định rạch ròi trong `resolveCanonicalDriveDatabase`**: CHỈ trả về `null` khi yêu cầu liệt kê thành công hoàn toàn (HTTP 200) và tập kết quả rỗng thực sự (`files.length === 0`).
    2. **Throw Error khi gặp sự cố**: Mọi lỗi HTTP (401, 403, 500), lỗi fetch mạng, lỗi JSON parse hoặc phân trang không trọn vẹn BẮT BUỘC ném ngoại lệ ngay lập tức.
    3. **Chặn nhánh tạo file trong Pull/Push**: Cả `syncWithGoogleDrive` và `saveDatabaseWithConflictResolution` khi gặp ngoại lệ từ `resolveCanonicalDriveDatabase` đều phải dừng luồng và báo lỗi đồng bộ, TUYỆT ĐỐI không đi vào nhánh POST tạo registry mới.
    4. **Bổ sung test Ca B tại Task 4.5**: Mô phỏng Drive files list trả về 401/500/mạng lỗi; xác nhận hệ thống throw Error, dừng an toàn và không gọi POST tạo file.

### EFR Đã Bác Bỏ
- Không có.

### EFR Chưa Kết Luận
- Không có.

### Phát Hiện Bổ Sung (SFR)
- Không có.

### Vùng đã scan khi không có SFR
- `FEATURE_PLAN.md:15-95`
- `FEATURE_TASKS.md:46-130`
- `src/App.tsx:100-187`
- `src/services/googleDriveService.ts:555-729`

## Round 13 - 2026-10-07T16:48:00+07:00

### Tổng kết
- EFR: 0 (accepted: 0, rejected: 0, inconclusive: 0) | SFR mới: 0 | Plan sửa: không (đã hội tụ)
- Mode: normal
- Context loaded: `EXPERT_REVIEW.md` (Quick Status Gate)
- Verdict: `✅ HỘI TỤ`

### Kết Quả
- Codex Desktop hoàn thành scan pass vòng 13 và xác nhận **0 finding mới**.
- Toàn bộ các findings từ EFR-01 đến EFR-22 đã được tích hợp chặt chẽ, không còn mâu thuẫn hay lỗ hổng logic mở.
- Review gate chính thức đóng, sẵn sàng chuyển giao sang `feature-coordinator` để thực thi.








