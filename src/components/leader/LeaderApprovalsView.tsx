import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import {
  Check,
  X,
  AlertCircle,
  MessageSquare,
  User,
  MapPin,
  FileText,
  Tag,
  Clock,
  ShieldAlert,
  Send,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export const LeaderApprovalsView: React.FC = () => {
  const { currentUser, requests, leaderMappings, leaderApprove, leaderReject, leaderUndoReject } = useApp();

  const [selectedReq, setSelectedReq] = useState<TaxiRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showBotMessageDrawer, setShowBotMessageDrawer] = useState(false);
  const [botSimAction, setBotSimAction] = useState<'pending' | 'approved' | 'rejected' | 'undo_waitlist'>('pending');

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

        <button
          onClick={() => setShowBotMessageDrawer(true)}
          className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-1 hover:bg-blue-100 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Mẫu tin Telegram Bot</span>
        </button>
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

      {/* Drawer: Mẫu tin nhắn Telegram Bot thông báo đến Telegram ID của Leader */}
      {showBotMessageDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Mẫu tin Telegram Bot gửi Leader
                  </h3>
                  <div className="text-[10px] text-slate-500 font-mono">
                    To: {userMapping?.leaderTelegramUsername || currentUser.telegramUsername} (ID: {userMapping?.leaderTelegramId || currentUser.telegramId})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBotMessageDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telegram simulated message bubble */}
            <div className="p-3 bg-[#eef2f5] dark:bg-slate-800 rounded-lg text-xs space-y-2 border border-slate-200 dark:border-slate-700 font-sans">
              <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold border-b border-slate-200/80 dark:border-slate-700 pb-1">
                <span className="flex items-center gap-1">
                  <span>🚕</span> TAXICARD NOTIFICATION BOT
                </span>
                <span className="font-mono text-slate-400 text-[10px]">Hôm nay, 11:45</span>
              </div>

              {botSimAction === 'pending' && (
                <>
                  <div className="space-y-1 text-slate-800 dark:text-slate-100">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      🔔 Yêu cầu mượn thẻ taxi mới cần Leader duyệt:
                    </p>
                    <p>• <strong>Mã yêu cầu:</strong> REQ-2026-101</p>
                    <p>• <strong>Nhân sự:</strong> Nguyễn Văn A (NV-1024 - Kinh Doanh)</p>
                    <p>• <strong>Mục đích:</strong> Họp xúc tiến mở rộng thị trường tại Sở Kế hoạch Đầu tư</p>
                    <p>• <strong>Điểm đến:</strong> Sở Kế hoạch & Đầu tư, Hoàng Hoa Thám</p>
                    <p>• <strong>Khách:</strong> Cơ quan nhà nước</p>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Duyệt ngay trên màn hình chat Telegram (không cần mở Mini App):
                    </div>
                    {/* Inline keyboard buttons directly in Telegram */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBotSimAction('approved')}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-center font-bold text-[11px] rounded shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotSimAction('rejected')}
                        className="py-2 px-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-center font-bold text-[11px] rounded shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>

                    {/* Secondary button: Open Mini App only if extra notes/details needed */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowBotMessageDrawer(false);
                        const sample = requests.find((r) => r.status === 'pending_leader') || requests[0];
                        if (sample) setSelectedReq(sample);
                      }}
                      className="w-full py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-center font-medium text-[11px] rounded border border-slate-300 dark:border-slate-600 shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                      <span>Mở app (khi cần ghi chú thêm / xem chi tiết)</span>
                    </button>
                  </div>
                </>
              )}

              {botSimAction === 'approved' && (
                <div className="space-y-2 py-1 animate-in fade-in">
                  <div className="space-y-1 text-slate-800 dark:text-slate-200">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ĐÃ DUYỆT TRỰC TIẾP TRÊN MÀN HÌNH TELEGRAM</span>
                    </p>
                    <p>• <strong>Mã yêu cầu:</strong> REQ-2026-101</p>
                    <p>• <strong>Người duyệt:</strong> {currentUser.name} (Leader)</p>
                    <p>• <strong>Thời gian:</strong> Vừa xong (11:46) — <em>Hiệu lực hoàn tác: còn 89 phút</em></p>
                    <p>• <strong>Trạng thái:</strong> Đã khóa giữ thẻ TAXI-01 và chuyển Hành chính bàn giao.</p>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] text-emerald-800 dark:text-emerald-300">
                    💡 <em>Nếu HR chưa bàn giao thẻ vật lý, Leader có thể bấm Hoàn tác trong vòng 1 tiếng rưỡi (90 phút) để hủy duyệt. Thẻ đã giữ sẽ được giải phóng lại về kho ngay.</em>
                  </div>

                  {/* Undo Button in Telegram */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setBotSimAction('rejected')}
                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-center font-bold text-[11px] rounded shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>↺ Hoàn tác (Đổi ý sang TỪ CHỐI)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBotSimAction('pending')}
                    className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    ↺ Đặt lại mẫu tin gốc
                  </button>
                </div>
              )}

              {botSimAction === 'rejected' && (
                <div className="space-y-2 py-1 animate-in fade-in">
                  <div className="space-y-1 text-slate-800 dark:text-slate-200">
                    <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      <span>ĐÃ TỪ CHỐI TRỰC TIẾP TRÊN TELEGRAM</span>
                    </p>
                    <p>• <strong>Mã yêu cầu:</strong> REQ-2026-101</p>
                    <p>• <strong>Người từ chối:</strong> {currentUser.name} (Leader)</p>
                    <p>• <strong>Thời gian:</strong> Vừa xong (11:46) — <em>Hiệu lực hoàn tác: còn 89 phút</em></p>
                    <p>• <strong>Trạng thái:</strong> Đã thông báo từ chối về tài khoản của nhân sự.</p>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-[11px] text-rose-800 dark:text-rose-300">
                    💡 <em>Nếu nhân sự giải trình hợp lý trong vòng 90 phút, Leader có thể bấm Hoàn tác để DUYỆT LẠI. Hệ thống sẽ tự kiểm tra kho thẻ.</em>
                  </div>

                  {/* 2 Scenarios when undoing to Approve */}
                  <div className="pt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => setBotSimAction('approved')}
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-center font-bold text-[11px] rounded shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>↺ Hoàn tác sang DUYỆT (Trường hợp kho còn thẻ trống)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBotSimAction('undo_waitlist')}
                      className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-center font-bold text-[11px] rounded shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>↺ Hoàn tác sang DUYỆT (Trường hợp kho đã HẾT THẺ)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBotSimAction('pending')}
                    className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    ↺ Đặt lại mẫu tin gốc
                  </button>
                </div>
              )}

              {botSimAction === 'undo_waitlist' && (
                <div className="space-y-2 py-1 animate-in fade-in">
                  <div className="space-y-1 text-slate-800 dark:text-slate-200">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>ĐÃ ĐỔI SANG DUYỆT — KHO TẠM HẾT THẺ SẴN SÀNG</span>
                    </p>
                    <p>• <strong>Mã yêu cầu:</strong> REQ-2026-101</p>
                    <p>• <strong>Xử lý kho thẻ:</strong> Khi Leader đổi ý duyệt lại thì tất cả thẻ đã được cấp cho người khác (kho = 0 thẻ available).</p>
                    <p>• <strong>Giải pháp hệ thống:</strong> Tự động xếp đơn vào <strong>Danh sách chờ (Waitlist)</strong>.</p>
                    <p>• <strong>Thông báo:</strong> Bot thông báo cho User: <em>"Leader đã duyệt lại, đơn đang chờ thẻ về kho sẽ được HR ưu tiên cấp bù."</em></p>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-300">
                    💡 <em>Nhờ cơ chế này, hệ thống không bị lỗi thiếu thẻ, không cấp trùng thẻ, và HR toàn quyền cấp bù khi có thẻ trả về!</em>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBotSimAction('pending')}
                    className="w-full py-1 text-center text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    ↺ Đặt lại mẫu tin gốc
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div>
                <strong>Cơ chế duyệt 1 chạm trên Telegram:</strong>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                <li>
                  <strong>Nút [Duyệt] & [Từ chối]:</strong> Sử dụng Telegram Inline Keyboard (callback_data). Leader bấm 1 chạm ngay trên màn hình chat Telegram, bot gửi webhook xử lý tức thì (&lt; 0.5s) và tự động cập nhật nội dung tin nhắn, <strong>không cần mở Mini App</strong>.
                </li>
                <li>
                  <strong>Nút [Mở app]:</strong> Tùy chọn phụ, chỉ cần khi Leader muốn nhập ghi chú phản hồi, xem lộ trình chi tiết hoặc kiểm tra lịch sử của nhân sự.
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setShowBotMessageDrawer(false);
                setBotSimAction('pending');
              }}
              className="w-full py-2 bg-slate-900 dark:bg-slate-800 text-white font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Đóng mẫu tin
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
