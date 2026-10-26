import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TelegramHeader } from './components/TelegramHeader';
import { InAppNotificationToast } from './components/common/InAppNotificationToast';
import { LayoutVariantSwitcher, LayoutVariant } from './components/common/LayoutVariantSwitcher';
import { EmployeeRegisterView } from './components/employee/EmployeeRegisterView';
import { EmployeeRequestsView } from './components/employee/EmployeeRequestsView';
import { LeaderApprovalsView } from './components/leader/LeaderApprovalsView';
import { AdminActionQueueView } from './components/admin/AdminActionQueueView';
import { AdminInventoryView } from './components/admin/AdminInventoryView';
import { AdminReportsView } from './components/admin/AdminReportsView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { AdminWebPortalStandbyView } from './components/admin/AdminWebPortalStandbyView';
import { UserOnboardingView } from './components/auth/UserOnboardingView';
import { AdminUserApprovalModal } from './components/admin/AdminUserApprovalModal';
import { AdminUserManagementView } from './components/admin/AdminUserManagementView';
import {
  FilePlus,
  ListFilter,
  CheckSquare,
  CreditCard,
  BarChart3,
  Settings,
  Globe,
  Bell,
  UserCheck,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, users, config, requests, activeViewMode, toasts, dismissToast } = useApp();

  // Initialize Telegram WebApp SDK if opened in real Telegram client
  useEffect(() => {
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }, []);

  // Layout Variant State (default = Gốc, opt1_compact = Siêu tinh gọn, opt2_toptabs = Top Tabs, opt3_floating = Floating Dock)
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>(() => {
    try {
      return (localStorage.getItem('taxicard_layout_variant') as LayoutVariant) || 'default';
    } catch {
      return 'default';
    }
  });
  const [showLayoutSwitcherModal, setShowLayoutSwitcherModal] = useState<boolean>(false);

  const handleSelectLayoutVariant = (variant: LayoutVariant) => {
    setLayoutVariant(variant);
    try {
      localStorage.setItem('taxicard_layout_variant', variant);
    } catch (e) {
      console.warn('Cannot save to localStorage:', e);
    }
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('register');
  const [subView, setSubView] = useState<'settings' | 'web_portal' | 'user_management' | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);

  const isAdminOrHR =
    currentUser.role === 'admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'hr';

  const isLeader =
    (currentUser.role === 'leader' || currentUser.isLeader) &&
    config.requireLeaderApproval;

  const isPendingOrRejected =
    currentUser.role === 'pending' ||
    currentUser.role === 'rejected' ||
    currentUser.role === 'unregistered' ||
    !currentUser.code;

  const pendingUsersCount = users.filter((u) => u.role === 'pending').length;

  // Counts for badges
  const pendingLeaderCount = requests.filter(
    (r) =>
      r.status === 'pending_leader' &&
      r.leaderApprovalRequired &&
      (r.leaderId === currentUser.id || r.department === currentUser.department)
  ).length;

  const adminActionCount = requests.filter((r) =>
    ['pending_admin', 'waitlist_cards', 'pending_handover', 'holding_card', 'overbudget_pending_hr'].includes(
      r.status
    )
  ).length;

  // Điều chỉnh padding bottom của vùng nội dung theo từng layout
  const getContentPaddingClass = () => {
    if (layoutVariant === 'opt2_toptabs') {
      return 'pb-6'; // Không có Bottom Bar nên đệm rất ít
    }
    if (layoutVariant === 'opt1_compact') {
      return 'pb-14'; // Bottom Bar mỏng 42px
    }
    if (layoutVariant === 'opt3_floating') {
      return 'pb-24'; // Floating Dock lơ lửng
    }
    return 'pb-20'; // Layout gốc
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Main Viewport Container */}
      <main className="flex-1 flex justify-center items-start p-0 sm:py-6 sm:px-4">
        <div
          className={`w-full bg-white dark:bg-slate-900 flex flex-col transition-all relative ${
            activeViewMode === 'mobile'
              ? layoutVariant === 'default'
                ? 'max-w-[420px] min-h-[840px] shadow-2xl border-x sm:border border-slate-200/90 dark:border-slate-800'
                : 'max-w-[440px] min-h-[640px] shadow-2xl border-x sm:border border-slate-200/90 dark:border-slate-800'
              : layoutVariant === 'default'
              ? 'max-w-4xl min-h-[800px] shadow-lg border border-slate-200 dark:border-slate-800'
              : 'max-w-4xl min-h-[640px] shadow-lg border border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* In-App Realtime Notification Toast */}
          <InAppNotificationToast notifications={toasts} onDismiss={dismissToast} />

          {/* Telegram Mini App Top App Bar */}
          <TelegramHeader
            onOpenSettings={() => setSubView('settings')}
            onOpenWebPortal={() => setSubView('web_portal')}
            onOpenUserApprovals={() => setShowApprovalModal(true)}
            onOpenUserManagement={() => setSubView('user_management')}
            onOpenLayoutSwitcher={() => setShowLayoutSwitcherModal(true)}
            pendingUsersCount={pendingUsersCount}
            layoutVariant={layoutVariant}
          />

          {/* ========================================================
              OPTION 2: TOP TABS (SEGMENTED CONTROL TRÊN ĐẦU)
              - Chỉ xuất hiện khi chọn layoutVariant === 'opt2_toptabs'
              - Giải phóng hoàn toàn chân màn hình
              ======================================================== */}
          {layoutVariant === 'opt2_toptabs' && !subView && !isPendingOrRejected && (
            <div className="px-3 pt-1 pb-2 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-10 z-30 transition-colors">
              {/* Employee Top Segmented */}
              {!isAdminOrHR && !isLeader && (
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all ${
                      activeTab === 'register'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all ${
                      activeTab === 'requests'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Yêu cầu của tôi</span>
                  </button>
                </div>
              )}

              {/* Leader Top Segmented */}
              {isLeader && !isAdminOrHR && (
                <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
                  <button
                    onClick={() => setActiveTab('leader_approvals')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all relative ${
                      activeTab === 'leader_approvals'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Cần duyệt</span>
                    {pendingLeaderCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                        {pendingLeaderCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
                      activeTab === 'register'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
                      activeTab === 'requests'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Yêu cầu</span>
                  </button>
                </div>
              )}

              {/* Admin / HR Top Segmented */}
              {isAdminOrHR && (
                <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all relative ${
                      activeTab === 'actions'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Cần xử lý</span>
                    {adminActionCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                        {adminActionCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
                      activeTab === 'inventory'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Kho thẻ</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-medium transition-all ${
                      activeTab === 'reports'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Báo cáo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Admin User Approval Modal */}
          <AdminUserApprovalModal
            isOpen={showApprovalModal}
            onClose={() => setShowApprovalModal(false)}
          />

          {/* If current user is pending registration or rejected: ONLY show Onboarding view */}
          {isPendingOrRejected ? (
            <div className="flex-1 overflow-y-auto pb-10">
              <UserOnboardingView />
            </div>
          ) : subView === 'settings' ? (
            <div className="flex-1 overflow-y-auto pb-16">
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Cấu hình hệ thống TaxiCard
                </span>
                <button
                  onClick={() => setSubView(null)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Xong / Đóng
                </button>
              </div>
              <AdminSettingsView onOpenUserManagement={() => setSubView('user_management')} />
            </div>
          ) : subView === 'web_portal' ? (
            <div className="flex-1 overflow-y-auto pb-16">
              <AdminWebPortalStandbyView onBackToMiniApp={() => setSubView(null)} />
            </div>
          ) : subView === 'user_management' ? (
            <div className="flex-1 overflow-y-auto pb-16">
              <AdminUserManagementView onBack={() => setSubView(null)} />
            </div>
          ) : (
            /* Main Role Content Views */
            <div className={`flex-1 overflow-y-auto ${getContentPaddingClass()}`}>
              {/* If Employee View */}
              {!isAdminOrHR && !isLeader && (
                <>
                  {activeTab === 'register' && (
                    <EmployeeRegisterView onGoToRequests={() => setActiveTab('requests')} />
                  )}
                  {activeTab === 'requests' && (
                    <EmployeeRequestsView />
                  )}
                </>
              )}

              {/* If Leader View */}
              {isLeader && !isAdminOrHR && (
                <>
                  {activeTab === 'leader_approvals' && <LeaderApprovalsView />}
                  {activeTab === 'register' && (
                    <EmployeeRegisterView onGoToRequests={() => setActiveTab('requests')} />
                  )}
                  {activeTab === 'requests' && (
                    <EmployeeRequestsView />
                  )}
                </>
              )}

              {/* If Admin / HR View */}
              {isAdminOrHR && (
                <>
                  {activeTab === 'actions' && <AdminActionQueueView />}
                  {activeTab === 'inventory' && <AdminInventoryView />}
                  {activeTab === 'reports' && <AdminReportsView />}
                  {activeTab === 'register' && (
                    <EmployeeRegisterView onGoToRequests={() => setActiveTab('requests')} />
                  )}
                  {activeTab === 'requests' && (
                    <EmployeeRequestsView />
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================
              BOTTOM NAVIGATION RENDERING:
              - default: Bottom Nav gốc h-14 icon trên chữ dưới
              - opt1_compact: Bottom Nav siêu mỏng h-11, icon + chữ ngang
              - opt2_toptabs: KHÔNG RENDER (Bỏ hoàn toàn chân màn hình)
              - opt3_floating: Floating Island Dock lơ lửng cách đáy
              ======================================================== */}
          {!subView && !isPendingOrRejected && layoutVariant !== 'opt2_toptabs' && (
            <>
              {/* ----------------- GỐC (DEFAULT) ----------------- */}
              {layoutVariant === 'default' && (
                <nav className="sticky bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors">
                  {/* Employee Bottom Bar */}
                  {!isAdminOrHR && !isLeader && (
                    <div className="grid grid-cols-2 items-center h-14">
                      <button
                        onClick={() => setActiveTab('register')}
                        className={`flex flex-col items-center justify-center h-full transition-colors ${
                          activeTab === 'register'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <FilePlus className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Đăng ký</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex flex-col items-center justify-center h-full transition-colors relative ${
                          activeTab === 'requests'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <ListFilter className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Yêu cầu của tôi</span>
                      </button>
                    </div>
                  )}

                  {/* Leader Bottom Bar */}
                  {isLeader && !isAdminOrHR && (
                    <div className="grid grid-cols-3 items-center h-14">
                      <button
                        onClick={() => setActiveTab('leader_approvals')}
                        className={`flex flex-col items-center justify-center h-full transition-colors relative ${
                          activeTab === 'leader_approvals'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <div className="relative">
                          <CheckSquare className="w-5 h-5 mb-0.5" />
                          {pendingLeaderCount > 0 && (
                            <span className="absolute -top-1 -right-2 px-1 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                              {pendingLeaderCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px]">Cần duyệt</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('register')}
                        className={`flex flex-col items-center justify-center h-full transition-colors ${
                          activeTab === 'register'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <FilePlus className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Đăng ký</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex flex-col items-center justify-center h-full transition-colors ${
                          activeTab === 'requests'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <ListFilter className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Yêu cầu</span>
                      </button>
                    </div>
                  )}

                  {/* Admin / HR Bottom Bar */}
                  {isAdminOrHR && (
                    <div className="grid grid-cols-3 items-center h-14">
                      <button
                        onClick={() => setActiveTab('actions')}
                        className={`flex flex-col items-center justify-center h-full transition-colors relative ${
                          activeTab === 'actions'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <div className="relative">
                          <CheckSquare className="w-5 h-5 mb-0.5" />
                          {adminActionCount > 0 && (
                            <span className="absolute -top-1 -right-2 px-1 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                              {adminActionCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px]">Cần xử lý</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex flex-col items-center justify-center h-full transition-colors ${
                          activeTab === 'inventory'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Kho thẻ</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex flex-col items-center justify-center h-full transition-colors ${
                          activeTab === 'reports'
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <BarChart3 className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px]">Báo cáo</span>
                      </button>
                    </div>
                  )}
                </nav>
              )}

              {/* ----------------- OPTION 1: SIÊU TINH GỌN (MỎNG H-11, NGANG) ----------------- */}
              {layoutVariant === 'opt1_compact' && (
                <nav className="sticky bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1 transition-colors">
                  {!isAdminOrHR && !isLeader && (
                    <div className="grid grid-cols-2 gap-1 h-10 items-center">
                      <button
                        onClick={() => setActiveTab('register')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                          activeTab === 'register'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <FilePlus className="w-4 h-4" />
                        <span>Đăng ký</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                          activeTab === 'requests'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <ListFilter className="w-4 h-4" />
                        <span>Yêu cầu</span>
                      </button>
                    </div>
                  )}

                  {isLeader && !isAdminOrHR && (
                    <div className="grid grid-cols-3 gap-1 h-10 items-center">
                      <button
                        onClick={() => setActiveTab('leader_approvals')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs relative ${
                          activeTab === 'leader_approvals'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Duyệt</span>
                        {pendingLeaderCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                            {pendingLeaderCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('register')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs ${
                          activeTab === 'register'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <FilePlus className="w-4 h-4" />
                        <span>Đăng ký</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs ${
                          activeTab === 'requests'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <ListFilter className="w-4 h-4" />
                        <span>Yêu cầu</span>
                      </button>
                    </div>
                  )}

                  {isAdminOrHR && (
                    <div className="grid grid-cols-3 gap-1 h-10 items-center">
                      <button
                        onClick={() => setActiveTab('actions')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs relative ${
                          activeTab === 'actions'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Xử lý</span>
                        {adminActionCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full">
                            {adminActionCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('inventory')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs ${
                          activeTab === 'inventory'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Kho thẻ</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className={`h-full rounded-lg flex items-center justify-center gap-1 transition-all text-xs ${
                          activeTab === 'reports'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Báo cáo</span>
                      </button>
                    </div>
                  )}
                </nav>
              )}

              {/* ----------------- OPTION 3: FLOATING DOCK (LƠ LỬNG CÁCH ĐÁY) ----------------- */}
              {layoutVariant === 'opt3_floating' && (
                <div className="sticky bottom-2 px-3 z-40 pointer-events-none">
                  <div className="pointer-events-auto max-w-sm mx-auto bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xl text-white rounded-full p-1.5 shadow-2xl border border-slate-700/60 dark:border-slate-600/60 flex items-center justify-around">
                    {!isAdminOrHR && !isLeader && (
                      <>
                        <button
                          onClick={() => setActiveTab('register')}
                          className={`flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs transition-all ${
                            activeTab === 'register'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>Đăng ký</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('requests')}
                          className={`flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs transition-all ${
                            activeTab === 'requests'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <ListFilter className="w-3.5 h-3.5" />
                          <span>Yêu cầu</span>
                        </button>
                      </>
                    )}

                    {isLeader && !isAdminOrHR && (
                      <>
                        <button
                          onClick={() => setActiveTab('leader_approvals')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all relative ${
                            activeTab === 'leader_approvals'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Duyệt</span>
                          {pendingLeaderCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('register')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all ${
                            activeTab === 'register'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>Đăng ký</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('requests')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all ${
                            activeTab === 'requests'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <ListFilter className="w-3.5 h-3.5" />
                          <span>Yêu cầu</span>
                        </button>
                      </>
                    )}

                    {isAdminOrHR && (
                      <>
                        <button
                          onClick={() => setActiveTab('actions')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all relative ${
                            activeTab === 'actions'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Cần xử lý</span>
                          {adminActionCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-mono text-[9px] font-bold rounded-full">
                              {adminActionCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('inventory')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all ${
                            activeTab === 'inventory'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Kho thẻ</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('reports')}
                          className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 text-xs transition-all ${
                            activeTab === 'reports'
                              ? 'bg-blue-600 text-white font-bold shadow-md'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Báo cáo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating Layout Switcher Trigger & Modal (4 lựa chọn giao diện) */}
      <LayoutVariantSwitcher
        currentVariant={layoutVariant}
        onSelectVariant={handleSelectLayoutVariant}
        isOpenModal={showLayoutSwitcherModal ? true : undefined}
        onCloseModal={() => setShowLayoutSwitcherModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
