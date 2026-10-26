import React, { useState } from 'react';
import { Palette, Check, X, Sparkles, LayoutGrid, Smartphone, ChevronUp, ChevronDown } from 'lucide-react';

export type LayoutVariant = 'default' | 'opt1_compact' | 'opt2_toptabs' | 'opt3_floating';

export interface LayoutOption {
  id: LayoutVariant;
  name: string;
  badge: string;
  desc: string;
  tagline: string;
  iconBg: string;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'default',
    name: 'Gốc (Hiện tại)',
    badge: 'Mặc định',
    desc: 'Header 2 tầng (nút X, tên app), thanh Bottom Nav dày 56px với icon trên chữ dưới.',
    tagline: 'Giữ nguyên trạng thái ban đầu của hệ thống.',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  {
    id: 'opt1_compact',
    name: 'Option 1: Siêu tinh gọn',
    badge: 'Khuyên dùng',
    desc: 'Header Pill mỏng 36px (bỏ nút X thừa), Bottom Bar mỏng 42px (icon + chữ ngang). Tiết kiệm ~65px.',
    tagline: 'Cân bằng hoàn hảo giữa diện tích và thao tác quen thuộc.',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'opt2_toptabs',
    name: 'Option 2: Top Tabs (Segmented)',
    badge: 'Không có đáy',
    desc: 'Tabs đưa lên đầu dạng gạt iOS/macOS. BỎ HOÀN TOÀN thanh chân trang, chân màn hình phẳng lì!',
    tagline: 'Giải phóng 100% diện tích đáy màn hình.',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'opt3_floating',
    name: 'Option 3: Floating Dock',
    badge: 'Hiện đại',
    desc: 'Header tối giản mờ kính, thanh điều hướng nổi (Island Dock) lơ lửng cách đáy bo tròn mềm mại.',
    tagline: 'Trải nghiệm giao diện nổi Dynamic Island / macOS.',
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
  },
];

interface LayoutVariantSwitcherProps {
  currentVariant: LayoutVariant;
  onSelectVariant: (variant: LayoutVariant) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const LayoutVariantSwitcher: React.FC<LayoutVariantSwitcherProps> = ({
  currentVariant,
  onSelectVariant,
  isOpenModal,
  onCloseModal,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenModal !== undefined ? isOpenModal : internalOpen;
  const setOpen = (val: boolean) => {
    if (onCloseModal && !val) onCloseModal();
    setInternalOpen(val);
  };

  const currentOption = LAYOUT_OPTIONS.find((o) => o.id === currentVariant) || LAYOUT_OPTIONS[0];

  return (
    <>
      {/* Floating Trigger Button (Góc dưới bên trái, không đè nút chính) */}
      {isOpenModal === undefined && (
        <div className="fixed bottom-4 left-4 z-50 select-none">
          <button
            onClick={() => setOpen(!isOpen)}
            title="Nhấn để đổi kiểu giao diện xem thử"
            className="group flex items-center gap-2 px-3 py-2 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 rounded-full shadow-2xl backdrop-blur-md border border-slate-700/50 dark:border-slate-300/50 hover:scale-105 active:scale-95 transition-all text-xs font-semibold"
          >
            <Palette className="w-4 h-4 text-amber-400 dark:text-amber-600 animate-spin-slow" />
            <span className="hidden sm:inline">Giao diện:</span>
            <span className="max-w-[130px] truncate text-[11px] text-amber-300 dark:text-amber-700">
              {currentOption.name.replace(/Option \d: /, '')}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] bg-amber-400/20 text-amber-300 dark:text-amber-800 rounded font-bold uppercase">
              Đổi
            </span>
          </button>
        </div>
      )}

      {/* Switcher Modal / Popover */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Thử nghiệm Giao diện
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-medium">
                      4 Tuỳ chọn
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bấm vào từng kiểu để trải nghiệm thực tế ngay lập tức
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List options */}
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {LAYOUT_OPTIONS.map((opt) => {
                const isSelected = currentVariant === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onSelectVariant(opt.id);
                      setOpen(false);
                    }}
                    className={`cursor-pointer rounded-xl p-3 border transition-all text-left flex items-start gap-3 relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs ${opt.iconBg}`}
                    >
                      {opt.id === 'default' && <LayoutGrid className="w-4 h-4" />}
                      {opt.id === 'opt1_compact' && <Smartphone className="w-4 h-4" />}
                      {opt.id === 'opt2_toptabs' && <ChevronUp className="w-4 h-4" />}
                      {opt.id === 'opt3_floating' && <Sparkles className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {opt.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mb-1">
                        {opt.desc}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                        {opt.tagline}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Tự động lưu vào trình duyệt của anh
              </span>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Đóng / Trải nghiệm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
