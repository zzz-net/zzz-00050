export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    create_ticket: '提交报修',
    assign_ticket: '派工',
    return_ticket: '退回工单',
    resubmit_ticket: '重新提交',
    start_process: '开始处理',
    process_ticket: '填写处理结果',
    close_ticket: '关闭工单',
    reopen_ticket: '重开工单',
  };
  return map[action] || action;
}
