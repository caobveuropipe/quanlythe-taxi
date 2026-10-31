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
import { AnnouncementPopup } from './components/common/AnnouncementPopup';
import { LayoutProvider } from './context/LayoutContext';
import {
  FilePlus,
  ListFilter,
  CheckSquare,
  CreditCard,
  BarChart3,
  Minimize2,
} from 'lucide-react';

/** Trả về true khi viewport >= query (dùng để bật giao diện PC) */
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

const MainAppContent: React.FC = () => {
  const { currentUser, users, config, requests, activeViewMode, toasts, dismissToast } = useApp();

  // Initialize Telegram WebApp SDK if opened in real Telegram client
  useEffect(() => {
    try {
      const tg = (window as unknown as {
        Telegram?: {
          WebApp?: {
            ready: () => void;
            expand: () => void;
            setHeaderColor?: (color: string) => void;
            setBackgroundColor?: (color: string) => void;
          };
        };
      }).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#ffffff');
        tg.setBackgroundColor?.('#f8fafc');
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }, []);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('register');
  const [subView, setSubView] = useState<'settings' | 'web_portal' | 'user_management' | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(false);

  // Chế độ mở rộng giao diện PC (ghi nhớ lựa chọn).
  // Khi người dùng bấm Mở rộng, app sẽ bung rộng kể cả khi chạy trong Telegram Desktop popup
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('taxicard_ui_expanded') === '1';
    } catch {
      return false;
    }
  });
  const isWide = isExpanded;
  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('taxicard_ui_expanded', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isAdminOrHR =
    currentUser.role === 'admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'hr';

  const announcement = config.announcement;

  // Tự động mở popup thông báo ngay khi vào app nếu vai trò khớp
  useEffect(() => {
    if (!announcement || !announcement.enabled) {
      setShowAnnouncement(false);
      return;
    }

    const target = announcement.targetRole || 'all';
    let isTargetMatch = false;

    if (target === 'all') {
      isTargetMatch = true;
    } else if (target === 'admin') {
      isTargetMatch = isAdminOrHR;
    } else if (target === 'user') {
      isTargetMatch = !isAdminOrHR;
    }

    if (isTargetMatch) {
      setShowAnnouncement(true);
    } else {
      setShowAnnouncement(false);
    }
  }, [currentUser.id, announcement?.updatedAt, announcement?.enabled, announcement?.targetRole, isAdminOrHR]);

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

  // Tab "Đăng ký": PC mở rộng hiển thị form (trái) + danh sách yêu cầu của tôi (phải)
  const registerTab = isWide ? (
    <div className="grid grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)] gap-6 p-4 sm:p-6 max-w-6xl mx-auto items-start">
      <EmployeeRegisterView onGoToRequests={() => setActiveTab('requests')} />
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Yêu cầu của tôi</h2>
        <EmployeeRequestsView />
      </div>
    </div>
  ) : (
    <EmployeeRegisterView onGoToRequests={() => setActiveTab('requests')} />
  );

  const requestsTab = isWide ? (
    <div className="p-6 max-w-3xl mx-auto">
      <EmployeeRequestsView />
    </div>
  ) : (
    <EmployeeRequestsView />
  );

  // Menu sidebar (PC mở rộng) theo vai trò - đồng bộ với dock mobile
  const sidebarItems: { key: string; label: string; Icon: React.ElementType; badge?: number }[] = isAdminOrHR
    ? [
        { key: 'actions', label: 'Cần xử lý', Icon: CheckSquare, badge: adminActionCount },
        { key: 'inventory', label: 'Kho thẻ', Icon: CreditCard },
        { key: 'reports', label: 'Báo cáo', Icon: BarChart3 },
      ]
    : [
        ...(isLeader
          ? [{ key: 'leader_approvals', label: 'Duyệt', Icon: CheckSquare, badge: pendingLeaderCount }]
          : []),
        { key: 'register', label: 'Đăng ký', Icon: FilePlus },
        { key: 'requests', label: 'Yêu cầu', Icon: ListFilter },
      ];

  return (
    <LayoutProvider isWide={isWide}>
    <div className="h-[100dvh] w-full bg-slate-100 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Main Viewport Container */}
      <main
        className={`flex-1 flex justify-center items-stretch h-full overflow-hidden ${
          isWide ? 'p-0' : 'p-0 sm:p-4'
        }`}
      >
        {/* Sidebar (chỉ PC mở rộng) */}
        {isWide && !isPendingOrRejected && (
          <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="text-sm font-extrabold text-slate-900">TaxiCard</div>
              <div className="text-[11px] text-slate-400">Quản lý thẻ taxi nội bộ</div>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {sidebarItems.map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSubView(null);
                    setActiveTab(key);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    !subView && activeTab === key
                      ? 'bg-blue-600 text-white font-bold shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{label}</span>
                  {!!badge && badge > 0 && (
                    <span className="px-1.5 bg-rose-500 text-white font-mono text-[10px] font-bold rounded-full">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <button
              onClick={toggleExpanded}
              className="m-3 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 flex items-center gap-2"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Thu gọn về Mini App</span>
            </button>
          </aside>
        )}
        <div
          className={`bg-white flex flex-col h-full relative ${
            isWide
              ? 'flex-1 min-w-0'
              : `w-full ${
                  activeViewMode === 'mobile'
                    ? 'max-w-[480px] sm:rounded-2xl sm:shadow-2xl sm:border border-slate-200/90'
                    : 'max-w-4xl sm:rounded-2xl sm:shadow-2xl sm:border border-slate-200'
                }`
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
            isExpanded={isWide}
            onToggleExpand={toggleExpanded}
          />

          {/* Admin User Approval Modal */}
          <AdminUserApprovalModal
            isOpen={showApprovalModal}
            onClose={() => setShowApprovalModal(false)}
          />

          {/* Broadcast Announcement Popup on app enter */}
          {announcement && (
            <AnnouncementPopup
              announcement={announcement}
              isOpen={showAnnouncement}
              onClose={() => setShowAnnouncement(false)}
              durationSeconds={8}
            />
          )}

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
                    registerTab
                  )}
                  {activeTab === 'requests' && (
                    requestsTab
                  )}
                </>
              )}

              {/* If Leader View */}
              {isLeader && !isAdminOrHR && (
                <>
                  {activeTab === 'leader_approvals' && <LeaderApprovalsView />}
                  {activeTab === 'register' && (
                    registerTab
                  )}
                  {activeTab === 'requests' && (
                    requestsTab
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
                    registerTab
                  )}
                  {activeTab === 'requests' && (
                    requestsTab
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
          {!subView && !isPendingOrRejected && !isWide && (
            <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 pointer-events-none px-3">
              <nav className="pointer-events-auto max-w-[390px] sm:max-w-md mx-auto bg-white/95 backdrop-blur-xl text-slate-700 rounded-full p-1.5 shadow-xl border border-slate-200/90 flex items-center justify-around ring-1 ring-slate-900/5">
                {/* Employee Dock (2 tabs) */}
                {!isAdminOrHR && !isLeader && (
                  <>
                    <button
                      onClick={() => setActiveTab('register')}
                      className={`flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs transition-all ${
                        activeTab === 'register'
                          ? 'bg-blue-600 text-white font-bold shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
    </LayoutProvider>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
