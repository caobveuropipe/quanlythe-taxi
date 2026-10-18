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


// Realistic OCR mock templates
export const OCR_PRESETS = [
  {
    id: 'receipt-01',
    name: 'Hóa đơn Taxi Mai Linh (Hà Nội)',
    invoiceNo: 'ML-094821',
    date: '2026-10-04',
    pickup: 'Tòa nhà FPT Tower, Cầu Giấy',
    dropoff: 'Trụ sở công ty, Phan Chu Trinh, Hoàn Kiếm',
    amount: 185000,
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480"><rect width="360" height="480" fill="%23f8fafc" rx="8"/><rect x="20" y="20" width="320" height="440" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1.5" stroke-dasharray="4 4" rx="6"/><text x="180" y="60" font-family="monospace" font-size="16" font-weight="bold" fill="%2315803d" text-anchor="middle">MAI LINH TAXI GROUP</text><text x="180" y="80" font-family="monospace" font-size="11" fill="%2364748b" text-anchor="middle">HÓA ĐƠN ĐIỆN TỬ CƯỚC TAXI</text><line x1="40" y1="95" x2="320" y2="95" stroke="%23e2e8f0" stroke-width="1"/><text x="40" y="125" font-family="sans-serif" font-size="12" fill="%23475569">Mã HĐ: <tspan font-weight="bold" fill="%230f172a">ML-094821</tspan></text><text x="40" y="150" font-family="sans-serif" font-size="12" fill="%23475569">Ngày: <tspan font-weight="bold" fill="%230f172a">04/10/2026 11:42</tspan></text><text x="40" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Xe số: <tspan font-weight="bold" fill="%230f172a">30A-928.14</tspan></text><line x1="40" y1="195" x2="320" y2="195" stroke="%23e2e8f0" stroke-width="1"/><text x="40" y="225" font-family="sans-serif" font-size="12" fill="%23475569">Điểm đón: <tspan font-weight="bold" fill="%230f172a">FPT Tower, Cầu Giấy</tspan></text><text x="40" y="255" font-family="sans-serif" font-size="12" fill="%23475569">Điểm trả: <tspan font-weight="bold" fill="%230f172a">Phan Chu Trinh, HK</tspan></text><text x="40" y="285" font-family="sans-serif" font-size="12" fill="%23475569">Quãng đường: <tspan font-weight="bold" fill="%230f172a">11.4 km</tspan></text><line x1="40" y1="310" x2="320" y2="310" stroke="%23e2e8f0" stroke-width="1"/><text x="40" y="345" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23334155">TỔNG CỘNG:</text><text x="320" y="345" font-family="monospace" font-size="18" font-weight="bold" fill="%230f172a" text-anchor="end">185.000 VNĐ</text><rect x="40" y="375" width="280" height="50" fill="%23f0fdf4" stroke="%2386efac" rx="6"/><text x="180" y="405" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23166534" text-anchor="middle">THANH TOÁN BẰNG THẺ NỘI BỘ</text></svg>',
  },
  {
    id: 'receipt-02',
    name: 'Hóa đơn Vinasun VIP (Vượt mức 720.000 đ)',
    invoiceNo: 'VS-552109',
    date: '2026-10-04',
    pickup: 'Văn phòng trụ sở, Hoàn Kiếm',
    dropoff: 'Khu Công nghệ cao Hòa Lạc (chờ 3h)',
    amount: 720000,
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480"><rect width="360" height="480" fill="%23fffbeb" rx="8"/><rect x="20" y="20" width="320" height="440" fill="%23ffffff" stroke="%23fde68a" stroke-width="1.5" stroke-dasharray="4 4" rx="6"/><text x="180" y="60" font-family="monospace" font-size="16" font-weight="bold" fill="%23b45309" text-anchor="middle">VINASUN TAXI VIP</text><text x="180" y="80" font-family="monospace" font-size="11" fill="%2392400e" text-anchor="middle">BIÊN LAI CƯỚC CHUYẾN ĐI DÀI</text><line x1="40" y1="95" x2="320" y2="95" stroke="%23fef3c7" stroke-width="1"/><text x="40" y="125" font-family="sans-serif" font-size="12" fill="%23475569">Mã HĐ: <tspan font-weight="bold" fill="%230f172a">VS-552109</tspan></text><text x="40" y="150" font-family="sans-serif" font-size="12" fill="%23475569">Ngày: <tspan font-weight="bold" fill="%230f172a">04/10/2026 15:30</tspan></text><text x="40" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Xe số: <tspan font-weight="bold" fill="%230f172a">29B-441.90</tspan></text><line x1="40" y1="195" x2="320" y2="195" stroke="%23fef3c7" stroke-width="1"/><text x="40" y="225" font-family="sans-serif" font-size="12" fill="%23475569">Điểm đón: <tspan font-weight="bold" fill="%230f172a">Văn phòng Hoàn Kiếm</tspan></text><text x="40" y="255" font-family="sans-serif" font-size="12" fill="%23475569">Điểm trả: <tspan font-weight="bold" fill="%230f172a">KCNC Hòa Lạc (chờ 3h)</tspan></text><text x="40" y="285" font-family="sans-serif" font-size="12" fill="%23475569">Quãng đường: <tspan font-weight="bold" fill="%230f172a">38.5 km + Thời gian chờ</tspan></text><line x1="40" y1="310" x2="320" y2="310" stroke="%23fef3c7" stroke-width="1"/><text x="40" y="345" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23334155">TỔNG TIỀN:</text><text x="320" y="345" font-family="monospace" font-size="18" font-weight="bold" fill="%23b45309" text-anchor="end">720.000 VNĐ</text><rect x="40" y="375" width="280" height="50" fill="%23fef2f2" stroke="%23fca5a5" rx="6"/><text x="180" y="405" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23b91c1c" text-anchor="middle">CẢNH BÁO: VƯỢT HẠN MỨC 500K</text></svg>',
  },
];
