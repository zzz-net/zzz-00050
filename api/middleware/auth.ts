import type { Request, Response, NextFunction } from 'express';
import { getDb, markDirty } from '../db/database.js';
import type { UserRole, User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function generateToken(): string {
  return 'tk_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) {
    res.status(401).json({ success: false, message: '未登录' });
    return;
  }
  const db = getDb();
  const userId = db.tokens[token];
  if (!userId) {
    res.status(401).json({ success: false, message: '登录已过期' });
    return;
  }
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    res.status(401).json({ success: false, message: '用户不存在' });
    return;
  }
  const { passwordHash: _ph, ...safeUser } = user;
  req.user = safeUser as User;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
    next();
  };
}

export function createToken(userId: number): string {
  const token = generateToken();
  const db = getDb();
  db.tokens[token] = userId;
  markDirty();
  return token;
}

export function revokeToken(token: string) {
  const db = getDb();
  delete db.tokens[token];
  markDirty();
}
