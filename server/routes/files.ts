import type { Express } from 'express';
import express from 'express';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, unlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pool } from '../database';
import { verifySessionToken } from '../auth';
import { isAdmin } from '../rbac';
import { recordAudit } from '../audit';
import { log } from '../logger';

/**
 * File attachments for patients / tickets / invoices. Bytes live on disk under
 * UPLOAD_DIR (default <cwd>/uploads); metadata in the `file_attachments` table.
 * Upload uses a raw body (no multipart dependency): the client POSTs the file
 * bytes with `x-filename` + Content-Type headers.
 *
 *   UPLOAD_DIR      default ./uploads
 *   MAX_UPLOAD_MB   default 15
 */

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));
const MAX_BYTES = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 15)) * 1024 * 1024;
const ENTITIES = new Set(['patient', 'ticket', 'invoice', 'referral', 'partnerPayout']);

const EXT: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/heic': 'heic', 'image/gif': 'gif',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt', 'text/csv': 'csv',
};

export const safeName = (s: string) =>
  (s || 'file')
    .replace(/[\\/\x00-\x1f]+/g, '_')   // path separators + control chars
    .replace(/\.{2,}/g, '.')            // no ".." traversal
    .replace(/^[.\s]+/, '')             // no leading dot/space
    .trim()
    .slice(0, 120) || 'file';

/** GET /api/files/:id — served BEFORE requireAuth so `<a href>` downloads can
 *  authenticate via `?token=` (like /api/stream). */
export function registerPublicFileDownload(app: Express): void {
  app.get('/api/files/:id', async (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.query.token || '');
    if (!verifySessionToken(token)) return res.sendStatus(401);
    if (!pool) return res.sendStatus(404);
    const r = await pool.query('SELECT filename, mime, storage_path FROM file_attachments WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    const { filename, mime, storage_path } = r.rows[0];
    try { await stat(storage_path); } catch { return res.status(410).json({ error: 'Tệp không còn trên máy chủ' }); }
    const disposition = /^image\/|^application\/pdf$/.test(mime) ? 'inline' : 'attachment';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
    createReadStream(storage_path).on('error', () => res.sendStatus(500)).pipe(res);
  });
}

export function registerFileRoutes(app: Express): void {
  const rawBody = express.raw({ type: () => true, limit: MAX_BYTES + 1024 });

  app.post('/api/files', rawBody, async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Lưu trữ tệp cần DATABASE_URL' });
    const entityType = String(req.query.entityType || '');
    const entityId = String(req.query.entityId || '');
    let rawName = String(req.headers['x-filename'] || 'tệp-đính-kèm');
    try { rawName = decodeURIComponent(rawName); } catch { /* keep as-is */ }
    const filename = safeName(rawName);
    const mime = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
    const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    if (!ENTITIES.has(entityType) || !entityId) return res.status(400).json({ error: 'Thiếu entityType/entityId hợp lệ' });
    if (!buf.length) return res.status(400).json({ error: 'Tệp rỗng' });
    if (buf.length > MAX_BYTES) return res.status(413).json({ error: `Tệp vượt ${Math.round(MAX_BYTES / 1024 / 1024)}MB` });
    if (!EXT[mime]) return res.status(415).json({ error: `Định dạng không hỗ trợ: ${mime}` });

    const id = randomUUID();
    const storagePath = join(UPLOAD_DIR, `${id}.${EXT[mime]}`);
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await new Promise<void>((ok, no) => {
        const ws = createWriteStream(storagePath);
        ws.on('error', no); ws.on('finish', () => ok());
        ws.end(buf);
      });
      await pool.query(
        `INSERT INTO file_attachments (id, entity_type, entity_id, filename, mime, size, storage_path, uploaded_by, uploaded_by_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, entityType, entityId, filename, mime, buf.length, storagePath, req.authUser?.id || null, req.authUser?.name || null]
      );
      recordAudit({
        userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
        action: 'FILE_UPLOAD', module: 'Tệp', ip: req.ip,
        details: `${entityType}/${entityId} · ${filename} (${Math.round(buf.length / 1024)}KB)`,
      });
      res.status(201).json({ id, filename, mime, size: buf.length });
    } catch (e: any) {
      log.error('file upload failed', { error: e.message, entityType, entityId });
      await unlink(storagePath).catch(() => {});
      res.status(500).json({ error: 'Không lưu được tệp' });
    }
  });

  app.get('/api/files', async (req, res) => {
    if (!pool) return res.json({ files: [] });
    const entityType = String(req.query.entityType || '');
    const entityId = String(req.query.entityId || '');
    if (!entityType || !entityId) return res.status(400).json({ error: 'Thiếu entityType/entityId' });
    const r = await pool.query(
      `SELECT id, filename, mime, size, uploaded_by AS "uploadedBy", uploaded_by_name AS "uploadedByName", created_at AS "createdAt"
       FROM file_attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    res.json({ files: r.rows });
  });

  app.delete('/api/files/:id', async (req, res) => {
    if (!pool) return res.sendStatus(404);
    const r = await pool.query('SELECT storage_path, uploaded_by, filename, entity_type, entity_id FROM file_attachments WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Không tìm thấy tệp' });
    const row = r.rows[0];
    if (!isAdmin(req.authUser?.role) && row.uploaded_by !== req.authUser?.id) {
      return res.status(403).json({ error: 'Chỉ người tải lên hoặc Quản trị viên mới xoá được tệp' });
    }
    await pool.query('DELETE FROM file_attachments WHERE id = $1', [req.params.id]);
    await unlink(row.storage_path).catch(() => {});
    recordAudit({
      userId: req.authUser?.id || '', userName: req.authUser?.name || '', role: req.authUser?.role || '',
      action: 'FILE_DELETE', module: 'Tệp', ip: req.ip,
      details: `${row.entity_type}/${row.entity_id} · ${row.filename}`,
    });
    res.json({ success: true });
  });
}
