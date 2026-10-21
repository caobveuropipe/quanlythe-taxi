import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole } from '../../types';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  Send,
  User,
  Crown,
  ChevronDown,
  ArrowLeft,
  PlusCircle,
} from 'lucide-react';

interface AdminUserManagementViewProps {
  onBack?: () => void;
}

export const AdminUserManagementView: React.FC<AdminUserManagementViewProps> = ({ onBack }) => {
  const { users, updateUserProfile, deleteUser, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editLeaderMode, setEditLeaderMode] = useState<'select' | 'custom'>('select');
  const [editLeaderId, setEditLeaderId] = useState('');
  const [customLeaderName, setCustomLeaderName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(deletingUser.id);
      if (res.success) {
        setFeedback({ type: 'success', message: `Đã xóa nhân sự "${deletingUser.name}" thành công!` });
        if (editingUser?.id === deletingUser.id) {
          setEditingUser(null);
        }
        setDeletingUser(null);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Available leaders list for dropdown
  const availableLeaders = useMemo(() => {
    return users.filter(
      (u) =>
        (u.isLeader || u.role === 'leader' || u.role === 'admin_hr' || u.role === 'admin') &&
        u.id !== editingUser?.id
    );
  }, [users, editingUser]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole =
        selectedRoleFilter === 'all' ||
        (selectedRoleFilter === 'admin'
          ? u.role === 'admin' || u.role === 'admin_hr' || u.role === 'hr'
          : u.role === selectedRoleFilter);
      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchRole;

      const matchName = u.name.toLowerCase().includes(term);
      const matchCode = (u.code || '').toLowerCase().includes(term);
      const matchDept = (u.department || '').toLowerCase().includes(term);
      const matchTg = (u.telegramUsername || '').toLowerCase().includes(term) || (u.telegramId || '').includes(term);

      return matchRole && (matchName || matchCode || matchDept || matchTg);
    });
  }, [users, selectedRoleFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      leaders: users.filter((u) => u.isLeader || u.role === 'leader').length,
      admins: users.filter((u) => u.role === 'admin' || u.role === 'admin_hr' || u.role === 'hr').length,
      pending: users.filter((u) => u.role === 'pending').length,
    };
  }, [users]);

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditCode(user.code);
    setEditDepartment(user.department);
    setEditRole(user.role);

    // Resolve leader
    if (user.leaderId && availableLeaders.some((l) => l.id === user.leaderId)) {
      setEditLeaderMode('select');
      setEditLeaderId(user.leaderId);
      setCustomLeaderName('');
    } else if (user.leaderName) {
      setEditLeaderMode('custom');
      setCustomLeaderName(user.leaderName);
      setEditLeaderId('');
    } else {
      setEditLeaderMode('select');
      setEditLeaderId('');
      setCustomLeaderName('');
    }

    setFeedback(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim()) {
      setFeedback({ type: 'error', message: 'Họ và tên không được để trống!' });
      return;
    }
    if (!editCode.trim()) {
      setFeedback({ type: 'error', message: 'Mã nhân sự không được để trống!' });
      return;
    }
    if (!editDepartment.trim()) {
      setFeedback({ type: 'error', message: 'Bộ phận / Phòng ban không được để trống!' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      let finalLeaderId = editLeaderId || undefined;
      let finalLeaderName: string | undefined = undefined;

      if (editLeaderMode === 'custom' && customLeaderName.trim()) {
        finalLeaderName = customLeaderName.trim();
        const matched = availableLeaders.find(
          (l) => l.name.trim().toLowerCase() === finalLeaderName?.toLowerCase()
        );
        if (matched) {
          finalLeaderId = matched.id;
        } else {
          // If custom leader name, we can also link or create
          finalLeaderId = undefined;
        }
      } else if (finalLeaderId) {
        const found = availableLeaders.find((l) => l.id === finalLeaderId);
        finalLeaderName = found?.name;
      }

      const isLeaderRole = editRole === 'leader' || editRole === 'admin_hr';

      const res = await updateUserProfile(editingUser.id, {
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        department: editDepartment.trim(),
        role: editRole,
        isLeader: isLeaderRole,
        leaderId: finalLeaderId,
        leaderName: finalLeaderName,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Đã lưu thay đổi hồ sơ thành công!' });
        setTimeout(() => {
          setEditingUser(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
      case 'admin_hr':
      case 'hr':
        return { label: 'Admin', bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' };
      case 'leader':
        return { label: 'Leader duyệt', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' };
      case 'pending':
        return { label: 'Chờ duyệt', bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 animate-pulse' };
      case 'rejected':
        return { label: 'Bị từ chối', bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' };
      default:
        return { label: 'Nhân sự', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quản lý nhân sự & Phân quyền</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tìm kiếm, phân quyền vai trò và cập nhật Leader quản lý cho thành viên
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Đóng
          </button>
        )}
      </div>

      {/* Stats Summary Chips */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded">
          <div className="text-[10px] text-slate-500">Tổng nhân sự</div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">{stats.total}</div>
        </div>
        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded">
          <div className="text-[10px] text-amber-700 dark:text-amber-400">Leader duyệt</div>
          <div className="font-bold text-amber-800 dark:text-amber-300 text-sm">{stats.leaders}</div>
        </div>
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded">
          <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Admin</div>
          <div className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">{stats.admins}</div>
        </div>
        <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/60 rounded">
          <div className="text-[10px] text-yellow-700 dark:text-yellow-400">Chờ duyệt</div>
          <div className="font-bold text-yellow-800 dark:text-yellow-300 text-sm">{stats.pending}</div>
        </div>
      </div>

      {/* Search Input & Role Filter Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, mã NV, phòng ban, Telegram ID..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'employee', label: 'Nhân sự' },
            { id: 'leader', label: 'Leader' },
            { id: 'admin', label: 'Admin' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'rejected', label: 'Bị từ chối' },
          ].map((tab) => {
            const isActive = selectedRoleFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedRoleFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Cards List */}
      <div className="space-y-2.5">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-400">
            Không tìm thấy nhân sự nào khớp với điều kiện tìm kiếm.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const roleBadge = getRoleBadge(u.role);
            const userLeaderName =
              u.leaderName || (u.leaderId ? users.find((l) => l.id === u.leaderId)?.name : null);

            return (
              <div
                key={u.id}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {u.name ? u.name.charAt(0) : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {u.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold rounded">
                          {u.code || 'Chưa có mã'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{u.department || 'Chưa cập nhật phòng ban'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${roleBadge.bg}`}
                  >
                    {roleBadge.label}
                  </span>
                </div>

                {/* Details Footer: Leader and Telegram */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400">Leader duyệt: </span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {u.role === 'leader' || u.role === 'admin_hr' || u.role === 'admin'
                          ? '(Tự duyệt / Admin)'
                          : userLeaderName || 'Chưa gán Leader'}
                      </strong>
                    </div>

                    {u.telegramId && (
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                        <Send className="w-2.5 h-2.5 text-blue-500" />
                        <span>{u.telegramUsername || u.telegramId}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] rounded transition-colors inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      <span>Sửa</span>
                    </button>
                    {u.id !== currentUser.id && u.role !== 'admin_hr' && (
                      <button
                        onClick={() => setDeletingUser(u)}
                        title="Xóa nhân sự này"
                        className="p-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 rounded animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Chỉnh sửa thông tin nhân sự
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật Vai trò, Leader duyệt và Thông tin định danh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`mt-3 p-2.5 rounded text-xs flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveUser} className="py-3 space-y-3 text-xs">
              {/* Họ và tên */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              {/* Mã nhân sự & Phòng ban */}
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
                    className="w-full p-2 font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
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
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* 1. SỬA VAI TRÒ (ROLE) */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Vai trò hệ thống (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="employee">Nhân sự (Mượn thẻ taxi)</option>
                  <option value="leader">Leader duyệt đơn (Phê duyệt chuyến đi)</option>
                  <option value="admin">Quản trị viên (Admin - Quản lý thẻ)</option>
                  <option value="pending">Chờ phê duyệt (Pending)</option>
                  <option value="rejected">Bị chặn / Từ chối (Rejected)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * Leader hoặc Admin có quyền duyệt các chuyến đi của nhân viên cấp dưới.
                </p>
              </div>

              {/* 2. SỬA LEADER QUẢN LÝ TRỰC TIẾP */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Leader duyệt trực tiếp cho nhân sự này
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditLeaderMode('select')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        editLeaderMode === 'select'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      Chọn có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLeaderMode('custom')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        editLeaderMode === 'custom'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      Gõ tên mới
                    </button>
                  </div>
                </div>

                {editLeaderMode === 'select' ? (
                  <select
                    value={editLeaderId}
                    onChange={(e) => setEditLeaderId(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Chưa gán Leader nào --</option>
                    {availableLeaders.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} ({lead.code}) - {lead.department || 'Ban'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={customLeaderName}
                      onChange={(e) => setCustomLeaderName(e.target.value)}
                      placeholder="Nhập họ và tên Leader (VD: Đặng Thị Thu Hà)..."
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      * Nhập đúng họ tên người quản lý sẽ nhận thông báo duyệt chuyến taxi của nhân viên này.
                    </p>
                  </div>
                )}
              </div>

              {/* Telegram Identity (Readonly info) */}
              {editingUser.telegramId && (
                <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Telegram ID: {editingUser.telegramId}</span>
                  <span>Username: {editingUser.telegramUsername || '(Chưa có)'}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                {editingUser.id !== currentUser.id && editingUser.role !== 'admin_hr' && (
                  <button
                    type="button"
                    onClick={() => setDeletingUser(editingUser)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                    title="Xóa nhân sự này khỏi hệ thống"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 rounded animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Xác nhận xóa nhân sự</h4>
                <p className="text-[11px] text-slate-500">Hành động này sẽ xóa vĩnh viễn trên Supabase</p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded text-xs space-y-1">
              <div>Họ tên: <strong className="text-slate-900 dark:text-white">{deletingUser.name}</strong></div>
              <div>Mã nhân sự: <span className="font-mono">{deletingUser.code || '(Chưa có)'}</span></div>
              <div>Phòng ban: <span>{deletingUser.department || 'Nội bộ'}</span></div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sau khi xóa, nhân sự này sẽ không thể mượn thẻ hay thực hiện thao tác trên hệ thống trừ khi được đăng ký lại.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
