import { TaxiCard, TaxiRequest, UserProfile, DepartmentLeaderMapping, AppConfig } from '../types';

export const INITIAL_CONFIG: AppConfig = {
  requireLeaderApproval: true,
  maxSpendPerTrip: 500000, // 500,000 VND
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin-vancao',
    name: 'Van Cao - CCL',
    code: 'ADMIN-01',
    department: 'Ban Giám Đốc & Quản Trị',
    telegramUsername: '@vancao',
    telegramId: '5139629652',
    role: 'admin_hr',
    isLeader: true,
    botActive: true,
  },
  {
    id: 'user-01',
    name: 'Nguyễn Văn A',
    code: 'NV-1024',
    department: 'Phòng Kinh Doanh',
    telegramUsername: '@nguyenvana_sales',
    telegramId: '884729101',
    role: 'employee',
    leaderId: 'user-03',
    botActive: true,
  },
  {
    id: 'user-02',
    name: 'Lê Thị Mai',
    code: 'NV-1088',
    department: 'Phòng Marketing',
    telegramUsername: '@maile_mkt',
    telegramId: '884729102',
    role: 'employee',
    leaderId: 'user-06',
    botActive: true,
  },
  {
    id: 'user-03',
    name: 'Trần Thị Bích',
    code: 'LD-201',
    department: 'Phòng Kinh Doanh',
    telegramUsername: '@bich_tran_lead',
    telegramId: '992014501',
    role: 'leader',
    isLeader: true,
    botActive: true,
  },
  {
    id: 'user-04',
    name: 'Lê Hoàng Nam',
    code: 'AD-001',
    department: 'Ban Quản Trị & Vận Hành',
    telegramUsername: '@nam_adminhr',
    telegramId: '110023401',
    role: 'admin_hr', // Admin kiêm HR
    botActive: true,
  },
  {
    id: 'user-05',
    name: 'Phạm Thu Hà',
    code: 'HR-003',
    department: 'Phòng Hành Chính Nhân Sự',
    telegramUsername: '@ha_hr_admin',
    telegramId: '110056701',
    role: 'hr',
    botActive: true,
  },
  {
    id: 'user-06',
    name: 'Vũ Quốc Huy',
    code: 'LD-202',
    department: 'Phòng Marketing',
    telegramUsername: '@huy_mkt_lead',
    telegramId: '992014502',
    role: 'leader',
    isLeader: true,
    botActive: false, // Demo notice: bot not active yet
  },
];

export const INITIAL_LEADER_MAPPINGS: DepartmentLeaderMapping[] = [
  {
    department: 'Phòng Kinh Doanh',
    leaderId: 'user-03',
    leaderName: 'Trần Thị Bích',
    leaderTelegramId: '992014501',
    leaderTelegramUsername: '@bich_tran_lead',
    botActive: true,
  },
  {
    department: 'Phòng Marketing',
    leaderId: 'user-06',
    leaderName: 'Vũ Quốc Huy',
    leaderTelegramId: '992014502',
    leaderTelegramUsername: '@huy_mkt_lead',
    botActive: false, // Example: Bot not activated yet
  },
  {
    department: 'Phòng Kỹ Thuật & Sản Phẩm',
    leaderId: 'user-04',
    leaderName: 'Lê Hoàng Nam',
    leaderTelegramId: '110023401',
    leaderTelegramUsername: '@nam_adminhr',
    botActive: true,
  },
];

export const INITIAL_CARDS: TaxiCard[] = [
  {
    id: 'card-01',
    code: 'TAXI-01',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Vinasun VIP',
  },
  {
    id: 'card-02',
    code: 'TAXI-02',
    status: 'available',
    condition: 'good',
    note: 'Thẻ vật lý Vinasun VIP',
  },
  {
    id: 'card-03',
    code: 'TAXI-03',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Taxi Group',
  },
  {
    id: 'card-04',
    code: 'TAXI-04',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Taxi Group',
  },
  {
    id: 'card-05',
    code: 'TAXI-05',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Mai Linh Taxi',
  },
  {
    id: 'card-06',
    code: 'TAXI-06',
    status: 'available',
    condition: 'good',
    note: 'Thẻ Mai Linh Taxi',
  },
];

export const INITIAL_REQUESTS: TaxiRequest[] = [];


