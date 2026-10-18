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


