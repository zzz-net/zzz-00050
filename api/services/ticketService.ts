import { getDb, markDirty } from '../db/database.js';
import { addLog } from './logService.js';
import type { Ticket, TicketStatus, CreateTicketInput, AssignTicketInput, ReturnTicketInput, ProcessTicketInput, ResubmitTicketInput } from '../types';

function populateTicketNames(ticket: Ticket): Ticket {
  const db = getDb();
  const resident = db.users.find(u => u.id === ticket.residentId);
  const dispatcher = ticket.dispatcherId ? db.users.find(u => u.id === ticket.dispatcherId) : undefined;
  const repair = ticket.repairId ? db.users.find(u => u.id === ticket.repairId) : undefined;
  return {
    ...ticket,
    residentName: resident?.name,
    dispatcherName: dispatcher?.name,
    repairName: repair?.name,
  };
}

export function createTicket(input: CreateTicketInput, residentId: number, residentName: string): Ticket {
  const db = getDb();
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: db.nextTicketId++,
    title: input.title,
    category: input.category,
    address: input.address,
    description: input.description,
    status: 'pending',
    residentId,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  db.tickets.unshift(ticket);
  markDirty();
  addLog(residentId, residentName, 'create_ticket', ticket.id, `提交报修：${input.title}`);
  return populateTicketNames(ticket);
}

export function getTickets(options?: {
  status?: TicketStatus;
  residentId?: number;
  repairId?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let tickets = [...db.tickets];
  if (options?.status) {
    tickets = tickets.filter(t => t.status === options.status);
  }
  if (options?.residentId) {
    tickets = tickets.filter(t => t.residentId === options.residentId);
  }
  if (options?.repairId) {
    tickets = tickets.filter(t => t.repairId === options.repairId);
  }
  if (options?.keyword) {
    const kw = options.keyword.toLowerCase();
    tickets = tickets.filter(t =>
      t.title.toLowerCase().includes(kw) ||
      t.address.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw)
    );
  }
  const total = tickets.length;
  if (options?.offset) {
    tickets = tickets.slice(options.offset);
  }
  if (options?.limit) {
    tickets = tickets.slice(0, options.limit);
  }
  return {
    list: tickets.map(populateTicketNames),
    total,
  };
}

export function getTicketById(id: number): Ticket | null {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === id);
  if (!ticket) return null;
  return populateTicketNames(ticket);
}

export function assignTicket(
  ticketId: number,
  input: AssignTicketInput,
  dispatcherId: number,
  dispatcherName: string
): { success: boolean; ticket?: Ticket; message?: string; conflict?: boolean } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.version !== input.version) {
    return { success: false, message: '工单状态已变更，请刷新后重试', conflict: true };
  }
  if (ticket.status !== 'pending') {
    return { success: false, message: '当前状态不支持派工' };
  }
  const repairUser = db.users.find(u => u.id === input.repairId && u.role === 'repair');
  if (!repairUser) {
    return { success: false, message: '维修人员不存在' };
  }
  ticket.status = 'assigned';
  ticket.dispatcherId = dispatcherId;
  ticket.repairId = input.repairId;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  markDirty();
  addLog(dispatcherId, dispatcherName, 'assign_ticket', ticketId, `派工给${repairUser.name}`);
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function returnTicket(
  ticketId: number,
  input: ReturnTicketInput,
  dispatcherId: number,
  dispatcherName: string
): { success: boolean; ticket?: Ticket; message?: string } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.status !== 'pending') {
    return { success: false, message: '当前状态不支持退回' };
  }
  ticket.status = 'returned';
  ticket.dispatcherId = dispatcherId;
  ticket.returnReason = input.reason;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  markDirty();
  addLog(dispatcherId, dispatcherName, 'return_ticket', ticketId, `退回原因：${input.reason}`);
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function resubmitTicket(
  ticketId: number,
  input: ResubmitTicketInput,
  residentId: number,
  residentName: string
): { success: boolean; ticket?: Ticket; message?: string } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.status !== 'returned') {
    return { success: false, message: '当前状态不支持重新提交' };
  }
  if (ticket.residentId !== residentId) {
    return { success: false, message: '只能操作自己的工单' };
  }
  ticket.title = input.title;
  ticket.category = input.category;
  ticket.address = input.address;
  ticket.description = input.description;
  ticket.status = 'pending';
  ticket.returnReason = undefined;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  markDirty();
  addLog(residentId, residentName, 'resubmit_ticket', ticketId, '补充信息后重新提交');
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function processTicket(
  ticketId: number,
  input: ProcessTicketInput,
  repairId: number,
  repairName: string
): { success: boolean; ticket?: Ticket; message?: string } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.repairId !== repairId) {
    return { success: false, message: '只能处理指派给自己的工单' };
  }
  if (ticket.status === 'assigned') {
    ticket.status = 'processing';
    ticket.version += 1;
    ticket.updatedAt = new Date().toISOString();
    addLog(repairId, repairName, 'start_process', ticketId, '开始处理工单');
  }
  if (ticket.status !== 'processing') {
    return { success: false, message: '当前状态不支持处理' };
  }
  ticket.processResult = input.result;
  markDirty();
  addLog(repairId, repairName, 'process_ticket', ticketId, `填写处理结果`);
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function closeTicket(
  ticketId: number,
  repairId: number,
  repairName: string
): { success: boolean; ticket?: Ticket; message?: string } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.repairId !== repairId) {
    return { success: false, message: '只能关闭指派给自己的工单' };
  }
  if (ticket.status !== 'processing' && ticket.status !== 'assigned') {
    return { success: false, message: '当前状态不支持关闭' };
  }
  if (!ticket.processResult || ticket.processResult.trim() === '') {
    return { success: false, message: '请先填写处理结果再关闭工单' };
  }
  ticket.status = 'closed';
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  markDirty();
  addLog(repairId, repairName, 'close_ticket', ticketId, '工单处理完成，已关闭');
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function reopenTicket(
  ticketId: number,
  adminId: number,
  adminName: string
): { success: boolean; ticket?: Ticket; message?: string } {
  const db = getDb();
  const ticket = db.tickets.find(t => t.id === ticketId);
  if (!ticket) {
    return { success: false, message: '工单不存在' };
  }
  if (ticket.status !== 'closed') {
    return { success: false, message: '只有已关闭的工单才能重开' };
  }
  ticket.status = 'pending';
  ticket.processResult = undefined;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  markDirty();
  addLog(adminId, adminName, 'reopen_ticket', ticketId, '管理员重开工单');
  return { success: true, ticket: populateTicketNames(ticket) };
}

export function getAllTicketsForExport(): Ticket[] {
  const db = getDb();
  return db.tickets.map(populateTicketNames);
}
