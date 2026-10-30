const STORAGE_KEY_CUSTOM_KEY = 'taxi_admin_custom_gemini_key';

export function getCustomGeminiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function setCustomGeminiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_CUSTOM_KEY, key.trim());
}

export function removeCustomGeminiKey(): void {
  localStorage.removeItem(STORAGE_KEY_CUSTOM_KEY);
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '********';
  return `${key.substring(0, 8)}••••••••${key.substring(key.length - 4)}`;
}
