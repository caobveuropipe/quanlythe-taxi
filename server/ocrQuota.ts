import { createClient } from '@supabase/supabase-js';

export async function reserveSystemOcrCall(): Promise<{ allowed: boolean; retryAfter: number }> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('OCR_QUOTA_NOT_CONFIGURED');
  const configured = Number(process.env.OCR_SYSTEM_RPM || '10');
  const limit = Number.isSafeInteger(configured) && configured >= 1 && configured <= 60 ? configured : 10;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('reserve_system_ocr_call', { p_limit: limit });
  if (error || !data || !Array.isArray(data) || !data[0]) throw new Error('OCR_QUOTA_UNAVAILABLE');
  return { allowed: Boolean(data[0].allowed), retryAfter: Number(data[0].retry_after_seconds) || 60 };
}
