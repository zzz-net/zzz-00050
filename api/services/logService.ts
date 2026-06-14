import { getDb, markDirty } from '../db/database.js';
import type { OperationLog } from '../types';

export function addLog(userId: number, userName: string, action: string, ticketId?: number, detail?: string): OperationLog {
  const db = getDb();
  const log: OperationLog = {
    id: db.nextLogId++,
    userId,
    userName,
    action,
    ticketId,
    detail,
    createdAt: new Date().toISOString(),
  };
  db.logs.unshift(log);
  markDirty();
  return log;
}

export function getLogs(options?: { userId?: number; ticketId?: number; action?: string; limit?: number; offset?: number }) {
  const db = getDb();
  let logs = [...db.logs].sort((a, b) => b.id - a.id);
  if (options?.userId) {
    logs = logs.filter(l => l.userId === options.userId);
  }
  if (options?.ticketId) {
    logs = logs.filter(l => l.ticketId === options.ticketId);
  }
  if (options?.action) {
    logs = logs.filter(l => l.action === options.action);
  }
  const total = logs.length;
  if (options?.offset) {
    logs = logs.slice(options.offset);
  }
  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }
  return { list: logs, total };
}
