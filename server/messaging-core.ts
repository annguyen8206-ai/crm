import { dbStore, ConversationRecord, MessageRecord } from './store';
import { persistStore } from './database';
import { emitChange } from './events';
import { fetchProfile, type IncomingMessage } from './integrations';
import { phoneMatches } from './http-util';

const placeholderName = (msg: IncomingMessage) =>
  `${msg.channel === 'zalo' ? 'Zalo' : msg.channel === 'facebook' ? 'Facebook' : 'Khách'} user ${msg.externalUserId.slice(-6)}`;

/** Ingest an inbound omnichannel message (Zalo OA / Facebook). Shared by the
 *  public webhook routes and the authenticated simulate endpoint. */
export async function ingestIncoming(msg: IncomingMessage): Promise<{ conversation: ConversationRecord; message: MessageRecord }> {
  let conv = dbStore.conversations.find(c => c.channel === msg.channel && c.externalUserId === msg.externalUserId);
  if (!conv) {
    const profile = await fetchProfile(msg.channel, msg.externalUserId).catch(() => ({} as { name?: string; avatarUrl?: string }));
    if (!msg.senderName && !profile.name) {
      console.warn(`[messaging] không lấy được tên hồ sơ ${msg.channel} cho ${msg.externalUserId} — kiểm tra token OA + quyền "lấy thông tin người dùng"`);
    }
    conv = {
      id: `conv-${msg.channel}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channel: msg.channel,
      externalUserId: msg.externalUserId,
      displayName: msg.senderName || profile.name || placeholderName(msg),
      avatarUrl: profile.avatarUrl,
      lastMessageAt: msg.at,
      lastMessagePreview: msg.text.slice(0, 140),
      unreadCount: 0,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    // Link to an existing customer when the first message contains their phone.
    const customer = findCustomerByPhoneInText(msg.text);
    if (customer) conv.patientId = customer.id;
    dbStore.conversations.unshift(conv);
  } else if (!conv.displayName || conv.displayName === placeholderName(msg)) {
    // Conversation was created before a valid OA token was available — retry now.
    const profile = await fetchProfile(msg.channel, msg.externalUserId).catch(() => ({} as { name?: string; avatarUrl?: string }));
    if (profile.name) conv.displayName = profile.name;
    if (profile.avatarUrl && !conv.avatarUrl) conv.avatarUrl = profile.avatarUrl;
  }
  const record: MessageRecord = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    conversationId: conv.id,
    channel: msg.channel,
    direction: 'in',
    externalMessageId: msg.externalMessageId,
    senderId: msg.externalUserId,
    senderName: conv.displayName,
    text: msg.text,
    attachments: msg.attachments,
    status: 'received',
    at: msg.at
  };
  // Dedupe on provider message id.
  if (msg.externalMessageId && dbStore.messages.some(m => m.externalMessageId === msg.externalMessageId)) {
    return { conversation: conv, message: record };
  }
  dbStore.messages.push(record);
  if (dbStore.messages.length > 5000) dbStore.messages.splice(0, dbStore.messages.length - 5000);
  conv.lastMessageAt = msg.at;
  conv.lastMessagePreview = msg.text.slice(0, 140);
  conv.unreadCount += 1;
  conv.status = 'open';
  dbStore.conversations.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

  emitChange({ type: 'message', conversationId: conv.id, message: record });
  emitChange({ type: 'conversation', conversation: conv });
  void persistStore();
  return { conversation: conv, message: record };
}

/** Find a customer whose phone (9+ digits, last 9 compared) appears in a message. */
export function findCustomerByPhoneInText(text: string) {
  const runs = (String(text || '').replace(/[\s.\-()]/g, '').match(/\+?\d{9,12}/g) || []);
  for (const run of runs) {
    const c = dbStore.customers.find(x => x.phone && phoneMatches(x.phone, run));
    if (c) return c;
  }
  return undefined;
}
