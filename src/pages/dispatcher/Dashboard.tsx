import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle, XCircle, Send, ArrowRight } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Empty from '../../components/Empty';
import { useAuthStore } from '../../store';
import { ticketApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket, type TicketStatus } from '../../types';

type StatsData = Record<TicketStatus, number>;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatsData>({
    pending: 0,
    assigned: 0,
    returned: 0,
    closed: 0,
    processing: 0,
  });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRes, recentRes] = await Promise.all([
        ticketApi.list(),
        ticketApi.list({ limit: 10 }),
      ]);

      const statsData: StatsData = {
        pending: 0,
        assigned: 0,
        returned: 0,
        closed: 0,
        processing: 0,
      };

      allRes.list.forEach((ticket) => {
        if (statsData[ticket.status as TicketStatus] !== undefined) {
          statsData[ticket.status as TicketStatus]++;
        }
      });

      setStats(statsData);
      setRecentTickets(recentRes.list);
    } catch (e) {
      console.error('加载数据失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    {
      key: 'pending' as TicketStatus,
      label: '待派工',
      value: stats.pending,
      color: 'from-yellow-400 to-orange-400',
      icon: <Clock size={24} />,
    },
    {
      key: 'assigned' as TicketStatus,
      label: '已派工',
      value: stats.assigned,
      color: 'from-blue-400 to-blue-500',
      icon: <Send size={24} />,
    },
    {
      key: 'returned' as TicketStatus,
      label: '已退回',
      value: stats.returned,
      color: 'from-red-400 to-red-500',
      icon: <XCircle size={24} />,
    },
    {
      key: 'closed' as TicketStatus,
      label: '已关闭',
      value: stats.closed,
      color: 'from-green-400 to-green-500',
      icon: <CheckCircle size={24} />,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.name}
            </h1>
            <p className="text-gray-500 mt-1">今天是 {new Date().toLocaleDateString('zh-CN')}，祝您工作顺利！</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.key}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg`}>
                    {card.icon}
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{card.value}</span>
                </div>
                <p className="text-gray-500 font-medium">{card.label}</p>
              </div>
              <div className={`h-1 bg-gradient-to-r ${card.color}`} />
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">工单池</h3>
                <p className="text-gray-600">查看所有工单，进行派工或退回处理</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dispatcher/tickets')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              立即前往
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">最近工单</h3>
              <button
                onClick={() => navigate('/dispatcher/tickets')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                查看全部
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : recentTickets.length === 0 ? (
              <Empty message="暂无工单" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">工单ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">标题</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">类别</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">地址</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">报修人</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-gray-900 font-medium">#{ticket.id}</td>
                        <td className="py-4 px-4 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{ticket.category}</td>
                        <td className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">{ticket.address}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{ticket.residentName || '-'}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                            {statusLabels[ticket.status]}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(ticket.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
