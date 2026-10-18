import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest } from '../../types';
import { ReturnCardAndBillModal } from './ReturnCardAndBillModal';
import { ReleaseCardModal } from './ReleaseCardModal';
import { YieldCardModal } from './YieldCardModal';
import { DirectDispatchModal } from './DirectDispatchModal';
import {
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Receipt,
  User,
  MapPin,
  Send,
  Sparkles,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Clock,
  Zap,
  Calendar,
} from 'lucide-react';
import { formatVietnameseDateTime } from '../../utils/dateUtils';

export const AdminActionQueueView: React.FC = () => {
  const {
    currentUser,
    requests,
    cards,
    config,
    adminApprove,
    adminReject,
    adminForwardToLeader,
    assignCardFromWaitlist,
    confirmHandover,
    hrDecideOverBudget,
    reloadAdminMockData,
  } = useApp();

  // CHỐT PHƯƠNG ÁN 1: 2 Tab Đi/Về (Cấp thẻ - Thu bill) làm giao diện chính thức duy nhất
  const [twoTabsTab, setTwoTabsTab] = useState<'dispatch' | 'collect'>('dispatch');
  const [twoTabsDispatchFilter, setTwoTabsDispatchFilter] = useState<'all' | 'approval' | 'waitlist' | 'handover' | 'leader'>('all');
  const [twoTabsCollectFilter, setTwoTabsCollectFilter] = useState<'all' | 'billing' | 'overbudget'>('all');

  // Modal states
  const [showDirectDispatchModal, setShowDirectDispatchModal] = useState(false);
  const [selectedReqForBill, setSelectedReqForBill] = useState<TaxiRequest | null>(null);
  const [selectedReqForRelease, setSelectedReqForRelease] = useState<TaxiRequest | null>(null);
  const [selectedReqForYield, setSelectedReqForYield] = useState<TaxiRequest | null>(null);

  // FR-05: Tick timer (mỗi 30s) để tự động cập nhật timeline và cảnh báo thời gian thực
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  const [rejectingReq, setRejectingReq] = useState<TaxiRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [handoverCardCode, setHandoverCardCode] = useState<{ [reqId: string]: string }>({});
  const [waitlistAssignCode, setWaitlistAssignCode] = useState<{ [reqId: string]: string }>({});

  // HR Over-budget decision modal
  const [decidingOverBudgetReq, setDecidingOverBudgetReq] = useState<TaxiRequest | null>(null);
  const [hrDecisionType, setHrDecisionType] = useState<'accepted' | 'rejected'>('accepted');
  const [hrReason, setHrReason] = useState('');

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Search state & scope
  type SearchScope = 'name' | 'card' | 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('name');

  // Chuẩn hóa tiếng Việt bỏ dấu để tìm kiếm chính xác và linh hoạt
  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  // Search filter chính xác theo phạm vi người dùng chọn (mặc định: Tên & Mã NV)
  const matchesSearch = (req: TaxiRequest) => {
    if (!searchQuery.trim()) return true;
    const rawQ = searchQuery.trim();
    const q = rawQ.toLowerCase();
    const normQ = removeVietnameseTones(rawQ);

    // Tự động nhận diện nếu người dùng gõ mã thẻ (TAXI-xx) hoặc mã đơn (REQ-xx)
    const isExplicitCardQuery = q.startsWith('taxi') || searchScope === 'card';
    const isExplicitReqQuery = q.startsWith('req-');

    if (isExplicitReqQuery) {
      return req.id.toLowerCase().includes(q);
    }

    if (isExplicitCardQuery) {
      const cardReserved = req.reservedCardCode ? req.reservedCardCode.toLowerCase() : '';
      const cardActual = req.actualCardCode ? req.actualCardCode.toLowerCase() : '';
      return cardReserved.includes(q) || cardActual.includes(q);
    }

    // MẶC ĐỊNH: Chỉ tìm kiếm theo Tên nhân viên và Mã nhân viên
    // Loại trừ hoàn toàn trường hợp các từ vô tình chứa chữ (như "kỹ thuật", "thuế"...) làm xuất hiện nhân viên khác
    if (searchScope === 'name') {
      const normName = removeVietnameseTones(req.employeeName);
      const normCode = removeVietnameseTones(req.employeeCode);
      return normName.includes(normQ) || normCode.includes(normQ);
    }

    // Phạm vi 'all': Tìm kiếm mở rộng (Tên, Mã NV, Phòng ban, Mục đích, Điểm đến, Mã thẻ, Nhãn khách)
    const normName = removeVietnameseTones(req.employeeName);
    const normCode = removeVietnameseTones(req.employeeCode);
    const normDept = removeVietnameseTones(req.department);
    const normPurpose = removeVietnameseTones(req.purpose);
    const normDest = removeVietnameseTones(req.destination);
    const cardReserved = req.reservedCardCode ? req.reservedCardCode.toLowerCase() : '';
    const cardActual = req.actualCardCode ? req.actualCardCode.toLowerCase() : '';
    const clientTag = req.clientTag ? removeVietnameseTones(req.clientTag) : '';

    return (
      normName.includes(normQ) ||
      normCode.includes(normQ) ||
      normDept.includes(normQ) ||
      normPurpose.includes(normQ) ||
      normDest.includes(normQ) ||
      req.id.toLowerCase().includes(q) ||
      cardReserved.includes(q) ||
      cardActual.includes(q) ||
      clientTag.includes(normQ)
    );
  };

  const filteredRequests = requests.filter(matchesSearch);

  // Grouped Queues based on filteredRequests
  const pendingLeaderQueue = filteredRequests.filter((r) => r.status === 'pending_leader');
  const pendingApprovalQueue = filteredRequests.filter((r) => r.status === 'pending_admin');
  const waitlistQueue = filteredRequests.filter((r) => r.status === 'waitlist_cards');
  const handoverQueue = filteredRequests.filter((r) => r.status === 'pending_handover');
  const billingQueue = filteredRequests.filter((r) => r.status === 'holding_card' || r.status === 'returned_pending_bill');
  const overbudgetQueue = filteredRequests.filter((r) => r.status === 'overbudget_pending_hr');

  const availableCards = cards.filter((c) => c.status === 'available');

  const totalDispatchCount = pendingApprovalQueue.length + waitlistQueue.length + handoverQueue.length;
  const totalCollectCount = billingQueue.length + overbudgetQueue.length;
  const totalTodoCount = totalDispatchCount + totalCollectCount;

  // Actions
  const handleAdminApprove = (req: TaxiRequest) => {
    setFeedback(null);
    const res = adminApprove(req.id);
    setFeedback(res);
  };

  const handleAdminForwardToLeader = (req: TaxiRequest) => {
    setFeedback(null);
    const res = adminForwardToLeader(req.id);
    setFeedback(res);
  };

  const handleAdminReject = (req: TaxiRequest) => {
    if (!rejectReason.trim()) {
      setFeedback({ success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu.' });
      return;
    }
    const res = adminReject(req.id, rejectReason);
    setFeedback(res);
    setRejectingReq(null);
    setRejectReason('');
  };

  const handleAssignFromWaitlist = (req: TaxiRequest) => {
    const cardCode = waitlistAssignCode[req.id] || availableCards[0]?.code;
    if (!cardCode) {
      setFeedback({ success: false, message: 'Hiện không có thẻ nào sẵn sàng trong kho để cấp.' });
      return;
    }
    const res = assignCardFromWaitlist(req.id, cardCode);
    setFeedback(res);
  };

  const handleConfirmHandover = (req: TaxiRequest) => {
    const cardCode = handoverCardCode[req.id] || req.reservedCardCode || availableCards[0]?.code;
    if (!cardCode) {
      setFeedback({ success: false, message: 'Vui lòng chọn mã thẻ vật lý thực tế để bàn giao.' });
      return;
    }
    const res = confirmHandover(req.id, cardCode, currentUser.name);
    setFeedback(res);
  };

  const handleHrDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingOverBudgetReq) return;
    if (!hrReason.trim()) {
      setFeedback({ success: false, message: 'Vui lòng nhập lý do cho quyết định này.' });
      return;
    }

    const res = hrDecideOverBudget(
      decidingOverBudgetReq.id,
      hrDecisionType,
      hrReason,
      currentUser.name
    );
    setFeedback(res);
    setDecidingOverBudgetReq(null);
    setHrReason('');
  };

  // =========================================================================
  // REUSABLE COMPACT CARD RENDERERS (OPTIMIZED FOR MOBILE)
  // =========================================================================

  // 1. Pending Approval Card
  const renderApprovalCard = (req: TaxiRequest) => (
    <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{req.employeeName}</span>
            <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
          </div>
          <div className="text-[11px] text-slate-500">{req.department}</div>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Chờ duyệt
        </span>
      </div>

      <div className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
        <div className="font-medium text-slate-800 dark:text-slate-200">{req.purpose}</div>
        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
          <span>Điểm đến: <strong>{req.destination}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
          <span>Thời gian đi: <strong>{formatVietnameseDateTime(req.estimatedStartTime || req.createdAt)}</strong></span>
        </div>
        {req.leaderApprovalRequired && req.leaderApprovalComment && (
          <div className="pt-1 text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Leader: "{req.leaderApprovalComment}"</span>
          </div>
        )}
      </div>

      {rejectingReq?.id === req.id ? (
        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-1.5 text-xs">
          <textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
            className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-rose-300 text-slate-900 dark:text-white"
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setRejectingReq(null)} className="px-2 py-1 text-slate-500 text-xs">
              Hủy
            </button>
            <button onClick={() => handleAdminReject(req)} className="px-2.5 py-1 bg-rose-600 text-white font-bold text-xs">
              Xác nhận từ chối
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 gap-2">
          <span className="text-[10px] text-slate-400">Kho: {availableCards.length} thẻ rảnh</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setRejectingReq(req);
                setRejectReason('');
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold"
            >
              Từ chối
            </button>
            <button
              onClick={() => handleAdminForwardToLeader(req)}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold flex items-center gap-1"
              title="Chuyển đơn tới Leader phê duyệt trước khi cấp thẻ"
            >
              <Send className="w-3 h-3 text-amber-600" />
              <span>Y/c Leader</span>
            </button>
            <button
              onClick={() => handleAdminApprove(req)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Duyệt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // 1b. Pending Leader Card (Hiển thị cho Admin nắm thông tin các đơn đang chờ Leader duyệt)
  const renderPendingLeaderCard = (req: TaxiRequest) => (
    <div key={req.id} className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/60 rounded-md shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{req.employeeName}</span>
            <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{req.department}</div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300">
          Chờ Leader duyệt
        </span>
      </div>

      <div className="text-xs bg-white dark:bg-slate-900 p-2 rounded border border-amber-200 dark:border-amber-900/40 space-y-1">
        <div className="font-semibold text-slate-800 dark:text-slate-200">{req.purpose}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>Đến: {req.destination}</span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
          <span>Đi lúc: <strong>{formatVietnameseDateTime(req.estimatedStartTime || req.createdAt)}</strong></span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-0.5 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Đang ở khâu: Leader <strong>{req.leaderName || 'bộ phận'}</strong> duyệt</span>
        </div>
        <span className="italic text-amber-600 dark:text-amber-400">HR đã chuyển tiếp</span>
      </div>
    </div>
  );

  // 2. Waitlist Card
  const renderWaitlistCard = (req: TaxiRequest) => (
    <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>{req.employeeName}</span>
            <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
          </div>
          <div className="text-[11px] text-slate-500">{req.department}</div>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
          Chờ thẻ
        </span>
      </div>

      <div className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
        <div className="font-medium text-slate-800 dark:text-slate-200">{req.purpose}</div>
        <div className="text-[11px] text-slate-500">Đến: {req.destination}</div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] text-slate-500">Gán:</span>
          <select
            value={waitlistAssignCode[req.id] || availableCards[0]?.code || ''}
            onChange={(e) => setWaitlistAssignCode({ ...waitlistAssignCode, [req.id]: e.target.value })}
            className="text-xs p-1 bg-white dark:bg-slate-800 border border-slate-300 font-mono font-bold"
          >
            {availableCards.length === 0 ? (
              <option value="">(Hết thẻ rảnh)</option>
            ) : (
              availableCards.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          disabled={availableCards.length === 0}
          onClick={() => handleAssignFromWaitlist(req)}
          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs"
        >
          Cấp thẻ ngay
        </button>
      </div>
    </div>
  );

  // Helper: Tính khoảng thời gian chờ & xác định mức cảnh báo timeline (FR-01, Ý tưởng 2)
  const getHandoverTimeline = (req: TaxiRequest) => {
    const readyTime = req.handoverReadyAt || req.adminApprovedAt || req.createdAt;
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(readyTime).getTime()) / (60 * 1000)));

    if (elapsedMinutes >= 30) {
      return {
        level: 'expired' as const,
        minutes: elapsedMinutes,
        badgeText: `Quá hạn nhận ${elapsedMinutes}p - Cần liên hệ hoặc nhả thẻ`,
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse font-bold',
        cardBorderClass: 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10',
      };
    }
    if (elapsedMinutes >= 15) {
      return {
        level: 'warning' as const,
        minutes: elapsedMinutes,
        badgeText: `Đã chờ ${elapsedMinutes}p - Cần nhắc nhở`,
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-medium',
        cardBorderClass: 'border-amber-300 dark:border-amber-700/80 bg-amber-50/10 dark:bg-amber-950/10',
      };
    }
    return {
      level: 'normal' as const,
      minutes: elapsedMinutes,
      badgeText: `Đã chờ ${elapsedMinutes}p`,
      badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      cardBorderClass: 'border-slate-200 dark:border-slate-800',
    };
  };

  // 3. Handover Card (Có chỉ báo thời gian chờ và cảnh báo quá hạn theo Timeline)
  const renderHandoverCard = (req: TaxiRequest) => {
    const timeline = getHandoverTimeline(req);

    return (
      <div key={req.id} className={`p-3 bg-white dark:bg-slate-900 border shadow-2xs space-y-2 transition-all ${timeline.cardBorderClass}`}>
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{req.employeeName}</span>
              <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
              {req.isDirectDispatch && (
                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                  ⚡ Trực tiếp
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{req.department}</div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block">
              Dự kiến: {req.reservedCardCode || 'Chưa gán'}
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] rounded border ${timeline.badgeClass}`}>
              <Clock className="w-3 h-3 shrink-0" />
              <span>{timeline.badgeText}</span>
            </span>
          </div>
        </div>

        <div className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="font-medium text-slate-800 dark:text-slate-200">{req.purpose}</div>
          <div className="text-[11px] text-slate-500">Đến: {req.destination}</div>

          {req.yieldStatus === 'pending_user_confirm' && (
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 text-[10px] text-blue-800 dark:text-blue-300 font-medium animate-pulse flex items-center gap-1">
              <Send className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Đã gửi xin nhường thẻ qua Telegram (Chờ NV phản hồi...)</span>
            </div>
          )}

          {req.yieldStatus === 'declined' && (
            <div className="p-1.5 bg-slate-100 text-[10px] text-slate-600 border border-slate-200 flex items-center gap-1">
              <X className="w-3 h-3 text-slate-400 shrink-0" />
              <span>NV từ chối nhường trên Telegram (Vẫn đi theo lịch).</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] text-slate-500">Mã giao:</span>
            <select
              value={handoverCardCode[req.id] || req.reservedCardCode || availableCards[0]?.code || ''}
              onChange={(e) => setHandoverCardCode({ ...handoverCardCode, [req.id]: e.target.value })}
              className="text-xs p-1 bg-white dark:bg-slate-800 border border-slate-300 font-mono font-bold"
            >
              {req.reservedCardCode && (
                <option value={req.reservedCardCode}>{req.reservedCardCode} (Dự kiến)</option>
              )}
              {availableCards
                .filter((c) => c.code !== req.reservedCardCode)
                .map((c) => (
                  <option key={c.id} value={c.code}>{c.code}</option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedReqForYield(req)}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1"
              title="Xin nhường thẻ qua Telegram"
            >
              <Send className="w-3 h-3" />
              <span>Xin nhường</span>
            </button>

            <button
              onClick={() => setSelectedReqForRelease(req)}
              className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-colors ${
                timeline.level === 'expired'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs rounded'
                  : 'bg-slate-100 hover:bg-amber-50 text-amber-700 border border-amber-200'
              }`}
              title="Giải phóng thẻ nếu NV không đến"
            >
              {timeline.level === 'expired' && <AlertTriangle className="w-3 h-3 text-white shrink-0" />}
              <span>{timeline.level === 'expired' ? 'Nhả thẻ ngay' : 'Nhả thẻ'}</span>
            </button>

            <button
              onClick={() => handleConfirmHandover(req)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Giao thẻ</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 4. Billing Card
  const renderBillingCard = (req: TaxiRequest) => (
    <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{req.employeeName}</span>
            <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
          </div>
          <div className="text-[11px] text-slate-500">{req.department}</div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
            {req.actualCardCode || req.reservedCardCode}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.2 font-semibold border ${
              req.status === 'returned_pending_bill'
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            {req.status === 'returned_pending_bill' ? 'Đã thu thẻ · Nợ bill' : 'Đang giữ thẻ'}
          </span>
        </div>
      </div>

      <div className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
        <div className="font-medium text-slate-800 dark:text-slate-200">{req.purpose}</div>
        <div className="text-[11px] text-slate-500">Đến: {req.destination}</div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-400 italic">
          {req.status === 'returned_pending_bill' ? 'Thiếu dữ liệu chi phí' : 'Đang đi ngoài đường'}
        </span>

        <button
          onClick={() => setSelectedReqForBill(req)}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{req.status === 'returned_pending_bill' ? 'Nhập bổ sung bill' : 'Thu thẻ & Nhập bill'}</span>
        </button>
      </div>
    </div>
  );

  // 5. Overbudget Card
  const renderOverbudgetCard = (req: TaxiRequest) => {
    const details = req.tripDetails;
    return (
      <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 shadow-2xs space-y-2">
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{req.employeeName}</span>
              <span className="font-mono text-slate-400 text-[10px]">({req.employeeCode})</span>
            </div>
            <div className="text-[11px] text-slate-500">{req.department}</div>
          </div>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Vượt hạn mức
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center text-xs bg-rose-50/50 dark:bg-rose-950/20 p-2 border border-rose-200">
          <div>
            <div className="text-[9px] text-slate-400">Định mức:</div>
            <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {(details?.maxSpendSnapshot || config.maxSpendPerTrip).toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Thực tế:</div>
            <div className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
              {(details?.actualCost || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Phần vượt:</div>
            <div className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-300">
              +{(details?.overBudgetAmount || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              setDecidingOverBudgetReq(req);
              setHrDecisionType('accepted');
              setHrReason('');
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
          >
            Thẩm định chi phí
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 max-w-xl mx-auto pb-20">
      {/* COMPACT HEADER */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Việc cần xử lý</span>
            {totalTodoCount > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-mono font-bold">
                {totalTodoCount}
              </span>
            )}
          </h2>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Kho: <strong className="text-emerald-600">{availableCards.length}</strong> thẻ rảnh
        </div>
      </div>

      {/* SEARCH BAR (TÌM KIẾM THỜI GIAN THỰC) */}
      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchScope === 'name'
                ? "Nhập tên hoặc mã NV (VD: Thu, Dũng, 1067)..."
                : searchScope === 'card'
                ? "Nhập mã thẻ taxi (VD: TAXI-01, 02)..."
                : "Tìm tất cả (Tên NV, mã thẻ, địa điểm, mục đích)..."
            }
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Nút lọc phạm vi tìm kiếm (Scope Chips) */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-medium mr-0.5">Tìm theo:</span>
            <button
              type="button"
              onClick={() => setSearchScope('name')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                searchScope === 'name'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              👤 Tên / Mã NV
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('card')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                searchScope === 'card'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              💳 Mã thẻ
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                searchScope === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              🌐 Tất cả
            </button>
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
            >
              Xóa tìm
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="text-[10px] text-slate-600 dark:text-slate-300 pt-0.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <span>
              Tìm thấy <strong className="text-blue-600 dark:text-blue-400">{filteredRequests.length}</strong> kết quả cho "{searchQuery}"
            </span>
            <span className="text-[9px] text-slate-400 italic">
              {searchScope === 'name' ? 'Đang lọc đúng theo nhân viên' : searchScope === 'card' ? 'Đang lọc theo mã thẻ' : 'Đang quét toàn bộ trường'}
            </span>
          </div>
        )}
      </div>

      {/* THANH THAO TÁC VẬN HÀNH CHÍNH (QUẦY ADMIN & NẠP DATA MẪU) */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Nút Xuất thẻ nhanh tại quầy (Ý tưởng 1) */}
          <button
            type="button"
            onClick={() => setShowDirectDispatchModal(true)}
            className="flex-1 min-w-[180px] py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
            title="Xuất thẻ ngay cho ca khẩn cấp không cần người nhận tạo đơn"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>⚡ Xuất thẻ nhanh tại quầy</span>
          </button>

          {/* Nút Nạp lại Mock Data */}
          <button
            type="button"
            onClick={() => {
              const res = reloadAdminMockData();
              setFeedback(res);
            }}
            className="py-2 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-md flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Khôi phục 12 kịch bản mẫu phong phú bao quát tất cả các trường hợp"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Nạp lại Mock Data</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
          <span>
            Tổng công việc: <strong>{totalTodoCount}</strong> việc cần xử lý
          </span>
          <span>
            Kho thẻ: <strong className="text-emerald-600 dark:text-emerald-400">{availableCards.length}</strong> thẻ rảnh
          </span>
        </div>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          className={`p-2.5 text-xs flex items-center justify-between border ${
            feedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHƯƠNG ÁN 1: 2 TAB DUY NHẤT (CẤP THẺ - THU THẺ & BILL) */}
      {/* ===================================================================== */}
      <div className="space-y-2.5">
          {/* 2 Main Tabs - 100% full width, no overflow scrollbar! */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-bold">
            <button
              onClick={() => setTwoTabsTab('dispatch')}
              className={`py-2 px-2 text-center rounded-md transition-all flex items-center justify-center gap-1.5 ${
                twoTabsTab === 'dispatch'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>1. Cấp thẻ (Chiều đi)</span>
              {totalDispatchCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
                  {totalDispatchCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTwoTabsTab('collect')}
              className={`py-2 px-2 text-center rounded-md transition-all flex items-center justify-center gap-1.5 ${
                twoTabsTab === 'collect'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>2. Thu thẻ & Bill (Chiều về)</span>
              {totalCollectCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px]">
                  {totalCollectCount}
                </span>
              )}
            </button>
          </div>

          {/* Sub-content for Tab 1: Cấp thẻ */}
          {twoTabsTab === 'dispatch' && (
            <div className="space-y-2">
              {/* Micro Filter Pills */}
              <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setTwoTabsDispatchFilter('all')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsDispatchFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Tất cả ({totalDispatchCount})
                </button>
                <button
                  onClick={() => setTwoTabsDispatchFilter('approval')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsDispatchFilter === 'approval' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Chờ duyệt ({pendingApprovalQueue.length})
                </button>
                <button
                  onClick={() => setTwoTabsDispatchFilter('waitlist')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsDispatchFilter === 'waitlist' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Chờ thẻ ({waitlistQueue.length})
                </button>
                <button
                  onClick={() => setTwoTabsDispatchFilter('handover')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsDispatchFilter === 'handover' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Chờ giao ({handoverQueue.length})
                </button>
                {pendingLeaderQueue.length > 0 && (
                  <button
                    onClick={() => setTwoTabsDispatchFilter('leader')}
                    className={`px-2 py-0.5 rounded-full font-semibold transition-all ${
                      twoTabsDispatchFilter === 'leader'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    Chờ Leader ({pendingLeaderQueue.length})
                  </button>
                )}
              </div>

              {/* Items */}
              {totalDispatchCount === 0 && pendingLeaderQueue.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Hiện không có yêu cầu nào cần cấp thẻ.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Hiển thị các đơn đang chờ Leader nếu Admin chọn tab Leader hoặc All */}
                  {(twoTabsDispatchFilter === 'all' || twoTabsDispatchFilter === 'leader') &&
                    pendingLeaderQueue.map((req) => renderPendingLeaderCard(req))}

                  {(twoTabsDispatchFilter === 'all' || twoTabsDispatchFilter === 'approval') &&
                    pendingApprovalQueue.map((req) => renderApprovalCard(req))}

                  {(twoTabsDispatchFilter === 'all' || twoTabsDispatchFilter === 'waitlist') &&
                    waitlistQueue.map((req) => renderWaitlistCard(req))}

                  {(twoTabsDispatchFilter === 'all' || twoTabsDispatchFilter === 'handover') &&
                    handoverQueue.map((req) => renderHandoverCard(req))}
                </div>
              )}
            </div>
          )}

          {/* Sub-content for Tab 2: Thu thẻ & Bill */}
          {twoTabsTab === 'collect' && (
            <div className="space-y-2">
              {/* Micro Filter Pills */}
              <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setTwoTabsCollectFilter('all')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsCollectFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Tất cả ({totalCollectCount})
                </button>
                <button
                  onClick={() => setTwoTabsCollectFilter('billing')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsCollectFilter === 'billing' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Chờ bill ({billingQueue.length})
                </button>
                <button
                  onClick={() => setTwoTabsCollectFilter('overbudget')}
                  className={`px-2 py-0.5 rounded-full font-medium ${twoTabsCollectFilter === 'overbudget' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                >
                  Vượt mức ({overbudgetQueue.length})
                </button>
              </div>

              {/* Items */}
              {totalCollectCount === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Không có lượt mượn thẻ nào đang chờ thu hồi hoặc nợ bill.
                </div>
              ) : (
                <div className="space-y-2">
                  {(twoTabsCollectFilter === 'all' || twoTabsCollectFilter === 'billing') &&
                    billingQueue.map((req) => renderBillingCard(req))}

                  {(twoTabsCollectFilter === 'all' || twoTabsCollectFilter === 'overbudget') &&
                    overbudgetQueue.map((req) => renderOverbudgetCard(req))}
                </div>
              )}
            </div>
          )}
        </div>

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}

      {/* HR Decision Modal */}
      {decidingOverBudgetReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Thẩm định vượt mức</h3>
              <button onClick={() => setDecidingOverBudgetReq(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHrDecisionSubmit} className="space-y-2.5 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHrDecisionType('accepted')}
                  className={`flex-1 py-1.5 font-bold text-xs border ${
                    hrDecisionType === 'accepted' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Accept (Duyệt chi)
                </button>
                <button
                  type="button"
                  onClick={() => setHrDecisionType('rejected')}
                  className={`flex-1 py-1.5 font-bold text-xs border ${
                    hrDecisionType === 'rejected' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Reject (Từ chối)
                </button>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Lý do thẩm định (bắt buộc):</label>
                <textarea
                  rows={2}
                  required
                  value={hrReason}
                  onChange={(e) => setHrReason(e.target.value)}
                  placeholder="Nhập lý do thẩm định..."
                  className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDecidingOverBudgetReq(null)}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-700 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-1.5 text-white text-xs font-bold ${
                    hrDecisionType === 'accepted' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return & Billing Modal */}
      {selectedReqForBill && (
        <ReturnCardAndBillModal
          request={selectedReqForBill}
          onClose={() => setSelectedReqForBill(null)}
          onSuccess={() => {
            setFeedback({ success: true, message: 'Đã cập nhật bill và nghiệm thu chuyến đi thành công.' });
          }}
        />
      )}

      {/* Release Card Modal */}
      {selectedReqForRelease && (
        <ReleaseCardModal
          request={selectedReqForRelease}
          onClose={() => setSelectedReqForRelease(null)}
          onSuccess={() => {
            setFeedback({ success: true, message: 'Đã giải phóng thẻ đã giữ về kho.' });
          }}
        />
      )}

      {/* Yield Card Modal */}
      {selectedReqForYield && (
        <YieldCardModal
          request={selectedReqForYield}
          onClose={() => setSelectedReqForYield(null)}
          onSuccess={(msg) => {
            setFeedback({ success: true, message: msg });
          }}
        />
      )}

      {/* Direct Dispatch Modal (Ý tưởng 1: Xuất thẻ nhanh tại quầy) */}
      <DirectDispatchModal
        isOpen={showDirectDispatchModal}
        onClose={() => setShowDirectDispatchModal(false)}
        onSuccess={() => {
          setFeedback({
            success: true,
            message: 'Đã xuất thẻ nhanh tại quầy thành công! Đơn đã chuyển sang trạng thái Đang giữ thẻ.',
          });
        }}
      />
    </div>
  );
};
