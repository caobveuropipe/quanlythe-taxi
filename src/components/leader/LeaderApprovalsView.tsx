import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import {
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  Tag,
  Clock,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export const LeaderApprovalsView: React.FC = () => {
  const { currentUser, requests, leaderMappings, leaderApprove, leaderReject, leaderUndoReject } = useApp();

  const [selectedReq, setSelectedReq] = useState<TaxiRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Check leader mapping and bot status for current user's department
  const userMapping = leaderMappings.find((m) => m.leaderId === currentUser.id);
  const isBotInactive = userMapping ? !userMapping.botActive : false;

  // Filter requests waiting for this leader:
  // Must be in status 'pending_leader' AND belongs to Leader's managed department/id
  const pendingRequests = requests.filter(
    (r) =>
      r.status === 'pending_leader' &&
      r.leaderApprovalRequired &&
      (r.leaderId === currentUser.id || r.department === currentUser.department)
  );

  // Filter requests rejected by leader within 90 minutes
  const recentRejectedRequests = requests.filter((r) => {
    if (r.status !== 'rejected_leader') return false;
    const isOwner = (r.leaderId && r.leaderId === currentUser.id) || r.department === currentUser.department;
    if (!isOwner) return false;
    const baseTime = r.leaderDecisionAt || r.createdAt;
    const diffMs = Date.now() - new Date(baseTime).getTime();
    return diffMs <= 90 * 60 * 1000;
  });

  const getRemainingMinutes = (r: TaxiRequest) => {
    const baseTime = r.leaderDecisionAt || r.createdAt;
    const elapsedMinutes = Math.floor((Date.now() - new Date(baseTime).getTime()) / 60000);
    return Math.max(0, 90 - elapsedMinutes);
  };

  const handleApprove = (req: TaxiRequest) => {
    setActionFeedback(null);
    const res = leaderApprove(req.id);
    setActionFeedback(res);
    if (res.success) {
      setSelectedReq(null);
    }
  };

  const handleReject = (req: TaxiRequest) => {
    setActionFeedback(null);
    if (!rejectReason.trim()) {
      setActionFeedback({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu.' });
      return;
    }
    const res = leaderReject(req.id, rejectReason);
    setActionFeedback(res);
    if (res.success) {
      setSelectedReq(null);
      setRejectReason('');
      setShowRejectInput(false);
    }
  };

  const handleUndoReject = (reqId: string) => {
    setActionFeedback(null);
    const res = leaderUndoReject(reqId);
    setActionFeedback(res);
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Header and Bot Notification Preview Trigger */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Cần duyệt</span>
            <span className="font-mono text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
              {pendingRequests.length}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Duyệt cấp thẻ taxi cho nhân sự thuộc bộ phận
          </p>
        </div>
      </div>

      {/* Warning if Leader Telegram Bot is not activated */}
      {isBotInactive && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Cảnh báo ánh xạ Telegram: Leader chưa kích hoạt Bot</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            Hệ thống yêu cầu Leader khởi động bot (@TaxiCardInternalBot) để nhận thông báo real-time. Theo quy định, hệ thống không tự bỏ qua bước này. Báo cho Admin xử lý nếu cần cấu hình lại.
          </p>
        </div>
      )}

      {/* Feedback banner */}
      {actionFeedback && (
        <div
          className={`p-3 text-xs flex items-center gap-2 border ${
            actionFeedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {actionFeedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* List of Pending Requests */}
      {pendingRequests.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Hiện không có yêu cầu nào cần bạn duyệt.
          </p>
          <p className="text-[11px] text-slate-400">
            Khi có nhân viên gửi yêu cầu mượn thẻ, danh sách sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
            >
              {/* Top row: Employee Name, Code, Department */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>{req.employeeName}</span>
                    <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {req.department}
                  </div>
                </div>

                <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800">
                  {req.id}
                </span>
              </div>

              {/* Purpose & Destination */}
              <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {req.purpose}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>Điểm đến: <strong>{req.destination}</strong></span>
                </div>
                {req.clientTag && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                    <Tag className="w-3 h-3 shrink-0" />
                    <span>Nhãn khách: {req.clientTag}</span>
                  </div>
                )}
              </div>

              {/* View Detail & Actions button */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Gửi lúc: {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>

                <button
                  onClick={() => {
                    setSelectedReq(req);
                    setShowRejectInput(false);
                    setRejectReason('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                >
                  Xem & Xét duyệt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Rejected Requests (within 90 minutes) with Undo action */}
      {recentRejectedRequests.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>Đơn vừa từ chối (hiệu lực hoàn tác trong 90 phút)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                {recentRejectedRequests.length}
              </span>
            </h3>
            <span className="text-[10px] text-slate-400">Tự động khóa sau 90p</span>
          </div>

          <div className="space-y-2">
            {recentRejectedRequests.map((req) => {
              const remaining = getRemainingMinutes(req);
              return (
                <div
                  key={req.id}
                  className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{req.employeeName}</span>
                        <span className="font-mono text-[10px] text-slate-400">({req.employeeCode})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {req.department} • <span className="font-mono">{req.id}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      Còn {remaining} phút hoàn tác
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 border border-amber-100 dark:border-amber-900/30 space-y-0.5">
                    <div className="line-clamp-1">
                      <strong>Mục đích:</strong> {req.purpose}
                    </div>
                    {req.leaderApprovalComment && (
                      <div className="text-rose-600 dark:text-rose-400 line-clamp-1">
                        <strong>Lý do từ chối:</strong> {req.leaderApprovalComment}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-0.5">
                    <button
                      onClick={() => handleUndoReject(req.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>↺ Hoàn tác sang DUYỆT</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedReq.id}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Leader xét duyệt mượn thẻ
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content info */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Nhân sự đăng ký</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedReq.employeeName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {selectedReq.employeeCode}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Bộ phận</span>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedReq.department}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Mục đích</span>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                  {selectedReq.purpose}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Địa điểm gặp: <strong>{selectedReq.destination}</strong></span>
              </div>

              {selectedReq.clientTag && (
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>Nhãn khách hàng: <strong>{selectedReq.clientTag}</strong></span>
                </div>
              )}

              {/* Self-approval Rule Check: Leader CANNOT approve own request */}
              {selectedReq.employeeId === currentUser.id && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                  <strong>Quy tắc bảo mật:</strong> Bạn không được phép tự duyệt yêu cầu mượn thẻ của chính mình. Yêu cầu của bạn phải do cấp quản lý cao hơn hoặc Admin xử lý.
                </div>
              )}

              {/* Reject Reason input if toggled */}
              {showRejectInput && selectedReq.employeeId !== currentUser.id && (
                <div className="space-y-1.5 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                  <label className="text-xs font-semibold text-rose-900 dark:text-rose-200 block">
                    Lý do từ chối (bắt buộc)
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do không đồng ý duyệt cấp thẻ taxi..."
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedReq)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                    >
                      Xác nhận từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {selectedReq.employeeId !== currentUser.id && !showRejectInput && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs border border-rose-200 dark:border-rose-800 transition-colors"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedReq)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Duyệt yêu cầu</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
  );
};
