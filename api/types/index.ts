import type { User, Ticket, OperationLog, UserRole, TicketStatus } from '../../shared/types';

export type { User, Ticket, OperationLog, UserRole, TicketStatus };

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface Database {
  users: UserWithPassword[];
  tickets: Ticket[];
  logs: OperationLog[];
  nextUserId: number;
  nextTicketId: number;
  nextLogId: number;
  tokens: Record<string, number>;
}

export interface CreateTicketInput {
  title: string;
  category: string;
  address: string;
  description: string;
}

export interface AssignTicketInput {
  repairId: number;
  version: number;
}

export interface ReturnTicketInput {
  reason: string;
}

export interface ProcessTicketInput {
  result: string;
}

export interface ResubmitTicketInput {
  title: string;
  category: string;
  address: string;
  description: string;
}
