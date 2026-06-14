import type { ApiResponse, LoginResponse } from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as ApiResponse<T>;
  if (!data.success) {
    const error = new Error(data.message || '请求失败');
    (error as any).status = response.status;
    (error as any).conflict = (data as any).conflict;
    throw error;
  }
  return data.data as T;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),
  me: () =>
    request<LoginResponse['user']>('/auth/me'),
};

export const userApi = {
  getUsers: (role?: string) =>
    request<{ list: LoginResponse['user'][]; total: number }>(
      role ? `/users?role=${role}` : '/users'
    ),
};

export const ticketApi = {
  create: (data: { title: string; category: string; address: string; description: string }) =>
    request<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  list: (params?: { status?: string; keyword?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return request<{ list: any[]; total: number }>(
      `/tickets${query.toString() ? `?${query.toString()}` : ''}`
    );
  },
  get: (id: number) => request<any>(`/tickets/${id}`),
  assign: (id: number, data: { repairId: number; version: number }) =>
    request<any>(`/tickets/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  return: (id: number, data: { reason: string }) =>
    request<any>(`/tickets/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  resubmit: (id: number, data: { title: string; category: string; address: string; description: string }) =>
    request<any>(`/tickets/${id}/resubmit`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  process: (id: number, data: { result: string }) =>
    request<any>(`/tickets/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  close: (id: number) =>
    request<any>(`/tickets/${id}/close`, {
      method: 'PUT',
    }),
  reopen: (id: number) =>
    request<any>(`/tickets/${id}/reopen`, {
      method: 'PUT',
    }),
};

export const logApi = {
  list: (params?: { userId?: number; ticketId?: number; action?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', String(params.userId));
    if (params?.ticketId) query.append('ticketId', String(params.ticketId));
    if (params?.action) query.append('action', params.action);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return request<{ list: any[]; total: number }>(
      `/logs${query.toString() ? `?${query.toString()}` : ''}`
    );
  },
};

export const exportApi = {
  exportTickets: () => {
    const token = localStorage.getItem('auth_token');
    window.open(`${API_BASE}/export/tickets?token=${token}`, '_blank');
  },
};
