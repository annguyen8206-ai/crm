import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Pause,
  Play,
  Share2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Clock,
  Radio,
  X,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { VoipCallSession } from '../types';

interface VoipSoftphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  diagnosis?: string;
  doctorCareNotes?: string;
  agentStaffName?: string;
  agentExtension?: string;
  onCallCompleted?: (callData: VoipCallSession) => void;
}

export const VoipSoftphoneModal: React.FC<VoipSoftphoneModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientPhone,
  diagnosis,
  doctorCareNotes,
  agentStaffName = 'ĐD. Lê Thị Diệu',
  agentExtension = '108',
  onCallCompleted
}) => {
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>('RINGING');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<'Ổn định' | 'Cần bác sĩ hội chẩn lại' | 'Hẹn tái khám' | 'Đổi giờ gọi lại'>('Ổn định');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setCallState('RINGING');
      setSeconds(0);
      setIsMuted(false);
      setIsHeld(false);
      setSavedSuccess(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Auto connect after 2.5 seconds ringing
    const ringTimeout = setTimeout(() => {
      setCallState('CONNECTED');
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }, 2500);

    return () => {
      clearTimeout(ringTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState('ENDED');
  };

  const handleSaveAndClose = async () => {
    const newSession: VoipCallSession = {
      id: `call-${Date.now()}`,
      callType: 'OUTBOUND_CSKH',
      patientId: patientId || 'pat-1',
      patientName,
      patientPhone,
      agentStaffName,
      agentExtension,
      startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      endTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      durationSeconds: seconds || 15,
      status: 'Hoàn tất cuộc gọi',
      audioRecordingUrl: `https://audio.vithospital.vn/rec-${Date.now()}.mp3`,
      callNotes: callNotes.trim() || 'Bệnh nhân trao đổi ổn định, đã tiếp nhận lời dặn của bác sĩ.',
      callOutcome
    };

    try {
      await fetch('/api/calls/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: newSession.id,
          durationSeconds: newSession.durationSeconds,
          callOutcome: newSession.callOutcome,
          callNotes: newSession.callNotes
        })
      });
    } catch (e) {
      console.warn('VoIP complete api error fallback', e);
    }

    if (onCallCompleted) {
      onCallCompleted(newSession);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Top bar */}
        <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300">Tổng Đài Ảo VitVoIP WebRTC</span>
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono">
              Máy nhánh: Ext {agentExtension} ({agentStaffName})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Caller Profile Card */}
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold border-4 border-slate-800 shadow-xl">
              {patientName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{patientName}</h3>
              <p className="text-sm font-mono text-blue-400 font-semibold">{patientPhone}</p>
            </div>

            {/* Status indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800">
              {callState === 'RINGING' && (
                <>
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400">Đang đổ chuông máy khách...</span>
                </>
              )}
              {callState === 'CONNECTED' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-emerald-400 font-mono">Đang đàm thoại: {formatTimer(seconds)}</span>
                </>
              )}
              {callState === 'ENDED' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400">Đã gác máy (Thời lượng: {formatTimer(seconds)})</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Doctor's Medical Advice Reference */}
          {(diagnosis || doctorCareNotes) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 text-xs text-left">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Stethoscope className="w-4 h-4" />
                <span>Chẩn Đoán & Lời Dặn Bác Sĩ Cần Trao Đổi:</span>
              </div>
              {diagnosis && (
                <div className="text-slate-300">
                  <span className="text-slate-500">Chẩn đoán:</span> <strong>{diagnosis}</strong>
                </div>
              )}
              {doctorCareNotes && (
                <div className="text-slate-300 italic bg-slate-950 p-2 rounded-lg border border-slate-800 leading-relaxed">
                  "{doctorCareNotes}"
                </div>
              )}
            </div>
          )}

          {/* In-call controls */}
          {callState !== 'ENDED' ? (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-full border transition-all cursor-pointer ${
                  isMuted ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Bật micro' : 'Tắt tiếng (Mute)'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsHeld(!isHeld)}
                className={`p-3.5 rounded-full border transition-all cursor-pointer ${
                  isHeld ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title={isHeld ? 'Tiếp tục cuộc gọi' : 'Giữ máy (Hold)'}
              >
                {isHeld ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>

              {/* End call red button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <PhoneOff className="w-5 h-5" />
                <span>Gác Máy</span>
              </button>
            </div>
          ) : (
            /* Post-call wrap-up form */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <span className="font-bold text-slate-200 block text-sm">Ghi Nhận Kết Quả Cuộc Gọi Sau Khi Gác Máy</span>
              
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Đánh Giá Kết Quả Trao Đổi</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="Ổn định">Bệnh nhân ổn định / Đã tiếp thu lời dặn</option>
                  <option value="Hẹn tái khám">Đồng ý đặt lịch tái khám</option>
                  <option value="Cần bác sĩ hội chẩn lại">Báo triệu chứng lạ - Cần bác sĩ gọi lại</option>
                  <option value="Đổi giờ gọi lại">Bận máy - Hẹn gọi lại vào khung giờ khác</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Ghi Chú Chi Tiết Của CSKH</label>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="VD: Khách giảm đau 80%, huyết áp đo sáng 120/80. Đã nhắc uống nhiều nước..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
              </div>

              <button
                type="button"
                disabled={savedSuccess}
                onClick={handleSaveAndClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer disabled:bg-emerald-600 flex items-center justify-center gap-2"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã lưu vào hồ sơ bệnh nhân!</span>
                  </>
                ) : (
                  <span>Lưu Hồ Sơ Cuộc Gọi & Đóng</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
