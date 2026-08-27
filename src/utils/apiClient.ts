// VitHospital Full-Stack API Client
// Provides strongly typed methods to communicate with the Express backend

const API_BASE = '/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
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
  // 1. Health & System
  async getHealth() {
    return request<any>('/health');
  },

  async getAuditLogs() {
    return request<{ logs: any[]; total: number }>('/system/audit-logs');
  },

  // 2. Patients
  patients: {
    async list(params?: { search?: string; branchId?: string; riskLevel?: string; tag?: string; limit?: number; offset?: number }) {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.branchId) query.set('branchId', params.branchId);
      if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
      if (params?.tag) query.set('tag', params.tag);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));

      const qs = query.toString();
      return request<{ patients: any[]; total: number }>(`/patients${qs ? `?${qs}` : ''}`);
    },

    async get(id: string) {
      return request<{ patient: any; appointments: any[]; tickets: any[]; invoices: any[]; recalls: any[]; znsLogs: any[] }>(`/patients/${id}`);
    },

    async create(patientData: any) {
      return request<{ success: boolean; patient: any }>('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData)
      });
    },

    async update(id: string, patientData: any) {
      return request<{ success: boolean; patient: any }>(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patientData)
      });
    },

    async delete(id: string) {
      return request<{ success: boolean; message: string }>(`/patients/${id}`, {
        method: 'DELETE'
      });
    },

    async addVitals(id: string, vitalsData: any) {
      return request<{ success: boolean; vitals: any; patientVitals: any[] }>(`/patients/${id}/vitals`, {
        method: 'POST',
        body: JSON.stringify(vitalsData)
      });
    }
  },

  // 3. Appointments
  appointments: {
    async list(params?: { date?: string; branchId?: string; status?: string; department?: string; doctorId?: string; patientId?: string }) {
      const query = new URLSearchParams();
      if (params?.date) query.set('date', params.date);
      if (params?.branchId) query.set('branchId', params.branchId);
      if (params?.status) query.set('status', params.status);
      if (params?.department) query.set('department', params.department);
      if (params?.doctorId) query.set('doctorId', params.doctorId);
      if (params?.patientId) query.set('patientId', params.patientId);

      const qs = query.toString();
      return request<{ appointments: any[]; total: number }>(`/appointments${qs ? `?${qs}` : ''}`);
    },

    async create(aptData: any) {
      return request<{ success: boolean; appointment: any }>('/appointments', {
        method: 'POST',
        body: JSON.stringify(aptData)
      });
    },

    async updateStatus(id: string, status: string, notes?: string) {
      return request<{ success: boolean; appointment: any }>(`/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes })
      });
    },

    async update(id: string, aptData: any) {
      return request<{ success: boolean; appointment: any }>(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(aptData)
      });
    }
  },

  // 4. Customer Care & SLA Tickets
  tickets: {
    async list(params?: { status?: string; priority?: string; department?: string; isOverdue?: boolean }) {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.priority) query.set('priority', params.priority);
      if (params?.department) query.set('department', params.department);
      if (params?.isOverdue !== undefined) query.set('isOverdue', String(params.isOverdue));

      const qs = query.toString();
      return request<{ tickets: any[]; total: number }>(`/tickets${qs ? `?${qs}` : ''}`);
    },

    async create(ticketData: any) {
      return request<{ success: boolean; ticket: any }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketData)
      });
    },

    async update(id: string, ticketData: any) {
      return request<{ success: boolean; ticket: any }>(`/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(ticketData)
      });
    }
  },

  // 5. Leads & Sales Deals
  leads: {
    async list(params?: { stage?: string; type?: string; assignedStaff?: string }) {
      const query = new URLSearchParams();
      if (params?.stage) query.set('stage', params.stage);
      if (params?.type) query.set('type', params.type);
      if (params?.assignedStaff) query.set('assignedStaff', params.assignedStaff);

      const qs = query.toString();
      return request<{ leads: any[]; total: number; totalPipelineValue: number; weightedPipelineValue: number }>(`/leads${qs ? `?${qs}` : ''}`);
    },

    async create(leadData: any) {
      return request<{ success: boolean; lead: any }>('/leads', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });
    },

    async update(id: string, leadData: any) {
      return request<{ success: boolean; lead: any }>(`/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(leadData)
      });
    }
  },

  // 6. Follow-ups
  followUps: {
    async list(params?: { status?: string; assignedStaff?: string }) {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.assignedStaff) query.set('assignedStaff', params.assignedStaff);

      const qs = query.toString();
      return request<{ followUps: any[]; total: number }>(`/follow-ups${qs ? `?${qs}` : ''}`);
    },

    async update(id: string, data: any) {
      return request<{ success: boolean; followUp: any }>(`/follow-ups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
  },

  // 8. Auto-Recalls
  recalls: {
    async list(params?: { category?: string; status?: string }) {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.status) query.set('status', params.status);

      const qs = query.toString();
      return request<{ recalls: any[]; total: number }>(`/recalls${qs ? `?${qs}` : ''}`);
    },

    async createOrUpdate(data: any) {
      return request<{ success: boolean; recall: any }>('/recalls', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async convertToAppointment(id: string, data: { date?: string; timeSlot?: string }) {
      return request<{ success: boolean; appointment: any; recall: any }>(`/recalls/${id}/convert-to-appointment`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // 9. ZNS Messaging
  zns: {
    async getTemplates() {
      return request<{ templates: any[] }>('/zns/templates');
    },

    async getLogs() {
      return request<{ logs: any[]; total: number }>('/zns/logs');
    },

    async sendPostVisitCare(data: {
      patientId?: string;
      patientName: string;
      patientPhone: string;
      diagnosis: string;
      doctorCareNotes?: string;
      channel?: string;
      templateType?: string;
    }) {
      return request<{ success: boolean; message: string; log: any }>('/zns/send-post-visit-care', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // 10. VoIP Calls
  calls: {
    async clickToCall(data: { patientId?: string; patientName: string; patientPhone: string; agentStaffName?: string; agentExtension?: string }) {
      return request<{ success: boolean; message: string; callSession: any }>('/calls/click-to-call', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async complete(data: { callId: string; durationSeconds: number; callOutcome?: string; callNotes?: string; status?: string }) {
      return request<{ success: boolean; callSession?: any }>('/calls/complete', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async getLogs() {
      return request<{ calls: any[]; total: number }>('/calls/logs');
    }
  },

  // 11. CSAT & NPS
  csat: {
    async getFeedbacks(params?: { sentiment?: string; department?: string }) {
      const query = new URLSearchParams();
      if (params?.sentiment) query.set('sentiment', params.sentiment);
      if (params?.department) query.set('department', params.department);

      const qs = query.toString();
      return request<{ feedbacks: any[]; total: number; avgRating: number; npsIndex: number; promotersCount: number; detractorsCount: number }>(`/csat/feedbacks${qs ? `?${qs}` : ''}`);
    },

    async submit(data: any) {
      return request<{ success: boolean; feedback: any }>('/csat/submit', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // 12. Dashboard Analytics
  analytics: {
    async getDashboard() {
      return request<{ kpis: any; branchPerformance: any[] }>('/analytics/dashboard');
    }
  },

  // 13. AI Services
  ai: {
    async triage(data: { symptoms: string; patientAge?: number; patientGender?: string; medicalHistory?: string }) {
      return request<any>('/ai/triage', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async summarizePatient(patientData: any) {
      return request<any>('/ai/summarize-patient', {
        method: 'POST',
        body: JSON.stringify({ patientData })
      });
    },

    async generateCampaignContent(data: { segmentName: string; targetCondition: string; channel: string; tone?: string }) {
      return request<any>('/ai/generate-campaign-content', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async generateCareResponse(data: { complaintText: string; category: string; patientName: string; department?: string; priority?: string }) {
      return request<any>('/ai/generate-care-response', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async chatbotFaqReply(data: { message: string; channel?: string; patientName?: string; patientPhone?: string }) {
      return request<any>('/ai/chatbot-faq-reply', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // 14. Export CSV
  async exportCsv(type: string, data?: any[], filename?: string) {
    const res = await fetch(`${API_BASE}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    });

    if (!res.ok) throw new Error('Không thể xuất file CSV từ máy chủ');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `VitHospital_Export_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
