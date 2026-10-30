import { TaxiCard, TaxiRequest, UserProfile, DepartmentLeaderMapping, AppConfig, AppAnnouncement } from '../types';

export const INITIAL_ANNOUNCEMENT: AppAnnouncement = {
  // Mặc định TẮT: chỉ hiện khi Admin bật & đã đồng bộ từ Supabase (tránh popup nháy ra khi chưa tải xong / lỗi mạng)
  enabled: false,
  title: 'Thông báo quy định mượn thẻ Taxi',
  content: 'Nhân sự vui lòng gửi yêu cầu trước giờ khởi hành tối thiểu 30 phút. Sau chuyến đi, chụp ảnh hóa đơn rõ nét và hoàn trả thẻ trong vòng 24h để hoàn tất thủ tục quyết toán.',
  targetRole: 'all',
  type: 'info',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CONFIG: AppConfig = {
  requireLeaderApproval: true,
  maxSpendPerTrip: 500000, // 500,000 VND
  announcement: INITIAL_ANNOUNCEMENT,
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin-vancao',
    name: 'Van Cao - CCL',
    code: 'ADMIN-01',
    department: '',
    telegramUsername: '@vancao',
    telegramId: '5139629652',
    role: 'admin_hr',
    isLeader: true,
    botActive: true,
  },
];

export const INITIAL_LEADER_MAPPINGS: DepartmentLeaderMapping[] = [];

export const INITIAL_CARDS: TaxiCard[] = [
  {
    id: 'card-01',
    code: 'TAXI-01',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Vinasun VIP',
  },
];

export const INITIAL_REQUESTS: TaxiRequest[] = [];


