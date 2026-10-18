# Feature Tasks: Khắc phục lỗi Xóa văn bản, Chống phục hồi do Sync & Circuit Breaker cho Realtime WebSocket

> **Trạng thái**: ✅ Hoàn thành  
> **Liên kết plan**: [FEATURE_PLAN.md](./FEATURE_PLAN.md)  
> **Ngày tạo**: 2026-10-07 (Đã cập nhật sau khi hoàn thành toàn bộ các Phase)  

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: In-App Confirmation & Async UI Contract (EFR-01, EFR-08, EFR-11, FR-03)

**Mục tiêu:** Thay thế hoàn toàn `window.confirm()` bằng UI nội bộ, chuẩn hóa hợp đồng bất đồng bộ `onDelete: (id: string) => Promise<{ success: boolean; driveSynced: boolean; message?: string }>`, quản lý loading/disabled chống double-click, bảo đảm hoạt động mượt mà trong iframe sandbox.

- [x] Task 1.1 <!-- Sửa theo EFR-01, EFR-08 & EFR-11 -->: Xây dựng In-App Delete Confirmation Modal trong `src/components/DocumentDetailModal.tsx`:
  - Thêm state `showDeleteConfirm: boolean` và `isDeleting: boolean`.
  - Hiển thị dialog xác nhận dạng modal phủ (overlay) nội bộ với thông điệp rõ ràng, nút [Hủy] và nút [Xác nhận xóa].
  - Khi người dùng bấm [Xác nhận xóa]: đặt `isDeleting = true`, vô hiệu hóa các nút, chờ `const res = await onDelete(doc.id)`.
  - Nếu `res.success === true`: Đóng modal an toàn (nếu `!res.driveSynced`, thông báo cho người dùng biết dữ liệu đã xóa trên máy và đang chờ đồng bộ đám mây). Nếu `res.success === false`: Giữ nguyên modal, tắt `isDeleting`, hiển thị lỗi để người dùng có thể thử lại.
- [x] Task 1.2 <!-- Sửa theo EFR-01, FR-03, EFR-08 & EFR-11 -->: Bổ sung nút Xóa trên `src/components/DocumentArchiveView.tsx`:
  - Thêm icon Thùng rác (`Trash2`) trên từng dòng của Chế độ Bảng (Table View) và từng thẻ của Chế độ Thẻ (Grid View).
  - Thêm state `deletingDocId: string | null` và `docToDeleteConfirm: DocumentRecord | null`.
  - Hiển thị In-App confirm dialog dạng popup nội bộ với `e.stopPropagation()` chặt chẽ, hiển thị spinner loading khi đang xóa, chống double-click.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Kiểm tra mở modal/danh sách, bấm xóa hiển thị confirm nội bộ, kiểm tra trạng thái loading/disabled, kiểm tra modal không bị đóng khi xóa thất bại).

---

## Phase 2: WebSocket Circuit Breaker (EFR-05)

**Mục tiêu:** Chặn mọi đường gọi kết nối WebSocket khi máy chủ đóng bất thường, không phụ thuộc mã HTTP 520, dập tắt rác console.

- [x] Task 2.1 <!-- Sửa theo EFR-05 -->: Cập nhật `src/services/realtimeService.ts` đặt chốt chặn kiểm tra `if (isCircuitBroken) return;` ngay tại dòng đầu của `connectWebSocket()`, bảo vệ mọi entry point (reconnect timer, visibility change, v.v.).
- [x] Task 2.2 <!-- Sửa theo EFR-05 -->: Xử lý đếm số lần đóng bất thường (`onclose` với `code !== 1000`), áp dụng Exponential Backoff (2s, 5s, 10s); sau 3 lần kích hoạt `isCircuitBroken = true` và dừng hoàn toàn thử lại.
- [x] Task 2.3: Bổ sung hàm `resetRealtimeCircuitBreaker()` và Cooldown 5 phút (Half-Open recovery).
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Chạy `npx tsc --noEmit`, test ngắt mạch dừng sau 3 lần thử lại).

---

## Phase 3: Resilient Conflict-Free Shared Tombstone Engine (EFR-06, EFR-07, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21, EFR-22)

