import { describe, it, expect, beforeEach } from 'vitest';
import { dbStore } from '../server/store';
import { ingestIncoming } from '../server/messaging-core';
import { sendReply } from '../server/integrations';

beforeEach(() => {
  dbStore.conversations.length = 0;
  dbStore.messages.length = 0;
});

describe('patient portal live chat → omnichannel inbox', () => {
  it('ingestIncoming creates a "portal" conversation and stores the inbound message', async () => {
    const { conversation, message } = await ingestIncoming({
      channel: 'portal',
      externalUserId: 'pat-99',
      senderName: 'Nguyễn Văn A',
      text: 'Cho em hỏi lịch khám ạ',
      attachments: [],
      at: new Date().toISOString(),
    });

    expect(conversation.channel).toBe('portal');
    expect(conversation.externalUserId).toBe('pat-99');
    expect(conversation.displayName).toBe('Nguyễn Văn A');
    expect(conversation.unreadCount).toBe(1);
    expect(message.direction).toBe('in');
    expect(dbStore.messages).toHaveLength(1);

    // a second message reuses the same conversation
    await ingestIncoming({
      channel: 'portal', externalUserId: 'pat-99', senderName: 'Nguyễn Văn A',
      text: 'Em muốn khám tim mạch', attachments: [], at: new Date().toISOString(),
    });
    expect(dbStore.conversations).toHaveLength(1);
    expect(dbStore.messages).toHaveLength(2);
    expect(dbStore.conversations[0].unreadCount).toBe(2);
  });

  it('sendReply for the portal channel succeeds without calling any external API', async () => {
    const r = await sendReply('portal', 'pat-99', 'Dạ phòng khám hỗ trợ ngay ạ');
    expect(r).toMatchObject({ ok: true, mode: 'live', provider: 'portal' });
  });
});
