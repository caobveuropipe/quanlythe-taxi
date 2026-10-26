import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TelegramHeader } from './components/TelegramHeader';
import { InAppNotificationToast } from './components/common/InAppNotificationToast';
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

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Main Viewport Container */}
      <main className="flex-1 flex justify-center items-stretch h-full overflow-hidden p-0 sm:p-4">
        <div
          className={`w-full bg-white dark:bg-slate-900 flex flex-col h-full relative ${
            activeViewMode === 'mobile'
              ? 'max-w-[480px] sm:rounded-2xl sm:shadow-2xl sm:border border-slate-200/90 dark:border-slate-800'
              : 'max-w-4xl sm:rounded-2xl sm:shadow-2xl sm:border border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* In-App Realtime Notification Toast */}
          <InAppNotificationToast notifications={toasts} onDismiss={dismissToast} />

          {/* Telegram Mini App Top App Bar (Header mờ kính Floating Dock) */}
          <TelegramHeader
            onOpenSettings={() => setSubView('settings')}
            onOpenWebPortal={() => setSubView('web_portal')}
            onOpenUserApprovals={() => setShowApprovalModal(true)}
            onOpenUserManagement={() => setSubView('user_management')}
            pendingUsersCount={pendingUsersCount}
          />

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
            /* Main Role Content Views - pb-28 để dock không che nội dung cuối */
            <div className="flex-1 overflow-y-auto pb-28">
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
              FLOATING ISLAND DOCK NAVIGATION (LƠ LỬNG CÁCH ĐÁY MÀN HÌNH)
              - Neo chính xác ở đáy màn hình: fixed bottom-3 sm:bottom-4
              - Tự động thích ứng an toàn trên Mobile lẫn Desktop
              ======================================================== */}
          {!subView && !isPendingOrRejected && (
            <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 pointer-events-none px-3">
              <nav className="pointer-events-auto max-w-[390px] sm:max-w-md mx-auto bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl text-white rounded-full p-1.5 shadow-2xl border border-slate-700/70 dark:border-slate-600/70 flex items-center justify-around ring-1 ring-black/20">
                {/* Employee Dock (2 tabs) */}
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

                {/* Leader Dock (3 tabs) */}
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
                        <span className="px-1.5 py-0.2 bg-rose-500 text-white font-mono text-[9px] font-bold rounded-full">
                          {pendingLeaderCount}
                        </span>
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

                {/* Admin / HR Dock (3 tabs) */}
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
              </nav>
            </div>
          )}
        </div>
      </main>
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
