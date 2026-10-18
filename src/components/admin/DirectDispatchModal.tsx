import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Zap, CreditCard, User, MapPin, Tag, FileText, CheckCircle2 } from 'lucide-react';

interface DirectDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCardCode?: string;
  onSuccess?: (requestId: string) => void;
}

export const DirectDispatchModal: React.FC<DirectDispatchModalProps> = ({
  isOpen,
  onClose,
  preselectedCardCode,
  onSuccess,
}) => {
  const { cards, users, directDispatchCard } = useApp();

  const availableCards = cards.filter((c) => c.status === 'available');

  const [selectedCard, setSelectedCard] = useState<string>('');
  const [recipientType, setRecipientType] = useState<'employee' | 'custom'>('employee');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [clientTag, setClientTag] = useState('Cấp khẩn cấp tại quầy');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedCardCode && availableCards.some((c) => c.code === preselectedCardCode)) {
        setSelectedCard(preselectedCardCode);
      } else if (availableCards.length > 0) {
        setSelectedCard(availableCards[0].code);
      } else {
        setSelectedCard('');
      }

      if (users.length > 0) {
        setSelectedUserId(users[0].id);
      }
      setError(null);
    }
  }, [isOpen, preselectedCardCode, cards]);

  if (!isOpen) return null;

  const quickPresets = [
    { label: 'Sếp cần xe gấp', purpose: 'Lãnh đạo đi công tác đột xuất', tag: 'Ưu tiên Lãnh đạo' },
    { label: 'Đón khách VIP sân bay', purpose: 'Đón đoàn đối tác VIP tại sân bay', tag: 'Đối tác VIP' },
    { label: 'Sự cố công trường', purpose: 'Xử lý sự cố kỹ thuật khẩn cấp', tag: 'Kỹ thuật khẩn cấp' },
    { label: 'Cơ quan nhà nước', purpose: 'Họp đột xuất tại cơ quan ban ngành', tag: 'Cơ quan nhà nước' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCard) {
      setError('Kho hiện không có thẻ nào ở trạng thái sẵn sàng để xuất.');
      return;
    }

    let recipientName = '';
    let recipientCode: string | undefined;
    let department: string | undefined;

    if (recipientType === 'employee') {
      const u = users.find((usr) => usr.id === selectedUserId);
      if (!u) {
        setError('Vui lòng chọn nhân viên nhận thẻ.');
        return;
      }
      recipientName = u.name;
      recipientCode = u.code;
      department = u.department;
    } else {
      if (!customName.trim()) {
        setError('Vui lòng nhập tên người nhận thẻ.');
        return;
      }
      recipientName = customName.trim();
      recipientCode = customCode.trim() || undefined;
      department = customDepartment.trim() || undefined;
    }

    if (!purpose.trim()) {
      setError('Vui lòng nhập mục đích sử dụng thẻ.');
      return;
    }

    const res = directDispatchCard({
      cardCode: selectedCard,
      recipientName,
      recipientCode,
      department,
      purpose: purpose.trim(),
      destination: destination.trim() || 'Linh hoạt theo chuyến',
      clientTag: clientTag.trim() || 'Cấp khẩn cấp tại quầy',
    });

    if (res.success && res.requestId) {
      if (onSuccess) onSuccess(res.requestId);
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded">
              <Zap className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Xuất thẻ nhanh trực tiếp tại quầy</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cấp ngay cho ca khẩn cấp không cần người nhận tạo đơn trước
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Chọn thẻ rảnh */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span>Chọn thẻ vật lý xuất ngay (Thẻ rảnh trong kho)</span>
              <span className="text-rose-500">*</span>
            </label>
            {availableCards.length === 0 ? (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                Kho hiện không có thẻ nào sẵn sàng. Vui lòng thu hồi thẻ đang dùng trước khi xuất nhanh.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableCards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCard(c.code)}
                    className={`p-2 border text-xs font-mono font-bold rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedCard === c.code
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{c.code}</span>
                    <span className="text-[9.5px] font-sans font-normal text-emerald-600 dark:text-emerald-400">
                      Sẵn sàng
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Chọn người nhận */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Người nhận thẻ</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-normal">
                <button
                  type="button"
                  onClick={() => setRecipientType('employee')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    recipientType === 'employee'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Nhân viên có sẵn
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('custom')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    recipientType === 'custom'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Khách / Nhập tự do
                </button>
              </span>
            </label>

            {recipientType === 'employee' ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code} - {u.department})
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs">
                <div>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mb-0.5">
                    Họ & tên người nhận *
                  </span>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="VD: Đoàn chuyên gia Hàn Quốc / Sếp Tổng..."
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mb-0.5">
                      Mã định danh (tùy chọn)
                    </span>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      placeholder="Mặc định: GUEST"
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mb-0.5">
                      Bộ phận / Đơn vị
                    </span>
                    <input
                      type="text"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Khách ngoài / Đột xuất"
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Lý do & Mục đích nhanh */}
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Mục đích & Lý do chuyến đi</span>
                <span className="text-rose-500">*</span>
              </span>
            </label>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {quickPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPurpose(p.purpose);
                    setClientTag(p.tag);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  ⚡ {p.label}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Nhập mục đích chuyến đi khẩn cấp..."
              className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* 4. Điểm đến & Nhãn khách */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Điểm đến</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="VD: Sân bay Nội Bài / Tỉnh..."
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Nhãn phân loại</span>
              </label>
              <input
                type="text"
                value={clientTag}
                onChange={(e) => setClientTag(e.target.value)}
                placeholder="Cấp khẩn cấp tại quầy"
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded text-[11px] text-blue-900 dark:text-blue-200">
            ℹ️ <strong>Quy trình:</strong> Hệ thống tự động sinh mã đơn <code>REQ-DIRECT-xxx</code>, gán thẻ và chuyển thẳng sang trạng thái <strong>Đang giữ thẻ</strong>. Khi về, người nhận vẫn thực hiện trả thẻ và thu bill theo luồng chuẩn.
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={availableCards.length === 0}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Xác nhận cấp ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
