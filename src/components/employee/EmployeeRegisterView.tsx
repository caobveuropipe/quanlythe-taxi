import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  Send,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Edit3,
  X,
} from 'lucide-react';
import { toDateTimeLocalValue, formatVietnameseDateTime, getRelativeTimeNotice } from '../../utils/dateUtils';

export interface EmployeeRegisterViewProps {
  onGoToRequests: () => void;
}

export const EmployeeRegisterView: React.FC<EmployeeRegisterViewProps> = ({
  onGoToRequests,
}) => {
  const { currentUser, requests, cards, createRequest } = useApp();

  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [clientTag, setClientTag] = useState('');
  const [estimatedStartTime, setEstimatedStartTime] = useState(() => toDateTimeLocalValue(new Date()));
  const [selectedPreset, setSelectedPreset] = useState<'now' | 'plus30' | 'tomorrow' | 'custom'>('now');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    requestId: string;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current user already has an active request
  const activeReq = requests.find(
    (r) =>
      r.employeeId === currentUser.id &&
      ['pending_leader', 'pending_admin', 'waitlist_cards', 'pending_handover', 'holding_card'].includes(r.status)
  );

  const waitlistCount = requests.filter((r) => r.status === 'waitlist_cards').length;
  const physicalAvailableCount = cards.filter((c) => c.status === 'available').length;
  const availableCardsCount = Math.max(0, physicalAvailableCount - waitlistCount);
  const isOutOfCards = availableCardsCount === 0;

  // Preset handlers
  const handleSelectPreset = (type: 'now' | 'plus30' | 'tomorrow') => {
    setSelectedPreset(type);
    const now = new Date();
    if (type === 'now') {
      setEstimatedStartTime(toDateTimeLocalValue(now));
    } else if (type === 'plus30') {
      const target = new Date(now.getTime() + 30 * 60 * 1000);
      setEstimatedStartTime(toDateTimeLocalValue(target));
    } else if (type === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 30, 0, 0);
      setEstimatedStartTime(toDateTimeLocalValue(tomorrow));
    }
  };

  // Step 1: Open Confirmation Review
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!destination.trim()) {
      setErrorMessage('Vui lòng nhập nơi đến di chuyển.');
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage('Vui lòng nhập mục đích sử dụng thẻ.');
      return;
    }

    setShowConfirmModal(true);
  };

  // Step 2: Final Submit upon user confirmation
  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setErrorMessage(null);

    const res = await createRequest(
      purpose,
      destination,
      clientTag.trim(),
      estimatedStartTime ? new Date(estimatedStartTime).toISOString() : undefined
    );

    if (res.success && res.requestId) {
      setSubmittedResult({
        requestId: res.requestId,
        message: res.message,
      });
      setPurpose('');
      setDestination('');
      setClientTag('');
      setSelectedPreset('now');
      setEstimatedStartTime(toDateTimeLocalValue(new Date()));
    } else {
      setErrorMessage(res.message);
    }
  };

  // 1. Success Screen (Ultra Clean)
  if (submittedResult) {
    return (
      <div className="p-5 max-w-md mx-auto text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Đã gửi yêu cầu mượn thẻ!
          </h2>
          <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
            {submittedResult.requestId}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isOutOfCards
            ? 'Kho tạm hết thẻ · Đơn đã vào danh sách chờ cấp tự động.'
            : 'Đơn đang được xử lý cấp thẻ theo quy trình.'}
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={onGoToRequests}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <span>Theo dõi đơn của tôi</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSubmittedResult(null)}
            className="w-full py-2 px-4 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
          >
            Đăng ký thêm chuyến khác
          </button>
        </div>
      </div>
    );
  }

  // 2. Main Minimalist Register Form
  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Top Status Bar (Super Compact Pill) */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOutOfCards ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {isOutOfCards ? 'Kho tạm hết thẻ' : `Sẵn sàng: ${availableCardsCount} thẻ`}
          </span>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          {isOutOfCards ? 'Tự động xếp chờ' : 'Cấp nhanh'}
        </span>
      </div>

      {/* Active Request Notice if any */}
      {activeReq && (() => {
        const isHandoverReady = activeReq.status === 'pending_handover';
        const isHolding = activeReq.status === 'holding_card';
        const isWaitlist = activeReq.status === 'waitlist_cards';
        const isPendingLeader = activeReq.status === 'pending_leader';
        const isPendingAdmin = activeReq.status === 'pending_admin';
        const isPendingBill = activeReq.status === 'returned_pending_bill';

        let containerClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
        let badgeClass = 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200';
        let badgeText = 'Đang xử lý';
        let titleText = `Bạn đang có đơn ${activeReq.id} đang xử lý`;
        let descText = 'Quy định công ty: Mỗi nhân sự chỉ có tối đa 1 lượt mượn thẻ đang hoạt động. Vui lòng hoàn tất hoặc hủy đơn cũ trước khi gửi đơn mới.';
        let btnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
        let btnText = `Xem chi tiết đơn ${activeReq.id}`;
        let IconComponent = AlertCircle;
        let iconColor = 'text-amber-600';

        if (isHandoverReady) {
          containerClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20';
          badgeClass = 'bg-emerald-600 text-white font-bold';
          badgeText = `Đã cấp thẻ: ${activeReq.reservedCardCode || 'TAXI'}`;
          titleText = `ĐÃ CÓ THẺ CHO BẠN (${activeReq.reservedCardCode || 'TAXI'}) 🎉`;
          descText = `Admin đã phê duyệt và gán thẻ ${activeReq.reservedCardCode || ''}. Bạn vui lòng đến quầy Hành chính gặp Admin để nhận thẻ trước khi khởi hành nhé!`;
          btnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs';
          btnText = `Đến quầy nhận thẻ • Xem chi tiết`;
          IconComponent = CheckCircle2;
          iconColor = 'text-emerald-600';
        } else if (isHolding) {
          containerClass = 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200';
          badgeClass = 'bg-teal-600 text-white font-bold';
          badgeText = `Đang giữ thẻ: ${activeReq.actualCardCode || 'TAXI'}`;
          titleText = `Bạn đang giữ thẻ ${activeReq.actualCardCode || ''}`;
          descText = 'Thẻ taxi vật lý đang nằm tại bạn. Vui lòng hoàn trả thẻ và bổ sung hóa đơn/vé taxi sau khi chuyến đi kết thúc.';
          btnClass = 'bg-teal-600 hover:bg-teal-700 text-white';
          btnText = `Xem thẻ & Trả thẻ`;
          IconComponent = CreditCard;
          iconColor = 'text-teal-600';
        } else if (isWaitlist) {
          containerClass = 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200';
          badgeClass = 'bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-semibold';
          badgeText = 'Đang xếp hàng chờ thẻ';
          titleText = `Đơn ${activeReq.id} đang chờ thẻ vào kho`;
          descText = 'Đơn của bạn đã được duyệt. Hệ thống sẽ tự động gán thẻ và thông báo ngay khi có nhân sự trả thẻ về kho.';
          btnClass = 'bg-purple-600 hover:bg-purple-700 text-white';
          IconComponent = Clock;
          iconColor = 'text-purple-600';
        } else if (isPendingAdmin) {
          containerClass = 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200';
          badgeClass = 'bg-blue-200 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 font-semibold';
          badgeText = 'Chờ Admin cấp thẻ';
          titleText = `Đơn ${activeReq.id} đang chờ Admin cấp thẻ`;
          descText = 'Leader đã duyệt đơn của bạn. Yêu cầu đang được Admin chuẩn bị thẻ vật lý tại quầy.';
          btnClass = 'bg-blue-600 hover:bg-blue-700 text-white';
          IconComponent = Clock;
          iconColor = 'text-blue-600';
        } else if (isPendingLeader) {
          badgeText = 'Chờ Leader duyệt';
          titleText = `Đơn ${activeReq.id} đang chờ Leader duyệt`;
          descText = `Hệ thống đã gửi thông báo đến Leader quản lý (${activeReq.leaderName || 'trực tiếp'}). Vui lòng chờ Leader phê duyệt.`;
          IconComponent = Clock;
        } else if (isPendingBill) {
          containerClass = 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200';
          badgeClass = 'bg-orange-200 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 font-semibold';
          badgeText = 'Bổ sung hóa đơn';
          titleText = `Đơn ${activeReq.id} đã trả thẻ, chờ nộp bill`;
          descText = 'Bạn đã hoàn trả thẻ vật lý vào kho. Vui lòng chụp ảnh hóa đơn/biên lai để hoàn tất đơn này.';
          btnClass = 'bg-orange-600 hover:bg-orange-700 text-white';
          btnText = `Nộp hóa đơn taxi`;
        }

        return (
          <div className={`p-3.5 rounded-2xl border text-xs space-y-2 animate-in fade-in ${containerClass}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <IconComponent className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <span className="line-clamp-1">{titleText}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
                {badgeText}
              </span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {descText}
            </p>
            <button
              type="button"
              onClick={onGoToRequests}
              className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${btnClass}`}
            >
              <span>{btnText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Minimalist Form */}
      <form onSubmit={handleOpenConfirm} className="space-y-3.5">
        {/* Input 1: Destination (Where to?) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Nơi đến</span>
          </label>
          <input
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="VD: Khách sạn Daewoo, Keangnam, Sân bay..."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Input 2: Purpose (Why?) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mục đích sử dụng</span>
          </label>
          <input
            type="text"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="VD: Đi tiếp khách VIP, Họp dự án..."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Input 3: Quick Time Selector (When?) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Thời gian đi</span>
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPreset('now')}
              className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                selectedPreset === 'now'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              Đi ngay
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('plus30')}
              className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                selectedPreset === 'plus30'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              +30 phút
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('tomorrow')}
              className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                selectedPreset === 'tomorrow'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              Sáng mai
            </button>
          </div>

          {/* Custom Time Picker button/input */}
          <div className="pt-0.5">
            <input
              type="datetime-local"
              value={estimatedStartTime}
              onChange={(e) => {
                setSelectedPreset('custom');
                setEstimatedStartTime(e.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-lg text-[11px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Tag (Optional 1-touch chips) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Phân loại khách (tùy chọn)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Khách VIP', 'B2B', 'Nội bộ'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setClientTag(clientTag === tag ? '' : tag)}
                className={`py-1 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                  clientTag === tag
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-400'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button (Prominent & Clean) */}
        <button
          type="submit"
          disabled={!!activeReq}
          className={`w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReq
              ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 active:scale-[0.99]'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{activeReq ? `Chờ hoàn tất đơn ${activeReq.id}` : 'Gửi yêu cầu mượn thẻ'}</span>
        </button>
      </form>

      {/* 3. Confirmation Review Sheet / Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Xác nhận gửi yêu cầu mượn thẻ
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Vui lòng kiểm tra kỹ ngày giờ và thông tin chuyến đi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* HIGHLIGHT: NGÀY & GIỜ ĐI DỰ KIẾN */}
            {(() => {
              const dt = formatVietnameseDateTime(estimatedStartTime);
              const relativeNotice = getRelativeTimeNotice(estimatedStartTime);
              return (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border-2 border-blue-400/80 dark:border-blue-600 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ngày & giờ đi dự kiến</span>
                    </span>
                    {relativeNotice && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        {relativeNotice}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                    {dt}
                  </div>
                </div>
              );
            })()}

            {/* Other Trip Details */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>Nơi đến</span>
                </span>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {destination}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-indigo-500" />
                  <span>Mục đích</span>
                </span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {purpose}
                </div>
                {clientTag && (
                  <div className="pt-1">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {clientTag}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Note */}
              <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Trạng thái kho thẻ:</span>
                <strong className={isOutOfCards ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {isOutOfCards ? 'Hết thẻ · Sẽ xếp hàng chờ' : `Có sẵn ${availableCardsCount} thẻ`}
                </strong>
              </div>
            </div>

            {/* 2 Buttons: Back to Edit or Confirm */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Quay lại để sửa</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Xác nhận gửi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const EmployeeRegisterViewMinimal = EmployeeRegisterView;
