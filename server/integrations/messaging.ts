import crypto from 'node:crypto';
import type { DispatchResult, IntegrationStatus } from './types';
import { getZaloAccessToken } from './zns';

/**
 * Omnichannel inbound/outbound messaging: Zalo OA + Facebook Messenger.
 *
 * Zalo OA        → reuses ZALO_OA_ACCESS_TOKEN / ZALO_APP_ID+SECRET+REFRESH_TOKEN
 *                  ZALO_APP_SECRET is also used to verify webhook signatures.
 * Facebook Page  → FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_APP_SECRET,
 *                  FACEBOOK_VERIFY_TOKEN (for the GET webhook handshake)
 *
 * Unconfigured → send falls back to "simulated"; webhooks still accept payloads
 * (signature check is skipped with a warning) so the flow is testable.
 */

export type Channel = 'zalo' | 'facebook' | 'portal';

export interface IncomingMessage {
  channel: Channel;
  externalUserId: string;
  senderName?: string;
  text: string;
  attachments: Array<{ type: string; url: string; name?: string }>;
  externalMessageId?: string;
  at: string;
}

export function zaloConfigured(): boolean {
  return Boolean(
    process.env.ZALO_OA_ACCESS_TOKEN ||
    (process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET && process.env.ZALO_OA_REFRESH_TOKEN)
  );
}
export function facebookConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_APP_SECRET);
}

export function messagingStatus(): IntegrationStatus {
  const parts: string[] = [];
  if (zaloConfigured()) parts.push('zalo'); else parts.push('zalo(off)');
  if (facebookConfigured()) parts.push('facebook'); else parts.push('facebook(off)');
  const anyLive = zaloConfigured() || facebookConfigured();
  return {
    name: 'messaging',
    configured: anyLive,
    mode: anyLive ? 'live' : 'simulated',
    provider: 'zalo+facebook',
    detail: parts.join(', ')
  };
}

// --------------------------------------------------------------------------
// Webhook signature verification
// --------------------------------------------------------------------------

/** Facebook: header `X-Hub-Signature-256: sha256=<hmac_sha256(appSecret, rawBody)>` */
export function verifyFacebookSignature(rawBody: Buffer | string, header: string | undefined): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) {
    console.warn('[messaging] FACEBOOK_APP_SECRET not set — skipping Facebook webhook signature check.');
    return true;
  }
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Zalo OA: header `X-ZEvent-Signature: mac=<sha256(appId + rawBody + timestamp + appSecret)>` */
export function verifyZaloSignature(rawBody: Buffer | string, header: string | undefined, timestamp: string | undefined): boolean {
  const secret = process.env.ZALO_APP_SECRET;
  const appId = process.env.ZALO_APP_ID;
  if (!secret || !appId) {
    console.warn('[messaging] ZALO_APP_ID/SECRET not set — skipping Zalo webhook signature check.');
    return true;
  }
  if (!header) return false;
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const ts = String(timestamp || '');
  const received = header.replace(/^mac=/i, '').trim().toLowerCase();
  const expected = crypto.createHash('sha256').update(appId + body + ts + secret).digest('hex');
  const ok = received.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));

  if (!ok && process.env.ZALO_WEBHOOK_DEBUG === 'true') {
    const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
    const hmac = (key: string, s: string) => crypto.createHmac('sha256', key).update(s).digest('hex');
    const candidates: Record<string, string> = {
      'sha256(appId+data+ts+secret)': sha(appId + body + ts + secret),
      'sha256(appId+data+secret)': sha(appId + body + secret),
      'sha256(data+ts+secret)': sha(body + ts + secret),
      'sha256(data+secret)': sha(body + secret),
      'sha256(secret+data)': sha(secret + body),
      'sha256(appId+ts+data+secret)': sha(appId + ts + body + secret),
      'sha256(secret+appId+data+ts)': sha(secret + appId + body + ts),
      'sha256(appId+secret+data+ts)': sha(appId + secret + body + ts),
      'hmac(secret, appId+data+ts)': hmac(secret, appId + body + ts),
      'hmac(secret, data)': hmac(secret, body),
      'hmac(secret, data+ts)': hmac(secret, body + ts),
      'hmac(secret, ts+data)': hmac(secret, ts + body),
      'hmac(secret, appId+data+ts+secret)': hmac(secret, appId + body + ts + secret),
      'hmac(appId+secret, data)': hmac(appId + secret, body),
    };
    const match = Object.entries(candidates).find(([, v]) => v === received)?.[0] || 'NONE';
    console.warn('[messaging] zalo sig debug ' + JSON.stringify({
      appIdUsed: appId, appIdLen: appId.length, secretLen: secret.length,
      tsUsed: ts, bodyLen: body.length,
      macReceivedFull: received,
      macExpectedFull: expected,
      formulaMatch: match,
      bodyFull: body.length <= 600 ? body : body.slice(0, 600) + '…',
    }));
  }
  return ok;
}

