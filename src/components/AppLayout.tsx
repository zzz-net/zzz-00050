import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FilePlus,
  ClipboardList,
  FileText,
  LogOut,
  User,
  Settings,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { roleLabels, type UserRole } from '../types';
import { authApi } from '../utils/api';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navConfig: Record<UserRole, NavItem[]> = {
  resident: [
    { path: '/resident/dashboard', label: '首页', icon: <Home size={18} /> },
    { path: '/resident/submit', label: '提交报修', icon: <FilePlus size={18} /> },
    { path: '/resident/tickets', label: '我的工单', icon: <ClipboardList size={18} /> },
    { path: '/resident/drafts', label: '草稿箱', icon: <FileText size={18} /> },
  ],
  dispatcher: [
    { path: '/dispatcher/dashboard', label: '首页', icon: <Home size={18} /> },
    { path: '/dispatcher/tickets', label: '工单池', icon: <ClipboardList size={18} /> },
  ],
  repair: [
    { path: '/repair/dashboard', label: '首页', icon: <Home size={18} /> },
    { path: '/repair/tickets', label: '我的工单', icon: <ClipboardList size={18} /> },
  ],
  admin: [
    { path: '/admin/dashboard', label: '首页', icon: <Home size={18} /> },
    { path: '/admin/tickets', label: '工单管理', icon: <ClipboardList size={18} /> },
    { path: '/admin/logs', label: '操作日志', icon: <FileText size={18} /> },
    { path: '/admin/export', label: '数据导出', icon: <Download size={18} /> },
  ],
};

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout failed', e);
    }
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const navItems = navConfig[user.role];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-xl font-bold tracking-wide">社区报修系统</h1>
          <p className="text-blue-200 text-sm mt-1">
            {roleLabels[user.role]} 工作台
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-100 hover:bg-blue-700/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-blue-200">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-200 hover:bg-red-600/30 hover:text-white transition-all"
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {navItems.find((n) => n.path === location.pathname)?.label}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <Settings size={14} className="inline mr-1" />
                {new Date().toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
