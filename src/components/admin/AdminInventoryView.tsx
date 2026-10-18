import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaxiCard, CardStatus, CardCondition } from '../../types';
import { ReturnCardAndBillModal } from './ReturnCardAndBillModal';
import { DirectDispatchModal } from './DirectDispatchModal';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
  ArrowRight,
  User,
  X,
  RotateCcw,
  Search,
  Zap,
} from 'lucide-react';

export const AdminInventoryView: React.FC = () => {
  const { currentUser, cards, requests, addCard, updateCardStatus } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showDirectDispatchModal, setShowDirectDispatchModal] = useState(false);
  const [preselectedCardCode, setPreselectedCardCode] = useState<string | undefined>(undefined);
  const [newCardCode, setNewCardCode] = useState('');
  const [newCardNote, setNewCardNote] = useState('');
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  // Return & bill modal trigger directly from card
  const [selectedReqForReturn, setSelectedReqForReturn] = useState<any | null>(null);

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case 'available':
        return {
          label: 'Trong kho (Sẵn sàng)',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'reserved':
        return {
          label: 'Đã giữ cho yêu cầu',
          color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        };
      case 'in_use':
        return {
          label: 'Đã bàn giao (Đang dùng)',
          color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        };
      case 'damaged':
        return {
          label: 'Hỏng / Tạm khóa',
          color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
      case 'lost':
        return {
          label: 'Mất',
          color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800' };
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  const filteredCards = cards.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const normQ = removeVietnameseTones(searchQuery.trim());
      const assignedNameNorm = c.assignedToName ? removeVietnameseTones(c.assignedToName) : '';
      const noteNorm = c.note ? removeVietnameseTones(c.note) : '';
      return (
        c.code.toLowerCase().includes(q) ||
        assignedNameNorm.includes(normQ) ||
        (c.assignedToCode && c.assignedToCode.toLowerCase().includes(q)) ||
        noteNorm.includes(normQ) ||
        (c.currentRequestId && c.currentRequestId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableCount = cards.filter((c) => c.status === 'available').length;
  const inUseCount = cards.filter((c) => c.status === 'in_use').length;
  const reservedCount = cards.filter((c) => c.status === 'reserved').length;
  const damagedCount = cards.filter((c) => c.status === 'damaged' || c.status === 'lost').length;

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFeedback(null);
    const res = addCard(newCardCode, newCardNote);
    if (res.success) {
      setNewCardCode('');
      setNewCardNote('');
      setShowAddCardModal(false);
    } else {
      setAddFeedback(res.message);
    }
  };

  const handleTriggerReturn = (card: TaxiCard) => {
    const activeReq = requests.find((r) => r.id === card.currentRequestId || (r.status === 'holding_card' && r.actualCardCode === card.code));
    if (activeReq) {
      setSelectedReqForReturn(activeReq);
    } else {
      // Create lightweight synthetic request object if not directly found
      const fallbackReq = {
        id: card.currentRequestId || `REQ-DIRECT-${card.code}`,
        employeeName: card.assignedToName || 'Nhân sự mượn',
        employeeCode: card.assignedToCode || 'NV',
        department: 'Nội bộ',
        purpose: 'Lượt sử dụng thẻ taxi',
        destination: 'Nội thành',
        actualCardCode: card.code,
        status: 'holding_card',
        cardReturned: false,
      };
      setSelectedReqForReturn(fallbackReq);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {/* Top Header & Add Card */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Kho thẻ taxi
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Quản lý mã số thẻ vật lý, trạng thái và lịch sử bàn giao
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPreselectedCardCode(undefined);
              setShowDirectDispatchModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs rounded shadow-xs transition-all cursor-pointer"
            title="Xuất thẻ ngay cho ca khẩn cấp không cần người nhận tạo đơn"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>⚡ Xuất nhanh</span>
          </button>

          <button
            onClick={() => {
              setShowAddCardModal(true);
              setAddFeedback(null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thẻ mới</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="text-[10px] text-emerald-800 dark:text-emerald-300">Trong kho</div>
          <div className="font-mono text-base font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
            {availableCount}
          </div>
        </div>

        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="text-[10px] text-blue-800 dark:text-blue-300">Đã giữ</div>
          <div className="font-mono text-base font-bold text-blue-900 dark:text-blue-100 tabular-nums">
            {reservedCount}
          </div>
        </div>

        <div className="p-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <div className="text-[10px] text-purple-800 dark:text-purple-300">Đang dùng</div>
          <div className="font-mono text-base font-bold text-purple-900 dark:text-purple-100 tabular-nums">
            {inUseCount}
          </div>
        </div>

        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="text-[10px] text-amber-800 dark:text-amber-300">Hỏng/Khóa</div>
          <div className="font-mono text-base font-bold text-amber-900 dark:text-amber-100 tabular-nums">
            {damagedCount}
          </div>
        </div>
      </div>

      {/* Search Bar for Cards */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo mã thẻ (TAXI-xx), tên người giữ, ghi chú..."
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: 'Tất cả thẻ' },
          { key: 'available', label: 'Trong kho' },
          { key: 'in_use', label: 'Đang dùng' },
          { key: 'reserved', label: 'Đã giữ' },
          { key: 'damaged', label: 'Hỏng/Khóa' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-2.5 py-1 font-medium transition-colors border ${
              filterStatus === tab.key
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-blue-600 dark:border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards List */}
      <div className="space-y-2">
        {filteredCards.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Không tìm thấy thẻ nào ở bộ lọc này.
          </div>
        ) : (
          filteredCards.map((card) => {
            const badge = getStatusBadge(card.status);
            return (
              <div
                key={card.id}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs">
                      {card.code.replace('TAXI-', '')}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {card.code}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {card.note || 'Thẻ taxi doanh nghiệp'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-semibold border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Additional holder details if in_use or reserved */}
                {(card.status === 'in_use' || card.status === 'reserved') && card.assignedToName && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>Người giữ: <strong>{card.assignedToName}</strong></span>
                      {card.assignedToCode && <span className="font-mono text-slate-400">({card.assignedToCode})</span>}
                    </div>
                    {card.currentRequestId && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {card.currentRequestId}
                      </span>
                    )}
                  </div>
                )}

                {/* Quick card condition switch or action button */}
                <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Tình trạng:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {card.condition === 'good' && 'Tốt'}
                      {card.condition === 'scratched' && 'Trầy xước'}
                      {card.condition === 'broken' && 'Hỏng dải từ'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* If in_use, direct return trigger button */}
                    {card.status === 'available' && (
                      <button
                        onClick={() => {
                          setPreselectedCardCode(card.code);
                          setShowDirectDispatchModal(true);
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-semibold text-[11px] transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                        title="Xuất nhanh thẻ này tại quầy"
                      >
                        <Zap className="w-3 h-3 fill-white" />
                        <span>Xuất ngay</span>
                      </button>
                    )}

                    {card.status === 'in_use' && (
                      <button
                        onClick={() => handleTriggerReturn(card)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors shadow-xs"
                      >
                        Xác nhận thu hồi
                      </button>
                    )}

                    {/* Damaged card unlock toggle */}
                    {card.status === 'damaged' && (
                      <button
                        onClick={() => updateCardStatus(card.id, 'available', 'Đã kiểm tra lại dải từ hoạt động tốt')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px]"
                      >
                        Mở khóa về kho
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Thêm thẻ taxi vào kho
              </h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addFeedback && (
              <div className="p-2 bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {addFeedback}
              </div>
            )}

            <form onSubmit={handleCreateCard} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Mã số thẻ vật lý <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCardCode}
                  onChange={(e) => setNewCardCode(e.target.value)}
                  placeholder="VD: TAXI-07"
                  className="w-full text-xs font-mono font-bold p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 uppercase text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Ghi chú hãng thẻ / loại thẻ
                </label>
                <input
                  type="text"
                  value={newCardNote}
                  onChange={(e) => setNewCardNote(e.target.value)}
                  placeholder="VD: Mai Linh Express VIP"
                  className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Thêm vào kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return & Bill modal if triggered */}
      {selectedReqForReturn && (
        <ReturnCardAndBillModal
          request={selectedReqForReturn}
          onClose={() => setSelectedReqForReturn(null)}
          onSuccess={() => setSelectedReqForReturn(null)}
        />
      )}

      {/* Direct Dispatch Modal (Ý tưởng 1: Xuất thẻ nhanh tại quầy) */}
      <DirectDispatchModal
        isOpen={showDirectDispatchModal}
        preselectedCardCode={preselectedCardCode}
        onClose={() => {
          setShowDirectDispatchModal(false);
          setPreselectedCardCode(undefined);
        }}
        onSuccess={() => {
          setShowDirectDispatchModal(false);
          setPreselectedCardCode(undefined);
        }}
      />
    </div>
  );
};