export function facebookVerifyChallenge(query: Record<string, unknown>): string | null {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return String(challenge ?? '');
  }
  return null;
}

// --------------------------------------------------------------------------
// Payload normalisation
// --------------------------------------------------------------------------

export function normalizeFacebookPayload(body: any): IncomingMessage[] {
  if (!body || body.object !== 'page' || !Array.isArray(body.entry)) return [];
  const out: IncomingMessage[] = [];
  for (const entry of body.entry) {
    for (const ev of entry.messaging || []) {
      if (!ev.message || ev.message.is_echo) continue;
      const attachments = (ev.message.attachments || []).map((a: any) => ({
        type: a.type || 'file',
        url: a.payload?.url || ''
      }));
      out.push({
        channel: 'facebook',
        externalUserId: String(ev.sender?.id || ''),
        text: ev.message.text || (attachments.length ? '[tệp đính kèm]' : ''),
        attachments,
        externalMessageId: ev.message.mid,
        at: ev.timestamp ? new Date(Number(ev.timestamp)).toISOString() : new Date().toISOString()
      });
    }
  }
  return out.filter((m) => m.externalUserId);
}

export function normalizeZaloPayload(body: any): IncomingMessage[] {
  if (!body || !body.event_name) return [];
  const textEvents = ['user_send_text', 'user_send_link', 'user_send_sticker'];
  const fileEvents = ['user_send_image', 'user_send_file', 'user_send_audio', 'user_send_video', 'user_send_gif'];
  if (![...textEvents, ...fileEvents].includes(body.event_name)) return [];

  const msg = body.message || {};
  const attachments = (msg.attachments || []).map((a: any) => ({
    type: a.type || 'file',
    url: a.payload?.url || a.payload?.thumbnail || ''
  }));
  const out: IncomingMessage[] = [{
    channel: 'zalo',
    externalUserId: String(body.sender?.id || body.user_id_by_app || ''),
    text: msg.text || (attachments.length ? '[tệp đính kèm]' : ''),
    attachments,
    externalMessageId: msg.msg_id,
    at: body.timestamp ? new Date(Number(body.timestamp)).toISOString() : new Date().toISOString()
  }];
  return out.filter((m) => m.externalUserId);
}

// --------------------------------------------------------------------------
// Outbound replies + profile lookup
// --------------------------------------------------------------------------

type OutAttachment = { type: string; url: string; name?: string };

