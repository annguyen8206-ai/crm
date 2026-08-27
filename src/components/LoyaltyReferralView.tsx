import React, { useState } from 'react';
import {
  Award,
  Users,
  Gift,
  Share2,
  Percent,
  CheckCircle2,
  DollarSign,
  Star,
  Sparkles,
  ArrowUpRight,
  Plus,
  X,
  CreditCard,
  Send,
  Ticket,
  UserCheck,
  Stethoscope,
  Building2,
  Phone,
  QrCode,
  Copy,
  ExternalLink,
  Filter,
  Search,
  FileText,
  Clock,
  ArrowDownRight,
  Check,
  Download,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import {
  ReferralRecord,
  MedicalPartner,
  PartnerCommissionPayout,
  PartnerCategory,
  Patient
} from '../types';
import {
  mockMedicalPartners,
  mockPartnerPayouts
} from '../data/mockData';
import { formatDateVN } from '../utils/dateUtils';

interface LoyaltyReferralViewProps {
  referrals: ReferralRecord[];
  partners?: MedicalPartner[];
  partnerPayouts?: PartnerCommissionPayout[];
  patients: Patient[];
  onAddNewReferral?: (referral: Omit<ReferralRecord, 'id'>) => void;
  onAddNewPartner?: (partner: MedicalPartner) => void;
  onAddNewPayout?: (payout: PartnerCommissionPayout) => void;
  onUpdateReferralStatus?: (referralId: string, status: 'Đã chi trả' | 'Chờ đối soát') => void;
  onSelectPatient: (patientId: string) => void;
}

export const LoyaltyReferralView: React.FC<LoyaltyReferralViewProps> = ({
  referrals = [],
  partners = mockMedicalPartners,
  partnerPayouts = mockPartnerPayouts,
  patients = [],
  onAddNewReferral,
  onAddNewPartner,
  onAddNewPayout,
  onUpdateReferralStatus,
  onSelectPatient
}) => {
  const [activeTab, setActiveTab] = useState<'partners' | 'referrals' | 'payouts' | 'tiers' | 'redeem'>('partners');
  
  // Modals state
  const [isNewPartnerModalOpen, setIsNewPartnerModalOpen] = useState(false);
  const [isNewReferralModalOpen, setIsNewReferralModalOpen] = useState(false);
  const [isNewPayoutModalOpen, setIsNewPayoutModalOpen] = useState(false);
  const [selectedPartnerForQr, setSelectedPartnerForQr] = useState<MedicalPartner | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Partner filters
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerCategoryFilter, setPartnerCategoryFilter] = useState<string>('ALL');

  // Referral filters
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('ALL');

  // New Partner Form
  const [partnerName, setPartnerName] = useState('');
  const [partnerTitle, setPartnerTitle] = useState('BS. CKI');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerCategory, setPartnerCategory] = useState<PartnerCategory>('Bác sĩ tuyến dưới / PK Vệ tinh');
  const [partnerWorkplace, setPartnerWorkplace] = useState('');
  const [partnerSpecialty, setPartnerSpecialty] = useState('Nội Tổng Quát');
  const [partnerBankName, setPartnerBankName] = useState('Vietcombank');
  const [partnerBankAcc, setPartnerBankAcc] = useState('');
  const [partnerBankHolder, setPartnerBankHolder] = useState('');
  const [partnerCommissionRate, setPartnerCommissionRate] = useState<number>(10);

  // New Referral Form
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || '');
  const [patientReferredName, setPatientReferredName] = useState('Trần Văn Bình');
  const [patientReferredPhone, setPatientReferredPhone] = useState('0909 112 334');
  const [serviceUsed, setServiceUsed] = useState('Gói Tầm Soát Đột Quỵ Não & Chụp MRI 1.5 Tesla');
  const [billAmount, setBillAmount] = useState<number>(12500000);
  const [referralNotes, setReferralNotes] = useState('Phòng khám tuyến dưới chỉ định chuyển viện thực hiện Chẩn đoán hình ảnh chuyên sâu');

  // New Payout Form
  const [payoutPartnerId, setPayoutPartnerId] = useState(partners[0]?.id || '');
  const [payoutPeriod, setPayoutPeriod] = useState('Kỳ T08/2026 (Đợt 2)');

  // Points redemption state
  const [selectedRedeemPatientId, setSelectedRedeemPatientId] = useState(patients[0]?.id || '');
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);

  // Summary Metrics
  const totalPartnerCount = partners.length;
  const totalReferredPatients = partners.reduce((acc, p) => acc + (p.totalPatientsReferred || 0), 0);
  const totalPartnerRevenue = partners.reduce((acc, p) => acc + (p.totalRevenueGenerated || 0), 0);
  const totalCommissionEarned = partners.reduce((acc, p) => acc + (p.totalCommissionEarned || 0), 0);
  const totalCommissionPaid = partners.reduce((acc, p) => acc + (p.totalCommissionPaid || 0), 0);
  const totalPendingBalance = partners.reduce((acc, p) => acc + (p.pendingBalance || 0), 0);

  // Copy helper
  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  // Create Partner
  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    const codeSuffix = Math.floor(100 + Math.random() * 900);
    const prefix = partnerCategory.includes('Bác sĩ') ? 'CTV-BS' : partnerCategory.includes('Dược sĩ') ? 'CTV-DS' : partnerCategory.includes('Bảo hiểm') ? 'CTV-BH' : 'CTV-MED';
    const refCode = partnerName.split(' ').pop()?.toUpperCase() + '_' + Math.floor(100 + Math.random() * 900);

    const newPartner: MedicalPartner = {
      id: `partner-${Date.now()}`,
      code: `${prefix}-${codeSuffix}`,
      name: partnerName,
      title: partnerTitle,
      phone: partnerPhone,
      email: partnerEmail,
      category: partnerCategory,
      workplace: partnerWorkplace || 'Phòng khám đa khoa liên kết',
      specialtyOrField: partnerSpecialty,
      bankAccount: {
        bankName: partnerBankName,
        accountNumber: partnerBankAcc || '001100' + Math.floor(1000000 + Math.random() * 9000000),
        accountHolder: partnerBankHolder ? partnerBankHolder.toUpperCase() : partnerName.toUpperCase()
      },
      commissionRatePercent: partnerCommissionRate,
      referralCode: refCode,
      totalPatientsReferred: 0,
      totalRevenueGenerated: 0,
      totalCommissionEarned: 0,
      totalCommissionPaid: 0,
      pendingBalance: 0,
      status: 'Đang hoạt động',
      joinDate: new Date().toISOString().substring(0, 10)
    };

    if (onAddNewPartner) {
      onAddNewPartner(newPartner);
    }
    setIsNewPartnerModalOpen(false);
    // Reset form
    setPartnerName('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerWorkplace('');
  };

  // Create Referral
  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = partners.find(p => p.id === selectedPartnerId);
    const commRate = partner ? partner.commissionRatePercent : 10;
    const commAmount = Math.round(billAmount * (commRate / 100));
    const rewardPts = Math.round(billAmount / 50000);

    if (onAddNewReferral) {
      onAddNewReferral({
        partnerId: partner?.id,
        referrerName: partner ? `${partner.title ? partner.title + ' ' : ''}${partner.name}` : 'Bác sĩ đối tác',
        referrerType: partner?.category.includes('Bác sĩ') ? 'Bác sĩ tuyến dưới' : partner?.category.includes('Dược sĩ') ? 'Dược sĩ đối tác' : 'Cộng tác viên KSK',
        referrerPhone: partner?.phone || '0909887766',
        referralCode: partner?.referralCode,
        patientReferredName,
        patientPhone: patientReferredPhone,
        serviceUsed,
        billAmount,
        commissionAmount: commAmount,
        rewardPoints: rewardPts,
        date: new Date().toISOString().substring(0, 10),
        status: 'Chờ đối soát',
        notes: referralNotes
      });
    }
    setIsNewReferralModalOpen(false);
  };

  // Create Payout
  const handleCreatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = partners.find(p => p.id === payoutPartnerId) || partners[0];
    const payoutAmount = partner.pendingBalance > 0 ? partner.pendingBalance : 3500000;
    const taxDeduction = payoutAmount >= 2000000 ? Math.round(payoutAmount * 0.1) : 0;
    const netAmount = payoutAmount - taxDeduction;

    const newPayout: PartnerCommissionPayout = {
      id: `payout-${Date.now()}`,
      code: `UNC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerPhone: partner.phone,
      bankAccount: `${partner.bankAccount.bankName} - ${partner.bankAccount.accountNumber} (${partner.bankAccount.accountHolder})`,
      period: payoutPeriod,
      totalCases: Math.max(1, partner.totalPatientsReferred % 5 || 3),
      revenueTotal: payoutAmount * 10,
      payoutAmount,
      taxDeduction,
      netAmount,
      status: 'Đã thanh toán (UNC)',
      paidAt: new Date().toLocaleString('vi-VN'),
      transactionRef: `FT${Math.floor(10000000000 + Math.random() * 90000000000)}`
    };

    if (onAddNewPayout) {
      onAddNewPayout(newPayout);
    }
    setIsNewPayoutModalOpen(false);
  };

  const handleRedeemVoucher = (voucherName: string, pointsCost: number) => {
    const p = patients.find(pat => pat.id === selectedRedeemPatientId) || patients[0];
    setVoucherSuccess(`Đã đổi thành công "${voucherName}" cho bệnh nhân ${p?.name}! Mã voucher điện tử: E-VOUCHER-${Math.floor(100000 + Math.random() * 900000)} đã gửi qua Zalo ZNS.`);
    setTimeout(() => setVoucherSuccess(null), 5000);
  };

  const tiersConfig = [
    {
      name: 'Diamond VIP',
      color: 'from-amber-400 to-yellow-600',
      minSpend: '40,000,000 đ',
      discount: 'Giảm 15% tất cả dịch vụ',
      perks: ['Phòng khám riêng VIP không chờ đợi', 'Bác sĩ Trưởng khoa trực tiếp thăm khám', 'Xe riêng đưa đón tận nhà', 'Tặng gói xét nghiệm tổng quát sinh nhật'],
      memberCount: (patients || []).filter(p => p?.membership?.tier === 'Diamond VIP' || p?.tags?.includes('VIP Diamond')).length
    },
    {
      name: 'Platinum',
      color: 'from-indigo-400 to-purple-600',
      minSpend: '25,000,000 đ',
      discount: 'Giảm 12% dịch vụ & thủ thuật',
      perks: ['Ưu tiên tiếp đón phòng chờ VIP', 'Tư vấn Telemedicine miễn phí 4 lượt/năm', 'Giảm 20% khi mua gói thẩm mỹ da liễu'],
      memberCount: (patients || []).filter(p => p?.membership?.tier === 'Platinum').length
    },
    {
      name: 'Gold',
      color: 'from-yellow-400 to-amber-500',
      minSpend: '15,000,000 đ',
      discount: 'Giảm 10% viện phí',
      perks: ['Ưu tiên lấy số thứ tự khám', 'Miễn phí đo huyết áp & khám tổng quát định kỳ'],
      memberCount: (patients || []).filter(p => p?.membership?.tier === 'Gold').length
    },
    {
      name: 'Silver / Standard',
      color: 'from-slate-400 to-slate-600',
      minSpend: 'Khởi đầu',
      discount: 'Giảm 5% khi đặt hẹn qua App/Zalo',
      perks: ['Tích 1 điểm cho mỗi 10,000đ chi tiêu', 'Nhận voucher 200,000đ tháng sinh nhật'],
      memberCount: (patients || []).filter(p => p?.membership?.tier === 'Silver' || p?.membership?.tier === 'Standard' || !p?.membership?.tier).length
    }
  ];

  // Filtered partners
  const filteredPartners = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.phone.includes(partnerSearch) ||
      p.workplace.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.referralCode.toLowerCase().includes(partnerSearch.toLowerCase());
    const matchCategory = partnerCategoryFilter === 'ALL' || p.category === partnerCategoryFilter;
    return matchSearch && matchCategory;
  });

  // Filtered referrals
  const filteredReferrals = referrals.filter(r => {
    const matchSearch = r.patientReferredName.toLowerCase().includes(referralSearch.toLowerCase()) ||
      r.referrerName.toLowerCase().includes(referralSearch.toLowerCase()) ||
      (r.referralCode && r.referralCode.toLowerCase().includes(referralSearch.toLowerCase())) ||
      r.serviceUsed.toLowerCase().includes(referralSearch.toLowerCase());
    const matchStatus = referralStatusFilter === 'ALL' || r.status === referralStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Mạng Lưới CTV & Loyalty
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Affiliate & Referral CRM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý bác sĩ tuyến dưới/CTV, tự động tính hoa hồng dịch vụ y tế và hạng thẻ hội viên
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'partners' && (
            <button
              onClick={() => setIsNewPartnerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đăng Ký CTV / Bác Sĩ</span>
            </button>
          )}

          {activeTab === 'referrals' && (
            <button
              onClick={() => setIsNewReferralModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi Nhận Ca Giới Thiệu</span>
            </button>
          )}

          {activeTab === 'payouts' && (
            <button
              onClick={() => setIsNewPayoutModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Lập Kỳ Quyết Toán</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Pill Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'partners' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Mạng Lưới CTV ({partners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'referrals' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Ca Khám Giới Thiệu ({referrals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'payouts' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Đối Soát & Quyết Toán</span>
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'tiers' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Thẻ Hội Viên VIP</span>
        </button>

        <button
          onClick={() => setActiveTab('redeem')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'redeem' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Đổi Điểm & Voucher</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Tổng Số CTV / Bác Sĩ</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalPartnerCount} <span className="text-xs text-slate-500 font-sans font-normal">đối tác</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Đang hoạt động tích cực</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Bệnh Nhân Giới Thiệu</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2 font-mono">
            {totalReferredPatients} <span className="text-xs text-slate-500 font-sans font-normal">lượt khám</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Tỷ lệ chuyển đổi khám đạt 92%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Doanh Thu Từ Kênh CTV</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            {(totalPartnerRevenue / 1e6).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">triệu đ</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Chi phí CAC thấp, hiệu quả cao</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Hoa Hồng Đã Chi Trả</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2 font-mono">
            {(totalCommissionPaid / 1e6).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">triệu đ</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Khấu trừ thuế TNCN 10% chuẩn</div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-amber-800 text-xs font-bold">Số Dư Chờ Quyết Toán</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {(totalPendingBalance / 1e6).toLocaleString()} <span className="text-xs text-amber-800 font-sans font-normal">triệu đ</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Sẵn sàng lập Ủy nhiệm chi</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MẠNG LƯỚI CTV & BÁC SĨ TUYẾN DƯỚI */}
      {/* ========================================================================= */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          {/* Filter and Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm CTV theo Tên, SĐT, Mã CTV, Nơi công tác, Mã giới thiệu..."
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Phân loại:
              </span>
              <select
                value={partnerCategoryFilter}
                onChange={(e) => setPartnerCategoryFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
              >
                <option value="ALL">Tất cả nhóm đối tác ({partners.length})</option>
                <option value="Bác sĩ tuyến dưới / PK Vệ tinh">Bác sĩ tuyến dưới / PK Vệ tinh</option>
                <option value="Dược sĩ / Nhà thuốc đối tác">Dược sĩ / Nhà thuốc đối tác</option>
                <option value="Đại lý bảo hiểm sức khỏe">Đại lý bảo hiểm sức khỏe</option>
                <option value="KOC / Reviewer Y tế">KOC / Reviewer Y tế</option>
                <option value="Nhân viên nội bộ bệnh viện">Nhân viên nội bộ bệnh viện</option>
              </select>

              <button
                onClick={() => setIsNewPartnerModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm CTV</span>
              </button>
            </div>
          </div>

          {/* Partner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartners.map((partner) => {
              const partnerLink = `https://vithospital.vn/dat-kham?ref=${partner.referralCode}`;
              const isDoctor = partner.category.includes('Bác sĩ');
              const isPharmacist = partner.category.includes('Dược sĩ');
              const isInsurance = partner.category.includes('Bảo hiểm');

              return (
                <div
                  key={partner.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                          isDoctor ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          isPharmacist ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          isInsurance ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isDoctor ? <Stethoscope className="w-6 h-6" /> :
                           isPharmacist ? <Gift className="w-6 h-6" /> :
                           isInsurance ? <Briefcase className="w-6 h-6" /> :
                           <Users className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{partner.name}</h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {partner.code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            {partner.title ? `${partner.title} • ` : ''}{partner.specialtyOrField}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        partner.status === 'Đang hoạt động' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {partner.status}
                      </span>
                    </div>

                    {/* Workplace & Contact Info */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Nơi công tác / Đơn vị:</span>
                        <span className="font-bold text-slate-800 line-clamp-1">{partner.workplace}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Số điện thoại:</span>
                        <span className="font-mono font-bold text-blue-700">{partner.phone}</span>
                      </div>
                    </div>

                    {/* Referral Link & Code Box */}
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          Mã CTV: <span className="font-mono text-blue-700 uppercase">{partner.referralCode}</span>
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Chiết khấu {partner.commissionRatePercent}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={partnerLink}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 select-all"
                        />
                        <button
                          onClick={() => handleCopyLink(partnerLink, partner.id)}
                          className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                          title="Sao chép link giới thiệu"
                        >
                          {copiedLink === partner.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink === partner.id ? 'Đã chép' : 'Chép'}</span>
                        </button>
                        <button
                          onClick={() => setSelectedPartnerForQr(partner)}
                          className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                          title="Xem mã QR tuyển sinh/giới thiệu"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>
                      </div>
                    </div>

                    {/* Bank Account Info */}
                    <div className="mt-3 p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-0.5">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Tài khoản nhận hoa hồng:</span>
                      <div className="font-mono font-bold text-slate-900 flex items-center justify-between">
                        <span>{partner.bankAccount.bankName}: {partner.bankAccount.accountNumber}</span>
                        <span className="text-[11px] text-blue-700">{partner.bankAccount.accountHolder}</span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">Ca giới thiệu</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">{partner.totalPatientsReferred}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">Doanh thu tạo ra</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">{(partner.totalRevenueGenerated / 1e6).toFixed(1)} tr</span>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-amber-800 font-bold block">Chờ chi trả</span>
                        <span className="text-xs font-bold text-amber-700 font-mono">{(partner.pendingBalance / 1e6).toFixed(1)} tr</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedPartnerId(partner.id);
                        setIsNewReferralModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi nhận ca khám</span>
                    </button>

                    <button
                      onClick={() => {
                        setPayoutPartnerId(partner.id);
                        setIsNewPayoutModalOpen(true);
                      }}
                      disabled={partner.pendingBalance <= 0}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 ${
                        partner.pendingBalance > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Quyết toán hoa hồng</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CA BỆNH NHÂN GIỚI THIỆU & HOA HỒNG */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm ca theo tên Bệnh nhân, CTV giới thiệu, Dịch vụ y tế..."
                value={referralSearch}
                onChange={(e) => setReferralSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Trạng thái:</span>
              <select
                value={referralStatusFilter}
                onChange={(e) => setReferralStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
              >
                <option value="ALL">Tất cả trạng thái ({referrals.length})</option>
                <option value="Chờ đối soát">Chờ đối soát</option>
                <option value="Đã chi trả">Đã chi trả hoa hồng</option>
              </select>

              <button
                onClick={() => setIsNewReferralModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Ca Giới Thiệu</span>
              </button>
            </div>
          </div>

          {/* Referral Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">CTV / Bác Sĩ Giới Thiệu</th>
                    <th className="py-3.5 px-4">Mã Giới Thiệu</th>
                    <th className="py-3.5 px-4">Bệnh Nhân Được Giới Thiệu</th>
                    <th className="py-3.5 px-4">Dịch Vụ Sử Dụng & Viện Phí</th>
                    <th className="py-3.5 px-4">Hoa Hồng CTV</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{ref.referrerName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                            {ref.referrerType}
                          </span>
                          <span className="text-slate-500 text-[11px] font-mono">{ref.referrerPhone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {ref.referralCode || 'CTV-DIRECT'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{ref.patientReferredName}</span>
                        {ref.patientPhone && (
                          <span className="text-slate-500 font-mono text-[11px]">{ref.patientPhone}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-bold block">{ref.serviceUsed}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Viện phí: {(ref.billAmount / 1e6).toLocaleString()} triệu đ
                        </span>
                        {ref.notes && (
                          <span className="text-slate-400 text-[10px] block line-clamp-1 italic mt-0.5">
                            "{ref.notes}"
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-700 font-mono block text-sm">
                          {(ref.commissionAmount).toLocaleString()} đ
                        </span>
                        <span className="text-amber-600 font-bold text-[10px] block">
                          +{ref.rewardPoints} điểm tích lũy
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          ref.status === 'Đã chi trả' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ref.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatDateVN(ref.date)}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {ref.status === 'Chờ đối soát' && onUpdateReferralStatus ? (
                          <button
                            onClick={() => onUpdateReferralStatus(ref.id, 'Đã chi trả')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Chi trả ngay
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Đã quyết toán</span>
                        )}
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
      {/* TAB 3: ĐỐI SOÁT & CHI TRẢ HOA HỒNG (UNC / PAYOUTS) */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Danh Sách Lệnh Chi & Bảng Đối Soát Hoa Hồng Định Kỳ</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tự động xuất Ủy nhiệm chi (UNC) ngân hàng, tính thuế TNCN 10% và kết xuất sao kê đối tác y tế</p>
            </div>

            <button
              onClick={() => setIsNewPayoutModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Lập Ủy Nhiệm Chi Mới</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Mã UNC / Đợt Chi</th>
                    <th className="py-3.5 px-4">Đối Tác Nhận Hoa Hồng</th>
                    <th className="py-3.5 px-4">Tài Khoản Thụ Hưởng</th>
                    <th className="py-3.5 px-4">Số Ca & Doanh Thu</th>
                    <th className="py-3.5 px-4">Hoa Hồng Gốc</th>
                    <th className="py-3.5 px-4">Thuế TNCN (10%)</th>
                    <th className="py-3.5 px-4">Thực Chuyển (Net)</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-right">Ủy Nhiệm Chi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {partnerPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 block">{payout.code}</span>
                        <span className="text-slate-500 text-[11px]">{payout.period}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{payout.partnerName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{payout.partnerPhone}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px]">
                        {payout.bankAccount}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{payout.totalCases} ca</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Doanh thu: {(payout.revenueTotal / 1e6).toFixed(1)} tr
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {payout.payoutAmount.toLocaleString()} đ
                      </td>

                      <td className="py-3.5 px-4 font-mono text-red-600">
                        -{payout.taxDeduction.toLocaleString()} đ
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                        {payout.netAmount.toLocaleString()} đ
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          payout.status.includes('Đã thanh toán')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {payout.status}
                        </span>
                        {payout.paidAt && (
                          <span className="text-slate-400 text-[10px] block mt-0.5">{formatDateVN(payout.paidAt)}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => alert(`Xuất file Ủy nhiệm chi điện tử ${payout.code} sang hệ thống Ngân hàng điện tử (Vietcombank / MBBank Auto Payout)!`)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Tải UNC PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => alert(`Đã gửi thông báo Zalo ZNS Báo Có Hoa Hồng ${payout.netAmount.toLocaleString()}đ tới SĐT ${payout.partnerPhone} của CTV!`)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Bắn ZNS thông báo cho CTV"
                          >
                            <Send className="w-3.5 h-3.5" />
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
      {/* TAB 4: MEMBERSHIP TIERS */}
      {/* ========================================================================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiersConfig.map((tier) => (
              <div
                key={tier.name}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r ${tier.color}`} />
                
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      {tier.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {tier.memberCount} hội viên
                    </span>
                  </div>

                  <div className="text-blue-700 font-bold text-sm mt-2">{tier.discount}</div>
                  <div className="text-slate-500 text-xs mt-0.5">Chi tiêu tích lũy: {tier.minSpend}</div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">Đặc quyền hội viên:</span>
                    {tier.perks.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                  Tự động thăng hạng khi đủ điểm chi tiêu
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REDEEM & VOUCHER SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'redeem' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Đổi Điểm Thưởng & Tặng Voucher Chăm Sóc Sức Khỏe</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tạo mã ưu đãi điện tử Zalo ZNS / SMS cho khách hàng thân thiết theo số điểm tích lũy</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Bệnh nhân:</span>
                <select
                  value={selectedRedeemPatientId}
                  onChange={(e) => setSelectedRedeemPatientId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.membership?.tier || 'Hội viên'} ({p.membership?.points || 150} điểm)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {voucherSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{voucherSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-white flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Ticket className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">100 điểm</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">Voucher Khám Tổng Quát 200,000đ</h4>
                  <p className="text-xs text-slate-600 mt-1">Áp dụng cho tất cả dịch vụ khám chuyên khoa tại tất cả cơ sở.</p>
                </div>
                <button
                  onClick={() => handleRedeemVoucher('Voucher Khám Tổng Quát 200,000đ', 100)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Đổi Voucher & Gửi ZNS
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-br from-purple-50 to-white flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Gift className="w-6 h-6 text-purple-600" />
                    <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">250 điểm</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">Gói Xét Nghiệm Máu Định Kỳ Miễn Phí</h4>
                  <p className="text-xs text-slate-600 mt-1">Bao gồm Công thức máu (CBC), Đường huyết Glucose và Men gan AST/ALT.</p>
                </div>
                <button
                  onClick={() => handleRedeemVoucher('Gói Xét Nghiệm Máu Định Kỳ Miễn Phí', 250)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Đổi Voucher & Gửi ZNS
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-white flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">500 điểm</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">Voucher Chăm Sóc Da Liễu VIP 1,000,000đ</h4>
                  <p className="text-xs text-slate-600 mt-1">Sử dụng cho các liệu trình Laser, Trẻ hóa da tại Khoa Thẩm mỹ Công nghệ cao.</p>
                </div>
                <button
                  onClick={() => handleRedeemVoucher('Voucher Da Liễu VIP 1,000,000đ', 500)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Đổi Voucher & Gửi ZNS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW PARTNER / CTV */}
      {/* ========================================================================= */}
      {isNewPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Đăng Ký Hồ Sơ CTV / Bác Sĩ Tuyến Dưới Mới</h3>
              </div>
              <button
                onClick={() => setIsNewPartnerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ Tên CTV / Bác Sĩ *</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: BS. CKI Phan Trọng Đạt"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức Danh / Học Vị</label>
                  <input
                    type="text"
                    value={partnerTitle}
                    onChange={(e) => setPartnerTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: BS. CKI, DS. ĐH, Trưởng nhóm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại Liên Hệ *</label>
                  <input
                    type="tel"
                    required
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="0913xxxxxx"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Nhận Sao Kê</label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="bsdat@phongkham.vn"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân Loại Đối Tác</label>
                  <select
                    value={partnerCategory}
                    onChange={(e) => setPartnerCategory(e.target.value as PartnerCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="Bác sĩ tuyến dưới / PK Vệ tinh">Bác sĩ tuyến dưới / PK Vệ tinh</option>
                    <option value="Dược sĩ / Nhà thuốc đối tác">Dược sĩ / Nhà thuốc đối tác</option>
                    <option value="Đại lý bảo hiểm sức khỏe">Đại lý bảo hiểm sức khỏe</option>
                    <option value="KOC / Reviewer Y tế">KOC / Reviewer Y tế</option>
                    <option value="Nhân viên nội bộ bệnh viện">Nhân viên nội bộ bệnh viện</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức Hoa Hồng Thỏa Thuận (%)</label>
                  <select
                    value={partnerCommissionRate}
                    onChange={(e) => setPartnerCommissionRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-emerald-700 font-bold focus:bg-white"
                  >
                    <option value={5}>5% - Khách hàng thân thiết / Nội bộ</option>
                    <option value={8}>8% - Dược sĩ / Nhà thuốc</option>
                    <option value={10}>10% - Bác sĩ tuyến dưới (Tiêu chuẩn)</option>
                    <option value={12}>12% - Đại lý bảo hiểm sức khỏe</option>
                    <option value={15}>15% - KOC / Bác sĩ chuyên khoa sâu</option>
                    <option value={20}>20% - Đối tác chiến lược VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn Vị Công Tác / Phòng Khám</label>
                  <input
                    type="text"
                    value={partnerWorkplace}
                    onChange={(e) => setPartnerWorkplace(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: Phòng Khám Đa Khoa An Bình"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chuyên Khoa / Lĩnh Vực</label>
                  <input
                    type="text"
                    value={partnerSpecialty}
                    onChange={(e) => setPartnerSpecialty(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: Tim mạch, Nhi khoa, Da liễu"
                  />
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <span className="font-bold text-blue-900 block text-xs">Thông Tin Tài Khoản Nhận Hoa Hồng (Chi Trả Tự Động)</span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngân Hàng</label>
                    <select
                      value={partnerBankName}
                      onChange={(e) => setPartnerBankName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                    >
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="MBBank">MBBank (Quân Đội)</option>
                      <option value="Techcombank">Techcombank</option>
                      <option value="VPBank">VPBank</option>
                      <option value="BIDV">BIDV</option>
                      <option value="VietinBank">VietinBank</option>
                      <option value="ACB">ACB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số Tài Khoản</label>
                    <input
                      type="text"
                      value={partnerBankAcc}
                      onChange={(e) => setPartnerBankAcc(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                      placeholder="001100xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên Chủ Tài Khoản</label>
                    <input
                      type="text"
                      value={partnerBankHolder}
                      onChange={(e) => setPartnerBankHolder(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 uppercase font-bold"
                      placeholder="NGUYEN VAN A"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPartnerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kích Hoạt Hồ Sơ CTV</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE REFERRAL RECORD */}
      {/* ========================================================================= */}
      {isNewReferralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Ca Giới Thiệu Khám Mới</h3>
              </div>
              <button
                onClick={() => setIsNewReferralModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn CTV / Bác Sĩ Giới Thiệu *</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code} - {p.category}) - Hoa hồng {p.commissionRatePercent}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Bệnh Nhân *</label>
                  <input
                    type="text"
                    required
                    value={patientReferredName}
                    onChange={(e) => setPatientReferredName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                    placeholder="VD: Trần Văn Bình"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SĐT Bệnh Nhân</label>
                  <input
                    type="tel"
                    value={patientReferredPhone}
                    onChange={(e) => setPatientReferredPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="0909xxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dịch Vụ Sử Dụng Tại Viện</label>
                <input
                  type="text"
                  required
                  value={serviceUsed}
                  onChange={(e) => setServiceUsed(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  placeholder="VD: Chụp MRI 1.5 Tesla, Gói Thai sản, Phẫu thuật..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doanh Thu Viện Phí (VNĐ) *</label>
                  <input
                    type="number"
                    step="500000"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hoa Hồng Tự Động Tính</label>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-700 text-sm">
                    {Math.round(billAmount * ((partners.find(p => p.id === selectedPartnerId)?.commissionRatePercent || 10) / 100)).toLocaleString()} đ
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Chỉ Định / Chuyển Tuyến</label>
                <textarea
                  rows={2}
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  placeholder="Ghi chú lâm sàng từ bác sĩ chuyển tuyến..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReferralModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Ca Giới Thiệu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE COMMISSION PAYOUT (UNC) */}
      {/* ========================================================================= */}
      {isNewPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Lập Lệnh Quyết Toán Hoa Hồng & Ủy Nhiệm Chi (UNC)</h3>
              </div>
              <button
                onClick={() => setIsNewPayoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayout} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn CTV / Bác Sĩ Cần Quyết Toán *</label>
                <select
                  value={payoutPartnerId}
                  onChange={(e) => setPayoutPartnerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - Dư nợ hoa hồng: {(p.pendingBalance || 0).toLocaleString()} đ
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kỳ Đối Soát</label>
                <input
                  type="text"
                  value={payoutPeriod}
                  onChange={(e) => setPayoutPeriod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                />
              </div>

              {(() => {
                const partner = partners.find(p => p.id === payoutPartnerId) || partners[0];
                const gross = partner.pendingBalance > 0 ? partner.pendingBalance : 3500000;
                const tax = gross >= 2000000 ? Math.round(gross * 0.1) : 0;
                const net = gross - tax;

                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="font-bold text-slate-700 block text-xs">Bảng Kê Chi Trả & Khấu Trừ Thuế:</span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tài khoản thụ hưởng:</span>
                      <span className="font-mono font-bold text-slate-900">{partner.bankAccount.bankName} - {partner.bankAccount.accountNumber}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tổng hoa hồng kỳ này (Gross):</span>
                      <span className="font-mono font-bold text-slate-900">{gross.toLocaleString()} đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-600 font-medium">Khấu trừ Thuế TNCN (10%):</span>
                      <span className="font-mono font-bold text-red-600">-{tax.toLocaleString()} đ</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900">Thực nhận chuyển khoản (Net):</span>
                      <span className="font-mono font-bold text-emerald-700 text-base">{net.toLocaleString()} đ</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPayoutModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận & Xuất Lệnh Chi UNC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QR CODE & AFFILIATE LINK PREVIEW */}
      {/* ========================================================================= */}
      {selectedPartnerForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Mã QR Giới Thiệu Khám Độc Quyền</h3>
              </div>
              <button
                onClick={() => setSelectedPartnerForQr(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Poster Mockup */}
            <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase opacity-90">Hệ Thống Y Tế VitHospital</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Ưu Đãi -10%</span>
              </div>

              <div>
                <h4 className="font-bold text-base leading-tight">Đặt Khám Ưu Tiên & Tư Vấn Chuyên Gia</h4>
                <p className="text-[11px] opacity-80 mt-1">Giới thiệu bởi: {selectedPartnerForQr.name}</p>
                <p className="text-[10px] opacity-70">({selectedPartnerForQr.workplace})</p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://vithospital.vn/dat-kham?ref=${selectedPartnerForQr.referralCode}`)}`}
                  alt="QR Code"
                  referrerPolicy="no-referrer"
                  className="w-40 h-40 object-contain mx-auto"
                />
                <span className="text-slate-700 font-mono font-bold text-xs mt-2 block">
                  MÃ CTV: {selectedPartnerForQr.referralCode}
                </span>
              </div>

              <div className="text-[10px] opacity-85 leading-relaxed">
                Bệnh nhân quét mã được miễn phí tiếp đón ưu tiên và giảm 10% phí khám lâm sàng tại toàn bộ cơ sở VitHospital!
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => alert(`Đã tải file ảnh Poster QR của CTV ${selectedPartnerForQr.name} (Định dạng in ấn A5/A4)!`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải Poster In Đặt Bàn (PDF)</span>
              </button>
              <button
                onClick={() => handleCopyLink(`https://vithospital.vn/dat-kham?ref=${selectedPartnerForQr.referralCode}`, 'qr-copy')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Sao Chép Link Bio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
