// In-memory store for the VitCRM backend. The whole store is persisted as one
// JSONB snapshot (see server/database.ts).
import type { CustomerRecord, ProductRecord, OrderRecord, VisitRecord } from './commerce-types';
export type { CustomerRecord, ProductRecord, OrderRecord, VisitRecord } from './commerce-types';
import { buildFmcgDemo } from './seed-fmcg';
import type { PromotionRecord } from './promotions';
export type { PromotionRecord } from './promotions';
import type { LotRecord, StockMove, InventoryVoucher } from './inventory';
export type { LotRecord, StockMove, InventoryVoucher } from './inventory';

/**
 * Customer-care ticket. The `patient*` field names are kept from the original
 * healthcare schema so existing snapshots keep loading — they hold the CUSTOMER
 * (`patientId` = CustomerRecord.id).
 */
export interface SupportTicketRecord {
  id: string;
  ticketCode: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  category: string;
  priority: 'Khẩn cấp (SLA 30p)' | 'Cao (SLA 2h)' | 'Trung bình (SLA 8h)' | 'Thấp (SLA 24h)';
  status: 'Mới tiếp nhận' | 'Đang xử lý' | 'Đã giải quyết' | 'Đã đóng';
  department: string;
  branchId: string;
  assignedStaff: string;
  description: string;
  resolution?: string;
  slaDeadline: string;
  isOverdue: boolean;
  compensationVoucher?: string;
  orderCode?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LeadDealRecord {
  id: string;
  customerName: string;
  type: 'B2C' | 'B2B';
  contactPerson?: string;
  phone: string;
  email: string;
  serviceCategory: string;
  expectedValue: number;
  stage: 'Mới tiếp nhận' | 'Đã liên hệ' | 'Gửi báo giá' | 'Đàm phán' | 'Chốt thành công (Won)' | 'Thất bại (Lost)';
  probability: number;
  assignedStaff: string;
  source: string;
  notes: string;
  followUpDate: string;
  createdAt: string;
}

/** Outbound ZNS / SMS send log (bulk campaigns). `patient*` = recipient. */
export interface ZnsLogRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  templateType: string;
  templateName: string;
  diagnosis: string;
  doctorCareNotes: string;
  channel: string;
  status: string;
  sentAt: string;
  deliveredAt: string;
  readAt?: string;
  trackingCode: string;
  cost: number;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
}

export type MessageChannel = 'zalo' | 'facebook' | 'portal';

export interface ConversationRecord {
  id: string;
  channel: MessageChannel;
  /** provider-side user id (Zalo user_id / Facebook PSID) */
  externalUserId: string;
  displayName: string;
  avatarUrl?: string;
  /** Linked CRM customer (CustomerRecord.id). Name kept for snapshot compatibility. */
  patientId?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  assignedStaff?: string;
  status: 'open' | 'snoozed' | 'closed';
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  channel: MessageChannel;
  direction: 'in' | 'out';
  externalMessageId?: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments: Array<{ type: string; url: string; name?: string }>;
  status: 'received' | 'sent' | 'failed' | 'simulated';
  at: string;
}

class CrmStore {
  tickets: SupportTicketRecord[] = [];
  leads: LeadDealRecord[] = [];
  znsLogs: ZnsLogRecord[] = [];
  /** In-memory only — the durable trail is the append-only audit_log table. */
  auditLogs: AuditLogRecord[] = [];

  /**
   * Generic key→array store for modules without a dedicated typed table:
   * branches, campaigns, salesTargets, messagingOptOut, ...
   */
  collections: Record<string, unknown[]> = {};

  // Omnichannel inbox (Zalo OA + Facebook Messenger)
  conversations: ConversationRecord[] = [];
  messages: MessageRecord[] = [];

  // Consumer-goods CRM (see server/commerce-types.ts)
  customers: CustomerRecord[] = [];
  products: ProductRecord[] = [];
  orders: OrderRecord[] = [];
  visits: VisitRecord[] = [];
  promotions: PromotionRecord[] = [];

  // Warehouse: stock by lot + stock card (see server/inventory.ts)
  lots: LotRecord[] = [];
  stockMoves: StockMove[] = [];
  inventoryVouchers: InventoryVoucher[] = [];

  /**
   * Snapshot keys this version no longer uses (e.g. patients / appointments from
   * the healthcare edition). Carried through every persist untouched so pointing
   * this build at an older database never silently deletes that data.
   */
  legacy: Record<string, unknown> = {};

  /** Wipes every business collection — used to clear demo/seed data. */
  clearAll(): void {
    this.tickets = [];
    this.leads = [];
    this.znsLogs = [];
    this.auditLogs = [];
    this.conversations = [];
    this.messages = [];
    this.collections = {};
    this.customers = [];
    this.products = [];
    this.orders = [];
    this.visits = [];
    this.promotions = [];
    this.lots = [];
    this.stockMoves = [];
    this.inventoryVouchers = [];
    this.legacy = {};
  }

  addAuditLog(userId: string, userName: string, role: string, action: string, module: string, details: string) {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`,
      userId: userId || 'system',
      userName: userName || 'Hệ Thống Tự Động',
      role: role || 'System',
      action,
      module,
      details,
      ipAddress: '127.0.0.1'
    });
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }
}

export const dbStore = new CrmStore();

// Production starts empty until real data arrives — set SEED_DEMO_DATA=true to
// load the consumer-goods demo dataset (server/seed-fmcg.ts).
/** Replace all business data with a freshly generated demo dataset. */
export function loadDemoData(now = new Date()): void {
  const demo = buildFmcgDemo(now);
  dbStore.clearAll();
  dbStore.products = demo.products;
  dbStore.customers = demo.customers;
  dbStore.orders = demo.orders;
  dbStore.visits = demo.visits;
  dbStore.tickets = demo.tickets;
  dbStore.leads = demo.leads;
  dbStore.conversations = demo.conversations;
  dbStore.messages = demo.messages;
  dbStore.promotions = demo.promotions;
  dbStore.lots = demo.lots;
  dbStore.stockMoves = demo.stockMoves;
  dbStore.inventoryVouchers = demo.inventoryVouchers;
  dbStore.collections.salesTargets = demo.salesTargets;
  dbStore.collections.campaigns = demo.campaigns;
}

if (process.env.SEED_DEMO_DATA === 'true') loadDemoData();
