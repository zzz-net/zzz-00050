import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getAllTicketsForExport } from '../services/ticketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.resolve(__dirname, '../../exports');

const router = Router();

const statusMap: Record<string, string> = {
  pending: '待派工',
  returned: '已退回',
  assigned: '已派工',
  processing: '处理中',
  closed: '已关闭',
};

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

router.get('/tickets', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const tickets = getAllTicketsForExport();
  const headers = ['工单ID', '标题', '类别', '地址', '描述', '状态', '报修人', '调度员', '维修人员', '退回原因', '处理结果', '创建时间', '更新时间'];
  const rows = tickets.map(t => [
    t.id,
    t.title,
    t.category,
    t.address,
    t.description,
    statusMap[t.status] || t.status,
    t.residentName || '',
    t.dispatcherName || '',
    t.repairName || '',
    t.returnReason || '',
    t.processResult || '',
    t.createdAt,
    t.updatedAt,
  ]);

  const csvContent = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
  const filename = `tickets_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf-8');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csvContent);
});

export default router;
