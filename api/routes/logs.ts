import { Router, type Request, type Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getLogs } from '../services/logService.js';

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { userId, ticketId, action, limit, offset } = req.query;
  const options: { userId?: number; ticketId?: number; action?: string; limit?: number; offset?: number } = {};
  if (userId) options.userId = Number(userId);
  if (ticketId) options.ticketId = Number(ticketId);
  if (action && typeof action === 'string') options.action = action;
  if (limit) options.limit = Number(limit);
  if (offset) options.offset = Number(offset);
  const result = getLogs(options);
  res.json({ success: true, data: result });
});

export default router;
