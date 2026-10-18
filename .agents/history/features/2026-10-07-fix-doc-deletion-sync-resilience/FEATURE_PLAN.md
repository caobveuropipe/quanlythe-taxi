# Feature Plan: Khắc phục lỗi Xóa văn bản, Chống phục hồi do Sync & Circuit Breaker cho Realtime WebSocket

> **Trạng thái**: ✅ ĐỒNG Ý (Đã tích hợp toàn diện EFR-01 đến EFR-22 qua 12 vòng review)  
> **Review gate**: Đã hội tụ hoàn toàn sau Expert Rebuttal Round 12  
> **Feature slug**: fix-doc-deletion-sync-resilience  
> **Tạo bởi**: feature-plan (Updated by expert-rebuttal)  
> **Ngày tạo**: 2026-10-07  

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hệ thống Cấp số & Quản lý Văn bản Hành chính (HC-ADM-CapSoVanBan) sử dụng mô hình kết hợp Client-side Storage (IndexedDB), Đồng bộ Google Drive dùng chung (BYOS JSON registry), và WebSocket thời gian thực (`/api/realtime`) để cập nhật tức thì giữa các thiết bị. Ứng dụng thường xuyên được nhúng trong iframe/webview (ví dụ portal `hub.playai.vn`).
- **Vấn đề cần giải quyết:** 
  1. <!-- EFR-01 & EFR-08 --> **Iframe sandbox chặn confirm() & hợp đồng async UI:** `window.confirm()` bị iframe sandbox chặn âm thầm. Cần In-App Confirm modal và hợp đồng kết quả xóa có cấu trúc rõ ràng (Phase 1 độc lập, triển khai được ngay).
  2. <!-- Sửa theo EFR-10, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 --> **Provider Probe Hard Gate, Lock-First Reconciliation & Quy tắc Tombstone-Wins Toàn Diện:**
     - **Provider Probe Hard Gate (EFR-14 & EFR-16):** Task 3.0 là **Hard Decision Gate**: kiểm chứng thực tế xem Google Drive upload PATCH có từ chối stale write bằng mã HTTP `412 Precondition Failed` hay không. Nếu Pass (có 412), tiếp tục triển khai direct CAS. Nếu Fail (server bỏ qua If-Match), DỪNG NGAY Phase 3 và báo User để chuyển sang backend coordinator (`server.ts` mutex) hoặc thu hẹp cam kết nhất quán, tuyệt đối không hứa hẹn tính nguyên tử khi thiếu bằng chứng provider.
     - **Điểm nhập chung Resolve & Reconcile Tự động, Phân định Lỗi Liệt kê (EFR-21 & EFR-22):** Xây dựng hàm `resolveCanonicalDriveDatabase` làm điểm nhập chung cho cả luồng Pull (`syncWithGoogleDrive`) và luồng Push (`saveDatabaseWithConflictResolution`). Phân biệt rạch ròi giữa "Drive xác nhận không có registry" (chỉ trả về `null` khi HTTP 200 thành công và danh sách rỗng hoàn toàn) với "Không thể kiểm tra Drive" (mọi lỗi mạng, HTTP 401/403/500, phân trang chưa hoàn tất BẮT BUỘC ném ngoại lệ để dừng luồng, tuyệt đối không trả `null` làm client hiểu nhầm rồi tự tạo duplicate registry mới). Khi phát hiện có nhiều hơn 1 file registry trùng tên, hàm tự động kích hoạt `reconcileDuplicateDriveDatabases`. Nếu reconcile gặp lỗi, dừng ngay và ném ngoại lệ, không tiếp tục pull/push trong trạng thái phân mảnh.
     - **Lock-First Safe Reconciliation & Zero-Deletion (EFR-15, EFR-17, EFR-18 & EFR-19):** Khóa ghi file phụ trước bằng metadata update (`contentRestrictions: [{ readOnly: true }]`, đổi tên thành `.bak`, ghi `properties: { deprecated: "true", canonicalFileId }`). Không gửi media PATCH ghi đè JSON file phụ. Đọc final frozen snapshot sau khi khóa, rồi mới union vào canonical file và lưu CAS `If-Match`.
     - **Quy tắc Tombstone-Wins Toàn Diện (EFR-03, EFR-06 & EFR-20):** Dấu xóa luôn thắng bản văn bản cũ ở mọi luồng hợp nhất (Reconcile), đẩy lên (Push) và tải xuống (Pull `syncWithGoogleDrive`). Tập hợp `effectiveDeletedIds = Set(remoteData.deletedRecords ∪ localTombstones)`. Tuyệt đối loại bỏ mọi văn bản có ID nằm trong `effectiveDeletedIds` trước khi lưu canonical file và trước khi ghi vào IndexedDB cục bộ của bất kỳ client nào, chặn đứng hoàn toàn việc văn bản cũ hồi sinh.
  3. <!-- EFR-11 --> **Trạng thái kết quả xóa và khả năng retry:** Tránh xóa sạch local trước khi ghi nhận đủ dữ liệu resume; Tombstone phải lưu đầy đủ snapshot cần thiết (`id`, `docNumber`, `driveFileId`, `deletedAt`). Phân định rõ kết quả: nếu `localDeleted` thành công thì UI đóng modal an toàn và hiển thị thông báo tiến độ Drive tương ứng, tránh tình trạng lỗi Drive làm kẹt modal mà không thể retry.
  4. <!-- EFR-07 & EFR-04 --> **Quản lý trạng thái dọn dẹp asset:** Tách bạch trạng thái `registrySynced` và `assetCleaned`. Nếu xóa asset thất bại do mạng/hết hạn phiên, thông tin `driveFileId` được giữ lại để dọn dẹp sau, không bị mất do prune sớm.
  5. <!-- EFR-05 --> **WebSocket Circuit Breaker toàn diện:** Chặn mọi đường gọi vào `connectWebSocket()` sau 3 lần đóng bất thường liên tiếp, có cơ chế Half-open sau 5 phút hoặc khi bấm nút "Đồng bộ".
  6. <!-- EFR-09, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 --> **Bổ sung Phase 4 Verification & Test đầy đủ:** Bổ sung các ca kiểm thử quyết định: iframe sandbox, xóa asset thất bại, probe provider Hard Gate, kiểm thử Lock-First barrier khi writer B PATCH trước lúc khóa, test Tombstone-Wins khi B pull dữ liệu sau khi reconcile, kiểm thử tự động kích hoạt reconciliation qua entry point thực tế `syncWithGoogleDrive`/`saveDatabaseWithConflictResolution`, và kiểm thử dừng an toàn không tạo registry mới khi lệnh list bị lỗi HTTP/mạng.