**Mục tiêu:** Chuẩn hóa state machine của Tombstone (`registrySynced`, `assetCleaned`), kiểm chứng thực tế provider Drive bằng Probe Hard Gate, triển khai điểm nhập chung tự động hợp nhất `resolveCanonicalDriveDatabase` với cơ chế xử lý lỗi liệt kê nghiêm ngặt (chống tạo duplicate registry do lỗi mạng/HTTP) và quy trình Zero-Deletion Reconciliation cho duplicate registries (`reconcileDuplicateDriveDatabases`), và hoàn thiện hàm ghi `saveDatabaseWithConflictResolution` bảo đảm không bao giờ mất dữ liệu.

- [x] Task 3.0 <!-- Sửa theo EFR-14 & EFR-16 -->: 🔬 **Provider Verification Probe Hard Gate**:
  - Viết probe script kiểm chứng trực tiếp phản hồi của Google Drive v3 REST API:
    - Kiểm tra `ETag` validator trả về từ header của GET request (`https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`).
    - Gửi request PATCH upload với header `If-Match: etag_cũ` lên file thử nghiệm, ghi nhận chính xác mã HTTP trả về (`412 Precondition Failed` hoặc mã lỗi tương đương).
    - **Điểm quyết định (Decision Gate)**:
      - *Nhánh Pass (trả về 412)*: Xác nhận CAS hoạt động trên provider; kích hoạt chế độ `If-Match` + 412 CAS retry trong adapter Drive.
      - *Nhánh Fail (bỏ qua header hoặc trả về 2xx/400)*: DỪNG NGAY Phase 3, thông báo User để lựa chọn chuyển quyền điều phối ghi qua Node.js backend (`server.ts` mutex) hoặc thu hẹp cam kết nhất quán đồng thời; tuyệt đối không tiếp tục triển khai với giả định sai.
- [x] Task 3.1 <!-- Sửa theo EFR-07 & EFR-11 -->: Cập nhật `src/services/storage.ts`:
  - Định nghĩa interface `TombstoneRecord { id: string; docNumber?: string; driveFileId?: string; deletedAt: number; registrySynced: boolean; assetCleaned: boolean }`.
  - Cập nhật các hàm `getTombstones()`, `addTombstone()`, `updateTombstone()`, và `pruneTombstones()` (chỉ prune khi `registrySynced === true` VÀ (`!driveFileId` HOẶC `assetCleaned === true`) và cũ hơn 30 ngày).
