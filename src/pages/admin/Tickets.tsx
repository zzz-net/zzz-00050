import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Eye,
  RotateCcw,
  RefreshCw,
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
  type Ticket,
  type TicketStatus,
  type OperationLog,
} from '../../types';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [reopenTicket, setReopenTicket] = useState<Ticket | null>(null);
  const [reopening, setReopening] = useState(false);

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

  const handleOpenReopen = (ticket: Ticket) => {
    setReopenTicket(ticket);
    setReopenConfirm(true);
  };

  const handleReopen = async () => {
    if (!reopenTicket) return;
    try {
      setReopening(true);
      await ticketApi.reopen(reopenTicket.id);
      setAlert({ type: 'success', message: '工单已重开' });
      setReopenConfirm(false);
      setReopenTicket(null);
      loadData();
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '重开失败' });
    } finally {
      setReopening(false);
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
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
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
                    placeholder="搜索工单标题、地址、报修人..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white"
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

            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
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
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">报修人</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">维修人员</th>
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
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.residentName || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.repairName || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
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
                          {ticket.status === 'closed' && (
                            <button
                              onClick={() => handleOpenReopen(ticket)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
                            >
                              <RotateCcw size={14} />
                              重开
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
        isOpen={reopenConfirm}
        onClose={() => !reopening && setReopenConfirm(false)}
        title="确认重开工单"
        size="sm"
      >
        {reopenTicket && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-gray-700">
                确定要重开工单 <span className="font-medium text-gray-900">#{reopenTicket.id} {reopenTicket.title}</span> 吗？
              </p>
              <p className="text-sm text-orange-700 mt-2">重开后工单将变为"待派工"状态，需重新派工处理。</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReopenConfirm(false)}
                disabled={reopening}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:bg-orange-400 font-medium"
              >
                {reopening ? '处理中...' : '确认重开'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