/** Absolute URL for a possibly-relative attachment path so a provider can fetch it. */
function absUrl(u: string): string {
  if (/^https?:\/\//i.test(u)) return u;
  const base = (process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  return base ? base + (u.startsWith('/') ? u : '/' + u) : u;
}

export async function sendReply(
  channel: Channel,
  externalUserId: string,
  text: string,
  attachments: OutAttachment[] = []
): Promise<DispatchResult> {
  const media = attachments.map(a => ({ ...a, url: absUrl(a.url) }));

  // In-app patient portal chat: nothing to dispatch to a third party — the patient
  // reads staff replies by polling GET /api/portal/chat. Just report success so the
  // reply is stored as a normal outbound message.
  if (channel === 'portal') {
    return { ok: true, mode: 'live', provider: 'portal' };
  }

  if (channel === 'facebook') {
    if (!facebookConfigured()) {
      console.log(`[messaging:simulated] facebook → ${externalUserId}: ${text}${media.length ? ` (+${media.length} tệp)` : ''}`);
      return { ok: true, mode: 'simulated', provider: 'facebook' };
    }
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(process.env.FACEBOOK_PAGE_ACCESS_TOKEN!)}`;
    const sendOne = async (message: any) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: externalUserId }, messaging_type: 'RESPONSE', message })
      });
      const json: any = await res.json().catch(() => ({}));
      return { ok: res.ok && !!json.message_id, json };
    };
    try {
      let lastRef: string | undefined;
      if (text) {
        const r = await sendOne({ text });
        if (!r.ok) return { ok: false, mode: 'live', provider: 'facebook', error: r.json.error?.message || 'gửi văn bản lỗi', raw: r.json };
        lastRef = r.json.message_id;
      }
      for (const a of media) {
        const attType = a.type.startsWith('image/') || a.type === 'image' ? 'image' : 'file';
        const r = await sendOne({ attachment: { type: attType, payload: { url: a.url, is_reusable: true } } });
        if (!r.ok) return { ok: false, mode: 'live', provider: 'facebook', error: r.json.error?.message || 'gửi tệp lỗi', raw: r.json };
        lastRef = r.json.message_id;
      }
      return { ok: true, mode: 'live', provider: 'facebook', ref: lastRef };
    } catch (e: any) {
      return { ok: false, mode: 'live', provider: 'facebook', error: e.message };
    }
  }

  // zalo
  if (!zaloConfigured()) {
    console.log(`[messaging:simulated] zalo → ${externalUserId}: ${text}${media.length ? ` (+${media.length} tệp)` : ''}`);
    return { ok: true, mode: 'simulated', provider: 'zalo' };
  }
  const token = await getZaloAccessToken();
  if (!token) return { ok: false, mode: 'live', provider: 'zalo', error: 'Không lấy được access token Zalo OA' };
  // Zalo CS API needs an upload-token flow for native media; as a reliable fallback
  // we append the file URLs to the text so the customer still receives them.
  const zaloText = [text, ...media.map(a => `📎 ${a.name || 'Tệp đính kèm'}: ${a.url}`)].filter(Boolean).join('\n');
  try {
    const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify({ recipient: { user_id: externalUserId }, message: { text: zaloText } })
    });
    const json: any = await res.json().catch(() => ({}));
    if (json.error === 0) return { ok: true, mode: 'live', provider: 'zalo', ref: json.data?.message_id, raw: json };
    return { ok: false, mode: 'live', provider: 'zalo', error: json.message || `Zalo error ${json.error}`, raw: json };
  } catch (e: any) {
    return { ok: false, mode: 'live', provider: 'zalo', error: e.message };
  }
}

export async function fetchProfile(channel: Channel, externalUserId: string): Promise<{ name?: string; avatarUrl?: string }> {
  try {
    if (channel === 'facebook' && facebookConfigured()) {
      const res = await fetch(`https://graph.facebook.com/${externalUserId}?fields=name,profile_pic&access_token=${encodeURIComponent(process.env.FACEBOOK_PAGE_ACCESS_TOKEN!)}`);
      const json: any = await res.json().catch(() => ({}));
      return { name: json.name, avatarUrl: json.profile_pic };
    }
    if (channel === 'zalo' && zaloConfigured()) {
      const token = await getZaloAccessToken();
      if (!token) return {};
      const res = await fetch(`https://openapi.zalo.me/v3.0/oa/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: externalUserId }))}`, {
        headers: { access_token: token }
      });
      const json: any = await res.json().catch(() => ({}));
      return { name: json.data?.display_name, avatarUrl: json.data?.avatar };
    }
  } catch {
    /* best effort */
  }
  return {};
}