- [x] Task 3.2 <!-- Sửa theo EFR-10, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 -->: Cập nhật `src/services/googleDriveService.ts`:
  - Mở rộng `DriveDatabasePayload`: thêm `revision?: number` và `deletedRecords?: { id: string; deletedAt: number }[]`.
  - Xây dựng hàm `mergeDocumentsAndTombstones(docsA, docsB, tombstonesA, tombstonesB)`:
    - Hợp nhất tombstones (union `deletedRecords` theo `id` và `deletedAt` mới nhất).
    - Lấy tập ID đã xóa: `deletedIds = Set(mergedTombstones.map(t => t.id))`.
    - Hợp nhất documents theo `id` (ưu tiên bản ghi có `updatedAt` / `createdAt` mới nhất).
    - **Tombstone-Wins**: Lọc sạch `mergedDocs = mergedDocs.filter(d => !deletedIds.has(d.id))`.
  - Cập nhật `findDriveFileByName`: trả về `{ id, name, etag, parents, modifiedTime } | null`; loại bỏ hoàn toàn đoạn mã tự động xóa file trùng; bỏ qua các file có metadata `properties.deprecated === 'true'`, tên kết thúc bằng `.bak`, hoặc `trashed === true`.
  - Xây dựng quy trình Lock-First Safe Reconciliation `reconcileDuplicateDriveDatabases(accessToken, files)`:
    - Bước 1 (Lock First - Metadata only): Cập nhật metadata của tất cả các file phụ thành `DRIVE_DB_FILENAME + ".merged." + file.id + ".bak"`, gắn `contentRestrictions: [{ readOnly: true, reason: "Migrated to canonical" }]` và `properties: { deprecated: "true", canonicalFileId: canonicalFile.id }`. **Tuyệt đối không gửi media PATCH ghi đè JSON payload** để tránh ghi đè dữ liệu trên file phụ.
    - Bước 2 (Read Final Frozen Snapshot): Sau khi server Drive xác nhận file phụ đã khóa, đọc nội dung cuối cùng (final snapshot) của từng file phụ đã khóa.
    - Bước 3 (Merge with Tombstone-Wins): Sử dụng `mergeDocumentsAndTombstones` để hợp nhất documents và tombstones từ snapshot cuối cùng và canonical file, bảo đảm lọc sạch mọi văn bản đã có dấu xóa.
    - Bước 4 (Canonical CAS Write): Ghi `canonicalPayload` vào canonical file kèm `If-Match: canonicalEtag`.
    - Quét idempotent định kỳ các file `.bak` để phát hiện và hợp nhất bất kỳ delta nào nếu có.
  - Xây dựng hàm điểm nhập chung `resolveCanonicalDriveDatabase(accessToken, folderId)` (EFR-21 & EFR-22):
    - Liệt kê đầy đủ các file có `name = DRIVE_DB_FILENAME` (không trashed, phân trang nếu cần).
    - **Xử lý lỗi nghiêm ngặt (EFR-22)**: Bắt buộc ném ngoại lệ khi có bất kỳ lỗi HTTP (!res.ok, 401, 403, 500), lỗi mạng (fetch reject), JSON parse lỗi hoặc phân trang không hoàn tất.
    - **CHỈ trả về `null`** khi và chỉ khi yêu cầu liệt kê thành công hoàn toàn (HTTP 200) và tập kết quả rỗng (`files.length === 0`).
    - Nếu 1 file: trả về file đó.
    - Nếu > 1 file: tự động gọi và await `reconcileDuplicateDriveDatabases(accessToken, files)`.
    - Xử lý lỗi reconcile: nếu reconcile thất bại, ném ngoại lệ dừng ngay chuỗi xử lý, không tiếp tục đọc/ghi mù quáng trên trạng thái phân mảnh. Nếu thành công, trả về canonical file đã được hợp nhất.
  - Xây dựng hàm `saveDatabaseWithConflictResolution(accessToken, folderId, updateFn, maxRetries = 3)`:
    - Luôn gọi `resolveCanonicalDriveDatabase` ngay trước khi chuẩn bị payload (thay vì chỉ tìm file đơn lẻ, không cache `fileId` cũ).
    - Nếu file hiện tại mang `properties.deprecated === 'true'` hoặc khi PATCH gặp lỗi HTTP 403 (bị Write Fence), tự động xóa cache fileId, chuyển sang `canonicalFileId` hoặc gọi lại `resolveCanonicalDriveDatabase` để lấy canonical file và retry.
    - Đọc file JSON từ Google Drive (lấy `currentPayload` và `etag` từ response header/metadata).
    - Áp dụng `updateFn(currentPayload)` (thực hiện union `deletedRecords` và lọc documents theo Tombstone-Wins).
    - Gửi request PATCH lên Google Drive kèm header `If-Match: etag` (nếu Probe Gate Passed).
    - Bắt lỗi HTTP `412 Precondition Failed`: tự động đọc lại remote payload và etag mới nhất từ Google Drive, tái áp dụng `updateFn` và retry (tối đa 3 lần với backoff).
- [x] Task 3.3 <!-- Sửa theo EFR-04, EFR-08 & EFR-11 -->: Cập nhật `handleDeleteDocument` trong `src/App.tsx`:
  - Trả về kiểu `Promise<{ success: boolean; driveSynced: boolean; message?: string }>`.
  - Bước 1: Đọc doc, tạo Tombstone đầy đủ snapshot (`registrySynced: false`, `assetCleaned: false`).
  - Bước 2: Xóa khỏi IndexedDB cục bộ và cân chỉnh categories.
  - Bước 3: Đẩy cập nhật lên Google Drive qua `saveDatabaseWithConflictResolution` -> Thành công thì cập nhật `registrySynced = true`.
  - Bước 4: Gọi `deleteFileFromGoogleDrive(accessToken, driveFileId)` -> Thành công hoặc 404 thì cập nhật `assetCleaned = true`.
  - Bước 5: Bắn tín hiệu Realtime (nếu kết nối còn sống) và trả về `{ success: true, driveSynced: isDriveSynced }`.
