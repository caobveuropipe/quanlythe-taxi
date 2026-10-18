import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import { X, Send, UserCheck, HelpCircle } from 'lucide-react';

interface YieldCardModalProps {
  request: TaxiRequest;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const YieldCardModal: React.FC<YieldCardModalProps> = ({
  request,
  onClose,
  onSuccess,
}) => {
  const { currentUser, requestYieldCard } = useApp();
  const [reason, setReason] = useState('Đang có trường hợp công tác khẩn cấp cần thẻ gấp');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do xin nhường thẻ để gửi tới nhân sự.');
      return;
    }

    const res = requestYieldCard(request.id, reason, currentUser.name);
    if (res.success) {
      onSuccess(res.message);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Xin nhường thẻ qua Telegram
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <p>
            Gửi yêu cầu tới nhân sự <strong>{request.employeeName}</strong> ({request.employeeCode}) đang giữ thẻ dự kiến <strong>{request.reservedCardCode || 'TAXI-01'}</strong>.
          </p>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Quy trình xác nhận 1 chạm:</span>
            </div>
            <p>
              Bot Telegram sẽ gửi tin nhắn riêng cho nhân sự kèm 2 nút Inline Keyboard:
            </p>
            <div className="flex gap-2 pt-1 font-mono font-semibold text-[10px]">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300">[ ✅ Đồng ý nhường ]</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-800 border border-slate-300">[ ❌ Không nhường ]</span>
            </div>
            <p className="pt-0.5 text-slate-500 italic">
              Nếu nhân sự bấm "Đồng ý", thẻ sẽ tự động giải phóng về kho ngay. Nếu "Không nhường", thẻ giữ nguyên.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Lý do xin nhường thẻ (sẽ hiển thị trên tin nhắn Telegram của User)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Có đoàn khách VIP phát sinh đột xuất, Ban Lãnh đạo cần xe đi gấp..."
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi tin nhắn Telegram</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
