import { useState, useEffect } from 'react';
import { Search, Eye, Play, Edit, XCircle, Filter } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import TicketDetail from '../../components/TicketDetail';
import { useAuthStore } from '../../store';
import { ticketApi, logApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket, type TicketStatus, type OperationLog } from '../../types';

export default function RepairTickets() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processResult, setProcessResult] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, statusFilter, searchKeyword]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketsRes, logsRes] = await Promise.all([
        ticketApi.list(),
        logApi.list({ limit: 100 }),
      ]);

      const repairTickets = ticketsRes.list.filter(
        (t: Ticket) => t.repairId === user?.id
      );

      setTickets(repairTickets);
      setLogs(logsRes.list);
    } catch (e: any) {
      setError(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(keyword) ||
          t.category.toLowerCase().includes(keyword) ||
          t.address.toLowerCase().includes(keyword) ||
          String(t.id).includes(keyword)
      );
    }

    setFilteredTickets(filtered);
  };

  const handleViewDetail = async (ticket: Ticket) => {
    try {
      const detail = await ticketApi.get(ticket.id);
      setSelectedTicket(detail);
      setDetailModalOpen(true);
    } catch (e: any) {
      setError(e.message || '获取工单详情失败');
    }
  };

  const handleStartProcess = async (ticket: Ticket) => {
    try {
      setError('');
      await ticketApi.process(ticket.id, { result: '开始处理' });
      setSuccess('已开始处理');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || '操作失败');
    }
  };

  const handleOpenProcess = (ticket: Ticket, closing: boolean = false) => {
    setSelectedTicket(ticket);
    setProcessResult(ticket.processResult || '');
    setIsClosing(closing);
    setProcessModalOpen(true);
  };

  const handleProcess = async () => {
    if (!selectedTicket) return;

    if (isClosing && !processResult.trim()) {
      setError('请先填写处理结果再关闭工单');
      return;
    }

    if (!processResult.trim()) {
      setError('请填写处理结果');
      return;
    }

    try {
      setError('');
      await ticketApi.process(selectedTicket.id, { result: processResult });

      if (isClosing) {
        await ticketApi.close(selectedTicket.id);
        setSuccess('工单已关闭');
      } else {
        setSuccess('处理结果已保存');
      }

      setProcessModalOpen(false);
      setProcessResult('');
      fetchData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || '操作失败');
    }
  };

  const handleClose = async (ticket: Ticket) => {
    if (!ticket.processResult || !ticket.processResult.trim()) {
      setError('请先填写处理结果再关闭工单');
      return;
    }

    try {
      setError('');
      await ticketApi.close(ticket.id);
      setSuccess('工单已关闭');
      fetchData();

      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || '关闭工单失败');
    }
  };

  const statusOptions: { value: TicketStatus | ''; label: string }[] = [
    { value: '', label: '全部状态' },
    { value: 'assigned', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'closed', label: '已完成' },
    { value: 'returned', label: '已退回' },
  ];

  return (
    <AppLayout>
      {error && (
        <Alert type="error" message={error} className="mb-6" />
      )}
      {success && (
        <Alert type="success" message={success} className="mb-6" />
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索工单ID、标题、类别、地址..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">我的工单</h3>
            <span className="text-sm text-gray-500">共 {filteredTickets.length} 条记录</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : filteredTickets.length === 0 ? (
              <Empty message="暂无工单记录" />
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工单ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类别</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{ticket.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">{ticket.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ticket.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">{ticket.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ticket.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(ticket)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            查看
                          </button>
                          {ticket.status === 'assigned' && (
                            <button
                              onClick={() => handleStartProcess(ticket)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Play size={14} />
                              开始处理
                            </button>
                          )}
                          {(ticket.status === 'assigned' || ticket.status === 'processing') && (
                            <button
                              onClick={() => handleOpenProcess(ticket, false)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <Edit size={14} />
                              填写结果
                            </button>
                          )}
                          {ticket.status === 'processing' && (
                            <button
                              onClick={() => handleOpenProcess(ticket, true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <XCircle size={14} />
                              完工关闭
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="工单详情"
        size="lg"
      >
        {selectedTicket && (
          <TicketDetail ticket={selectedTicket} logs={logs} />
        )}
      </Modal>

      <Modal
        isOpen={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        title={isClosing ? '完工关闭' : '填写处理结果'}
        size="md"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">工单 #{selectedTicket.id}</p>
              <p className="font-medium text-gray-900">{selectedTicket.title}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                处理结果 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={processResult}
                onChange={(e) => setProcessResult(e.target.value)}
                rows={5}
                placeholder="请详细描述处理结果..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setProcessModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleProcess}
                disabled={!processResult.trim()}
                className={`px-5 py-2.5 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  isClosing
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isClosing ? '确定关闭' : '保存结果'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
