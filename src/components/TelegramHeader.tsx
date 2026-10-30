import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfileModal } from './UserProfileModal';
import {
  MoreVertical,
  User,
  Settings,
  Globe,
  UserCheck,
  Users,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface TelegramHeaderProps {
  onOpenSettings?: () => void;
  onOpenWebPortal?: () => void;
  onOpenUserApprovals?: () => void;
  onOpenUserManagement?: () => void;
  pendingUsersCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  onOpenSettings,
  onOpenWebPortal,
  onOpenUserApprovals,
  onOpenUserManagement,
  pendingUsersCount = 0,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { currentUser } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAdminOrHR =
    currentUser.role === 'admin' || currentUser.role === 'admin_hr' || currentUser.role === 'hr';

  return (
    <>
      {/* Header mờ kính (Glassmorphism) tinh gọn - Phong cách Floating Dock */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 px-3.5 py-2 flex items-center justify-between transition-colors">
        {/* User Pill Button (Click để xem hồ sơ) */}
        <button
          onClick={() => setShowProfile(true)}
          title="Nhấn để xem thông tin hồ sơ của bạn"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity text-left group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-1 ring-white/20 flex-shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="leading-tight min-w-0">
            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-500 transition-colors">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
              <span>{currentUser.department || 'VCC'}</span>
              <span>•</span>
              <span>{currentUser.code}</span>
            </span>
          </div>
        </button>

        {/* Right: Actions & 3-dots Menu */}
        <div className="flex items-center gap-1 relative">
          {isAdminOrHR && pendingUsersCount > 0 && (
            <button
              onClick={() => onOpenUserApprovals?.()}
              title="Có thành viên mới chờ duyệt"
              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full flex items-center gap-1 shadow-sm animate-pulse"
            >
              <UserCheck className="w-3 h-3" />
              <span>Duyệt ({pendingUsersCount})</span>
            </button>
          )}

          {/* Nút mở rộng / thu gọn - chỉ hiện trên màn hình PC */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title={isExpanded ? 'Thu gọn về dạng Mini App' : 'Mở rộng giao diện PC'}
              className="hidden lg:flex h-8 px-2 items-center gap-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
            </button>
          )}

          <button
            onClick={() => setShowMenu(!showMenu)}
            title="Menu tùy chọn"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 text-xs z-50 rounded-xl animate-in fade-in zoom-in-95">
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
          )}
        </div>
      </header>

      {/* User profile modal */}
      <UserProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
};