---

## 2. Phạm vi

### In scope
- <!-- EFR-01 & EFR-08 & EFR-11 --> **`src/components/DocumentDetailModal.tsx`**:
  - In-App Confirmation Modal thay thế `window.confirm()`.
  - Hợp đồng `onDelete: (id: string) => Promise<{ success: boolean; driveSynced: boolean; message?: string }>`.
  - Quản lý `isDeleting`, vô hiệu hóa nút bấm chống double-click, chỉ đóng modal khi `success === true`.
- <!-- EFR-01, FR-03, EFR-08 & EFR-11 --> **`src/components/DocumentArchiveView.tsx`**:
  - Nút Xóa (icon `Trash2`) trên từng hàng (Table) và từng thẻ (Grid).
  - Dialog xác nhận nội bộ với `e.stopPropagation()`, trạng thái `isDeletingDocId` và spinner loading.
- <!-- EFR-07 & EFR-11 --> **`src/services/storage.ts`**:
  - Interface `TombstoneRecord { id: string; docNumber?: string; driveFileId?: string; deletedAt: number; registrySynced: boolean; assetCleaned: boolean }`.
  - Các hàm quản lý: `getTombstones()`, `addTombstone()`, `updateTombstone()`, `getTombstoneById()`, `pruneTombstones()` (chỉ prune khi cả `registrySynced === true` VÀ (`!driveFileId` HOẶC `assetCleaned === true`) và cũ hơn 30 ngày).
