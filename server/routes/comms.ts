import type { Express } from 'express';
import { dbStore, ZnsLogRecord, VoipCallRecord } from '../store';
import { emitChange } from '../events';
import { persistStore } from '../database';
import { sendZns, startCall } from '../integrations';
import { phoneMatches } from '../http-util';

/** Outbound comms: Zalo ZNS post-visit care + VoIP softphone / call logs. */
export function registerCommsRoutes(app: Express): void {
  // --- Zalo ZNS ---
  app.get('/api/zns/templates', (req, res) => {
    res.json({
      templates: [
        {
          id: 'tpl-1',
          code: 'ZNS_POST_VISIT_CARE',
          name: 'ZNS Dặn dò sau khám & Hướng dẫn theo dõi tại nhà',
          category: 'Chăm sóc sau khám',
          pricePerMessage: 320,
          sampleContent: 'Kính gửi {patient_name}, VitHospital gửi lời cảm ơn Quý khách. Bác sĩ dặn dò sau khám: {doctor_notes}. Chúc Quý khách mau khỏe!'
        },
        {
          id: 'tpl-2',
          code: 'ZNS_AUTO_RECALL',
          name: 'ZNS Nhắc lịch tái khám & Tầm soát định kỳ',
          category: 'Nhắc tái khám',
          pricePerMessage: 320,
          sampleContent: 'Kính gửi {patient_name}, đã đến lịch tái khám định kỳ cho tình trạng {diagnosis}. Kính mời Quý khách đặt hẹn sớm để duy trì kết quả điều trị.'
        },
        {
          id: 'tpl-3',
          code: 'ZNS_APPOINTMENT_CONFIRMED',
          name: 'ZNS Xác nhận đặt lịch khám thành công & Mã QR tiếp đón',
          category: 'Đặt lịch khám',
          pricePerMessage: 280,
          sampleContent: 'Lịch khám của Quý khách {patient_name} tại {branch_name} vào {time} ngày {date} đã được xác nhận. Mã số thứ tự: {queue_number}.'
        },
        {
          id: 'tpl-4',
          code: 'ZNS_HEALTH_CARE_FOLLOWUP',
          name: 'ZNS Khảo sát sức khỏe & Đánh giá mức độ hài lòng sau khám',
          category: 'Chăm sóc khách hàng',
          pricePerMessage: 280,
          sampleContent: 'VitCRM trân trọng cảm ơn Quý khách {patient_name} đã tin tưởng dịch vụ. Kính mời Quý khách để lại đánh giá trải nghiệm tại đường dẫn sau.'
        }
      ]
    });
  });

  app.get('/api/zns/logs', (req, res) => {
    res.json({ logs: dbStore.znsLogs, total: dbStore.znsLogs.length });
  });

  app.post('/api/zns/send-post-visit-care', async (req, res) => {
    try {
      const {
        patientId,
        patientName,
        patientPhone,
        diagnosis,
        doctorCareNotes,
        channel = 'Zalo ZNS',
        templateType = 'ZNS_POST_VISIT_CARE',
        templateData
      } = req.body;

      if (!patientName || !diagnosis) {
        return res.status(400).json({ error: 'Thiếu thông tin bệnh nhân hoặc chẩn đoán khám bệnh' });
      }

      const trackingCode = `ZNS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const careNotes = doctorCareNotes || 'Bệnh nhân tuân thủ chế độ ăn uống, sinh hoạt lành mạnh và theo dõi triệu chứng tại nhà.';

      // Real send when Zalo OA is configured; otherwise a simulated result.
      const dispatch = await sendZns({
        phone: patientPhone || '',
        templateType,
        templateData: templateData || { patient_name: patientName, diagnosis, care_notes: careNotes.slice(0, 200) },
        trackingId: trackingCode
      });

      const newLog: ZnsLogRecord = {
        id: `zns-log-${Date.now()}`,
        patientId: patientId || `pat-${Date.now()}`,
        patientName,
        patientPhone: patientPhone || '09xx xxx xxx',
        templateType,
        templateName: templateType === 'ZNS_AUTO_RECALL' ? 'ZNS Nhắc Lịch Tái Khám Tự Động' : 'ZNS Dặn Dò Sau Khám & Hướng Dẫn Điều Trị',
        diagnosis,
        doctorCareNotes: careNotes,
        channel,
        status: dispatch.ok ? (dispatch.mode === 'live' ? 'Đã gửi thành công' : 'Đã gửi (giả lập)') : `Gửi thất bại: ${dispatch.error || 'lỗi provider'}`,
        sentAt: timeStr,
        deliveredAt: dispatch.ok ? timeStr : '',
        trackingCode: dispatch.ref || trackingCode,
        cost: dispatch.mode === 'live' ? 320 : 0
      };

      dbStore.znsLogs.unshift(newLog);

      res.status(dispatch.ok ? 200 : 502).json({
        success: dispatch.ok,
        mode: dispatch.mode,
        message: dispatch.ok
          ? `Đã gửi ZNS tới ${patientName}${dispatch.mode === 'simulated' ? ' (giả lập — chưa cấu hình Zalo OA)' : ''}.`
          : `Không gửi được ZNS: ${dispatch.error}`,
        log: newLog
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi gửi ZNS', details: e.message });
    }
  });

  // --- VoIP softphone / call logs ---
  app.post('/api/calls/click-to-call', async (req, res) => {
    const { patientId, patientName, patientPhone, agentStaffName = 'CSKH VitCRM', agentExtension = '108' } = req.body;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Real outbound call when a VoIP provider is configured; otherwise simulated.
    const dispatch = await startCall({ toNumber: patientPhone, agentId: agentExtension });

    const newCall: VoipCallRecord = {
      id: dispatch.ref || `call-${Date.now()}`,
      callType: 'OUTBOUND_CSKH',
      patientId: patientId || `pat-${Date.now()}`,
      patientName,
      patientPhone,
      agentStaffName,
      agentExtension,
      startTime: timeStr,
      durationSeconds: 0,
      status: dispatch.ok ? (dispatch.mode === 'live' ? 'Đang đổ chuông' : 'Đang đổ chuông (giả lập)') : `Kết nối thất bại: ${dispatch.error || 'lỗi provider'}`
    };

    dbStore.voipCalls.unshift(newCall);
    res.status(dispatch.ok ? 200 : 502).json({
      success: dispatch.ok,
      mode: dispatch.mode,
      message: dispatch.ok
        ? `Đang gọi tới ${patientPhone}${dispatch.mode === 'simulated' ? ' (giả lập — chưa cấu hình VoIP)' : ''}...`
        : `Không kết nối được cuộc gọi: ${dispatch.error}`,
      callSession: newCall
    });
  });

  app.post('/api/calls/complete', (req, res) => {
    const { callId, durationSeconds, callOutcome, callNotes, status = 'Hoàn tất cuộc gọi' } = req.body;
    const idx = dbStore.voipCalls.findIndex(c => c.id === callId);
    if (idx >= 0) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      dbStore.voipCalls[idx] = {
        ...dbStore.voipCalls[idx],
        durationSeconds: durationSeconds || 60,
        callOutcome: callOutcome || 'Ổn định',
        callNotes: callNotes || 'Cuộc gọi thành công',
        status,
        endTime: timeStr,
        audioRecordingUrl: `https://audio.vithospital.vn/rec-${Date.now()}.mp3`
      };
      return res.json({ success: true, callSession: dbStore.voipCalls[idx] });
    }
    res.json({ success: true });
  });

  app.get('/api/calls/logs', (req, res) => {
    res.json({ calls: dbStore.voipCalls, total: dbStore.voipCalls.length });
  });

  // Simulate an inbound call (screen-pop) without a real PBX.
  app.post('/api/calls/simulate-inbound', (req, res) => {
    const { from, to } = req.body || {};
    if (!from) return res.status(400).json({ error: 'Cần số gọi đến (from)' });
    const patient = dbStore.patients.find(p => phoneMatches(p.phone, String(from))) || null;
    const now = new Date();
    const call: VoipCallRecord = {
      id: `call-in-${Date.now()}`,
      callType: 'INBOUND_HOTLINE',
      patientId: patient?.id || '',
      patientName: patient?.name || 'Khách chưa có hồ sơ',
      patientPhone: String(from),
      agentStaffName: '',
      agentExtension: String(to || 'hotline'),
      startTime: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      durationSeconds: 0,
      status: 'Đang đổ chuông (gọi đến)'
    };
    dbStore.voipCalls.unshift(call);
    emitChange({ type: 'incoming-call', call, patient });
    void persistStore();
    res.json({ success: true, call, patient });
  });
}
