import type { Express } from 'express';
import { dbStore } from './store';
import { persistStore } from './database';
import { emitChange } from './events';
import { requireAuth } from './auth';
import { sendZns, sendSms } from './integrations';
import { appointmentStartMs } from './http-util';

/** Sweep upcoming appointments and fire 24h / 2h reminders (ZNS → SMS fallback). */
export async function runReminderSweep(): Promise<void> {
  const now = Date.now();
  const skip = new Set(['Đã hủy', 'Vắng mặt', 'Đã khám xong', 'Đã tiếp đón', 'Đang khám']);
  let changed = false;
  for (const apt of dbStore.appointments) {
    if (skip.has(apt.status)) continue;
    const start = appointmentStartMs(apt);
    if (!start) continue;
    const hoursTo = (start - now) / 3_600_000;

    const fire = async (kind: '24h' | '2h') => {
      const data = {
        patient_name: apt.patientName,
        date: apt.date,
        time: (apt.timeSlot || '').split('-')[0].trim(),
        department: apt.department,
        doctor: apt.doctorName || ''
      };
      const zns = await sendZns({ phone: apt.patientPhone, templateType: 'ZNS_APPOINTMENT_CONFIRMED', templateData: data }).catch(() => null);
      if (!zns || (!zns.ok && zns.mode === 'live')) {
        await sendSms({ to: apt.patientPhone, message: `Nhac lich kham ${data.date} ${data.time} tai ${apt.department}. VitHospital.` }).catch(() => null);
      }
      emitChange({ type: 'reminder', appointmentId: apt.id, kind });
      changed = true;
    };

    if (hoursTo <= 24 && hoursTo > 2 && !apt.reminder24hSentAt) {
      apt.reminder24hSentAt = new Date().toISOString();
      await fire('24h');
    } else if (hoursTo <= 2 && hoursTo > 0 && !apt.reminder2hSentAt) {
      apt.reminder2hSentAt = new Date().toISOString();
      await fire('2h');
    }
  }
  if (changed) { void persistStore(); emitChange({ type: 'store', path: '/api/appointments', method: 'PUT' }); }
}

/** Start the 5-minute reminder scheduler (only when REMINDER_ENABLED=true). */
export function startReminderScheduler(): void {
  if (process.env.REMINDER_ENABLED === 'true') {
    console.log('[reminders] scheduler ON — sweeping every 5 minutes.');
    setInterval(() => { void runReminderSweep(); }, 5 * 60 * 1000);
    setTimeout(() => { void runReminderSweep(); }, 15_000);
  } else {
    console.log('[reminders] scheduler OFF (set REMINDER_ENABLED=true to enable).');
  }
}

export function registerReminderRoutes(app: Express): void {
  // Manual trigger for testing / ops.
  app.post('/api/appointments/reminders/run', requireAuth, async (_req, res) => {
    await runReminderSweep();
    res.json({ success: true });
  });
}
