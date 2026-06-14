import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, LogIn } from 'lucide-react';
import { useAuthStore } from '../store';
import { authApi } from '../utils/api';
import { getDefaultRoute } from '../components/ProtectedRoute';
import Alert from '../components/Alert';

const sampleAccounts = [
  { username: 'resident1', password: '123456', role: '居民', name: '张三' },
  { username: 'dispatcher1', password: '123456', role: '调度员', name: '王调度' },
  { username: 'dispatcher2', password: '123456', role: '调度员', name: '赵调度' },
  { username: 'repair1', password: '123456', role: '维修人员', name: '陈师傅' },
  { username: 'admin', password: '123456', role: '管理员', name: '系统管理员' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      const checkAuth = async () => {
        try {
          const user = await authApi.me();
          login(user, token);
          navigate(getDefaultRoute(user.role), { replace: true });
        } catch (e) {
          localStorage.removeItem('auth_token');
        }
      };
      checkAuth();
    }
  }, [token, login, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.login(username, password);
      login(data.user, data.token);
      const from = (location.state as any)?.from?.pathname || getDefaultRoute(data.user.role);
      navigate(from, { replace: true });
    } catch (e: any) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (acc: typeof sampleAccounts[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="text-white space-y-6">
            <h1 className="text-4xl font-bold tracking-tight">社区报修派单系统</h1>
            <p className="text-blue-200 text-lg">
              高效的社区维修工单管理平台，支持从报修到完工的全流程跟踪
            </p>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
                样例账号
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {sampleAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => handleQuickLogin(acc)}
                    className="text-left px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg transition-all border border-white/10 hover:border-white/30 group"
                  >
                    <p className="font-medium text-white group-hover:text-blue-100">
                      {acc.name}
                    </p>
                    <p className="text-xs text-blue-300">
                      {acc.role} · {acc.username}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-400">默认密码均为：123456</p>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <LogIn size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">欢迎登录</h2>
              <p className="text-gray-500 mt-1">请输入您的账号密码</p>
            </div>

            {error && <Alert type="error" message={error} className="mb-6" />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? '登录中...' : '登 录'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
