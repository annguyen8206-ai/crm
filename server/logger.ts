import type { Request, Response, NextFunction } from 'express';

/**
 * Dependency-free structured logging. One JSON object per line to stdout/stderr
 * (PM2 captures both) so logs can be shipped to Loki / CloudWatch / etc. later
 * without code changes.
 *
 *   LOG_LEVEL   error | warn | info | debug   (default: info)
 *   LOG_JSON    "false" → human-readable lines instead of JSON (default: JSON in prod)
 */

type Level = 'error' | 'warn' | 'info' | 'debug';
const RANK: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const threshold = RANK[(process.env.LOG_LEVEL as Level) in RANK ? (process.env.LOG_LEVEL as Level) : 'info'];
const asJson = process.env.LOG_JSON !== 'false' && process.env.NODE_ENV === 'production';

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (RANK[level] > threshold) return;
  const rec = { t: new Date().toISOString(), level, msg, ...fields };
  const line = asJson
    ? JSON.stringify(rec)
    : `${rec.t} ${level.toUpperCase().padEnd(5)} ${msg}${fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : ''}`;
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

export const log = {
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
};

/** Access log: non-GET requests, any error status, or anything slower than 1s. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api') || req.path === '/api/stream') return next();
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const interesting = req.method !== 'GET' || res.statusCode >= 400 || ms > 1000;
    if (!interesting) return;
    const level: Level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    emit(level, `${req.method} ${req.path} ${res.statusCode} ${ms}ms`, {
      method: req.method, path: req.path, status: res.statusCode, ms,
      user: (req as any).authUser?.id, ip: req.ip,
    });
  });
  next();
}

/** Terminal Express error handler — logs the stack, returns clean JSON. */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  log.error(`unhandled error on ${req.method} ${req.path}`, {
    path: req.path, method: req.method,
    error: err?.message || String(err),
    stack: (err?.stack || '').split('\n').slice(0, 5).join(' | '),
    user: (req as any).authUser?.id,
  });
  if (res.headersSent) return;
  res.status(err?.status && err.status >= 400 && err.status < 600 ? err.status : 500)
    .json({ error: 'Lỗi máy chủ nội bộ', ...(process.env.NODE_ENV !== 'production' ? { detail: err?.message } : {}) });
}

/** Log (don't silently swallow) process-level failures. */
export function installProcessLogging(): void {
  process.on('unhandledRejection', (reason: any) => {
    log.error('unhandledRejection', { error: reason?.message || String(reason), stack: (reason?.stack || '').split('\n').slice(0, 5).join(' | ') });
  });
  process.on('uncaughtException', (err: any) => {
    log.error('uncaughtException', { error: err?.message || String(err), stack: (err?.stack || '').split('\n').slice(0, 8).join(' | ') });
    // Not exiting: a single bad request shouldn't take the whole clinic offline.
  });
}
