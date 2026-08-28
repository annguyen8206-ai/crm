import React, { useState } from 'react';
import {
  Headphones,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  MessageSquare,
  Filter,
  Plus,
  Send,
  User,
  Phone,
  BarChart3,
  ThumbsUp,
  Activity,
  Sparkles,
  PhoneCall,
  PhoneForwarded,
  HeartHandshake,
  Smile,
  Frown,
  Meh,
  X,
  Copy,
  Check,
  Calendar,
  Pill,
  Stethoscope,
  Building2,
  FileText,
  TrendingUp,
  AlertCircle,
  Bot,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { SupportTicket, TicketPriority, TicketStatus, Patient, FollowUpCallTask, CsatFeedbackItem, BranchId, Branch, Appointment, AppointmentStatus } from '../types';
import { mockFollowUpCalls, mockCsatFeedbacks, mockBranches } from '../data/mockData';
import { CARE_SCENARIOS_DATA } from '../data/careScriptsData';
import { formatDateVN, formatDateTimeVN } from '../utils/dateUtils';
import { ChatbotFaqView } from './ChatbotFaqView';
import { AdvancedCrmModules } from './AdvancedCrmModules';
import { AutoRecallManagementView } from './AutoRecallManagementView';
import { ZnsMessageLogViewer } from './ZnsMessageLogViewer';
import { ZnsPostVisitCareModal } from './ZnsPostVisitCareModal';
import { VoipSoftphoneModal } from './VoipSoftphoneModal';
import { CustomerCarePlaybookView } from './CustomerCarePlaybookView';
import { ExportCsvButton } from './ExportCsvButton';

interface CustomerCareSlaViewProps {
  tickets?: SupportTicket[];
  patients?: Patient[];
  branches?: Branch[];
  currentBranchId?: BranchId;
  appointments?: Appointment[];
  recalls?: any[];
  followUps?: any[];
  csatFeedbacks?: any[];
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus, notes?: string) => void;
  onAddNewTicket?: (ticket: Omit<SupportTicket, 'id'>) => void;
  onSelectPatient?: (patientId: string) => void;
  onConfirmAppointmentAndTransfer?: (appointmentId: string) => void;
  onNavigateToAppointments?: () => void;
  onBookAppointmentFromRecall?: (recall: any) => void;
}

