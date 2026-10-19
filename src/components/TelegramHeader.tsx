import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfileModal } from './UserProfileModal';
import { X, MoreVertical, User, Settings, Globe, Shield, UserCheck, Users } from 'lucide-react';

interface TelegramHeaderProps {
  onOpenSettings?: () => void;
  onOpenWebPortal?: () => void;
  onOpenUserApprovals?: () => void;
  onOpenUserManagement?: () => void;
  pendingUsersCount?: number;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  onOpenSettings,
  onOpenWebPortal,
  onOpenUserApprovals,
  onOpenUserManagement,
  pendingUsersCount = 0,
}) => {
  const { currentUser, config } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAdminOrHR = currentUser.role === 'admin' || currentUser.role === 'admin_hr' || currentUser.role === 'hr';
  const isLeader = currentUser.role === 'leader' || currentUser.isLeader;

  return (
    <>
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

          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95">
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
