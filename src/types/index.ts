export type UserRole = 'resident' | 'dispatcher' | 'repair' | 'admin';

export type TicketStatus = 'pending' | 'returned' | 'assigned' | 'processing' | 'closed';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  category: string;
  address: string;
  description: string;
  status: TicketStatus;
  residentId: number;
  residentName?: string;
  dispatcherId?: number;
  dispatcherName?: string;
  repairId?: number;
  repairName?: string;
  returnReason?: string;
  processResult?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OperationLog {
  id: number;
  userId: number;
  userName?: string;
  action: string;
  ticketId?: number;
  detail?: string;
  createdAt: string;
}

export interface DraftTicket {
  id: string;
  title: string;
  category: string;
  address: string;
  description: string;
  savedAt: string;
}

export type PageRoute =
  | '/login'
  | '/resident/dashboard'
  | '/resident/submit'
  | '/resident/tickets'
  | '/resident/drafts'
  | '/dispatcher/dashboard'
  | '/dispatcher/tickets'
  | '/repair/dashboard'
  | '/repair/tickets'
  | '/admin/dashboard'
  | '/admin/tickets'
  | '/admin/logs'
  | '/admin/export';

export const statusLabels: Record<TicketStatus, string> = {
  pending: '待派工',
  returned: '已退回',
  assigned: '已派工',
  processing: '处理中',
  closed: '已关闭',
};

export const statusColors: Record<TicketStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  returned: 'bg-red-100 text-red-800',
  assigned: 'bg-blue-100 text-blue-800',
  processing: 'bg-orange-100 text-orange-800',
  closed: 'bg-green-100 text-green-800',
};

export const roleLabels: Record<UserRole, string> = {
  resident: '居民',
  dispatcher: '调度员',
  repair: '维修人员',
  admin: '管理员',
};

export const categoryOptions = [
  { value: '水电维修', label: '水电维修' },
  { value: '设备故障', label: '设备故障' },
  { value: '环境卫生', label: '环境卫生' },
  { value: '绿化养护', label: '绿化养护' },
  { value: '治安消防', label: '治安消防' },
  { value: '其他', label: '其他' },
];
