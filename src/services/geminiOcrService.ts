import { compressReceiptImage } from '../utils/imageCompressor';
import { getCustomGeminiKey } from '../utils/geminiKeyStorage';

export interface OcrResult {
  actualCost: number | null;
  pickupPoint: string | null;
  dropoffPoint: string | null;
  receiptNumber: string | null;
  tripDate?: string | null;
  taxiBrand?: string | null;
  confidence?: number;
  source: 'custom' | 'system';
  cached?: boolean;
}

export interface OcrScanResponse {
  success: boolean;
  data?: OcrResult;
  message?: string;
}

export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { success: false, message: 'Độ dài API Key không hợp lệ.' };
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, message: data.error?.message || 'API Key không hợp lệ hoặc đã bị vô hiệu hóa.' };
    }
    return { success: true, message: 'API Key hoạt động tốt và sẵn sàng sử dụng!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Không thể kết nối đến máy chủ Google.' };
  }
}

export async function getSystemOcrStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/ocr');
    if (!res.ok) return false;
    const data = await res.json();
    return data.configured === true;
  } catch {
    return false;
  }
}

export async function scanTaxiReceipt(fileOrBase64: File | string): Promise<OcrScanResponse> {
  const telegramInitData = (window as any).Telegram?.WebApp?.initData;
  if (!telegramInitData) {
    return { success: false, message: 'Vui lòng mở Mini App từ Telegram để quét hóa đơn.' };
  }
  try {
    const { base64Data, mimeType } = await compressReceiptImage(fileOrBase64);
    const customKey = getCustomGeminiKey();
    const apiRes = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Data, mimeType, customApiKey: customKey || undefined, telegramInitData }),
    });
    const result = await apiRes.json();
    if (!apiRes.ok || !result.success) {
      return { success: false, message: result.message || 'Không thể quét hóa đơn lúc này.' };
    }
    return {
      success: true,
      data: {
        actualCost: result.data?.actualCost ?? null,
        pickupPoint: result.data?.pickupPoint ?? null,
        dropoffPoint: result.data?.dropoffPoint ?? null,
        receiptNumber: result.data?.receiptNumber ?? null,
        tripDate: result.data?.tripDate ?? null,
        taxiBrand: result.data?.taxiBrand ?? null,
        confidence: result.data?.confidence,
        source: result.source || (customKey ? 'custom' : 'system'),
        cached: result.cached,
      },
    };
  } catch (error: any) {
    console.error('scanTaxiReceipt error:', error);
    return { success: false, message: error?.message || 'Không thể kết nối máy chủ OCR.' };
  }
}
