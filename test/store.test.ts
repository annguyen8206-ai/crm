import { describe, it, expect, beforeEach } from 'vitest';
import { dbStore } from '../server/store';

describe('HospitalBackendStore', () => {
  beforeEach(() => dbStore.clearAll());

  it('starts empty by default (SEED_DEMO_DATA not set)', () => {
    expect(dbStore.patients).toEqual([]);
    expect(dbStore.appointments).toEqual([]);
    expect(dbStore.collections).toEqual({});
  });

  it('addAuditLog prepends newest-first and caps history at 200 rows', () => {
    for (let i = 0; i < 250; i++) {
      dbStore.addAuditLog('u1', 'Tester', 'Admin', `ACTION_${i}`, 'Test', `row ${i}`);
    }
    expect(dbStore.auditLogs).toHaveLength(200);
    expect(dbStore.auditLogs[0].action).toBe('ACTION_249');
    expect(dbStore.auditLogs[0].userName).toBe('Tester');
  });

  it('addAuditLog fills sensible defaults for blank identity', () => {
    dbStore.addAuditLog('', '', '', 'X', 'M', 'd');
    expect(dbStore.auditLogs[0].userId).toBe('system');
    expect(dbStore.auditLogs[0].role).toBe('System');
  });

  it('clearAll wipes every collection', () => {
    dbStore.patients.push({ id: 'p1' } as never);
    dbStore.collections.branches = [{ id: 'b1' }];
    dbStore.clearAll();
    expect(dbStore.patients).toEqual([]);
    expect(dbStore.collections).toEqual({});
  });
});
