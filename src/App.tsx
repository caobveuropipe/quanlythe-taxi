import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TelegramHeader } from './components/TelegramHeader';
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
  const { currentUser, users, config, requests, activeViewMode } = useApp();

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Main Viewport Container */}
      <main className="flex-1 flex justify-center items-start p-0 sm:py-6 sm:px-4">
        <div
          className={`w-full bg-white dark:bg-slate-900 flex flex-col transition-all ${
            activeViewMode === 'mobile'
              ? 'max-w-[420px] min-h-[840px] shadow-2xl border-x sm:border border-slate-200/90 dark:border-slate-800'
              : 'max-w-4xl min-h-[800px] shadow-lg border border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Telegram Mini App simulated top app bar */}
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
            /* Main Role Content Views */
            <div className="flex-1 overflow-y-auto pb-20">
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

          {/* Bottom Fixed Navigation Bar */}
          {!subView && !isPendingOrRejected && (
            <nav className="sticky bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors">
              {/* Employee Bottom Bar (RULE: Only 2 main tabs: "Đăng ký" and "Yêu cầu của tôi") */}
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

              {/* Leader Bottom Bar (Displays "Cần duyệt", plus register and requests) */}
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

              {/* Admin / HR Bottom Bar (RULE: 3 main tabs: "Việc cần xử lý", "Kho thẻ", "Báo cáo") */}
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
