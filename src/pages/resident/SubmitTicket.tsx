import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Save,
  Send,
  FileText,
  MapPin,
  Tag,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import { useAuthStore, useDraftStore } from '../../store';
import { ticketApi } from '../../utils/api';
import { categoryOptions, type DraftTicket } from '../../types';

export default function SubmitTicket() {
  const { user } = useAuthStore();
  const { saveDraft, drafts, loadDrafts } = useDraftStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftTicket | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDrafts();
    const state = location.state as { draft?: DraftTicket } | null;
    if (state?.draft) {
      setTitle(state.draft.title);
      setCategory(state.draft.category);
      setAddress(state.draft.address);
      setDescription(state.draft.description);
      setAlert({ type: 'info', message: '已恢复草稿内容' });
      setTimeout(() => setAlert(null), 3000);
    } else if (drafts.length > 0) {
      setPendingDraft(drafts[0]);
      setDraftModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    if (title || category || address || description) {
      autoSaveRef.current = setTimeout(() => {
        handleSaveDraft(true);
      }, 30000);
    }
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [title, category, address, description]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入报修标题';
    if (!category) newErrors.category = '请选择报修类别';
    if (!address.trim()) newErrors.address = '请输入报修地址';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = (silent = false) => {
    if (!title && !category && !address && !description) return;
    saveDraft({ title, category, address, description });
    setLastSavedAt(new Date().toLocaleTimeString('zh-CN'));
    if (!silent) {
      setAlert({ type: 'success', message: '草稿已保存到草稿箱' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await ticketApi.create({
        title: title.trim(),
        category,
        address: address.trim(),
        description: description.trim(),
      });
      setAlert({ type: 'success', message: '报修提交成功！' });
      setTimeout(() => {
        navigate('/resident/tickets');
      }, 1500);
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || '提交失败，请重试' });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setTitle(pendingDraft.title);
      setCategory(pendingDraft.category);
      setAddress(pendingDraft.address);
      setDescription(pendingDraft.description);
    }
    setDraftModalOpen(false);
    setPendingDraft(null);
  };

  const handleReset = () => {
    setTitle('');
    setCategory('');
    setAddress('');
    setDescription('');
    setErrors({});
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">提交报修</h2>
                  <p className="text-sm text-gray-500">填写报修信息，我们将尽快处理</p>
                </div>
              </div>
              {lastSavedAt && (
                <span className="text-xs text-gray-400">自动保存于 {lastSavedAt}</span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请简要描述问题"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修类别 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none ${
                    errors.category ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                  }`}
                >
                  <option value="">请选择报修类别</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报修地址 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="如：1号楼2单元301室"
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                  }`}
                />
              </div>
              {errors.address && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.address}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问题描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述遇到的问题，便于维修人员提前准备..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <RotateCcw size={16} />
                重置
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveDraft(false)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium"
                >
                  <Save size={18} />
                  保存草稿
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/30 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  {loading ? '提交中...' : '提交报修'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Modal
        isOpen={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        title="发现未提交的草稿"
        size="sm"
      >
        {pendingDraft && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-gray-600">
                您有一份未提交的草稿，保存于{' '}
                <span className="font-medium text-gray-900">
                  {new Date(pendingDraft.savedAt).toLocaleString('zh-CN')}
                </span>
              </p>
              {pendingDraft.title && (
                <p className="mt-2 font-medium text-gray-900">
                  标题：{pendingDraft.title}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDraftModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
              >
                不恢复
              </button>
              <button
                onClick={handleRestoreDraft}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors font-medium"
              >
                恢复草稿
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
