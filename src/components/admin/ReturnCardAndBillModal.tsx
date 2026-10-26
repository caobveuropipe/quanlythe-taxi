import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiRequest, CardCondition } from '../../types';
import {
  X,
  CreditCard,
  Edit3,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  MapPin,
  DollarSign,
  Upload,
  Sparkles,
  Key,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { scanTaxiReceipt } from '../../services/geminiOcrService';
import {
  getCustomGeminiKey,
  getDailySystemUsageCount,
  MAX_DAILY_SYSTEM_OCR_LIMIT,
} from '../../utils/geminiKeyStorage';
import { AdminOcrKeyModal } from './AdminOcrKeyModal';

interface ReturnCardAndBillModalProps {
  request: TaxiRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnCardAndBillModal: React.FC<ReturnCardAndBillModalProps> = ({
  request,
  onClose,
  onSuccess,
}) => {
  const { currentUser, config, confirmReturnAndBilling } = useApp();

  const [cardCondition, setCardCondition] = useState<CardCondition>('good');
  const [pickupPoint, setPickupPoint] = useState(request.tripDetails?.pickupPoint || 'Trụ sở văn phòng, Hoàn Kiếm');
  const [dropoffPoint, setDropoffPoint] = useState(request.tripDetails?.dropoffPoint || request.destination || '');
  const [actualCostStr, setActualCostStr] = useState<string>(
    request.tripDetails?.actualCost ? String(request.tripDetails.actualCost) : ''
  );
  const [isCostMissing, setIsCostMissing] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(request.tripDetails?.receiptNumber || '');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | undefined>(
    request.tripDetails?.receiptPhotoUrl || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OCR state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrSuggested, setOcrSuggested] = useState(Boolean(request.tripDetails?.ocrSuggested));
  const [ocrMessage, setOcrMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyUpdateTick, setKeyUpdateTick] = useState(0);

  const maxSpend = config.maxSpendPerTrip;
  const costNum = isCostMissing ? 0 : parseInt(actualCostStr.replace(/\D/g, ''), 10) || 0;
  const isOverBudget = !isCostMissing && costNum > maxSpend;
  const overBudgetAmount = isOverBudget ? costNum - maxSpend : 0;

  const currentCustomKey = getCustomGeminiKey();
  const systemUsage = getDailySystemUsageCount();
  const remainingSystemUsage = Math.max(0, MAX_DAILY_SYSTEM_OCR_LIMIT - systemUsage);

  // Hàm quét ảnh hóa đơn bằng OCR
  const executeOcrScan = async (fileOrUrl: File | string) => {
    setIsScanningOcr(true);
    setOcrMessage(null);

    try {
      const res = await scanTaxiReceipt(fileOrUrl, currentUser.code);

      if (res.success && res.data) {
        let fieldsUpdated = 0;

        if (res.data.actualCost && res.data.actualCost > 0) {
          setActualCostStr(String(res.data.actualCost));
          setIsCostMissing(false);
          fieldsUpdated++;
        }
        if (res.data.pickupPoint && res.data.pickupPoint.trim()) {
          setPickupPoint(res.data.pickupPoint.trim());
          fieldsUpdated++;
        }
        if (res.data.dropoffPoint && res.data.dropoffPoint.trim()) {
          setDropoffPoint(res.data.dropoffPoint.trim());
          fieldsUpdated++;
        }
        if (res.data.receiptNumber && res.data.receiptNumber.trim()) {
          setReceiptNumber(res.data.receiptNumber.trim());
          fieldsUpdated++;
        }

        setOcrSuggested(true);

        const sourceLabel = res.data.source === 'custom' ? 'Key cá nhân' : 'Key hệ thống';
        const costText = res.data.actualCost ? `${res.data.actualCost.toLocaleString('vi-VN')} đ` : '';
        setOcrMessage({
          text: `✨ Đã quét thành công ${costText ? `(${costText})` : ''} qua ${sourceLabel}. Vui lòng đối chiếu với ảnh!`,
          type: 'success',
        });
      } else {
        setOcrMessage({
          text: res.message || 'Không thể bóc tách hóa đơn. Bạn có thể tự nhập tay số tiền.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      setOcrMessage({
        text: err?.message || 'Có lỗi khi phân tích hóa đơn AI.',
        type: 'error',
      });
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setReceiptPhotoUrl(dataUrl);
      };
      reader.readAsDataURL(file);

      // Kích hoạt quét OCR tự động
      executeOcrScan(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!isCostMissing && (!actualCostStr || costNum <= 0)) {
      setError('Vui lòng nhập số tiền cước taxi thực tế hoặc đánh dấu "Chưa có bill (Thiếu dữ liệu)".');
      return;
    }
    if (!pickupPoint.trim() || !dropoffPoint.trim()) {
      setError('Vui lòng nhập đầy đủ điểm đón và điểm trả khách.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = confirmReturnAndBilling({
        requestId: request.id,
        cardCondition,
        pickupPoint,
        dropoffPoint,
        actualCost: isCostMissing ? null : costNum,
        isCostMissing,
        receiptNumber,
        receiptPhotoUrl,
        ocrSuggested,
        operatorName: currentUser.name,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-mono text-slate-400">
              {request.id} · {request.actualCardCode || request.reservedCardCode}
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Xác nhận thu hồi thẻ & Nhập bill cước taxi
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee & Card Summary */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Nhân sự mang trả</span>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {request.employeeName} ({request.employeeCode})
            </div>
            <div className="text-[11px] text-slate-500">{request.department}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Mã thẻ thực giao</span>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {request.actualCardCode || request.reservedCardCode || 'Chưa gán'}
            </div>
            <div className="text-[11px] text-slate-500">Mục đích: {request.purpose}</div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Tình trạng thẻ vật lý khi nhận lại */}
          <div className="space-y-1.5 p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span>Tình trạng thẻ vật lý khi thu hồi</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCardCondition('good')}
                className={`p-2 border text-center font-medium transition-colors ${
                  cardCondition === 'good'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                <div>Tốt / Nguyên vẹn</div>
                <div className="text-[10px] opacity-80">(Hoàn về kho)</div>
              </button>

              <button
                type="button"
                onClick={() => setCardCondition('scratched')}
                className={`p-2 border text-center font-medium transition-colors ${
                  cardCondition === 'scratched'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                <div>Trầy xước nhẹ</div>
                <div className="text-[10px] opacity-80">(Tạm khóa)</div>
              </button>

              <button
                type="button"
                onClick={() => setCardCondition('broken')}
                className={`p-2 border text-center font-medium transition-colors ${
                  cardCondition === 'broken'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                <div>Hỏng dải từ / Gãy</div>
                <div className="text-[10px] opacity-80">(Chờ đổi mới)</div>
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              Quy tắc: Chỉ khi thẻ ở tình trạng <strong>Tốt</strong> thì hệ thống mới tăng số thẻ sẵn sàng trong kho.
            </div>
          </div>

          {/* 2. Ảnh chụp hóa đơn & Bộ quét AI OCR */}
          <div className="space-y-2 p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Ảnh chụp hóa đơn / cuống vé taxi</span>
              </span>

              {/* Nút cấu hình Key OCR */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className={`text-[10px] px-2 py-0.5 border flex items-center gap-1 transition-colors ${
                    currentCustomKey
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-white text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 hover:border-blue-400'
                  }`}
                  title="Cài đặt API Key cá nhân để quét không giới hạn"
                >
                  <Key className="w-3 h-3" />
                  <span>
                    {currentCustomKey ? 'Key riêng' : `Key chung (${remainingSystemUsage}/20)`}
                  </span>
                </button>

                {receiptPhotoUrl && !isScanningOcr && (
                  <button
                    type="button"
                    onClick={() => executeOcrScan(receiptPhotoUrl)}
                    className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition-colors"
                    title="Quét lại hóa đơn bằng AI"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Quét lại AI</span>
                  </button>
                )}

                {receiptPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptPhotoUrl('');
                      setOcrMessage(null);
                    }}
                    className="text-[11px] text-rose-500 hover:underline ml-1"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Thông báo tiến trình hoặc kết quả quét OCR */}
            {ocrMessage && (
              <div
                className={`p-2 text-xs border flex items-start gap-1.5 animate-in fade-in ${
                  ocrMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200'
                    : ocrMessage.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                <span className="text-[11px] leading-tight">{ocrMessage.text}</span>
              </div>
            )}

            {receiptPhotoUrl ? (
              <div className="relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                <div className="max-h-48 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <img
                    src={receiptPhotoUrl}
                    alt="Ảnh hóa đơn taxi"
                    className="object-contain max-h-48 w-auto"
                  />
                </div>

                {/* Overlay khi AI đang đọc ảnh */}
                {isScanningOcr && (
                  <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3 space-y-2 animate-in fade-in">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>Gemini AI đang bóc tách số tiền & thông tin...</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Tự động trích xuất cước taxi, điểm đón và số hóa đơn
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-900/50 cursor-pointer transition-colors relative">
                <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                  <Upload className="w-4 h-4" />
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 text-center">
                  Tải hoặc chụp ảnh hóa đơn để <strong>AI tự điền số tiền</strong>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Hỗ trợ JPG, PNG, WEBP · Tự động đọc cước xe, điểm đón/trả
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 3. Điểm đón & Điểm trả khách */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                Điểm đón khách <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                placeholder="VD: Trụ sở văn phòng, Hoàn Kiếm"
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                Điểm trả khách <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dropoffPoint}
                onChange={(e) => setDropoffPoint(e.target.value)}
                placeholder="VD: FPT Tower Cầu Giấy"
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 4. Missing receipt checkbox */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isCostMissing}
                onChange={(e) => setIsCostMissing(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>Nhân sự chưa có bill / hóa đơn khi trả thẻ</span>
            </label>
            <div className="text-[11px] text-slate-500 pl-6 mt-0.5">
              Quy tắc: Vẫn cho thu hồi thẻ vào kho, nhưng hệ thống sẽ đánh dấu chi phí là <strong>"Thiếu dữ liệu"</strong>, không coi là 0 đồng.
            </div>
          </div>

          {/* 5. Actual Cost & Receipt Number */}
          {!isCostMissing && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Số tiền thực tế trên bill (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    {ocrSuggested && costNum > 0 && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 border border-blue-200 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Gợi ý từ AI</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required={!isCostMissing}
                      value={actualCostStr ? parseInt(actualCostStr, 10).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setActualCostStr(raw);
                      }}
                      placeholder="VD: 245.000"
                      className="w-full text-xs font-mono font-bold p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 font-sans">
                      VNĐ
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Số hóa đơn / Mã cuống vé
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="VD: ML-094821"
                    className="w-full text-xs font-mono p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* OVER BUDGET WARNING BOX (RULE: Show max allowed, actual, and over amount) */}
              {isOverBudget ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>CẢNH BÁO CHI PHÍ VƯỢT ĐỊNH MỨC CHO PHÉP</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-rose-200 dark:border-rose-800">
                    <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 border border-rose-200">
                      <div className="text-[10px] text-slate-500">Mức quy định:</div>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {maxSpend.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 border border-rose-200">
                      <div className="text-[10px] text-slate-500">Cước thực tế:</div>
                      <div className="font-mono font-bold text-rose-700 dark:text-rose-300">
                        {costNum.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 border border-rose-200">
                      <div className="text-[10px] text-slate-500">Vượt mức:</div>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        +{overBudgetAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                    * Yêu cầu này sau khi lưu sẽ chuyển sang mục <strong>"Vượt mức chờ Admin duyệt"</strong> để Admin thẩm định <strong>Accept</strong> hoặc <strong>Reject</strong> kèm lý do.
                  </div>
                </div>
              ) : costNum > 0 ? (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Chi phí nằm trong định mức tối đa ({maxSpend.toLocaleString('vi-VN')} đ/lượt)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              ) : null}
            </div>
          )}

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold text-xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-colors"
            >
              {isSubmitting ? 'Đang lưu dữ liệu...' : 'Xác nhận thu hồi & Lưu'}
            </button>
          </div>
        </form>

        {/* Modal cấu hình Key OCR */}
        {showKeyModal && (
          <AdminOcrKeyModal
            onClose={() => setShowKeyModal(false)}
            onKeyUpdated={() => setKeyUpdateTick((t) => t + 1)}
          />
        )}
      </div>
    </div>
  );
};
