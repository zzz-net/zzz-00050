import { Router, type Request, type Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  returnTicket,
  resubmitTicket,
  processTicket,
  closeTicket,
  reopenTicket,
} from '../services/ticketService.js';
import type { TicketStatus } from '../types';

const router = Router();

router.post('/', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const { title, category, address, description } = req.body;
  if (!title || !category || !address) {
    res.status(400).json({ success: false, message: '标题、类别和地址不能为空' });
    return;
  }
  const user = req.user!;
  const ticket = createTicket({ title, category, address, description: description || '' }, user.id, user.name);
  res.json({ success: true, data: ticket });
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const user = req.user!;
  const { status, keyword, limit, offset } = req.query;
  const options: { status?: TicketStatus; keyword?: string; limit?: number; offset?: number; residentId?: number; repairId?: number } = {};
  if (status && typeof status === 'string') {
    options.status = status as TicketStatus;
  }
  if (keyword && typeof keyword === 'string') {
    options.keyword = keyword;
  }
  if (limit) {
    options.limit = Number(limit);
  }
  if (offset) {
    options.offset = Number(offset);
  }
  if (user.role === 'resident') {
    options.residentId = user.id;
  } else if (user.role === 'repair') {
    options.repairId = user.id;
  }
  const result = getTickets(options);
  res.json({ success: true, data: result });
});

router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = req.user!;
  const ticket = getTicketById(id);
  if (!ticket) {
    res.status(404).json({ success: false, message: '工单不存在' });
    return;
  }
  if (user.role === 'resident' && ticket.residentId !== user.id) {
    res.status(403).json({ success: false, message: '权限不足' });
    return;
  }
  if (user.role === 'repair' && ticket.repairId !== user.id && ticket.status !== 'pending' && ticket.status !== 'returned') {
    res.status(403).json({ success: false, message: '权限不足' });
    return;
  }
  res.json({ success: true, data: ticket });
});

router.put('/:id/assign', authMiddleware, requireRole('dispatcher'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { repairId, version } = req.body;
  if (!repairId || version === undefined) {
    res.status(400).json({ success: false, message: '参数不完整' });
    return;
  }
  const user = req.user!;
  const result = assignTicket(id, { repairId: Number(repairId), version: Number(version) }, user.id, user.name);
  if (!result.success) {
    const statusCode = result.conflict ? 409 : 400;
    res.status(statusCode).json({ success: false, message: result.message, conflict: result.conflict });
    return;
  }
  res.json({ success: true, data: result.ticket });
});

router.put('/:id/return', authMiddleware, requireRole('dispatcher'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ success: false, message: '退回原因不能为空' });
    return;
  }
  const user = req.user!;
  const result = returnTicket(id, { reason }, user.id, user.name);
  if (!result.success) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, data: result.ticket });
});

router.put('/:id/resubmit', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, category, address, description } = req.body;
  if (!title || !category || !address) {
    res.status(400).json({ success: false, message: '标题、类别和地址不能为空' });
    return;
  }
  const user = req.user!;
  const result = resubmitTicket(id, { title, category, address, description: description || '' }, user.id, user.name);
  if (!result.success) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, data: result.ticket });
});

router.put('/:id/process', authMiddleware, requireRole('repair'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { result } = req.body;
  if (!result) {
    res.status(400).json({ success: false, message: '处理结果不能为空' });
    return;
  }
  const user = req.user!;
  const r = processTicket(id, { result }, user.id, user.name);
  if (!r.success) {
    res.status(400).json({ success: false, message: r.message });
    return;
  }
  res.json({ success: true, data: r.ticket });
});

router.put('/:id/close', authMiddleware, requireRole('repair'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = req.user!;
  const result = closeTicket(id, user.id, user.name);
  if (!result.success) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, data: result.ticket });
});

router.put('/:id/reopen', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = req.user!;
  const result = reopenTicket(id, user.id, user.name);
  if (!result.success) {
    res.status(400).json({ success: false, message: result.message });
    return;
  }
  res.json({ success: true, data: result.ticket });
});

export default router;
