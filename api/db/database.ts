import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Database, UserWithPassword, Ticket, OperationLog } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16) + '_' + password.length;
}

function getInitialData(): Database {
  const now = new Date().toISOString();
  const users: UserWithPassword[] = [
    { id: 1, username: 'resident1', passwordHash: hashPassword('123456'), name: '张三', role: 'resident', createdAt: now },
    { id: 2, username: 'resident2', passwordHash: hashPassword('123456'), name: '李四', role: 'resident', createdAt: now },
    { id: 3, username: 'dispatcher1', passwordHash: hashPassword('123456'), name: '王调度', role: 'dispatcher', createdAt: now },
    { id: 4, username: 'dispatcher2', passwordHash: hashPassword('123456'), name: '赵调度', role: 'dispatcher', createdAt: now },
    { id: 5, username: 'repair1', passwordHash: hashPassword('123456'), name: '陈师傅', role: 'repair', createdAt: now },
    { id: 6, username: 'repair2', passwordHash: hashPassword('123456'), name: '刘师傅', role: 'repair', createdAt: now },
    { id: 7, username: 'admin', passwordHash: hashPassword('123456'), name: '系统管理员', role: 'admin', createdAt: now },
  ];

  const tickets: Ticket[] = [
    {
      id: 1,
      title: '楼道灯不亮',
      category: '水电维修',
      address: '1号楼3单元2层楼道',
      description: '楼道灯已经坏了3天，晚上回家很不方便',
      status: 'pending',
      residentId: 1,
      residentName: '张三',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      version: 1,
    },
    {
      id: 2,
      title: '水管漏水',
      category: '水电维修',
      address: '2号楼1单元501室',
      description: '厨房水管接口处漏水，需要紧急处理',
      status: 'assigned',
      residentId: 2,
      residentName: '李四',
      dispatcherId: 3,
      dispatcherName: '王调度',
      repairId: 5,
      repairName: '陈师傅',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      version: 2,
    },
    {
      id: 3,
      title: '电梯故障',
      category: '设备故障',
      address: '3号楼2单元',
      description: '电梯按钮全部失灵，无法使用',
      status: 'closed',
      residentId: 1,
      residentName: '张三',
      dispatcherId: 3,
      dispatcherName: '王调度',
      repairId: 6,
      repairName: '刘师傅',
      processResult: '已更换电梯控制面板，恢复正常使用',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
      version: 4,
    },
  ];

  const logs: OperationLog[] = [
    { id: 1, userId: 1, userName: '张三', action: 'create_ticket', ticketId: 1, detail: '提交报修：楼道灯不亮', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, userId: 2, userName: '李四', action: 'create_ticket', ticketId: 2, detail: '提交报修：水管漏水', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 3, userId: 3, userName: '王调度', action: 'assign_ticket', ticketId: 2, detail: '派工给陈师傅', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 4, userId: 1, userName: '张三', action: 'create_ticket', ticketId: 3, detail: '提交报修：电梯故障', createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 5, userId: 3, userName: '王调度', action: 'assign_ticket', ticketId: 3, detail: '派工给刘师傅', createdAt: new Date(Date.now() - 200000000).toISOString() },
    { id: 6, userId: 6, userName: '刘师傅', action: 'close_ticket', ticketId: 3, detail: '处理完成并关闭工单', createdAt: new Date(Date.now() - 43200000).toISOString() },
  ];

  return {
    users,
    tickets,
    logs,
    nextUserId: 8,
    nextTicketId: 4,
    nextLogId: 7,
    tokens: {},
  };
}

let db: Database;
let saveTimeout: NodeJS.Timeout | null = null;

function loadDatabase(): Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content) as Database;
    } catch (e) {
      console.error('Failed to load database, using initial data', e);
      return getInitialData();
    }
  } else {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveDatabase() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database', e);
    }
  }, 100);
}

export function initDatabase() {
  db = loadDatabase();
  console.log('Database loaded, users:', db.users.length, 'tickets:', db.tickets.length, 'logs:', db.logs.length);
}

export function getDb(): Database {
  return db;
}

export function markDirty() {
  saveDatabase();
}

export { hashPassword };
