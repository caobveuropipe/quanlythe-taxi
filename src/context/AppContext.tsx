/**
 * CONTRACT: AppContext.tsx
 * - Trách nhiệm: Quản lý toàn bộ State & Nghiệp vụ Client-side của hệ thống Quản lý Thẻ Taxi (localStorage: taxicard_app_data_v3).
 * - Không chịu trách nhiệm: Render UI chi tiết, styling CSS, hoặc trực tiếp hiển thị Modal (do View component đảm nhận).
 * - Invariant cốt lõi:
 *   1. [FR-02] Invariant 1 đơn active duy nhất: Một nhân sự không được phép có 2 đơn active cùng lúc; kiểm tra khi tạo mới và khi Leader hoàn tác.
 *   2. [FR-04] Safe Fallback GUEST: Người nhận tự do khi xuất nhanh tại quầy phải được fallback an toàn sang mã GUEST, không gãy báo cáo chi phí.
 *   3. [FR-03] Ưu tiên Waitlist: Luôn dùng getEffectiveTime (estimatedStartTime || createdAt) để xếp lịch đi sớm nhất, tránh lỗi NaN.
 *   4. [FR-01] Timeline bàn giao: Đo thời gian chờ từ handoverReadyAt (cả duyệt trực tiếp và thoát Waitlist).
 * - Boundary: Mọi thao tác mutate requests/cards/users đều phải đi qua các hàm hành động của Context này.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  TaxiCard,
  TaxiRequest,
  UserProfile,
  DepartmentLeaderMapping,
  AppConfig,
  CardCondition,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_USERS,
  INITIAL_LEADER_MAPPINGS,
  INITIAL_CARDS,
  INITIAL_REQUESTS,
} from '../data/seedData';
import { supabaseService, fromDbRequest, fromDbCard, fromDbUser } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { formatVietnameseDateTime, getRelativeTimeNotice } from '../utils/dateUtils';

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  users: UserProfile[];
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  cards: TaxiCard[];
  requests: TaxiRequest[];
  leaderMappings: DepartmentLeaderMapping[];
  activeViewMode: 'mobile' | 'responsive';
  setActiveViewMode: (mode: 'mobile' | 'responsive') => void;
  uiDensityMode: 'standard' | 'minimalist';
  setUiDensityMode: (mode: 'standard' | 'minimalist') => void;
  toggleUiDensityMode: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  supabaseStatus: 'connecting' | 'connected' | 'offline';

  // Business Actions
  createRequest: (purpose: string, destination: string, clientTag?: string, estimatedStartTime?: string) => { success: boolean; message: string; requestId?: string };
  directDispatchCard: (params: {
    cardCode: string;
    recipientName: string;
    recipientCode?: string;
    department?: string;
    purpose: string;
    destination?: string;
    clientTag?: string;
  }) => { success: boolean; message: string; requestId?: string };
  cancelRequest: (requestId: string, reason?: string) => { success: boolean; message: string };
  leaderApprove: (requestId: string, comment?: string) => { success: boolean; message: string };
  leaderReject: (requestId: string, reason: string) => { success: boolean; message: string };
  leaderUndoReject: (requestId: string) => { success: boolean; message: string };
  adminApprove: (requestId: string, comment?: string) => { success: boolean; message: string };
  adminReject: (requestId: string, reason: string) => { success: boolean; message: string };
  adminForwardToLeader: (requestId: string) => { success: boolean; message: string };
  assignCardFromWaitlist: (requestId: string, cardCode: string) => { success: boolean; message: string };
  confirmHandover: (requestId: string, actualCardCode: string, operatorName: string) => { success: boolean; message: string };
  releaseReservedCard: (requestId: string, reason: string, operatorName: string) => { success: boolean; message: string };
  requestYieldCard: (requestId: string, reason?: string, operatorName?: string) => { success: boolean; message: string };
  respondYieldCard: (requestId: string, accepted: boolean) => { success: boolean; message: string };
  confirmReturnAndBilling: (params: {
    requestId: string;
    cardCondition: CardCondition;
    pickupPoint: string;
    dropoffPoint: string;
    actualCost: number | null;
    isCostMissing: boolean;
    receiptNumber?: string;
    receiptPhotoUrl?: string;
    ocrSuggested?: boolean;
    operatorName: string;
  }) => { success: boolean; message: string };
  hrDecideOverBudget: (requestId: string, decision: 'accepted' | 'rejected', reason: string, hrName: string) => { success: boolean; message: string };
  addCard: (code: string, note?: string) => { success: boolean; message: string };
  editCard: (cardId: string, data: { code?: string; note?: string; condition?: CardCondition; status?: TaxiCard['status'] }) => { success: boolean; message: string };
  deleteCard: (cardId: string) => { success: boolean; message: string };
  updateCardStatus: (cardId: string, status: TaxiCard['status'], note?: string) => void;
  resetAllData: () => void;

  // User Management & Onboarding Actions
  registerUser: (params: {
    code: string;
    name: string;
    department: string;
    leaderName: string;
    telegramId?: string;
    telegramUsername?: string;
  }) => Promise<{ success: boolean; message: string }>;
  approveUser: (
    userId: string,
    options?: { createNewLeaderFromName?: string; role?: UserRole }
  ) => { success: boolean; message: string };
  rejectUser: (userId: string) => { success: boolean; message: string };
  updateUserProfile: (
    userId: string,
    updates: Partial<UserProfile>
  ) => Promise<{ success: boolean; message: string }>;
  resetToNewRegistration: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'taxicard_app_data_v3';
const MOCK_USER_IDS = new Set(['user-01', 'user-02', 'user-03', 'user-04', 'user-05', 'user-06']);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        const filtered = parsed.filter((u) => !MOCK_USER_IDS.has(u.id));
        if (filtered.length > 0) return filtered;
      } catch {}
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem(`${STORAGE_KEY}_currentUserId`);
    if (savedId && !MOCK_USER_IDS.has(savedId)) {
      const found = users.find((u) => u.id === savedId);
      if (found) return found;
    }
    return users[0] || INITIAL_USERS[0];
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });

  const [cards, setCards] = useState<TaxiCard[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cards`);
    return saved ? JSON.parse(saved) : INITIAL_CARDS;
  });

  const [requests, setRequests] = useState<TaxiRequest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_requests`);
    const raw: TaxiRequest[] = saved ? JSON.parse(saved) : INITIAL_REQUESTS;
    // Auto-reconcile mock data misassignment for REQ-2026-099
    return raw.map((r) => {
      if (r.id === 'REQ-2026-099' && (r.employeeCode === 'NV-1102' || r.employeeName === 'Trần Văn Nam') && r.employeeId === 'user-01') {
        return { ...r, employeeId: 'user-02' };
      }
      // Fix requests like REQ-2026-115 that were automatically put in pending_leader on creation:
      // In the correct 5-stage architecture, all requests go directly to HR/Admin (pending_admin) first.
      if (r.status === 'pending_leader' && (!r.leaderApprovalStatus || r.leaderApprovalStatus === 'pending') && (!r.adminApprovalStatus || r.adminApprovalStatus === 'pending')) {
        return { ...r, status: 'pending_admin', leaderApprovalStatus: undefined };
      }
      return r;
    });
  });

  const [leaderMappings] = useState<DepartmentLeaderMapping[]>(INITIAL_LEADER_MAPPINGS);

  const [activeViewMode, setActiveViewMode] = useState<'mobile' | 'responsive'>('mobile');
  const [uiDensityMode, setUiDensityMode] = useState<'standard' | 'minimalist'>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_uiDensityMode`);
    return (saved === 'standard' || saved === 'minimalist') ? saved : 'minimalist';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_dark`) === 'true';
  });

  const toggleUiDensityMode = () => {
    setUiDensityMode((prev) => (prev === 'standard' ? 'minimalist' : 'standard'));
  };

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_uiDensityMode`, uiDensityMode);
  }, [uiDensityMode]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_currentUserId`, currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_requests`, JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_dark`, String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [supabaseStatus, setSupabaseStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  // Supabase Realtime & Remote DB Sync
  useEffect(() => {
    let cardChannel: any;
    let requestChannel: any;
    let userChannel: any;

    async function initSupabase() {
      try {
        const testRes = await supabaseService.testConnection();
        if (!testRes.success) {
          console.info('Supabase not connected, using local fallback:', testRes.message);
          setSupabaseStatus('offline');
          return;
        }

        setSupabaseStatus('connected');

        // Load users from Supabase
        const dbUsers = await supabaseService.getUsers();
        if (dbUsers && dbUsers.length > 0) {
          const cleaned = dbUsers.filter((u) => !MOCK_USER_IDS.has(u.id));
          const hasMock = dbUsers.some((u) => MOCK_USER_IDS.has(u.id));
          if (hasMock) {
            for (const mockId of Array.from(MOCK_USER_IDS)) {
              supabaseService.deleteUser(mockId).catch(() => {});
            }
          }
          if (cleaned.length > 0) {
            const resolved = cleaned.map((u) => {
              if (u.leaderId && !u.leaderName) {
                const lead = cleaned.find((l) => l.id === u.leaderId);
                if (lead) return { ...u, leaderName: lead.name };
              }
              return u;
            });
            setUsers(resolved);
          } else {
            setUsers(INITIAL_USERS);
            for (const u of INITIAL_USERS) {
              await supabaseService.upsertUser(u);
            }
          }
        } else {
          // If remote users is empty, seed initial admin user
          for (const u of INITIAL_USERS) {
            await supabaseService.upsertUser(u);
          }
        }

        // Auto-detect Telegram WebApp identity if running inside Telegram
        const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string; last_name?: string } } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
        if (tg?.id) {
          const tgIdStr = String(tg.id);
          const activeList = dbUsers && dbUsers.length > 0 ? dbUsers : users;
          const matched = activeList.find((u) => u.telegramId === tgIdStr);
          if (matched) {
            setCurrentUser(matched);
          } else {
            // New unregistered user opening via Telegram
            setCurrentUser({
              id: `unregistered-${tgIdStr}`,
              name: `${tg.first_name || ''} ${tg.last_name || ''}`.trim() || 'Người dùng mới',
              code: '',
              department: '',
              telegramUsername: tg.username ? `@${tg.username}` : '',
              telegramId: tgIdStr,
              role: 'unregistered',
            });
          }
        }

        // Load cards from Supabase
        const dbCards = await supabaseService.getCards();
        if (dbCards && dbCards.length > 0) {
          setCards(dbCards);
        } else {
          // If remote is empty, seed it
          await supabaseService.upsertCards(INITIAL_CARDS);
        }

        // Load requests from Supabase
        const dbRequests = await supabaseService.getRequests();
        if (dbRequests && dbRequests.length > 0) {
          setRequests(dbRequests);
        } else {
          // If remote is empty, seed it
          await supabaseService.upsertRequests(INITIAL_REQUESTS);
        }

        // Realtime updates: requests
        requestChannel = supabaseService.subscribeToRequests((payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newReq = fromDbRequest(payload.new);
            setRequests((prev) => {
              if (prev.some((r) => r.id === newReq.id)) return prev;
              return [newReq, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = fromDbRequest(payload.new);
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        });

        // Realtime updates: cards
        cardChannel = supabaseService.subscribeToCards((payload) => {
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
            const updatedCard = fromDbCard(payload.new);
            setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
          }
        });

        // Realtime updates: users
        userChannel = supabaseService.subscribeToUsers((payload) => {
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
            const updatedUser = fromDbUser(payload.new);
            setUsers((prev) => {
              const exists = prev.some((u) => u.id === updatedUser.id);
              if (exists) return prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
              return [updatedUser, ...prev];
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          }
        });
      } catch (err) {
        console.warn('Supabase init error:', err);
        setSupabaseStatus('offline');
      }
    }

    initSupabase();

    return () => {
      if (cardChannel) supabase.removeChannel(cardChannel);
      if (requestChannel) supabase.removeChannel(requestChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, []);

  const syncToSupabase = (req?: TaxiRequest, updatedCards?: TaxiCard[]) => {
    if (req) supabaseService.upsertRequest(req).catch((e) => console.warn('Supabase req sync error:', e));
    if (updatedCards) supabaseService.upsertCards(updatedCards).catch((e) => console.warn('Supabase cards sync error:', e));
  };

  // Debounced Auto-sync requests & cards to Supabase when connected
  useEffect(() => {
    if (supabaseStatus !== 'connected') return;
    const timer = setTimeout(() => {
      supabaseService.upsertRequests(requests).catch(() => {});
      supabaseService.upsertCards(cards).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [requests, cards, supabaseStatus]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  // Helper: Đồng bộ sửa tin nhắn Telegram và xóa nút khi đơn đã xử lý
  const syncEditTelegramMessages = async (trackId: string, text: string) => {
    try {
      const { data: meta } = await supabase
        .from('users')
        .select('telegram_username')
        .eq('id', trackId)
        .maybeSingle();

      if (meta?.telegram_username) {
        const tracked: Array<{ chatId: string | number; messageId: number }> = JSON.parse(meta.telegram_username);
        const botToken = '8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24';
        await Promise.all(
          tracked.map((m) =>
            fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: m.chatId,
                message_id: m.messageId,
                text,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] },
              }),
            }).catch(() => {})
          )
        );
        await supabase.from('users').delete().eq('id', trackId).catch(() => {});
      }
    } catch (e) {
      console.warn('syncEditTelegramMessages error:', e);
    }
  };

  // Helper: Find department leader
  const getLeaderForUser = (user: UserProfile) => {
    const mapping = leaderMappings.find((m) => m.department === user.department);
    return mapping;
  };

  // 1. Create Request
  const createRequest = (purpose: string, destination: string, clientTag?: string, estimatedStartTime?: string) => {
    if (!purpose.trim()) {
      return { success: false, message: 'Vui lòng nhập mục đích sử dụng thẻ.' };
    }
    if (!destination.trim()) {
      return { success: false, message: 'Vui lòng nhập địa điểm gặp/di chuyển.' };
    }

    // Deduplication check: prevent multiple pending/holding requests for same employee
    const activeReq = requests.find(
      (r) =>
        r.employeeId === currentUser.id &&
        ['pending_leader', 'pending_admin', 'waitlist_cards', 'pending_handover', 'holding_card'].includes(r.status)
    );
    if (activeReq) {
      return {
        success: false,
        message: `Bạn đang có yêu cầu ${activeReq.id} đang xử lý (${activeReq.status === 'holding_card' ? 'đang giữ thẻ' : 'chờ duyệt/giao'}). Vui lòng hoàn thành lượt cũ trước khi gửi yêu cầu mới.`,
      };
    }

    const newReqId = `REQ-2026-${Math.floor(100 + requests.length + 1)}`;
    const directLeader = currentUser.leaderId ? users.find((u) => u.id === currentUser.leaderId) : null;
    const leaderMapping = getLeaderForUser(currentUser);
    const resolvedLeaderName = directLeader?.name || leaderMapping?.leaderName;
    const resolvedLeaderId = directLeader?.id || leaderMapping?.leaderId;
    const resolvedLeaderTelegramId = directLeader?.telegramId || leaderMapping?.leaderTelegramId;
    const requireLeader = config.requireLeaderApproval;
    const now = new Date().toISOString();

    const newRequest: TaxiRequest = {
      id: newReqId,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeCode: currentUser.code,
      department: currentUser.department,
      purpose: purpose.trim(),
      destination: destination.trim(),
      clientTag: clientTag?.trim() || undefined,
      createdAt: now,
      estimatedStartTime: estimatedStartTime?.trim() || now,
      leaderApprovalRequired: requireLeader,
      leaderId: resolvedLeaderId,
      leaderName: resolvedLeaderName,
      leaderTelegramId: resolvedLeaderTelegramId,
      leaderApprovalStatus: undefined,
      adminApprovalStatus: 'pending',
      isWaitlisted: false,
      cardReturned: false,
      status: 'pending_admin',
    };

    setRequests((prev) => [newRequest, ...prev]);
    syncToSupabase(newRequest);

    // Notify all Admins / HR on Telegram with inline approval buttons
    const botToken = '8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24';
    const adminRecipients = users
      .filter((u) => (u.role === 'admin_hr' || u.role === 'admin') && u.telegramId)
      .map((u) => u.telegramId);

    const recipientSet = new Set(['5139629652', ...adminRecipients]);
    const availableCardsCount = cards.filter((c) => c.status === 'available').length;
    const timeDisplay = formatVietnameseDateTime(newRequest.estimatedStartTime || newRequest.createdAt);
    const relativeNotice = getRelativeTimeNotice(newRequest.estimatedStartTime || newRequest.createdAt);

    const orderText = `🚕 <b>CÓ YÊU CẦU MƯỢN THẺ TAXI MỚI!</b>\n\n• Mã yêu cầu: <code>${newReqId}</code>\n• Người mượn: <b>${currentUser.name}</b> (Mã: <code>${currentUser.code}</code>)\n• Bộ phận: <b>${currentUser.department}</b>\n• Leader quản lý: <b>${resolvedLeaderName || 'Chưa cung cấp'}</b>\n• Thời gian đi: <b>${timeDisplay}</b>${relativeNotice ? ` (<i>${relativeNotice}</i>)` : ''}\n• Mục đích: <b>${purpose.trim()}</b>\n• Điểm đến: <b>${destination.trim()}</b>\n${clientTag?.trim() ? `• Thẻ khách/Dự án: <b>${clientTag.trim()}</b>\n` : ''}\n💳 <i>Kho thẻ: ${availableCardsCount > 0 ? `Còn <b>${availableCardsCount}</b> thẻ sẵn sàng` : '<b>Hết thẻ sẵn sàng</b> (sẽ tự động xếp hàng chờ)'}</i>\n\n👇 <i>Admin có thể bấm duyệt cấp thẻ nhanh hoặc mở Mini App:</i>`;

    const orderReplyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Duyệt cấp thẻ', callback_data: `approve_req_${newReqId}` },
          { text: '⭐ Y/c Leader duyệt', callback_data: `forward_leader_${newReqId}` },
          { text: '❌ Từ chối', callback_data: `reject_req_${newReqId}` },
        ],
        [
          { text: '📱 Mở Mini App xử lý', web_app: { url: 'https://quanly-thetaxi.vercel.app' } },
        ],
      ],
    };

    try {
      const trackedMessages: Array<{ chatId: string | number; messageId: number }> = [];
      (async () => {
        for (const adminId of Array.from(recipientSet)) {
          if (adminId && adminId.trim()) {
            try {
              const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: adminId,
                  text: orderText,
                  parse_mode: 'HTML',
                  reply_markup: orderReplyMarkup,
                }),
              });
              const json = await res.json();
              if (json.ok && json.result?.message_id) {
                trackedMessages.push({ chatId: json.result.chat.id, messageId: json.result.message_id });
              }
            } catch (err) {
              console.warn('Notify admin order error for:', adminId, err);
            }
          }
        }

        if (trackedMessages.length > 0) {
          await supabase.from('users').upsert({
            id: `msg_track_req_${newReqId}`,
            name: 'Tracker',
            code: 'MSG_META',
            department: 'system',
            role: 'system',
            telegram_username: JSON.stringify(trackedMessages),
          });
        }
      })();
    } catch (err) {
      console.warn('Telegram notify order error:', err);
    }

    return {
      success: true,
      message: 'Gửi yêu cầu mượn thẻ thành công! Đã gửi thông báo đến ban Quản trị.',
      requestId: newReqId,
    };
  };

  // 1b. Direct Dispatch Card at Counter (Admin/HR xuất thẻ nhanh trực tiếp tại quầy)
  const directDispatchCard = (params: {
    cardCode: string;
    recipientName: string;
    recipientCode?: string;
    department?: string;
    purpose: string;
    destination?: string;
    clientTag?: string;
  }) => {
    if (!params.recipientName.trim()) {
      return { success: false, message: 'Vui lòng nhập tên người nhận thẻ.' };
    }
    if (!params.purpose.trim()) {
      return { success: false, message: 'Vui lòng nhập mục đích sử dụng thẻ.' };
    }

    const targetCard = cards.find((c) => c.code === params.cardCode && c.status === 'available');
    if (!targetCard) {
      return { success: false, message: `Thẻ ${params.cardCode} hiện không khả dụng trong kho.` };
    }

    // Match with existing user or fallback to guest (FR-04)
    const matchedUser = users.find(
      (u) =>
        (params.recipientCode && u.code.toLowerCase() === params.recipientCode.trim().toLowerCase()) ||
        u.name.toLowerCase() === params.recipientName.trim().toLowerCase()
    );

    const employeeId = matchedUser ? matchedUser.id : `GUEST-${Date.now()}`;
    const employeeCode = matchedUser ? matchedUser.code : params.recipientCode?.trim() || 'GUEST';
    const employeeName = matchedUser ? matchedUser.name : params.recipientName.trim();
    const department = matchedUser ? matchedUser.department : params.department?.trim() || 'Khách ngoài / Đột xuất';

    const newReqId = `REQ-DIRECT-${Math.floor(100 + requests.length + 1)}`;
    const now = new Date().toISOString();

    const newRequest: TaxiRequest = {
      id: newReqId,
      employeeId,
      employeeName,
      employeeCode,
      department,
      purpose: params.purpose.trim(),
      destination: params.destination?.trim() || 'Khẩn cấp theo chuyến',
      clientTag: params.clientTag?.trim() || 'Cấp khẩn cấp tại quầy',
      createdAt: now,
      isDirectDispatch: true,
      leaderApprovalRequired: false,
      adminApprovalStatus: 'approved',
      adminApprovalComment: 'Admin cấp thẻ nhanh trực tiếp tại quầy.',
      adminApprovedAt: now,
      adminApproverName: currentUser.name,
      isWaitlisted: false,
      reservedCardCode: params.cardCode,
      actualCardCode: params.cardCode,
      handoverReadyAt: now,
      handedOverBy: currentUser.name,
      handedOverAt: now,
      cardReturned: false,
      status: 'holding_card',
    };

    // Update Card: set to in_use
    setCards((prev) =>
      prev.map((c) =>
        c.code === params.cardCode
          ? {
              ...c,
              status: 'in_use',
              currentRequestId: newReqId,
              assignedToName: employeeName,
              assignedToCode: employeeCode,
            }
          : c
      )
    );

    setRequests((prev) => [newRequest, ...prev]);

    return {
      success: true,
      message: `Đã xuất nhanh thẻ ${params.cardCode} cho ${employeeName} thành công!`,
      requestId: newReqId,
    };
  };

  // Helper: Auto FIFO & Trip Time Smart Priority assignment when any card becomes available (FR-01, FR-03)
  const autoAssignCardIfWaitlisted = (
    cardCode: string,
    excludeRequestId?: string
  ) => {
    let assignedReq: TaxiRequest | null = null;

    setRequests((prevReqs) => {
      // FR-03: Deterministic sort helper avoiding NaN
      const getEffectiveTime = (r: TaxiRequest) => {
        if (r.estimatedStartTime) {
          const t = new Date(r.estimatedStartTime).getTime();
          if (!isNaN(t)) return t;
        }
        const t2 = new Date(r.createdAt).getTime();
        return !isNaN(t2) ? t2 : 0;
      };

      const waitlisted = prevReqs
        .filter((r) => r.status === 'waitlist_cards' && r.id !== excludeRequestId)
        .sort((a, b) => {
          const diff = getEffectiveTime(a) - getEffectiveTime(b);
          if (diff !== 0) return diff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      if (waitlisted.length === 0) {
        // No waitlist: card becomes available in inventory
        setCards((prevCards) =>
          prevCards.map((c) =>
            c.code === cardCode
              ? {
                  ...c,
                  status: 'available',
                  currentRequestId: undefined,
                  assignedToName: undefined,
                  assignedToCode: undefined,
                }
              : c
          )
        );
        return prevReqs;
      }

      // Auto-assign to highest priority waitlisted request (Nearest trip time -> FIFO)
      assignedReq = waitlisted[0];
      const now = new Date().toISOString();

      setCards((prevCards) =>
        prevCards.map((c) =>
          c.code === cardCode
            ? {
                ...c,
                status: 'reserved',
                currentRequestId: assignedReq!.id,
                assignedToName: assignedReq!.employeeName,
                assignedToCode: assignedReq!.employeeCode,
              }
            : c
        )
      );

      return prevReqs.map((req) => {
        if (req.id !== assignedReq!.id) return req;
        return {
          ...req,
          status: 'pending_handover',
          isWaitlisted: false,
          reservedCardCode: cardCode,
          handoverReadyAt: now, // FR-01: Ghi nhận mốc sẵn sàng nhận thẻ để tính chính xác timeline
        };
      });
    });

    return assignedReq;
  };

  // Cancel Request by Requester (or Admin) before card is handed over / while not yet approved
  const cancelRequest = (requestId: string, reason?: string) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    if (['holding_card', 'completed', 'returned_pending_bill', 'overbudget_pending_hr'].includes(target.status)) {
      return { success: false, message: 'Thẻ đã được bàn giao hoặc chuyến đi đã thực hiện, không thể tự hủy theo cách này.' };
    }

    // Auto-assign or release card if exists
    if (target.reservedCardCode) {
      autoAssignCardIfWaitlisted(target.reservedCardCode, requestId);
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledReason: reason?.trim() || 'Người tạo chủ động hủy yêu cầu khi chưa được duyệt/cấp.',
        };
      })
    );

    return { success: true, message: 'Đã hủy yêu cầu mượn thẻ thành công.' };
  };

  // 2. Leader Approve
  const leaderApprove = (requestId: string, comment?: string) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    if (target.employeeId === currentUser.id) {
      return { success: false, message: 'Quy tắc: Leader không được tự duyệt yêu cầu của chính mình!' };
    }

    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          leaderApprovalStatus: 'approved',
          leaderApprovalComment: comment?.trim() || 'Leader đã đồng ý.',
          leaderApprovedAt: now,
          leaderDecisionAt: now,
          status: 'pending_admin',
        };
      })
    );

    return { success: true, message: 'Đã duyệt yêu cầu. Hồ sơ được chuyển tới Admin duyệt cuối.' };
  };

  // 3. Leader Reject
  const leaderReject = (requestId: string, reason: string) => {
    if (!reason.trim()) {
      return { success: false, message: 'Vui lòng nhập lý do từ chối.' };
    }
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    if (target.employeeId === currentUser.id) {
      return { success: false, message: 'Không thể tự thao tác trên yêu cầu của chính mình.' };
    }

    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          leaderApprovalStatus: 'rejected',
          leaderApprovalComment: reason.trim(),
          leaderApprovedAt: now,
          leaderDecisionAt: now,
          status: 'rejected_leader',
        };
      })
    );

    return { success: true, message: 'Đã từ chối yêu cầu và lưu lý do gửi nhân sự.' };
  };

  // 3b. Leader Undo Reject in 90 minutes on Real State (FR-02)
  const leaderUndoReject = (requestId: string) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };
    if (target.status !== 'rejected_leader') {
      return { success: false, message: 'Yêu cầu không ở trạng thái bị Leader từ chối.' };
    }

    // Check 90 minutes limit
    const decisionTime = target.leaderDecisionAt || target.leaderApprovedAt || target.createdAt;
    const elapsedMs = Date.now() - new Date(decisionTime).getTime();
    if (elapsedMs > 90 * 60 * 1000) {
      return { success: false, message: 'Đã quá thời hạn 90 phút để hoàn tác quyết định.' };
    }

    // FR-02: Check single active request invariant
    const hasOtherActive = requests.some(
      (r) =>
        r.id !== requestId &&
        r.employeeId === target.employeeId &&
        ['pending_leader', 'pending_admin', 'waitlist_cards', 'pending_handover', 'holding_card'].includes(r.status)
    );
    if (hasOtherActive) {
      return {
        success: false,
        message: `Không thể hoàn tác: Nhân sự ${target.employeeName} hiện đã có một yêu cầu khác đang được xử lý.`,
      };
    }

    const now = new Date().toISOString();
    const availableCard = cards.find((c) => c.status === 'available');

    if (availableCard) {
      // Reserve card and move to pending_handover
      setCards((prev) =>
        prev.map((c) =>
          c.id === availableCard.id
            ? {
                ...c,
                status: 'reserved',
                currentRequestId: requestId,
                assignedToName: target.employeeName,
                assignedToCode: target.employeeCode,
              }
            : c
        )
      );

      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            leaderApprovalStatus: 'approved',
            leaderApprovalComment: 'Leader hoàn tác từ chối sang ĐỒNG Ý.',
            leaderApprovedAt: now,
            leaderDecisionAt: now,
            adminApprovalStatus: 'approved',
            adminApprovalComment: 'Tự động duyệt sau khi Leader hoàn tác.',
            adminApprovedAt: now,
            adminApproverName: 'Hệ thống (Theo Leader hoàn tác)',
            isWaitlisted: false,
            reservedCardCode: availableCard.code,
            handoverReadyAt: now,
            status: 'pending_handover',
          };
        })
      );

      return {
        success: true,
        message: `Đã hoàn tác sang DUYỆT! Kho còn thẻ: đã giữ thẻ ${availableCard.code} và chuyển chờ bàn giao.`,
      };
    } else {
      // Out of cards -> Enter Waitlist
      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            leaderApprovalStatus: 'approved',
            leaderApprovalComment: 'Leader hoàn tác sang ĐỒNG Ý (Kho hết thẻ).',
            leaderApprovedAt: now,
            leaderDecisionAt: now,
            adminApprovalStatus: 'approved',
            adminApprovalComment: 'Admin tự động duyệt (chờ thẻ vào kho).',
            adminApprovedAt: now,
            adminApproverName: 'Hệ thống (Theo Leader hoàn tác)',
            isWaitlisted: true,
            status: 'waitlist_cards',
          };
        })
      );

      return {
        success: true,
        message: 'Đã hoàn tác sang DUYỆT! Kho tạm hết thẻ, yêu cầu đã được đưa vào danh sách chờ thẻ (Waitlist).',
      };
    }
  };

  // 4. Admin Approve
  const adminApprove = (requestId: string, comment?: string) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    // Check available physical cards in inventory
    const availableCard = cards.find((c) => c.status === 'available');

    if (availableCard) {
      // Reserve card
      setCards((prev) =>
        prev.map((c) =>
          c.id === availableCard.id
            ? {
                ...c,
                status: 'reserved',
                currentRequestId: requestId,
                assignedToName: target.employeeName,
                assignedToCode: target.employeeCode,
              }
            : c
        )
      );

      const now = new Date().toISOString();
      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            adminApprovalStatus: 'approved',
            adminApprovalComment: comment?.trim() || 'Admin đã duyệt.',
            adminApprovedAt: now,
            adminApproverName: currentUser.name,
            isWaitlisted: false,
            reservedCardCode: availableCard.code,
            handoverReadyAt: now, // FR-01: Ghi nhận mốc sẵn sàng nhận thẻ
            status: 'pending_handover',
          };
        })
      );

      syncEditTelegramMessages(
        `msg_track_req_${requestId}`,
        `✅ <b>ĐÃ ĐƯỢC DUYỆT CẤP THẺ BỞI ${currentUser.name}!</b>\n\n• Mã yêu cầu: <code>${requestId}</code>\n• Người mượn: <b>${target.employeeName}</b>\n• Thẻ giữ dự kiến: <b>${availableCard.code}</b>\n• Người duyệt: <b>${currentUser.name} (qua Mini App)</b>\n• Trạng thái: <font color="#10b981">Chờ bàn giao thẻ tại quầy</font>`
      );

      return {
        success: true,
        message: `Admin đã duyệt! Đã giữ thẻ dự kiến ${availableCard.code} cho yêu cầu này.`,
      };
    } else {
      // Out of cards -> Enter Waitlist
      const now = new Date().toISOString();
      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            adminApprovalStatus: 'approved',
            adminApprovalComment: comment?.trim() || 'Admin đã duyệt (chờ thẻ vào kho).',
            adminApprovedAt: now,
            adminApproverName: currentUser.name,
            isWaitlisted: true,
            status: 'waitlist_cards',
          };
        })
      );

      syncEditTelegramMessages(
        `msg_track_req_${requestId}`,
        `⏳ <b>ĐÃ DUYỆT (HẾT THẺ - XẾP HÀNG CHỜ) BỞI ${currentUser.name}!</b>\n\n• Mã yêu cầu: <code>${requestId}</code>\n• Người mượn: <b>${target.employeeName}</b>\n• Người duyệt: <b>${currentUser.name} (qua Mini App)</b>\n• Trạng thái: <font color="#f59e0b">Chờ thẻ (Sẽ tự động cấp khi có thẻ hoàn trả)</font>`
      );

      return {
        success: true,
        message: 'Admin đã duyệt, nhưng kho hiện hết thẻ sẵn sàng. Yêu cầu đã đưa vào danh sách chờ thẻ.',
      };
    }
  };

  // 5. Admin Reject
  const adminReject = (requestId: string, reason: string) => {
    if (!reason.trim()) {
      return { success: false, message: 'Vui lòng nhập lý do từ chối yêu cầu.' };
    }

    const target = requests.find((r) => r.id === requestId);

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          adminApprovalStatus: 'rejected',
          adminApprovalComment: reason.trim(),
          adminApprovedAt: new Date().toISOString(),
          adminApproverName: currentUser.name,
          status: 'rejected_admin',
        };
      })
    );

    syncEditTelegramMessages(
      `msg_track_req_${requestId}`,
      `❌ <b>ĐÃ BỊ TỪ CHỐI BỞI ${currentUser.name}!</b>\n\n• Mã yêu cầu: <code>${requestId}</code>\n• Người mượn: <b>${target?.employeeName || ''}</b>\n• Người từ chối: <b>${currentUser.name} (qua Mini App)</b>\n• Lý do: <i>${reason.trim()}</i>`
    );

    return { success: true, message: 'Đã từ chối yêu cầu.' };
  };

  // 5b. Admin Forward to Leader for Approval (Khâu 2 -> Khâu 3)
  const adminForwardToLeader = (requestId: string) => {
    const target = requests.find((r) => r.id === requestId);
    if (!target) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    const directLeader = target.leaderId ? users.find((u) => u.id === target.leaderId) : null;
    const leaderMapping = leaderMappings.find((m) => m.department === target.department);
    const resolvedLeaderName = directLeader?.name || target.leaderName || leaderMapping?.leaderName;
    const resolvedLeaderId = directLeader?.id || target.leaderId || leaderMapping?.leaderId;
    const resolvedLeaderTelegramId = directLeader?.telegramId || target.leaderTelegramId || leaderMapping?.leaderTelegramId;

    const updatedReq: TaxiRequest = {
      ...target,
      leaderApprovalRequired: true,
      leaderApprovalStatus: 'pending',
      status: 'pending_leader',
      leaderId: resolvedLeaderId,
      leaderName: resolvedLeaderName,
      leaderTelegramId: resolvedLeaderTelegramId,
    };

    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? updatedReq : req))
    );
    syncToSupabase(updatedReq);

    syncEditTelegramMessages(
      `msg_track_req_${requestId}`,
      `📋 <b>ĐÃ CHUYỂN YÊU CẦU CHO LEADER DUYỆT!</b>\n\n• Mã yêu cầu: <code>${requestId}</code>\n• Người mượn: <b>${target.employeeName}</b>\n• Leader phụ trách: <b>${resolvedLeaderName || 'Leader'}</b>\n• Người chuyển: <b>${currentUser.name} (qua Mini App)</b>\n• Trạng thái: <font color="#f59e0b">Chờ Leader phê duyệt</font>`
    );

    // Gửi thông báo trực tiếp cho Leader qua Telegram kèm nút Duyệt / Từ chối
    if (resolvedLeaderTelegramId) {
      const botToken = '8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24';
      const timeDisplay = formatVietnameseDateTime(target.estimatedStartTime || target.createdAt);
      const relativeNotice = getRelativeTimeNotice(target.estimatedStartTime || target.createdAt);

      const leaderMsgText = `📋 <b>YÊU CẦU MƯỢN THẺ TAXI CẦN BẠN DUYỆT!</b>\n\nAdmin đã chuyển đơn của thành viên trong bộ phận đến bạn để phê duyệt:\n\n• Mã yêu cầu: <code>${target.id}</code>\n• Nhân sự: <b>${target.employeeName}</b> (Mã: <code>${target.employeeCode}</code>)\n• Bộ phận: <b>${target.department}</b>\n• Thời gian đi: <b>${timeDisplay}</b>${relativeNotice ? ` (<i>${relativeNotice}</i>)` : ''}\n• Mục đích: <b>${target.purpose}</b>\n• Điểm đến: <b>${target.destination}</b>\n${target.clientTag ? `• Thẻ khách/Dự án: <b>${target.clientTag}</b>\n` : ''}\n👇 <i>Leader vui lòng bấm xác nhận bên dưới:</i>`;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: resolvedLeaderTelegramId,
          text: leaderMsgText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Leader Đồng ý', callback_data: `leader_approve_${target.id}` },
                { text: '❌ Leader Từ chối', callback_data: `leader_reject_${target.id}` },
              ],
              [
                { text: '📱 Mở Mini App duyệt', web_app: { url: 'https://quanly-thetaxi.vercel.app' } },
              ],
            ],
          },
        }),
      }).catch((err) => console.warn('Error sending Telegram to leader:', err));
    }

    return {
      success: true,
      message: `Đã gửi yêu cầu phê duyệt tới Leader ${resolvedLeaderName || 'bộ phận'} qua Telegram!`,
    };
  };

  // 6. Assign Card from Waitlist (Admin/HR actively picks who gets card)
  const assignCardFromWaitlist = (requestId: string, cardCode: string) => {
    const card = cards.find((c) => c.code === cardCode && c.status === 'available');
    if (!card) {
      return { success: false, message: `Thẻ ${cardCode} hiện không ở trạng thái sẵn sàng trong kho.` };
    }

    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    // Reserve card
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              status: 'reserved',
              currentRequestId: requestId,
              assignedToName: targetReq.employeeName,
              assignedToCode: targetReq.employeeCode,
            }
          : c
      )
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          isWaitlisted: false,
          reservedCardCode: cardCode,
          status: 'pending_handover',
        };
      })
    );

    return {
      success: true,
      message: `Đã cấp thẻ ${cardCode} cho ${targetReq.employeeName}. Chuyển sang chờ bàn giao.`,
    };
  };

  // 7. Confirm Handover
  const confirmHandover = (requestId: string, actualCardCode: string, operatorName: string) => {
    const targetCard = cards.find((c) => c.code === actualCardCode);
    if (!targetCard) return { success: false, message: 'Không tìm thấy mã thẻ này trong hệ thống.' };

    if (targetCard.status === 'in_use') {
      return { success: false, message: `Thẻ ${actualCardCode} đang được sử dụng ở một lượt khác!` };
    }
    if (targetCard.status === 'damaged' || targetCard.status === 'lost') {
      return { success: false, message: `Thẻ ${actualCardCode} đang ở tình trạng ${targetCard.status === 'lost' ? 'Mất' : 'Hỏng/tạm khóa'}, không thể bàn giao!` };
    }

    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    // If previously another card was reserved, release it if different
    if (targetReq.reservedCardCode && targetReq.reservedCardCode !== actualCardCode) {
      setCards((prev) =>
        prev.map((c) =>
          c.code === targetReq.reservedCardCode && c.status === 'reserved'
            ? { ...c, status: 'available', currentRequestId: undefined, assignedToName: undefined }
            : c
        )
      );
    }

    // Set target card as in_use
    setCards((prev) =>
      prev.map((c) =>
        c.code === actualCardCode
          ? {
              ...c,
              status: 'in_use',
              currentRequestId: requestId,
              assignedToName: targetReq.employeeName,
              assignedToCode: targetReq.employeeCode,
            }
          : c
      )
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          actualCardCode: actualCardCode,
          handedOverBy: operatorName,
          handedOverAt: new Date().toISOString(),
          status: 'holding_card',
        };
      })
    );

    return {
      success: true,
      message: `Đã xác nhận bàn giao thẻ ${actualCardCode} cho ${targetReq.employeeName}.`,
    };
  };

  // 8. Release Reserved Card
  const releaseReservedCard = (requestId: string, reason: string, operatorName: string) => {
    if (!reason.trim()) {
      return { success: false, message: 'Vui lòng nhập lý do giải phóng thẻ đã giữ.' };
    }

    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    if (targetReq.reservedCardCode) {
      autoAssignCardIfWaitlisted(targetReq.reservedCardCode, requestId);
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'card_released',
          releasedReason: reason.trim(),
          releasedBy: operatorName,
          releasedAt: new Date().toISOString(),
        };
      })
    );

    return {
      success: true,
      message: 'Đã giải phóng thẻ về kho và hủy lượt giữ thẻ thành công.',
    };
  };

  // 8.1. Request Yield Card (Admin requests employee to yield card)
  const requestYieldCard = (requestId: string, reason?: string, operatorName?: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };
    if (targetReq.status !== 'pending_handover') {
      return { success: false, message: 'Chỉ có thể xin nhường thẻ khi đơn đang chờ bàn giao thẻ.' };
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          yieldStatus: 'pending_user_confirm',
          yieldReason: reason?.trim() || 'Có ca công tác khẩn cấp cần thẻ gấp',
          yieldRequestedAt: new Date().toISOString(),
          yieldRequestedBy: operatorName || currentUser.name,
        };
      })
    );

    return {
      success: true,
      message: `Đã gửi thông báo Telegram xin nhường thẻ tới ${targetReq.employeeName}. Đang chờ nhân sự xác nhận trên Telegram.`,
    };
  };

  // 8.2. Respond Yield Card (User clicks inline button on Telegram / App)
  const respondYieldCard = (requestId: string, accepted: boolean) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    if (accepted) {
      if (targetReq.reservedCardCode) {
        autoAssignCardIfWaitlisted(targetReq.reservedCardCode, requestId);
      }

      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            status: 'cancelled',
            yieldStatus: 'accepted',
            yieldRespondedAt: new Date().toISOString(),
            cancelledAt: new Date().toISOString(),
            cancelledReason: `Đã đồng ý nhường thẻ cho ca khẩn: ${req.yieldReason || ''}`,
          };
        })
      );

      return {
        success: true,
        message: 'Bạn đã xác nhận nhường thẻ thành công. Thẻ đã được giải phóng về kho cho ca khẩn.',
      };
    } else {
      setRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            yieldStatus: 'declined',
            yieldRespondedAt: new Date().toISOString(),
          };
        })
      );

      return {
        success: true,
        message: 'Bạn đã từ chối nhường thẻ. Thẻ vẫn tiếp tục được giữ cho chuyến đi của bạn.',
      };
    }
  };

  // 9. Confirm Return & Billing
  const confirmReturnAndBilling = (params: {
    requestId: string;
    cardCondition: CardCondition;
    pickupPoint: string;
    dropoffPoint: string;
    actualCost: number | null;
    isCostMissing: boolean;
    receiptNumber?: string;
    receiptPhotoUrl?: string;
    ocrSuggested?: boolean;
    operatorName: string;
  }) => {
    const targetReq = requests.find((r) => r.id === params.requestId);
    if (!targetReq) return { success: false, message: 'Không tìm thấy yêu cầu.' };

    const cardCode = targetReq.actualCardCode || targetReq.reservedCardCode;

    // Update physical card status & Auto-assign to waitlist if good
    if (cardCode) {
      if (params.cardCondition === 'good') {
        autoAssignCardIfWaitlisted(cardCode, params.requestId);
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.code === cardCode
              ? {
                  ...c,
                  status: 'damaged',
                  condition: params.cardCondition,
                  currentRequestId: undefined,
                  assignedToName: undefined,
                  assignedToCode: undefined,
                  lastReturnedAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
    }

    const maxSpend = config.maxSpendPerTrip;
    const isMissing = params.isCostMissing || params.actualCost === null;
    const cost = isMissing ? null : (params.actualCost as number);
    const isOver = !isMissing && (cost || 0) > maxSpend;
    const overAmt = isOver ? (cost || 0) - maxSpend : 0;

    let nextStatus: TaxiRequest['status'] = 'completed';
    if (isMissing) {
      nextStatus = 'returned_pending_bill';
    } else if (isOver) {
      nextStatus = 'overbudget_pending_hr';
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== params.requestId) return req;
        return {
          ...req,
          cardReturned: true,
          cardReturnedAt: new Date().toISOString(),
          cardReturnedCondition: params.cardCondition,
          returnedByOperator: params.operatorName,
          status: nextStatus,
          tripDetails: {
            pickupPoint: params.pickupPoint.trim(),
            dropoffPoint: params.dropoffPoint.trim(),
            actualCost: cost,
            isCostMissing: isMissing,
            receiptNumber: params.receiptNumber?.trim(),
            receiptPhotoUrl: params.receiptPhotoUrl,
            ocrSuggested: params.ocrSuggested,
            tripDate: new Date().toISOString().split('T')[0],
            maxSpendSnapshot: maxSpend,
            isOverBudget: isOver,
            overBudgetAmount: overAmt,
            hrOverBudgetDecision: isOver ? 'pending' : undefined,
          },
        };
      })
    );

    if (isMissing) {
      return {
        success: true,
        message: 'Đã thu hồi thẻ vật lý vào kho. Lượt đi được đánh dấu "Thiếu dữ liệu" hóa đơn.',
      };
    }

    if (isOver) {
      return {
        success: true,
        message: `Đã lưu bill! Cảnh báo: Chi phí (${cost?.toLocaleString('vi-VN')} đ) vượt mức tối đa (${maxSpend.toLocaleString('vi-VN')} đ). Chờ HR phê duyệt.`,
      };
    }

    return {
      success: true,
      message: 'Đã xác nhận thu hồi thẻ và lưu chi phí chuyến đi thành công.',
    };
  };

  // 10. HR Over-budget Decision
  const hrDecideOverBudget = (
    requestId: string,
    decision: 'accepted' | 'rejected',
    reason: string,
    hrName: string
  ) => {
    if (!reason.trim()) {
      return { success: false, message: 'Vui lòng nhập lý do quyết định.' };
    }

    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq || !targetReq.tripDetails) {
      return { success: false, message: 'Không tìm thấy dữ liệu chuyến đi.' };
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId || !req.tripDetails) return req;
        return {
          ...req,
          status: 'completed', // Rule: Reject does NOT delete the bill or actual cost, stays in actual figures with reject status
          tripDetails: {
            ...req.tripDetails,
            hrOverBudgetDecision: decision,
            hrDecisionBy: hrName,
            hrDecisionReason: reason.trim(),
            hrDecisionAt: new Date().toISOString(),
          },
        };
      })
    );

    return {
      success: true,
      message: `HR đã ${decision === 'accepted' ? 'Accept (Duyệt chi)' : 'Từ chối (Reject)'} khoản vượt mức thành công. Số tiền thực tế vẫn được lưu trữ theo quy định.`,
    };
  };

  // 11. Card management
  const addCard = (code: string, note?: string) => {
    const formatted = code.trim().toUpperCase();
    if (!formatted) return { success: false, message: 'Vui lòng nhập mã thẻ.' };
    if (cards.some((c) => c.code === formatted)) {
      return { success: false, message: `Mã thẻ ${formatted} đã tồn tại trong kho!` };
    }

    const newCard: TaxiCard = {
      id: `card-${Date.now()}`,
      code: formatted,
      status: 'available',
      condition: 'good',
      note: note?.trim(),
    };

    setCards((prev) => [...prev, newCard]);
    return { success: true, message: `Đã thêm thẻ ${formatted} vào kho.` };
  };

  const updateCardStatus = (cardId: string, status: TaxiCard['status'], note?: string) => {
    if (status === 'available') {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        autoAssignCardIfWaitlisted(card.code);
        return;
      }
    }

    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          status,
          condition: status === 'damaged' ? 'broken' : c.condition,
          note: note !== undefined ? note : c.note,
        };
      })
    );
  };

  const editCard = (
    cardId: string,
    data: { code?: string; note?: string; condition?: CardCondition; status?: TaxiCard['status'] }
  ) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) {
      return { success: false, message: 'Không tìm thấy thẻ cần chỉnh sửa!' };
    }

    if (data.code && data.code.trim().toUpperCase() !== card.code) {
      const formatted = data.code.trim().toUpperCase();
      const duplicate = cards.find((c) => c.id !== cardId && c.code === formatted);
      if (duplicate) {
        return { success: false, message: `Mã thẻ ${formatted} đã tồn tại trong hệ thống!` };
      }
    }

    const updatedCard: TaxiCard = {
      ...card,
      code: data.code ? data.code.trim().toUpperCase() : card.code,
      note: data.note !== undefined ? data.note.trim() : card.note,
      condition: data.condition !== undefined ? data.condition : card.condition,
      status: data.status !== undefined ? data.status : card.status,
    };

    setCards((prev) => prev.map((c) => (c.id === cardId ? updatedCard : c)));
    supabaseService.upsertCards([updatedCard]).catch(() => {});

    return { success: true, message: `Đã cập nhật thông tin thẻ ${updatedCard.code} thành công!` };
  };

  const deleteCard = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) {
      return { success: false, message: 'Không tìm thấy thẻ cần xóa!' };
    }

    if (card.status === 'in_use') {
      return {
        success: false,
        message: `Không thể xóa thẻ ${card.code} vì thẻ đang được bàn giao cho nhân sự sử dụng!`,
      };
    }

    if (card.status === 'reserved') {
      return {
        success: false,
        message: `Không thể xóa thẻ ${card.code} vì thẻ đang được giữ cho một đơn chờ nhận!`,
      };
    }

    setCards((prev) => prev.filter((c) => c.id !== cardId));
    supabaseService.deleteCard(cardId).catch(() => {});

    return { success: true, message: `Đã xóa thẻ ${card.code} khỏi kho thành công!` };
  };

  // 12. Reset all data
  const resetAllData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_currentUserId`);
    localStorage.removeItem(`${STORAGE_KEY}_config`);
    localStorage.removeItem(`${STORAGE_KEY}_cards`);
    localStorage.removeItem(`${STORAGE_KEY}_requests`);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setConfig(INITIAL_CONFIG);
    setCards(INITIAL_CARDS);
    setRequests(INITIAL_REQUESTS);
  };


  // 14. User Management Actions
  const registerUser = async (params: {
    code: string;
    name: string;
    department: string;
    leaderName: string;
    telegramId?: string;
    telegramUsername?: string;
  }) => {
    const trimmedCode = params.code.trim().toUpperCase();
    const existingByCode = users.find((u) => u.code && u.code.toUpperCase() === trimmedCode);
    if (
      existingByCode &&
      existingByCode.role !== 'pending' &&
      existingByCode.role !== 'rejected' &&
      existingByCode.role !== 'unregistered' &&
      existingByCode.id !== currentUser.id &&
      (params.telegramId ? existingByCode.telegramId !== params.telegramId : true)
    ) {
      return { success: false, message: `Mã nhân sự ${params.code} đã tồn tại và đã được kích hoạt trong hệ thống!` };
    }

    const existingUser = (params.telegramId ? users.find((u) => u.telegramId === params.telegramId) : null) || existingByCode;
    const targetId = existingUser ? existingUser.id : (currentUser.id.startsWith('unregistered-') ? `user-${params.telegramId || Date.now()}` : currentUser.id);

    const trimmedLeaderName = params.leaderName.trim();
    let targetLeader = users.find(
      (u) =>
        (u.isLeader || u.role === 'leader' || u.role === 'admin_hr') &&
        u.name.trim().toLowerCase() === trimmedLeaderName.toLowerCase()
    );

    let createdLeader: UserProfile | null = null;
    if (!targetLeader && trimmedLeaderName) {
      const newLeaderId = `lead-${Date.now()}`;
      createdLeader = {
        id: newLeaderId,
        name: trimmedLeaderName,
        code: `LD-${Math.floor(100 + Math.random() * 899)}`,
        department: params.department.trim(),
        telegramUsername: '',
        telegramId: '',
        role: 'leader',
        isLeader: true,
        botActive: false,
      };
      targetLeader = createdLeader;
    }

    const newUser: UserProfile = {
      id: targetId,
      code: trimmedCode,
      name: params.name.trim(),
      department: params.department.trim(),
      leaderId: targetLeader?.id,
      leaderName: trimmedLeaderName,
      telegramId: params.telegramId || '',
      telegramUsername: params.telegramUsername || '',
      role: 'pending',
      botActive: Boolean(params.telegramId),
    };

    setUsers((prev) => {
      let filtered = prev.filter((u) => u.id !== targetId && (params.telegramId ? u.telegramId !== params.telegramId : true));
      if (createdLeader) {
        filtered = [createdLeader, ...filtered];
      }
      return [newUser, ...filtered];
    });
    setCurrentUser(newUser);

    // Sync to Supabase
    if (createdLeader) {
      await supabaseService.upsertUser(createdLeader);
    }
    await supabaseService.upsertUser(newUser);

    // Notify all Admins / HR on Telegram with inline approval buttons
    const botToken = '8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24';
    const adminRecipients = users
      .filter((u) => (u.role === 'admin_hr' || u.role === 'admin') && u.telegramId)
      .map((u) => u.telegramId);

    const recipientSet = new Set(['5139629652', ...adminRecipients]);

    try {
      const trackedMessages: Array<{ chatId: string | number; messageId: number }> = [];
      (async () => {
        for (const adminId of Array.from(recipientSet)) {
          if (adminId && adminId.trim()) {
            try {
              const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: adminId,
                  text: `🔔 <b>CÓ THÀNH VIÊN MỚI CHỜ DUYỆT!</b>\n\n• Họ và tên: <b>${params.name}</b>\n• Mã nhân sự: <code>${params.code.toUpperCase()}</code>\n• Bộ phận: <b>${params.department}</b>\n• Leader quản lý: <b>${params.leaderName || 'Chưa cung cấp'}</b>\n• Telegram: <b>${params.telegramUsername || 'Không có'}</b> (ID: <code>${params.telegramId || 'N/A'}</code>)\n\n👇 <i>Admin có thể bấm duyệt phân quyền nhanh ngay tại đây:</i>`,
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '✅ Duyệt: Nhân sự', callback_data: `approve_user_employee_${targetId}` },
                        { text: '⭐ Duyệt: Leader', callback_data: `approve_user_leader_${targetId}` },
                      ],
                      [
                        { text: '❌ Từ chối', callback_data: `reject_user_${targetId}` },
                        { text: '🔍 Mở App chọn quyền khác', web_app: { url: 'https://quanly-thetaxi.vercel.app' } },
                      ],
                    ],
                  },
                }),
              });
              const json = await res.json();
              if (json.ok && json.result?.message_id) {
                trackedMessages.push({ chatId: json.result.chat.id, messageId: json.result.message_id });
              }
            } catch (e) {
              console.warn('Telegram notify admin error:', e);
            }
          }
        }

        if (trackedMessages.length > 0) {
          await supabase.from('users').upsert({
            id: `msg_track_user_${targetId}`,
            name: 'Tracker',
            code: 'MSG_META',
            department: 'system',
            role: 'system',
            telegram_username: JSON.stringify(trackedMessages),
          });
        }
      })();
    } catch (err) {
      console.warn('Telegram notify admin error:', err);
    }

    return {
      success: true,
      message: 'Hồ sơ đã được gửi thành công! Quản trị viên sẽ phê duyệt và kích hoạt quyền cho bạn.',
    };
  };

  const approveUser = (
    userId: string,
    options?: { createNewLeaderFromName?: string; role?: UserRole }
  ) => {
    const candidate = users.find((u) => u.id === userId);
    if (!candidate) {
      return { success: false, message: 'Không tìm thấy hồ sơ người dùng!' };
    }

    let createdLeader: UserProfile | null = null;
    let targetLeaderId = candidate.leaderId;

    if (options?.createNewLeaderFromName) {
      const leaderNameTrim = options.createNewLeaderFromName.trim();
      // Check if leader already exists
      const foundLeader = users.find(
        (u) => (u.isLeader || u.role === 'leader') && u.name.trim().toLowerCase() === leaderNameTrim.toLowerCase()
      );

      if (foundLeader) {
        targetLeaderId = foundLeader.id;
      } else {
        const newLeaderId = `lead-${Date.now()}`;
        createdLeader = {
          id: newLeaderId,
          name: leaderNameTrim,
          code: `LD-${Math.floor(100 + Math.random() * 899)}`,
          department: candidate.department,
          telegramUsername: '',
          telegramId: '',
          role: 'leader',
          isLeader: true,
          botActive: false,
        };
        targetLeaderId = newLeaderId;
      }
    }

    const grantedRole: UserRole = options?.role || 'employee';
    const isLeaderRole = grantedRole === 'leader' || grantedRole === 'admin_hr' || Boolean(candidate.isLeader);

    const updatedCandidate: UserProfile = {
      ...candidate,
      role: grantedRole,
      isLeader: isLeaderRole,
      leaderId: targetLeaderId,
      leaderName: candidate.leaderName || (targetLeaderId ? users.find((u) => u.id === targetLeaderId)?.name : undefined),
    };

    setUsers((prev) => {
      let next = prev.map((u) => (u.id === userId ? updatedCandidate : u));
      if (createdLeader) {
        next = [createdLeader, ...next];
      }
      return next;
    });

    if (currentUser.id === userId) {
      setCurrentUser(updatedCandidate);
    }

    // Sync to Supabase
    supabaseService.upsertUser(updatedCandidate).catch(() => {});
    if (createdLeader) {
      supabaseService.upsertUser(createdLeader).catch(() => {});
    }

    const roleLabel = grantedRole === 'leader' ? 'Leader duyệt đơn' : grantedRole === 'admin' ? 'Quản trị viên (Admin)' : grantedRole === 'admin_hr' ? 'Admin kiêm HR' : grantedRole === 'hr' ? 'HR Vận hành' : 'Nhân sự';

    // Đồng bộ sửa tin nhắn Telegram của tất cả Admin và gỡ toàn bộ nút bấm
    syncEditTelegramMessages(
      `msg_track_user_${userId}`,
      `✅ <b>ĐÃ ĐƯỢC PHÊ DUYỆT BỞI ${currentUser.name}!</b>\n\n• Họ và tên: <b>${candidate.name}</b> (<code>${candidate.code}</code>)\n• Bộ phận: <b>${candidate.department}</b>\n• Vai trò cấp: <b>${roleLabel}</b>\n• Người duyệt: <b>${currentUser.name} (qua Mini App)</b>\n• Trạng thái: <font color="#10b981">Đã cấp quyền hệ thống</font>`
    );

    // Notify approved employee on Telegram
    if (candidate.telegramId) {
      try {
        fetch(`https://api.telegram.org/bot8814759294:AAGq_7AgLzfhfvP26GlDVIW-K78EzMXNs24/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: candidate.telegramId,
            text: `🎉 <b>Chúc mừng bạn ${candidate.name}!</b>\n\nTài khoản của bạn đã được <b>Admin phê duyệt</b> với vai trò: <b>${roleLabel}</b>.\nBây giờ bạn đã có thể tạo yêu cầu mượn thẻ taxi khi cần đi công tác.\n\n👇 Bấm nút bên dưới để mở ứng dụng:`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚖 Mở TaxiCard Mini App', web_app: { url: 'https://quanly-thetaxi.vercel.app' } }],
              ],
            },
          }),
        }).catch(() => {});
      } catch {}
    }

    return {
      success: true,
      message: `Đã phê duyệt và cấp quyền thành công cho nhân sự ${candidate.name}!${
        createdLeader ? ` Đồng thời đã thêm Leader mới "${createdLeader.name}" vào hệ thống.` : ''
      }`,
    };
  };

  const rejectUser = (userId: string) => {
    const candidate = users.find((u) => u.id === userId);
    if (!candidate) {
      return { success: false, message: 'Không tìm thấy hồ sơ người dùng!' };
    }

    const updatedCandidate: UserProfile = {
      ...candidate,
      role: 'rejected',
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedCandidate : u)));
    supabaseService.upsertUser(updatedCandidate).catch(() => {});

    // Đồng bộ sửa tin nhắn Telegram của tất cả Admin và gỡ toàn bộ nút bấm
    syncEditTelegramMessages(
      `msg_track_user_${userId}`,
      `❌ <b>ĐÃ BỊ TỪ CHỐI BỞI ${currentUser.name}!</b>\n\n• Họ và tên: <b>${candidate.name}</b> (<code>${candidate.code}</code>)\n• Người xử lý: <b>${currentUser.name} (qua Mini App)</b>\n• Trạng thái: <font color="#ef4444">Từ chối cấp quyền</font>`
    );

    if (currentUser.id === userId) {
      setCurrentUser(updatedCandidate);
    }

    return { success: true, message: 'Đã từ chối cấp quyền cho nhân sự này.' };
  };

  const updateUserProfile = async (
    userId: string,
    updates: Partial<UserProfile>
  ) => {
    const existing = users.find((u) => u.id === userId);
    if (!existing) {
      return { success: false, message: 'Không tìm thấy hồ sơ người dùng!' };
    }
    const updatedUser: UserProfile = {
      ...existing,
      ...updates,
    };
    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
      localStorage.setItem(`${STORAGE_KEY}_currentUser`, JSON.stringify(updatedUser));
    }
    localStorage.setItem(
      `${STORAGE_KEY}_users`,
      JSON.stringify(users.map((u) => (u.id === userId ? updatedUser : u)))
    );

    // Sync to Supabase
    try {
      await supabaseService.upsertUser(updatedUser);
    } catch (e) {
      console.warn('Sync updateUserProfile to Supabase error:', e);
    }

    return { success: true, message: 'Cập nhật thông tin hồ sơ thành công!' };
  };

  const resetToNewRegistration = () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string; last_name?: string } } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
    setCurrentUser({
      id: `unregistered-${tg?.id || Date.now()}`,
      name: tg?.first_name ? `${tg.first_name} ${tg.last_name || ''}`.trim() : '',
      code: '',
      department: '',
      telegramUsername: tg?.username ? `@${tg.username}` : '',
      telegramId: tg?.id ? String(tg.id) : '',
      role: 'unregistered',
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        config,
        updateConfig,
        cards,
        requests,
        leaderMappings,
        activeViewMode,
        setActiveViewMode,
        uiDensityMode,
        setUiDensityMode,
        toggleUiDensityMode,
        isDarkMode,
        toggleDarkMode,
        supabaseStatus,
        createRequest,
        directDispatchCard,
        cancelRequest,
        leaderApprove,
        leaderReject,
        leaderUndoReject,
        adminApprove,
        adminReject,
        adminForwardToLeader,
        assignCardFromWaitlist,
        confirmHandover,
        releaseReservedCard,
        requestYieldCard,
        respondYieldCard,
        confirmReturnAndBilling,
        hrDecideOverBudget,
        addCard,
        editCard,
        deleteCard,
        updateCardStatus,
        resetAllData,
        registerUser,
        approveUser,
        rejectUser,
        updateUserProfile,
        resetToNewRegistration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
