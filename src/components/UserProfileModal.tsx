import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, CheckCircle2, AlertCircle, X, Send, Pencil, Check } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editCode, setEditCode] = useState(currentUser.code);
  const [editDepartment, setEditDepartment] = useState(currentUser.department);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditName(currentUser.name);
      setEditCode(currentUser.code);
      setEditDepartment(currentUser.department);
      setIsEditing(false);
      setFeedback(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!editName.trim()) {
      setFeedback({ success: false, message: 'Họ và tên không được để trống!' });
      return;
    }
    if (!editCode.trim()) {
      setFeedback({ success: false, message: 'Mã nhân sự không được để trống!' });
      return;
    }
    if (!editDepartment.trim()) {
      setFeedback({ success: false, message: 'Vui lòng nhập Bộ phận / Phòng ban!' });
      return;
    }

    setSaving(true);
    const res = await updateUserProfile(currentUser.id, {
      name: editName.trim(),
      code: editCode.trim().toUpperCase(),
      department: editDepartment.trim(),
    });
    setSaving(false);

    if (res.success) {
      setFeedback({ success: true, message: 'Đã cập nhật và lưu hồ sơ thành công!' });
      setIsEditing(false);
    } else {
      setFeedback({ success: false, message: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {currentUser.name ? currentUser.name.charAt(0) : 'U'}
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

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mt-3 p-2.5 text-xs flex items-center gap-2 border rounded ${
              feedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content: View Mode or Edit Mode */}
        {isEditing ? (
          <form onSubmit={handleSave} className="py-4 space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="VD: Van Cao - CCL"
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mã nhân sự <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="VD: ADMIN-01"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Vai trò (Cố định)
                </label>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium truncate">
                  {currentUser.role === 'admin_hr'
                    ? 'Admin kiêm HR'
                    : currentUser.role === 'leader'
                    ? 'Leader'
                    : currentUser.role === 'admin'
                    ? 'Admin'
                    : currentUser.role === 'pending'
                    ? 'Đang chờ duyệt'
                    : currentUser.role === 'rejected'
                    ? 'Bị từ chối'
                    : currentUser.role === 'unregistered'
                    ? 'Chưa đăng ký'
                    : 'Nhân sự'}
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Bộ phận / Phòng ban <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="Nhập tên Bộ phận / Phòng ban của bạn..."
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFeedback(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="py-4 space-y-3 text-sm">
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Họ và tên
              </label>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {currentUser.name || '(Chưa cập nhật)'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                  Mã nhân sự
                </label>
                <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {currentUser.code || '(Chưa có)'}
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
                  {currentUser.role === 'pending' && 'Đang chờ Admin duyệt'}
                  {currentUser.role === 'rejected' && 'Chưa được cấp phép'}
                  {currentUser.role === 'unregistered' && 'Chưa đăng ký'}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Bộ phận / Phòng ban
              </label>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {currentUser.department || '(Chưa cập nhật phòng ban)'}
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
                      {currentUser.telegramUsername || '@chua_co_username'}
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

            {/* Footer buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
