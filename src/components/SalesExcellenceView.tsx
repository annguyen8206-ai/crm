import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Users,
  DollarSign,
  FileSignature,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  Percent,
  Sparkles,
  User,
  MapPin,
  Tag,
  ShieldCheck,
  X,
  Edit3,
  Check,
  Award,
  QrCode,
  Copy,
  ExternalLink,
  Stethoscope,
  Share2,
  Star,
  CreditCard,
  Gift,
  Send,
  Ticket,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  PackagePlus,
  Layers
} from 'lucide-react';
import {
  B2BContract,
  B2CDeal,
  Branch,
  BranchId,
  ReferralRecord,
  MedicalPartner,
  PartnerCommissionPayout,
  PartnerCategory,
  Patient,
  MedicalPackage
} from '../types';
import {
  mockMedicalPartners,
  mockPartnerPayouts,
  mockReferrals,
  mockMedicalPackages
} from '../data/mockData';

interface SalesExcellenceViewProps {
  b2bContracts: B2BContract[];
  b2cDeals: B2CDeal[];
  branches: Branch[];
  currentBranchId: BranchId;
  referrals?: ReferralRecord[];
  partners?: MedicalPartner[];
  partnerPayouts?: PartnerCommissionPayout[];
  patients?: Patient[];
  onUpdateB2BStage: (contractId: string, newStage: B2BContract['stage']) => void;
  onUpdateB2CStage: (dealId: string, newStage: B2CDeal['stage']) => void;
  onAddNewB2BContract: (contract: B2BContract) => void;
  onAddNewB2CDeal: (deal: B2CDeal) => void;
  onAddNewReferral?: (referral: Omit<ReferralRecord, 'id'>) => void;
  onAddNewPartner?: (partner: MedicalPartner) => void;
  onAddNewPayout?: (payout: PartnerCommissionPayout) => void;
  onUpdateReferralStatus?: (referralId: string, status: 'Đã chi trả' | 'Chờ đối soát') => void;
  onSelectPatient?: (patientId: string) => void;
}

const COMMON_B2C_SERVICES = [
  'Gói Sinh Mổ Trọn Gói Phòng Tổng Thống VIP',
  'Gói Sinh Thường An Toàn Tiêu Chuẩn Quốc Tế',
  'Gói Tầm Soát Ung Thư Toàn Thân Toàn Diện (MRI + CT 128 lát)',
  'Liệu trình Nâng Cơ Trẻ Hóa Da Ultherapy & Thermage Toàn Mặt',
  'Gói Phẫu Thuật Cột Sống & Thoát Vị Đĩa Đệm Không Đau',
  'Gói Tầm Soát Tim Mạch & Đột Quỵ Chuyên Sâu',
  'Nha Khoa Thẩm Mỹ Dán Sứ Veneer Emax Siêu Mỏng',
  'Gói Phẫu Thuật Mổ Trĩ Laser Công Nghệ Cao Không Chảy Máu',
  'Gói Tầm Soát Sức Khỏe Tiền Hôn Nhân VIP'
];

const COMMON_B2B_PACKAGES = [
  'Gói Khám VIP Executive & Tầm Soát Ung Thư Chuyên Sâu',
  'Gói Khám Sức Khỏe Định Kỳ Tiêu Chuẩn Thông Tư 14/BYT',
  'Gói Tầm Soát Bệnh Nghề Nghiệp & Bụi Phổi Khối Nhà Máy',
  'Gói Khám Sức Khỏe Cao Cấp Cán Bộ Lãnh Đạo (C-Level)',
  'Gói KSK Định Kỳ & Tầm Soát Phụ Khoa Toàn Diện Cho Nữ CBNV'
];

const B2C_SOURCES = [
  'Facebook Fanpage / Ads',
  'Zalo Official Account',
  'Website & Google Search',
  'Hotline Tổng Đài 1900',
  'Bác Sĩ Chỉ Định / Giới Thiệu (CTV)',
  'Cộng Tác Viên Y Tế / Referral',
  'Khách Hàng Thân Thiết (VIP)',
  'Tiếp Đón Trực Tiếp Tại Quầy',
  'Sự Kiện Hội Thảo Y Tế'
];

