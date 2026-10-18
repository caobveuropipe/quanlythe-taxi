import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { TaxiCard, TaxiRequest, UserProfile } from '../types';

// Convert DB snake_case row to TypeScript camelCase UserProfile
export const fromDbUser = (row: any): UserProfile => ({
  id: row.id,
  name: row.name,
  code: row.code,
  department: row.department,
  telegramUsername: row.telegram_username || '',
  telegramId: String(row.telegram_id || ''),
  role: row.role || 'employee',
  isLeader: Boolean(row.is_leader),
  leaderId: row.leader_id || undefined,
  botActive: Boolean(row.telegram_id),
});

// Convert TypeScript camelCase UserProfile to DB snake_case row
export const toDbUser = (user: UserProfile) => ({
  id: user.id,
  name: user.name,
  code: user.code,
  department: user.department,
  telegram_username: user.telegramUsername || null,
  telegram_id: user.telegramId || null,
  role: user.role,
  is_leader: Boolean(user.isLeader),
  leader_id: user.leaderId || null,
});

// Convert DB snake_case row to TypeScript camelCase TaxiCard
export const fromDbCard = (row: any): TaxiCard => ({
  id: row.id,
  code: row.code,
  status: row.status,
  condition: row.condition,
  currentRequestId: row.current_request_id || undefined,
  assignedToName: row.assigned_to_name || undefined,
  assignedToCode: row.assigned_to_code || undefined,
  lastReturnedAt: row.last_returned_at || undefined,
  note: row.note || undefined,
});

// Convert TypeScript camelCase TaxiCard to DB snake_case row
export const toDbCard = (card: TaxiCard) => ({
  id: card.id,
  code: card.code,
  status: card.status,
  condition: card.condition,
  current_request_id: card.currentRequestId || null,
  assigned_to_name: card.assignedToName || null,
  assigned_to_code: card.assignedToCode || null,
  last_returned_at: card.lastReturnedAt || null,
  note: card.note || null,
});

// Convert DB snake_case row to TypeScript camelCase TaxiRequest
export const fromDbRequest = (row: any): TaxiRequest => ({
  id: row.id,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  employeeCode: row.employee_code,
  department: row.department,
  purpose: row.purpose,
  destination: row.destination,
  clientTag: row.client_tag || undefined,
  createdAt: row.created_at,
  estimatedStartTime: row.estimated_start_time || undefined,
  status: row.status,
  leaderApprovalRequired: row.leader_approval_required ?? true,
  leaderId: row.leader_id || undefined,
  leaderName: row.leader_name || undefined,
  leaderTelegramId: row.leader_telegram_id || undefined,
  leaderApprovalStatus: row.leader_approval_status || undefined,
  leaderApprovalComment: row.leader_approval_comment || undefined,
  leaderApprovedAt: row.leader_approved_at || undefined,
  adminApprovalStatus: row.admin_approval_status || undefined,
  adminApprovalComment: row.admin_approval_comment || undefined,
  adminApprovedAt: row.admin_approved_at || undefined,
  adminApproverName: row.admin_approver_name || undefined,
  isWaitlisted: Boolean(row.is_waitlisted),
  reservedCardCode: row.reserved_card_code || undefined,
  actualCardCode: row.actual_card_code || undefined,
  handedOverBy: row.handed_over_by || undefined,
  handedOverAt: row.handed_over_at || undefined,
  cardReturned: Boolean(row.card_returned),
  cardReturnedAt: row.card_returned_at || undefined,
  cardReturnedCondition: row.card_returned_condition || undefined,
  returnedByOperator: row.returned_by_operator || undefined,
  tripDetails: row.trip_details || undefined,
  cancelledAt: row.cancelled_at || undefined,
  cancelledReason: row.cancelled_reason || undefined,
  yieldStatus: row.yield_status || undefined,
  yieldReason: row.yield_reason || undefined,
  yieldRequestedAt: row.yield_requested_at || undefined,
  yieldRequestedBy: row.yield_requested_by || undefined,
  yieldRespondedAt: row.yield_responded_at || undefined,
});

