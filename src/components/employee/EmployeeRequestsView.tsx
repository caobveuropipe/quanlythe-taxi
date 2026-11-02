import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import {
  CreditCard,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Send,
  Check,
  Search,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { formatVietnameseDateTime, getRelativeTimeNotice } from '../../utils/dateUtils';

export const EmployeeRequestsView: React.FC = () => {
  const { currentUser, requests, cancelRequest, respondYieldCard } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<TaxiRequest | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Filter requests for the current employee
  const myRequests = requests
    .filter((r) => r.employeeId === currentUser.id)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.purpose.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.actualCardCode && r.actualCardCode.toLowerCase().includes(q))
      );
    });

  // Check if currently holding any card
  const holdingRequest = myRequests.find((r) => r.status === 'holding_card');

  // Minimal Status Badge metadata
  const getBadge = (status: TaxiRequest['status']) => {
    switch (status) {
      case 'pending_leader':
        return { text: 'Chờ Leader duyệt', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' };
      case 'pending_admin':
        return { text: 'Chờ Admin cấp thẻ', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300' };
      case 'waitlist_cards':
        return { text: 'Chờ kho thẻ', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' };
      case 'pending_handover':
        return { text: 'Đến nhận thẻ', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 ring-1 ring-indigo-500/50' };
      case 'holding_card':
        return { text: 'Đang giữ thẻ', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold' };
      case 'returned_pending_bill':
        return { text: 'Bổ sung bill', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300' };
      case 'overbudget_pending_hr':
        return { text: 'Vượt mức', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300' };
      case 'completed':
        return { text: 'Hoàn tất', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
      case 'rejected_leader':
      case 'rejected_admin':
        return { text: 'Từ chối', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' };
      case 'cancelled':
      case 'card_released':
        return { text: 'Đã hủy', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
      default:
        return { text: 'Đang xử lý', color: 'bg-slate-100 text-slate-600' };
    }
  };

  const handleCancel = async (reqId: string) => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await cancelRequest(reqId, 'Nhân viên hủy đơn');
      if (res.success) {
        setFeedback('Đã hủy đơn thành công');
        setShowCancelConfirm(false);
        setSelectedRequest(null);
      } else {
        setFeedback(res.message);
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Lỗi khi hủy đơn');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-4 space-y-3 max-w-md mx-auto">
      {/* 1. Hero Card if user is holding a physical taxi card */}
      {holdingRequest && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-100 uppercase tracking-wider block font-semibold">
                  Thẻ taxi đang giữ
                </span>
                <span className="font-mono text-base font-bold">
                  {holdingRequest.actualCardCode || 'TAXI-CARD'}
                </span>
              </div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-medium">
              Đang hoạt động
            </span>
          </div>

          <div className="text-xs text-emerald-50 truncate pt-1 border-t border-white/15">
            Điểm đến: <strong>{holdingRequest.destination}</strong>
          </div>

          <div className="text-[10px] text-emerald-100/90 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vui lòng trả thẻ & gửi bill tại bàn Admin sau chuyến đi</span>
          </div>
        </div>
      )}

      {/* 2. Top bar: Search & Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chuyến đi..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-[11px] font-semibold text-slate-400 shrink-0 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {myRequests.length} đơn
        </span>
      </div>

      {/* Feedback banner if any */}
      {feedback && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Minimalist Requests List */}
      {myRequests.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <CreditCard className="w-8 h-8 mx-auto opacity-30" />
          <p className="text-xs">Chưa có chuyến đi nào.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myRequests.map((req) => {
            const badge = getBadge(req.status);
            return (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-2xs cursor-pointer active:scale-[0.99] space-y-2"
              >
                {/* Header row: Purpose + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex-1">
                    {req.purpose}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>

                {/* Sub row: Destination & Actual Card if assigned */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{req.destination}</span>
                  </div>

                  {req.actualCardCode ? (
                    <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {req.actualCardCode}
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>

                {/* Trip Departure Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatVietnameseDateTime(req.estimatedStartTime || req.createdAt)}
                  </span>
                  {getRelativeTimeNotice(req.estimatedStartTime || req.createdAt) && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold">
                      {getRelativeTimeNotice(req.estimatedStartTime || req.createdAt)}
                    </span>
                  )}
                </div>

                {/* Yield Card Inline Notice (if requested by Admin) */}
                {req.yieldStatus === 'pending_user_confirm' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5"
                  >
                    <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                      Admin xin nhường thẻ cho ca gấp khác. Bạn có đồng ý?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondYieldCard(req.id, true)}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                      >
                        Đồng ý
                      </button>
                      <button
                        onClick={() => respondYieldCard(req.id, false)}
                        className="flex-1 py-1 px-2 rounded-lg bg-slate-600 text-white text-[10px] font-bold"
                      >
                        Không nhường
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Minimal Modal Detail (Bottom Sheet Style) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-[10px] text-slate-400 block">
                  {selectedRequest.id}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedRequest.purpose}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="space-y-2 text-xs">
              {/* Trip Time Card */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-1">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Ngày giờ dự kiến đi
                </span>
                <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{formatVietnameseDateTime(selectedRequest.estimatedStartTime || selectedRequest.createdAt)}</span>
                  {getRelativeTimeNotice(selectedRequest.estimatedStartTime || selectedRequest.createdAt) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                      {getRelativeTimeNotice(selectedRequest.estimatedStartTime || selectedRequest.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Điểm đến</span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedRequest.destination}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Trạng thái</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {getBadge(selectedRequest.status).text}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Thẻ vật lý</span>
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {selectedRequest.actualCardCode || 'Chưa cấp'}
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'pending_leader' && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Đang ở khâu: Admin yêu cầu Leader duyệt</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Admin đã tiếp nhận và chuyển tiếp đơn tới Leader <strong>{selectedRequest.leaderName || 'Trần Thị Bích'}</strong> để xin ý kiến phê duyệt trước khi xuất thẻ.
                  </p>
                </div>
              )}

              {selectedRequest.status === 'pending_admin' && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-[11px] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {selectedRequest.leaderApprovalStatus === 'approved'
                        ? 'Leader đã duyệt · Đang chờ Admin cấp thẻ'
                        : 'Đang ở khâu: Chờ Admin tiếp nhận & cấp thẻ'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {selectedRequest.leaderApprovalStatus === 'approved'
                      ? 'Leader đã phê duyệt đồng ý. Đơn đang ở bàn Admin để phân bổ thẻ vật lý.'
                      : 'Đơn đã gửi thành công tới bàn Admin. Admin sẽ kiểm tra lịch trình và điều phối thẻ.'}
                  </p>
                </div>
              )}

              {selectedRequest.actualCardCode && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Mang thẻ và hóa đơn về gửi lại Admin sau chuyến đi.</span>
                </div>
              )}
            </div>

            {/* Actions: Cancel if allowed */}
            {['pending_leader', 'pending_admin', 'waitlist_cards'].includes(selectedRequest.status) && (
              <div className="pt-2">
                {showCancelConfirm ? (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 space-y-2 text-center">
                    <p className="text-xs text-rose-800 dark:text-rose-200 font-semibold">
                      Xác nhận hủy yêu cầu mượn thẻ này?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel(selectedRequest.id)}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                      >
                        Hủy đơn
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs"
                      >
                        Quay lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs transition-colors"
                  >
                    Hủy yêu cầu này
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const EmployeeRequestsViewMinimal = EmployeeRequestsView;
