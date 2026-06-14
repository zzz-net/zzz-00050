import { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  Info,
  CheckCircle,
  Folder,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Alert from '../../components/Alert';
import { exportApi, ticketApi } from '../../utils/api';
import { formatDate } from '../../utils';
import type { Ticket } from '../../types';

export default function Export() {
  const [stats, setStats] = useState({ total: 0, closed: 0 });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadStats = async () => {
    try {
      const res = await ticketApi.list({ limit: 1000 });
      setStats({
        total: res.total || res.list?.length || 0,
        closed: (res.list || []).filter((t: Ticket) => t.status === 'closed').length,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExport = () => {
    try {
      setExporting(true);
      exportApi.exportTickets();
      setAlert({ type: 'success', message: '导出任务已开始，CSV文件将自动下载' });
      setTimeout(() => {
        setExporting(false);
      }, 2000);
    } catch (e: any) {
      setAlert({ type: 'error', message: '导出失败：' + (e.message || '未知错误') });
      setExporting(false);
    }
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">数据导出</h2>
                <p className="text-sm text-gray-500">导出全部工单数据为CSV格式</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-700 mb-1">总工单数</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm text-green-700 mb-1">已关闭工单</p>
                <p className="text-2xl font-bold text-green-900">{stats.closed}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">导出说明</p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                    <li>导出所有工单数据（包含全部状态）</li>
                    <li>文件格式：CSV（UTF-8 with BOM，可直接用Excel打开）</li>
                    <li>导出字段：工单ID、标题、类别、地址、描述、状态、报修人、调度员、维修人员、退回原因、处理结果、创建时间、更新时间</li>
                    <li>文件同时保存在服务端 exports/ 目录下</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Folder size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">服务端保存路径</p>
                  <p className="text-sm text-gray-600 mt-1 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                    exports/tickets_{new Date().toISOString().slice(0, 10)}.csv
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-semibold text-lg shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 disabled:from-emerald-300 disabled:to-emerald-400 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  正在导出...
                </>
              ) : (
                <>
                  <Download size={22} />
                  导出全部工单数据（CSV）
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-green-500" />
            <h3 className="font-semibold text-gray-900">数据一致性保证</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            系统使用 JSON 文件作为持久化存储，所有工单数据、操作日志均保存到服务端
            <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1">data/db.json</code>
            文件中。服务重启后数据不会丢失，导出文件保存在
            <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1">exports/</code>
            目录下，时间戳精确到毫秒，确保每次导出的文件都唯一。
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
