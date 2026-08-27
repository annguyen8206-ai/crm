import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Send,
  Copy,
  Check,
  Sparkles,
  User,
  Calendar,
  Clock,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  Building2,
  PhoneCall,
  Bot,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  Users,
  Activity,
  Stethoscope,
  Pill,
  Star,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { CARE_SCENARIOS_DATA, CareScenario } from '../data/careScriptsData';
import { Patient, CurrentUser } from '../types';

interface CustomerCarePlaybookViewProps {
  patients?: Patient[];
  onOpenVoipCall?: (phone: string, patientName: string) => void;
  onOpenZnsModal?: (patientName: string, phone: string, scenarioTitle: string) => void;
}

export const CustomerCarePlaybookView: React.FC<CustomerCarePlaybookViewProps> = ({
  patients = [],
  onOpenVoipCall,
  onOpenZnsModal
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(CARE_SCENARIOS_DATA[0].id);

  // Dynamic Patient Variable Customizer State
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'custom');
  const [customPatientName, setCustomPatientName] = useState<string>('Nguyễn Thị Mai');
  const [customDoctorName, setCustomDoctorName] = useState<string>('TS.BS Hoàng Minh Tuấn');
  const [customDepartment, setCustomDepartment] = useState<string>('Khoa Nội Tim Mạch & Huyết Áp');
  const [customTime, setCustomTime] = useState<string>('08:30');
  const [customDate, setCustomDate] = useState<string>('25/08/2026');

  // Copy Feedback State
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // AI Script Personalizer State
  const [aiTone, setAiTone] = useState<'empathetic' | 'formal_medical' | 'concise' | 'reassuring'>('empathetic');
  const [aiPersonalizingId, setAiPersonalizingId] = useState<string | null>(null);
  const [aiCustomResult, setAiCustomResult] = useState<{ [scenarioId: string]: string }>({});

  // Active target patient
  const activePatient = patients.find(p => p.id === selectedPatientId);
  const patientNameVal = activePatient ? activePatient.name : customPatientName;
  const patientPhoneVal = activePatient ? activePatient.phone : '0912345678';

  // Helper to replace variables in template
  const formatTemplateText = (text: string, scenario: CareScenario) => {
    if (!text) return '';
    return text
      .replace(/{ten_benh_nhan}/g, patientNameVal)
      .replace(/{ten_nhan_vien}/g, 'ĐD. Lê Thị Diệu')
      .replace(/{bac_si}/g, customDoctorName)
      .replace(/{khoa_kham}/g, customDepartment)
      .replace(/{gio_kham}/g, customTime)
      .replace(/{ngay_kham}/g, customDate)
      .replace(/{gio_kham_moi}/g, '10:00')
      .replace(/{ngay_kham_moi}/g, '26/08/2026')
      .replace(/{co_so}/g, 'Cơ sở 1 - Tòa nhà VitHospital')
      .replace(/{dia_chi_co_so}/g, 'Số 458 Minh Khai, Hai Bà Trưng, Hà Nội')
      .replace(/{so_quay}/g, '03')
      .replace(/{so_phong}/g, '302')
      .replace(/{so_tang}/g, '3')
      .replace(/{ma_lich_hen}/g, 'LH-2026-8899')
      .replace(/{ma_kham}/g, 'KB-0899')
      .replace(/{ma_benh_nhan}/g, activePatient?.id || 'BN-8899')
      .replace(/{trieu_chung}/g, 'đau tức ngực kèm khó thở nhẹ')
      .replace(/{loai_thu_thuat}/g, 'Nội soi dạ dày & Lấy cao răng')
      .replace(/{ngay_het_thuoc}/g, '28/08/2026')
      .replace(/{tuan_thai}/g, '22')
      .replace(/{ten_be}/g, 'Bé Gia Bảo')
      .replace(/{thang_tuoi}/g, '6')
      .replace(/{ten_vac_xin}/g, '6 trong 1 Hexaxim & Phế cầu Synflorix')
      .replace(/{phong_benh}/g, 'Bạch hầu, Ho gà, Uốn ván, Bại liệt')
      .replace(/{dau_hieu_bat_thuong}/g, 'nghi ngờ men gan tăng nhẹ')
      .replace(/{ten_xet_nghiem}/g, 'Men gan AST/ALT chuyên sâu')
      .replace(/{ten_nhan_vien_vi_pham}/g, 'Trần Thị H.')
      .replace(/{ten_quan_ly}/g, 'ThS. Nguyễn Văn Thành')
      .replace(/{hang_the}/g, 'Platinum VIP')
      .replace(/{hotline_vip}/g, '1900-6868 (Phím 9)')
      .replace(/{ten_hr}/g, 'Chị Thu Hương')
      .replace(/{ten_cong_ty}/g, 'Tập đoàn FPT Software')
      .replace(/{so_luong_nhan_su}/g, '350')
      .replace(/{ten_hang_bh}/g, 'Bảo Việt InterCare');
  };

  // Copy handler
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  // Run AI Adaptation
  const handleAiAdaptation = async (scenario: CareScenario) => {
    setAiPersonalizingId(scenario.id);
    try {
      const res = await fetch('/api/ai/generate-care-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintText: `Cá nhân hóa kịch bản CSKH ${scenario.code} (${scenario.title}) theo giọng điệu: ${aiTone}`,
          category: scenario.categoryLabel,
          patientName: patientNameVal,
          department: customDepartment,
          priority: 'Cao (SLA 2h)'
        })
      });
      const data = await res.json();
      if (data && data.fullLetterDraft) {
        setAiCustomResult(prev => ({
          ...prev,
          [scenario.id]: data.fullLetterDraft
        }));
      } else {
        // Fallback local dynamic prompt
        setAiCustomResult(prev => ({
          ...prev,
          [scenario.id]: `[AI Tone: ${aiTone.toUpperCase()}] Kính gửi Quý khách ${patientNameVal}, VitHospital xin trân trọng đồng hành cùng sức khỏe của Anh/Chị tại ${customDepartment} (Bác sĩ ${customDoctorName} phụ trách). Mọi chỉ định và hỗ trợ y tế luôn được thực hiện với tiêu chuẩn an toàn cao nhất.`
        }));
      }
    } catch (err) {
      console.error(err);
      setAiCustomResult(prev => ({
        ...prev,
        [scenario.id]: `[AI Tone: ${aiTone.toUpperCase()}] Kính gửi Quý khách ${patientNameVal}, VitHospital xin trân trọng thông báo thông tin chăm sóc sức khỏe tại ${customDepartment}. Bác sĩ ${customDoctorName} sẽ đồng hành sát sao cùng Anh/Chị!`
      }));
    } finally {
      setAiPersonalizingId(null);
    }
  };

  // Filter scenarios
  const filteredScenarios = CARE_SCENARIOS_DATA.filter(sc => {
    const matchesCat = selectedCategory === 'ALL' || sc.category === selectedCategory;
    const matchesChan = selectedChannel === 'ALL' || sc.recommendedChannels.includes(selectedChannel as any);
    const matchesSearch =
      sc.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      sc.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      sc.situationSummary.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      sc.primaryGoal.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesCat && matchesChan && matchesSearch;
  });

  const categories = [
    { id: 'ALL', label: 'Toàn Bộ Tình Huống', count: CARE_SCENARIOS_DATA.length, icon: BookOpen },
    { id: 'pre_visit', label: '1. Trước Khám & Đặt Lịch', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'pre_visit').length, icon: Calendar },
    { id: 'in_visit', label: '2. Trong Khám & Tại Quầy', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'in_visit').length, icon: Stethoscope },
    { id: 'post_visit', label: '3. Sau Khám & Xuất Viện', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'post_visit').length, icon: Pill },
    { id: 'recall_chronic', label: '4. Tái Khám Bệnh Mãn Tính', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'recall_chronic').length, icon: RefreshCw },
    { id: 'complaint_sla', label: '5. Xử Lý Khiếu Nại & SLA', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'complaint_sla').length, icon: ShieldAlert },
    { id: 'loyalty_vip', label: '6. Tri Ân & Hội Viên VIP', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'loyalty_vip').length, icon: Award },
    { id: 'b2b_corporate', label: '7. Khách Hàng Doanh Nghiệp B2B', count: CARE_SCENARIOS_DATA.filter(s => s.category === 'b2b_corporate').length, icon: Building2 }
  ];

  return (
    <div className="space-y-4">
      {/* Compact Controls Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Kịch Bản Chăm Sóc & Xử Lý Tình Huống Y Tế
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                  {CARE_SCENARIOS_DATA.length} Kịch bản chuẩn
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Chuẩn hóa giao tiếp đa kênh theo hành trình người bệnh</p>
            </div>
          </div>

          {/* Quick Patient Variable Picker & Settings Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">Bệnh nhân mẫu:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs max-w-[150px] truncate"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                ))}
                <option value="custom">-- Tùy chỉnh tên --</option>
              </select>
            </div>

            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showSimulator
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Tùy chỉnh thông số bác sĩ, chuyên khoa, ngày giờ khám"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">
                {showSimulator ? 'Thu gọn biến' : 'Chỉnh biến số'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Detailed Variable Editor */}
        {showSimulator && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {selectedPatientId === 'custom' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">Họ tên bệnh nhân:</label>
                  <input
                    type="text"
                    value={customPatientName}
                    onChange={(e) => setCustomPatientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  />
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[11px]">Bác sĩ phụ trách:</label>
                <input
                  type="text"
                  value={customDoctorName}
                  onChange={(e) => setCustomDoctorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[11px]">Chuyên khoa:</label>
                <input
                  type="text"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[11px]">Giờ & Ngày khám:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="08:30"
                    className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-medium text-slate-800"
                  />
                  <input
                    type="text"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    placeholder="25/08/2026"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Channel Filters Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo mã (PRE-01, SLA-01), tiêu đề, khoa phòng..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Kênh:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả kênh</option>
              <option value="Zalo ZNS">Zalo ZNS</option>
              <option value="Zalo OA Chat">Zalo OA Chat</option>
              <option value="Facebook Messenger">Messenger</option>
              <option value="Tổng đài (Call)">Tổng đài (VoIP)</option>
              <option value="SMS Brandname">SMS</option>
              <option value="Trực tiếp tại quầy">Tại quầy</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200/80 text-slate-600'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scenarios List */}
      <div className="space-y-4">
        {filteredScenarios.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Không tìm thấy kịch bản phù hợp</h4>
            <p className="text-xs text-slate-500">Vui lòng thử lại với từ khóa tìm kiếm hoặc chọn danh mục khác.</p>
          </div>
        ) : (
          filteredScenarios.map((sc) => {
            const isExpanded = expandedScenarioId === sc.id;
            const formattedCallScript = sc.scriptTemplate.callScript;
            const formattedChat = sc.scriptTemplate.chatOrZnsTemplate;
            const formattedSms = sc.scriptTemplate.smsTemplate ? formatTemplateText(sc.scriptTemplate.smsTemplate, sc) : null;

            return (
              <div
                key={sc.id}
                className={`bg-white border transition-all rounded-3xl overflow-hidden shadow-xs ${
                  isExpanded ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Scenario Header Card */}
                <div
                  onClick={() => setExpandedScenarioId(isExpanded ? null : sc.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 font-mono font-bold text-xs shrink-0 border border-blue-200">
                      {sc.code}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{sc.title}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold">
                          {sc.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sc.situationSummary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {sc.recommendedChannels.map((ch, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Scenario Expanded Details */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-200 space-y-6 bg-white">
                    {/* Objectives & SLA Rules Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">🎯 Mục Tiêu Chăm Sóc:</span>
                        <p className="text-slate-600">{sc.primaryGoal}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">⏱️ Thời Điểm / Quy Tắc SLA Kích Hoạt:</span>
                        <p className="text-blue-700 font-semibold">{sc.timingRule}</p>
                      </div>
                    </div>

                    {/* Scripts Tabs & Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Call Script (Cuộc gọi thoại / Trực tiếp) */}
                      {formattedCallScript && (
                        <div className="lg:col-span-7 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-emerald-600" />
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Kịch Bản Điện Thoại / Trực Tiếp (Call Script)
                              </h4>
                            </div>
                            <button
                              onClick={() => {
                                const fullCall = `[LỜI CHÀO]\n${formatTemplateText(formattedCallScript.greeting, sc)}\n\n[NỘI DUNG CHÍNH]\n${formatTemplateText(formattedCallScript.body, sc)}\n\n[XỬ LÝ TÌNH HUỐNG PHỤ]\n${formatTemplateText(formattedCallScript.objectionHandling, sc)}\n\n[KẾT THÚC]\n${formatTemplateText(formattedCallScript.closing, sc)}`;
                                handleCopy(fullCall, `call-${sc.id}`);
                              }}
                              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              {copiedScriptId === `call-${sc.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Đã sao chép!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép toàn bộ</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Greeting */}
                            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                              <span className="font-bold text-emerald-800 text-[11px] uppercase">1. Lời chào & Nhận diện:</span>
                              <p className="text-slate-800 leading-relaxed">
                                {formatTemplateText(formattedCallScript.greeting, sc)}
                              </p>
                            </div>

                            {/* Body */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                              <span className="font-bold text-slate-700 text-[11px] uppercase">2. Nội dung thăm khám & Dặn dò:</span>
                              <p className="text-slate-800 leading-relaxed font-medium">
                                {formatTemplateText(formattedCallScript.body, sc)}
                              </p>
                            </div>

                            {/* Objection Handling */}
                            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                              <span className="font-bold text-amber-900 text-[11px] uppercase flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                3. Xử lý phản hồi / Thắc mắc của Bệnh nhân (Objection Handling):
                              </span>
                              <p className="text-slate-800 leading-relaxed italic">
                                {formatTemplateText(formattedCallScript.objectionHandling, sc)}
                              </p>
                            </div>

                            {/* Closing */}
                            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
                              <span className="font-bold text-blue-800 text-[11px] uppercase">4. Lời chúc & Kết thúc:</span>
                              <p className="text-slate-800 leading-relaxed">
                                {formatTemplateText(formattedCallScript.closing, sc)}
                              </p>
                            </div>
                          </div>

                          {/* Quick Action VoIP Call */}
                          {onOpenVoipCall && (
                            <div className="pt-2">
                              <button
                                onClick={() => onOpenVoipCall(patientPhoneVal, patientNameVal)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                <PhoneCall className="w-4 h-4" />
                                <span>Bấm Gọi Ngay Cho {patientNameVal} ({patientPhoneVal})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Right: Zalo ZNS / Chat / SMS Template */}
                      <div className={formattedCallScript ? 'lg:col-span-5 space-y-4' : 'lg:col-span-12 space-y-4'}>
                        {formattedChat && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Mẫu Zalo ZNS / OA Chat
                                </h4>
                              </div>
                              <button
                                onClick={() => {
                                  const text = `${formattedChat.title}\n\n${formatTemplateText(formattedChat.content, sc)}`;
                                  handleCopy(text, `zns-${sc.id}`);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedScriptId === `zns-${sc.id}` ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Đã chép
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Copy className="w-3.5 h-3.5" /> Sao chép
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Zalo Mock Message Box */}
                            <div className="bg-gradient-to-b from-blue-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                                <span className="font-bold text-blue-900">{formattedChat.title}</span>
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                                  Zalo ZNS Official
                                </span>
                              </div>
                              <div className="whitespace-pre-line text-slate-800 leading-relaxed font-sans text-[11.5px]">
                                {formatTemplateText(formattedChat.content, sc)}
                              </div>
                              {formattedChat.buttonAction && (
                                <div className="pt-2">
                                  <div className="w-full py-2 bg-blue-600 text-white rounded-xl text-center font-bold text-xs shadow-2xs">
                                    {formattedChat.buttonAction}
                                  </div>
                                </div>
                              )}
                            </div>

                            {onOpenZnsModal && (
                              <button
                                onClick={() => onOpenZnsModal(patientNameVal, patientPhoneVal, sc.title)}
                                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
                              >
                                <Send className="w-3.5 h-3.5 text-blue-600" />
                                <span>Gửi Tin Nhắn ZNS Tới {patientNameVal}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {formattedSms && (
                          <div className="space-y-1.5 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5 text-slate-500" /> Mẫu Tin Nhắn SMS Brandname:
                              </span>
                              <button
                                onClick={() => handleCopy(formattedSms, `sms-${sc.id}`)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                {copiedScriptId === `sms-${sc.id}` ? 'Đã chép' : 'Sao chép SMS'}
                              </button>
                            </div>
                            <div className="p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed">
                              {formattedSms}
                            </div>
                          </div>
                        )}

                        {/* Key Notes */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1 text-xs">
                          <span className="font-bold text-amber-900 text-[11px]">📌 Lưu ý y khoa & nghiệp vụ:</span>
                          <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5">
                            {sc.keyNotes.map((k, i) => (
                              <li key={i}>{k}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* AI Tone Adaptation Engine */}
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Trợ Lý AI Gemini Tùy Biến Giọng Điệu Kịch Bản (Dynamic Tone Customizer)
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <select
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value as any)}
                            className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="empathetic">Giọng điệu: Ấm áp & Cảm thông sâu sắc</option>
                            <option value="formal_medical">Giọng điệu: Chuẩn mực Y khoa & Trang trọng</option>
                            <option value="concise">Giọng điệu: Ngắn gọn, Súc tích & Tác vụ nhanh</option>
                            <option value="reassuring">Giọng điệu: Trấn an tâm lý người bệnh lo lắng</option>
                          </select>

                          <button
                            onClick={() => handleAiAdaptation(sc)}
                            disabled={aiPersonalizingId === sc.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{aiPersonalizingId === sc.id ? 'Đang tạo...' : 'Tạo Bản Văn Mẫu AI'}</span>
                          </button>
                        </div>
                      </div>

                      {aiCustomResult[sc.id] && (
                        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-900 flex items-center gap-1.5">
                              <Bot className="w-4 h-4 text-purple-600" />
                              Bản thảo văn bản tùy biến theo phong cách y tế chuẩn mực:
                            </span>
                            <button
                              onClick={() => handleCopy(aiCustomResult[sc.id], `ai-${sc.id}`)}
                              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedScriptId === `ai-${sc.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>Sao chép bản thảo AI</span>
                            </button>
                          </div>
                          <p className="text-slate-800 leading-relaxed whitespace-pre-line font-medium bg-white p-3 rounded-xl border border-purple-100">
                            {aiCustomResult[sc.id]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
