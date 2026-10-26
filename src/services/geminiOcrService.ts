import { compressReceiptImage } from '../utils/imageCompressor';
import {
  getCustomGeminiKey,
  canUseSystemKey,
  recordSystemKeyUsage,
  getDailySystemUsageCount,
  MAX_DAILY_SYSTEM_OCR_LIMIT,
} from '../utils/geminiKeyStorage';

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

/**
 * Kiểm tra tính hợp lệ của Gemini API Key
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { success: false, message: 'Độ dài API Key không hợp lệ.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { success: false, message: data.error.message || 'API Key không hợp lệ hoặc đã bị vô hiệu hóa.' };
    }

    return { success: true, message: 'API Key hoạt động tốt và sẵn sàng sử dụng!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Không thể kết nối đến máy chủ Google.' };
  }
}

/**
 * Quét hóa đơn taxi bằng Gemini Vision OCR
 * Tự động chuyển đổi giữa Custom Key của Admin và System Key của hệ thống
 */
export async function scanTaxiReceipt(
  fileOrBase64: File | string,
  employeeCode?: string
): Promise<OcrScanResponse> {
  const customKey = getCustomGeminiKey();
  const isUsingCustomKey = Boolean(customKey && customKey.trim().length > 10);

  // Nếu không có custom key, kiểm tra hạn ngạch System Key của Admin trong ngày
  if (!isUsingCustomKey) {
    if (!canUseSystemKey()) {
      return {
        success: false,
        message: `Bạn đã sử dụng hết định mức ${MAX_DAILY_SYSTEM_OCR_LIMIT} lượt quét hệ thống hôm nay. Vui lòng cài đặt API Key cá nhân để tiếp tục hoặc nhập tay số tiền.`,
      };
    }
  }

  try {
    // 1. Nén ảnh trước khi gửi
    const { base64Data, mimeType } = await compressReceiptImage(fileOrBase64);

    // 2. Thử gọi API Backend /api/ocr (cho môi trường Vercel / Production)
    let isServerlessHandled = false;
    let serverlessResult: any = null;

    try {
      const apiRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          customApiKey: customKey || undefined,
          employeeCode,
        }),
      });

      // Nếu endpoint tồn tại (không bị 404 rewrite)
      if (apiRes.status !== 404) {
        isServerlessHandled = true;
        serverlessResult = await apiRes.json();
      }
    } catch {
      // Bỏ qua lỗi kết nối /api/ocr để thử fallback trực tiếp
      isServerlessHandled = false;
    }

    // Nếu Backend xử lý thành công
    if (isServerlessHandled && serverlessResult) {
      if (!serverlessResult.success) {
        return {
          success: false,
          message: serverlessResult.message || 'Không thể nhận diện hóa đơn',
        };
      }

      if (!isUsingCustomKey && !serverlessResult.cached) {
        recordSystemKeyUsage();
      }

      return {
        success: true,
        data: {
          actualCost: serverlessResult.data?.actualCost ?? null,
          pickupPoint: serverlessResult.data?.pickupPoint ?? null,
          dropoffPoint: serverlessResult.data?.dropoffPoint ?? null,
          receiptNumber: serverlessResult.data?.receiptNumber ?? null,
          tripDate: serverlessResult.data?.tripDate ?? null,
          taxiBrand: serverlessResult.data?.taxiBrand ?? null,
          confidence: serverlessResult.data?.confidence,
          source: serverlessResult.source || (isUsingCustomKey ? 'custom' : 'system'),
          cached: serverlessResult.cached,
        },
      };
    }

    // 3. Fallback trực tiếp Client-side (Khi chạy local dev Vite hoặc khi không có serverless route)
    const clientApiKey = isUsingCustomKey
      ? customKey!
      : import.meta.env.VITE_GEMINI_API_KEY || (window as any).__GEMINI_API_KEY__;

    if (!clientApiKey) {
      return {
        success: false,
        message: 'Hệ thống chưa tìm thấy API Key. Vui lòng bấm vào biểu tượng cài đặt để nhập Key cá nhân của bạn.',
      };
    }

    const fallbackResult = await directGoogleGeminiOcr(base64Data, mimeType, clientApiKey);

    if (fallbackResult.success && fallbackResult.data) {
      if (!isUsingCustomKey) {
        recordSystemKeyUsage();
      }
      return {
        success: true,
        data: {
          actualCost: fallbackResult.data.actualCost ?? null,
          pickupPoint: fallbackResult.data.pickupPoint ?? null,
          dropoffPoint: fallbackResult.data.dropoffPoint ?? null,
          receiptNumber: fallbackResult.data.receiptNumber ?? null,
          tripDate: fallbackResult.data.tripDate ?? null,
          taxiBrand: fallbackResult.data.taxiBrand ?? null,
          confidence: fallbackResult.data.confidence,
          source: isUsingCustomKey ? 'custom' : 'system',
        },
      };
    }

    return fallbackResult;
  } catch (error: any) {
    console.error('scanTaxiReceipt error:', error);
    return {
      success: false,
      message: error?.message || 'Có lỗi xảy ra khi quét hóa đơn',
    };
  }
}

/**
 * Gọi trực tiếp Google Gemini API từ Client (Fallback)
 */
async function directGoogleGeminiOcr(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<OcrScanResponse> {
  const promptText = `Bạn là chuyên gia OCR bóc tách hóa đơn taxi và cuống vé cước vận tải tại Việt Nam (Mai Linh, G7, Vinasun, Grab, Be, Taxi Group, Sao Mai, Thăng Long, v.v.).
Hãy đọc kỹ ảnh hóa đơn/cuống vé taxi được cung cấp và trích xuất dữ liệu.

BẮT BUỘC trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown \`\`\`json, không giải thích gì thêm):
{
  "actualCost": <số nguyên VNĐ cước thanh toán thực tế cuối cùng, ví dụ 245000; nếu không đọc được ghi null>,
  "pickupPoint": <chuỗi địa chỉ điểm đón nếu có trên bill, nếu không ghi null>,
  "dropoffPoint": <chuỗi địa chỉ điểm trả nếu có trên bill, nếu không ghi null>,
  "receiptNumber": <chuỗi số hóa đơn, số vé hoặc số seri cuống vé ví dụ "ML-094821", nếu không có ghi null>,
  "tripDate": <chuỗi ngày đi định dạng DD/MM/YYYY nếu có, nếu không ghi null>,
  "taxiBrand": <tên hãng taxi nếu nhận diện được ví dụ "Mai Linh", "G7", "Vinasun", nếu không ghi null>,
  "confidence": <độ tin cậy từ 0.0 đến 1.0>
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  };

  const candidateModels = ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 429) {
        return {
          success: false,
          message: 'Hạn mức miễn phí của Google đang tạm đạt ngưỡng (15 lượt/phút). Vui lòng đợi 30 giây hoặc nhập tay.',
        };
      }

      const data = await res.json();
      if (data.error) {
        console.warn(`Fallback error with ${model}:`, data.error.message);
        continue;
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText) continue;

      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let parsed = JSON.parse(cleaned);
      if (parsed.actualCost && typeof parsed.actualCost === 'string') {
        parsed.actualCost = parseInt(parsed.actualCost.replace(/\D/g, ''), 10) || null;
      }

      return {
        success: true,
        data: parsed,
      };
    } catch (err: any) {
      console.warn(`Model ${model} direct fetch error:`, err.message);
    }
  }

  return {
    success: false,
    message: 'Không thể nhận diện ảnh hóa đơn. Vui lòng kiểm tra lại ảnh hoặc nhập tay số tiền.',
  };
}
