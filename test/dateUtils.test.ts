import { describe, it, expect } from 'vitest';
import { formatDateVN, formatDateTimeVN, formatDateWordsVN } from '../src/utils/dateUtils';

describe('formatDateVN', () => {
  it('formats ISO YYYY-MM-DD as DD/MM/YYYY without touching the timezone', () => {
    expect(formatDateVN('2026-08-31')).toBe('31/08/2026');
    expect(formatDateVN('2026-08-31', true)).toBe('Ngày 31/08/2026');
  });
  it('passes an already DD/MM/YYYY string straight through', () => {
    expect(formatDateVN('01/02/2026')).toBe('01/02/2026');
  });
  it('returns empty string for nullish input', () => {
    expect(formatDateVN(undefined)).toBe('');
    expect(formatDateVN(null)).toBe('');
    expect(formatDateVN('')).toBe('');
  });
});

describe('formatDateTimeVN', () => {
  it('reorders "YYYY-MM-DD HH:mm" to "HH:mm DD/MM/YYYY"', () => {
    expect(formatDateTimeVN('2026-08-31 14:05')).toBe('14:05 31/08/2026');
    expect(formatDateTimeVN('2026-08-31T14:05')).toBe('14:05 31/08/2026');
  });
});

describe('formatDateWordsVN', () => {
  it('spells out the date in Vietnamese', () => {
    expect(formatDateWordsVN('2026-08-31')).toBe('Ngày 31 Tháng 08 Năm 2026');
  });
});
