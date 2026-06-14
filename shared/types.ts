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

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