- <!-- Sửa theo EFR-10, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 --> **`src/services/googleDriveService.ts`**:
  - Bổ sung trường `revision?: number` và `deletedRecords?: { id: string; deletedAt: number }[]` trong `DriveDatabasePayload`.
  - Hàm chuẩn `mergeDocumentsAndTombstones(docsA, docsB, tombstonesA, tombstonesB)`: áp dụng triệt để quy tắc Tombstone-Wins (union tombstones, union documents, lọc sạch document nếu ID nằm trong tập tombstones).
  - Cập nhật `findDriveFileByName`: trả về `{ id, name, etag, parents, modifiedTime }`; lọc bỏ các file có metadata `properties.deprecated === 'true'`, đuôi `.bak`, hoặc `trashed === true`.
  - Điểm nhập chung `resolveCanonicalDriveDatabase(accessToken, folderId)` (EFR-21 & EFR-22):
    - Liệt kê đầy đủ các file có `name = DRIVE_DB_FILENAME` (không trashed, phân trang nếu cần).
    - **Xử lý lỗi nghiêm ngặt (EFR-22)**: Bắt buộc ném ngoại lệ khi có bất kỳ lỗi HTTP (!res.ok, 401, 403, 500), lỗi mạng (fetch reject), hoặc phân trang không hoàn tất.
    - **CHỈ trả về `null`** khi yêu cầu liệt kê thành công hoàn toàn (HTTP 200) và tập kết quả thực sự rỗng (`files.length === 0`).
    - Nếu 1 file: trả về file đó.
    - Nếu > 1 file: tự động gọi và await `reconcileDuplicateDriveDatabases(accessToken, files)`. Nếu reconcile thành công, trả về canonical file đã hợp nhất; nếu reconcile lỗi, ném ngoại lệ dừng luồng, không tiếp tục thao tác mù quáng.
  - Xây dựng quy trình Lock-First `reconcileDuplicateDriveDatabases(accessToken, files)`:
    - Bước 1 (Lock First - Metadata only): Cập nhật metadata các file phụ thành `DRIVE_DB_FILENAME + ".merged." + file.id + ".bak"`, gắn `contentRestrictions: [{ readOnly: true, reason: "Migrated to canonical" }]` và `properties: { deprecated: "true", canonicalFileId: canonicalFile.id }`. Không PATCH body JSON.
    - Bước 2 (Read Final Frozen Snapshot): Đọc nội dung snapshot cuối cùng của tất cả file phụ đã khóa.
    - Bước 3 (Merge with Tombstone-Wins): Áp dụng `mergeDocumentsAndTombstones`, hợp nhất categories, union tombstones và lọc sạch documents theo danh sách tombstone.
    - Bước 4 (Canonical CAS Write): Ghi `canonicalPayload` vào canonical file với `If-Match: canonicalEtag`.
    - Quét idempotent định kỳ các file `.bak` để phát hiện bất kỳ thay đổi nào.
  - Hàm cập nhật chống xung đột `saveDatabaseWithConflictResolution(accessToken, folderId, updateFn)`:
    - Luôn truy vấn qua `resolveCanonicalDriveDatabase` ngay trước khi chuẩn bị payload (không cache `fileId`).
    - Lấy file hiện tại và validator (`etag` từ HTTP response header hoặc file metadata).
    - Tự động chuyển hướng nếu gặp file có `properties.deprecated === 'true'` hoặc HTTP 403 (bị fence).
    - Áp dụng `updateFn` (với quy tắc Tombstone-Wins).
    - Thực hiện PATCH với header `If-Match: etag`.
    - Bắt lỗi HTTP `412 Precondition Failed` (nếu Probe Gate xác nhận hỗ trợ), tự động đọc lại remote payload và validator mới nhất, re-apply `updateFn` và retry tối đa 3 lần.
