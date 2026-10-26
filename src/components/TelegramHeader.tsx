import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfileModal } from './UserProfileModal';
import { LayoutVariant } from './common/LayoutVariantSwitcher';
import {
  X,
  MoreVertical,
  User,
  Settings,
  Globe,
  UserCheck,
  Users,
  Palette,
  Shield,
  Briefcase,
} from 'lucide-react';

interface TelegramHeaderProps {
  onOpenSettings?: () => void;
  onOpenWebPortal?: () => void;
  onOpenUserApprovals?: () => void;
  onOpenUserManagement?: () => void;
  onOpenLayoutSwitcher?: () => void;
  pendingUsersCount?: number;
  layoutVariant?: LayoutVariant;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  onOpenSettings,
  onOpenWebPortal,
  onOpenUserApprovals,
  onOpenUserManagement,
  onOpenLayoutSwitcher,
  pendingUsersCount = 0,
  layoutVariant = 'default',
}) => {
  const { currentUser } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAdminOrHR =
    currentUser.role === 'admin' || currentUser.role === 'admin_hr' || currentUser.role === 'hr';

  // -------------------------------------------------------------
  // RENDER HEADER THEO TỪNG OPTION GIAO DIỆN
  // -------------------------------------------------------------

  return (
    <>
      {/* ========================================================
          OPTION 0 (MẶC ĐỊNH GỐC): Giữ nguyên 100% giao diện ban đầu
          ======================================================== */}
      {layoutVariant === 'default' && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between transition-colors">
          {/* Left: Close icon & App Identity */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                // Simulated Telegram back/close
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Đóng Mini App"
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  TaxiCard
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  · Nội bộ
                </span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <span>{currentUser.name}</span>
                <span>•</span>
                <span className="font-mono">{currentUser.code}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions, Profile Icon button and 3-dots menu */}
          <div className="flex items-center gap-1 relative">
            {isAdminOrHR && pendingUsersCount > 0 && (
              <button
                onClick={() => onOpenUserApprovals?.()}
                title="Có thành viên mới chờ duyệt"
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded flex items-center gap-1 animate-pulse"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Duyệt ({pendingUsersCount})</span>
              </button>
            )}

            {/* Profile Icon button */}
            <button
              onClick={() => setShowProfile(true)}
              title="Xem hồ sơ nhân sự"
              className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <User className="w-4 h-4" />
            </button>

            {/* 3-dots Menu for secondary options */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Tùy chọn khác"
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {renderDropdownMenu()}
          </div>
        </header>
      )}

      {/* ========================================================
          OPTION 1: SIÊU TINH GỌN (ULTRA-COMPACT PILL)
          - Chiều cao mỏng ~38px
          - Bỏ nút X vô dụng
          - Bỏ chữ to TaxiCard (vì Telegram desktop đã có tiêu đề)
          - User Pill nhỏ gọn click mở Profile
          ======================================================== */}
      {layoutVariant === 'opt1_compact' && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between transition-colors">
          {/* User Pill Button (Click để mở Hồ sơ) */}
          <button
            onClick={() => setShowProfile(true)}
            title="Nhấn để xem thông tin hồ sơ của bạn"
            className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-full transition-all group max-w-[260px] text-left"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex items-center gap-1.5 min-w-0 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {currentUser.code}
              </span>
            </div>
          </button>

          {/* Right: Actions & Menu */}
          <div className="flex items-center gap-1 relative">
            {isAdminOrHR && pendingUsersCount > 0 && (
              <button
                onClick={() => onOpenUserApprovals?.()}
                title="Có thành viên mới chờ duyệt"
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full flex items-center gap-1 shadow-sm"
              >
                <UserCheck className="w-3 h-3" />
                <span>Duyệt ({pendingUsersCount})</span>
              </button>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Menu tùy chọn"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {renderDropdownMenu()}
          </div>
        </header>
      )}

      {/* ========================================================
          OPTION 2: TOP TABS - HEADER THÔNG TIN RÚT GỌN (34px)
          - Phía trên chỉ có 1 thanh mỏng hiển thị người dùng và menu
          - Các Tabs sẽ nằm ngay dưới dạng Segmented Control
          ======================================================== */}
      {layoutVariant === 'opt2_toptabs' && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 pt-2 pb-1 flex items-center justify-between transition-colors">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold">{currentUser.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({currentUser.code})</span>
          </button>

          <div className="flex items-center gap-1 relative">
            {isAdminOrHR && pendingUsersCount > 0 && (
              <button
                onClick={() => onOpenUserApprovals?.()}
                className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-full flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                <span>{pendingUsersCount}</span>
              </button>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {renderDropdownMenu()}
          </div>
        </header>
      )}

      {/* ========================================================
          OPTION 3: FLOATING DOCK - HEADER MỜ KÍNH TỐI GIẢN (36px)
          - Bo nhẹ góc, không viền cộm, phong cách iOS/macOS
          ======================================================== */}
      {layoutVariant === 'opt3_floating' && (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-800/50 px-3.5 py-2 flex items-center justify-between transition-all">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left leading-none">
              <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {currentUser.department || 'VCC'} • {currentUser.code}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 relative">
            {isAdminOrHR && pendingUsersCount > 0 && (
              <button
                onClick={() => onOpenUserApprovals?.()}
                className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-full flex items-center gap-1"
              >
                <span>Duyệt {pendingUsersCount}</span>
              </button>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {renderDropdownMenu()}
          </div>
        </header>
      )}

      {/* Modal Profile dùng chung */}
      <UserProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );

  // Helper hàm render Dropdown Menu chung
  function renderDropdownMenu() {
    if (!showMenu) return null;
    return (
      <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 text-xs z-50 rounded-xl animate-in fade-in zoom-in-95">
        {/* Nút đổi giao diện nổi bật trong menu */}
        <button
          onClick={() => {
            setShowMenu(false);
            onOpenLayoutSwitcher?.();
          }}
          className="w-full text-left px-3 py-2 flex items-center justify-between bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium border-b border-amber-200/50 dark:border-amber-800/50"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Thử nghiệm 4 giao diện</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-white rounded font-bold uppercase">
            Mới
          </span>
        </button>

        {isAdminOrHR && (
          <>
            <button
              onClick={() => {
                setShowMenu(false);
                onOpenUserApprovals?.();
              }}
              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Duyệt thành viên</span>
              </div>
              {pendingUsersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white font-bold text-[9px] rounded-full">
                  {pendingUsersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenUserManagement?.();
              }}
              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Quản lý & Phân quyền</span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenSettings?.();
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Thiết lập hệ thống</span>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenWebPortal?.();
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Cổng chờ Web Admin</span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            setShowMenu(false);
            setShowProfile(true);
          }}
          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>Xem hồ sơ liên kết</span>
        </button>
      </div>
    );
  }
};
