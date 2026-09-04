import type { Express } from 'express';
import { dbStore, MessageRecord } from '../store';
import { emitChange } from '../events';
import { sendReply, type Channel } from '../integrations';
import { ingestIncoming } from '../messaging-core';
import { pageOf } from '../http-util';

/** Authenticated omnichannel inbox (read / reply / assign) + provider simulate. */
export function registerInboxRoutes(app: Express): void {
  app.get('/api/conversations', (req, res) => {
    const { channel, status } = req.query;
    let list = [...dbStore.conversations];
    if (channel && typeof channel === 'string') list = list.filter(c => c.channel === channel);
    if (status && typeof status === 'string') list = list.filter(c => c.status === status);
    list.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    const p = pageOf(list, req.query);
    res.json({
      conversations: p.page,
      total: p.total, limit: p.limit, offset: p.offset,
      unread: dbStore.conversations.reduce((n, c) => n + (c.unreadCount || 0), 0)
    });
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const conv = dbStore.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
    const messages = dbStore.messages
      .filter(m => m.conversationId === conv.id)
      .sort((a, b) => (a.at < b.at ? -1 : 1));
    if (conv.unreadCount > 0) {
      conv.unreadCount = 0;
      emitChange({ type: 'conversation', conversation: conv });
    }
    res.json({ conversation: conv, messages });
  });

  app.post('/api/conversations/:id/reply', async (req, res) => {
    const conv = dbStore.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Nội dung trả lời trống' });

    const dispatch = await sendReply(conv.channel, conv.externalUserId, text);
    const record: MessageRecord = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      conversationId: conv.id,
      channel: conv.channel,
      direction: 'out',
      externalMessageId: dispatch.ref,
      senderId: req.authUser?.id || 'staff',
      senderName: req.authUser?.name || 'Nhân viên CSKH',
      text,
      attachments: [],
      status: dispatch.ok ? (dispatch.mode === 'live' ? 'sent' : 'simulated') : 'failed',
      at: new Date().toISOString()
    };
    dbStore.messages.push(record);
    conv.lastMessageAt = record.at;
    conv.lastMessagePreview = text.slice(0, 140);
    conv.assignedStaff = req.authUser?.name || conv.assignedStaff;
    emitChange({ type: 'message', conversationId: conv.id, message: record });
    emitChange({ type: 'conversation', conversation: conv });
    res.status(dispatch.ok ? 200 : 502).json({ success: dispatch.ok, mode: dispatch.mode, message: record, error: dispatch.error });
  });

  app.put('/api/conversations/:id', (req, res) => {
    const conv = dbStore.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy hội thoại' });
    const { status, assignedStaff, patientId } = req.body || {};
    if (status && ['open', 'snoozed', 'closed'].includes(status)) conv.status = status;
    if (assignedStaff !== undefined) conv.assignedStaff = assignedStaff;
    if (patientId !== undefined) conv.patientId = patientId;
    emitChange({ type: 'conversation', conversation: conv });
    res.json({ success: true, conversation: conv });
  });

  // Inject a fake inbound message to test the pipeline without a real provider.
  app.post('/api/webhooks/:channel/simulate', async (req, res) => {
    const channel = req.params.channel as Channel;
    if (channel !== 'zalo' && channel !== 'facebook') return res.status(400).json({ error: 'channel phải là zalo hoặc facebook' });
    const { externalUserId, senderName, text } = req.body || {};
    if (!externalUserId || !text) return res.status(400).json({ error: 'Cần externalUserId và text' });
    const result = await ingestIncoming({
      channel,
      externalUserId: String(externalUserId),
      senderName,
      text: String(text),
      attachments: [],
      externalMessageId: `sim-${Date.now()}`,
      at: new Date().toISOString()
    });
    res.json({ success: true, ...result });
  });
}
