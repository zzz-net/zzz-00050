import { formatDate, getActionLabel } from '../utils';
import { statusLabels, statusColors, type Ticket, type OperationLog } from '../types';
import {
  MapPin,
  Tag,
  FileText,
  User,
  Clock,
  AlertTriangle,
  CheckSquare,
  MessageSquare,
} from 'lucide-react';

interface Props {
  ticket: Ticket;
  logs?: OperationLog[];
}

export default function TicketDetail({ ticket, logs = [] }: Props) {
  const ticketLogs = logs.filter((l) => l.ticketId === ticket.id).reverse();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-gray-500">工单 #{ticket.id}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}
                >
                  {statusLabels[ticket.status]}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{ticket.title}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">报修类别</p>
                <p className="font-medium text-gray-900">{ticket.category}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">报修地址</p>
                <p className="font-medium text-gray-900">{ticket.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">问题描述</p>
              <p className="font-medium text-gray-700 whitespace-pre-wrap">
                {ticket.description || '无'}
              </p>
            </div>
          </div>

          {ticket.returnReason && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-0.5">退回原因</p>
                <p className="text-sm text-red-700">{ticket.returnReason}</p>
              </div>
            </div>
          )}

          {ticket.processResult && (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <CheckSquare size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 mb-0.5">处理结果</p>
                <p className="text-sm text-green-700 whitespace-pre-wrap">
                  {ticket.processResult}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">报修人</p>
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400" />
                <span className="font-medium text-gray-900">
                  {ticket.residentName || '-'}
                </span>
              </div>
            </div>
            {ticket.dispatcherName && (
              <div>
                <p className="text-xs text-gray-500 mb-1">调度员</p>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {ticket.dispatcherName}
                  </span>
                </div>
              </div>
            )}
            {ticket.repairName && (
              <div>
                <p className="text-xs text-gray-500 mb-1">维修人员</p>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {ticket.repairName}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">创建时间</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(ticket.createdAt)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">更新时间</p>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {ticketLogs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500" />
            操作记录
          </h4>
          <div className="space-y-4">
            {ticketLogs.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <Clock size={14} className={index === 0 ? 'text-blue-600' : 'text-gray-500'} />
                  </div>
                  {index < ticketLogs.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{log.userName}</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {getActionLabel(log.action)}
                    </span>
                  </div>
                  {log.detail && <p className="text-sm text-gray-600 mb-1">{log.detail}</p>}
                  <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
