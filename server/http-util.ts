import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { isAdmin } from './rbac';

/** Lazy Gemini client — only built when GEMINI_API_KEY is present. */
let aiClient: GoogleGenAI | null = null;
export function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

/** Read ?limit/?offset and slice. Defaults keep the old "return everything" behaviour. */
export function pageOf<T>(rows: T[], q: any): { page: T[]; total: number; limit: number; offset: number } {
  const total = rows.length;
  const limit = Math.min(5000, Math.max(1, Number(q?.limit) || 1000));
  const offset = Math.max(0, Number(q?.offset) || 0);
  return { page: rows.slice(offset, offset + limit), total, limit, offset };
}

export const digitsOnly = (s: string) => String(s || '').replace(/\D/g, '');

export const phoneMatches = (a: string, b: string) => {
  const x = digitsOnly(a), y = digitsOnly(b);
  if (!x || !y) return false;
  return x.slice(-9) === y.slice(-9);
};

/** Start time of an appointment as epoch ms, from `date` (YYYY-MM-DD) + `timeSlot` ("08:30 - 09:00"). */
export function appointmentStartMs(apt: { date?: string; timeSlot?: string }): number | null {
  if (!apt.date) return null;
  const t = (apt.timeSlot || '00:00').match(/(\d{1,2}):(\d{2})/);
  const hh = t ? Number(t[1]) : 0;
  const mm = t ? Number(t[2]) : 0;
  const d = new Date(`${apt.date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

export const APP_BASE_URL = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') ? process.env.APP_URL.replace(/\/$/, '') : '';
export const queueLookupUrl = (code: string) => `${APP_BASE_URL}/api/queue/${encodeURIComponent(code)}`;
export const queueQrUrl = (code: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(queueLookupUrl(code) || code)}`;

/** Gate a route to admin / ban giám đốc roles. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (isAdmin((req as any).authUser?.role)) { next(); return; }
  res.status(403).json({ error: 'Chỉ Quản trị viên / Ban Giám Đốc mới thực hiện được thao tác này' });
}
