import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import type { UserRole } from '../types';

const router = Router();

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const { role } = req.query;
  const db = getDb();
  let users = db.users;

  if (role && typeof role === 'string') {
    const validRoles: UserRole[] = ['resident', 'dispatcher', 'repair', 'admin'];
    if (!validRoles.includes(role as UserRole)) {
      res.status(400).json({ success: false, message: '无效的角色' });
      return;
    }

    if (role === 'repair' && req.user?.role === 'dispatcher') {
      users = users.filter(u => u.role === 'repair');
    } else if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    } else {
      users = users.filter(u => u.role === role);
    }
  } else {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
  }

  const safeUsers = users.map(({ passwordHash: _ph, ...u }) => u);
  res.json({ success: true, data: { list: safeUsers, total: safeUsers.length } });
});

export default router;
