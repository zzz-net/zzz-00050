import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import TicketDetail from '../../components/TicketDetail';
import { ticketApi, logApi } from '../../utils/api';
import { formatDate } from '../../utils';
import {
  statusLabels,
  statusColors,
  categoryOptions,
  type Ticket,
  type TicketStatus,
  type OperationLog,
} from '../../types';

export default function MyTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitTicket, setResubmitTicket] = useState<Ticket | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsRes, logsRes] = await Promise.all([
        ticketApi.list({ keyword }),
        logApi.list({ limit: 200 }),
      ]);
      setTickets(ticketsRes.list || []);
      setLogs(logsRes.list || []);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let filtered = [...tickets];
    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    setFilteredTickets(filtered);
  }, [tickets, statusFilter]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleViewDetail = async (ticket: Ticket) => {
    try {
      const detail = await ticketApi.get(ticket.id);
      setSelectedTicket(detail);
      setDetailModalOpen(true);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '获取详情失败' });
    }
  };

  const handleOpenResubmit = (ticket: Ticket) => {
    setResubmitTicket(ticket);
    setEditTitle(ticket.title);
    setEditCategory(ticket.category);
    setEditAddress(ticket.address);
    setEditDescription(ticket.description);
    setEditErrors({});
    setResubmitModalOpen(true);
  };

  const validateResubmit = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editTitle.trim()) newErrors.title = '请输入报修标题';
    if (!editCategory) newErrors.category = '请选择报修类别';
    if (!editAddress.trim()) newErrors.address = '请输入报修地址';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResubmit = async () => {
    if (!resubmitTicket) return;
    if (!validateResubmit()) return;

    try {
      setSubmitting(true);
      await ticketApi.resubmit(resubmitTicket.id, {
        title: editTitle.trim(),
        category: editCategory,
        address: editAddress.trim(),
        description: editDescription.trim(),
      });
      setAlert({ type: 'success', message: '工单已重新提交' });
      setResubmitModalOpen(false);
      loadData();
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '提交失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions: { value: TicketStatus | ''; label: string }[] = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待派工' },
    { value: 'returned', label: '已退回' },
    { value: 'assigned', label: '已派工' },
    { value: 'processing', label: '处理中' },
    { value: 'closed', label: '已关闭' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && setKeyword(searchInput)}
                    placeholder="搜索工单标题、地址..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  />
                </div>
                <button
                  onClick={() => setKeyword(searchInput)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  搜索
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <Empty message="暂无工单记录" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">工单ID</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">标题</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">类别</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">地址</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">状态</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">创建时间</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm text-gray-900 font-medium">#{ticket.id}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.category}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">{ticket.address}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                            {statusLabels[ticket.status]}
                          </span>
                          {ticket.status === 'returned' && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle size={12} />
                              需补充
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(ticket.createdAt)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(ticket)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            详情
                          </button>
                          {ticket.status === 'returned' && (
                            <button
                              onClick={() => handleOpenResubmit(ticket)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
                            >
                              <Edit3 size={14} />
                              补充信息
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="工单详情"
        size="lg"
      >
        {selectedTicket && <TicketDetail ticket={selectedTicket} logs={logs} />}
      </Modal>

      <Modal
        isOpen={resubmitModalOpen}
        onClose={() => !submitting && setResubmitModalOpen(false)}
        title="补充信息并重新提交"
        size="md"
      >
        {resubmitTicket && (
          <div className="space-y-5">
            {resubmitTicket.returnReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 text-sm">退回原因</p>
                    <p className="text-red-700 text-sm mt-1">{resubmitTicket.returnReason}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  editErrors.title ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {editErrors.title && (
                <p className="text-red-500 text-xs mt-1">{editErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修类别 <span className="text-red-500">*</span>
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  editErrors.category ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <option value="">请选择</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {editErrors.category && (
                <p className="text-red-500 text-xs mt-1">{editErrors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  editErrors.address ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {editErrors.address && (
                <p className="text-red-500 text-xs mt-1">{editErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">问题描述</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResubmitModalOpen(false)}
                disabled={submitting}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleResubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium"
              >
                {submitting ? '提交中...' : '重新提交'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
