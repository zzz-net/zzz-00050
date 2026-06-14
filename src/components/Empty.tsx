import { Inbox } from 'lucide-react';

interface Props {
  message?: string;
}

export default function Empty({ message = '暂无数据' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox size={48} className="mb-4 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
