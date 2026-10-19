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
  Pencil,
  Trash2,
} from 'lucide-react';

export const AdminInventoryView: React.FC = () => {
  const { currentUser, cards, requests, addCard, editCard, deleteCard, updateCardStatus, releaseCardDirectly } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showDirectDispatchModal, setShowDirectDispatchModal] = useState(false);
  const [preselectedCardCode, setPreselectedCardCode] = useState<string | undefined>(undefined);
  const [newCardCode, setNewCardCode] = useState('');
  const [newCardNote, setNewCardNote] = useState('');
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  // Edit card state
  const [editingCard, setEditingCard] = useState<TaxiCard | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCondition, setEditCondition] = useState<CardCondition>('good');
  const [editStatus, setEditStatus] = useState<CardStatus>('available');

  // Delete card confirmation state
  const [deletingCard, setDeletingCard] = useState<TaxiCard | null>(null);

  // Release reserved card confirmation state
  const [releasingCard, setReleasingCard] = useState<TaxiCard | null>(null);
  const [releaseFeedback, setReleaseFeedback] = useState<{ success: boolean; message: string } | null>(null);

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
    if (filterStatus !== 'all') {
      if (filterStatus === 'damaged') {
        if (c.status !== 'damaged' && c.status !== 'lost') return false;
      } else if (c.status !== filterStatus) {
        return false;
      }
    }
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

      {/* Global Feedback Banner */}
      {releaseFeedback && (
        <div
          className={`p-2.5 text-xs flex items-center justify-between border ${
            releaseFeedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {releaseFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{releaseFeedback.message}</span>
          </div>
          <button onClick={() => setReleaseFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hàng thống kê kiêm bộ lọc tích hợp 5 trạng thái (Gộp làm 1, bấm trực tiếp để lọc thẻ) */}
      <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
        {[
          {
            key: 'all',
            label: 'Tất cả thẻ',
            count: cards.length,
            activeColor: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 ring-2 ring-slate-400 dark:ring-slate-300',
            defaultColor: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-800 hover:border-slate-400',
          },
          {
            key: 'available',
            label: 'Trong kho',
            count: availableCount,
            activeColor: 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400',
            defaultColor: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800 hover:border-emerald-400',
          },
          {
            key: 'reserved',
            label: 'Đã giữ',
            count: reservedCount,
            activeColor: 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400',
            defaultColor: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800 hover:border-emerald-400',
          },
          {
            key: 'in_use',
            label: 'Đang dùng',
            count: inUseCount,
            activeColor: 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-400',
            defaultColor: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800 hover:border-purple-400',
          },
          {
            key: 'damaged',
            label: 'Hỏng/Khóa',
            count: damagedCount,
            activeColor: 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400',
            defaultColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800 hover:border-amber-400',
          },
        ].map((item) => {
          const isSelected = filterStatus === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilterStatus(item.key)}
              className={`p-1.5 sm:p-2 border rounded transition-all cursor-pointer flex flex-col items-center justify-center select-none ${
                isSelected
                  ? `${item.activeColor} font-bold shadow-xs`
                  : `${item.defaultColor}`
              }`}
            >
              <div className={`text-[10px] leading-tight truncate w-full ${isSelected ? 'opacity-90' : 'opacity-80'}`}>
                {item.label}
              </div>
              <div className="font-mono text-sm sm:text-base font-bold tabular-nums mt-0.5">
                {item.count}
              </div>
            </button>
          );
        })}
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

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>

                    {/* Edit card button */}
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setEditCode(card.code);
                        setEditNote(card.note || '');
                        setEditCondition(card.condition);
                        setEditStatus(card.status);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Sửa thông tin thẻ"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete card button (only if not currently assigned) */}
                    {card.status !== 'in_use' && card.status !== 'reserved' && (
                      <button
                        onClick={() => setDeletingCard(card)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Xóa thẻ khỏi kho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

                    {/* Reserved card: Nhả thẻ về kho */}
                    {card.status === 'reserved' && (
                      <button
                        onClick={() => setReleasingCard(card)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 font-bold text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-98"
                        title="Giải phóng thẻ này về kho (Hủy lượt giữ)"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                        <span>Nhả thẻ</span>
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

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <Pencil className="w-4 h-4 text-blue-500" />
                <span>Chỉnh sửa thông tin thẻ {editingCard.code}</span>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editCode.trim()) return;
                const res = editCard(editingCard.id, {
                  code: editCode.trim().toUpperCase(),
                  note: editNote.trim(),
                  condition: editCondition,
                  status: editStatus,
                });
                if (res.success) {
                  setEditingCard(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Mã thẻ vật lý
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full p-2 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white uppercase"
                  placeholder="VD: TAXI-01"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Ghi chú hãng xe / loại thẻ
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="VD: Mai Linh Taxi VIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Tình trạng vật lý
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value as CardCondition)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="good">Tốt</option>
                    <option value="scratched">Trầy xước</option>
                    <option value="broken">Hỏng dải từ</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Trạng thái kho
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CardStatus)}
                    disabled={editingCard.status === 'in_use'}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="available">Sẵn sàng (Kho)</option>
                    <option value="damaged">Hỏng / Tạm khóa</option>
                    <option value="lost">Mất thẻ</option>
                    {editingCard.status === 'in_use' && <option value="in_use">Đang dùng</option>}
                    {editingCard.status === 'reserved' && <option value="reserved">Đã giữ</option>}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {deletingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Xác nhận xóa thẻ {deletingCard.code}?</span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-normal">
              Bạn có chắc chắn muốn xóa vĩnh viễn thẻ <strong className="text-slate-900 dark:text-white font-mono">{deletingCard.code}</strong> khỏi hệ thống kho? Hành động này sẽ được đồng bộ xóa trên CSDL Supabase.
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingCard(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded"
              >
                Không xóa
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCard(deletingCard.id);
                  setDeletingCard(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Reserved Card Confirmation Modal */}
      {releasingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Giải phóng thẻ {releasingCard.code} về kho?</span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-normal">
              Thẻ <strong className="text-slate-900 dark:text-white font-mono">{releasingCard.code}</strong> hiện đang được giữ cho <strong>{releasingCard.assignedToName || 'yêu cầu mượn thẻ'}</strong> {releasingCard.currentRequestId && `(${releasingCard.currentRequestId})`}.
              <br /><br />
              Khi xác nhận, thẻ này sẽ được <strong>hủy giữ và đưa về kho sẵn sàng</strong>. Nếu có nhân sự khác trong hàng chờ, hệ thống sẽ tự động cấp thẻ này cho họ.
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReleasingCard(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = releaseCardDirectly(releasingCard.id);
                  setReleaseFeedback(res);
                  setReleasingCard(null);
                  setTimeout(() => setReleaseFeedback(null), 3500);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs"
              >
                Xác nhận nhả thẻ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

