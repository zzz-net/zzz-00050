import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  ClipboardList,
  FileText,
  Clock,
  Wrench,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import { useAuthStore } from '../../store';
import { ticketApi } from '../../utils/api';
import { formatDate } from '../../utils';
import { statusLabels, statusColors, type Ticket } from '../../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const stats = {
    pending: tickets.filter((t) => t.status === 'pending' || t.status === 'returned').length,
    processing: tickets.filter((t) => t.status === 'assigned' || t.status === 'processing').length,
    completed: tickets.filter((t) => t.status === 'closed').length,
  };

  const recentTickets = tickets.slice(0, 5);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketApi.list();
      setTickets(data.list || []);
    } catch (e) {
      setAlert({ type: 'error', message: '加载数据失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <AppLayout>
      <div className="space-y-6">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">待处理</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Clock size={28} className="text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">等待处理的工单</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">处理中</p>
                <p className="text-3xl font-bold text-orange-600">{stats.processing}</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Wrench size={28} className="text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">正在处理的工单</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle size={28} className="text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">已完成的工单</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/resident/submit')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white text-left hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FilePlus size={24} />
                </div>
                <div>
                  <p className="font-semibold text-lg">提交报修</p>
                  <p className="text-blue-100 text-sm">快速提交新的报修申请</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-blue-200 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate('/resident/tickets')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white text-left hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className="font-semibold text-lg">查看工单</p>
                  <p className="text-purple-100 text-sm">查看所有报修工单</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-purple-200 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate('/resident/drafts')}
            className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl p-6 text-white text-left hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-semibold text-lg">草稿箱</p>
                  <p className="text-gray-300 text-sm">查看未提交的草稿</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近工单</h2>
            <button
              onClick={() => navigate('/resident/tickets')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部 →
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">加载中...</p>
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="p-12">
              <Empty />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/resident/tickets')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm text-gray-400">#{ticket.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}
                        >
                          {statusLabels[ticket.status]}
                        </span>
                        {ticket.status === 'returned' && (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle size={12} />
                            需补充信息
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{ticket.title}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{ticket.category}</span>
                        <span>·</span>
                        <span>{ticket.address}</span>
                        <span>·</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
