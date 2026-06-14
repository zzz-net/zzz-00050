import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Wrench, CheckCircle, Eye } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import TicketDetail from '../../components/TicketDetail';
import { useAuthStore } from '../../store';
import { ticketApi, logApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket, type OperationLog } from '../../types';

export default function RepairDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ assigned: 0, processing: 0, closed: 0 });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketsRes, logsRes] = await Promise.all([
        ticketApi.list({ limit: 10 }),
        logApi.list({ limit: 50 }),
      ]);

      const repairTickets = ticketsRes.list.filter(
        (t: Ticket) => t.repairId === user?.id
      );

      setStats({
        assigned: repairTickets.filter((t) => t.status === 'assigned').length,
        processing: repairTickets.filter((t) => t.status === 'processing').length,
        closed: repairTickets.filter((t) => t.status === 'closed').length,
      });

      setRecentTickets(repairTickets.slice(0, 5));
      setLogs(logsRes.list);
    } catch (e: any) {
      setError(e.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
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

  const statCards = [
    { label: '待处理', value: stats.assigned, color: 'blue', icon: <Clock size={24} /> },
    { label: '处理中', value: stats.processing, color: 'orange', icon: <Wrench size={24} /> },
    { label: '已完成', value: stats.closed, color: 'green', icon: <CheckCircle size={24} /> },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <AppLayout>
      {error && (
        <Alert type="error" message={error} className="mb-6" />
      )}

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[card.color]} text-white flex items-center justify-center shadow-lg`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/repair/tickets"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">我的工单</p>
              <p className="text-sm text-gray-500">查看和处理所有工单</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">最近工单</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : recentTickets.length === 0 ? (
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
                  {recentTickets.map((ticket) => (
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
                        <button
                          onClick={() => handleViewDetail(ticket)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                          查看
                        </button>
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
    </AppLayout>
  );
}
