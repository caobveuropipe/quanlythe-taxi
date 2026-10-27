export type UserRole = 'employee' | 'leader' | 'admin' | 'hr' | 'admin_hr' | 'pending' | 'rejected' | 'unregistered';

export interface UserProfile {
  id: string;
  name: string;
  code: string;
  department: string;
  telegramUsername: string;
  telegramId: string;
  role: UserRole;
  isLeader?: boolean;
  leaderId?: string; // ID of the direct leader
  leaderName?: string; // Tên leader khi người dùng tự đăng ký
  botActive?: boolean; // Whether the user's Telegram bot is activated
  registeredAt?: string;
}

export type CardStatus = 'available' | 'reserved' | 'in_use' | 'damaged' | 'lost';
export type CardCondition = 'good' | 'scratched' | 'broken';

export interface TaxiCard {
  id: string;
  code: string; // e.g. "TAXI-01"
  status: CardStatus;
  condition: CardCondition;
  currentRequestId?: string;
  assignedToName?: string;
  assignedToCode?: string;
  lastReturnedAt?: string;
  note?: string;
}

export type RequestStatus =
  | 'pending_leader'       // Chờ Leader duyệt
  | 'rejected_leader'      // Leader từ chối
  | 'pending_admin'        // Chờ Admin duyệt
  | 'rejected_admin'       // Admin từ chối
  | 'waitlist_cards'       // Hết thẻ, chờ trong danh sách
  | 'pending_handover'     // Đã duyệt, chờ HR/Admin bàn giao thẻ
  | 'holding_card'         // Nhân sự đang giữ thẻ vật lý
  | 'returned_pending_bill'// Đã thu hồi thẻ, đang thiếu bill ("Thiếu dữ liệu")
  | 'overbudget_pending_hr'// Chi phí vượt mức, chờ HR Accept hoặc Reject
  | 'completed'            // Hoàn tất (trong hạn mức hoặc HR đã Accept/Reject)
  | 'card_released'        // Thẻ đã giữ bị giải phóng do nhân sự không đến nhận
  | 'cancelled';           // Người tạo tự hủy yêu cầu khi chưa được duyệt/cấp

export interface TripBilling {
  pickupPoint: string;
  dropoffPoint: string;
  actualCost: number | null; // null if missing data
  isCostMissing: boolean;    // "Thiếu dữ liệu"
  receiptPhotoUrl?: string;
  receiptNumber?: string;
  tripDate?: string;
  ocrSuggested?: boolean;
  maxSpendSnapshot: number;  // Snapshot of limit at return time (e.g., 500000)
  isOverBudget: boolean;
  overBudgetAmount: number;
  hrOverBudgetDecision?: 'pending' | 'accepted' | 'rejected';
  hrDecisionBy?: string;
  hrDecisionReason?: string;
  hrDecisionAt?: string;
}

export interface TaxiRequest {
  id: string; // e.g., "REQ-2026-101"
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  purpose: string;
  destination: string;
  clientTag?: string; // Optional client label
  createdAt: string;

  // Snapshot rule: Setting change only applies to new requests
  leaderApprovalRequired: boolean;

  // Leader approval step
  leaderId?: string;
  leaderName?: string;
  leaderTelegramId?: string;
  leaderApprovalStatus?: 'pending' | 'approved' | 'rejected';
  leaderApprovalComment?: string;
  leaderApprovedAt?: string;

  // Admin approval step
  adminApprovalStatus?: 'pending' | 'approved' | 'rejected';
  adminApprovalComment?: string;
  adminApprovedAt?: string;
  adminApproverName?: string;

  // Card assignment
  isWaitlisted: boolean;
  reservedCardCode?: string; // Mã thẻ dự kiến khi duyệt
  actualCardCode?: string;   // Mã thẻ thực giao
  handedOverBy?: string;     // Tên HR/Admin giao
  handedOverAt?: string;

  // Return & bill
  cardReturned: boolean;
  cardReturnedAt?: string;
  cardReturnedCondition?: CardCondition;
  returnedByOperator?: string;

  // Card release if not picked up
  releasedReason?: string;
  releasedBy?: string;
  releasedAt?: string;

  // Cancellation by requester before approval
  cancelledAt?: string;
  cancelledReason?: string;

  // Yield card request from Admin to User
  yieldStatus?: 'pending_user_confirm' | 'accepted' | 'declined';
  yieldReason?: string;
  yieldRequestedAt?: string;
  yieldRequestedBy?: string;
  yieldRespondedAt?: string;

  // Direct Dispatch at counter
  isDirectDispatch?: boolean;

  // Estimated start time for smart waitlist priority
  estimatedStartTime?: string;

  // Handover readiness timestamp for precise timeline alert (FR-01)
  handoverReadyAt?: string;

  // Leader decision timestamp (for 90-min undo window)
  leaderDecisionAt?: string;

  // Trip details & bill
  tripDetails?: TripBilling;

  status: RequestStatus;
}

export interface DepartmentLeaderMapping {
  department: string;
  leaderId: string;
  leaderName: string;
  leaderTelegramId: string;
  leaderTelegramUsername: string;
  botActive: boolean;
}

export type AnnouncementRoleTarget = 'all' | 'user' | 'admin';
export type AnnouncementType = 'info' | 'warning' | 'success' | 'urgent';

export interface AppAnnouncement {
  enabled: boolean;
  title: string;
  content: string;
  targetRole: AnnouncementRoleTarget;
  type?: AnnouncementType;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AppConfig {
  requireLeaderApproval: boolean;
  maxSpendPerTrip: number; // Default 500,000 VND
  announcement?: AppAnnouncement;
}

