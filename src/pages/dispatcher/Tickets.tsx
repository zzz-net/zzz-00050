import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Send, XCircle, Eye } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import TicketDetail from '../../components/TicketDetail';
import { ticketApi, userApi, logApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket, type User, type OperationLog, type TicketStatus } from '../../types';

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketLogs, setTicketLogs] = useState<OperationLog[]>([]);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTicket, setAssignTicket] = useState<Ticket | null>(null);
  const [repairUsers, setRepairUsers] = useState<User[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<number | ''>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignConflict, setAssignConflict] = useState(false);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTicket, setReturnTicket] = useState<Ticket | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: string; keyword?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (keyword) params.keyword = keyword;
      const res = await ticketApi.list(params);
      setTickets(res.list);
    } catch (e) {
      console.error('加载工单列表失败', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, keyword]);

  const loadRepairUsers = async () => {
    try {
      const res = await userApi.getUsers('repair');
      setRepairUsers(res.list);
    } catch (e) {
      console.error('加载维修人员列表失败', e);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (assignModalOpen) {
      loadRepairUsers();
    }
  }, [assignModalOpen]);

  const handleSearch = () => {
    setKeyword(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewDetail = async (ticket: Ticket) => {
    try {
      setSelectedTicket(ticket);
      const logsRes = await logApi.list({ ticketId: ticket.id });
      setTicketLogs(logsRes.list);
      setDetailModalOpen(true);
    } catch (e) {
      console.error('加载工单详情失败', e);
    }
  };

  const handleOpenAssignModal = (ticket: Ticket) => {
    setAssignTicket(ticket);
    setSelectedRepairId('');
    setAssignConflict(false);
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!assignTicket || selectedRepairId === '') return;

    try {
      setAssignLoading(true);
      setAssignConflict(false);
      await ticketApi.assign(assignTicket.id, {
        repairId: selectedRepairId as number,
        version: assignTicket.version,
      });
      setAssignModalOpen(false);
      loadTickets();
    } catch (e: any) {
      if (e.status === 409) {
        setAssignConflict(true);
      } else {
        console.error('派工失败', e);
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRefreshConflict = async () => {
    if (!assignTicket) return;
    try {
      const updated = await ticketApi.get(assignTicket.id);
      setAssignTicket(updated);
      setAssignConflict(false);
    } catch (e) {
      console.error('刷新工单失败', e);
    }
  };

  const handleOpenReturnModal = (ticket: Ticket) => {
    setReturnTicket(ticket);
    setReturnReason('');
    setReturnModalOpen(true);
  };

  const handleReturn = async () => {
    if (!returnTicket || !returnReason.trim()) return;

    try {
      setReturnLoading(true);
      await ticketApi.return(returnTicket.id, {
        reason: returnReason.trim(),
      });
      setReturnModalOpen(false);
      loadTickets();
    } catch (e: any) {
      console.error('退回失败', e);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleRefreshList = () => {
    loadTickets();
  };

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待派工' },
    { value: 'assigned', label: '已派工' },
    { value: 'returned', label: '已退回' },
    { value: 'processing', label: '处理中' },
    { value: 'closed', label: '已关闭' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[160px]"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="搜索工单标题、地址、报修人..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  搜索
                </button>
              </div>
            </div>

            <button
              onClick={handleRefreshList}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <Empty message="暂无工单" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">工单ID</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">标题</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">类别</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">地址</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">报修人</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">状态</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">创建时间</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(ticket)}
                    >
                      <td className="py-4 px-6 text-sm text-gray-900 font-medium">#{ticket.id}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.category}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">{ticket.address}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.residentName || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(ticket.createdAt)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewDetail(ticket)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            详情
                          </button>
                          {ticket.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(ticket)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Send size={14} />
                                派工
                              </button>
                              <button
                                onClick={() => handleOpenReturnModal(ticket)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <XCircle size={14} />
                                退回
                              </button>
                            </>
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
        {selectedTicket && (
          <TicketDetail ticket={selectedTicket} logs={ticketLogs} />
        )}
      </Modal>

      <Modal
        isOpen={assignModalOpen}
        onClose={() => !assignLoading && setAssignModalOpen(false)}
        title="派工"
        size="md"
      >
        {assignTicket && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">工单 #{assignTicket.id}</p>
              <p className="font-medium text-gray-900">{assignTicket.title}</p>
              <p className="text-sm text-gray-600 mt-1">{assignTicket.address}</p>
            </div>

            {assignConflict && (
              <div className="space-y-2">
                <Alert type="warning" message="工单状态已变更，请刷新后重试" />
                <button
                  onClick={handleRefreshConflict}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
                >
                  <RefreshCw size={16} />
                  刷新工单
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择维修人员 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRepairId}
                onChange={(e) => setSelectedRepairId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={assignConflict || assignLoading}
              >
                <option value="">请选择维修人员</option>
                {repairUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} (@{user.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAssignModalOpen(false)}
                disabled={assignLoading}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedRepairId === '' || assignLoading || assignConflict}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assignLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    派工中...
                  </>
                ) : (
                  '确定派工'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={returnModalOpen}
        onClose={() => !returnLoading && setReturnModalOpen(false)}
        title="退回工单"
        size="md"
      >
        {returnTicket && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">工单 #{returnTicket.id}</p>
              <p className="font-medium text-gray-900">{returnTicket.title}</p>
              <p className="text-sm text-gray-600 mt-1">{returnTicket.address}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                退回原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="请输入退回原因..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                disabled={returnLoading}
              />
              {!returnReason.trim() && returnReason.length > 0 && (
                <p className="text-red-500 text-xs mt-1">退回原因不能为空</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReturnModalOpen(false)}
                disabled={returnLoading}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleReturn}
                disabled={!returnReason.trim() || returnLoading}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {returnLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    退回中...
                  </>
                ) : (
                  '确定退回'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
