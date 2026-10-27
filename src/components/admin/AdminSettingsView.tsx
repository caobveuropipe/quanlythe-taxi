import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, AnnouncementRoleTarget, AnnouncementType, AppAnnouncement } from '../../types';
import {
  ToggleLeft,
  ToggleRight,
  Shield,
  Users,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Send,
  HelpCircle,
  Key,
  Megaphone,
  Eye,
  Save,
  Bell,
  BellOff,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AdminOcrKeyModal } from './AdminOcrKeyModal';
import { AnnouncementPopup } from '../common/AnnouncementPopup';
import {
  getCustomGeminiKey,
  maskApiKey,
  getDailySystemUsageCount,
  MAX_DAILY_SYSTEM_OCR_LIMIT,
} from '../../utils/geminiKeyStorage';

interface AdminSettingsViewProps {
  onOpenUserManagement?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onOpenUserManagement }) => {
  const { config, updateConfig, users, leaderMappings, cards, updateUserProfile } = useApp();

  const [maxSpendInput, setMaxSpendInput] = useState<string>(String(config.maxSpendPerTrip));
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrKeyTick, setOcrKeyTick] = useState(0);

  // Announcement state
  const currentAnnouncement = config.announcement;
  const [announcementEnabled, setAnnouncementEnabled] = useState<boolean>(
    currentAnnouncement?.enabled ?? false
  );
  const [announcementTitle, setAnnouncementTitle] = useState<string>(
    currentAnnouncement?.title ?? 'Thông báo quy định mượn thẻ Taxi'
  );
  const [announcementContent, setAnnouncementContent] = useState<string>(
    currentAnnouncement?.content ??
      'Nhân sự vui lòng gửi yêu cầu trước giờ khởi hành tối thiểu 30 phút. Sau chuyến đi, chụp ảnh hóa đơn rõ nét và hoàn trả thẻ trong vòng 24h để hoàn tất thủ tục quyết toán.'
  );
  const [announcementTargetRole, setAnnouncementTargetRole] = useState<AnnouncementRoleTarget>(
    currentAnnouncement?.targetRole ?? 'all'
  );
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>(
    currentAnnouncement?.type ?? 'info'
  );
  const [showPreviewPopup, setShowPreviewPopup] = useState<boolean>(false);

  // Synchronize form inputs if announcement is updated remotely from another device (e.g. Phone <-> PC)
  useEffect(() => {
    if (config.announcement) {
      setAnnouncementEnabled(config.announcement.enabled ?? false);
      if (config.announcement.title !== undefined) setAnnouncementTitle(config.announcement.title);
      if (config.announcement.content !== undefined) setAnnouncementContent(config.announcement.content);
      if (config.announcement.targetRole !== undefined) setAnnouncementTargetRole(config.announcement.targetRole);
      if (config.announcement.type !== undefined) setAnnouncementType(config.announcement.type);
    }
  }, [
    config.announcement?.updatedAt,
    config.announcement?.enabled,
    config.announcement?.title,
    config.announcement?.content,
    config.announcement?.targetRole,
    config.announcement?.type,
  ]);

  const handleSaveAnnouncement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedAnnouncement: AppAnnouncement = {
      enabled: announcementEnabled,
      title: announcementTitle.trim() || 'Thông báo hệ thống',
      content: announcementContent.trim(),
      targetRole: announcementTargetRole,
      type: announcementType,
      updatedAt: new Date().toISOString(),
    };
    updateConfig({ announcement: updatedAnnouncement });
    const targetLabel =
      announcementTargetRole === 'all'
        ? 'Tất cả người dùng (All)'
        : announcementTargetRole === 'admin'
        ? 'Quản trị viên (Admin)'
        : 'Nhân sự / Người dùng (User)';
    setSaveFeedback(
      `Đã cập nhật thông báo Popup! (${announcementEnabled ? 'Đang BẬT' : 'Đang TẮT'}, Đối tượng: ${targetLabel})`
    );
  };

  const handleDisableAnnouncement = () => {
    setAnnouncementEnabled(false);
    const updatedAnnouncement: AppAnnouncement = {
      enabled: false,
      title: announcementTitle.trim() || 'Thông báo hệ thống',
      content: announcementContent.trim(),
      targetRole: announcementTargetRole,
      type: announcementType,
      updatedAt: new Date().toISOString(),
    };
    updateConfig({ announcement: updatedAnnouncement });
    setSaveFeedback('Đã vô hiệu hóa thông báo Popup! Popup sẽ không còn hiển thị khi người dùng mở Mini App.');
  };

  const customKey = getCustomGeminiKey();
  const systemUsage = getDailySystemUsageCount();
  const remainingQuota = Math.max(0, MAX_DAILY_SYSTEM_OCR_LIMIT - systemUsage);

  const handleRoleChange = async (userId: string, userName: string, newRole: UserRole) => {
    const isLeader = newRole === 'leader' || newRole === 'admin_hr';
    const res = await updateUserProfile(userId, { role: newRole, isLeader });
    if (res.success) {
      const roleLabel =
        newRole === 'leader'
          ? 'Leader duyệt đơn'
          : newRole === 'admin' || newRole === 'admin_hr' || newRole === 'hr'
          ? 'Quản trị viên (Admin)'
          : newRole === 'pending'
          ? 'Chờ duyệt'
          : newRole === 'rejected'
          ? 'Chặn / Từ chối'
          : 'Nhân sự';
      setSaveFeedback(`Đã chuyển vai trò của ${userName} thành "${roleLabel}"!`);
    }
  };

  const handleToggleLeaderApproval = () => {
    const nextVal = !config.requireLeaderApproval;
    updateConfig({ requireLeaderApproval: nextVal });
    setSaveFeedback(
      `Đã ${nextVal ? 'BẬT' : 'TẮT'} bước Leader duyệt. Thay đổi này chỉ áp dụng cho các yêu cầu mới tạo sau thời điểm này!`
    );
  };

  const handleSaveMaxSpend = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(maxSpendInput.replace(/\D/g, ''), 10);
    if (!val || val <= 0) return;
    updateConfig({ maxSpendPerTrip: val });
    setSaveFeedback(`Đã cập nhật mức chi phí tối đa mỗi lượt: ${val.toLocaleString('vi-VN')} đ.`);
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Thiết lập hệ thống
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Cấu hình quy trình phê duyệt, định mức chi phí và phân quyền
        </p>
      </div>

      {saveFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <button onClick={() => setSaveFeedback(null)} className="text-slate-400 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 1. Toggle: Bật/Tắt bước Leader duyệt */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">
              Bước Leader phê duyệt
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {config.requireLeaderApproval
                ? 'Hiện tại BẬT: Nhân sự → Leader duyệt → Admin duyệt cuối'
                : 'Hiện tại TẮT: Nhân sự → Đi thẳng tới Admin duyệt cuối'}
            </div>
          </div>

          <button
            onClick={handleToggleLeaderApproval}
            className={`p-1 transition-colors ${
              config.requireLeaderApproval ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            }`}
          >
            {config.requireLeaderApproval ? (
              <ToggleRight className="w-9 h-9" />
            ) : (
              <ToggleLeft className="w-9 h-9" />
            )}
          </button>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
          <strong>Quy tắc hệ thống:</strong> Thay đổi cấu hình duyệt chỉ áp dụng cho các yêu cầu mới tạo. Những yêu cầu đã gửi trước đó vẫn giữ nguyên luồng ban đầu để đảm bảo tính nhất quán dữ liệu.
        </div>
      </div>

      {/* 2. Mức chi phí tối đa cho mỗi lượt */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">
            Mức chi phí tối đa cho mỗi lượt (VNĐ)
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Hóa đơn vượt quá mức này sẽ kích hoạt cảnh báo để Admin xem xét Accept hoặc Reject
          </div>
        </div>

        <form onSubmit={handleSaveMaxSpend} className="flex gap-2">
          <input
            type="text"
            value={parseInt(maxSpendInput.replace(/\D/g, '') || '0', 10).toLocaleString('vi-VN')}
            onChange={(e) => setMaxSpendInput(e.target.value.replace(/\D/g, ''))}
            className="flex-1 text-xs font-mono font-bold p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
          >
            Lưu mức
          </button>
        </form>
      </div>

      {/* 3. Ánh xạ Nhân sự / Bộ phận -> Leader -> Telegram ID */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-white">
            Ánh xạ Bộ phận → Leader & Telegram ID
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Dùng để gửi thông báo Bot trực tiếp đến Telegram cá nhân của Leader
          </div>
        </div>

        <div className="space-y-2 text-xs">
          {leaderMappings.length === 0 ? (
            <div className="p-3 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 text-[11px]">
              Chưa có cấu hình ánh xạ Leader. Khi các Leader đăng ký thành viên và được Admin duyệt, danh sách sẽ hiển thị tại đây.
            </div>
          ) : (
            leaderMappings.map((m) => (
              <div
                key={m.department}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {m.department}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Send className="w-3 h-3 text-blue-500" />
                    <span>Leader: <strong>{m.leaderName}</strong> ({m.leaderTelegramUsername})</span>
                    <span className="font-mono text-slate-400">ID: {m.leaderTelegramId}</span>
                  </div>
                </div>

                <div>
                  {m.botActive ? (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                      Bot đã kích hoạt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-300" title="Chưa kích hoạt bot">
                      Chưa bật Bot
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Cấu hình AI OCR Hóa đơn (Google Gemini) */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-500" />
            <span>Cấu hình AI OCR Hóa đơn (Google Gemini)</span>
          </div>
          <span className="text-[10px] text-slate-400">Model BYOK</span>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Nguồn API hiện tại:</span>
            {customKey ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 rounded">
                🔑 Key cá nhân ({maskApiKey(customKey)})
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 rounded">
                ⚡ Key Hệ Thống dùng chung (Còn {remainingQuota}/20 lượt hôm nay)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Hệ thống hỗ trợ Admin tự nhập API Key cá nhân để quét hóa đơn taxi không giới hạn lượt gọi và không phụ thuộc vào hạn mức dùng chung.
          </div>

          <button
            type="button"
            onClick={() => setShowOcrModal(true)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>{customKey ? 'Thay đổi hoặc Gỡ Key cá nhân' : 'Thêm API Key cá nhân của bạn ➔'}</span>
          </button>
        </div>
      </div>

      {showOcrModal && (
        <AdminOcrKeyModal
          onClose={() => setShowOcrModal(false)}
          onKeyUpdated={() => setOcrKeyTick((t) => t + 1)}
        />
      )}

      {/* 5. Cấu hình Thông báo Popup khi vào Mini App */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Thông báo Popup khi vào Mini App</span>
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-mono text-[9px] font-bold rounded">
                  8 Giây Auto-close
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hiển thị popup tự đóng sau 8s (có nút close) ngay khi mở ứng dụng
              </p>
            </div>
          </div>

          {/* Toggle Bật/Tắt */}
          <button
            type="button"
            onClick={() => setAnnouncementEnabled(!announcementEnabled)}
            className={`p-1 transition-colors ${
              announcementEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
            title={announcementEnabled ? 'Nhấn để Tắt thông báo' : 'Nhấn để Bật thông báo'}
          >
            {announcementEnabled ? (
              <ToggleRight className="w-9 h-9" />
            ) : (
              <ToggleLeft className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Trạng thái Bật/Tắt */}
        <div className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 ${
          announcementEnabled
            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200'
            : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${announcementEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="font-medium text-[11px]">
              {announcementEnabled
                ? 'Thông báo đang KÍCH HOẠT: Người dùng thuộc vai trò đã chọn sẽ thấy popup khi vào app.'
                : 'Thông báo đang VÔ HIỆU HÓA: Popup sẽ không hiển thị khi người dùng mở app.'}
            </span>
          </div>

          {announcementEnabled && (
            <button
              type="button"
              onClick={handleDisableAnnouncement}
              className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800 rounded shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              title="Vô hiệu hóa thông báo ngay lập tức"
            >
              <BellOff className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Tắt nhanh</span>
            </button>
          )}
        </div>

        {/* Chọn Role nhận thông báo: all / user / admin */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Chọn đối tượng nhận thông báo (Role Target):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAnnouncementTargetRole('all')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                announcementTargetRole === 'all'
                  ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className={`w-3.5 h-3.5 ${announcementTargetRole === 'all' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Tất cả (All)</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                Toàn bộ người dùng
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAnnouncementTargetRole('user')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                announcementTargetRole === 'user'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className={`w-3.5 h-3.5 ${announcementTargetRole === 'user' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Nhân sự (User)</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                Nhân viên & Leader
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAnnouncementTargetRole('admin')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                announcementTargetRole === 'admin'
                  ? 'bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Shield className={`w-3.5 h-3.5 ${announcementTargetRole === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Admin</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                Quản trị viên & HR
              </div>
            </button>
          </div>
        </div>

        {/* Kiểu / Mức độ thông báo */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Kiểu hiển thị (Màu sắc & Biểu tượng):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'info', label: 'Thông tin', icon: 'ℹ️', color: 'blue' },
              { id: 'warning', label: 'Lưu ý', icon: '⚠️', color: 'amber' },
              { id: 'success', label: 'Tin mới', icon: '✅', color: 'emerald' },
              { id: 'urgent', label: 'Khẩn cấp', icon: '🚨', color: 'rose' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAnnouncementType(item.id as AnnouncementType)}
                className={`py-1.5 px-2 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  announcementType === item.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form nhập Tiêu đề & Nội dung */}
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tiêu đề thông báo:
            </label>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="VD: Thông báo cập nhật quy định mượn thẻ Taxi..."
              className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Nội dung chi tiết:
              </label>
              <span className="text-[10px] text-slate-400">
                {announcementContent.length} ký tự
              </span>
            </div>
            <textarea
              rows={4}
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              placeholder="Nhập nội dung thông báo hiển thị cho người dùng khi vào app..."
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white leading-relaxed focus:outline-hidden focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Action Buttons: Xem trước, Vô hiệu hóa & Lưu cấu hình */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewPopup(true)}
            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-300 dark:border-slate-600"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Xem trước Popup (8s)</span>
          </button>

          {announcementEnabled ? (
            <button
              type="button"
              onClick={handleDisableAnnouncement}
              className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Vô hiệu hóa thông báo, tắt popup ngay lập tức"
            >
              <BellOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Vô hiệu hóa thông báo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAnnouncementEnabled(true);
                const updatedAnnouncement: AppAnnouncement = {
                  enabled: true,
                  title: announcementTitle.trim() || 'Thông báo hệ thống',
                  content: announcementContent.trim(),
                  targetRole: announcementTargetRole,
                  type: announcementType,
                  updatedAt: new Date().toISOString(),
                };
                updateConfig({ announcement: updatedAnnouncement });
                setSaveFeedback('Đã kích hoạt lại thông báo Popup!');
              }}
              className="py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Megaphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Bật thông báo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAnnouncement}
            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{announcementEnabled ? 'Lưu thay đổi' : 'Lưu & Bật popup'}</span>
          </button>
        </div>
      </div>

      {/* Popup Xem trước khi Admin bấm test */}
      {showPreviewPopup && (
        <AnnouncementPopup
          isOpen={showPreviewPopup}
          onClose={() => setShowPreviewPopup(false)}
          durationSeconds={8}
          previewMode={true}
          announcement={{
            enabled: announcementEnabled,
            title: announcementTitle.trim() || 'Thông báo hệ thống',
            content: announcementContent.trim() || 'Nội dung thông báo mẫu hiển thị khi người dùng vào app.',
            targetRole: announcementTargetRole,
            type: announcementType,
            updatedAt: new Date().toISOString(),
          }}
        />
      )}

      {/* 6. Danh sách tài khoản & Phân quyền */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Danh sách nhân sự & Phân quyền Mini App ({users.length})</span>
          </div>
          <span className="text-[10px] text-slate-400">Chọn vai trò để cấp quyền trực tiếp</span>
        </div>

        {onOpenUserManagement && (
          <button
            type="button"
            onClick={onOpenUserManagement}
            className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mở trang Quản lý nhân sự, Tìm kiếm & Sửa Leader chi tiết ➔</span>
          </button>
        )}

        <div className="space-y-2 text-xs">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {u.name}
                  </span>
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold rounded">
                    {u.code || 'Chưa có mã'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Phòng ban: <strong className="text-slate-700 dark:text-slate-300">{u.department || '(Trống)'}</strong>
                  {u.telegramUsername && <span className="ml-2 font-mono text-[10px]">({u.telegramUsername})</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <span className="text-[10px] text-slate-400">Vai trò:</span>
                <select
                  value={u.role === 'admin_hr' || u.role === 'hr' ? 'admin' : u.role}
                  onChange={(e) => handleRoleChange(u.id, u.name, e.target.value as UserRole)}
                  className="p-1 px-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="employee">Nhân sự (Mượn thẻ)</option>
                  <option value="leader">Leader (Duyệt đơn)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="pending">Chờ duyệt (Pending)</option>
                  <option value="rejected">Chặn / Từ chối</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
