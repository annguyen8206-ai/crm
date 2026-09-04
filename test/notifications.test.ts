import { describe, it, expect } from 'vitest';
import { computeNotifications } from '../server/routes/notifications';

const NOW = Date.parse('2026-09-04T10:00:00');
const today = '2026-09-04';

function store(over: Partial<Record<string, any[]>> = {}): any {
  return {
    tickets: [], appointments: [], recalls: [], csatFeedbacks: [],
    patients: [], invoices: [], followUps: [], leads: [],
    znsLogs: [], voipCalls: [], conversations: [], messages: [],
    ...over,
  };
}

describe('computeNotifications', () => {
  it('returns nothing for an empty store', () => {
    expect(computeNotifications(store(), NOW)).toEqual([]);
  });

  it('flags overdue tickets (by isOverdue or past slaDeadline)', () => {
    const n = computeNotifications(store({
      tickets: [
        { ticketCode: 'T1', status: 'Đang xử lý', isOverdue: true, slaDeadline: '2026-09-05 10:00' },
        { ticketCode: 'T2', status: 'Mới tiếp nhận', slaDeadline: '2026-09-04 08:00' },
        { ticketCode: 'T3', status: 'Đã đóng', slaDeadline: '2026-01-01 00:00' }, // resolved → ignored
      ],
    }), NOW);
    const overdue = n.find(x => x.id === 'tickets-overdue');
    expect(overdue?.count).toBe(2);
    expect(overdue?.severity).toBe('high');
    expect(n.find(x => x.id === 'tickets-new')?.count).toBe(1);
  });

  it('flags today\'s unconfirmed appointments only', () => {
    const n = computeNotifications(store({
      appointments: [
        { patientName: 'A', date: today, status: 'Chờ tiếp đón', timeSlot: '09:00 - 09:30' },
        { patientName: 'B', date: today, status: 'Đã tiếp đón', checkedInAt: '2026-09-04T08:00:00' },
        { patientName: 'C', date: '2026-09-05', status: 'Chờ xác nhận' },
        { patientName: 'D', date: today, status: 'Đã hủy' },
      ],
    }), NOW);
    expect(n.find(x => x.id === 'appts-today-pending')?.count).toBe(1);
  });

  it('flags overdue recalls and low-CSAT follow-ups, sorted high-severity first', () => {
    const n = computeNotifications(store({
      recalls: [{ patientName: 'R1', daysOverdue: 3, status: 'Đến hạn - Chờ liên hệ' },
                { patientName: 'R2', daysOverdue: 0, status: 'Đến hạn - Chờ liên hệ' }],
      csatFeedbacks: [{ patientName: 'C1', rating: 2, followUpRequired: true }],
    }), NOW);
    expect(n[0].severity).toBe('high');
    expect(n.find(x => x.id === 'recalls-overdue')?.count).toBe(1);
    expect(n.find(x => x.id === 'csat-followup')?.count).toBe(1);
  });
});