export const CustomerCareSlaView: React.FC<CustomerCareSlaViewProps> = ({
  tickets = [],
  patients = [],
  branches = mockBranches,
  currentBranchId = 'ALL',
  appointments = [],
  recalls = [],
  followUps = [],
  csatFeedbacks = [],
  onUpdateTicketStatus,
  onAddNewTicket,
  onSelectPatient,
  onConfirmAppointmentAndTransfer,
  onNavigateToAppointments,
  onBookAppointmentFromRecall
}) => {
  // Main workflow hubs: 'tickets' | 'post_visit' | 'omnichannel' | 'feedback_logs'
  const [mainHub, setMainHub] = useState<'tickets' | 'post_visit' | 'omnichannel' | 'feedback_logs'>('tickets');
  const [activeTab, setActiveTab] = useState<'tickets' | 'care_playbook' | 'pending_appointments' | 'followup' | 'auto_recall' | 'zns_logs' | 'csat_nps' | 'chatbot' | 'advanced_modules'>('tickets');

  // Sync mainHub when activeTab changes
  const handleSelectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'tickets') setMainHub('tickets');
    else if (tab === 'followup' || tab === 'auto_recall' || tab === 'care_playbook') setMainHub('post_visit');
    else if (tab === 'pending_appointments' || tab === 'chatbot' || tab === 'advanced_modules') setMainHub('omnichannel');
    else if (tab === 'csat_nps' || tab === 'zns_logs') setMainHub('feedback_logs');
  };

  const handleSelectHub = (hub: typeof mainHub) => {
    setMainHub(hub);
    if (hub === 'tickets') setActiveTab('tickets');
    else if (hub === 'post_visit') setActiveTab('followup');
    else if (hub === 'omnichannel') setActiveTab('pending_appointments');
    else if (hub === 'feedback_logs') setActiveTab('csat_nps');
  };

  // Tickets filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTicketForResolution, setSelectedTicketForResolution] = useState<SupportTicket | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');

  // Create Ticket Modal State
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isCustomCaller, setIsCustomCaller] = useState(false);
  const [newTicketPatientId, setNewTicketPatientId] = useState(patients[0]?.id || '');
  const [newTicketCustomName, setNewTicketCustomName] = useState('');
  const [newTicketCustomPhone, setNewTicketCustomPhone] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('Khiếu nại thái độ');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('Cao (SLA 2h)');
  const [newTicketDept, setNewTicketDept] = useState('Khoa Khám Bệnh Đa Khoa');
  const [newTicketContent, setNewTicketContent] = useState('');

  // AI Empathy Assistant State
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiTargetTicket, setAiTargetTicket] = useState<SupportTicket | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponseData, setAiResponseData] = useState<{
    empatheticOpening?: string;
    explanation?: string;
    actionTaken?: string;
    proposedResolution?: string;
    fullLetterDraft?: string;
  } | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Follow-up Calls State
  const [followUpList, setFollowUpList] = useState<FollowUpCallTask[]>(mockFollowUpCalls);
  const [activeCallModalTask, setActiveCallModalTask] = useState<FollowUpCallTask | null>(null);
  const [callNotesInput, setCallNotesInput] = useState('');
  const [callProgression, setCallProgression] = useState<FollowUpCallTask['symptomProgression']>('Thuyên giảm rõ rệt');
  const [callAdverseEffects, setCallAdverseEffects] = useState('Không có tác dụng phụ');
  const [callOutcomeStatus, setCallOutcomeStatus] = useState<FollowUpCallTask['callStatus']>('Đã gọi - Ổn định');
  const [callDiagnosisInput, setCallDiagnosisInput] = useState('');
  const [callDoctorCareNotesInput, setCallDoctorCareNotesInput] = useState('');

  // New Post-visit Diagnosis & Care Note Modal State
  const [isNewFollowUpModalOpen, setIsNewFollowUpModalOpen] = useState(false);
  const [isNewFollowUpCustomPatient, setIsNewFollowUpCustomPatient] = useState(false);
  const [newFollowUpPatientId, setNewFollowUpPatientId] = useState(patients[0]?.id || '');
  const [newFollowUpCustomName, setNewFollowUpCustomName] = useState('');
  const [newFollowUpCustomPhone, setNewFollowUpCustomPhone] = useState('');
  const [newFollowUpDiagnosis, setNewFollowUpDiagnosis] = useState('');
  const [newFollowUpDoctorNotes, setNewFollowUpDoctorNotes] = useState('');
  const [newFollowUpDays, setNewFollowUpDays] = useState<number>(3);
  const [newFollowUpStaff, setNewFollowUpStaff] = useState('ĐD. Lê Thị Diệu');

  // CSAT Feedbacks State
  const [csatList, setCsatList] = useState<CsatFeedbackItem[]>(mockCsatFeedbacks);
  const [feedbackFilter, setFeedbackFilter] = useState<'ALL' | 'Tích cực' | 'Trung lập' | 'Tiêu cực'>('ALL');
  const [thankYouToast, setThankYouToast] = useState<string | null>(null);

  // Active ZNS & VoIP Modal state for Follow-up Tasks
  const [znsModalTask, setZnsModalTask] = useState<FollowUpCallTask | null>(null);
  const [voipModalTask, setVoipModalTask] = useState<FollowUpCallTask | null>(null);

  // SLA Stats Calculation
  const totalTickets = (tickets || []).length;
  const resolvedTickets = (tickets || []).filter(t => t?.status === 'Đã giải quyết' || t?.status === 'Đã đóng').length;
  const breachedTickets = (tickets || []).filter(t => t?.isBreached).length;
  const avgFirstResponse = Math.round((tickets || []).reduce((acc, t) => acc + (t?.firstResponseMinutes || 0), 0) / (totalTickets || 1));
  const avgCsat = ((tickets || []).filter(t => t?.csatScore).reduce((acc, t) => acc + (t?.csatScore || 0), 0) / ((tickets || []).filter(t => t?.csatScore).length || 1)).toFixed(2);

  const filteredTickets = (tickets || []).filter(t => {
    if (!t) return false;
    const matchesSearch = (t.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesPri = selectedPriority === 'ALL' || (t.priority || '').includes(selectedPriority);
    const matchesStat = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchesSearch && matchesCat && matchesPri && matchesStat;
  });

  // Handle Resolve
  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForResolution) return;
    if (onUpdateTicketStatus) {
      onUpdateTicketStatus(selectedTicketForResolution.id, 'Đã giải quyết', resolutionInput);
    }
    setSelectedTicketForResolution(null);
    setResolutionInput('');
  };

  // Handle New Ticket Create
  const handleCreateNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === newTicketPatientId);
    const finalPatientName = isCustomCaller ? newTicketCustomName.trim() : (pat?.name || 'Bệnh Nhân');
    const finalPatientPhone = isCustomCaller ? newTicketCustomPhone.trim() : (pat?.phone || '0901234567');
    const finalPatientId = isCustomCaller ? `P-${Date.now()}` : (pat?.id || 'pat-1');

    if (!finalPatientName) {
      alert('Vui lòng nhập tên người phản ánh!');
      return;
    }
    if (!newTicketContent.trim()) {
      alert('Vui lòng nhập nội dung khiếu nại / góp ý!');
      return;
    }
    
    // Calculate SLA deadline
    const now = new Date();
    let minutesToAdd = 120; // Default 2h
    if (newTicketPriority.includes('30p')) minutesToAdd = 30;
    else if (newTicketPriority.includes('2h')) minutesToAdd = 120;
    else if (newTicketPriority.includes('8h')) minutesToAdd = 480;
    else if (newTicketPriority.includes('24h')) minutesToAdd = 1440;

    const deadline = new Date(now.getTime() + minutesToAdd * 60000);
    const deadlineStr = deadline.toISOString().replace('T', ' ').substring(0, 16);

    if (onAddNewTicket) {
      onAddNewTicket({
        code: `TK-SLA-2026-${Math.floor(100 + Math.random() * 900)}`,
        patientId: finalPatientId,
        patientName: finalPatientName,
        patientPhone: finalPatientPhone,
        category: newTicketCategory,
        priority: newTicketPriority,
        assignedDepartment: newTicketDept,
        assignedStaff: 'Phòng CSKH & Trải nghiệm',
        status: 'Mới tiếp nhận',
        createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
        slaDeadline: deadlineStr,
        isBreached: false,
        firstResponseMinutes: 5,
        content: newTicketContent.trim()
      });
    }

    setIsNewTicketModalOpen(false);
    setNewTicketContent('');
    setNewTicketCustomName('');
    setNewTicketCustomPhone('');
  };

  // Run AI Empathy Response
  const handleGenerateAiResponse = async (ticket: SupportTicket) => {
    setAiTargetTicket(ticket);
    setAiAssistantOpen(true);
    setIsAiLoading(true);
    setAiResponseData(null);

    try {
      const res = await fetch('/api/ai/generate-care-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintText: ticket.content,
          category: ticket.category,
          patientName: ticket.patientName,
          department: ticket.assignedDepartment,
          priority: ticket.priority
        })
      });
      const data = await res.json();
      setAiResponseData(data);
    } catch (err) {
      console.error('AI Care Response Error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiToResolution = () => {
    if (!aiResponseData || !aiTargetTicket) return;
    const notes = `${aiResponseData.fullLetterDraft || ''}\n\n[Biện pháp xử lý nội bộ: ${aiResponseData.actionTaken || ''}]`;
    setSelectedTicketForResolution(aiTargetTicket);
    setResolutionInput(notes);
    setAiAssistantOpen(false);
  };

  // Complete Follow-up Call & Update Diagnosis/Care Notes
  const handleSaveFollowUpCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallModalTask) return;

    setFollowUpList(prev => prev.map(item => {
      if (item.id === activeCallModalTask.id) {
        return {
          ...item,
          primaryDiagnosis: callDiagnosisInput.trim() || item.primaryDiagnosis,
          doctorCareNotes: callDoctorCareNotesInput.trim() || item.doctorCareNotes,
          callStatus: callOutcomeStatus,
          symptomProgression: callProgression,
          adverseEffectsReported: callAdverseEffects,
          callNotes: callNotesInput
        };
      }
      return item;
    }));

    setActiveCallModalTask(null);
  };

  // Handle Create New Post-Visit Follow-Up Task
  const handleCreateNewFollowUpTask = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === newFollowUpPatientId);
    const finalPatientName = isNewFollowUpCustomPatient ? newFollowUpCustomName.trim() : (pat?.name || 'Bệnh Nhân');
    const finalPatientPhone = isNewFollowUpCustomPatient ? newFollowUpCustomPhone.trim() : (pat?.phone || '0901234567');
    const finalPatientId = isNewFollowUpCustomPatient ? `P-${Date.now()}` : (pat?.id || 'pat-1');

    if (!finalPatientName) {
      alert('Vui lòng nhập tên bệnh nhân!');
      return;
    }
    if (!newFollowUpDiagnosis.trim()) {
      alert('Vui lòng nhập chẩn đoán bệnh sau khám!');
      return;
    }

    const newTask: FollowUpCallTask = {
      id: `fup-${Date.now()}`,
      patientId: finalPatientId,
      patientName: finalPatientName,
      patientPhone: finalPatientPhone,
      visitDate: new Date().toISOString().slice(0, 10),
      daysAfterVisit: newFollowUpDays,
      primaryDiagnosis: newFollowUpDiagnosis.trim(),
      doctorCareNotes: newFollowUpDoctorNotes.trim() || 'BS dặn: Bệnh nhân theo dõi triệu chứng tại nhà, kiêng khem theo phác đồ và liên hệ CSKH khi cần hỗ trợ.',
      prescribedMedicines: [],
      callStatus: 'Chờ gọi',
      adverseEffectsReported: 'Chưa có',
      symptomProgression: 'Thuyên giảm rõ rệt',
      assignedStaff: newFollowUpStaff || 'ĐD. Lê Thị Diệu',
      scheduledTime: `D+${newFollowUpDays} sau khám`
    };

    setFollowUpList(prev => [newTask, ...prev]);
    setIsNewFollowUpModalOpen(false);
    setNewFollowUpDiagnosis('');
    setNewFollowUpDoctorNotes('');
    setNewFollowUpCustomName('');
    setNewFollowUpCustomPhone('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Chăm Sóc Khách Hàng & Quản Trị SLA
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Chuẩn JCI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thời gian phản hồi đầu tiên (FCR), gọi thăm khám hậu phẫu D+3 và đo lường sự hài lòng CSAT/NPS
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'tickets' && (
            <button
              onClick={() => setIsNewTicketModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Phiếu Khiếu Nại</span>
            </button>
          )}
        </div>
      </div>

      {/* Workflow Hubs Selector: Clean, Logical, No Clutter */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSelectHub('tickets')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              mainHub === 'tickets'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Phiếu CSKH & SLA</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              mainHub === 'tickets' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => handleSelectHub('post_visit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              mainHub === 'post_visit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Chăm Sóc & Tái Khám</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              mainHub === 'post_visit' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {followUpList.filter(f => f.callStatus === 'Chờ gọi').length} chờ
            </span>
          </button>

          <button
            onClick={() => handleSelectHub('omnichannel')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              mainHub === 'omnichannel'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Tiếp Nhận Đa Kênh & VoIP</span>
            {appointments.filter(a => a.status === 'Chờ xác nhận').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => handleSelectHub('feedback_logs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              mainHub === 'feedback_logs'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Đánh Giá CSAT & Nhật Ký ZNS</span>
          </button>
        </div>

        {/* Secondary Sub-Pills for Contextual Navigation */}
        {mainHub === 'post_visit' && (
          <div className="flex items-center gap-1.5 pl-1 py-1 overflow-x-auto text-xs animate-in fade-in">
            <button
              onClick={() => handleSelectTab('followup')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'followup'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📞 Gọi Sau Khám D+3 ({followUpList.filter(f => f.callStatus === 'Chờ gọi').length})
            </button>
            <button
              onClick={() => handleSelectTab('auto_recall')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'auto_recall'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🔄 Nhắc Tái Khám Định Kỳ (Auto-Recall)
            </button>
            <button
              onClick={() => handleSelectTab('care_playbook')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'care_playbook'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📖 Kịch Bản Chăm Sóc Mẫu ({CARE_SCENARIOS_DATA.length})
            </button>
          </div>
        )}

        {mainHub === 'omnichannel' && (
          <div className="flex items-center gap-1.5 pl-1 py-1 overflow-x-auto text-xs animate-in fade-in">
            <button
              onClick={() => handleSelectTab('pending_appointments')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'pending_appointments'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📅 Xác Nhận Lịch Hẹn Đặt Trực Tuyến ({appointments.filter(a => a.status === 'Chờ xác nhận').length})
            </button>
            <button
              onClick={() => handleSelectTab('chatbot')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'chatbot'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              💬 Hộp Thư & Live Chat Zalo/FB
            </button>
            <button
              onClick={() => handleSelectTab('advanced_modules')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'advanced_modules'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📞 Tổng Đài Ảo VoIP Cloud
            </button>
          </div>
        )}

        {mainHub === 'feedback_logs' && (
          <div className="flex items-center gap-1.5 pl-1 py-1 overflow-x-auto text-xs animate-in fade-in">
            <button
              onClick={() => handleSelectTab('csat_nps')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'csat_nps'
                  ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⭐ Khảo Sát Sự Hài Lòng CSAT / NPS
            </button>
            <button
              onClick={() => handleSelectTab('zns_logs')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                activeTab === 'zns_logs'
                  ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📨 Nhật Ký Gửi Tin Zalo ZNS
            </button>
          </div>
        )}
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Tỷ Lệ Tuân Thủ SLA</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            {(((totalTickets - breachedTickets) / (totalTickets || 1)) * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {breachedTickets === 0 ? 'Không có ticket quá hạn' : `${breachedTickets} ticket vi phạm`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Thời Gian Phản Hồi Đầu (FCR)</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {avgFirstResponse} <span className="text-xs font-normal text-slate-500">phút</span>
          </div>
          <span className="text-emerald-700 text-[11px] font-bold mt-1 block">
            Nhanh hơn 35% so với cam kết
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Điểm Hài Lòng Bệnh Nhân (CSAT)</span>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
            {avgCsat} <span className="text-xs font-normal text-slate-500">/ 5.0 ⭐</span>
          </div>
          <span className="text-slate-500 text-[11px] mt-1 block">Khảo sát tự động ZNS sau ca khám</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Tiến Độ Giải Quyết Khiếu Nại</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {resolvedTickets} / {totalTickets}
          </div>
          <span className="text-blue-700 text-[11px] font-bold mt-1 block">
            {Math.round((resolvedTickets / (totalTickets || 1)) * 100)}% Hoàn tất
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: CUSTOMER CARE SCENARIOS & CLINICAL PLAYBOOK */}
      {/* ========================================================================= */}
      {activeTab === 'care_playbook' && (
        <CustomerCarePlaybookView
          patients={patients}
          onOpenVoipCall={(phone, name) => {
            setVoipModalTask({
              id: `voip-${Date.now()}`,
              patientId: 'custom-caller',
              patientName: name,
              patientPhone: phone,
              visitDate: new Date().toISOString().slice(0, 10),
              daysAfterVisit: 1,
              primaryDiagnosis: 'Tư vấn y tế theo kịch bản chuẩn',
              doctorCareNotes: 'Chăm sóc & hướng dẫn theo quy chuẩn y khoa',
              prescribedMedicines: [],
              callStatus: 'Chờ gọi',
              adverseEffectsReported: 'Chưa có',
              symptomProgression: 'Ổn định',
              assignedStaff: 'CSKH VitHospital',
              scheduledTime: 'Ngay bây giờ'
            });
          }}
          onOpenZnsModal={(name, phone, scenarioTitle) => {
            setZnsModalTask({
              id: `zns-${Date.now()}`,
              patientId: 'custom-patient',
              patientName: name,
              patientPhone: phone,
              visitDate: new Date().toISOString().slice(0, 10),
              daysAfterVisit: 1,
              primaryDiagnosis: scenarioTitle,
              doctorCareNotes: 'Gửi tin nhắn hướng dẫn và dặn dò y khoa theo kịch bản chuẩn.',
              prescribedMedicines: [],
              callStatus: 'Chờ gọi',
              adverseEffectsReported: 'Chưa có',
              symptomProgression: 'Ổn định',
              assignedStaff: 'CSKH VitHospital',
              scheduledTime: 'Ngay bây giờ'
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SUPPORT TICKETS & SLA MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo Tên bệnh nhân, Mã Ticket, Nội dung..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả Phân loại Khiếu nại / Góp ý</option>
                <option value="Khiếu nại thái độ">Khiếu nại thái độ</option>
                <option value="Thắc mắc viện phí & bảo lãnh">Thắc mắc viện phí & bảo lãnh</option>
                <option value="Tư vấn kết quả chuyên môn">Tư vấn kết quả chuyên môn</option>
                <option value="Thời gian chờ đợi">Thời gian chờ đợi</option>
                <option value="Hỗ trợ thủ tục BHYT">Hỗ trợ thủ tục BHYT</option>
                <option value="Góp ý dịch vụ">Góp ý dịch vụ</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả Mức độ Khẩn cấp</option>
                <option value="Khẩn cấp">Khẩn cấp (SLA 30p)</option>
                <option value="Cao">Cao (SLA 2h)</option>
                <option value="Trung bình">Trung bình (SLA 8h)</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả Trạng thái Xử lý</option>
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Đã giải quyết">Đã giải quyết</option>
                <option value="Đã đóng">Đã đóng</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Hiển thị {filteredTickets.length} phiếu khiếu nại & SLA</span>
              <ExportCsvButton
                type="tickets"
                data={filteredTickets}
                filename={`VitHospital_SLA_Tickets_${new Date().toISOString().slice(0, 10)}.csv`}
                label="Xuất Excel Danh Sách SLA"
              />
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{ticket.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ticket.priority.includes('Khẩn cấp') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      ticket.priority.includes('Cao') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">| {ticket.category}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Hạn chót SLA: <strong className="text-slate-900">{formatDateTimeVN(ticket.slaDeadline)}</strong></span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      ticket.status === 'Đã giải quyết' || ticket.status === 'Đã đóng'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                {/* Ticket body */}
                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span
                        onClick={() => onSelectPatient && onSelectPatient(ticket.patientId)}
                        className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {ticket.patientName} ({ticket.patientPhone})
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">Tiếp nhận: {formatDateTimeVN(ticket.createdAt)}</span>
                  </div>

                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-sans">
                    "{ticket.content}"
                  </p>

                  {ticket.resolutionNotes && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900 text-xs">
                      <span className="font-bold block mb-0.5 text-emerald-800">Kết quả xử lý & Phản hồi bệnh nhân:</span>
                      <p className="whitespace-pre-line">{ticket.resolutionNotes}</p>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 gap-2">
                  <div>
                    Phòng ban: <strong className="text-slate-900">{ticket.assignedDepartment}</strong> | Phụ trách: <strong className="text-slate-900">{ticket.assignedStaff}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {ticket.csatScore && (
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        CSAT: {ticket.csatScore}/5 sao
                      </span>
                    )}

                    {/* AI Empathy Button */}
                    <button
                      onClick={() => handleGenerateAiResponse(ticket)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      title="Sử dụng Gemini AI để soạn phản hồi thấu cảm và đề xuất giải pháp"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>AI Soạn Thư Xoa Dịu</span>
                    </button>

                    {ticket.status !== 'Đã giải quyết' && ticket.status !== 'Đã đóng' && (
                      <button
                        onClick={() => {
                          setSelectedTicketForResolution(ticket);
                          setResolutionInput(ticket.resolutionNotes || '');
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        Xử lý & Đóng Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1.5: PENDING SELF-BOOKED APPOINTMENTS FROM PATIENT PORTAL */}
      {/* ========================================================================= */}
      {activeTab === 'pending_appointments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-amber-600" />
                  Hàng Đợi Gọi Lại & Xác Nhận Lịch Đặt Tự Động Từ Cổng Bệnh Nhân
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bệnh nhân tự đặt lịch hẹn qua Cổng Bệnh Nhân (Patient Portal). CSKH gọi xác nhận nhu cầu, tư vấn dịch vụ và bấm <strong>"Xác Nhận & Chuyển Vào Lịch Đa Kênh"</strong> để đồng bộ tức thì.
                </p>
              </div>

              {onNavigateToAppointments && (
                <button
                  onClick={onNavigateToAppointments}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Xem Lịch Khám Đa Kênh Toàn Diện
                </button>
              )}
            </div>

            {/* List of pending appointments */}
            {appointments.filter(a => a.status === 'Chờ xác nhận').length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">Tất cả lịch đặt trực tuyến đã được xác nhận!</p>
                <p className="text-slate-400 mt-1">Khi có bệnh nhân tự đặt lịch trên Cổng Bệnh Nhân, ca hẹn mới sẽ tự động đổ vào hàng đợi này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {appointments.filter(a => a.status === 'Chờ xác nhận').map(apt => (
                  <div key={apt.id} className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4.5 space-y-3 text-xs relative shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px]">
                          Cổng BN / Tự Đặt
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">{apt.code}</span>
                      </div>
                      <span className="text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Chờ CSKH gọi
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div 
                          onClick={() => onSelectPatient && onSelectPatient(apt.patientId)}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                        >
                          {apt.patientName} ({apt.gender}, {apt.age} tuổi)
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-700 font-mono font-bold mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{apt.patientPhone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[11px] block">Khung giờ hẹn:</span>
                        <span className="font-bold text-slate-900 text-xs">{formatDateVN(apt.appointmentDate)} • {apt.timeSlot}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Bác sĩ & Chuyên khoa:</span>
                      <span>{apt.doctorName} - {apt.department}</span>
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        Ghi chú / Triệu chứng: "{apt.notes}"
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/50">
                      <a
                        href={`tel:${apt.patientPhone}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gọi Bệnh Nhân</span>
                      </a>

                      <button
                        onClick={() => onConfirmAppointmentAndTransfer && onConfirmAppointmentAndTransfer(apt.id)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác Nhận & Chuyển Vào Lịch Đa Kênh</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: POST-VISIT FOLLOW-UP CALL PLAN (D+1, D+3, D+7) */}
      {/* ========================================================================= */}
      {activeTab === 'followup' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-blue-600" />
                  Kế Hoạch Gọi Điện Chăm Sóc Sau Khám & Hậu Phẫu (D+3 Follow-up)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sau mỗi lượt khám, hệ thống lưu lại <strong>Chẩn đoán bệnh & Ghi chú dặn dò sau khám</strong> của Bác sĩ để chuyên viên CSKH liên hệ hỏi thăm, nắm bắt tiến triển và hỗ trợ bệnh nhân chu đáo nhất.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <ExportCsvButton
                  type="follow_ups"
                  data={followUpList}
                  filename={`VitHospital_Goi_Cham_Soc_D3_${new Date().toISOString().slice(0, 10)}.csv`}
                  label="Xuất Excel Follow-up"
                />

                <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full">
                  Hôm nay: {followUpList.filter(f => f.callStatus === 'Chờ gọi').length} ca cần gọi
                </span>

                <button
                  onClick={() => {
                    setIsNewFollowUpModalOpen(true);
                    setNewFollowUpPatientId(patients[0]?.id || '');
                    setNewFollowUpDiagnosis('');
                    setNewFollowUpDoctorNotes('');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Note Chẩn Đoán Sau Khám (Tạo Ca CSKH)</span>
                </button>
              </div>
            </div>

            {/* Follow-up tasks table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Bệnh Nhân & Số Điện Thoại</th>
                    <th className="py-3 px-4 min-w-[220px]">Lần Khám & Chẩn Đoán</th>
                    <th className="py-3 px-4 min-w-[280px]">Ghi Chú Dặn Dò Sau Khám (Hỗ Trợ CSKH)</th>
                    <th className="py-3 px-4">Tiến Triển Triệu Chứng</th>
                    <th className="py-3 px-4">Trạng Thái Gọi</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {followUpList.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <span
                          onClick={() => onSelectPatient && onSelectPatient(task.patientId)}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer block text-sm"
                        >
                          {task.patientName}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px] block">{task.patientPhone}</span>
                        <span className="text-slate-400 text-[10px]">Phụ trách: {task.assignedStaff}</span>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                            D+{task.daysAfterVisit} ngày
                          </span>
                          <span className="text-slate-500 text-[11px]">Khám: {formatDateVN(task.visitDate)}</span>
                        </div>
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block mb-0.5">Chẩn đoán y khoa:</span>
                          <span className="font-semibold text-slate-900 block text-xs leading-snug">{task.primaryDiagnosis}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-900">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lưu ý bác sĩ dặn dò CSKH:</span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed font-sans">
                            {task.doctorCareNotes || 'BS dặn: Bệnh nhân theo dõi triệu chứng tại nhà, kiêng khem theo phác đồ và hẹn tái khám đúng lịch.'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-block ${
                          task.symptomProgression === 'Thuyên giảm rõ rệt' || task.symptomProgression === 'Đã khỏi hoàn toàn'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : task.symptomProgression === 'Không đổi'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {task.symptomProgression || 'Chưa cập nhật'}
                        </span>
                        {task.adverseEffectsReported && task.adverseEffectsReported !== 'Không có tác dụng phụ' && task.adverseEffectsReported !== 'Chưa có' && (
                          <span className="text-rose-600 text-[10px] block mt-1 font-semibold">
                            ⚠️ {task.adverseEffectsReported}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          task.callStatus === 'Đã gọi - Ổn định'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.callStatus === 'Chờ gọi'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : task.callStatus === 'Cần bác sĩ tư vấn lại'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {task.callStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* VoIP Click to Call */}
                          <button
                            onClick={() => setVoipModalTask(task)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer transition-colors"
                            title="Bấm để gọi trực tiếp qua tổng đài VoIP WebRTC"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Gọi VoIP</span>
                          </button>

                          {/* Send ZNS Care Message */}
                          <button
                            onClick={() => setZnsModalTask(task)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                            title="Gửi tin Zalo ZNS dặn dò sau khám chính thức"
                          >
                            <Send className="w-3 h-3 text-blue-600" />
                            <span>Gửi ZNS Dặn Dò</span>
                          </button>

                          {/* Clinical Note Update */}
                          <button
                            onClick={() => {
                              setActiveCallModalTask(task);
                              setCallDiagnosisInput(task.primaryDiagnosis || '');
                              setCallDoctorCareNotesInput(task.doctorCareNotes || '');
                              setCallNotesInput(task.callNotes || '');
                              setCallProgression(task.symptomProgression || 'Thuyên giảm rõ rệt');
                              setCallAdverseEffects(task.adverseEffectsReported || 'Không có tác dụng phụ');
                              setCallOutcomeStatus(task.callStatus === 'Chờ gọi' ? 'Đã gọi - Ổn định' : task.callStatus);
                            }}
                            className="text-[10px] text-slate-500 hover:text-blue-600 font-semibold cursor-pointer underline"
                          >
                            {task.callStatus === 'Chờ gọi' ? 'Ghi chú cuộc gọi' : 'Cập nhật ghi chú'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CSAT & NPS PATIENT SATISFACTION ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'csat_nps' && (
        <div className="space-y-6">
          {/* Top NPS & CSAT Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">Chỉ Số NPS Y Tế (Net Promoter Score)</span>
                <div className="text-4xl font-bold mt-2 font-mono">+78.5</div>
                <p className="text-xs text-blue-100 mt-1">Xếp hạng: <strong>Vùng Dịch Vụ Tuyệt Hảo</strong> (Top 5% Chuỗi BV Quốc Tế)</p>
              </div>
              <div className="pt-4 border-t border-blue-500/40 text-[11px] flex justify-between">
                <span>Promoters: <strong>88%</strong></span>
                <span>Passives: <strong>8%</strong></span>
                <span>Detractors: <strong>4%</strong></span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs md:col-span-2 space-y-3">
              <span className="text-slate-700 text-xs font-bold block">Đánh Giá 5 Điểm Chạm Trải Nghiệm Bệnh Nhân (Touchpoints)</span>
              
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>🩺 Chuyên môn & Thái độ Bác sĩ (Doctor Care)</span>
                    <strong className="text-blue-700 font-mono">4.9 / 5.0 (98% Hài lòng)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>👩‍⚕️ Sự Ân Cần Của Điều Dưỡng & Tiếp Đón (Nurse Attitude)</span>
                    <strong className="text-emerald-700 font-mono">4.8 / 5.0 (96% Hài lòng)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>✨ Cơ Sở Vật Chất & Vệ Sinh Vô Trùng (Cleanliness)</span>
                    <strong className="text-purple-700 font-mono">4.9 / 5.0 (98% Hài lòng)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>💳 Minh Bạch Viện Phí & Bảo Lãnh (Billing Transparency)</span>
                    <strong className="text-amber-700 font-mono">4.7 / 5.0 (94% Hài lòng)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>⏳ Thời Gian Chờ Đợi Khám (Waiting Time)</span>
                    <strong className="text-indigo-700 font-mono">4.2 / 5.0 (84% Hài lòng)</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Nhật Ký Đánh Giá Trực Tuyến Từ Zalo ZNS / App Bệnh Nhân</h3>
                <p className="text-xs text-slate-500">Tự động gắn cờ các đánh giá dưới 4 sao để Trưởng phòng CSKH liên hệ xử lý ngay</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <ExportCsvButton
                  type="csat_feedbacks"
                  data={csatList}
                  filename={`VitHospital_CSAT_NPS_${new Date().toISOString().slice(0, 10)}.csv`}
                  label="Xuất Excel Đánh Giá CSAT"
                />

                <button
                  onClick={() => setFeedbackFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    feedbackFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({csatList.length})
                </button>
                <button
                  onClick={() => setFeedbackFilter('Tích cực')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    feedbackFilter === 'Tích cực' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tích cực
                </button>
                <button
                  onClick={() => setFeedbackFilter('Trung lập')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    feedbackFilter === 'Trung lập' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cần cải thiện
                </button>
              </div>
            </div>

            {thankYouToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{thankYouToast}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {csatList
                .filter(item => feedbackFilter === 'ALL' || item.sentiment === feedbackFilter)
                .map(item => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{item.patientName}</span>
                        <span className="text-slate-500 text-[11px]">{item.department} | {item.doctorName}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">NPS: {item.npsScore}/10 điểm</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                      "{item.comment}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        item.sentiment === 'Tích cực' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.sentiment}
                      </span>

                      <button
                        onClick={() => {
                          setThankYouToast(`Đã gửi tin nhắn cảm ơn và voucher tri ân đến Zalo của bệnh nhân ${item.patientName}!`);
                          setTimeout(() => setThankYouToast(null), 4000);
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold cursor-pointer"
                      >
                        Gửi Tin Nhắn Phản Hồi & Tri Ân
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTO RECALL CLINICAL MANAGEMENT */}
      {activeTab === 'auto_recall' && (
        <AutoRecallManagementView
          patients={patients}
          recalls={recalls}
          onSelectPatient={onSelectPatient}
          onBookAppointmentFromRecall={onBookAppointmentFromRecall}
        />
      )}

      {/* TAB 5: ZNS DẶN DÒ & MESSAGE LOGS */}
      {activeTab === 'zns_logs' && (
        <ZnsMessageLogViewer />
      )}

      {/* TAB 6: OMNICHANNEL FAQ CHATBOT & ESCALATION */}
      {activeTab === 'chatbot' && (
        <ChatbotFaqView
          patients={patients}
          onAddNewTicket={onAddNewTicket}
          onSelectPatient={onSelectPatient}
          onNavigateToCare={() => setActiveTab('tickets')}
        />
      )}

      {/* TAB 7: ADVANCED CRM MODULES (VOIP, CARE PATHWAYS, OMNICHANNEL ROUTING) */}
      {activeTab === 'advanced_modules' && (
        <AdvancedCrmModules
          patients={patients}
          branches={branches}
          currentBranchId={currentBranchId}
          onSelectPatient={onSelectPatient}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW TICKET */}
      {/* ========================================================================= */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Tạo Phiếu Khiếu Nại / Góp Ý Mới (SLA Ticket)</h3>
              </div>
              <button
                onClick={() => setIsNewTicketModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTicket} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs">Thông Tin Người Phản Ánh / Khiếu Nại</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCustomCaller(false)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${!isCustomCaller ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Bệnh nhân có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomCaller(true)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${isCustomCaller ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      + Khách gọi mới
                    </button>
                  </div>
                </div>

                {!isCustomCaller ? (
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Chọn từ danh bạ bệnh nhân:</label>
                    <select
                      value={newTicketPatientId}
                      onChange={(e) => setNewTicketPatientId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - SĐT: {p.phone} ({p.membership?.tier || 'Hội viên'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Họ tên người gọi *</label>
                      <input
                        type="text"
                        required
                        value={newTicketCustomName}
                        onChange={(e) => setNewTicketCustomName(e.target.value)}
                        placeholder="VD: Anh Phạm Quốc Bảo"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Số điện thoại *</label>
                      <input
                        type="tel"
                        required
                        value={newTicketCustomPhone}
                        onChange={(e) => setNewTicketCustomPhone(e.target.value)}
                        placeholder="VD: 0912 334 455"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân Loại Yêu Cầu</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                  >
                    <option value="Khiếu nại thái độ">Khiếu nại thái độ</option>
                    <option value="Thắc mắc viện phí & bảo lãnh">Thắc mắc viện phí & bảo lãnh</option>
                    <option value="Tư vấn kết quả chuyên môn">Tư vấn kết quả chuyên môn</option>
                    <option value="Thời gian chờ đợi">Thời gian chờ đợi</option>
                    <option value="Hỗ trợ thủ tục BHYT">Hỗ trợ thủ tục BHYT</option>
                    <option value="Góp ý dịch vụ">Góp ý dịch vụ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức Độ Ưu Tiên & Cam Kết SLA</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="Khẩn cấp (SLA 30p)">Khẩn cấp (SLA 30p)</option>
                    <option value="Cao (SLA 2h)">Cao (SLA 2h)</option>
                    <option value="Trung bình (SLA 8h)">Trung bình (SLA 8h)</option>
                    <option value="Tiêu chuẩn (SLA 24h)">Tiêu chuẩn (SLA 24h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phòng Ban / Đơn Vị Liên Quan</label>
                <input
                  type="text"
                  required
                  value={newTicketDept}
                  onChange={(e) => setNewTicketDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  placeholder="VD: Khoa Khám Bệnh Đa Khoa / Phòng Thu Ngân"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chi Tiết Phản Ánh / Khiếu Nại Của Khách Hàng</label>
                <textarea
                  required
                  rows={4}
                  value={newTicketContent}
                  onChange={(e) => setNewTicketContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white placeholder-slate-400"
                  placeholder="Ghi nhận đầy đủ bối cảnh sự việc, thời gian xảy ra, các nhân sự liên quan và nguyện vọng của bệnh nhân..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu & Kích Hoạt Giám Sát SLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AI EMPATHY RESPONSE ASSISTANT */}
      {/* ========================================================================= */}
      {aiAssistantOpen && aiTargetTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Trợ Lý AI Soạn Thư Xoa Dịu & Giải Quyết Khiếu Nại (Gemini 2.5)
                </h3>
              </div>
              <button
                onClick={() => setAiAssistantOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Bệnh nhân: <strong className="text-slate-900">{aiTargetTicket.patientName}</strong></span>
                <span className="font-mono text-purple-700 font-bold">{aiTargetTicket.code}</span>
              </div>
              <p className="text-slate-600 italic">"{aiTargetTicket.content}"</p>
            </div>

            {isAiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-purple-700 font-bold animate-pulse">
                  Gemini AI đang phân tích mức độ cảm xúc và soạn thảo phản hồi chuẩn y đức...
                </p>
              </div>
            ) : aiResponseData ? (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-purple-600" />
                      Lời Mở Đầu Thấu Cảm
                    </span>
                    <p className="text-slate-700 leading-relaxed">{aiResponseData.empatheticOpening}</p>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      Giải Trình & Rà Soát Y Khoa
                    </span>
                    <p className="text-slate-700 leading-relaxed">{aiResponseData.explanation}</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Biện Pháp Khắc Phục & Quyền Lợi Bồi Hoàn Đề Xuất
                  </span>
                  <p className="text-slate-800 leading-relaxed">{aiResponseData.proposedResolution}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">Bản Thảo Thư Phản Hồi Hoàn Chỉnh (Gửi Zalo/Email)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResponseData.fullLetterDraft || '');
                        setCopiedDraft(true);
                        setTimeout(() => setCopiedDraft(false), 2500);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-purple-700 hover:bg-purple-50 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDraft ? 'Đã copy!' : 'Sao chép thư'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    readOnly
                    value={aiResponseData.fullLetterDraft || ''}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-sans text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setAiAssistantOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleApplyAiToResolution}
                    className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Áp Dụng Vào Kết Quả Xử Lý SLA</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: POST-VISIT FOLLOW-UP CALL SIMULATOR & SCRIPT */}
      {/* ========================================================================= */}
      {activeCallModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Cuộc Gọi Chăm Sóc Hậu Khám D+{activeCallModalTask.daysAfterVisit} ({activeCallModalTask.patientName})
                </h3>
              </div>
              <button
                onClick={() => setActiveCallModalTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient overview banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-sm block">{activeCallModalTask.patientName}</span>
                <span className="text-blue-800 font-mono font-bold block">📞 {activeCallModalTask.patientPhone}</span>
                <div className="text-slate-700 mt-1">
                  Chẩn đoán: <strong className="text-purple-800">{activeCallModalTask.primaryDiagnosis}</strong>
                </div>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-blue-200/80 shadow-xs space-y-1 sm:max-w-xs">
                <span className="text-blue-900 font-bold block text-[11px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  GHI CHÚ DẶN DÒ SAU KHÁM (CSKH):
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-sans">
                  {activeCallModalTask.doctorCareNotes || 'BS dặn: Bệnh nhân theo dõi triệu chứng tại nhà, kiêng khem theo phác đồ và hẹn tái khám đúng lịch.'}
                </p>
              </div>
            </div>

            {/* Clinical Call Script helper */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" />
                Kịch Bản Hỏi Thoại Y Khoa Chuẩn Cho CSKH (Clinical Call Script):
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li><strong>1. Chào hỏi & Xác nhận thông tin:</strong> "Chào anh/chị {activeCallModalTask.patientName}, em là nhân viên CSKH từ VitCRM gọi điện hỏi thăm sức khỏe sau lần khám vừa qua..."</li>
                <li><strong>2. Kiểm tra tiến triển chẩn đoán:</strong> "Dựa trên chẩn đoán <strong>{activeCallModalTask.primaryDiagnosis}</strong>, anh/chị cảm thấy các triệu chứng đau / mệt mỏi đã thuyên giảm nhiều chưa ạ?"</li>
                <li><strong>3. Nhắc nhở dặn dò của Bác sĩ:</strong> Nhắc nhở bệnh nhân theo đúng lưu ý: <em>"{activeCallModalTask.doctorCareNotes || 'Giữ gìn chế độ ăn uống, sinh hoạt lành mạnh và nghỉ ngơi hợp lý'}"</em>.</li>
                <li><strong>4. Lắng nghe phản hồi & Đặt lịch tái khám:</strong> Giải đáp thắc mắc thêm và nhắc lịch tái khám nếu có.</li>
              </ul>
            </div>

            {/* Call Outcome Form */}
            <form onSubmit={handleSaveFollowUpCall} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cập Nhật Chẩn Đoán Bệnh Sau Khám</label>
                  <input
                    type="text"
                    required
                    value={callDiagnosisInput}
                    onChange={(e) => setCallDiagnosisInput(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Viêm dạ dày HP (+)"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi Chú Dặn Dò Của Bác Sĩ (Lưu Ý CSKH)</label>
                  <input
                    type="text"
                    value={callDoctorCareNotesInput}
                    onChange={(e) => setCallDoctorCareNotesInput(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Kiêng đồ cay nóng, theo dõi đau thượng vị..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiến Triển Triệu Chứng</label>
                  <select
                    value={callProgression}
                    onChange={(e) => setCallProgression(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                  >
                    <option value="Thuyên giảm rõ rệt">Thuyên giảm rõ rệt</option>
                    <option value="Đã khỏi hoàn toàn">Đã khỏi hoàn toàn</option>
                    <option value="Không đổi">Không đổi</option>
                    <option value="Nặng hơn">Nặng hơn (Cảnh báo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phản Ứng Phụ / Lưu Ý Khác</label>
                  <input
                    type="text"
                    required
                    value={callAdverseEffects}
                    onChange={(e) => setCallAdverseEffects(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                    placeholder="VD: Không có / Hơi mệt nhẹ"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kết Quả Cuộc Gọi</label>
                  <select
                    value={callOutcomeStatus}
                    onChange={(e) => setCallOutcomeStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                  >
                    <option value="Đã gọi - Ổn định">Đã gọi - Ổn định</option>
                    <option value="Cần bác sĩ tư vấn lại">Cần bác sĩ tư vấn lại</option>
                    <option value="Không nghe máy">Không nghe máy (Gọi lại sau)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Cuộc Gọi & Dặn Dò Của CSKH</label>
                <textarea
                  rows={3}
                  required
                  value={callNotesInput}
                  onChange={(e) => setCallNotesInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white placeholder-slate-400 font-sans"
                  placeholder="Ghi lại chi tiết phản hồi của bệnh nhân, chỉ số đo tại nhà hoặc hướng dẫn điều dưỡng đã dặn dò..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCallModalTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu Kết Quả Chăm Sóc Hậu Khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESOLUTION MODAL */}
      {/* ========================================================================= */}
      {selectedTicketForResolution && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-900">
            <h3 className="text-base font-bold text-slate-900">
              Xử Lý Khiếu Nại & Cập Nhật Kết Quả SLA ({selectedTicketForResolution.code})
            </h3>
            <p className="text-xs text-slate-600">
              Bệnh nhân: <strong className="text-slate-900">{selectedTicketForResolution.patientName}</strong> ({selectedTicketForResolution.patientPhone})
            </p>
            
            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <textarea
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="Nhập chi tiết biện pháp xử lý liên phòng ban, kết quả trao đổi và giải pháp đền bù/hỗ trợ..."
                rows={5}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-sans"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForResolution(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Hoàn Tất Giải Quyết Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: LOG NEW POST-VISIT DIAGNOSIS & CSKH FOLLOW-UP NOTE */}
      {/* ========================================================================= */}
      {isNewFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Ghi Chú Chẩn Đoán Sau Khám & Lập Ca CSKH
                </h3>
              </div>
              <button
                onClick={() => setIsNewFollowUpModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ghi lại chẩn đoán bệnh và dặn dò sau buổi khám của Bác sĩ. Thông tin này sẽ hiển thị trực tiếp cho đội ngũ CSKH khi gọi điện hỏi thăm bệnh nhân.
            </p>

            <form onSubmit={handleCreateNewFollowUpTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn Bệnh Nhân</label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="followup_patient_type"
                      checked={!isNewFollowUpCustomPatient}
                      onChange={() => setIsNewFollowUpCustomPatient(false)}
                      className="text-blue-600"
                    />
                    <span>Chọn từ danh sách hồ sơ có sẵn</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="followup_patient_type"
                      checked={isNewFollowUpCustomPatient}
                      onChange={() => setIsNewFollowUpCustomPatient(true)}
                      className="text-blue-600"
                    />
                    <span>Nhập trực tiếp</span>
                  </label>
                </div>

                {!isNewFollowUpCustomPatient ? (
                  <select
                    value={newFollowUpPatientId}
                    onChange={(e) => setNewFollowUpPatientId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.phone} ({p.gender}, {p.age} tuổi)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Họ và tên bệnh nhân..."
                      value={newFollowUpCustomName}
                      onChange={(e) => setNewFollowUpCustomName(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Số điện thoại liên hệ..."
                      value={newFollowUpCustomPhone}
                      onChange={(e) => setNewFollowUpCustomPhone(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chẩn Đoán Bệnh Sau Khám <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFollowUpDiagnosis}
                    onChange={(e) => setNewFollowUpDiagnosis(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-semibold"
                    placeholder="VD: Viêm họng cấp / Viêm loét dạ dày HP (+)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kế Hoạch Gọi Thăm Khám</label>
                  <select
                    value={newFollowUpDays}
                    onChange={(e) => setNewFollowUpDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                  >
                    <option value={1}>D+1 (Sau 24 giờ - Sau thủ thuật / tiểu phẫu)</option>
                    <option value={3}>D+3 (Sau 3 ngày - Kiểm tra đáp ứng điều trị)</option>
                    <option value={7}>D+7 (Sau 7 ngày - Đánh giá hồi phục & nhắc tái khám)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi Chú Dặn Dò Lâm Sàng Của Bác Sĩ (Lưu Ý Hỗ Trợ CSKH Khi Gọi Điện)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFollowUpDoctorNotes}
                  onChange={(e) => setNewFollowUpDoctorNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white placeholder-slate-400 font-sans"
                  placeholder="Ghi rõ: Chế độ ăn uống, sinh hoạt kiêng cữ, triệu chứng cần theo dõi sát (sốt, đau rát, phù nề) để CSKH hỏi thăm chính xác..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhân Sự CSKH Phụ Trách</label>
                <input
                  type="text"
                  value={newFollowUpStaff}
                  onChange={(e) => setNewFollowUpStaff(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                  placeholder="VD: ĐD. Lê Thị Diệu / CSKH Nguyễn Mai Linh"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFollowUpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Tạo Kế Hoạch Chăm Sóc Sau Khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZNS POST-VISIT CARE MESSAGE */}
      {znsModalTask && (
        <ZnsPostVisitCareModal
          task={{
            id: znsModalTask.id,
            patientId: znsModalTask.patientId,
            patientName: znsModalTask.patientName,
            patientPhone: znsModalTask.patientPhone,
            visitDate: znsModalTask.visitDate,
            primaryDiagnosis: znsModalTask.primaryDiagnosis,
            doctorCareNotes: znsModalTask.doctorCareNotes,
            department: 'Khoa Khám Bệnh Đa Khoa',
            doctorName: 'BS. CKII Lê Văn An'
          }}
          onClose={() => setZnsModalTask(null)}
          onSuccess={() => {
            setZnsModalTask(null);
            setThankYouToast(`Đã gửi tin nhắn ZNS dặn dò sau khám cho bệnh nhân ${znsModalTask.patientName} thành công!`);
            setTimeout(() => setThankYouToast(null), 5000);
          }}
        />
      )}

      {/* MODAL: VOIP WEBRTC SOFTPHONE CALL */}
      {voipModalTask && (
        <VoipSoftphoneModal
          patientName={voipModalTask.patientName}
          patientPhone={voipModalTask.patientPhone}
          patientId={voipModalTask.patientId}
          callerStaff="CSKH Nguyễn Mai Linh"
          onClose={() => setVoipModalTask(null)}
          onCallCompleted={(callLog) => {
            setVoipModalTask(null);
            setThankYouToast(`Đã hoàn tất cuộc gọi VoIP với ${callLog.patientName} (${callLog.durationSeconds} giây). Nhật ký đã lưu.`);
            setTimeout(() => setThankYouToast(null), 5000);
            // Update the task status to called
            setFollowUpList(prev => prev.map(item => item.id === voipModalTask.id ? { ...item, callStatus: 'Đã gọi - Ổn định' } : item));
          }}
        />
      )}
    </div>
  );
};