- [x] Task 3.4 <!-- Sửa theo EFR-06, EFR-07, EFR-10, EFR-12, EFR-13, EFR-20, EFR-21 & EFR-22 -->: Cập nhật mọi đường push VÀ đường pull trong `src/App.tsx`:
  - Các đường push (`handleDocumentCreated`, `handleSaveCategories`, `pushLocalDbToDrive`): đều đi qua `saveDatabaseWithConflictResolution` (tự động resolve canonical & reconcile qua `resolveCanonicalDriveDatabase`) với quy tắc Tombstone-Wins, không bao giờ hồi sinh văn bản đã xóa. Khi gặp ngoại lệ từ `resolveCanonicalDriveDatabase`, dừng ngay và báo lỗi, TUYỆT ĐỐI không tự ý POST tạo file mới.
  - Đường pull (`syncWithGoogleDrive`):
    - Đi qua `resolveCanonicalDriveDatabase`: tự động phát hiện và kích hoạt reconcile duplicate registries trên Drive trước khi tải dữ liệu về máy. Nếu gặp ngoại lệ (do mạng/HTTP lỗi), dừng luồng pull và báo lỗi, không đi vào nhánh khởi tạo file mới.
    - Đọc `remoteData.deletedRecords` và kết hợp với `localTombstones` thành `effectiveDeletedIds`.
    - Lưu các tombstone mới từ remote vào local DB.
    - Lọc sạch `remoteData.documents`: chỉ lưu các doc có `!effectiveDeletedIds.has(doc.id)`. Tuyệt đối không lưu doc đã có tombstone vào IndexedDB.
  - Quét danh sách Tombstone có `assetCleaned === false` và `driveFileId`: nếu token Drive hợp lệ, tự động thử dọn dẹp vét đĩa và cập nhật `assetCleaned = true`.
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Chạy `npx tsc --noEmit`, kiểm tra luồng xóa - ghi tombstone - đồng bộ lọc Tombstone-Wins).

---

## Phase 4: Comprehensive Verification & Edge-Case Testing (EFR-09, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21, EFR-22)

**Mục tiêu:** Thực hiện kiểm thử toàn diện các ca quyết định được chỉ ra trong Expert Review: iframe sandbox, xóa asset thất bại, probe hard gate, Lock-First barrier, kiểm thử Tombstone-Wins khi pull dữ liệu sau reconcile, kích hoạt reconcile tự động qua entry point luồng thực, và kiểm thử chặn tạo file mới khi lệnh list bị lỗi mạng/HTTP.

- [x] Task 4.1 <!-- Sửa theo EFR-09 -->: Kiểm thử In-App confirm dialog trong môi trường iframe sandbox không có thuộc tính `allow-modals` (xác nhận mở modal xác nhận, bấm Hủy giữ nguyên, bấm Xác nhận xóa thành công).
- [x] Task 4.2 <!-- Sửa theo EFR-09 & EFR-11 -->: Kiểm thử kịch bản xóa asset Drive thất bại (mô phỏng token hết hạn hoặc mạng lỗi): xác nhận bản ghi vẫn bị xóa khỏi sổ, `driveFileId` được giữ lại trong Tombstone với `assetCleaned = false`, modal đóng an toàn và toast báo rõ trạng thái, retry dọn asset thành công khi token được làm mới.
- [x] Task 4.3 <!-- Sửa theo EFR-09, EFR-10, EFR-12, EFR-14 & EFR-16 -->: Kiểm thử Probe Hard Gate và mô phỏng 2 thiết bị thao tác xen kẽ: gửi 2 request PATCH cùng gửi `If-Match: etag_cũ`, xác nhận request thứ hai bị trả về mã HTTP `412 Precondition Failed` và tự động retry thành công, bảo toàn cả việc xóa X và tạo Y (doc X không bị hồi sinh).
- [x] Task 4.4 <!-- Sửa theo EFR-13, EFR-15, EFR-17, EFR-18 & EFR-19 -->: Kiểm thử Barrier Lock-First khi Client B PATCH vào file phụ trước Bước 1 hoặc giữa Bước 1 và Bước 4:
  - B PATCH thành công văn bản Y vào file phụ ngay trước khi A áp dụng Write Fence.
  - Bước 2 (Read Final Frozen Snapshot) đọc được văn bản Y trong final snapshot của file phụ.
  - Xác nhận Bước 4 ghi Y vào canonical file, Y không bị bất kỳ marker nào ghi đè mất, và request tiếp theo của B sau khi khóa bị từ chối 403 để redirect sang canonical file.
