import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
}

export default function Alert({ type = 'info', message, className = '' }: Props) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle size={20} className="text-green-600" />,
    error: <XCircle size={20} className="text-red-600" />,
    warning: <AlertCircle size={20} className="text-yellow-600" />,
    info: <Info size={20} className="text-blue-600" />,
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${styles[type]} ${className}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
