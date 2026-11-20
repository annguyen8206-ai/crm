// VitCRM API client — shared fetch wrapper + auth/staff/inbox/settings calls.
// Commerce endpoints live in src/fmcg/api.ts.

const API_BASE = '/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

/**
 * Branch picked in the navbar selector. Sent as `X-View-Branch` so the server
 * narrows lists / dashboards to it (server/branch-scope.ts). 'ALL' = no filter.
 */
let viewBranchId = 'ALL';
export function setViewBranch(id: string | null | undefined): void {
  viewBranchId = id || 'ALL';
}
export function viewBranchHeaders(): Record<string, string> {
  return viewBranchId && viewBranchId !== 'ALL' ? { 'X-View-Branch': viewBranchId } : {};
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vitcrm_access_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...viewBranchHeaders(),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      // Expired / revoked session: drop the token and let the app show the login screen.
      if (res.status === 401 && token && !endpoint.startsWith('/auth/staff/login')) {
        localStorage.removeItem('vitcrm_access_token');
        window.dispatchEvent(new Event('vitcrm:unauthorized'));
      }
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `HTTP error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.warn(`[API Client Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const apiClient = {
  auth: {
    async staffLogin(identifier: string, password: string) {
      const result = await request<{
        success: boolean; user?: any; token?: string;
        twoFactorRequired?: boolean; preAuthToken?: string; channel?: string; otpMode?: string; devCode?: string;
      }>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      if (result.token) localStorage.setItem('vitcrm_access_token', result.token);
      return result;
    },
    async staffLogin2fa(preAuthToken: string, code: string) {
      const result = await request<{ success: boolean; user: any; token: string }>('/auth/staff/login/2fa', {
        method: 'POST',
        body: JSON.stringify({ preAuthToken, code })
      });
      if (result.token) localStorage.setItem('vitcrm_access_token', result.token);
      return result;
    },
    async staffLogin2faResend(preAuthToken: string) {
      return request<{ success: boolean; channel?: string; otpMode?: string; devCode?: string }>('/auth/staff/login/2fa/resend', {
        method: 'POST',
        body: JSON.stringify({ preAuthToken })
      });
    },
    logout() {
      localStorage.removeItem('vitcrm_access_token');
    },
    hasToken() {
      return typeof window !== 'undefined' && !!localStorage.getItem('vitcrm_access_token');
    },
    async me() {
      return request<{ user: any }>('/auth/me');
    }
  },

  // 1a. Staff accounts (admin only) — persisted in auth_users
  staff: {
    async list() {
      return request<{ staff: any[] }>('/staff');
    },
    async create(data: { email: string; password: string; name: string; role?: string; roleTitle?: string; staffCode?: string | null; department?: string | null; branchId?: string | null; status?: string; phone?: string | null; twoFactorEnabled?: boolean }) {
      return request<{ success: boolean; staff: any }>('/staff', { method: 'POST', body: JSON.stringify(data) });
    },
    async update(id: string, data: Record<string, unknown>) {
      return request<{ success: boolean; staff: any }>(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    /** Sales staff a visit can be assigned to (managers: their team; reps: themselves). */
    async assignees() {
      return request<{ assignees: Array<{ id: string; name: string; role: 'sales_rep' | 'sales_manager' | 'self'; branchId: string | null }> }>('/staff/assignees');
    }
  },

  files: {
    async list(entityType: string, entityId: string) {
      return request<{ files: Array<{ id: string; filename: string; mime: string; size: number; uploadedByName?: string; createdAt: string }> }>(`/files?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
    },
    async upload(entityType: string, entityId: string, file: File) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vitcrm_access_token') : null;
      const res = await fetch(`/api/files?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(file.name),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: file,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Tải lên thất bại (${res.status})`);
      return res.json() as Promise<{ id: string; filename: string; mime: string; size: number }>;
    },
    downloadUrl(id: string) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vitcrm_access_token') : '';
      return `/api/files/${id}?token=${encodeURIComponent(token || '')}`;
    },
    async remove(id: string) {
      return request<{ success: boolean }>(`/files/${id}`, { method: 'DELETE' });
    },
  },

  messaging: {
    async bulk(payload: { channel: 'zns' | 'sms'; templateType?: string; message?: string; recipients: Array<{ phone: string; name?: string; data?: Record<string, string> }> }) {
      return request<{ jobId: string; total: number }>('/messaging/bulk', { method: 'POST', body: JSON.stringify(payload) });
    },
    async bulkStatus(jobId: string) {
      return request<{ id: string; channel: string; total: number; sent: number; failed: number; skipped: number; status: 'running' | 'done'; errors: Array<{ phone: string; error: string }> }>(`/messaging/bulk/${jobId}`);
    },
    async optOuts() {
      return request<{ optOuts: Array<{ phone: string; at: string; reason?: string }> }>('/messaging/opt-outs');
    },
  },

  notifications: {
    async list() {
      return request<{ notifications: Array<{ id: string; severity: 'high' | 'med' | 'low'; title: string; detail: string; tab: string; count: number }>; total: number; highCount: number }>('/notifications');
    }
  },

  // Runtime integration settings (admin only). Secrets come back masked.
  settings: {
    async get() {
      return request<{ groups: any[]; values: Record<string, { set: boolean; source: string; preview: string }>; integrations: any[] }>('/system/settings');
    },
    async save(values: Record<string, string>) {
      return request<{ success: boolean; changed: string[]; groups: any[]; values: Record<string, any>; integrations: any[] }>('/system/settings', {
        method: 'PUT',
        body: JSON.stringify({ values }),
      });
    },
    /** Live connectivity probe: provider = zns | email | ai | sms | voip | payments. */
    async test(provider: string) {
      return request<{ ok: boolean; provider: string; message: string }>(`/system/integrations/${encodeURIComponent(provider)}/test`, {
        method: 'POST',
      });
    },
    /** Begin the Zalo OA OAuth flow — returns the consent URL + the redirect URI to whitelist. */
    async zaloOauthStart() {
      return request<{ url?: string; redirectUri: string; error?: string }>('/system/zalo/oauth/start');
    },
  },

  // 1c. Omnichannel inbox (Zalo OA + Facebook Messenger)
  conversations: {
    async list(params?: { channel?: string; status?: string }) {
      const q = new URLSearchParams();
      if (params?.channel) q.set('channel', params.channel);
      if (params?.status) q.set('status', params.status);
      const qs = q.toString();
      return request<{ conversations: any[]; total: number; unread: number }>(`/conversations${qs ? `?${qs}` : ''}`);
    },
    async messages(id: string) {
      return request<{ conversation: any; messages: any[] }>(`/conversations/${id}/messages`);
    },
    async reply(id: string, text: string, attachments?: Array<{ type: string; url: string; name?: string }>) {
      return request<{ success: boolean; mode: string; message: any; error?: string }>(`/conversations/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify(attachments && attachments.length ? { text, attachments } : { text })
      });
    },
    /** Upload a file to attach to a conversation; returns {type,url,name} for reply(). */
    async uploadAttachment(conversationId: string, file: File) {
      const up = await apiClient.files.upload('conversation', conversationId, file);
      return { type: up.mime || file.type || 'file', url: `/api/files/${up.id}`, name: up.filename || file.name };
    },
    async update(id: string, data: { status?: string; assignedStaff?: string; patientId?: string }) {
      return request<{ success: boolean; conversation: any }>(`/conversations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    async simulate(channel: 'zalo' | 'facebook', data: { externalUserId: string; senderName?: string; text: string }) {
      return request<any>(`/webhooks/${channel}/simulate`, { method: 'POST', body: JSON.stringify(data) });
    }
  },

  // 1d. Real-time server events (SSE). Returns the EventSource so the caller can close it.
  stream(onEvent: (evt: any) => void): EventSource | null {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return null;
    const token = localStorage.getItem('vitcrm_access_token');
    if (!token) return null;
    const es = new EventSource(`${API_BASE}/stream?token=${encodeURIComponent(token)}`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* ignore keepalives */ }
    };
    return es;
  },

  // 1e. Generic module collections — persisted in the backend JSONB snapshot
  collections: {
    async getAll() {
      return request<{ collections: Record<string, any[]> }>('/collections');
    },
    async get(name: string) {
      return request<{ name: string; items: any[] }>(`/collections/${name}`);
    },
    async save(name: string, items: any[]) {
      return request<{ success: boolean; name: string; count: number }>(`/collections/${name}`, {
        method: 'PUT',
        body: JSON.stringify({ items })
      });
    }
  },

  // 1. Health & System
  async getHealth() {
    return request<any>('/health');
  },

  async getAuditLogs() {
    return request<{ logs: any[]; total: number }>('/system/audit-logs');
  },
};
