import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole } from '../../types';
import {
  UserCheck,
  UserX,
  AlertTriangle,
  Send,
  CheckCircle2,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface AdminUserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUserApprovalModal: React.FC<AdminUserApprovalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { users, approveUser, rejectUser } = useApp();
  const pendingUsers = users.filter((u) => u.role === 'pending');

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [roleSelections, setRoleSelections] = useState<{ [userId: string]: UserRole }>({});

  if (!isOpen) return null;

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Phê duyệt thành viên mới ({pendingUsers.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Xác thực nhân sự và đối soát danh mục Leader trước khi cấp phép
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

        {feedback && (
          <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 font-bold text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Không có yêu cầu chờ duyệt nào!
              </p>
              <p className="text-[11px]">Tất cả thành viên đăng ký đã được xử lý.</p>
            </div>
          ) : (
            pendingUsers.map((candidate) => {
              // Check if candidate's leaderName exists in existing leaders list
              const existingLeader = users.find(
                (u) =>
                  (u.isLeader || u.role === 'leader') &&
                  candidate.leaderName &&
                  u.name.trim().toLowerCase() === candidate.leaderName.trim().toLowerCase()
              );

              const leaderMissing = !existingLeader && Boolean(candidate.leaderName);
              const generatedLeaderCode = `LD-${Math.floor(100 + Math.random() * 900)}`;
              const deepLink = `https://t.me/ADM_thetaxi_bot?start=lead_${candidate.code}`;

              return (
                <div
                  key={candidate.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded space-y-3"
                >
                  {/* Candidate Info Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {candidate.name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold rounded">
                          {candidate.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{candidate.department}</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      <div className="text-slate-500 font-mono">
                        {candidate.telegramUsername || 'Chưa có username'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {candidate.telegramId || 'Chưa liên kết'}
                      </div>
                    </div>
                  </div>

                  {/* Leader verification section */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Họ tên Leader khai báo:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {candidate.leaderName || '(Chưa điền)'}
                      </strong>
                    </div>

                    {leaderMissing ? (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Cảnh báo: Leader chưa có trong danh mục hệ thống</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                          Khi duyệt, hệ thống sẽ <strong>tự động thêm "{candidate.leaderName}"</strong> vào danh sách Leader để người này có thể phê duyệt chuyến đi cho nhân viên.
                        </p>
                        <div className="pt-1 flex items-center justify-between border-t border-amber-200 dark:border-amber-800/60">
                          <span className="text-[10px] font-mono text-slate-500">
                            Link kích hoạt Leader:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(deepLink)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedLink === deepLink ? 'Đã chép link!' : 'Chép link gửi Leader'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Leader hợp lệ: Đã có trong danh mục ({existingLeader?.name})</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Role Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Cấp vai trò:</span>
                      <select
                        value={roleSelections[candidate.id] || 'employee'}
                        onChange={(e) =>
                          setRoleSelections((prev) => ({
                            ...prev,
                            [candidate.id]: e.target.value as UserRole,
                          }))
                        }
                        className="p-1 px-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                      >
                        <option value="employee">Nhân sự (Tạo yêu cầu mượn thẻ)</option>
                        <option value="leader">Leader (Duyệt đơn phòng ban)</option>
                        <option value="admin">Admin (Quản trị hệ thống)</option>
                        <option value="hr">HR Vận hành (Điều phối thẻ)</option>
                        <option value="admin_hr">Admin kiêm HR</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const res = rejectUser(candidate.id);
                          setFeedback(res.message);
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded transition-colors inline-flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5 text-rose-500" />
                        <span>Từ chối</span>
                      </button>

                      <button
                        onClick={() => {
                          const selectedRole = roleSelections[candidate.id] || 'employee';
                          const res = approveUser(candidate.id, {
                            role: selectedRole,
                            createNewLeaderFromName: leaderMissing ? candidate.leaderName : undefined,
                          });
                          setFeedback(res.message);
                        }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded transition-colors shadow-xs inline-flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Duyệt cấp quyền</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
