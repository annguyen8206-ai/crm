import { dbStore, ConversationRecord, MessageRecord, VoipCallRecord } from './store';
import { persistStore } from './database';
import { emitChange } from './events';
import { fetchProfile, type IncomingMessage } from './integrations';
import { phoneMatches } from './http-util';

/** Ingest an inbound omnichannel message (Zalo OA / Facebook). Shared by the
 *  public webhook routes and the authenticated simulate endpoint. */
export async function ingestIncoming(msg: IncomingMessage): Promise<{ conversation: ConversationRecord; message: MessageRecord }> {
  let conv = dbStore.conversations.find(c => c.channel === msg.channel && c.externalUserId === msg.externalUserId);
  if (!conv) {
    const profile = await fetchProfile(msg.channel, msg.externalUserId).catch(() => ({} as { name?: string; avatarUrl?: string }));
    conv = {
      id: `conv-${msg.channel}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channel: msg.channel,
      externalUserId: msg.externalUserId,
      displayName: msg.senderName || profile.name || `${msg.channel === 'zalo' ? 'Zalo' : 'Facebook'} user ${msg.externalUserId.slice(-6)}`,
      avatarUrl: profile.avatarUrl,
      lastMessageAt: msg.at,
      lastMessagePreview: msg.text.slice(0, 140),
      unreadCount: 0,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    // Link to an existing patient by phone if the display name looks like one.
    const patient = dbStore.patients.find(p => p.phone && msg.text && msg.text.replace(/\D/g, '').includes(p.phone.replace(/\D/g, '')));
    if (patient) conv.patientId = patient.id;
    dbStore.conversations.unshift(conv);
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

/** Ingest an inbound call (screen-pop) from the VoIP webhook. */
export function ingestInboundCall(from: string, to: string, callId: string) {
  const patient = dbStore.patients.find(p => phoneMatches(p.phone, from)) || null;
  const now = new Date();
  const call: VoipCallRecord = {
    id: callId || `call-in-${Date.now()}`,
    callType: 'INBOUND_HOTLINE',
    patientId: patient?.id || '',
    patientName: patient?.name || 'Khách chưa có hồ sơ',
    patientPhone: from,
    agentStaffName: '',
    agentExtension: to || 'hotline',
    startTime: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    durationSeconds: 0,
    status: 'Đang đổ chuông (gọi đến)'
  };
  if (!dbStore.voipCalls.some(c => c.id === call.id)) dbStore.voipCalls.unshift(call);
  emitChange({ type: 'incoming-call', call, patient });
  void persistStore();
  return { call, patient };
}