- <!-- EFR-06, EFR-07, EFR-10, EFR-11, EFR-20, EFR-21 & EFR-22 --> **`src/App.tsx`**:
  - Chuẩn hóa luồng `handleDeleteDocument`:
    1. Đọc doc, tạo Tombstone đầy đủ snapshot (`registrySynced: false`, `assetCleaned: false`).
    2. Xóa local IndexedDB & cân chỉnh categories.
    3. Cập nhật Google Drive Registry thông qua hàm giải quyết xung đột -> nếu thành công set `registrySynced = true`.
    4. Xóa asset file trên Drive -> nếu thành công hoặc 404 set `assetCleaned = true`.
    5. Trả về kết quả `{ success: true, driveSynced: isDriveSynced }`.
  - Chuẩn hóa mọi đường push (`pushLocalDbToDrive`, `handleDocumentCreated`, `handleSaveCategories`): đều sử dụng `saveDatabaseWithConflictResolution` (tự động thông qua `resolveCanonicalDriveDatabase`) để union `deletedRecords` và lọc documents theo Tombstone-Wins. Khi `resolveCanonicalDriveDatabase` ném lỗi, dừng ngay và thông báo lỗi, không tự ý tạo registry mới.
  - <!-- EFR-20, EFR-21 & EFR-22 --> Chuẩn hóa luồng pull (`syncWithGoogleDrive`):
    - Đi qua `resolveCanonicalDriveDatabase`: tự động phát hiện và kích hoạt reconcile duplicate registries trên Drive trước khi tải dữ liệu về máy. Nếu hàm ném lỗi (do mạng/HTTP), dừng luồng pull và báo lỗi, không đi vào nhánh khởi tạo file mới.
    - Đọc `remoteData.deletedRecords` và kết hợp với `localTombstones` thành `effectiveDeletedIds`.
    - Lưu các tombstone mới từ remote vào local DB.
    - Lọc sạch `remoteData.documents`: loại bỏ mọi văn bản có `effectiveDeletedIds.has(doc.id)`.
    - Chỉ lưu các văn bản hợp lệ vào IndexedDB, tuyệt đối không hồi sinh văn bản đã có tombstone.
- <!-- EFR-05 --> **`src/services/realtimeService.ts`**:
  - Chốt chặn `if (isCircuitBroken) return;` tại đầu `connectWebSocket()` cho mọi entry point.
  - Đếm số lần đóng bất thường, Exponential Backoff (2s, 5s, 10s), Cooldown 5 phút, hàm `resetRealtimeCircuitBreaker()`.

---

## 3. Acceptance Criteria

- [ ] <!-- EFR-01, EFR-08, EFR-11 --> **AC-1**: Bấm xóa trong `DocumentDetailModal` hoặc `DocumentArchiveView` hiển thị In-App confirm dialog; nút bấm hiển thị loading và bị disabled trong lúc xử lý; xóa local thành công thì modal đóng an toàn và toast báo rõ trạng thái Drive; nếu local lỗi thì modal giữ nguyên để thử lại.
- [ ] <!-- Sửa theo EFR-06, EFR-10, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 --> **AC-2**:
  - Task 3.0 Probe Gate hoàn thành: nếu Google Drive trả về HTTP 412 với `If-Match`, tính nguyên tử được bảo đảm bằng CAS retry; nếu Probe thất bại, Phase 3 dừng lại và thông báo User chọn giải pháp backend coordinator, không thực thi giả định mù.
  - Cả luồng Pull (`syncWithGoogleDrive`) và Push (`saveDatabaseWithConflictResolution`) đều đi qua điểm nhập `resolveCanonicalDriveDatabase`. Hàm CHỈ trả về `null` khi xác nhận thành công danh sách rỗng (`files.length === 0`); mọi lỗi mạng, HTTP 401/403/500 phải ném ngoại lệ dừng luồng và ngăn chặn tuyệt đối việc tự tạo duplicate registry mới.
  - Khi phát hiện nhiều registry cùng tên, hệ thống tự động kích hoạt và hoàn tất `reconcileDuplicateDriveDatabases` theo nguyên tắc Lock-First trước khi đọc/ghi canonical file; nếu reconcile gặp sự cố, dừng ngay tiến trình và không để client thao tác phân mảnh.
  - Khi 2 thiết bị cùng khởi tạo registry tạo ra các file trùng tên, cơ chế `reconcileDuplicateDriveDatabases` áp dụng Lock-First: khóa ghi file phụ trước, đọc snapshot đóng băng cuối cùng, merge vào canonical file và lưu CAS. Tuyệt đối không ghi đè body JSON file phụ.
  - Quy tắc Tombstone-Wins được thực thi trên cả 3 luồng Reconcile, Push, và Pull: khi Thiết bị A xóa văn bản X và file phụ còn bản X cũ, sau khi reconcile và Thiết bị B đồng bộ (pull), văn bản X vắng mặt hoàn toàn ở canonical registry và trên giao diện/IndexedDB của Thiết bị B; không bao giờ bị hồi sinh.