// Convert TypeScript camelCase TaxiRequest to DB snake_case row
export const toDbRequest = (req: TaxiRequest) => ({
  id: req.id,
  employee_id: req.employeeId,
  employee_name: req.employeeName,
  employee_code: req.employeeCode,
  department: req.department,
  purpose: req.purpose,
  destination: req.destination,
  client_tag: req.clientTag || null,
  created_at: req.createdAt,
  estimated_start_time: req.estimatedStartTime || null,
  status: req.status,
  leader_approval_required: req.leaderApprovalRequired,
  leader_id: req.leaderId || null,
  leader_name: req.leaderName || null,
  leader_telegram_id: req.leaderTelegramId || null,
  leader_approval_status: req.leaderApprovalStatus || null,
  leader_approval_comment: req.leaderApprovalComment || null,
  leader_approved_at: req.leaderApprovedAt || null,
  admin_approval_status: req.adminApprovalStatus || null,
  admin_approval_comment: req.adminApprovalComment || null,
  admin_approved_at: req.adminApprovedAt || null,
  admin_approver_name: req.adminApproverName || null,
  is_waitlisted: req.isWaitlisted,
  reserved_card_code: req.reservedCardCode || null,
  actual_card_code: req.actualCardCode || null,
  handed_over_by: req.handedOverBy || null,
  handed_over_at: req.handedOverAt || null,
  card_returned: req.cardReturned,
  card_returned_at: req.cardReturnedAt || null,
  card_returned_condition: req.cardReturnedCondition || null,
  returned_by_operator: req.returnedByOperator || null,
  trip_details: req.tripDetails || null,
  cancelled_at: req.cancelledAt || null,
  cancelled_reason: req.cancelledReason || null,
  yield_status: req.yieldStatus || null,
  yield_reason: req.yieldReason || null,
  yield_requested_at: req.yieldRequestedAt || null,
  yield_requested_by: req.yieldRequestedBy || null,
  yield_responded_at: req.yieldRespondedAt || null,
});

export const supabaseService = {
  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase credentials chưa được cấu hình.' };
    }
    try {
      const { error } = await supabase.from('taxi_cards').select('id').limit(1);
      if (error) {
        return { success: false, message: `Lỗi kết nối Supabase: ${error.message}` };
      }
      return { success: true, message: 'Đã kết nối thành công tới Supabase!' };
    } catch (err: any) {
      return { success: false, message: `Lỗi mạng: ${err.message}` };
    }
  },

  // Fetch all cards
  async getCards(): Promise<TaxiCard[] | null> {
    try {
      const { data, error } = await supabase
        .from('taxi_cards')
        .select('*')
        .order('code', { ascending: true });
      if (error || !data) return null;
      return data.map(fromDbCard);
    } catch {
      return null;
    }
  },

  // Upsert cards in batch
  async upsertCards(cards: TaxiCard[]) {
    try {
      const rows = cards.map(toDbCard);
      await supabase.from('taxi_cards').upsert(rows);
    } catch (e) {
      console.warn('Supabase upsertCards error:', e);
    }
  },

  // Fetch all requests
  async getRequests(): Promise<TaxiRequest[] | null> {
    try {
      const { data, error } = await supabase
        .from('taxi_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map(fromDbRequest);
    } catch {
      return null;
    }
  },

  // Save single request
  async upsertRequest(req: TaxiRequest) {
    try {
      const row = toDbRequest(req);
      const { error } = await supabase.from('taxi_requests').upsert(row);
      if (error) console.warn('Supabase upsertRequest error:', error);
    } catch (e) {
      console.warn('Supabase upsertRequest error:', e);
    }
  },

  // Save multiple requests (initial seed)
  async upsertRequests(reqs: TaxiRequest[]) {
    try {
      const rows = reqs.map(toDbRequest);
      await supabase.from('taxi_requests').upsert(rows);
    } catch (e) {
      console.warn('Supabase upsertRequests error:', e);
    }
  },

  // Realtime subscription for requests
  subscribeToRequests(onUpdate: (payload: any) => void) {
    return supabase
      .channel('public:taxi_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taxi_requests' },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },

  // Realtime subscription for cards
  subscribeToCards(onUpdate: (payload: any) => void) {
    return supabase
      .channel('public:taxi_cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taxi_cards' },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },

  // Delete card
  async deleteCard(cardId: string) {
    try {
      await supabase.from('taxi_cards').delete().eq('id', cardId);
    } catch (e) {
      console.warn('Supabase deleteCard error:', e);
    }
  },

  // Fetch all users
  async getUsers(): Promise<UserProfile[] | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      if (error || !data) return null;
      return data.map(fromDbUser);
    } catch {
      return null;
    }
  },

  // Upsert user
  async upsertUser(user: UserProfile) {
    try {
      const row = toDbUser(user);
      const { error } = await supabase.from('users').upsert(row);
      if (error) console.warn('Supabase upsertUser error:', error);
    } catch (e) {
      console.warn('Supabase upsertUser error:', e);
    }
  },

  // Delete user
  async deleteUser(userId: string) {
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn('Supabase deleteUser error:', e);
    }
  },

  // Realtime subscription for users
  subscribeToUsers(onUpdate: (payload: any) => void) {
    return supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },
};
