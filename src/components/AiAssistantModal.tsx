import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Stethoscope,
  Clock,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { Patient, Doctor } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  onOpenBookAppointment?: (patientId: string, department: string) => void;
}

interface TriageData {
  urgency?: string;
  urgencyLevel?: string;
  suggestedDepartment?: string;
  suggestedSpecialty?: string;
  recommendedDoctor?: string;
  preliminaryAdvice?: string;
  triageNotes?: string;
  recommendedTests?: string[];
  suggestedTests?: string[];
  differentialDiagnosis?: string[];
  questionsToAsk?: string[];
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  onOpenBookAppointment
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [medicalHistoryInput, setMedicalHistoryInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageData | null>(null);

  if (!isOpen) return null;

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPatientId(id);
    const p = patients.find(pat => pat.id === id);
    if (p) {
      setMedicalHistoryInput(p.underlyingConditions.join(', ') + ' - Dị ứng: ' + p.allergies.join(', '));
    }
  };

  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomsInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const selectedP = patients.find(p => p.id === selectedPatientId);
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomsInput,
          patientAge: selectedP?.age || 45,
          patientGender: selectedP?.gender || 'Nữ',
          medicalHistory: medicalHistoryInput
        })
      });
      const data = await res.json();
      setTriageResult(data);
    } catch (err) {
      console.error("Triage AI Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const urgency = triageResult?.urgency || triageResult?.urgencyLevel || 'Tiêu chuẩn';
  const department = triageResult?.suggestedDepartment || triageResult?.suggestedSpecialty || 'Khoa Khám Bệnh Đa Khoa';
  const advice = triageResult?.preliminaryAdvice || triageResult?.triageNotes || 'Khuyến nghị bệnh nhân thăm khám lâm sàng chuyên khoa để có chẩn đoán chính xác.';
  const tests = triageResult?.recommendedTests || triageResult?.suggestedTests || [];
  const questions = triageResult?.questionsToAsk || triageResult?.differentialDiagnosis || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-slate-800 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Trợ Lý AI Phân Luồng & Triage Y Khoa</h3>
              <p className="text-xs text-slate-500">Hỗ trợ tiếp đón, phân loại mức độ khẩn cấp & chỉ định cận lâm sàng</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          <form onSubmit={handleRunTriage} className="space-y-4">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Chọn bệnh nhân (nếu có sẵn hồ sơ):</label>
              <select
                value={selectedPatientId}
                onChange={handlePatientSelect}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="">-- Bệnh nhân mới / Khách vãng lai --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.pid}) - {p.phone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Mô tả triệu chứng & lý do khám (*):</label>
              <textarea
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="VD: Bệnh nhân đau tức ngực trái lan lên cằm 2 ngày nay kèm vã mồ hôi, khó thở khi gắng sức..."
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Tiền sử bệnh & dị ứng:</label>
              <input
                type="text"
                value={medicalHistoryInput}
                onChange={(e) => setMedicalHistoryInput(e.target.value)}
                placeholder="VD: Tăng huyết áp 5 năm, Đái tháo đường, Dị ứng Penicillin..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'AI Đang Phân Tích Y Khoa...' : 'Phân Luồng & Triage Ngay'}</span>
              </button>
            </div>
          </form>

          {/* AI Result Card */}
          {triageResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold">Mức độ khẩn cấp:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    urgency.includes('Khẩn cấp') || urgency.includes('KHẨN CẤP')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      : urgency.includes('Ưu tiên') || urgency.includes('ƯU TIÊN')
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {urgency}
                  </span>
                </div>

                <span className="text-slate-600 font-medium">
                  Chuyên khoa gợi ý: <strong className="text-blue-700 font-bold">{department}</strong>
                </span>
              </div>

              {tests.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Chỉ định cận lâm sàng khuyến nghị (LIS/PACS):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tests.map((test, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                        ✓ {test}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {questions.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Câu hỏi gợi ý khai thác thêm thông tin:</span>
                  <div className="space-y-1">
                    {questions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed shadow-xs">
                <span className="font-bold text-slate-900 block mb-0.5">Khuyến nghị xử trí từ VitCRM AI:</span>
                {advice}
              </div>

              {onOpenBookAppointment && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onOpenBookAppointment(selectedPatientId, department)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Đặt Lịch Khám Ngay Theo Gợi Ý AI</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Hệ thống hỗ trợ ra quyết định lâm sàng (CDSS)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
