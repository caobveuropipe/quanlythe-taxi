/**
 * Quản lý Key cá nhân & Hạn ngạch (Quota) OCR cho Admin
 * - Bảo mật: Lưu trữ cục bộ trên thiết bị của Admin, che mờ khi hiển thị
 * - Giới hạn an toàn: 20 lượt quét/ngày đối với System Key để tránh vượt ngưỡng Free tier
 */

const STORAGE_KEY_CUSTOM_KEY = 'taxi_admin_custom_gemini_key';
const STORAGE_PREFIX_USAGE = 'taxi_ocr_usage_';

export const MAX_DAILY_SYSTEM_OCR_LIMIT = 20;

/**
 * Lấy Custom API Key cá nhân của Admin từ localStorage
 */
export function getCustomGeminiKey(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_KEY);
    return raw ? raw.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Lưu Custom API Key cá nhân
 */
export function setCustomGeminiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_KEY, key.trim());
  } catch (err) {
    console.error('Không thể lưu Custom Gemini Key:', err);
  }
}

/**
 * Xóa Custom API Key cá nhân (quay về dùng Key hệ thống)
 */
export function removeCustomGeminiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_KEY);
  } catch (err) {
    console.error('Không thể xóa Custom Gemini Key:', err);
  }
}

/**
 * Che mờ API Key để hiển thị an toàn trên UI
 * Ví dụ: AQ.Ab8RN6...5apQ
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '********';
  const start = key.substring(0, 8);
  const end = key.substring(key.length - 4);
  return `${start}••••••••${end}`;
}

/**
 * Lấy ngày hôm nay dạng YYYY-MM-DD
 */
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Lấy số lượt quét hóa đơn bằng System Key của Admin trong ngày hôm nay
 */
export function getDailySystemUsageCount(): number {
  try {
    const key = `${STORAGE_PREFIX_USAGE}${getTodayString()}`;
    const count = localStorage.getItem(key);
    return count ? parseInt(count, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Ghi nhận thêm 1 lượt quét bằng System Key
 */
export function recordSystemKeyUsage(): number {
  try {
    const key = `${STORAGE_PREFIX_USAGE}${getTodayString()}`;
    const current = getDailySystemUsageCount();
    const updated = current + 1;
    localStorage.setItem(key, String(updated));
    return updated;
  } catch {
    return 1;
  }
}

/**
 * Kiểm tra xem người dùng có được phép dùng System Key không
 */
export function canUseSystemKey(): boolean {
  return getDailySystemUsageCount() < MAX_DAILY_SYSTEM_OCR_LIMIT;
}
