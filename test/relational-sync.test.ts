import { describe, it, expect } from 'vitest';
import { __specs } from '../server/relational-sync';

describe('relational-sync column specs', () => {
  it('every table maps exactly one value per column', () => {
    for (const s of __specs) {
      expect(s.sampleLen, `${s.table}: row() length must equal columns`).toBe(s.columns);
    }
  });

  it('covers the four high-churn collections', () => {
    expect(__specs.map(s => s.table).sort()).toEqual(['appointments', 'invoices', 'patients', 'tickets']);
  });
});
