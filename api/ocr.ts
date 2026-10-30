import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { verifyTelegramInitData } from '../server/ocrAuth.js';
import { reserveSystemOcrCall } from '../server/ocrQuota.js';

// Cache đơn giản theo hash ảnh trong bộ nhớ serverless (tối đa 100 ảnh gần nhất)
interface CachedResult {
  data: any;
  timestamp: number;
}
const ocrCache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

// Băm chuỗi đơn giản để làm cache key
function receiptCacheKey(image: string, key: string): string {
  return createHash('sha256').update(key).update(':').update(image).digest('hex');
}

export default async function handler(req: any, res: any) {
  // Thiết lập CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-custom-gemini-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({ configured: Boolean(process.env.GEMINI_API_KEY && process.env.TELEGRAM_BOT_TOKEN && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid JSON body' });
      }
    }

    const { imageBase64, mimeType = 'image/jpeg', customApiKey, telegramInitData } = body || {};

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramId = botToken ? verifyTelegramInitData(telegramInitData, botToken) : null;
    if (!telegramId) {
      return res.status(401).json({ success: false, message: 'Vui lòng mở Mini App từ Telegram để quét hóa đơn.' });
    }
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(503).json({ success: false, message: 'Máy chủ OCR chưa được cấu hình quyền truy cập dữ liệu.' });
    }
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: operators, error: operatorError } = await db.from('users').select('role').eq('telegram_id', telegramId).limit(1);
    if (operatorError) {
      return res.status(503).json({ success: false, message: 'Không thể xác thực quyền quét OCR lúc này.' });
    }
    if (!['admin', 'admin_hr', 'hr'].includes(operators?.[0]?.role)) {
      return res.status(403).json({ success: false, message: 'Tài khoản Telegram chưa có quyền quét hóa đơn.' });
    }

    if (typeof imageBase64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(imageBase64) || imageBase64.length > 5_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ success: false, message: 'Ảnh OCR không hợp lệ hoặc quá lớn.' });
    }

    // Xác định Key sử dụng: Ưu tiên Custom Key của Admin, nếu không thì dùng System Key
    const isCustomKey = typeof customApiKey === 'string' && customApiKey.trim().length > 10;
    const activeApiKey = isCustomKey
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!activeApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Hệ thống chưa được cấu hình GEMINI_API_KEY. Vui lòng liên hệ Admin hoặc gắn Key cá nhân.',
      });
    }

    // Kiểm tra Cache trước
    const cacheKey = receiptCacheKey(imageBase64, activeApiKey);
    const cached = ocrCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.status(200).json({
        success: true,
        data: cached.data,
        source: isCustomKey ? 'custom' : 'system',
        cached: true,
      });
    }

    // Chuẩn bị payload gọi Google Generative Language API
    // Prompt chuyên biệt bóc tách hóa đơn taxi Việt Nam
    const promptText = `Bạn là chuyên gia OCR bóc tách hóa đơn taxi và cuống vé cước vận tải tại Việt Nam (Mai Linh, G7, Vinasun, Grab, Be, Taxi Group, Sao Mai, Thăng Long, v.v.).
Hãy đọc kỹ ảnh hóa đơn/cuống vé taxi được cung cấp và trích xuất dữ liệu.

BẮT BUỘC trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown \`\`\`json, không giải thích gì thêm):
{
  "actualCost": <số nguyên VNĐ cước thanh toán thực tế cuối cùng, ví dụ 245000, bỏ qua tiền tip nếu có; nếu không đọc được ghi null>,
  "pickupPoint": <chuỗi địa chỉ điểm đón/lên xe nếu có trên bill, nếu không có ghi null>,
  "dropoffPoint": <chuỗi địa chỉ điểm trả/xuống xe nếu có trên bill, nếu không có ghi null>,
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
                mimeType: mimeType,
                data: imageBase64,
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

    // Một model cố định giúp giới hạn lượt gọi theo đúng quota của project.
    const candidateModels = [process.env.OCR_GEMINI_MODEL || 'gemini-2.5-flash-lite'];
    let lastError: any = null;
    let rawText = '';

    for (const model of candidateModels) {
      if (!isCustomKey) {
        try {
          const quota = await reserveSystemOcrCall();
          if (!quota.allowed) {
            res.setHeader('Retry-After', String(quota.retryAfter));
            return res.status(429).json({ success: false, code: 'RATE_LIMIT_EXCEEDED', message: `Key hệ thống đang đạt giới hạn lượt gọi. Vui lòng thử lại sau ${quota.retryAfter} giây.` });
          }
        } catch {
          return res.status(503).json({ success: false, message: 'Bộ giới hạn OCR chưa sẵn sàng. Vui lòng thử lại sau.' });
        }
      }
      const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeApiKey}`;
      try {
        const response = await fetch(googleApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (response.status === 429) {
          return res.status(429).json({
            success: false,
            code: 'GOOGLE_QUOTA_EXCEEDED',
            message: 'Gemini đang đạt hạn mức của project. Vui lòng thử lại sau hoặc dùng Key riêng.',
          });
        }

        if (result.error) {
          lastError = result.error;
          console.warn(`Lỗi model ${model}:`, result.error.message);
          continue;
        }

        rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Fetch error with model ${model}:`, err.message);
      }
    }

    if (!rawText) {
      return res.status(500).json({
        success: false,
        message:
          lastError?.message ||
          'Không thể nhận diện hóa đơn. Ảnh có thể bị mờ hoặc dịch vụ AI đang bận. Bạn có thể nhập tay số tiền.',
      });
    }

    // Bóc tách JSON từ rawText
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleaned);
    } catch {
      // Fallback regex bóc tách số tiền nếu JSON bị lỗi cú pháp nhẹ
      const costMatch = cleaned.match(/"actualCost"\s*:\s*(\d+)/i) || cleaned.match(/(\d{2,3}[.,]\d{3})/);
      const cost = costMatch ? parseInt(costMatch[1].replace(/\D/g, ''), 10) : null;
      parsedData = {
        actualCost: cost,
        pickupPoint: null,
        dropoffPoint: null,
        receiptNumber: null,
      };
    }

    // Đảm bảo actualCost là số nguyên dương hợp lệ
    if (parsedData.actualCost && typeof parsedData.actualCost === 'string') {
      parsedData.actualCost = parseInt(parsedData.actualCost.replace(/\D/g, ''), 10) || null;
    }

    // Lưu vào cache
    if (ocrCache.size > 150) {
      const firstKey = ocrCache.keys().next().value;
      if (firstKey) ocrCache.delete(firstKey);
    }
    ocrCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });

    return res.status(200).json({
      success: true,
      data: parsedData,
      source: isCustomKey ? 'custom' : 'system',
      cached: false,
    });
  } catch (error: any) {
    console.error('OCR Handler Unhandled Error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Có lỗi xảy ra khi xử lý hóa đơn AI',
    });
  }
}