- [ ] <!-- EFR-07 & EFR-11 --> **AC-3**: Nếu xóa file asset Drive thất bại, thông tin `driveFileId` được giữ lại trong Tombstone (`assetCleaned: false`) và được tự động dọn dẹp bù trong lần kết nối tiếp theo; không bị prune mất sớm.
- [ ] <!-- EFR-05 --> **AC-4**: Circuit Breaker chặn tất cả các đường gọi vào `connectWebSocket()` sau 3 lần đóng bất thường liên tiếp, không spam console; có cơ chế reset khi bấm nút Đồng bộ hoặc sau cooldown 5 phút.
- [ ] <!-- Sửa theo EFR-09, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17, EFR-18, EFR-19, EFR-20, EFR-21 & EFR-22 --> **AC-5**: Toàn bộ các ca kiểm thử tại Phase 4 (Probe Hard Gate, test Lock-First barrier, test Tombstone-Wins khi B pull dữ liệu sau khi reconcile, test kích hoạt reconciliation tự động qua entry point thực tế, và test chặn tạo file mới khi list Drive thất bại) được thực hiện và đạt kết quả mong muốn.
- [ ] **AC-6**: `npx tsc --noEmit` đạt 0 lỗi.

---

## 4. Chiến lược triển khai (4 Phases)

- **Phase 1: In-App Confirmation & Async UI Contract (EFR-01, EFR-08, EFR-11, FR-03):** *(Triển khai độc lập ngay)*
  - Xây dựng In-app confirmation trong `DocumentDetailModal.tsx` và `DocumentArchiveView.tsx` với hợp đồng Promise có trạng thái local/drive, khắc phục ngay lỗi người dùng không xóa được văn bản.
- **Phase 2: WebSocket Circuit Breaker (EFR-05):**
  - Bảo vệ mọi đường kết nối trong `realtimeService.ts` với Circuit Breaker và Exponential Backoff.
- **Phase 3: Resilient Conflict-Free Shared Tombstone Engine (EFR-06, EFR-07, EFR-10, EFR-11, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17):**
  - Thực hiện Provider Probe Gate (Hard Gate), triển khai Zero-Deletion reconciliation cho duplicate registries, chuẩn hóa Tombstone state machine và `saveDatabaseWithConflictResolution`.
- **Phase 4: Comprehensive Verification & Edge-Case Testing (EFR-09, EFR-12, EFR-13, EFR-14, EFR-15, EFR-16, EFR-17):**
  - Kiểm thử iframe sandbox, retry asset lỗi, kiểm thử probe decision gate, và kiểm thử Zero-Deletion khi ghi vào file phụ.

---

## 5. Tham chiếu thực thi

- Checklist chi tiết theo phase: [FEATURE_TASKS.md](./FEATURE_TASKS.md)
