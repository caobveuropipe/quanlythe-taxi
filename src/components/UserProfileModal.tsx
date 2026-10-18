import React from 'react';
import { useApp } from '../context/AppContext';
import { User, CheckCircle2, AlertCircle, X, Shield, Send } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Hồ sơ nhân sự
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Thông tin định danh Telegram Mini App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Only shows Name, Employee Code, Department, Telegram Linked Status */}
        <div className="py-4 space-y-3 text-sm">
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              Họ và tên
            </label>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {currentUser.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Mã nhân sự
              </label>
              <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {currentUser.code}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Vai trò hệ thống
              </label>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {currentUser.role === 'employee' && 'Nhân sự'}
                {currentUser.role === 'leader' && 'Leader duyệt'}
                {currentUser.role === 'admin' && 'Admin'}
                {currentUser.role === 'hr' && 'HR Vận hành'}
                {currentUser.role === 'admin_hr' && 'Admin kiêm HR'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
              Bộ phận / Phòng ban
            </label>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {currentUser.department}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Trạng thái liên kết Telegram
            </label>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {currentUser.telegramUsername}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {currentUser.telegramId}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã liên kết</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs transition-colors"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};
