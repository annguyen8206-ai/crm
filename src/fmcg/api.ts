// Typed client for the consumer-goods CRM endpoints (server/routes/commerce.ts).
import { request } from '../utils/apiClient';
import type {
  CustomerRecord as Customer, ProductRecord as Product, OrderRecord as Order, VisitRecord as Visit, SalesTarget,
} from '../../server/commerce-types';
import type { RfmRow, ReceivableRow, RepKpi, RepurchaseDue } from '../../server/commerce';

export type { Customer, Product, Order, Visit, SalesTarget, RfmRow, ReceivableRow, RepKpi, RepurchaseDue };

const qs = (params?: Record<string, unknown>) => {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : '';
};
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body ?? {}) });
const put = (body: unknown) => ({ method: 'PUT', body: JSON.stringify(body ?? {}) });

export interface CustomerDetail {
  customer: Customer; orders: Order[]; visits: Visit[]; rfm?: RfmRow;
  receivables: ReceivableRow[]; outlets: Customer[]; tickets: any[];
}

export interface Dashboard {
  range: { from: string; to: string };
  revenue: number; revenueByType: { B2B: number; B2C: number }; orderCount: number; avgOrderValue: number;
  pendingApproval: number; newCustomers: number; activeCustomers: number; customerCounts: { B2B: number; B2C: number };
  daily: Array<{ date: string; B2B: number; B2C: number }>;
  topProducts: Array<{ productId: string; name: string; sku: string; quantity: number; revenue: number }>;
  topCustomers: Array<{ customerId: string; name: string; type: string; revenue: number; orders: number }>;
  statusCounts: Record<string, number>; receivableTotal: number; overdueTotal: number; aging: Record<string, number>;
  lowStock: Array<{ id: string; sku: string; name: string; stock: number }>;
  scope: 'company' | 'mine';
}

export const crm = {
  customers: {
    list: (p?: { type?: string; search?: string; status?: string; channel?: string; assignedRep?: string; limit?: number }) =>
      request<{ customers: Customer[]; total: number }>(`/customers${qs({ limit: 2000, ...p })}`),
    get: (id: string) => request<CustomerDetail>(`/customers/${id}`),
    create: (data: Partial<Customer>) => request<{ customer: Customer }>('/customers', post(data)),
    update: (id: string, data: Partial<Customer>) => request<{ customer: Customer }>(`/customers/${id}`, put(data)),
    remove: (id: string) => request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
    rfm: () => request<{ rows: RfmRow[]; segments: Record<string, { B2B: number; B2C: number }> }>('/customers/rfm'),
    redeem: (id: string, points: number, reason?: string) => request<{ customer: Customer }>(`/customers/${id}/points/redeem`, post({ points, reason })),
  },
  products: {
    list: (p?: { search?: string; category?: string; status?: string }) => request<{ products: Product[]; total: number }>(`/products${qs({ limit: 5000, ...p })}`),
    create: (data: Partial<Product>) => request<{ product: Product }>('/products', post(data)),
    update: (id: string, data: Partial<Product>) => request<{ product: Product }>(`/products/${id}`, put(data)),
    remove: (id: string) => request<{ success: boolean; archived?: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: (p?: Record<string, string | number | undefined>) => request<{ orders: Order[]; total: number }>(`/orders${qs({ limit: 2000, ...p })}`),
    create: (data: {
      customerId: string; items: Array<{ productId: string; quantity: number; discountPercent?: number; unitPrice?: number }>;
      discountAmount?: number; shippingFee?: number; channel?: string; salesRep?: string; notes?: string;
      deliveryAddress?: string; expectedDeliveryDate?: string; visitId?: string; promotionCode?: string;
      payment?: { amount: number; method: string; reference?: string };
    }) => request<{ order: Order; needsApproval: boolean }>('/orders', post(data)),
    approve: (id: string) => request<{ order: Order }>(`/orders/${id}/approve`, post({})),
    setStatus: (id: string, status: Order['status'], reason?: string) => request<{ order: Order }>(`/orders/${id}/status`, post({ status, reason })),
    pay: (id: string, amount: number, method: string, reference?: string) => request<{ order: Order }>(`/orders/${id}/payments`, post({ amount, method, reference })),
  },
  receivables: () => request<{
    rows: ReceivableRow[]; total: number; overdue: number;
    byCustomer: Array<{ customerId: string; customerName: string; balance: number; overdue: number; maxDaysOverdue: number; creditLimit: number }>;
  }>('/receivables'),
  visits: {
    list: (p?: { date?: string; from?: string; to?: string; salesRep?: string; status?: string; customerId?: string }) =>
      request<{ visits: Visit[]; total: number }>(`/visits${qs({ limit: 2000, ...p })}`),
    plan: (data: { customerIds: string[]; plannedDate: string; purpose: string; salesRep?: string; notes?: string }) =>
      request<{ visits: Visit[] }>('/visits', post(data)),
    checkIn: (id: string, location?: { lat: number; lng: number; accuracy?: number }, saveAsOutletLocation?: boolean) =>
      request<{ visit: Visit }>(`/visits/${id}/check-in`, post({ location, saveAsOutletLocation })),
    checkOut: (id: string, data: { outcome?: string; notes?: string; orderId?: string; collectedAmount?: number }) =>
      request<{ visit: Visit }>(`/visits/${id}/check-out`, post(data)),
    update: (id: string, data: Partial<Visit>) => request<{ visit: Visit }>(`/visits/${id}`, put(data)),
  },
  dashboard: (from?: string, to?: string) => request<Dashboard>(`/commerce/dashboard${qs({ from, to })}`),
  kpi: (month?: string) => request<{ month: string; rows: RepKpi[] }>(`/commerce/kpi${qs({ month })}`),
  repurchaseDue: (aheadDays = 7) => request<{ rows: RepurchaseDue[]; total: number }>(`/commerce/repurchase-due${qs({ aheadDays })}`),
  inactiveAccounts: () => request<{ rows: Array<Customer & { daysSinceLastOrder: number | null; limitDays: number }>; total: number }>('/commerce/inactive-accounts'),
  collection: {
    get: <T,>(name: string) => request<{ items: T[] }>(`/collections/${name}`).then(r => r.items || []),
    save: <T,>(name: string, items: T[]) => request<{ success: boolean }>(`/collections/${name}`, put({ items })),
  },
  leads: {
    list: () => request<{ leads: any[]; total: number; totalPipelineValue: number; weightedPipelineValue: number }>('/leads'),
    create: (data: any) => request<{ lead: any }>('/leads', post(data)),
    update: (id: string, data: any) => request<{ lead: any }>(`/leads/${id}`, put(data)),
  },
  tickets: {
    list: () => request<{ tickets: any[]; total: number }>('/tickets'),
    create: (data: any) => request<{ ticket: any }>('/tickets', post(data)),
    update: (id: string, data: any) => request<{ ticket: any }>(`/tickets/${id}`, put(data)),
  },
  messaging: {
    bulk: (data: { channel: 'zns' | 'sms'; recipients: Array<{ phone: string; name?: string; data?: Record<string, string> }>; message?: string; templateType?: string }) =>
      request<{ jobId: string; total: number }>('/messaging/bulk', post(data)),
    job: (jobId: string) => request<any>(`/messaging/bulk/${jobId}`),
  },
};
