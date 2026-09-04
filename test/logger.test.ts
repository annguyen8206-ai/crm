import { describe, it, expect, vi, afterEach } from 'vitest';
import { log, errorHandler } from '../server/logger';

afterEach(() => vi.restoreAllMocks());

describe('log', () => {
  it('writes one JSON-ish line with level + msg + fields', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    log.info('hello', { a: 1 });
    expect(spy).toHaveBeenCalledOnce();
    const line = String(spy.mock.calls[0][0]);
    expect(line).toContain('hello');
    expect(line).toMatch(/info/i);
    expect(line).toContain('1');
    expect(line.endsWith('\n')).toBe(true);
  });

  it('errors go to stderr', () => {
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    log.error('boom');
    expect(err).toHaveBeenCalledOnce();
    expect(out).not.toHaveBeenCalled();
  });

  it('debug is suppressed at the default level', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    log.debug('noisy');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('errorHandler', () => {
  const mkRes = () => {
    const r: any = { headersSent: false, statusCode: 200 };
    r.status = vi.fn((c: number) => { r.statusCode = c; return r; });
    r.json = vi.fn((b: any) => { r.body = b; return r; });
    return r;
  };
  it('returns a clean JSON 500 and logs', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const res = mkRes();
    errorHandler(new Error('kaboom'), { method: 'POST', path: '/api/x', ip: '1.2.3.4' } as any, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
    expect(res.body.error).toBeTruthy();
  });
  it('honours a numeric err.status and does not double-send', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const res = mkRes();
    errorHandler({ message: 'bad', status: 422 }, { method: 'PUT', path: '/api/y' } as any, res, () => {});
    expect(res.status).toHaveBeenCalledWith(422);
    const res2 = mkRes(); res2.headersSent = true;
    errorHandler(new Error('late'), { method: 'GET', path: '/z' } as any, res2, () => {});
    expect(res2.status).not.toHaveBeenCalled();
  });
});
