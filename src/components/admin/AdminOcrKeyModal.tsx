import React, { useEffect, useState } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  getCustomGeminiKey,
  setCustomGeminiKey,
  removeCustomGeminiKey,
  maskApiKey,
} from '../../utils/geminiKeyStorage';
import { getSystemOcrStatus, testGeminiApiKey } from '../../services/geminiOcrService';

interface AdminOcrKeyModalProps {
  onClose: () => void;
  onKeyUpdated: () => void;
}

export const AdminOcrKeyModal: React.FC<AdminOcrKeyModalProps> = ({ onClose, onKeyUpdated }) => {
  const [systemOcrConfigured, setSystemOcrConfigured] = useState<boolean | null>(null);
  useEffect(() => { getSystemOcrStatus().then(setSystemOcrConfigured); }, []);
  const currentKey = getCustomGeminiKey();
  const [inputKey, setInputKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);


  const handleTest = async () => {
    const keyToTest = inputKey.trim() || currentKey;
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key để kiểm tra.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiApiKey(keyToTest);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    if (!inputKey.trim()) return;
    setCustomGeminiKey(inputKey.trim());
    setInputKey('');
    setTestResult({ success: true, message: 'Đã lưu API Key cá nhân thành công!' });
    onKeyUpdated();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleRemove = () => {
    removeCustomGeminiKey();
    setInputKey('');
    setTestResult({ success: true, message: 'Đã gỡ Key cá nhân. Hệ thống sẽ sử dụng Key dùng chung.' });
    onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cấu hình API Key OCR Hóa đơn
              </h3>
              <p className="text-[11px] text-slate-500">Google Gemini Vision (BYOK Model)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trạng thái hiện tại */}
        <div className="p-3 rounded-lg border text-xs space-y-2 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Nguồn API đang hoạt động:</span>
            {currentKey ? (
              <span className="px-2 py-0.5 font-semibold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                🔑 Key cá nhân của bạn
              </span>
            ) : (
              <span className="px-2 py-0.5 font-semibold text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300">
                {systemOcrConfigured === false ? '⚠️ OCR hệ thống chưa cấu hình' : '⚡ Key Hệ Thống dùng chung'}
              </span>
            )}
          </div>

          {currentKey ? (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                {maskApiKey(currentKey)}
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Gỡ bỏ</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between">
              <span>Giới hạn Key hệ thống:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">Theo phút tại máy chủ</span>
            </div>
          )}
        </div>

        {/* Input nhập key cá nhân mới */}
        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>{currentKey ? 'Thay đổi sang API Key khác' : 'Thêm API Key cá nhân của bạn'}</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>Lấy key miễn phí (30s)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setTestResult(null);
            }}
            placeholder="Dán mã API Key (bắt đầu bằng AIzaSy... hoặc AQ...)"
            className="w-full text-xs font-mono p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 rounded"
          />
          <p className="text-[10px] text-slate-400">
            * Key lưu trên trình duyệt và được gửi tới máy chủ OCR khi quét; máy chủ dùng key để gọi Gemini.
          </p>
        </div>

        {/* Kết quả test */}
        {testResult && (
          <div
            className={`p-2.5 text-xs border rounded flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <span className="leading-tight">{testResult.message}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            disabled={isTesting || (!inputKey.trim() && !currentKey)}
            onClick={handleTest}
            className="flex-1 py-2 px-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-colors disabled:opacity-50"
          >
            {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra Key'}
          </button>
          <button
            type="button"
            disabled={!inputKey.trim()}
            onClick={handleSave}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lưu Key cá nhân
          </button>
        </div>
      </div>
    </div>
  );
};
