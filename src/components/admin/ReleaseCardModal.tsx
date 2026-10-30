import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import { X, AlertTriangle, Shield } from 'lucide-react';

interface ReleaseCardModalProps {
  request: TaxiRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReleaseCardModal: React.FC<ReleaseCardModalProps> = ({
  request,
  onClose,
  onSuccess,
}) => {
  const { currentUser, releaseReservedCard } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do giải phóng thẻ đã giữ.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await releaseReservedCard(request.id, reason, currentUser.name);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi giải phóng thẻ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Giải phóng thẻ đã giữ
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <p>
            Yêu cầu <strong>{request.id}</strong> của nhân sự <strong>{request.employeeName}</strong> đang giữ thẻ dự kiến <strong>{request.reservedCardCode}</strong>.
          </p>
          <p className="text-[11px] text-slate-500 italic">
            Quy tắc: Hệ thống không tự động giải phóng theo đồng hồ. Người vận hành bắt buộc ghi rõ lý do (ví dụ: nhân sự hoãn cuộc hẹn, không đến nhận thẻ).
          </p>
        </div>

        {error && (
          <div className="p-2 bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRelease} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Lý do giải phóng thẻ (bắt buộc)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do thu hồi quyền giữ thẻ (ví dụ: Khách hủy hẹn, nhân sự đi xe riêng...)"
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100"
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
              disabled={loading}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Đang xử lý...' : 'Xác nhận giải phóng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
