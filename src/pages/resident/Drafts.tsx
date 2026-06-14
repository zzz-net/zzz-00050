import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Trash2,
  Edit3,
  Clock,
  Tag,
  MapPin,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import Alert from '../../components/Alert';
import Empty from '../../components/Empty';
import { useDraftStore } from '../../store';
import { formatDate } from '../../utils';
import { categoryOptions, type DraftTicket } from '../../types';

export default function Drafts() {
  const navigate = useNavigate();
  const { drafts, loadDrafts, deleteDraft } = useDraftStore();
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleContinue = (draft: DraftTicket) => {
    navigate('/resident/submit', { state: { draft } });
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此草稿吗？')) {
      deleteDraft(id);
      setAlert({ type: 'success', message: '草稿已删除' });
    }
  };

  const getCategoryLabel = (value: string) => {
    return categoryOptions.find((c) => c.value === value)?.label || value || '未设置';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">草稿箱</h2>
                <p className="text-sm text-gray-500">共 {drafts.length} 份草稿</p>
              </div>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="p-12">
              <Empty message="暂无草稿" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="px-6 py-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {draft.title || '（未填写标题）'}
                        </h3>
                        {draft.category && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
                            <Tag size={10} />
                            {getCategoryLabel(draft.category)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        {draft.address && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {draft.address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          保存于 {formatDate(draft.savedAt)}
                        </span>
                      </div>
                      {draft.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {draft.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleContinue(draft)}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        <Edit3 size={14} />
                        继续编辑
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
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
