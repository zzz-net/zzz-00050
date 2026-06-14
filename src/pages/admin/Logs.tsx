import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  User as UserIcon,
  FileText,
  Clock,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import { logApi, userApi } from '../../utils/api';
import { formatDate, getActionLabel } from '../../utils';
import { roleLabels, type OperationLog, type User } from '../../types';

export default function Logs() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: { userId?: number; action?: string } = {};
      if (userFilter) params.userId = Number(userFilter);
      if (actionFilter) params.action = actionFilter;

      const [logsRes, usersRes] = await Promise.all([
        logApi.list({ ...params, limit: 500 }),
        userApi.getUsers(),
      ]);
      setLogs(logsRes.list || []);
      setUsers(usersRes.list || []);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [userFilter, actionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const actionOptions = [
    { value: '', label: '全部操作' },
    { value: 'create_ticket', label: '提交报修' },
    { value: 'assign_ticket', label: '派工' },
    { value: 'return_ticket', label: '退回工单' },
    { value: 'resubmit_ticket', label: '重新提交' },
    { value: 'start_process', label: '开始处理' },
    { value: 'process_ticket', label: '填写处理结果' },
    { value: 'close_ticket', label: '关闭工单' },
    { value: 'reopen_ticket', label: '重开工单' },
  ];

  const filteredLogs = logs.filter((log) => {
    if (!keyword) return true;
    const kw = keyword.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(kw) ||
      log.detail?.toLowerCase().includes(kw) ||
      getActionLabel(log.action).toLowerCase().includes(kw) ||
      (log.ticketId && String(log.ticketId).includes(kw))
    );
  });

  const actionColorMap: Record<string, string> = {
    create_ticket: 'bg-blue-100 text-blue-700',
    assign_ticket: 'bg-green-100 text-green-700',
    return_ticket: 'bg-red-100 text-red-700',
    resubmit_ticket: 'bg-yellow-100 text-yellow-700',
    start_process: 'bg-orange-100 text-orange-700',
    process_ticket: 'bg-purple-100 text-purple-700',
    close_ticket: 'bg-emerald-100 text-emerald-700',
    reopen_ticket: 'bg-pink-100 text-pink-700',
  };

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
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
                >
                  <option value="">全部用户</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{roleLabels[user.role]}）
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
              >
                {actionOptions.map((opt) => (
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
                    onKeyPress={(e) => e.key === 'Enter' && setKeyword(searchInput)}
                    placeholder="搜索操作人、详情、工单ID..."
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
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">操作日志</h2>
            <span className="text-sm text-gray-500">共 {filteredLogs.length} 条记录</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <Empty message="暂无日志记录" />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon size={18} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-medium text-gray-900">{log.userName}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            actionColorMap[log.action] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                        {log.ticketId && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText size={12} />
                            工单 #{log.ticketId}
                          </span>
                        )}
                      </div>
                      {log.detail && (
                        <p className="text-sm text-gray-600 mb-1">{log.detail}</p>
                      )}
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
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
