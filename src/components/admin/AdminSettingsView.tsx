import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
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
} from 'lucide-react';

interface AdminSettingsViewProps {
  onOpenUserManagement?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onOpenUserManagement }) => {
  const { config, updateConfig, users, leaderMappings, cards, updateUserProfile } = useApp();

  const [maxSpendInput, setMaxSpendInput] = useState<string>(String(config.maxSpendPerTrip));
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

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

      {/* 4. Danh sách tài khoản & Phân quyền */}
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
