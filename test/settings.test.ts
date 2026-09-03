import { describe, it, expect, afterAll } from 'vitest';
import { initSettings, saveSettings, describeSettings } from '../server/settings';

// No DATABASE_URL in tests → pool is null; overlay still works in memory.
afterAll(async () => { await saveSettings({ ZALO_APP_ID: '', GEMINI_API_KEY: '', SMS_PROVIDER: '' }); });

describe('runtime settings overlay', () => {
  it('exposes the group registry without leaking secret values', async () => {
    await initSettings();
    const d = describeSettings();
    expect(d.groups.some(g => g.id === 'zalo')).toBe(true);
    expect(d.groups.some(g => g.id === 'otp')).toBe(true);
    // every known key has a meta entry
    for (const g of d.groups) for (const f of g.fields) expect(d.values[f.key]).toBeDefined();
  });

  it('saves a value, masks secrets, and marks the source as "ui"', async () => {
    await saveSettings({ ZALO_APP_ID: 'abcd1234WXYZ', SMS_PROVIDER: 'esms' });
    const v = describeSettings().values;
    expect(v.ZALO_APP_ID).toMatchObject({ set: true, source: 'ui', preview: '••••WXYZ' });
    expect(v.SMS_PROVIDER).toMatchObject({ set: true, source: 'ui', preview: 'esms' }); // non-secret shown in clear
    expect(process.env.SMS_PROVIDER).toBe('esms'); // applied onto process.env
  });

  it('clearing a value removes the override', async () => {
    await saveSettings({ ZALO_APP_ID: '' });
    expect(describeSettings().values.ZALO_APP_ID.source).not.toBe('ui');
  });

  it('ignores keys outside the registry (e.g. DATABASE_URL)', async () => {
    const before = process.env.DATABASE_URL;
    await saveSettings({ DATABASE_URL: 'postgres://evil' });
    expect(process.env.DATABASE_URL).toBe(before);
  });
});
