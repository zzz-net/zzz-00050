import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle,
  ArrowRight,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Empty from '../../components/Empty';
import Alert from '../../components/Alert';
import { useAuthStore } from '../../store';
import { ticketApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket, type TicketStatus } from '../../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, closed: 0 });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const allRes = await ticketApi.list();
      const list = allRes.list || [];
      setStats({
        total: list.length,
        pending: list.filter((t: Ticket) => t.status === 'pending' || t.status === 'returned').length,
        processing: list.filter((t: Ticket) => t.status === 'assigned' || t.status === 'processing').length,
        closed: list.filter((t: Ticket) => t.status === 'closed').length,
      });
      setRecentTickets(list.slice(0, 10));
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    { label: '总工单', value: stats.total, color: 'from-blue-500 to-blue-600', icon: <ClipboardList size={24} /> },
    { label: '待派工', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: <Clock size={24} /> },
    { label: '处理中', value: stats.processing, color: 'from-orange-500 to-red-500', icon: <Wrench size={24} /> },
    { label: '已关闭', value: stats.closed, color: 'from-green-500 to-emerald-500', icon: <CheckCircle size={24} /> },
  ];

  const quickActions = [
    {
      label: '工单管理',
      desc: '查看和管理所有工单',
      path: '/admin/tickets',
      color: 'from-blue-500 to-blue-600',
      icon: <ClipboardList size={24} />,
    },
    {
      label: '操作日志',
      desc: '查看系统所有操作记录',
      path: '/admin/logs',
      color: 'from-purple-500 to-purple-600',
      icon: <FileText size={24} />,
    },
    {
      label: '数据导出',
      desc: '导出工单数据为CSV',
      path: '/admin/export',
      color: 'from-emerald-500 to-emerald-600',
      icon: <Download size={24} />,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.name}
            </h1>
            <p className="text-gray-500 mt-1">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新数据
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg`}
                  >
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-2xl p-6 border border-gray-100 text-left hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                  >
                    {action.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{action.label}</p>
                    <p className="text-gray-500 text-sm">{action.desc}</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近工单</h2>
            <button
              onClick={() => navigate('/admin/tickets')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              查看全部
              <ArrowRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="p-12">
              <Empty message="暂无工单" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">工单ID</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">标题</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">报修人</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">维修人员</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">状态</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm text-gray-900 font-medium">#{ticket.id}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.residentName || '-'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{ticket.repairName || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status as TicketStatus]}`}>
                          {statusLabels[ticket.status as TicketStatus]}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(ticket.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