export const SalesExcellenceView: React.FC<SalesExcellenceViewProps> = ({
  b2bContracts = [],
  b2cDeals = [],
  branches = [],
  currentBranchId = 'ALL',
  referrals = mockReferrals,
  partners = mockMedicalPartners,
  partnerPayouts = mockPartnerPayouts,
  patients = [],
  onUpdateB2BStage,
  onUpdateB2CStage,
  onAddNewB2BContract,
  onAddNewB2CDeal,
  onAddNewReferral,
  onAddNewPartner,
  onAddNewPayout,
  onUpdateReferralStatus,
  onSelectPatient
}) => {
  // Main sub-tabs: B2B (Doanh nghiệp), B2C (Cơ hội cá nhân), Packages (Danh mục gói khám)
  const [activeSubTab, setActiveSubTab] = useState<'b2b' | 'b2c' | 'packages'>('b2b');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedB2BDetail, setSelectedB2BDetail] = useState<B2BContract | null>(null);
  const [selectedB2CDetail, setSelectedB2CDetail] = useState<B2CDeal | null>(null);

  // Medical Packages & Services State & Management
  const [packages, setPackages] = useState<MedicalPackage[]>(mockMedicalPackages);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MedicalPackage | null>(null);
  const [packageTypeFilter, setPackageTypeFilter] = useState<'ALL' | 'package' | 'single'>('ALL');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string>('ALL');
  const [packageSearch, setPackageSearch] = useState('');

  // Package / Service Form State
  const [pkgType, setPkgType] = useState<'package' | 'single'>('package');
  const [pkgCode, setPkgCode] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgCategory, setPkgCategory] = useState('Tầm Soát Ung Thư');
  const [pkgPrice, setPkgPrice] = useState<number>(5000000);
  const [pkgDiscountPrice, setPkgDiscountPrice] = useState<number>(4500000);
  const [pkgUnit, setPkgUnit] = useState('Gói trọn gói');
  const [pkgInsuranceCovered, setPkgInsuranceCovered] = useState(false);
  const [pkgInsuranceCoveragePercent, setPkgInsuranceCoveragePercent] = useState<number>(80);
  const [pkgExecutionTime, setPkgExecutionTime] = useState('2 - 3 giờ');
  const [pkgPreparationNotes, setPkgPreparationNotes] = useState('');
  const [pkgTargetGender, setPkgTargetGender] = useState<'Tất cả' | 'Nam' | 'Nữ'>('Tất cả');
  const [pkgTargetAgeRange, setPkgTargetAgeRange] = useState('Mọi lứa tuổi');
  const [pkgDepartment, setPkgDepartment] = useState('Trung Tâm Tầm Soát & Chẩn Đoán Hình Ảnh');
  const [pkgItemsText, setPkgItemsText] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');

  // Modals for B2C and B2B
  const [isAddB2CModalOpen, setIsAddB2CModalOpen] = useState(false);
  const [isAddB2BModalOpen, setIsAddB2BModalOpen] = useState(false);

  // CTV & Referral Modals & State
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

  // New Partner Form State
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

  // New Referral Form State
  const [selectedPartnerId, setSelectedPartnerId] = useState(partners[0]?.id || '');
  const [patientReferredName, setPatientReferredName] = useState('Trần Văn Bình');
  const [patientReferredPhone, setPatientReferredPhone] = useState('0909 112 334');
  const [serviceUsed, setServiceUsed] = useState('Gói Tầm Soát Đột Quỵ Não & Chụp MRI 1.5 Tesla');
  const [billAmount, setBillAmount] = useState<number>(12500000);
  const [referralNotes, setReferralNotes] = useState('Bác sĩ phòng khám tuyến cơ sở chỉ định chuyển viện thực hiện Chẩn đoán hình ảnh chuyên sâu');

  // New Payout Form State
  const [payoutPartnerId, setPayoutPartnerId] = useState(partners[0]?.id || '');
  const [payoutPeriod, setPayoutPeriod] = useState('Kỳ T08/2026 (Đợt 2)');

  // B2C Form State
  const [b2cCustomerName, setB2cCustomerName] = useState('');
  const [b2cPhone, setB2cPhone] = useState('');
  const [b2cEmail, setB2cEmail] = useState('');
  const [b2cGender, setB2cGender] = useState('Nữ');
  const [b2cAge, setB2cAge] = useState('32');
  const [b2cAddress, setB2cAddress] = useState('');
  const [b2cServiceInterest, setB2cServiceInterest] = useState(COMMON_B2C_SERVICES[0]);
  const [b2cEstimatedValue, setB2cEstimatedValue] = useState<number>(45000000);
  const [b2cStage, setB2cStage] = useState<B2CDeal['stage']>('Mới tiếp nhận');
  const [b2cProbability, setB2cProbability] = useState<number>(60);
  const [b2cSource, setB2cSource] = useState(B2C_SOURCES[0]);
  const [b2cAssignedStaff, setB2cAssignedStaff] = useState('BS. Phạm Diệu Linh');
  const [b2cNextFollowUpDate, setB2cNextFollowUpDate] = useState('2026-08-22');
  const [b2cNotes, setB2cNotes] = useState('');

  // B2B Form State
  const [b2bCompanyName, setB2bCompanyName] = useState('');
  const [b2bTaxCode, setB2bTaxCode] = useState('');
  const [b2bContactPerson, setB2bContactPerson] = useState('');
  const [b2bPhone, setB2bPhone] = useState('');
  const [b2bEmail, setB2bEmail] = useState('');
  const [b2bPackageType, setB2bPackageType] = useState(COMMON_B2B_PACKAGES[0]);
  const [b2bEmployeeCount, setB2bEmployeeCount] = useState<number>(250);
  const [b2bTotalValue, setB2bTotalValue] = useState<number>(350000000);
  const [b2bPaidAmount, setB2bPaidAmount] = useState<number>(100000000);
  const [b2bStage, setB2bStage] = useState<B2BContract['stage']>('Tư vấn nhu cầu');
  const [b2bESignStatus, setB2bESignStatus] = useState('Chờ đối tác ký');
  const [b2bSalesRep, setB2bSalesRep] = useState('Lê Thu Hà (Phòng Kinh Doanh B2B)');
  const [b2bStartDate, setB2bStartDate] = useState('2026-09-01');
  const [b2bEndDate, setB2bEndDate] = useState('2026-10-15');
  const [b2bNotes, setB2bNotes] = useState('');

  // Metrics Calculations
  const totalB2BValue = (b2bContracts || []).reduce((acc, c) => acc + (c?.totalValue || 0), 0);
  const totalPartnerCount = (partners || []).length;
  const totalReferredPatients = (partners || []).reduce((acc, p) => acc + (p.totalPatientsReferred || 0), 0);
  const totalPartnerRevenue = (partners || []).reduce((acc, p) => acc + (p.totalRevenueGenerated || 0), 0);
  const totalCommissionEarned = (partners || []).reduce((acc, p) => acc + (p.totalCommissionEarned || 0), 0);
  const totalCommissionPaid = (partners || []).reduce((acc, p) => acc + (p.totalCommissionPaid || 0), 0);
  const totalPendingBalance = (partners || []).reduce((acc, p) => acc + (p.pendingBalance || 0), 0);

  // Copy helper
  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  // Filtered partners
  const filteredPartners = (partners || []).filter(p => {
    const matchSearch = p.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.phone.includes(partnerSearch) ||
      p.workplace.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.referralCode.toLowerCase().includes(partnerSearch.toLowerCase());
    const matchCat = partnerCategoryFilter === 'ALL' || p.category === partnerCategoryFilter;
    return matchSearch && matchCat;
  });

  // Filtered referrals
  const filteredReferrals = (referrals || []).filter(r => {
    const matchSearch = r.referrerName.toLowerCase().includes(referralSearch.toLowerCase()) ||
      r.patientReferredName.toLowerCase().includes(referralSearch.toLowerCase()) ||
      r.serviceUsed.toLowerCase().includes(referralSearch.toLowerCase()) ||
      (r.patientPhone && r.patientPhone.includes(referralSearch));
    const matchStatus = referralStatusFilter === 'ALL' || r.status === referralStatusFilter;
    return matchSearch && matchStatus;
  });

  // B2C Pipeline stages
  const b2cStages: B2CDeal['stage'][] = [
    'Mới tiếp nhận',
    'Tư vấn chuyên môn',
    'Gửi báo giá',
    'Đã đặt cọc',
    'Đã thực hiện DV',
    'Chăm sóc hậu mãi'
  ];

  // Handle Submit B2C Form
  const handleSubmitB2C = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2cCustomerName.trim()) {
      alert('Vui lòng nhập Họ và tên khách hàng!');
      return;
    }
    if (!b2cPhone.trim()) {
      alert('Vui lòng nhập Số điện thoại liên hệ!');
      return;
    }

    const newDeal: B2CDeal = {
      id: `B2C-${Date.now()}`,
      customerName: b2cCustomerName.trim(),
      customerPhone: b2cPhone.trim(),
      phone: b2cPhone.trim(),
      serviceInterest: b2cServiceInterest,
      estimatedValue: Number(b2cEstimatedValue) || 0,
      stage: b2cStage,
      probability: Number(b2cProbability) || 50,
      source: b2cSource,
      assignedStaff: b2cAssignedStaff,
      assignedConsultant: b2cAssignedStaff,
      nextFollowUpDate: b2cNextFollowUpDate,
      lastContactDate: new Date().toISOString().substring(0, 10),
      createdAt: new Date().toISOString().substring(0, 10)
    };

    onAddNewB2CDeal(newDeal);
    setIsAddB2CModalOpen(false);

    // Reset Form
    setB2cCustomerName('');
    setB2cPhone('');
    setB2cEmail('');
    setB2cAddress('');
    setB2cNotes('');
    setB2cEstimatedValue(45000000);
  };

  // Handle Submit B2B Form
  const handleSubmitB2B = (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2bCompanyName.trim()) {
      alert('Vui lòng nhập Tên doanh nghiệp / Đơn vị!');
      return;
    }
    if (!b2bContactPerson.trim()) {
      alert('Vui lòng nhập Người đại diện liên hệ!');
      return;
    }

    const totalVal = Number(b2bTotalValue) || 0;
    const paidVal = Number(b2bPaidAmount) || 0;
    const debtVal = Math.max(0, totalVal - paidVal);

    const newContract: B2BContract = {
      id: `B2B-${Date.now()}`,
      code: `HĐ-2026-KSK${Math.floor(100 + Math.random() * 900)}`,
      companyName: b2bCompanyName.trim(),
      taxCode: b2bTaxCode.trim() || '0101234567',
      contactPerson: b2bContactPerson.trim(),
      phone: b2bPhone.trim() || '0901234567',
      email: b2bEmail.trim() || 'contact@company.com',
      packageType: b2bPackageType,
      employeeCount: Number(b2bEmployeeCount) || 100,
      examinedCount: 0,
      totalValue: totalVal,
      paidAmount: paidVal,
      debtAmount: debtVal,
      stage: b2bStage,
      eSignStatus: b2bESignStatus,
      salesRep: b2bSalesRep,
      startDate: b2bStartDate,
      endDate: b2bEndDate,
      notes: b2bNotes.trim() || 'Hợp đồng tạo mới qua hệ thống quản lý kinh doanh'
    };

    onAddNewB2BContract(newContract);
    setIsAddB2BModalOpen(false);

    // Reset Form
    setB2bCompanyName('');
    setB2bTaxCode('');
    setB2bContactPerson('');
    setB2bPhone('');
    setB2bEmail('');
    setB2bNotes('');
  };

  // Package & Single Service Management Handlers
  const handleOpenCreatePackage = (type: 'package' | 'single' = 'package') => {
    setEditingPackage(null);
    const nextNum = packages.length + 1;
    setPkgType(type);
    if (type === 'single') {
      setPkgCode(`DV-CLS-${nextNum < 10 ? '0' + nextNum : nextNum}`);
      setPkgName('');
      setPkgCategory('Chẩn Đoán Hình Ảnh');
      setPkgPrice(1800000);
      setPkgDiscountPrice(1600000);
      setPkgUnit('Ca chụp');
      setPkgInsuranceCovered(true);
      setPkgInsuranceCoveragePercent(80);
      setPkgExecutionTime('20 - 30 phút');
      setPkgPreparationNotes('Tháo bỏ trang sức kim loại trước khi vào phòng chụp.');
      setPkgTargetGender('Tất cả');
      setPkgTargetAgeRange('Mọi lứa tuổi');
      setPkgDepartment('Khoa Chẩn Đoán Hình Ảnh');
      setPkgItemsText('Thực hiện chụp kỹ thuật cao chuẩn quy trình Bộ Y Tế\nBác sĩ CKI Chẩn đoán hình ảnh phân tích và đọc kết quả\nTrả kết quả số hóa và lưu trữ hệ thống PACS');
      setPkgDescription('Dịch vụ kỹ thuật cận lâm sàng đơn lẻ phục vụ chẩn đoán chuyên sâu.');
    } else {
      setPkgCode(`VIP-GK-${nextNum < 10 ? '0' + nextNum : nextNum}`);
      setPkgName('');
      setPkgCategory('Tầm Soát Ung Thư');
      setPkgPrice(5000000);
      setPkgDiscountPrice(4500000);
      setPkgUnit('Gói trọn gói');
      setPkgInsuranceCovered(true);
      setPkgInsuranceCoveragePercent(50);
      setPkgExecutionTime('2 - 3 giờ');
      setPkgPreparationNotes('Nhịn ăn sáng tối thiểu 6-8 tiếng để làm xét nghiệm máu & siêu âm bụng.');
      setPkgTargetGender('Tất cả');
      setPkgTargetAgeRange('Từ 18 tuổi trở lên');
      setPkgDepartment('Trung Tâm Tầm Soát & Chẩn Đoán Hình Ảnh');
      setPkgItemsText('Khám lâm sàng tổng quát đa khoa\nChụp X-quang kỹ thuật số DR\nXét nghiệm công thức máu & sinh hóa chức năng\nSiêu âm tổng quát công nghệ cao\nTư vấn kết luận chuyên sâu cùng Bác sĩ Chuyên khoa');
      setPkgDescription('Gói khám sức khỏe và tầm soát phát hiện sớm các nguy cơ bệnh lý toàn diện.');
    }
    setIsAddPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: MedicalPackage) => {
    setEditingPackage(pkg);
    setPkgType(pkg.type || 'package');
    setPkgCode(pkg.code);
    setPkgName(pkg.name);
    setPkgCategory(pkg.category);
    setPkgPrice(pkg.price);
    setPkgDiscountPrice(pkg.discountPrice || pkg.price);
    setPkgUnit(pkg.unit || (pkg.type === 'single' ? 'Lượt khám' : 'Gói trọn gói'));
    setPkgInsuranceCovered(!!pkg.insuranceCovered);
    setPkgInsuranceCoveragePercent(pkg.insuranceCoveragePercent || 80);
    setPkgExecutionTime(pkg.executionTime || '');
    setPkgPreparationNotes(pkg.preparationNotes || '');
    setPkgTargetGender(pkg.targetGender);
    setPkgTargetAgeRange(pkg.targetAgeRange || 'Mọi lứa tuổi');
    setPkgDepartment(pkg.department);
    setPkgItemsText(pkg.items.join('\n'));
    setPkgDescription(pkg.description);
    setIsAddPackageModalOpen(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) {
      alert('Vui lòng nhập Tên gói khám hoặc Dịch vụ!');
      return;
    }
    const items = pkgItemsText
      .split('\n')
      .map(i => i.trim())
      .filter(Boolean);

    if (editingPackage) {
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? {
        ...p,
        type: pkgType,
        code: pkgCode.trim() || p.code,
        name: pkgName.trim(),
        category: pkgCategory,
        price: Number(pkgPrice) || 0,
        discountPrice: Number(pkgDiscountPrice) || undefined,
        unit: pkgUnit.trim() || (pkgType === 'single' ? 'Lượt' : 'Gói'),
        insuranceCovered: pkgInsuranceCovered,
        insuranceCoveragePercent: pkgInsuranceCovered ? Number(pkgInsuranceCoveragePercent) : 0,
        executionTime: pkgExecutionTime.trim(),
        preparationNotes: pkgPreparationNotes.trim(),
        targetGender: pkgTargetGender,
        targetAgeRange: pkgTargetAgeRange.trim(),
        department: pkgDepartment,
        items: items.length > 0 ? items : ['Khám lâm sàng tổng quát'],
        description: pkgDescription.trim()
      } : p));
    } else {
      const newPkg: MedicalPackage = {
        id: pkgType === 'single' ? `srv-${Date.now()}` : `pkg-${Date.now()}`,
        type: pkgType,
        code: pkgCode.trim() || `${pkgType === 'single' ? 'DV' : 'GK'}-${Math.floor(100 + Math.random() * 900)}`,
        name: pkgName.trim(),
        category: pkgCategory,
        price: Number(pkgPrice) || 0,
        discountPrice: Number(pkgDiscountPrice) || undefined,
        unit: pkgUnit.trim() || (pkgType === 'single' ? 'Lượt' : 'Gói'),
        insuranceCovered: pkgInsuranceCovered,
        insuranceCoveragePercent: pkgInsuranceCovered ? Number(pkgInsuranceCoveragePercent) : 0,
        executionTime: pkgExecutionTime.trim(),
        preparationNotes: pkgPreparationNotes.trim(),
        targetGender: pkgTargetGender,
        targetAgeRange: pkgTargetAgeRange.trim(),
        department: pkgDepartment,
        items: items.length > 0 ? items : ['Khám lâm sàng tổng quát'],
        description: pkgDescription.trim(),
        status: 'Đang áp dụng',
        createdDate: new Date().toISOString().substring(0, 10)
      };
      setPackages(prev => [newPkg, ...prev]);
    }
    setIsAddPackageModalOpen(false);
  };

  const handleDeletePackage = (pkgId: string, pkgName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa "${pkgName}" khỏi danh mục giá?`)) {
      setPackages(prev => prev.filter(p => p.id !== pkgId));
    }
  };

  const handleSelectPackageForB2C = (pkg: MedicalPackage) => {
    setB2cServiceInterest(pkg.name);
    if (pkg.price) {
      setB2cEstimatedValue(pkg.discountPrice || pkg.price);
    }
    setActiveSubTab('b2c');
    setIsAddB2CModalOpen(true);
  };

  const handleSelectPackageForB2B = (pkg: MedicalPackage) => {
    setB2bPackageType(pkg.name);
    if (pkg.price && b2bEmployeeCount) {
      setB2bTotalValue((pkg.discountPrice || pkg.price) * b2bEmployeeCount);
    }
    setActiveSubTab('b2b');
    setIsAddB2BModalOpen(true);
  };

  // Filtered packages and single services
  const filteredPackages = packages.filter(pkg => {
    const matchSearch = pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) ||
      pkg.code.toLowerCase().includes(packageSearch.toLowerCase()) ||
      pkg.department.toLowerCase().includes(packageSearch.toLowerCase()) ||
      (pkg.unit && pkg.unit.toLowerCase().includes(packageSearch.toLowerCase())) ||
      pkg.items.some(item => item.toLowerCase().includes(packageSearch.toLowerCase()));
    const matchCategory = packageCategoryFilter === 'ALL' || pkg.category === packageCategoryFilter;
    const matchType = packageTypeFilter === 'ALL' || (pkg.type || 'package') === packageTypeFilter;
    return matchSearch && matchCategory && matchType;
  });

  // Handle Create Partner
  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      alert('Vui lòng nhập Tên CTV / Bác sĩ!');
      return;
    }
    const codeSuffix = Math.floor(100 + Math.random() * 900);
    const prefix = partnerCategory.includes('Bác sĩ') ? 'CTV-BS' : partnerCategory.includes('Dược sĩ') ? 'CTV-DS' : partnerCategory.includes('Bảo hiểm') ? 'CTV-BH' : 'CTV-MED';
    const refCode = partnerName.split(' ').pop()?.toUpperCase() + '_' + Math.floor(100 + Math.random() * 900);

    const newPartner: MedicalPartner = {
      id: `partner-${Date.now()}`,
      code: `${prefix}-${codeSuffix}`,
      name: partnerName.trim(),
      title: partnerTitle,
      phone: partnerPhone.trim() || '0901122334',
      email: partnerEmail.trim() || 'partner@clinic.vn',
      category: partnerCategory,
      workplace: partnerWorkplace.trim() || 'Phòng khám đa khoa liên kết',
      specialtyOrField: partnerSpecialty,
      bankAccount: {
        bankName: partnerBankName,
        accountNumber: partnerBankAcc.trim() || '001100' + Math.floor(1000000 + Math.random() * 9000000),
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
    setPartnerName('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerWorkplace('');
  };

  // Handle Create Referral
  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientReferredName.trim()) {
      alert('Vui lòng nhập Họ tên bệnh nhân!');
      return;
    }
    const partner = (partners || []).find(p => p.id === selectedPartnerId) || partners[0];
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
        patientReferredName: patientReferredName.trim(),
        patientPhone: patientReferredPhone.trim(),
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

  // Handle Create Payout
  const handleCreatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = (partners || []).find(p => p.id === payoutPartnerId) || partners[0];
    if (!partner) return;
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

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Trị Kinh Doanh & Bán Hàng Y Tế
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              B2B Doanh Nghiệp • B2C Gói Khám VIP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị hợp đồng KSK đoàn doanh nghiệp, lịch khám đoàn và pipeline tư vấn phẫu thuật
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSubTab === 'b2b' && (
            <button
              onClick={() => setIsAddB2BModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Hợp Đồng B2B</span>
            </button>
          )}

          {activeSubTab === 'b2c' && (
            <button
              onClick={() => setIsAddB2CModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Cơ Hội B2C</span>
            </button>
          )}

          {activeSubTab === 'packages' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenCreatePackage('package')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tạo Gói Khám</span>
              </button>
              <button
                onClick={() => handleOpenCreatePackage('single')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Dịch Vụ Đơn Lẻ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip for Sales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Doanh Số Hợp Đồng B2B</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2 font-mono">
            {(totalB2BValue / 1e9).toFixed(2)} <span className="text-xs text-slate-500 font-sans font-normal">Tỷ VNĐ</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">{b2bContracts.length} hợp đồng doanh nghiệp</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Quy Mô Khám Đoàn</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2 font-mono">
            {(b2bContracts || []).reduce((acc, c) => acc + (c?.employeeCount || 0), 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans font-normal">CBNV</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Đã khám {(b2bContracts || []).reduce((acc, c) => acc + (c?.examinedCount || 0), 0).toLocaleString()} nhân viên</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Đã Thu Viện Phí B2B</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            {((b2bContracts || []).reduce((acc, c) => acc + (c?.paidAmount || 0), 0) / 1e9).toFixed(2)} <span className="text-xs text-slate-500 font-sans font-normal">Tỷ VNĐ</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Tỷ lệ thanh toán chuẩn SLA</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Pipeline Cơ Hội B2C</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {b2cDeals.length} <span className="text-xs text-slate-500 font-sans font-normal">cơ hội VIP</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Giá trị: {((b2cDeals || []).reduce((acc, d) => acc + (d?.estimatedValue || 0), 0) / 1e6).toFixed(0)} triệu VNĐ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-bold">Gói & Dịch Vụ CLS</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Stethoscope className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2 font-mono">
            {packages.length}
          </div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">
            {packages.filter(p => p.type !== 'single').length} Gói trọn gói • {packages.filter(p => p.type === 'single').length} Dịch vụ đơn lẻ
          </div>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher for Phòng Kinh Doanh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl shadow-xs gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('b2b')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'b2b'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>B2B: Khám Sức Khỏe Doanh Nghiệp ({b2bContracts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('b2c')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'b2c'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>B2C: Pipeline Gói Dịch Vụ & VIP ({b2cDeals.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('packages')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'packages'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Bảng Giá Gói Khám & Dịch Vụ Đơn Lẻ ({packages.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 pr-3 font-semibold hidden sm:block">
          {activeSubTab === 'b2b' && `Doanh số HĐ B2B: ${(totalB2BValue / 1e9).toFixed(2)} Tỷ VNĐ`}
          {activeSubTab === 'b2c' && `${b2cDeals.length} Cơ hội tư vấn cá nhân đang chăm sóc`}
          {activeSubTab === 'packages' && `${packages.filter(p => p.type !== 'single').length} Gói trọn gói • ${packages.filter(p => p.type === 'single').length} Dịch vụ đơn lẻ`}
        </div>
      </div>





      {/* ========================================================================= */}
      {/* SUB-TAB 4: B2C SALES PIPELINE (KANBAN) */}
      {/* ========================================================================= */}
      {activeSubTab === 'b2c' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Pipeline Cơ Hội Gói Dịch Vụ B2C Cá Nhân (Kanban)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào thẻ khách hàng để xem chi tiết hoặc bấm nút <strong className="text-blue-600">+ Thêm Cơ Hội B2C</strong> để tự tay nhập thông tin khách hàng mới.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm khách hàng, số điện thoại, gói..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                onClick={() => setIsAddB2CModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Cơ Hội B2C</span>
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="flex items-start gap-4 overflow-x-auto pb-6 pt-1 scrollbar-thin">
            {b2cStages.map((stage) => {
              const dealsInStage = b2cDeals
                .filter(d => d.stage === stage)
                .filter(d => 
                  d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (d.customerPhone && d.customerPhone.includes(searchTerm)) ||
                  (d.phone && d.phone.includes(searchTerm)) ||
                  d.serviceInterest.toLowerCase().includes(searchTerm.toLowerCase())
                );
              const stageValue = dealsInStage.reduce((acc, d) => acc + d.estimatedValue, 0);

              return (
                <div key={stage} className="w-[280px] shrink-0 bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-2.5 gap-2">
                    <span className="font-bold text-xs text-slate-900 tracking-tight">{stage}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold shrink-0 min-w-[20px] text-center">
                      {dealsInStage.length}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-blue-700 mb-2.5 px-1 font-mono flex items-center justify-between">
                    <span>{(stageValue / 1e6).toFixed(1)} tr đ</span>
                    <span className="text-[10px] font-normal text-slate-400">Dự kiến</span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[520px] pr-0.5">
                    {dealsInStage.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedB2CDetail(deal)}
                        className="bg-white border border-slate-200 hover:border-blue-400 p-3.5 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                            {deal.customerName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {deal.probability}%
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                          {deal.serviceInterest}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <span className="font-mono font-bold text-slate-900">
                            {(deal.estimatedValue / 1e6).toLocaleString()} tr
                          </span>
                          <span className="text-slate-400 truncate max-w-[110px]">{deal.source}</span>
                        </div>
                      </div>
                    ))}
                    {dealsInStage.length === 0 && (
                      <div className="py-10 text-center text-slate-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
                        Chưa có cơ hội
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: B2B DOANH NGHIỆP */}
      {/* ========================================================================= */}
      {activeSubTab === 'b2b' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Quản Trị Hợp Đồng Khám Sức Khỏe Doanh Nghiệp (B2B)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi tiến độ hợp đồng KSK đoàn, ký hợp đồng điện tử (E-Sign), tiến độ khám thực tế và thanh quyết toán viện phí.
              </p>
            </div>
            
            <button
              onClick={() => setIsAddB2BModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Hợp Đồng B2B Mới</span>
            </button>
          </div>

          {/* B2B Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Mã & Doanh Nghiệp</th>
                    <th className="py-3.5 px-4">Người Liên Hệ</th>
                    <th className="py-3.5 px-4">Gói Khám</th>
                    <th className="py-3.5 px-4">Quy Mô / Đã Khám</th>
                    <th className="py-3.5 px-4">Giá Trị Hợp Đồng</th>
                    <th className="py-3.5 px-4">Giai Đoạn</th>
                    <th className="py-3.5 px-4">Ký E-Sign</th>
                    <th className="py-3.5 px-4 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {b2bContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] text-blue-700 font-bold block">{c.code}</span>
                        <span className="font-bold text-slate-900 block">{c.companyName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{c.contactPerson}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{c.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate">
                        {c.packageType}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{c.employeeCount} CBNV</span>
                        <span className="text-emerald-700 font-semibold text-[11px]">Đã khám: {c.examinedCount}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{(c.totalValue / 1e6).toLocaleString()} tr</span>
                        <span className="text-amber-700 font-mono text-[11px]">Nợ: {(c.debtAmount / 1e6).toLocaleString()} tr</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.eSignStatus.includes('Đã ký') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.eSignStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedB2BDetail(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Xem
                        </button>
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
      {/* SUB-TAB 6: DANH MỤC GÓI KHÁM & DỊCH VỤ ĐƠN LẺ */}
      {/* ========================================================================= */}
      {activeSubTab === 'packages' && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>Bảng Giá Gói Khám Sức Khỏe & Dịch Vụ Cận Lâm Sàng Đơn Lẻ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý định giá gói khám trọn gói và dịch vụ kỹ thuật đơn lẻ (MRI, CT, Nội soi, Xét nghiệm, Khám CK, Nha khoa, Vắc xin...). Hỗ trợ xuất báo giá nhanh cho bệnh nhân & doanh nghiệp.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenCreatePackage('package')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo Gói Khám Mới</span>
                </button>

                <button
                  onClick={() => handleOpenCreatePackage('single')}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Dịch Vụ Đơn Lẻ</span>
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Type Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setPackageTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    packageTypeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({packages.length})
                </button>
                <button
                  onClick={() => setPackageTypeFilter('package')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    packageTypeFilter === 'package'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <span>📦 Gói trọn gói</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${packageTypeFilter === 'package' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {packages.filter(p => p.type !== 'single').length}
                  </span>
                </button>
                <button
                  onClick={() => setPackageTypeFilter('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    packageTypeFilter === 'single'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-sky-700'
                  }`}
                >
                  <span>⚡ Dịch vụ đơn lẻ & CLS</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${packageTypeFilter === 'single' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {packages.filter(p => p.type === 'single').length}
                  </span>
                </button>
              </div>

              {/* Search & Category */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    placeholder="Tìm theo tên gói, dịch vụ, mã, khoa..."
                    className="pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white w-56"
                  />
                </div>

                <select
                  value={packageCategoryFilter}
                  onChange={(e) => setPackageCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả danh mục ({packages.length})</option>
                  <optgroup label="Dịch Vụ Kỹ Thuật Đơn Lẻ & CLS">
                    <option value="Chẩn Đoán Hình Ảnh">Chẩn Đoán Hình Ảnh (MRI, CT, Siêu âm...)</option>
                    <option value="Nội Soi Tiêu Hóa">Nội Soi Tiêu Hóa (Dạ dày, Đại tràng NBI)</option>
                    <option value="Xét Nghiệm Y Khoa">Xét Nghiệm Y Khoa (Huyết học, Sinh hóa...)</option>
                    <option value="Khám Chuyên Khoa">Khám Chuyên Khoa & Chuyên Gia</option>
                    <option value="Nha Khoa & Thẩm Mỹ">Nha Khoa & Thẩm Mỹ</option>
                    <option value="Tiêm Chủng Vắc Xin">Tiêm Chủng Vắc Xin</option>
                  </optgroup>
                  <optgroup label="Gói Khám Trọn Gói">
                    <option value="Tầm Soát Ung Thư">Tầm Soát Ung Thư</option>
                    <option value="Khám Đoàn Doanh Nghiệp (B2B)">Khám Đoàn Doanh Nghiệp (B2B)</option>
                    <option value="Sức Khỏe Phụ Nữ & Mẹ Bé">Sức Khỏe Phụ Nữ & Mẹ Bé</option>
                    <option value="Tim Mạch & Đột Quỵ">Tim Mạch & Đột Quỵ</option>
                    <option value="Chuyên Khoa Sâu">Chuyên Khoa Sâu</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPackages.map((pkg) => {
              const isSingle = pkg.type === 'single';
              const hasDiscount = pkg.discountPrice && pkg.discountPrice < pkg.price;
              const discountPercent = hasDiscount && pkg.discountPrice
                ? Math.round(((pkg.price - pkg.discountPrice) / pkg.price) * 100)
                : 0;

              return (
                <div
                  key={pkg.id}
                  className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 group ${
                    isSingle
                      ? 'border-slate-200 hover:border-sky-400'
                      : 'border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Code, Type Badge, Category, Insurance */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {pkg.code}
                        </span>

                        {isSingle ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                            <span>⚡ Đơn lẻ</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span>📦 Trọn gói</span>
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {pkg.category}
                        </span>
                      </div>

                      {pkg.insuranceCovered ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200" title="Bảo hiểm y tế hỗ trợ thanh toán">
                          BHYT {pkg.insuranceCoveragePercent || 80}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200">
                          Tự nguyện
                        </span>
                      )}
                    </div>

                    {/* Package / Service Name */}
                    <h4 className={`font-bold text-sm text-slate-900 transition-colors leading-snug ${
                      isSingle ? 'group-hover:text-sky-700' : 'group-hover:text-emerald-700'
                    }`}>
                      {pkg.name}
                    </h4>

                    {/* Department & Meta */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{pkg.department}</span>
                      </div>
                      <span className="shrink-0 text-slate-400 text-[10px]">
                        {pkg.targetGender} • {pkg.targetAgeRange || 'Mọi lứa tuổi'}
                      </span>
                    </div>

                    {/* Price & Unit Bar */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Đơn giá {pkg.unit ? `(${pkg.unit})` : isSingle ? '(Lượt)' : '(Gói)'}:
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`font-mono font-bold text-sm ${
                            hasDiscount
                              ? isSingle ? 'text-sky-700 text-base' : 'text-emerald-700 text-base'
                              : 'text-slate-900'
                          }`}>
                            {((pkg.discountPrice || pkg.price)).toLocaleString()} VNĐ
                          </span>
                          {hasDiscount && (
                            <span className="font-mono text-[11px] text-slate-400 line-through">
                              {pkg.price.toLocaleString()} đ
                            </span>
                          )}
                        </div>
                      </div>
                      {hasDiscount && (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                          Giảm {discountPercent}%
                        </span>
                      )}
                    </div>

                    {/* Execution Time & Prep Notes */}
                    {(pkg.executionTime || pkg.preparationNotes) && (
                      <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-2 space-y-1 text-[11px] text-amber-900">
                        {pkg.executionTime && (
                          <div className="flex items-center gap-1 font-semibold text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Thời gian: {pkg.executionTime}</span>
                          </div>
                        )}
                        {pkg.preparationNotes && (
                          <div className="flex items-start gap-1 text-[10.5px] text-amber-700 leading-tight">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>Lưu ý: {pkg.preparationNotes}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clinical Items Checklist */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>{isSingle ? 'Nội dung kỹ thuật & quy trình:' : 'Danh mục xét nghiệm & CĐHA:'} ({pkg.items.length})</span>
                      </div>
                      <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {pkg.items.map((item, idx) => (
                          <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isSingle ? 'text-sky-600' : 'text-emerald-600'
                            }`} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Description */}
                    {pkg.description && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>

                      <button
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Xóa khỏi danh mục"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>

                      <button
                        onClick={() => {
                          const quoteText = `BÁO GIÁ Y TẾ: ${pkg.name}\n- Mã dịch vụ: ${pkg.code}\n- Loại hình: ${pkg.type === 'single' ? 'Dịch vụ đơn lẻ' : 'Gói khám trọn gói'}\n- Đơn vị tính: ${pkg.unit || (pkg.type === 'single' ? 'Lượt' : 'Gói')}\n- Giá niêm yết: ${pkg.price.toLocaleString()} VNĐ\n- Giá ưu đãi: ${(pkg.discountPrice || pkg.price).toLocaleString()} VNĐ\n- BHYT: ${pkg.insuranceCovered ? `Hỗ trợ ${pkg.insuranceCoveragePercent || 80}%` : 'Tự nguyện'}\n- Khoa thực hiện: ${pkg.department}\n${pkg.executionTime ? `- Thời gian thực hiện: ${pkg.executionTime}\n` : ''}${pkg.preparationNotes ? `- Lưu ý chuẩn bị: ${pkg.preparationNotes}\n` : ''}- Danh mục kỹ thuật:\n  + ${pkg.items.join('\n  + ')}`;
                          navigator.clipboard.writeText(quoteText);
                          alert(`Đã sao chép báo giá "${pkg.name}" vào bộ nhớ tạm!`);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Sao chép tóm tắt báo giá gửi khách"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSelectPackageForB2C(pkg)}
                        className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="Tạo Deal tư vấn B2C"
                      >
                        + Deal B2C
                      </button>
                      <button
                        onClick={() => handleSelectPackageForB2B(pkg)}
                        className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="Tạo Hợp đồng B2B"
                      >
                        + HĐ B2B
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPackages.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Không tìm thấy gói khám hoặc dịch vụ phù hợp</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bạn có thể thử tìm từ khóa khác hoặc bấm một trong các nút bên dưới để tạo gói khám hoặc thêm dịch vụ đơn lẻ mới.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenCreatePackage('package')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo Gói Khám Trọn Gói</span>
                </button>
                <button
                  onClick={() => handleOpenCreatePackage('single')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Dịch Vụ Đơn Lẻ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: THÊM CƠ HỘI B2C MỚI */}
      {/* ========================================================================= */}
      {isAddB2CModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm Cơ Hội B2C Cá Nhân Mới</h3>
                <p className="text-xs text-slate-500">Gõ tên gói khám tùy ý hoặc chọn từ danh mục có sẵn</p>
              </div>
              <button onClick={() => setIsAddB2CModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitB2C} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Họ và tên khách hàng *:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Thị Lan Anh"
                    value={b2cCustomerName}
                    onChange={(e) => setB2cCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số điện thoại liên hệ *:</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={b2cPhone}
                    onChange={(e) => setB2cPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Free text input for Package Name with datalist and quick pick chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Gói dịch vụ / Gói khám quan tâm *:</label>
                  <span className="text-[11px] text-blue-600 font-medium">Bạn có thể tự do gõ tên gói hoặc chọn gợi ý</span>
                </div>
                <input
                  type="text"
                  required
                  list="b2c-packages-datalist"
                  placeholder="Gõ tên gói khám tùy ý (VD: Gói Tầm Soát Ung Thư Toàn Diện MRI 1.5T...)"
                  value={b2cServiceInterest}
                  onChange={(e) => setB2cServiceInterest(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="b2c-packages-datalist">
                  {packages.map(p => (
                    <option key={p.id} value={p.name}>{p.code} - {(p.price / 1e6).toFixed(1)} triệu đ ({p.department})</option>
                  ))}
                  {COMMON_B2C_SERVICES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </datalist>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {packages.slice(0, 4).map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => {
                        setB2cServiceInterest(pkg.name);
                        if (pkg.price) setB2cEstimatedValue(pkg.discountPrice || pkg.price);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer text-left"
                      title="Bấm để điền nhanh"
                    >
                      + {pkg.name.length > 35 ? pkg.name.substring(0, 35) + '...' : pkg.name} ({(pkg.price / 1e6).toFixed(1)}tr)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giá trị dự kiến (VNĐ):</label>
                  <input
                    type="number"
                    step={1000000}
                    value={b2cEstimatedValue}
                    onChange={(e) => setB2cEstimatedValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nguồn tiếp cận:</label>
                  <select
                    value={b2cSource}
                    onChange={(e) => setB2cSource(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {B2C_SOURCES.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddB2CModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Thêm Cơ Hội B2C
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: THÊM HỢP ĐỒNG B2B */}
      {/* ========================================================================= */}
      {isAddB2BModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo Hợp Đồng Khám Sức Khỏe Doanh Nghiệp (B2B)</h3>
                <p className="text-xs text-slate-500">Gõ tên gói khám đoàn tùy ý hoặc chọn từ danh mục có sẵn</p>
              </div>
              <button onClick={() => setIsAddB2BModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitB2B} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tên doanh nghiệp / Đơn vị *:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tập đoàn FPT - Khối Phần mềm"
                    value={b2bCompanyName}
                    onChange={(e) => setB2bCompanyName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã số thuế:</label>
                  <input
                    type="text"
                    placeholder="0101234567"
                    value={b2bTaxCode}
                    onChange={(e) => setB2bTaxCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Người liên hệ đại diện *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Trần Thu Hương (Trưởng Ban Nhân sự)"
                    value={b2bContactPerson}
                    onChange={(e) => setB2bContactPerson(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số điện thoại liên hệ *:</label>
                  <input
                    type="tel"
                    required
                    placeholder="0901 234 567"
                    value={b2bPhone}
                    onChange={(e) => setB2bPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Free text input for B2B Package Name with datalist and quick pick chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Gói khám lựa chọn / Thiết kế riêng *:</label>
                  <span className="text-[11px] text-blue-600 font-medium">Bạn có thể tự do gõ tên gói hoặc chọn gợi ý</span>
                </div>
                <input
                  type="text"
                  required
                  list="b2b-packages-datalist"
                  placeholder="Gõ tên gói khám đoàn (VD: Gói Khám Sức Khỏe Định Kỳ Tiêu Chuẩn Thông Tư 14...)"
                  value={b2bPackageType}
                  onChange={(e) => setB2bPackageType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="b2b-packages-datalist">
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.name}>{pkg.code} - {(pkg.price / 1e6).toFixed(1)} tr/người</option>
                  ))}
                  {COMMON_B2B_PACKAGES.map(pkg => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </datalist>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {packages.filter(p => p.category.includes('B2B') || p.category.includes('Doanh Nghiệp') || p.category.includes('Tầm Soát')).slice(0, 4).map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => {
                        setB2bPackageType(pkg.name);
                        if (pkg.price && b2bEmployeeCount) {
                          setB2bTotalValue((pkg.discountPrice || pkg.price) * b2bEmployeeCount);
                        }
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer text-left"
                      title="Bấm để điền nhanh"
                    >
                      + {pkg.name.length > 35 ? pkg.name.substring(0, 35) + '...' : pkg.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số lượng CBNV khám:</label>
                  <input
                    type="number"
                    min={10}
                    value={b2bEmployeeCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setB2bEmployeeCount(count);
                      // Auto-calculate if price exists
                      const matchedPkg = packages.find(p => p.name === b2bPackageType);
                      if (matchedPkg) {
                        setB2bTotalValue((matchedPkg.discountPrice || matchedPkg.price) * count);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Tổng giá trị hợp đồng (VNĐ):</label>
                  <input
                    type="number"
                    step={10000000}
                    value={b2bTotalValue}
                    onChange={(e) => setB2bTotalValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddB2BModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Tạo Hợp Đồng B2B
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TẠO / SỬA GÓI KHÁM & DỊCH VỤ ĐƠN LẺ */}
      {/* ========================================================================= */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className={`w-5 h-5 ${pkgType === 'single' ? 'text-sky-600' : 'text-emerald-600'}`} />
                  <span>
                    {editingPackage
                      ? `Chỉnh Sửa ${pkgType === 'single' ? 'Dịch Vụ Đơn Lẻ' : 'Gói Khám'}`
                      : `Tạo Mới ${pkgType === 'single' ? 'Dịch Vụ Cận Lâm Sàng Đơn Lẻ' : 'Gói Khám Sức Khỏe'}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {pkgType === 'single'
                    ? 'Khai báo dịch vụ kỹ thuật đơn lẻ (MRI, CT, Nội soi, Xét nghiệm, Khám CK) kèm chính sách BHYT & đơn vị tính'
                    : 'Thiết lập gói khám trọn gói, cơ cấu dịch vụ xét nghiệm chi tiết và đơn giá ưu đãi'}
                </p>
              </div>
              <button
                onClick={() => setIsAddPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Selector (Gói trọn gói vs Dịch vụ đơn lẻ) */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setPkgType('package');
                  if (!pkgName || pkgName.includes('Chụp') || pkgName.includes('Xét nghiệm') || pkgName.includes('Nội soi')) {
                    setPkgUnit('Gói trọn gói');
                    setPkgCategory('Tầm Soát Ung Thư');
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  pkgType === 'package'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📦 Gói Khám Sức Khỏe Trọn Gói</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPkgType('single');
                  if (!pkgName || pkgName.includes('Gói')) {
                    setPkgUnit('Lượt khám');
                    setPkgCategory('Chẩn Đoán Hình Ảnh');
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  pkgType === 'single'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡ Dịch Vụ Đơn Lẻ & Cận Lâm Sàng</span>
              </button>
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                <span>Gợi ý mẫu nhanh ({pkgType === 'single' ? 'Dịch vụ đơn lẻ' : 'Gói trọn gói'}):</span>
                <span className="text-[10px] text-slate-400">Bấm để điền mẫu nhanh</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {pkgType === 'single' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPkgName('Chụp MRI Khớp Gối Không Tiêm Thuốc (1.5 Tesla)');
                        setPkgCategory('Chẩn Đoán Hình Ảnh');
                        setPkgPrice(2200000);
                        setPkgDiscountPrice(2000000);
                        setPkgUnit('Ca chụp');
                        setPkgInsuranceCovered(true);
                        setPkgInsuranceCoveragePercent(80);
                        setPkgExecutionTime('25 - 35 phút');
                        setPkgPreparationNotes('Tháo bỏ vật dụng kim loại, mang theo phim chụp cũ nếu có.');
                        setPkgDepartment('Khoa Chẩn Đoán Hình Ảnh');
                        setPkgItemsText('Chụp đa chuỗi xung T1, T2, PD Fat-Sat độ phân giải cao\nBác sĩ CKI CĐHA đọc và hội chẩn tổn thương sụn chêm, dây chằng\nTrả kết quả đĩa DICOM & mã QR tra cứu PACS');
                        setPkgDescription('Khảo sát tổn thương dây chằng, rách sụn chêm và dịch ổ khớp gối.');
                      }}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + Chụp MRI Khớp Gối
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPkgName('Nội Soi Thực Quản - Dạ Dày - Tá Tràng NBI Không Đau (Gây Mê)');
                        setPkgCategory('Nội Soi Tiêu Hóa');
                        setPkgPrice(1800000);
                        setPkgDiscountPrice(1650000);
                        setPkgUnit('Lượt nội soi');
                        setPkgInsuranceCovered(true);
                        setPkgInsuranceCoveragePercent(80);
                        setPkgExecutionTime('30 - 45 phút (bao gồm hồi tỉnh)');
                        setPkgPreparationNotes('Nhịn ăn uống hoàn toàn tối thiểu 6-8 tiếng trước khi làm thủ thuật.');
                        setPkgDepartment('Trung Tâm Nội Soi & Can Thiệp Tiêu Hóa');
                        setPkgItemsText('Khám tiền mê an toàn trước nội soi\nNội soi ống mềm nhuộm màu dải tần hẹp NBI phóng đại\nTest vi khuẩn HP dạ dày nhanh (Clo-test)\nTheo dõi hồi tỉnh tại phòng lưu chuyên biệt');
                        setPkgDescription('Tầm soát sớm tổn thương tiền ung thư dạ dày và vi khuẩn HP dạ dày không đau.');
                      }}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + Nội Soi Dạ Dày NBI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPkgName('Xét Nghiệm Bộ Chỉ Số Chức Năng Gan & Thận Toàn Diện');
                        setPkgCategory('Xét Nghiệm Y Khoa');
                        setPkgPrice(650000);
                        setPkgDiscountPrice(550000);
                        setPkgUnit('Mẫu xét nghiệm');
                        setPkgInsuranceCovered(true);
                        setPkgInsuranceCoveragePercent(100);
                        setPkgExecutionTime('60 - 90 phút');
                        setPkgPreparationNotes('Nhịn ăn sáng, có thể uống một ít nước lọc tinh khiết.');
                        setPkgDepartment('Khoa Xét Nghiệm & Hóa Sinh Y Học');
                        setPkgItemsText('Men gan AST, ALT, GGT, Bilirubin toàn phần/trực tiếp\nĐịnh lượng Ure, Creatinine máu & tính mức lọc cầu thận eGFR\nPhân tích tổng thể men gan và lọc cầu thận');
                        setPkgDescription('Đánh giá chức năng thải độc gan và mức độ lọc cầu thận định kỳ.');
                      }}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + XN Gan & Thận
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPkgName('Gói Khám Sức Khỏe Tổng Quát Định Kỳ Tiêu Chuẩn Thông Tư 14');
                        setPkgCategory('Khám Đoàn Doanh Nghiệp (B2B)');
                        setPkgPrice(1500000);
                        setPkgDiscountPrice(1200000);
                        setPkgUnit('Gói/Người');
                        setPkgInsuranceCovered(false);
                        setPkgExecutionTime('1.5 - 2 giờ');
                        setPkgPreparationNotes('Nhịn ăn sáng, mang theo hồ sơ sức khỏe năm trước.');
                        setPkgDepartment('Trung Tâm Y Học Lao Động & Khám Sức Khỏe Đoàn');
                        setPkgItemsText('Khám nội ngoại, da liễu, mắt, tai mũi họng, răng hàm mặt\nChụp X-quang tim phổi thẳng kỹ thuật số\nXét nghiệm huyết học công thức máu 18 thông số\nXét nghiệm đường huyết Glucose & men gan AST/ALT\nTổng phân tích nước tiểu 10 thông số');
                        setPkgDescription('Đáp ứng đầy đủ quy chuẩn khám sức khỏe định kỳ theo Thông tư 14/2013/TT-BYT.');
                      }}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + Gói KSK Đoàn TT14
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPkgName('Gói Tầm Soát Ung Thư Toàn Diện Phái Đẹp VIP Platinum');
                        setPkgCategory('Sức Khỏe Phụ Nữ & Mẹ Bé');
                        setPkgPrice(8500000);
                        setPkgDiscountPrice(7500000);
                        setPkgUnit('Gói trọn gói');
                        setPkgInsuranceCovered(true);
                        setPkgInsuranceCoveragePercent(60);
                        setPkgExecutionTime('3 - 4 giờ');
                        setPkgPreparationNotes('Khám sau khi sạch kinh 3-5 ngày, nhịn ăn sáng.');
                        setPkgDepartment('Trung Tâm Chăm Sóc Sức Khỏe Phụ Nữ & Tầm Soát Ung Thư');
                        setPkgItemsText('Khám Phụ khoa & soi cổ tử cung kỹ thuật số\nXét nghiệm ThinPrep Pap Test & HPV DNA Real-time PCR\nChụp X-quang tuyến vú kỹ thuật số 3D (Mammography)\nSiêu âm tử cung phần phụ đầu dò & siêu âm tuyến vú\nBộ dấu ấn ung thư phụ khoa: CA 125, CA 15-3, CEA');
                        setPkgDescription('Phát hiện sớm ung thư vú, cổ tử cung, buồng trứng và các bệnh lý phụ khoa tiềm ẩn.');
                      }}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + Gói Tầm Soát Phụ Nữ VIP
                    </button>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-3.5 text-xs">
              {/* Tên Gói / Dịch Vụ */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  {pkgType === 'single' ? 'Tên dịch vụ kỹ thuật / Cận lâm sàng *:' : 'Tên gói khám sức khỏe *:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={pkgType === 'single' ? 'VD: Chụp MRI Sọ Não Khảo Sát Mạch Máu Não 1.5T' : 'VD: Gói Tầm Soát Ung Thư Toàn Thân & Đột Quỵ Não VIP'}
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 ${
                    pkgType === 'single' ? 'focus:ring-sky-500' : 'focus:ring-emerald-500'
                  } text-sm`}
                  autoFocus
                />
              </div>

              {/* Code, Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã danh mục:</label>
                  <input
                    type="text"
                    placeholder={pkgType === 'single' ? 'VD: DV-MRI-01' : 'VD: VIP-GK-01'}
                    value={pkgCode}
                    onChange={(e) => setPkgCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phân loại danh mục:</label>
                  <select
                    value={pkgCategory}
                    onChange={(e) => setPkgCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {pkgType === 'single' ? (
                      <>
                        <option value="Chẩn Đoán Hình Ảnh">Chẩn Đoán Hình Ảnh</option>
                        <option value="Nội Soi Tiêu Hóa">Nội Soi Tiêu Hóa</option>
                        <option value="Xét Nghiệm Y Khoa">Xét Nghiệm Y Khoa</option>
                        <option value="Khám Chuyên Khoa">Khám Chuyên Khoa</option>
                        <option value="Nha Khoa & Thẩm Mỹ">Nha Khoa & Thẩm Mỹ</option>
                        <option value="Tiêm Chủng Vắc Xin">Tiêm Chủng Vắc Xin</option>
                        <option value="Phục Hồi Chức Năng">Phục Hồi Chức Năng</option>
                      </>
                    ) : (
                      <>
                        <option value="Tầm Soát Ung Thư">Tầm Soát Ung Thư</option>
                        <option value="Khám Đoàn Doanh Nghiệp (B2B)">Khám Đoàn Doanh Nghiệp (B2B)</option>
                        <option value="Sức Khỏe Phụ Nữ & Mẹ Bé">Sức Khỏe Phụ Nữ & Mẹ Bé</option>
                        <option value="Tim Mạch & Đột Quỵ">Tim Mạch & Đột Quỵ</option>
                        <option value="Chuyên Khoa Sâu">Chuyên Khoa Sâu</option>
                        <option value="Cá Nhân VIP">Cá Nhân VIP</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn vị tính:</label>
                  <input
                    type="text"
                    placeholder={pkgType === 'single' ? 'Ca / Lượt / Mẫu' : 'Gói / Người'}
                    value={pkgUnit}
                    onChange={(e) => setPkgUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn giá niêm yết (VNĐ) *:</label>
                  <input
                    type="number"
                    step={50000}
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn giá ưu đãi / Khuyến mãi (VNĐ):</label>
                  <input
                    type="number"
                    step={50000}
                    value={pkgDiscountPrice}
                    onChange={(e) => setPkgDiscountPrice(Number(e.target.value))}
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold ${
                      pkgType === 'single' ? 'text-sky-700' : 'text-emerald-700'
                    }`}
                  />
                </div>
              </div>

              {/* Insurance Coverage Setting */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-teal-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pkgInsuranceCovered}
                      onChange={(e) => setPkgInsuranceCovered(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Áp dụng thanh toán Bảo Hiểm Y Tế (BHYT / BH Bảo Việt / PVI / Manulife)</span>
                  </label>
                  {pkgInsuranceCovered && (
                    <span className="text-[11px] font-bold text-teal-700">Được quỹ BHYT chi trả</span>
                  )}
                </div>

                {pkgInsuranceCovered && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-teal-800">Tỷ lệ thanh toán dự kiến:</span>
                    <div className="flex items-center gap-1.5">
                      {[50, 80, 100].map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          onClick={() => setPkgInsuranceCoveragePercent(percent)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            pkgInsuranceCoveragePercent === percent
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-teal-800 border border-teal-300 hover:bg-teal-100'
                          }`}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Department, Execution Time & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Khoa / Phòng thực hiện:</label>
                  <input
                    type="text"
                    placeholder="Khoa Chẩn Đoán Hình Ảnh"
                    value={pkgDepartment}
                    onChange={(e) => setPkgDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thời gian thực hiện:</label>
                  <input
                    type="text"
                    placeholder="VD: 20 - 30 phút"
                    value={pkgExecutionTime}
                    onChange={(e) => setPkgExecutionTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giới tính chỉ định:</label>
                  <select
                    value={pkgTargetGender}
                    onChange={(e) => setPkgTargetGender(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              {/* Preparation Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hướng dẫn chuẩn bị cho bệnh nhân trước khi làm:</label>
                <input
                  type="text"
                  placeholder="VD: Nhịn ăn sáng tối thiểu 6 tiếng, tháo trang sức kim loại trước khi vào phòng máy..."
                  value={pkgPreparationNotes}
                  onChange={(e) => setPkgPreparationNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Target Age */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Độ tuổi / Đối tượng chỉ định:</label>
                <input
                  type="text"
                  placeholder="VD: Người từ 18 tuổi trở lên, người có chỉ định của Bác sĩ chuyên khoa..."
                  value={pkgTargetAgeRange}
                  onChange={(e) => setPkgTargetAgeRange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Clinical Items (textarea, 1 item per line) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    {pkgType === 'single'
                      ? 'Nội dung kỹ thuật & quy trình thực hiện (Mỗi dòng 1 mục):'
                      : 'Danh mục xét nghiệm & Chẩn đoán hình ảnh (Mỗi dòng 1 danh mục):'}
                  </label>
                  <span className="text-[11px] text-slate-400">Xuống dòng để thêm mục mới</span>
                </div>
                <textarea
                  rows={3}
                  value={pkgItemsText}
                  onChange={(e) => setPkgItemsText(e.target.value)}
                  placeholder="Thực hiện kỹ thuật theo quy trình chuẩn&#10;Bác sĩ CKI chuyên khoa đọc và hội chẩn kết quả&#10;Lưu trữ dữ liệu số hóa hệ thống PACS/HIS"
                  className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 ${
                    pkgType === 'single' ? 'focus:ring-sky-500' : 'focus:ring-emerald-500'
                  }`}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả & Ý nghĩa chẩn đoán:</label>
                <textarea
                  rows={2}
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt lợi ích, giá trị tầm soát và ý nghĩa y khoa của dịch vụ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    pkgType === 'single' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPackage ? 'Lưu Thay Đổi' : pkgType === 'single' ? 'Tạo Dịch Vụ Mới' : 'Tạo Gói Khám Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: CHI TIẾT CƠ HỘI B2C */}
      {/* ========================================================================= */}
      {selectedB2CDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-blue-700 font-mono font-bold">{selectedB2CDetail.id}</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedB2CDetail.customerName}</h3>
              </div>
              <button onClick={() => setSelectedB2CDetail(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100">
                ✕ Đóng
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-mono font-bold text-blue-700">{selectedB2CDetail.customerPhone || selectedB2CDetail.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Gói quan tâm:</span>
                <span className="font-bold text-slate-900">{selectedB2CDetail.serviceInterest}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Giá trị dự kiến:</span>
                <span className="font-mono font-bold text-emerald-700">{(selectedB2CDetail.estimatedValue / 1e6).toLocaleString()} triệu đ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nguồn tiếp cận:</span>
                <span className="font-bold text-slate-700">{selectedB2CDetail.source}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Giai đoạn hiện tại:</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {selectedB2CDetail.stage}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedB2CDetail(null)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CHI TIẾT HỢP ĐỒNG B2B */}
      {/* ========================================================================= */}
      {selectedB2BDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl p-6 space-y-4 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-blue-700 font-mono font-bold">{selectedB2BDetail.code}</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedB2BDetail.companyName}</h3>
              </div>
              <button onClick={() => setSelectedB2BDetail(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 cursor-pointer">
                ✕ Đóng
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Quy mô CBNV</span>
                <span className="font-bold text-slate-900 text-sm">{selectedB2BDetail.employeeCount} nhân sự</span>
              </div>
              <div>
                <span className="text-slate-500 block">Đã khám</span>
                <span className="font-bold text-emerald-700 text-sm">{selectedB2BDetail.examinedCount} nhân sự</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tổng tiền HĐ</span>
                <span className="font-bold text-slate-900 text-sm">{(selectedB2BDetail.totalValue / 1e6).toLocaleString()} tr đ</span>
              </div>
              <div>
                <span className="text-slate-500 block">Công nợ còn lại</span>
                <span className="font-bold text-amber-700 text-sm">{(selectedB2BDetail.debtAmount / 1e6).toLocaleString()} tr đ</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700">Gói khám lựa chọn:</span>
                <p className="text-blue-700 font-semibold mt-0.5">{selectedB2BDetail.packageType}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700">Ghi chú điều phối:</span>
                <p className="text-slate-600 mt-0.5">{selectedB2BDetail.notes}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => {
                  alert(`Đang khởi tạo tệp báo cáo khám sức khỏe định kỳ cho ${selectedB2BDetail.companyName}... Tải xuống hoàn tất!`);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Báo Cáo KSK (PDF)</span>
              </button>
              <button onClick={() => setSelectedB2BDetail(null)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