- [x] Task 4.5 <!-- Sửa theo EFR-20, EFR-21 & EFR-22 -->: Kiểm thử Tombstone-Wins, Tự động Reconcile và Chống Tạo Trùng khi List Lỗi:
  - Ca A (Reconcile & Tombstone-Wins): Thiết lập kịch bản tồn tại 2 file registry cùng tên trên Drive. Thiết bị A xóa văn bản X (tạo tombstone X trên registry A). Registry B còn chứa văn bản X cũ trong `documents` và văn bản mới Y. Thiết bị B gọi `syncWithGoogleDrive` (Pull) hoặc `saveDatabaseWithConflictResolution` (Push). Xác nhận `resolveCanonicalDriveDatabase` tự động phát hiện 2 registry, kích hoạt Lock-First reconcile, và văn bản X vắng mặt hoàn toàn ở canonical file/Thiết bị B, văn bản Y được bảo toàn.
  - Ca B (Chống tạo trùng khi list lỗi - EFR-22): Mô phỏng Google Drive files list API trả về mã lỗi HTTP 401/500 hoặc `fetch` reject khi Thiết bị B gọi `syncWithGoogleDrive` hoặc `saveDatabaseWithConflictResolution`. Xác nhận `resolveCanonicalDriveDatabase` ném lỗi, tiến trình dừng an toàn, hiển thị thông báo lỗi đồng bộ và TUYỆT ĐỐI KHÔNG gửi request POST tạo file registry mới.
- [x] Task 4.6 <!-- Sửa theo EFR-09 -->: Kiểm thử WebSocket Circuit Breaker: ngắt kết nối giả lập 3 lần, xác nhận console dừng ghi log lỗi và reset thử lại khi bấm nút "Đồng bộ".
- [x] Task 4.Final: 🧪 Test & Verify Toàn Diện (Chạy `npm run lint` / `npx tsc --noEmit` đạt 0 lỗi).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-10-07 | Phase 1-3 | Setup | Khởi tạo file kế hoạch và checklist | done | Chờ review từ User |
| 2026-10-07 | Council | Review | Chạy `feature-review`, verdict `✅ ĐỒNG Ý` | done | Bổ sung FR-01, FR-02, FR-03 |
| 2026-10-07 | Codex | Rebuttal | Tiếp nhận 5 EFR từ Codex Desktop Round 2 | done | Chấp nhận toàn bộ EFR-01 -> EFR-05 |
| 2026-10-07 | Codex | Rebuttal 2 | Tiếp nhận 4 EFR từ Codex Desktop Round 3 | done | Chấp nhận toàn bộ EFR-06 -> EFR-09 |
| 2026-10-07 | Codex | Rebuttal 3 | Tiếp nhận 2 EFR từ Codex Desktop Round 4 | done | Chấp nhận toàn bộ EFR-10 -> EFR-11 |
| 2026-10-07 | Phase 1-4 | Refine | Cập nhật plan & tasks với Conflict Resolution & Async Result Contract | done | Hội tụ hoàn toàn, sẵn sàng triển khai |
| 2026-10-07 | Phase 1 | UI Implementation | Thay thế window.confirm bằng In-App confirm modal, thêm Trash icon vào Table & Grid View | done | Hoàn thành `DocumentDetailModal.tsx` và `DocumentArchiveView.tsx` |
| 2026-10-07 | Phase 2 | Realtime Resilient | Thêm WebSocket Circuit Breaker chống reconnect loop, backoff [2s, 5s, 10s], Half-Open cooldown | done | Hoàn thành `realtimeService.ts` |
| 2026-10-07 | Phase 3 | Core Engine | Cập nhật Tombstones storage, Lock-First Reconciliation, CAS retry, Tombstone-Wins, và entry point chung `resolveCanonicalDriveDatabase` | done | Hoàn thành `storage.ts`, `googleDriveService.ts`, `App.tsx` |
| 2026-10-07 | Phase 4 | Verification Suite | Viết và chạy `tests/test-deletion-resilience.ts` (18/18 tests pass), `npm run lint` 0 lỗi | done | Sẵn sàng bàn giao User test local dev |
