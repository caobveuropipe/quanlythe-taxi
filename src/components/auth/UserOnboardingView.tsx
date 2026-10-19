import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, AlertCircle, ShieldAlert, Send, UserPlus, CheckCircle2, Pencil, RotateCcw } from 'lucide-react';

interface UserOnboardingViewProps {
  onSuccess?: () => void;
}

export const UserOnboardingView: React.FC<UserOnboardingViewProps> = ({ onSuccess }) => {
  const { currentUser, registerUser, resetToNewRegistration } = useApp();

  // Telegram auto-detected identity if running in Telegram WebApp
  const tgUser = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string; last_name?: string } } } } }).Telegram?.WebApp?.initDataUnsafe?.user;

  const defaultTelegramId = tgUser?.id ? String(tgUser.id) : (currentUser?.telegramId || '');
  const defaultTelegramUsername = tgUser?.username ? `@${tgUser.username}` : (currentUser?.telegramUsername || '');

  // Track if user is in explicit edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [code, setCode] = useState(
    currentUser?.code && currentUser.code !== 'NV-1024' ? currentUser.code : ''
  );
  const [name, setName] = useState(
    currentUser?.name && currentUser.name !== 'Nguyễn Văn A' && currentUser.name !== 'Người dùng mới'
      ? currentUser.name
      : (tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : '')
  );
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [leaderName, setLeaderName] = useState(currentUser?.leaderName || '');
  const [telegramId, setTelegramId] = useState(defaultTelegramId);
  const [telegramUsername, setTelegramUsername] = useState(defaultTelegramUsername);

  // Validation errors & feedback
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Sync inputs whenever currentUser changes or user opens editing mode
  useEffect(() => {
    if (currentUser) {
      if (currentUser.code) setCode(currentUser.code);
      if (currentUser.name && currentUser.name !== 'Người dùng mới') setName(currentUser.name);
      if (currentUser.department) setDepartment(currentUser.department);
      if (currentUser.leaderName) setLeaderName(currentUser.leaderName);
      if (currentUser.telegramId) setTelegramId(currentUser.telegramId);
      if (currentUser.telegramUsername) setTelegramUsername(currentUser.telegramUsername);
    }
  }, [currentUser, isEditing]);

  const hasSubmittedProfile = Boolean(
    currentUser?.code && currentUser.code.trim().length > 0 && currentUser.role !== 'unregistered'
  );
  const isPending = currentUser?.role === 'pending';
  const isRejected = currentUser?.role === 'rejected';

  // If user hasn't declared their profile yet, OR is actively editing -> SHOW FORM DIRECTLY
  const shouldShowForm = !hasSubmittedProfile || isEditing;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!code.trim()) {
      newErrors.code = 'Vui lòng cung cấp Mã nhân sự (VD: NV-1024 hoặc mã chấm công)';
    }
    if (!name.trim()) {
      newErrors.name = 'Vui lòng cung cấp Họ và tên';
    }
    if (!department.trim()) {
      newErrors.department = 'Vui lòng chọn hoặc nhập Bộ phận / Phòng ban';
    }
    if (!leaderName.trim()) {
      newErrors.leaderName = 'Vui lòng cung cấp Họ và tên Leader duyệt trực tiếp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await registerUser({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department: department.trim(),
        leaderName: leaderName.trim(),
        telegramId: telegramId.trim() || undefined,
        telegramUsername: telegramUsername.trim() || undefined,
      });

      if (res.success) {
        setSubmitFeedback(res.message);
        setIsEditing(false); // Return to pending waiting screen with updated details
        if (onSuccess) onSuccess();
      } else {
        setErrors({ form: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    setSubmitFeedback(null);
    setErrors({});
  };

  const handleResetToNew = () => {
    resetToNewRegistration();
    setCode('');
    setDepartment('');
    setLeaderName('');
    setIsEditing(true);
    setSubmitFeedback(null);
    setErrors({});
  };

  // 1. STATE: WAITING FOR ADMIN APPROVAL (Has profile submitted, not editing)
  if (!shouldShowForm && isPending) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Hồ sơ đang chờ Admin phê duyệt
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Thông tin của bạn đã được gửi tới Quản trị viên. Bot sẽ thông báo ngay khi tài khoản được kích hoạt.
          </p>
        </div>

        {submitFeedback && (
          <div className="w-full max-w-sm p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{submitFeedback}</span>
          </div>
        )}

        {/* Registered details card */}
        <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Họ và tên:</span>
            <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Mã nhân sự:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{currentUser.code}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Phòng ban:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{currentUser.department}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Leader duyệt:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{currentUser.leaderName || 'Đang cập nhật'}</span>
          </div>
          {currentUser.telegramId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Telegram ID:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{currentUser.telegramId}</span>
            </div>
          )}
        </div>

        {/* One-time declaration notice */}
        <p className="text-[11px] text-slate-400 max-w-xs">
          💡 Bạn chỉ cần khai báo thông tin một lần duy nhất. Sau khi Admin kích hoạt, bạn sẽ vào thẳng giao diện đặt thẻ taxi.
        </p>

        {/* Action buttons */}
        <div className="pt-2 flex flex-col items-center gap-2 w-full max-w-sm">
          <button
            onClick={handleStartEditing}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Chỉnh sửa lại thông tin</span>
          </button>

          <button
            onClick={handleResetToNew}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 pt-1 font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Khai báo lại thông tin mới từ đầu</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. STATE: REJECTED (Has profile rejected, not editing)
  if (!shouldShowForm && isRejected) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Yêu cầu chưa được phê duyệt
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Hồ sơ nhân sự của bạn chưa được Quản trị viên duyệt cấp quyền. Vui lòng liên hệ Admin hoặc điều chỉnh lại thông tin chính xác.
          </p>
        </div>

        <button
          onClick={handleStartEditing}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Đăng ký / Chỉnh sửa lại thông tin</span>
        </button>
      </div>
    );
  }

  // 3. STATE: REGISTRATION / EDIT FORM (Shown immediately for new users or upon editing)
  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
          {hasSubmittedProfile ? <Pencil className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {hasSubmittedProfile ? 'Chỉnh sửa thông tin hồ sơ' : 'Khai báo thông tin nhân sự'}
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {hasSubmittedProfile
            ? 'Cập nhật thông tin định danh để gửi lại cho Quản trị viên xét duyệt'
            : 'Chỉ cần khai báo 1 lần duy nhất để bắt đầu sử dụng Hệ thống Thẻ Taxi'}
        </p>
      </div>

      {errors.form && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      {submitFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitFeedback}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
        {/* 1. Họ và tên */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            1. Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Ví dụ: Nguyễn Văn A"
            className={`w-full p-2.5 bg-white dark:bg-slate-800 border ${
              errors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium`}
          />
          {errors.name && (
            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* 2. Mã nhân sự */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            2. Mã nhân sự <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="Ví dụ: NV-1024 hoặc 110402"
            className={`w-full p-2.5 font-mono bg-white dark:bg-slate-800 border ${
              errors.code ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium`}
          />
          {errors.code && (
            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.code}
            </p>
          )}
        </div>

        {/* 3. Bộ phận / Phòng ban */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            3. Bộ phận / Phòng ban <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              if (errors.department) setErrors((prev) => ({ ...prev, department: '' }));
            }}
            placeholder="Ví dụ: Ban Kinh Doanh, Phòng Kỹ Thuật..."
            className={`w-full p-2.5 bg-white dark:bg-slate-800 border ${
              errors.department ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium`}
          />
          {errors.department && (
            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.department}
            </p>
          )}
        </div>

        {/* 4. Họ và tên Leader trực tiếp */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            4. Họ và tên Leader duyệt trực tiếp <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={leaderName}
            onChange={(e) => {
              setLeaderName(e.target.value);
              if (errors.leaderName) setErrors((prev) => ({ ...prev, leaderName: '' }));
            }}
            placeholder="Ví dụ: Trần Thị Bích"
            className={`w-full p-2.5 bg-white dark:bg-slate-800 border ${
              errors.leaderName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
            } text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium`}
          />
          {errors.leaderName && (
            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.leaderName}
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            * Nhập đúng họ tên người quản lý sẽ duyệt các chuyến taxi của bạn.
          </p>
        </div>

        {/* Telegram Identity Status (Auto-filled / Readonly) */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Send className="w-3.5 h-3.5 text-blue-500" />
            <span>Định danh Telegram thu thập tự động:</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 font-mono">
            <span>Username: {telegramUsername || '(Chưa có)'}</span>
            <span>ID: {telegramId || '(Chưa có)'}</span>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow-xs"
          >
            {isSubmitting
              ? 'Đang gửi hồ sơ...'
              : hasSubmittedProfile
              ? 'Cập nhật và gửi lại cho Admin'
              : 'Gửi hồ sơ đăng ký cho Admin'}
          </button>

          {hasSubmittedProfile && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setErrors({});
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            >
              Hủy chỉnh sửa (Quay lại xem hồ sơ)
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
