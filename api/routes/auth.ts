import { Router, type Request, type Response } from 'express';
import { getDb, hashPassword, markDirty } from '../db/database.js';
import { authMiddleware, createToken, revokeToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    return;
  }
  const db = getDb();
  const user = db.users.find(u => u.username === username);
  if (!user) {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
    return;
  }
  if (user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
    return;
  }
  const token = createToken(user.id);
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({
    success: true,
    data: {
      token,
      user: safeUser,
    },
  });
});

router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    revokeToken(token);
  }
  res.json({ success: true, message: '登出成功' });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
