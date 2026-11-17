import { describe, it, expect, beforeEach } from 'vitest';
import { dbStore } from '../server/store';
import { createSnapshot, restoreStore } from '../server/database';

describe('CrmStore', () => {
  beforeEach(() => dbStore.clearAll());

  it('starts empty by default (SEED_DEMO_DATA not set)', () => {
    expect(dbStore.customers).toEqual([]);
    expect(dbStore.orders).toEqual([]);
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
    dbStore.customers.push({ id: 'c1' } as never);
    dbStore.collections.branches = [{ id: 'b1' }];
    dbStore.legacy = { patients: [{ id: 'p1' }] };
    dbStore.clearAll();
    expect(dbStore.customers).toEqual([]);
    expect(dbStore.collections).toEqual({});
    expect(dbStore.legacy).toEqual({});
  });
});

describe('snapshot round-trip', () => {
  beforeEach(() => dbStore.clearAll());

  it('carries keys from older editions (healthcare) through untouched', () => {
    const patients = [{ id: 'pat-1', name: 'Nguyễn A' }];
    restoreStore({ patients, appointments: [{ id: 'apt-1' }], customers: [{ id: 'c1' }], collections: { branches: [] } });
    expect(dbStore.customers).toEqual([{ id: 'c1' }]);
    expect((dbStore as any).patients).toBeUndefined();

    const snap = createSnapshot();
    expect(snap.patients).toEqual(patients);
    expect(snap.appointments).toEqual([{ id: 'apt-1' }]);
    expect(snap.customers).toEqual([{ id: 'c1' }]);
  });

  it('never lets a legacy key shadow a current one', () => {
    restoreStore({ orders: [{ id: 'o1' }] });
    dbStore.legacy = { orders: [{ id: 'stale' }] };
    expect(createSnapshot().orders).toEqual([{ id: 'o1' }]);
  });

  it('ignores malformed values for known keys', () => {
    restoreStore({ customers: 'oops', collections: [] });
    expect(dbStore.customers).toEqual([]);
    expect(dbStore.collections).toEqual({});
  });
});
