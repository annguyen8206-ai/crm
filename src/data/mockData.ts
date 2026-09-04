import {
  Branch,
  CurrentUser,
  Doctor,
  Patient,
  InteractionLog,
  Appointment,
  B2BContract,
  B2CDeal,
  MedicalPackage,
  MarketingSegment,
  MarketingCampaign,
  CareAutomationRule,
  SupportTicket,
  TelemedicineCall,
  ReferralRecord,
  MedicalPartner,
  PartnerCommissionPayout,
  FollowUpCallTask,
  CsatFeedbackItem,
  ChatbotFaqScenario,
  OmnichannelConversation,
  AutoRecallTask,
  ZnsCareMessageLog,
  VoipCallSession
} from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'hn-central',
    name: 'Bệnh viện Đa khoa Quốc tế VitHospital (Trụ sở chính)',
    shortName: 'VitHospital Trung Tâm',
    address: 'Số 188 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
    phone: '024 3988 6868',
    type: 'hospital'
  },
  {
    id: 'hn-badinh',
    name: 'Phòng khám Đa khoa Quốc tế VitClinic Ba Đình',
    shortName: 'VitClinic Ba Đình',
    address: 'Số 45 Liễu Giai, Q. Ba Đình, Hà Nội',
    phone: '024 3722 5588',
    type: 'clinic'
  },
  {
    id: 'hn-caugiay',
    name: 'Trung tâm Xét nghiệm & Tiêm chủng VitClinic Cầu Giấy',
    shortName: 'VitClinic Cầu Giấy',
    address: 'Số 99 Trần Thái Tông, Q. Cầu Giấy, Hà Nội',
    phone: '024 3799 1122',
    type: 'testing'
  },
  {
    id: 'beauty-center',
    name: 'Viện Thẩm mỹ Y khoa & Trẻ hóa Da VitBeauty Center',
    shortName: 'VitBeauty Center',
    address: 'Số 22 Mai Hắc Đế, Q. Hai Bà Trưng, Hà Nội',
    phone: '024 3944 9999',
    type: 'beauty'
  }
];

export const CURRENT_USERS: CurrentUser[] = [
  {
    id: 'u-sysadmin',
    staffCode: 'IT-ADM-001',
    name: 'Kỹ sư Nguyễn Quốc Hưng (Admin)',
    email: 'admin.it@vithospital.vn',
    phone: '0901 999 888',
    password: 'VitHospital@2026',
    role: 'Quản Trị Viên Hệ Thống (Admin)',
    roleTitle: 'Quản Trị Viên Hệ Thống (Admin & IT)',
    department: 'Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: true,
    lastLogin: 'Hôm nay, 08:30',
    createdAt: '2024-01-01'
  },
  {
    id: 'u-admin',
    staffCode: 'BGD-001',
    name: 'BS. CKII Hoàng Minh Tuấn',
    email: 'tuan.hm@vithospital.vn',
    phone: '0912 888 999',
    password: 'VitHospital@2026',
    role: 'Ban Giám Đốc',
    roleTitle: 'Ban Giám Đốc (Quản trị Toàn diện)',
    department: 'Ban Lãnh Đạo & HĐQT',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: true,
    lastLogin: 'Hôm nay, 08:00',
    createdAt: '2024-01-15'
  },
  {
    id: 'u-doctor',
    staffCode: 'BS-002',
    name: 'PGS. TS. BS Trần Minh Đức',
    email: 'duc.tm@vithospital.vn',
    phone: '0912 345 678',
    password: 'VitHospital@2026',
    role: 'Bác sĩ Trưởng Khoa',
    roleTitle: 'Bác sĩ Trưởng Khoa & Lâm Sàng',
    department: 'Khoa Nội Tổng Quát - Tim Mạch',
    branchId: 'hn-central',
    status: 'active',
    twoFactorEnabled: true,
    lastLogin: 'Hôm nay, 08:15',
    createdAt: '2024-02-01'
  },
  {
    id: 'u-receptionist',
    staffCode: 'LT-003',
    name: 'Đặng Thảo Vy',
    email: 'vy.dt@vithospital.vn',
    phone: '0988 123 456',
    password: 'VitHospital@2026',
    role: 'Chuyên viên Tiếp đón',
    roleTitle: 'Chuyên viên Tiếp đón & Lễ Tân',
    department: 'Bộ phận Tiếp tân & Điều phối Sảnh',
    branchId: 'hn-central',
    status: 'active',
    twoFactorEnabled: false,
    lastLogin: 'Hôm nay, 07:45',
    createdAt: '2024-03-10'
  },
  {
    id: 'u-cskh-lead',
    staffCode: 'KD-CSKH-004',
    name: 'ThS. Trần Thị Mai Anh',
    email: 'maianh.tt@vithospital.vn',
    phone: '0977 654 321',
    password: 'VitHospital@2026',
    role: 'Tư Vấn, Kinh Doanh & CSKH',
    roleTitle: 'Trưởng Nhóm Tư Vấn, Kinh Doanh & CSKH',
    department: 'Khối Tư Vấn, Kinh Doanh & Chăm Sóc Khách Hàng',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: true,
    lastLogin: 'Hôm nay, 08:10',
    createdAt: '2024-03-15'
  },
  {
    id: 'u-sales',
    staffCode: 'KD-005',
    name: 'Lê Hoàng Long',
    email: 'long.lh@vithospital.vn',
    phone: '0933 222 111',
    password: 'VitHospital@2026',
    role: 'Tư Vấn, Kinh Doanh & CSKH',
    roleTitle: 'Chuyên Viên Kinh Doanh B2B & Deals Gói Khám',
    department: 'Khối Tư Vấn, Kinh Doanh & Chăm Sóc Khách Hàng',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: false,
    lastLogin: 'Hôm nay, 08:20',
    createdAt: '2024-04-02'
  },
  {
    id: 'u-consultant',
    staffCode: 'TV-006',
    name: 'Phạm Thu Trang',
    email: 'trang.pt@vithospital.vn',
    phone: '0909 333 444',
    password: 'VitHospital@2026',
    role: 'Tư Vấn, Kinh Doanh & CSKH',
    roleTitle: 'Chuyên Viên Tư Vấn Đặt Lịch & CSKH',
    department: 'Khối Tư Vấn, Kinh Doanh & Chăm Sóc Khách Hàng',
    branchId: 'hn-badinh',
    status: 'active',
    twoFactorEnabled: false,
    lastLogin: 'Hôm nay, 08:05',
    createdAt: '2024-04-20'
  },
  {
    id: 'u-marketing',
    staffCode: 'MKT-007',
    name: 'Nguyễn Phương Thảo',
    email: 'thao.np@vithospital.vn',
    phone: '0944 555 666',
    password: 'VitHospital@2026',
    role: 'Marketing Lead',
    roleTitle: 'Marketing Lead & Automation',
    department: 'Phòng Truyền Thông & Tăng Trưởng',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: true,
    lastLogin: 'Hôm qua, 17:30',
    createdAt: '2024-05-12'
  }
];

export const DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'PGS. TS. BS Trần Minh Đức',
    title: 'Phó Giáo sư, Tiến sĩ Y khoa',
    specialty: 'Tim Mạch & Huyết Áp',
    branchId: 'hn-central',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
    roomNumber: 'Phòng 204 - Tầng 2',
    phone: '0912 345 678',
    rating: 4.9,
    totalPatients: 1420,
    isAvailableToday: true
  },
  {
    id: 'doc-2',
    name: 'ThS. BS Hoàng Thu Trang',
    title: 'Thạc sĩ Bác sĩ Nội tiết',
    specialty: 'Nội Tiết & Đái Tháo Đường',
    branchId: 'hn-badinh',
    avatar: 'https://images.unsplash.com/photo-1594824813627-2c9339396b27?auto=format&fit=crop&q=80&w=250',
    roomNumber: 'Phòng 108 - Tầng 1',
    phone: '0988 765 432',
    rating: 4.8,
    totalPatients: 980,
    isAvailableToday: true
  },
  {
    id: 'doc-3',
    name: 'BS. CKI Vũ Hải Nam',
    title: 'Bác sĩ Chuyên khoa I Da liễu',
    specialty: 'Da Liễu & Thẩm Mỹ Công Nghệ Cao',
    branchId: 'beauty-center',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250',
    roomNumber: 'Phòng VIP 3 - Tầng 3',
    phone: '0904 112 233',
    rating: 5.0,
    totalPatients: 830,
    isAvailableToday: true
  },
  {
    id: 'doc-4',
    name: 'ThS. BS Phạm Diệu Linh',
    title: 'Thạc sĩ Bác sĩ Sản Phụ Khoa',
    specialty: 'Sản Phụ Khoa & Quản Lý Thai Kỳ',
    branchId: 'hn-central',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
    roomNumber: 'Phòng 302 - Tầng 3',
    phone: '0977 889 900',
    rating: 4.9,
    totalPatients: 1250,
    isAvailableToday: true
  },
  {
    id: 'doc-5',
    name: 'BS. CKII Lê Tuấn Hưng',
    title: 'Bác sĩ Chuyên khoa II Cơ Xương Khớp',
    specialty: 'Cơ Xương Khớp & Cột Sống',
    branchId: 'hn-caugiay',
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=250',
    roomNumber: 'Phòng 102 - Tầng 1',
    phone: '0915 223 344',
    rating: 4.7,
    totalPatients: 1100,
    isAvailableToday: false
  }
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    pid: 'BN-2026-88219',
    name: 'Nguyễn Thị Bích Thủy',
    phone: '0912 889 933',
    email: 'bichthuy.nguyen@gmail.com',
    gender: 'Nữ',
    dob: '1979-05-14',
    age: 47,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    address: 'Chung cư Vinhomes Metropolis, 29 Liễu Giai, Ba Đình, Hà Nội',
    citizenId: '001179009821',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Hải sản vỏ cứng'],
    underlyingConditions: ['Tăng huyết áp vô căn (I10)', 'Đái tháo đường Type 2 (E11)'],
    membership: {
      tier: 'Diamond VIP',
      points: 2450,
      totalSpent: 48500000,
      discountRate: 15
    },
    insurance: {
      bhytNo: 'DN4010123984712',
      privateProvider: 'Bảo hiểm Bảo Việt (Gói Intercare Gold)',
      policyNumber: 'BV-VIP-2026-0988',
      hasGuarantee: true,
      validUntil: '2027-01-15'
    },
    source: 'Giới thiệu Bác sĩ',
    primaryBranchId: 'hn-central',
    assignedDoctor: 'PGS. TS. BS Trần Minh Đức',
    tags: ['VIP Diamond', 'Mãn tính Tim mạch - Nội tiết', 'Tái khám định kỳ', 'Bảo lãnh trực tiếp'],
    createdAt: '2024-03-10',
    lastVisitDate: '2026-07-28',
    nextAppointmentDate: '2026-08-25',
    notes: 'Bệnh nhân thân thiết, yêu cầu gửi kết quả xét nghiệm qua Zalo và nhắc uống thuốc định kỳ.'
  },
  {
    id: 'pat-2',
    pid: 'BN-2026-90145',
    name: 'Trần Đăng Khoa',
    phone: '0983 112 244',
    email: 'dangkhoa.tran@fpt.com',
    gender: 'Nam',
    dob: '1990-11-20',
    age: 36,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    address: 'Tòa nhà Duy Tân Plaza, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    citizenId: '001090001289',
    bloodType: 'A+',
    allergies: ['Chưa ghi nhận'],
    underlyingConditions: ['Rối loạn lipid máu hỗn hợp (E78.2)', 'Thoát vị đĩa đệm L4-L5'],
    membership: {
      tier: 'Gold',
      points: 820,
      totalSpent: 18200000,
      discountRate: 10
    },
    insurance: {
      bhytNo: 'DN4010992381200',
      privateProvider: 'PVI Care (Khám sức khỏe FPT)',
      policyNumber: 'PVI-CORP-FPT-883',
      hasGuarantee: true,
      validUntil: '2026-12-31'
    },
    source: 'B2B Doanh nghiệp',
    primaryBranchId: 'hn-caugiay',
    assignedDoctor: 'BS. CKII Lê Tuấn Hưng',
    tags: ['B2B FPT Corp', 'Cơ xương khớp', 'Khám theo đoàn', 'Khách hàng tiềm năng B2C'],
    createdAt: '2025-06-18',
    lastVisitDate: '2026-08-10',
    nextAppointmentDate: '2026-09-10',
    notes: 'Cán bộ quản lý FPT, quan tâm gói vật lý trị liệu cột sống và tầm soát tim mạch chuyên sâu.'
  },
  {
    id: 'pat-3',
    pid: 'BN-2026-91280',
    name: 'Vũ Hoàng Yến Nhi',
    phone: '0975 667 889',
    email: 'yennhi.vu@gmail.com',
    gender: 'Nữ',
    dob: '1995-08-03',
    age: 31,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    address: 'Biệt thự Gamuda Gardens, Q. Hoàng Mai, Hà Nội',
    citizenId: '001195007742',
    bloodType: 'B+',
    allergies: ['Aspirin', 'Mỹ phẩm chứa hương liệu nồng'],
    underlyingConditions: ['Viêm da tiếp xúc dị ứng', 'Nám má mảng sâu'],
    membership: {
      tier: 'Platinum',
      points: 1750,
      totalSpent: 35000000,
      discountRate: 12
    },
    insurance: {
      bhytNo: 'DN4010882190332',
      privateProvider: 'Liberty HealthCare',
      policyNumber: 'LIB-HN-2026-339',
      hasGuarantee: false,
      validUntil: '2026-11-20'
    },
    source: 'Facebook Ads',
    primaryBranchId: 'beauty-center',
    assignedDoctor: 'BS. CKI Vũ Hải Nam',
    tags: ['Thẩm mỹ Da Liễu', 'Liệu trình Laser Pico', 'VIP Platinum', 'Hậu phẫu D+3'],
    createdAt: '2025-09-02',
    lastVisitDate: '2026-08-15',
    nextAppointmentDate: '2026-08-22',
    notes: 'Vừa hoàn thành buổi 3/5 Laser Pico phân giải sắc tố. Cần gửi tin nhắn Zalo hướng dẫn dưỡng ẩm chống nắng.'
  },
  {
    id: 'pat-4',
    pid: 'BN-2026-92044',
    name: 'Đoàn Mạnh Dũng',
    phone: '0903 445 566',
    email: 'dung.doan@vietcombank.com.vn',
    gender: 'Nam',
    dob: '1968-02-12',
    age: 58,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    address: 'Số 12 phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    citizenId: '001068000451',
    bloodType: 'AB+',
    allergies: ['Chưa ghi nhận'],
    underlyingConditions: ['Thiếu máu cơ tim cục bộ mạn tính (I25.9)', 'Viêm gan siêu vi B thể ngủ'],
    membership: {
      tier: 'Diamond VIP',
      points: 3100,
      totalSpent: 62000000,
      discountRate: 15
    },
    insurance: {
      bhytNo: 'GD4010332190011',
      privateProvider: 'Bảo Việt Intercare Diamond',
      policyNumber: 'BV-VCB-EXEC-002',
      hasGuarantee: true,
      validUntil: '2027-06-30'
    },
    source: 'B2B Doanh nghiệp',
    primaryBranchId: 'hn-central',
    assignedDoctor: 'PGS. TS. BS Trần Minh Đức',
    tags: ['B2B Ban Lãnh Đạo VCB', 'Gói VIP Executive', 'Tim mạch chuyên sâu', 'Telemedicine thường xuyên'],
    createdAt: '2024-01-15',
    lastVisitDate: '2026-08-05',
    nextAppointmentDate: '2026-09-05',
    notes: 'Khách hàng VIP, thường xuyên bận công tác nên thích tư vấn Telemedicine từ xa trước khi làm xét nghiệm.'
  },
  {
    id: 'pat-5',
    pid: 'BN-2026-93512',
    name: 'Lê Mai Hương',
    phone: '0966 223 388',
    email: 'maihuong.le@gmail.com',
    gender: 'Nữ',
    dob: '1998-04-25',
    age: 28,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    address: 'Tòa Landmark 72, Keangnam, Mễ Trì, Nam Từ Liêm, Hà Nội',
    citizenId: '001198008892',
    bloodType: 'O-',
    allergies: ['Sulfonamides (Kháng sinh nhóm Sulfa)'],
    underlyingConditions: ['Thai 22 tuần đơn thai'],
    membership: {
      tier: 'Silver',
      points: 450,
      totalSpent: 12500000,
      discountRate: 5
    },
    insurance: {
      bhytNo: 'DN4010998822114',
      privateProvider: 'Insmart Global Care',
      policyNumber: 'INS-2026-9912',
      hasGuarantee: true,
      validUntil: '2027-03-01'
    },
    source: 'Website',
    primaryBranchId: 'hn-central',
    assignedDoctor: 'ThS. BS Phạm Diệu Linh',
    tags: ['Gói Thai Sản Trọn Gói', 'Siêu âm 4D tuần 22', 'Nhóm máu hiếm O-', 'Tái khám định kỳ'],
    createdAt: '2026-02-14',
    lastVisitDate: '2026-08-12',
    nextAppointmentDate: '2026-09-09',
    notes: 'Đã đăng ký Gói Thai Sản An Lành Vàng. Lưu ý nhóm máu hiếm O- cần dự trù máu sinh nở.'
  }
];

export const INITIAL_INTERACTIONS: InteractionLog[] = [
  {
    id: 'log-1',
    patientId: 'pat-1',
    timestamp: '2026-08-18 09:30',
    channel: 'Zalo ZNS',
    staffName: 'VitCRM Automation Bot',
    type: 'System Automated',
    subject: 'Nhắc lịch tái khám định kỳ & Đơn thuốc',
    content: 'Đã gửi ZNS xác nhận lịch hẹn ngày 25/08/2026 lúc 08:30 với PGS. TS. BS Trần Minh Đức tại Cơ sở Trụ sở chính.',
    sentiment: 'Tích cực'
  },
  {
    id: 'log-2',
    patientId: 'pat-1',
    timestamp: '2026-07-30 14:20',
    channel: 'Tổng đài (Call)',
    staffName: 'CSKH Đặng Thảo Vy',
    type: 'Outbound',
    subject: 'Hỏi thăm sức khỏe sau 48h uống thuốc mới',
    content: 'Bệnh nhân cho biết đã uống thuốc theo đơn, không bị chóng mặt hay dị ứng. Huyết áp đo sáng nay 130/85 mmHg. Rất hài lòng với dịch vụ tiếp đón.',
    duration: '3 phút 45 giây',
    sentiment: 'Tích cực'
  },
  {
    id: 'log-3',
    patientId: 'pat-3',
    timestamp: '2026-08-16 10:00',
    channel: 'Zalo OA Chat',
    staffName: 'VitCRM Care Assistant (AI)',
    type: 'Inbound',
    subject: 'Tư vấn chăm sóc da sau Laser Pico D+1',
    content: 'Bệnh nhân hỏi về việc da có hơi ửng hồng. AI Bot tự động trả lời theo phác đồ: hiện tượng bình thường trong 24-48h, hướng dẫn đắp mặt nạ tế bào gốc làm dịu và thoa kem chống nắng phổ rộng.',
    sentiment: 'Tích cực'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    code: 'LH-2026-0819-01',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientPhone: '0912 889 933',
    gender: 'Nữ',
    age: 47,
    branchId: 'hn-central',
    department: 'Khoa Tim Mạch - Nội Tiết',
    doctorId: 'doc-1',
    doctorName: 'PGS. TS. BS Trần Minh Đức',
    appointmentDate: '2026-08-19',
    timeSlot: '08:30 - 09:00',
    type: 'Tái khám định kỳ',
    bookingChannel: 'Zalo OA',
    status: 'Đã xác nhận',
    notes: 'Tái khám định kỳ huyết áp & tiểu đường + Làm xét nghiệm HbA1c, mỡ máu.',
    reminderStatus: {
      znsSent: true,
      smsSent: true,
      callConfirmed: true
    },
    fee: 500000
  },
  {
    id: 'apt-2',
    code: 'LH-2026-0819-02',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    gender: 'Nữ',
    age: 31,
    branchId: 'beauty-center',
    department: 'Thẩm Mỹ Da Liễu Cao Cấp',
    doctorId: 'doc-3',
    doctorName: 'BS. CKI Vũ Hải Nam',
    appointmentDate: '2026-08-19',
    timeSlot: '09:30 - 10:30',
    type: 'Thủ thuật/Liệu trình',
    bookingChannel: 'Website',
    status: 'Đã tiếp đón',
    notes: 'Buổi 4/5 Liệu trình Laser Pico trị nám sâu + Cấy tinh chất DNA cá hồi.',
    reminderStatus: {
      znsSent: true,
      smsSent: false,
      callConfirmed: true
    },
    fee: 3500000
  },
  {
    id: 'apt-3',
    code: 'LH-2026-0819-03',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    patientPhone: '0983 112 244',
    gender: 'Nam',
    age: 36,
    branchId: 'hn-caugiay',
    department: 'Khoa Cơ Xương Khớp & VLTL',
    doctorId: 'doc-5',
    doctorName: 'BS. CKII Lê Tuấn Hưng',
    appointmentDate: '2026-08-19',
    timeSlot: '10:30 - 11:15',
    type: 'Gói KSK Doanh nghiệp',
    bookingChannel: 'Call Center',
    status: 'Chờ xác nhận',
    notes: 'Khám theo dõi thoát vị L4-L5 và đánh giá hiệu quả vật lý trị liệu cột sống.',
    reminderStatus: {
      znsSent: false,
      smsSent: true,
      callConfirmed: false
    },
    fee: 350000
  },
  {
    id: 'apt-4',
    code: 'LH-2026-0819-04',
    patientId: 'pat-5',
    patientName: 'Lê Mai Hương',
    patientPhone: '0966 223 388',
    gender: 'Nữ',
    age: 28,
    branchId: 'hn-central',
    department: 'Khoa Sản Phụ Khoa',
    doctorId: 'doc-4',
    doctorName: 'ThS. BS Phạm Diệu Linh',
    appointmentDate: '2026-08-19',
    timeSlot: '14:00 - 14:45',
    type: 'Tái khám định kỳ',
    bookingChannel: 'Ứng dụng Bệnh nhân',
    status: 'Đã xác nhận',
    notes: 'Siêu âm 4D hình thái thai nhi tuần 22 và làm nghiệm pháp dung nạp Glucose OGTT.',
    reminderStatus: {
      znsSent: true,
      smsSent: true,
      callConfirmed: true
    },
    fee: 850000
  },
  {
    id: 'apt-5',
    code: 'LH-2026-0819-05',
    patientId: 'pat-4',
    patientName: 'Đoàn Mạnh Dũng',
    patientPhone: '0903 445 566',
    gender: 'Nam',
    age: 58,
    branchId: 'hn-central',
    department: 'Khoa Tim Mạch',
    doctorId: 'doc-1',
    doctorName: 'PGS. TS. BS Trần Minh Đức',
    appointmentDate: '2026-08-19',
    timeSlot: '15:30 - 16:00',
    type: 'Telemedicine Trực tuyến',
    bookingChannel: 'Call Center',
    status: 'Đã xác nhận',
    notes: 'Tư vấn trực tuyến kết quả Holter điện tâm đồ 24h và điều chỉnh liều thuốc giãn vành.',
    reminderStatus: {
      znsSent: true,
      smsSent: true,
      callConfirmed: true
    },
    fee: 400000
  }
];

export const INITIAL_B2B_CONTRACTS: B2BContract[] = [
  {
    id: 'b2b-1',
    code: 'HD-KSK-2026/FPT',
    companyName: 'Công ty Cổ phần FPT (FPT Software & FPT Telecom)',
    taxCode: '0101248141',
    contactPerson: 'Bà Nguyễn Thu Hà - Trưởng ban Nhân sự',
    phone: '0912 334 556',
    email: 'hr.health@fpt.com',
    industry: 'Công nghệ thông tin & Viễn thông',
    packageType: 'Gói Nâng Cao Tầm Soát Ung Thư',
    employeeCount: 1450,
    examinedCount: 980,
    totalValue: 2610000000,
    paidAmount: 1500000000,
    debtAmount: 1110000000,
    startDate: '2026-06-01',
    endDate: '2026-09-30',
    stage: 'Đang triển khai khám',
    eSignStatus: 'Đã ký số Token',
    designatedBranches: ['hn-central', 'hn-caugiay'],
    salesRep: 'Lê Hoàng Long',
    notes: 'Khám theo ca linh hoạt tại 2 cơ sở Cầu Giấy và Trụ sở chính. Đã bàn giao 980 hồ sơ sức khỏe điện tử.'
  },
  {
    id: 'b2b-2',
    code: 'HD-KSK-2026/VCB',
    companyName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank Hội sở)',
    taxCode: '0100112437',
    contactPerson: 'Ông Vũ Tiến Dũng - Giám đốc Trung tâm Phúc lợi',
    phone: '0988 221 144',
    email: 'dungvt.ho@vietcombank.com.vn',
    industry: 'Ngân hàng & Tài chính',
    packageType: 'Gói VIP Executive Ban Lãnh Đạo',
    employeeCount: 620,
    examinedCount: 620,
    totalValue: 2480000000,
    paidAmount: 2480000000,
    debtAmount: 0,
    startDate: '2026-04-15',
    endDate: '2026-07-15',
    stage: 'Đã hoàn tất & Quyết toán',
    eSignStatus: 'Đã ký số Token',
    designatedBranches: ['hn-central', 'beauty-center'],
    salesRep: 'Lê Hoàng Long',
    notes: 'Hợp đồng hoàn thành xuất sắc, đánh giá CSAT đạt 4.95/5 sao. Đang tái ký hợp đồng năm 2027.'
  },
  {
    id: 'b2b-3',
    code: 'HD-KSK-2026/VNG',
    companyName: 'Công ty Cổ phần VNG (Chi nhánh Hà Nội)',
    taxCode: '0303578776',
    contactPerson: 'Bà Đặng Phương Linh - HR Lead',
    phone: '0904 887 766',
    email: 'linhdp@vng.com.vn',
    industry: 'Công nghệ & Game Online',
    packageType: 'Gói Khám Tiêu Chuẩn Bộ Y Tế',
    employeeCount: 550,
    examinedCount: 0,
    totalValue: 825000000,
    paidAmount: 250000000,
    debtAmount: 575000000,
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    stage: 'Đã ký HĐ điện tử',
    eSignStatus: 'Đã ký số Token',
    designatedBranches: ['hn-caugiay', 'hn-badinh'],
    salesRep: 'Lê Hoàng Long',
    notes: 'Đã nhận đặt cọc 30%, chuẩn bị nhập danh sách 550 cán bộ nhân viên vào hệ thống đặt lịch tự động.'
  },
  {
    id: 'b2b-4',
    code: 'HD-KSK-2026/SUN',
    companyName: 'Tập đoàn Sun Group (Khối Bất động sản Du lịch)',
    taxCode: '0102381290',
    contactPerson: 'Ông Hoàng Anh Tuấn - Ban Nhân sự Tập đoàn',
    phone: '0915 990 011',
    email: 'tuanha@sungroup.com.vn',
    industry: 'Bất động sản & Du lịch nghỉ dưỡng',
    packageType: 'Gói Khám Nữ Chuyên Sâu',
    employeeCount: 800,
    examinedCount: 0,
    totalValue: 1600000000,
    paidAmount: 0,
    debtAmount: 1600000000,
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    stage: 'Báo giá & Đàm phán',
    eSignStatus: 'Dự thảo',
    designatedBranches: ['hn-central', 'beauty-center'],
    salesRep: 'Lê Hoàng Long',
    notes: 'Đang đàm phán thêm điều khoản dịch vụ xe đưa đón lấy mẫu máu tận văn phòng.'
  }
];

export const INITIAL_B2C_DEALS: B2CDeal[] = [
  {
    id: 'deal-1',
    customerName: 'Chị Mai Lan Phương',
    phone: '0912 665 544',
    serviceInterest: 'Gói Sinh Mổ Trọn Gói VIP An Lành (Phòng Đơn Family)',
    estimatedValue: 38000000,
    stage: 'Đã đặt cọc',
    probability: 90,
    source: 'Facebook Ads',
    assignedStaff: 'Đặng Thảo Vy',
    nextFollowUpDate: '2026-08-22',
    createdAt: '2026-08-01'
  },
  {
    id: 'deal-2',
    customerName: 'Anh Phạm Quốc Huy',
    phone: '0988 332 211',
    serviceInterest: 'Gói Tầm Soát Ung Thư Toàn Thân Toàn Diện (MRI Toàn thân + Nội soi tiền mê)',
    estimatedValue: 18500000,
    stage: 'Tư vấn chuyên môn',
    probability: 60,
    source: 'Google Search',
    assignedStaff: 'Đặng Thảo Vy',
    nextFollowUpDate: '2026-08-20',
    createdAt: '2026-08-14'
  },
  {
    id: 'deal-3',
    customerName: 'Chị Đỗ Thu Thảo',
    phone: '0903 778 899',
    serviceInterest: 'Liệu trình Nâng Cơ Trẻ Hóa Ultherapy Toàn Mặt & Cổ',
    estimatedValue: 45000000,
    stage: 'Gửi báo giá',
    probability: 75,
    source: 'Zalo OA',
    assignedStaff: 'BS. CKI Vũ Hải Nam',
    nextFollowUpDate: '2026-08-21',
    createdAt: '2026-08-12'
  }
];

export const INITIAL_SEGMENTS: MarketingSegment[] = [
  {
    id: 'seg-1',
    name: 'Bệnh nhân Mãn tính Tim Mạch - Tiểu Đường (Chưa tái khám > 30 ngày)',
    description: 'Bệnh nhân có chẩn đoán ICD I10 hoặc E11 đã quá 30 ngày kể từ lần kê đơn thuốc gần nhất.',
    patientCount: 428,
    criteriaSummary: 'ICD: I10, E11 | LastVisit > 30 ngày | Trạng thái: Ngoại trú',
    tags: ['Mãn tính', 'Cần tái khám', 'Nguy cơ cao'],
    suggestedCampaignType: 'ZNS Nhắc tái khám & Đổi đơn thuốc'
  },
  {
    id: 'seg-2',
    name: 'Khách hàng Thẩm mỹ & Laser Da Liễu Hậu phẫu (D+3 đến D+7)',
    description: 'Khách hàng thực hiện liệu trình Laser Pico, Hifu, Botox trong 7 ngày qua cần theo dõi phục hồi.',
    patientCount: 86,
    criteriaSummary: 'Service: Thẩm mỹ Da Liễu | DaysSince: 3 - 7 ngày',
    tags: ['Thẩm mỹ', 'Hậu phẫu', 'CSKH cá nhân hóa'],
    suggestedCampaignType: 'Zalo Hướng dẫn dưỡng da & Đánh giá mức độ hài lòng'
  },
  {
    id: 'seg-3',
    name: 'Cán bộ Nhân viên B2B phát hiện Chỉ số sức khỏe cần theo dõi (Men gan / Lipid cao)',
    description: 'CBNV tham gia gói khám sức khỏe doanh nghiệp có chỉ số sức khỏe vượt ngưỡng cần tư vấn dinh dưỡng.',
    patientCount: 312,
    criteriaSummary: 'Source: B2B Doanh nghiệp | Tình trạng: Cần tư vấn | Gợi ý: Gói Chuyên khoa',
    tags: ['B2B Re-marketing', 'Chuyển đổi B2C', 'Chăm sóc sức khỏe'],
    suggestedCampaignType: 'Ưu đãi 20% Khám chuyên khoa & Tư vấn dinh dưỡng'
  },
  {
    id: 'seg-4',
    name: 'Mẹ bầu Quản lý Thai Kỳ (Tuần 12, 22, 32 - Mốc siêu âm dị tật quan trọng)',
    description: 'Sản phụ đăng ký hồ sơ theo dõi thai kỳ chuẩn bị bước vào các mốc sàng lọc dị tật hình thái.',
    patientCount: 145,
    criteriaSummary: 'Khoa: Sản Phụ Khoa | Thai: 12w, 22w, 32w',
    tags: ['Sản khoa', 'Mốc siêu âm vàng', 'NIPT / Double Test'],
    suggestedCampaignType: 'Nhắc lịch siêu âm 4D & Tư vấn tiền sản'
  }
];

export const INITIAL_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'cam-1',
    name: 'Chiến dịch ZNS Tự động: Nhắc tái khám Bệnh nhân Tim mạch & Đái tháo đường T8/2026',
    channel: 'Zalo ZNS',
    segmentId: 'seg-1',
    segmentName: 'Bệnh nhân Mãn tính Tim Mạch - Tiểu Đường',
    status: 'Đang chạy',
    scheduledDate: '2026-08-15 08:30',
    totalRecipients: 428,
    sentCount: 428,
    deliveredRate: 98.4,
    openRate: 86.2,
    conversionAppointments: 142,
    estimatedRevenue: 178000000,
    messagePreview: 'Kính gửi Quý khách [Tên BN], Hệ thống VitCRM xin nhắc Quý khách đã đến lịch kiểm tra lại huyết áp và chỉ số HbA1c định kỳ...'
  },
  {
    id: 'cam-2',
    name: 'Chiến dịch Re-marketing B2B: Chăm sóc chuyên sâu Chỉ số Men gan & Mỡ máu',
    channel: 'SMS Brandname',
    segmentId: 'seg-3',
    segmentName: 'CBNV B2B Chỉ số bất thường',
    status: 'Đã lên lịch',
    scheduledDate: '2026-08-22 09:00',
    totalRecipients: 312,
    sentCount: 0,
    deliveredRate: 0,
    openRate: 0,
    conversionAppointments: 0,
    estimatedRevenue: 95000000,
    messagePreview: 'VitHospital kinh gui Anh/Chi: Ket qua KSK doan ghi nhan chi so mo mau tang. Tang Anh/Chi ma giam 20% phi kham chuyen khoa Noi Tiet...'
  }
];

export const INITIAL_AUTOMATION_RULES: CareAutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Tự động gửi ZNS hỏi thăm hậu phẫu ngày thứ 1 (D+1)',
    triggerEvent: 'Sau phẫu thuật D+1',
    channel: 'Zalo ZNS',
    autoSend: true,
    messageTemplate: 'Chào Quý khách [Tên], đội ngũ Y tế VitCRM xin hỏi thăm tình trạng vết thương và cảm giác đau ngày đầu sau thủ thuật...',
    activeCountThisMonth: 124
  },
  {
    id: 'rule-2',
    name: 'Nhắc mũi tiêm chủng tiếp theo trước 3 ngày',
    triggerEvent: 'Nhắc mũi tiêm chủng',
    channel: 'Zalo ZNS',
    autoSend: true,
    messageTemplate: 'Kính gửi gia đình bé [Tên bé], VitClinic xin nhắc lịch tiêm chủng mũi [Tên vắc xin] vào ngày [Ngày hẹn]...',
    activeCountThisMonth: 289
  },
  {
    id: 'rule-3',
    name: 'Gửi khảo sát đo lường CSAT/NPS sau khi hoàn tất khám 2 giờ',
    triggerEvent: 'Khảo sát CSAT sau khám',
    channel: 'Zalo ZNS',
    autoSend: true,
    messageTemplate: 'Cảm ơn Quý khách đã thăm khám tại VitCRM. Xin vui lòng dành 30 giây đánh giá chất lượng phục vụ của bác sĩ và nhân viên...',
    activeCountThisMonth: 856
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    code: 'TK-SLA-2026-081',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientPhone: '0912 889 933',
    category: 'Thắc mắc viện phí & bảo lãnh',
    priority: 'Cao (SLA 2h)',
    assignedDepartment: 'Phòng Bảo hiểm & Thu ngân',
    assignedStaff: 'Nguyễn Thu Trang',
    status: 'Đã giải quyết',
    createdAt: '2026-08-17 10:15',
    slaDeadline: '2026-08-17 12:15',
    isBreached: false,
    firstResponseMinutes: 12,
    resolutionTimeHours: 1.2,
    csatScore: 5,
    content: 'Bệnh nhân hỏi về khoản đồng chi trả 15% trong hóa đơn xét nghiệm sinh hóa ngày 28/07.',
    resolutionNotes: 'Đã liên hệ giải thích rõ điều khoản khấu trừ của gói Bảo Việt Intercare và gửi bảng kê chi tiết qua Zalo. Bệnh nhân hoàn toàn hài lòng.'
  },
  {
    id: 'tkt-2',
    code: 'TK-SLA-2026-084',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    patientPhone: '0983 112 244',
    category: 'Tư vấn kết quả chuyên môn',
    priority: 'Trung bình (SLA 8h)',
    assignedDepartment: 'Khoa Chẩn Đoán Hình Ảnh',
    assignedStaff: 'TS. BS Lê Quang Vinh',
    status: 'Đang xử lý',
    createdAt: '2026-08-18 08:30',
    slaDeadline: '2026-08-18 16:30',
    isBreached: false,
    firstResponseMinutes: 25,
    content: 'Bệnh nhân muốn xin bản sao file DICOM ảnh chụp MRI cột sống để gửi hội chẩn thêm chuyên gia nước ngoài.',
    resolutionNotes: 'Đã tổng hợp hồ sơ khám và gửi email bảo mật cho khách hàng.'
  },
  {
    id: 'tkt-3',
    code: 'TK-SLA-2026-079',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    category: 'Khiếu nại thái độ',
    priority: 'Khẩn cấp (SLA 30p)',
    assignedDepartment: 'Phòng CSKH & Trải nghiệm',
    assignedStaff: 'ThS. Trần Thị Mai Anh',
    status: 'Đã đóng',
    createdAt: '2026-08-15 11:00',
    slaDeadline: '2026-08-15 11:30',
    isBreached: false,
    firstResponseMinutes: 8,
    resolutionTimeHours: 0.4,
    csatScore: 5,
    content: 'Thời gian chờ máy soi da tại phòng VIP bị chậm 15 phút so với giờ hẹn đã đặt.',
    resolutionNotes: 'Trưởng phòng CSKH trực tiếp gặp xin lỗi, tặng voucher chăm sóc phục hồi da trị giá 1,000,000đ và nâng cấp lên phòng VIP 1.'
  }
];

export const INITIAL_TELEMEDICINE_CALLS: TelemedicineCall[] = [
  {
    id: 'tele-1',
    patientId: 'pat-4',
    patientName: 'Đoàn Mạnh Dũng',
    patientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    patientPhone: '0903 445 566',
    doctorId: 'doc-1',
    doctorName: 'PGS. TS. BS Trần Minh Đức',
    specialty: 'Tim Mạch Quốc Tế',
    scheduledTime: '2026-08-19 15:30',
    durationMinutes: 30,
    status: 'Sắp diễn ra',
    chiefComplaint: 'Tư vấn điều chỉnh liều thuốc điều trị thiếu máu cơ tim và xem chỉ số huyết áp theo dõi tại nhà.',
    videoRoomUrl: 'https://meet.vitcrm.vn/room-tele-0819-pat4',
    prescribedDrugsCount: 3
  },
  {
    id: 'tele-2',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    patientPhone: '0912 889 933',
    doctorId: 'doc-2',
    doctorName: 'ThS. BS Hoàng Thu Trang',
    specialty: 'Nội Tiết & Đái Tháo Đường',
    scheduledTime: '2026-08-20 14:00',
    durationMinutes: 25,
    status: 'Sắp diễn ra',
    chiefComplaint: 'Hướng dẫn chế độ ăn Low-Carb và kiểm tra nhật ký đường huyết tuần qua.',
    videoRoomUrl: 'https://meet.vitcrm.vn/room-tele-0820-pat1',
    prescribedDrugsCount: 2
  }
];

export const INITIAL_MEDICAL_PARTNERS: MedicalPartner[] = [
  {
    id: 'partner-1',
    code: 'CTV-BS-101',
    name: 'BS. CKI Nguyễn Văn Cường',
    title: 'Bác sĩ Trưởng phòng khám',
    phone: '0913 221 445',
    email: 'cuong.nguyen@pkankhang.vn',
    category: 'Bác sĩ tuyến dưới / PK Vệ tinh',
    workplace: 'Phòng khám Đa Khoa An Khang (Hà Đông)',
    specialtyOrField: 'Nội Tim Mạch & Lão Khoa',
    bankAccount: {
      bankName: 'Vietcombank',
      accountNumber: '0011004398122',
      accountHolder: 'NGUYEN VAN CUONG'
    },
    commissionRatePercent: 10,
    referralCode: 'BSCUONG_HADONG',
    totalPatientsReferred: 18,
    totalRevenueGenerated: 145000000,
    totalCommissionEarned: 14500000,
    totalCommissionPaid: 12000000,
    pendingBalance: 2500000,
    status: 'Đang hoạt động',
    joinDate: '2026-01-15'
  },
  {
    id: 'partner-2',
    code: 'CTV-DS-202',
    name: 'DS. Đỗ Thị Thu Trang',
    title: 'Dược sĩ Đại học - Chủ nhà thuốc',
    phone: '0988 334 112',
    email: 'trang.duocsi@pharmatamduc.com',
    category: 'Dược sĩ / Nhà thuốc đối tác',
    workplace: 'Nhà Thuốc Tâm Đức (Cầu Giấy)',
    specialtyOrField: 'Dược Lâm Sàng & Thực phẩm chức năng',
    bankAccount: {
      bankName: 'Techcombank',
      accountNumber: '19034821908011',
      accountHolder: 'DO THI THU TRANG'
    },
    commissionRatePercent: 8,
    referralCode: 'DSTAMDUC_CG',
    totalPatientsReferred: 24,
    totalRevenueGenerated: 86000000,
    totalCommissionEarned: 6880000,
    totalCommissionPaid: 5200000,
    pendingBalance: 1680000,
    status: 'Đang hoạt động',
    joinDate: '2026-03-10'
  },
  {
    id: 'partner-3',
    code: 'CTV-BH-303',
    name: 'Trần Thanh Vân',
    title: 'Trưởng nhóm Tư vấn Bảo hiểm Cao cấp',
    phone: '0904 778 991',
    email: 'van.tran@manulife-agency.vn',
    category: 'Đại lý bảo hiểm sức khỏe',
    workplace: 'Đại lý Manulife / Bảo Việt Diamond',
    specialtyOrField: 'Bảo hiểm sức khỏe & Thẻ VIP Viện phí',
    bankAccount: {
      bankName: 'MBBank (Quân Đội)',
      accountNumber: '0881009988776',
      accountHolder: 'TRAN THANH VAN'
    },
    commissionRatePercent: 12,
    referralCode: 'VANINSURANCE_VIP',
    totalPatientsReferred: 14,
    totalRevenueGenerated: 210000000,
    totalCommissionEarned: 25200000,
    totalCommissionPaid: 20000000,
    pendingBalance: 5200000,
    status: 'Đang hoạt động',
    joinDate: '2026-02-01'
  },
  {
    id: 'partner-4',
    code: 'CTV-KOC-404',
    name: 'BS. Vũ Thùy Linh (Dr. Linh Skin)',
    title: 'KOC Bác sĩ Da Liễu 250k Follows',
    phone: '0972 556 677',
    email: 'drlinh.skin@gmail.com',
    category: 'KOC / Reviewer Y tế',
    workplace: 'Kênh TikTok & Fanpage Dr. Linh Y Khoa',
    specialtyOrField: 'Da Liễu, Thẩm Mỹ & Chăm Sóc Mẹ Sau Sinh',
    bankAccount: {
      bankName: 'VPBank',
      accountNumber: '15899201992',
      accountHolder: 'VU THUY LINH'
    },
    commissionRatePercent: 15,
    referralCode: 'DRLINHSKIN_TIKTOK',
    totalPatientsReferred: 35,
    totalRevenueGenerated: 320000000,
    totalCommissionEarned: 48000000,
    totalCommissionPaid: 40000000,
    pendingBalance: 8000000,
    status: 'Đang hoạt động',
    joinDate: '2026-04-20'
  }
];

export const INITIAL_PARTNER_PAYOUTS: PartnerCommissionPayout[] = [
  {
    id: 'payout-1',
    code: 'UNC-2026-T07-01',
    partnerId: 'partner-1',
    partnerName: 'BS. CKI Nguyễn Văn Cường',
    partnerPhone: '0913 221 445',
    bankAccount: 'Vietcombank - 0011004398122 (NGUYEN VAN CUONG)',
    period: 'Kỳ T07/2026',
    totalCases: 5,
    revenueTotal: 42000000,
    payoutAmount: 4200000,
    taxDeduction: 420000,
    netAmount: 3780000,
    status: 'Đã thanh toán (UNC)',
    paidAt: '2026-08-05 14:30',
    transactionRef: 'FT26217891244'
  },
  {
    id: 'payout-2',
    code: 'UNC-2026-T07-02',
    partnerId: 'partner-3',
    partnerName: 'Trần Thanh Vân (Bảo hiểm)',
    partnerPhone: '0904 778 991',
    bankAccount: 'MBBank - 0881009988776 (TRAN THANH VAN)',
    period: 'Kỳ T07/2026',
    totalCases: 4,
    revenueTotal: 68000000,
    payoutAmount: 8160000,
    taxDeduction: 816000,
    netAmount: 7344000,
    status: 'Đã thanh toán (UNC)',
    paidAt: '2026-08-05 15:10',
    transactionRef: 'FT26217899812'
  },
  {
    id: 'payout-3',
    code: 'UNC-2026-T08-01',
    partnerId: 'partner-4',
    partnerName: 'BS. Vũ Thùy Linh (Dr. Linh Skin)',
    partnerPhone: '0972 556 677',
    bankAccount: 'VPBank - 15899201992 (VU THUY LINH)',
    period: 'Kỳ T08/2026 (Tạm tính đợt 1)',
    totalCases: 8,
    revenueTotal: 80000000,
    payoutAmount: 12000000,
    taxDeduction: 1200000,
    netAmount: 10800000,
    status: 'Chờ Kế toán duyệt'
  }
];

export const INITIAL_REFERRALS: ReferralRecord[] = [
  {
    id: 'ref-1',
    partnerId: 'partner-1',
    referrerName: 'BS. CKI Nguyễn Văn Cường',
    referrerType: 'Bác sĩ tuyến dưới',
    referrerPhone: '0913 221 445',
    referralCode: 'BSCUONG_HADONG',
    patientReferredName: 'Đoàn Mạnh Dũng',
    patientPhone: '0903 445 667',
    serviceUsed: 'Gói Tầm Soát Mạch Vành & Chụp CT 128 dãy',
    billAmount: 12500000,
    rewardPoints: 1250,
    commissionAmount: 1250000,
    status: 'Đã chi trả',
    date: '2026-08-05',
    notes: 'Bệnh nhân nghi ngờ thiếu máu cơ tim cục bộ, PK An Khang chuyển tuyến trên chụp CT'
  },
  {
    id: 'ref-2',
    partnerId: 'partner-3',
    referrerName: 'Trần Thanh Vân (Bảo hiểm)',
    referrerType: 'Đại lý bảo hiểm',
    referrerPhone: '0904 778 991',
    referralCode: 'VANINSURANCE_VIP',
    patientReferredName: 'Lê Mai Hương',
    patientPhone: '0912 334 889',
    serviceUsed: 'Gói Thai Sản Trọn Gói Vàng An Lành',
    billAmount: 18000000,
    rewardPoints: 1800,
    commissionAmount: 2160000,
    status: 'Đã chi trả',
    date: '2026-08-12',
    notes: 'Khách hàng có thẻ Bảo hiểm Bảo Việt Diamond liên kết bảo lãnh trực tiếp'
  },
  {
    id: 'ref-3',
    partnerId: 'partner-2',
    referrerName: 'DS. Đỗ Thị Thu Trang',
    referrerType: 'Dược sĩ đối tác',
    referrerPhone: '0988 334 112',
    referralCode: 'DSTAMDUC_CG',
    patientReferredName: 'Nguyễn Bích Loan',
    patientPhone: '0987 112 334',
    serviceUsed: 'Gói Tầm Soát Ung Thư Phụ Khoa & Siêu Âm Tuyến Giáp',
    billAmount: 6500000,
    rewardPoints: 650,
    commissionAmount: 520000,
    status: 'Chờ đối soát',
    date: '2026-08-18',
    notes: 'Khách mua thuốc tại nhà thuốc Tâm Đức, có dấu hiệu mệt mỏi sụt cân'
  },
  {
    id: 'ref-4',
    partnerId: 'partner-4',
    referrerName: 'BS. Vũ Thùy Linh (Dr. Linh Skin)',
    referrerType: 'Cộng tác viên KSK',
    referrerPhone: '0972 556 677',
    referralCode: 'DRLINHSKIN_TIKTOK',
    patientReferredName: 'Phạm Quỳnh Nga',
    patientPhone: '0915 889 001',
    serviceUsed: 'Liệu trình Laser Pico trị nám chuyên sâu 5 buổi',
    billAmount: 22000000,
    rewardPoints: 2200,
    commissionAmount: 3300000,
    status: 'Chờ đối soát',
    date: '2026-08-19',
    notes: 'Khách đăng ký qua link Bio TikTok @drlinhskin'
  }
];

export const INITIAL_FOLLOW_UP_CALLS: FollowUpCallTask[] = [
  {
    id: 'fup-1',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientPhone: '0912 889 933',
    visitDate: '2026-08-17',
    daysAfterVisit: 3,
    primaryDiagnosis: 'Tăng huyết áp vô căn (I10) & Rối loạn chuyển hóa Lipid',
    doctorCareNotes: 'BS dặn: Đo huyết áp tại nhà 2 lần/ngày (sáng lúc vừa ngủ dậy & tối). Kiêng ăn mặn, giảm mỡ động vật. Nhắc BN không tự ý dừng uống thuốc đột ngột. Hẹn tái khám định kỳ sau 30 ngày kèm xét nghiệm mỡ máu lại.',
    prescribedMedicines: ['Amlodipine 5mg', 'Atorvastatin 20mg'],
    callStatus: 'Chờ gọi',
    adverseEffectsReported: 'Chưa có',
    symptomProgression: 'Thuyên giảm rõ rệt',
    assignedStaff: 'ĐD. Lê Thị Diệu',
    scheduledTime: 'Hôm nay, 09:30',
    callNotes: 'Hỏi thăm huyết áp đo sáng tại nhà, kiểm tra xem có triệu chứng phù chân do Amlodipine không.'
  },
  {
    id: 'fup-2',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    patientPhone: '0983 112 244',
    visitDate: '2026-08-18',
    daysAfterVisit: 1,
    primaryDiagnosis: 'Hội chứng thắt lưng hông & Thoái hóa đốt sống L4-L5',
    doctorCareNotes: 'BS dặn: Tuyệt đối tránh cúi gập người mang vác vật nặng >5kg. Nằm đệm cứng, chườm ấm lưng 15 phút mỗi tối. Uống nhiều nước ấm. Nếu cơn đau tê lan xuống bắp chân thì liên hệ phòng khám ngay.',
    prescribedMedicines: ['Celecoxib 200mg', 'Myonal 50mg', 'Esomeprazole 40mg'],
    callStatus: 'Đã gọi - Ổn định',
    adverseEffectsReported: 'Không có tác dụng phụ',
    symptomProgression: 'Thuyên giảm rõ rệt',
    assignedStaff: 'ĐD. Nguyễn Thu Trang',
    scheduledTime: 'Hôm qua, 15:00',
    callNotes: 'Bệnh nhân giảm đau lưng 70%, đi lại nhẹ nhàng tốt. Đã dặn uống nhiều nước và tránh cúi vác nặng.'
  },
  {
    id: 'fup-3',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    visitDate: '2026-08-16',
    daysAfterVisit: 3,
    primaryDiagnosis: 'Liệu trình Laser Pico trị thâm nám & Trẻ hóa vi điểm',
    doctorCareNotes: 'BS Da liễu dặn: Chống nắng tuyệt đối (bôi kem chống nắng SPF50+ cách 3 tiếng/lần, đội mũ rộng vành). Dưỡng ẩm phục hồi sáng - tối, rửa mặt bằng nước muối sinh lý/sữa rửa mặt dịu nhẹ, không tự ý cạy bóc vảy. Nhắc lịch buổi 2 vào 30/08.',
    prescribedMedicines: ['Serum phục hồi B5', 'Kem chống nắng quang phổ rộng SPF50+'],
    callStatus: 'Đã gọi - Ổn định',
    adverseEffectsReported: 'Da hơi ửng hồng nhẹ ngày 1, đã hết hoàn toàn',
    symptomProgression: 'Thuyên giảm rõ rệt',
    assignedStaff: 'BS. CKI Vũ Hoàng Yến',
    scheduledTime: '2026-08-19, 10:15',
    callNotes: 'Da hồi phục rất đẹp sau Laser. Đã nhắc bôi kem chống nắng kỹ và đặt lịch buổi 2 vào ngày 30/08.'
  },
  {
    id: 'fup-4',
    patientId: 'pat-5',
    patientName: 'Lê Mai Hương',
    patientPhone: '0966 223 388',
    visitDate: '2026-08-15',
    daysAfterVisit: 4,
    primaryDiagnosis: 'Khám thai 22 tuần & Siêu âm 4D hình thái thai nhi',
    doctorCareNotes: 'BS Sản dặn: Các chỉ số hình thái thai nhi phát triển bình thường. Mẹ bầu cần ăn bổ sung đạm và rau xanh lá đậm, uống nhiều nước ấm. Theo dõi cử động thai (máy thai) đều đặn. Nhắc lịch tiêm uốn ván mũi 1 ở tuần thai 24.',
    prescribedMedicines: ['Viên sắt Fumafer', 'Canxi hữu cơ NextG Cal', 'DHA bầu'],
    callStatus: 'Cần bác sĩ tư vấn lại',
    adverseEffectsReported: 'Hơi đầy bụng, buồn nôn nhẹ khi uống viên sắt lúc đói',
    symptomProgression: 'Không đổi',
    assignedStaff: 'ThS. BS Phạm Diệu Linh',
    scheduledTime: 'Hôm nay, 14:00',
    callNotes: 'Thai phụ báo viên sắt uống gây khó chịu dạ dày. Cần bác sĩ sản khoa hướng dẫn đổi sang uống sau ăn hoặc đổi sang dạng nước.'
  }
];

export const INITIAL_CSAT_FEEDBACKS: CsatFeedbackItem[] = [
  {
    id: 'csat-1',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    visitDate: '2026-08-17',
    doctorName: 'PGS. TS. BS Trần Minh Đức',
    department: 'Khoa Nội Tổng Quát - Tim Mạch',
    rating: 5,
    npsScore: 10,
    touchpoints: {
      doctorCare: 5,
      nurseAttitude: 5,
      waitingTime: 4,
      cleanliness: 5,
      billingTransparency: 5
    },
    comment: 'Bác sĩ Đức giải thích bệnh tình cực kỳ tỉ mỉ và tâm huyết, điều dưỡng đón tiếp tận tình. Thủ tục bảo lãnh thẻ Bảo Việt làm rất nhanh.',
    sentiment: 'Tích cực',
    isResolved: true
  },
  {
    id: 'csat-2',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    visitDate: '2026-08-18',
    doctorName: 'TS. BS Lê Quang Vinh',
    department: 'Khoa Ngoại Thần Kinh & Cột Sống',
    rating: 5,
    npsScore: 9,
    touchpoints: {
      doctorCare: 5,
      nurseAttitude: 5,
      waitingTime: 5,
      cleanliness: 5,
      billingTransparency: 4
    },
    comment: 'Máy MRI 3.0 Tesla chụp êm, không bị ồn nhiều. Kết quả có ngay trên ứng dụng điện thoại sau 45 phút.',
    sentiment: 'Tích cực',
    isResolved: true
  },
  {
    id: 'csat-3',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    visitDate: '2026-08-15',
    doctorName: 'BS. CKI Vũ Hoàng Yến',
    department: 'Khoa Da Liễu & Thẩm Mỹ',
    rating: 4,
    npsScore: 8,
    touchpoints: {
      doctorCare: 5,
      nurseAttitude: 4,
      waitingTime: 3,
      cleanliness: 5,
      billingTransparency: 5
    },
    comment: 'Bác sĩ tay nghề cao, phòng khám sang trọng. Chỉ góp ý là phòng chờ đợt này hơi đông nên bị trễ khoảng 15 phút.',
    sentiment: 'Trung lập',
    isResolved: true
  },
  {
    id: 'csat-4',
    patientId: 'pat-4',
    patientName: 'Đoàn Mạnh Dũng',
    visitDate: '2026-08-14',
    doctorName: 'PGS. TS. BS Trần Minh Đức',
    department: 'Khoa Khám VIP Executive',
    rating: 5,
    npsScore: 10,
    touchpoints: {
      doctorCare: 5,
      nurseAttitude: 5,
      waitingTime: 5,
      cleanliness: 5,
      billingTransparency: 5
    },
    comment: 'Dịch vụ VIP rất chu đáo, có phòng nghỉ riêng, ăn sáng nhẹ sau khi lấy máu xét nghiệm. Rất xứng đáng.',
    sentiment: 'Tích cực',
    isResolved: true
  }
];

export const INITIAL_CHATBOT_FAQ_SCENARIOS: ChatbotFaqScenario[] = [
  {
    id: 'faq-1',
    topic: 'Bảng giá & Chi phí khám chuyên khoa / Gói khám tổng quát',
    category: 'Chi phí & Viện phí',
    keywords: ['bảng giá', 'chi phí', 'bao nhiêu tiền', 'giá khám', 'khám tổng quát', 'viện phí'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ chào Quý khách! Bảng giá khám lâm sàng tại Hệ thống VitCRM như sau:\n• Khám Bác sĩ Chuyên khoa: 350.000đ - 450.000đ/lượt.\n• Khám Chuyên gia / PGS. Tiến sĩ: 500.000đ - 650.000đ/lượt.\n• Gói Tầm soát sức khỏe Tổng quát Tiêu chuẩn: 2.850.000đ.\n• Gói Khám VIP Toàn diện (có MRI / CT 128 lát): từ 6.500.000đ.\nQuý khách có muốn nhận bảng danh mục chi tiết hoặc đặt lịch khám ngay không ạ?',
    quickReplies: ['Đặt lịch khám ngay', 'Tư vấn gói Tổng quát', 'Xem chính sách BHYT'],
    suggestedAction: 'VIEW_PRICING',
    fallbackToTicket: true,
    ticketCategory: 'Thắc mắc viện phí & bảo lãnh',
    ticketPriority: 'Trung bình (SLA 8h)',
    isActive: true,
    hitCount: 428,
    escalatedTicketCount: 14
  },
  {
    id: 'faq-2',
    topic: 'Quy trình bảo lãnh viện phí BHYT & Bảo hiểm sức khỏe tư nhân',
    category: 'Bảo hiểm & Bảo lãnh',
    keywords: ['bảo hiểm', 'bảo lãnh', 'bhyt', 'bảo việt', 'pvi', 'pti', 'insmart', 'liberty', 'manulife'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ, VitCRM liên kết bảo lãnh trực tiếp tại quầy với hơn 25 công ty bảo hiểm nhân thọ & phi nhân thọ (Bảo Việt, PTI, PVI, Insmart, Liberty, Dai-ichi, Manulife, AIA...).\n• Thủ tục gồm: CCCD gắn chip + Thẻ bảo hiểm cứng (hoặc ứng dụng điện thoại).\n• Thời gian thẩm định bảo lãnh ngoại trú: Chỉ từ 10 - 20 phút.\n• Tiếp nhận thanh toán BHYT Nhà nước theo quy định.\nNếu thẻ bảo hiểm của Quý khách cần tra cứu hạn mức trước, em có thể chuyển thông tin cho chuyên viên Bảo lãnh hỗ trợ ngay ạ.',
    quickReplies: ['Kiểm tra danh sách cty bảo hiểm', 'Cần nhân viên tra cứu hạn mức', 'Đặt lịch khám'],
    suggestedAction: 'CHECK_INSURANCE',
    fallbackToTicket: true,
    ticketCategory: 'Thắc mắc viện phí & bảo lãnh',
    ticketPriority: 'Trung bình (SLA 8h)',
    isActive: true,
    hitCount: 356,
    escalatedTicketCount: 22
  },
  {
    id: 'faq-3',
    topic: 'Hướng dẫn chuẩn bị trước khi xét nghiệm máu & nội soi tiêu hóa',
    category: 'Hướng dẫn khám & Xét nghiệm',
    keywords: ['xét nghiệm', 'nhịn ăn', 'chuẩn bị', 'nội soi', 'uống nước', 'siêu âm', 'lấy máu'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ, để kết quả xét nghiệm và thăm dò chức năng chuẩn xác nhất, Quý khách lưu ý:\n1. Xét nghiệm máu (Đường huyết, Men gan, Mỡ máu): Nhịn ăn từ 6 - 8 tiếng trước khi lấy máu (nên đi vào buổi sáng). Được uống một ít nước lọc tinh khiết.\n2. Nội soi dạ dày - đại tràng: Nhịn ăn tối thiểu 6 tiếng, nhịn uống nước trước 2 tiếng.\n3. Siêu âm ổ bụng / Vùng chậu: Uống nhiều nước và nhịn tiểu để bàng quang căng vừa phải.\nQuý khách cần chuẩn bị cho dịch vụ khám cụ thể nào ạ?',
    quickReplies: ['Nội soi dạ dày tiền mê', 'Xét nghiệm tổng quát', 'Đặt lịch sáng mai'],
    suggestedAction: 'BOOK_APPOINTMENT',
    fallbackToTicket: false,
    ticketCategory: 'Tư vấn kết quả chuyên môn',
    ticketPriority: 'Trung bình (SLA 8h)',
    isActive: true,
    hitCount: 290,
    escalatedTicketCount: 5
  },
  {
    id: 'faq-4',
    topic: 'Đặt lịch hẹn khám & Yêu cầu chỉ định Bác sĩ Trưởng khoa',
    category: 'Đặt lịch & Bác sĩ',
    keywords: ['đặt lịch', 'hẹn khám', 'bác sĩ', 'trưởng khoa', 'tiến sĩ', 'chuyên gia', 'chọn bác sĩ'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ, Quý khách hoàn toàn có thể chủ động chọn Bác sĩ thăm khám theo nhu cầu:\n• PGS. TS. BS Trần Minh Đức (Trưởng khoa Nội Tim mạch - Đa khoa)\n• TS. BS Lê Quang Vinh (Trưởng khoa Ngoại Thần kinh & Cột sống)\n• ThS. BS Phạm Diệu Linh (Phó khoa Sản Phụ Khoa & Tầm soát tiền sản)\n• BS. CKI Vũ Hoàng Yến (Chuyên gia Da liễu & Laser Thẩm mỹ)\nQuý khách chỉ cần gửi Họ tên, SĐT và Khung giờ mong muốn, hệ thống sẽ xác nhận lịch hẹn tức thì qua Zalo ZNS!',
    quickReplies: ['Đặt lịch PGS. Minh Đức', 'Đặt lịch BS. Diệu Linh', 'Xem lịch trực tuần này'],
    suggestedAction: 'BOOK_APPOINTMENT',
    fallbackToTicket: false,
    ticketCategory: 'Góp ý dịch vụ',
    ticketPriority: 'Tiêu chuẩn (SLA 24h)',
    isActive: true,
    hitCount: 512,
    escalatedTicketCount: 8
  },
  {
    id: 'faq-5',
    topic: 'Tra cứu kết quả khám & tư vấn sức khỏe online qua Zalo ZNS',
    category: 'Tra cứu kết quả',
    keywords: ['kết quả', 'kết quả khám online', 'tra cứu', 'hồ sơ khám', 'kết quả khám'],
    channels: ['Zalo OA', 'Facebook Messenger'],
    botResponse: 'Dạ, toàn bộ Kết quả khám và Hồ sơ sức khỏe sẽ được gửi tự động:\n1. Hệ thống tự động gửi đường link bảo mật qua tin nhắn Zalo ZNS/SMS ngay khi hoàn tất buổi khám.\n2. Quý khách chỉ cần nhập Mã Khách Hàng (hoặc 4 số cuối CCCD) để xem kết quả và hướng dẫn chăm sóc.\nNếu Quý khách chưa nhận được đường link, vui lòng gửi Mã tiếp nhận để em hỗ trợ kiểm tra ngay ạ.',
    quickReplies: ['Chưa nhận được kết quả', 'Cần tư vấn lại kết quả', 'Hướng dẫn mở link'],
    suggestedAction: 'CONNECT_HUMAN',
    fallbackToTicket: true,
    ticketCategory: 'Tư vấn kết quả chuyên môn',
    ticketPriority: 'Cao (SLA 2h)',
    isActive: true,
    hitCount: 318,
    escalatedTicketCount: 19
  },
  {
    id: 'faq-6',
    topic: 'Địa chỉ, sơ đồ cơ sở & Giờ mở cửa phòng khám',
    category: 'Cơ sở & Giờ làm việc',
    keywords: ['địa chỉ', 'giờ mở cửa', 'chi nhánh', 'gửi xe', 'ở đâu', 'chỉ đường', 'khám chủ nhật'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ, Hệ thống Y tế VitCRM phục vụ Quý khách từ 7:30 - 20:00 tất cả các ngày trong tuần (kể cả Thứ 7, Chủ Nhật & Ngày Lễ):\n📍 Cơ sở 1 (Trung tâm): Số 188 Phố Huế, Q. Hai Bà Trưng, Hà Nội (Có bãi đỗ xe ô tô miễn phí).\n📍 Cơ sở 2 (Cầu Giấy): Tòa nhà Keangnam Landmark 72, Phạm Hùng, Hà Nội.\n📍 Cơ sở 3 (TP.HCM): 215 Hồng Bàng, Phường 11, Quận 5, TP.HCM.\nHotline cấp cứu & Đặt hẹn 24/7: 1900 8866 22.',
    quickReplies: ['Chỉ đường đến Phố Huế', 'Chỉ đường Keangnam', 'Đặt hẹn khám'],
    suggestedAction: 'BOOK_APPOINTMENT',
    fallbackToTicket: false,
    ticketCategory: 'Góp ý dịch vụ',
    ticketPriority: 'Tiêu chuẩn (SLA 24h)',
    isActive: true,
    hitCount: 640,
    escalatedTicketCount: 3
  },
  {
    id: 'faq-7',
    topic: 'Phản ánh chất lượng dịch vụ & Yêu cầu gặp trực tiếp Trưởng phòng CSKH',
    category: 'Chi phí & Viện phí',
    keywords: ['khiếu nại', 'phàn nàn', 'thái độ', 'bực mình', 'gặp nhân viên', 'người thật', 'không hài lòng', 'chưa được giải quyết', 'nhân viên tư vấn'],
    channels: ['Zalo OA', 'Facebook Messenger', 'Website Livechat'],
    botResponse: 'Dạ, VitCRM xin chân thành cáo lỗi vì bất kỳ trải nghiệm chưa trọn vẹn nào của Quý khách! Em đã kích hoạt cơ chế Chuyển tiếp khẩn cấp (Escalation Protocol) và tự động tạo Phiếu Chăm Sóc Khách Hàng (SLA 30 phút). Trưởng phòng CSKH / Điều Dưỡng Trực sẽ liên hệ trực tiếp qua số điện thoại của Quý khách ngay để xử lý thỏa đáng nhất.',
    quickReplies: ['Xác nhận tạo phiếu hỗ trợ', 'Gọi hotline 1900 8866 22', 'Để lại lời nhắn'],
    suggestedAction: 'CONNECT_HUMAN',
    fallbackToTicket: true,
    ticketCategory: 'Khiếu nại thái độ',
    ticketPriority: 'Khẩn cấp (SLA 30p)',
    isActive: true,
    hitCount: 185,
    escalatedTicketCount: 185
  }
];

export const INITIAL_OMNICHANNEL_CONVERSATIONS: OmnichannelConversation[] = [
  {
    id: 'conv-1',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    patientPhone: '0912 889 933',
    channel: 'Zalo OA',
    channelUserId: 'zalo-user-889933',
    status: 'agent_needed',
    priority: 'Khẩn cấp',
    assignedStaff: 'Lê Thanh Thảo (CSKH Hotline)',
    unreadCount: 2,
    lastMessage: 'Alo bệnh viện ơi, mẹ em sáng nay đau đầu dữ dội kèm buồn nôn, em muốn đổi lịch chụp MRI não sang 10h sáng nay được không?',
    lastMessageTime: '09:42',
    waitingMinutes: 4,
    slaBreached: false,
    tags: ['Tầm Soát Đột Quỵ', 'Đổi Lịch Gấp', 'VIP Diamond'],
    sentiment: 'Tiêu cực / Bức xúc',
    lastIntent: 'Đổi lịch khám & Cấp cứu đột quỵ',
    notes: 'Bệnh nhân có tiền sử Tăng huyết áp độ 2 và Đái tháo đường type 2. Cần ưu tiên xếp slot MRI khẩn.',
    messages: [
      {
        id: 'c1-m1',
        sender: 'user',
        text: 'Em chào bệnh viện ạ, em muốn hỏi lịch chụp MRI não của mẹ em',
        timestamp: '09:30',
        channel: 'Zalo OA'
      },
      {
        id: 'c1-m2',
        sender: 'bot',
        text: 'Dạ VitCRM xin chào chị Bích Thủy! Hệ thống ghi nhận chị đang có lịch hẹn MRI Sọ não vào lúc 14:30 chiều mai. Chị cần hỗ trợ thay đổi hay có thắc mắc gì về chuẩn bị khám không ạ?',
        timestamp: '09:30',
        channel: 'Zalo OA',
        quickReplies: ['Đổi sang hôm nay', 'Hỏi giá dịch vụ', 'Gặp nhân viên hỗ trợ']
      },
      {
        id: 'c1-m3',
        sender: 'user',
        text: 'Alo bệnh viện ơi, mẹ em sáng nay đau đầu dữ dội kèm buồn nôn, em muốn đổi lịch chụp MRI não sang 10h sáng nay được không?',
        timestamp: '09:42',
        channel: 'Zalo OA'
      }
    ]
  },
  {
    id: 'conv-2',
    patientId: 'pat-2',
    patientName: 'Trần Văn Bình',
    patientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    patientPhone: '0903 445 667',
    channel: 'Facebook Messenger',
    channelUserId: 'fb-user-445667',
    status: 'agent_handling',
    priority: 'Ưu tiên',
    assignedStaff: 'BS. CKI Vũ Hoàng Yến',
    unreadCount: 0,
    lastMessage: 'Dạ Bác sĩ đã xem phiếu xét nghiệm mỡ máu của anh Bình, chỉ số Triglyceride 3.8 mmol/L hơi cao. Bác sĩ đang kê đơn điều chỉnh liều thuốc Lipanthyl cho anh nhé.',
    lastMessageTime: '09:38',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['Tư Vấn Sau Khám', 'Nội Tiết', 'Hội Viên Gold'],
    sentiment: 'Trung lập',
    lastIntent: 'Tư vấn kết quả khám sức khỏe',
    notes: 'Khách hàng vừa khám tổng quát hôm 15/08, cần tư vấn thêm kết quả.',
    messages: [
      {
        id: 'c2-m1',
        sender: 'user',
        text: 'Chào bạn, tôi vừa nhận được kết quả khám sức khỏe tổng quát, thấy chỉ số Triglyceride hơi cao, có cần ăn kiêng gì không?',
        timestamp: '09:20',
        channel: 'Facebook Messenger'
      },
      {
        id: 'c2-m2',
        sender: 'bot',
        text: 'Dạ chào anh Bình! Em xin phép chuyển câu hỏi cùng hồ sơ khám của anh tới Chuyên viên Tư vấn Sức khỏe để hỗ trợ chi tiết cho anh ngay ạ.',
        timestamp: '09:21',
        channel: 'Facebook Messenger'
      },
      {
        id: 'c2-m3',
        sender: 'agent',
        text: 'Dạ Chuyên viên đã xem kết quả khám của anh Bình, chỉ số mỡ máu Triglyceride 3.8 mmol/L cần điều chỉnh chế độ ăn giảm dầu mỡ và tăng cường vận động. Em gửi anh cẩm nang dinh dưỡng qua Zalo nhé.',
        timestamp: '09:38',
        channel: 'Facebook Messenger'
      }
    ]
  },
  {
    id: 'conv-3',
    patientId: 'pat-3',
    patientName: 'Lê Hoàng Nam',
    patientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    patientPhone: '0988 123 456',
    channel: 'Website Livechat',
    channelUserId: 'web-anon-123456',
    status: 'bot_handling',
    priority: 'Bình thường',
    assignedStaff: 'Chatbot AI VitCRM',
    unreadCount: 0,
    lastMessage: 'Bệnh viện mình có bảo lãnh thẻ Bảo Việt An Gia hạng Vàng và PTI Bưu Điện không ạ?',
    lastMessageTime: '09:35',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['Bảo Hiểm Bảo Lãnh', 'Tư Vấn Thẻ'],
    sentiment: 'Tích cực',
    lastIntent: 'Hỏi danh sách bảo hiểm bảo lãnh trực tiếp',
    notes: 'Khách hàng quan tâm gói phẫu thuật dây chằng gối nội trú.',
    messages: [
      {
        id: 'c3-m1',
        sender: 'user',
        text: 'Bệnh viện mình có bảo lãnh thẻ Bảo Việt An Gia hạng Vàng và PTI Bưu Điện không ạ?',
        timestamp: '09:35',
        channel: 'Website Livechat'
      },
      {
        id: 'c3-m2',
        sender: 'bot',
        text: 'Dạ có ạ! VitHospital là đối tác liên kết bảo lãnh viện phí trực tiếp cấp cao của cả Bảo Việt và PTI Bưu Điện. Quý khách chỉ cần mang Thẻ bảo hiểm cứng/App và CCCD, quầy Bảo hiểm tầng 1 sẽ thẩm định hồ sơ trong 15 - 30 phút mà không cần tạm ứng tiền túi ạ.',
        timestamp: '09:35',
        channel: 'Website Livechat',
        quickReplies: ['Thủ tục bảo lãnh ngoại trú', 'Bảo lãnh phẫu thuật', 'Đặt lịch tiếp đón ưu tiên']
      }
    ]
  },
  {
    id: 'conv-4',
    patientId: 'pat-4',
    patientName: 'Phạm Thanh Hà',
    patientAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    patientPhone: '0977 223 344',
    channel: 'Zalo OA',
    channelUserId: 'zalo-user-223344',
    status: 'resolved',
    priority: 'Bình thường',
    assignedStaff: 'Nguyễn Bích Ngọc (Lễ tân)',
    unreadCount: 0,
    lastMessage: 'Cảm ơn em nhiều nhé, chị đã nhận được tin nhắn Zalo ZNS xác nhận lịch khám 09:30 sáng mai với BS. Diệu Linh rồi!',
    lastMessageTime: '09:15',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['Sản Phụ Khoa', 'Đã Đặt Hẹn Thành Công'],
    sentiment: 'Tích cực',
    lastIntent: 'Đặt hẹn ThS. BS Phạm Diệu Linh',
    messages: [
      {
        id: 'c4-m1',
        sender: 'user',
        text: 'Chị muốn đặt lịch khám thai định kỳ tuần 28 với ThS. BS Phạm Diệu Linh sáng mai',
        timestamp: '09:05',
        channel: 'Zalo OA'
      },
      {
        id: 'c4-m2',
        sender: 'bot',
        text: 'Dạ, ThS. BS Phạm Diệu Linh có lịch khám tại Phòng 302 Cơ sở Liễu Giai sáng mai (08:00 - 11:30). Chị Hà muốn chọn khung giờ nào ạ?',
        timestamp: '09:05',
        channel: 'Zalo OA',
        quickReplies: ['08:30 sáng mai', '09:30 sáng mai', '10:30 sáng mai']
      },
      {
        id: 'c4-m3',
        sender: 'user',
        text: 'Cho chị khung giờ 09:30 sáng mai nhé',
        timestamp: '09:08',
        channel: 'Zalo OA'
      },
      {
        id: 'c4-m4',
        sender: 'agent',
        text: 'Dạ em đã tạo mã hẹn khám #APPT-2026-9821 cho chị Phạm Thanh Hà vào lúc 09:30 ngày 21/08/2026 tại PK Sản 302 ạ. Chúc chị và bé luôn mạnh khỏe!',
        timestamp: '09:12',
        channel: 'Zalo OA'
      },
      {
        id: 'c4-m5',
        sender: 'user',
        text: 'Cảm ơn em nhiều nhé, chị đã nhận được tin nhắn Zalo ZNS xác nhận lịch khám 09:30 sáng mai với BS. Diệu Linh rồi!',
        timestamp: '09:15',
        channel: 'Zalo OA'
      }
    ]
  },
  {
    id: 'conv-5',
    patientId: 'pat-5',
    patientName: 'Hoàng Minh Tuấn',
    patientAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    patientPhone: '0966 554 433',
    channel: 'Facebook Messenger',
    channelUserId: 'fb-user-554433',
    status: 'agent_needed',
    priority: 'Khẩn cấp',
    assignedStaff: 'Chưa phân công',
    unreadCount: 3,
    lastMessage: 'Tôi vừa thanh toán hóa đơn khám 2.8 triệu nhưng sao trên bill không áp mã voucher giảm 500k sinh nhật đã gửi qua Zalo? Đề nghị giải thích và hoàn tiền!',
    lastMessageTime: '09:32',
    waitingMinutes: 8,
    slaBreached: true,
    tags: ['Khiếu Nại Viện Phí', 'Voucher Sinh Nhật', 'SLA Cảnh Báo', 'VIP Gold'],
    sentiment: 'Tiêu cực / Bức xúc',
    lastIntent: 'Khiếu nại chưa áp voucher giảm giá viện phí',
    notes: 'Bệnh nhân VIP Gold, đang ở quầy Thu ngân tầng 1 bức xúc.',
    messages: [
      {
        id: 'c5-m1',
        sender: 'user',
        text: 'Tôi vừa thanh toán hóa đơn khám 2.8 triệu nhưng sao trên bill không áp mã voucher giảm 500k sinh nhật đã gửi qua Zalo? Đề nghị giải thích và hoàn tiền!',
        timestamp: '09:32',
        channel: 'Facebook Messenger'
      },
      {
        id: 'c5-m2',
        sender: 'bot',
        text: 'Dạ VitCRM thành thật xin lỗi anh Minh Tuấn về sự bất tiện này! Hệ thống đang kết nối trực tiếp với Quản lý quầy Thu ngân và CSKH để kiểm tra mã voucher và xử lý hoàn chênh lệch ngay cho anh ạ.',
        timestamp: '09:32',
        channel: 'Facebook Messenger'
      }
    ]
  },
  {
    id: 'conv-6',
    patientId: 'pat-6',
    patientName: 'Đỗ Thu Hằng',
    patientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    patientPhone: '0933 667 788',
    channel: 'Zalo OA',
    channelUserId: 'zalo-user-667788',
    status: 'bot_handling',
    priority: 'Bình thường',
    assignedStaff: 'Chatbot AI VitCRM',
    unreadCount: 0,
    lastMessage: 'Nội soi dạ dày tiền mê không đau giá trọn gói bao nhiêu và có cần người nhà đi cùng không em?',
    lastMessageTime: '09:28',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['Nội Soi Tiêu Hóa', 'Nội Soi Tiền Mê'],
    sentiment: 'Trung lập',
    lastIntent: 'Hỏi giá và chuẩn bị nội soi tiền mê',
    messages: [
      {
        id: 'c6-m1',
        sender: 'user',
        text: 'Nội soi dạ dày tiền mê không đau giá trọn gói bao nhiêu và có cần người nhà đi cùng không em?',
        timestamp: '09:28',
        channel: 'Zalo OA'
      },
      {
        id: 'c6-m2',
        sender: 'bot',
        text: 'Dạ, Gói Nội soi Dạ dày Tiền mê không đau ứng dụng công nghệ NBI Nhật Bản tại VitHospital có giá trọn gói 2.450.000đ (đã gồm thuốc gây mê thế hệ mới & test vi khuẩn HP).\nLưu ý quan trọng: Do có dùng thuốc tiền mê êm dịu, Quý khách cần có 01 người nhà đi cùng để hỗ trợ đưa đón sau khi thực hiện xong ạ.',
        timestamp: '09:28',
        channel: 'Zalo OA',
        quickReplies: ['Đặt lịch nội soi', 'Tư vấn hướng dẫn nhịn ăn', 'Xem clip phòng nội soi']
      }
    ]
  },
  {
    id: 'conv-7',
    patientId: 'pat-7',
    patientName: 'Vũ Đình Trọng',
    patientAvatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150',
    patientPhone: '0918 990 011',
    channel: 'Website Livechat',
    channelUserId: 'web-user-990011',
    status: 'agent_handling',
    priority: 'Ưu tiên',
    assignedStaff: 'Trần Hoài Nam (Sales B2B Lead)',
    unreadCount: 0,
    lastMessage: 'Em đã gửi file Báo giá chi tiết gói KSK Thông tư 32 cho 65 CBNV Công ty Logistics Tân Cảng qua Zalo anh Trọng rồi nhé ạ.',
    lastMessageTime: '09:18',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['B2B Khám Doanh Nghiệp', 'Hợp Đồng KSK'],
    sentiment: 'Tích cực',
    lastIntent: 'Yêu cầu báo giá KSK Doanh nghiệp',
    messages: [
      {
        id: 'c7-m1',
        sender: 'user',
        text: 'Công ty mình khoảng 65 nhân sự muốn tổ chức khám sức khỏe định kỳ vào tháng 9 tới tại cơ sở Hai Bà Trưng, có gói khám theo TT 32 không?',
        timestamp: '09:10',
        channel: 'Website Livechat'
      },
      {
        id: 'c7-m2',
        sender: 'agent',
        text: 'Dạ em chào anh Trọng, phụ trách KSK Doanh nghiệp tại VitHospital ạ! Bên em có đầy đủ 3 hạng gói (Cơ bản TT32, Nâng cao tầm soát ung thư & VIP Lãnh đạo) với chiết khấu từ 20 - 25% cho đoàn trên 50 người kèm xe đưa đón tận nơi. Em đã gửi file Báo giá chi tiết gói KSK Thông tư 32 cho 65 CBNV Công ty Logistics Tân Cảng qua Zalo anh Trọng rồi nhé ạ.',
        timestamp: '09:18',
        channel: 'Website Livechat'
      }
    ]
  },
  {
    id: 'conv-8',
    patientId: 'pat-8',
    patientName: 'Bùi Tuyết Mai',
    patientAvatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150',
    patientPhone: '0945 112 233',
    channel: 'Zalo OA',
    channelUserId: 'zalo-user-112233',
    status: 'bot_handling',
    priority: 'Bình thường',
    assignedStaff: 'Chatbot AI VitCRM',
    unreadCount: 0,
    lastMessage: 'Cơ sở Ba Đình ở 45 Liễu Giai có hầm để xe ô tô 7 chỗ không em ơi?',
    lastMessageTime: '09:02',
    waitingMinutes: 0,
    slaBreached: false,
    tags: ['Cơ Sở Vật Chất', 'Bãi Đỗ Xe'],
    sentiment: 'Trung lập',
    lastIntent: 'Hỏi địa điểm và bãi đỗ xe',
    messages: [
      {
        id: 'c8-m1',
        sender: 'user',
        text: 'Cơ sở Ba Đình ở 45 Liễu Giai có hầm để xe ô tô 7 chỗ không em ơi?',
        timestamp: '09:02',
        channel: 'Zalo OA'
      },
      {
        id: 'c8-m2',
        sender: 'bot',
        text: 'Dạ có ạ! Cơ sở VitClinic Ba Đình (Số 45 Liễu Giai) có 2 tầng hầm đỗ xe ô tô và xe máy rộng rãi, có bảo vệ hỗ trợ đỗ xe miễn phí cho khách hàng đến thăm khám. Phòng khám mở cửa từ 07:30 - 20:00 tất cả các ngày trong tuần kể cả Thứ 7 và Chủ Nhật ạ.',
        timestamp: '09:02',
        channel: 'Zalo OA',
        quickReplies: ['Chỉ đường Google Maps', 'Đặt hẹn khám', 'Bảng giá cơ sở Ba Đình']
      }
    ]
  }
];

export const INITIAL_AUTO_RECALLS: AutoRecallTask[] = [
  {
    id: 'recall-1',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientPhone: '0912 345 678',
    lastVisitDate: '2026-07-22',
    dueDate: '2026-08-21',
    daysOverdue: 2,
    conditionCategory: 'Bệnh Mạn Tính (Tim mạch / Tiểu đường)',
    primaryDiagnosis: 'Tăng huyết áp vô căn (I10) & Rối loạn Lipid máu',
    recallReason: 'Định kỳ 30 ngày: Xét nghiệm mỡ máu (Lipid panel), kiểm tra điện tim ECG và đánh giá hiệu chỉnh liều thuốc hạ áp',
    recallIntervalDays: 30,
    doctorRecommendation: 'BS Đức dặn: Bệnh nhân cần xét nghiệm lại Cholesterol, Triglyceride và kiểm tra chức năng gan thận sau 1 tháng dùng thuốc.',
    assignedDoctor: 'PGS. TS. BS Trần Minh Đức',
    assignedStaff: 'ĐD. Lê Thị Diệu',
    status: 'Đến hạn - Chờ liên hệ',
    notes: 'Bệnh nhân có tiền sử theo dõi huyết áp rất đều đặn, gọi lúc 9h-11h sáng là thuận tiện nhất.'
  },
  {
    id: 'recall-2',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    lastVisitDate: '2026-08-10',
    dueDate: '2026-08-24',
    daysOverdue: -1,
    conditionCategory: 'Da Liễu & Thẩm Mỹ',
    primaryDiagnosis: 'Liệu trình Laser Pico trị thâm nám & Trẻ hóa vi điểm',
    recallReason: 'Buổi 2/5 trong liệu trình Laser Pico điều trị nám sâu & phục hồi hàng rào bảo vệ da',
    recallIntervalDays: 14,
    doctorRecommendation: 'BS Yến dặn: Kiểm tra mức độ bong tróc vi điểm, chụp soi da VISIA lần 2 và tiến hành bắn Laser năng lượng chuẩn buổi 2.',
    assignedDoctor: 'BS. CKI Vũ Hoàng Yến',
    assignedStaff: 'CSKH Nguyễn Mai Linh',
    status: 'Đã gửi ZNS nhắc hẹn',
    notes: 'Đã gửi tin Zalo ZNS nhắc lịch cách đây 1 ngày. Khách hàng đã xem tin.'
  },
  {
    id: 'recall-3',
    patientId: 'pat-5',
    patientName: 'Lê Mai Hương',
    patientPhone: '0966 223 388',
    lastVisitDate: '2026-07-25',
    dueDate: '2026-08-22',
    daysOverdue: 1,
    conditionCategory: 'Sản Phụ Khoa & Tiền Sản',
    primaryDiagnosis: 'Quản lý thai kỳ tuần 24 & Tiêm phòng uốn ván mũi 1',
    recallReason: 'Khám thai định kỳ mốc 24 tuần: Nghiệm pháp dung nạp đường huyết (OGTT) tầm soát Đái tháo đường thai kỳ & Tiêm uốn ván VAT 1',
    recallIntervalDays: 28,
    doctorRecommendation: 'BS Linh dặn: Hướng dẫn thai phụ nhịn ăn sáng 8 tiếng trước khi làm xét nghiệm dung nạp đường huyết 3 mẫu.',
    assignedDoctor: 'ThS. BS Phạm Diệu Linh',
    assignedStaff: 'ĐD. Lê Thị Diệu',
    status: 'Đến hạn - Chờ liên hệ',
    notes: 'Lưu ý nhắc bệnh nhân đến sớm từ 7h30 để làm nghiệm pháp đường huyết kịp buổi sáng.'
  },
  {
    id: 'recall-4',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    patientPhone: '0983 112 244',
    lastVisitDate: '2026-08-01',
    dueDate: '2026-08-15',
    daysOverdue: 8,
    conditionCategory: 'Bệnh Mạn Tính (Tim mạch / Tiểu đường)',
    primaryDiagnosis: 'Thoái hóa đốt sống thắt lưng L4-L5 & Chèn ép rễ thần kinh',
    recallReason: 'Đánh giá đáp ứng sau 2 tuần dùng thuốc giãn cơ & Vật lý trị liệu kéo giãn cột sống',
    recallIntervalDays: 14,
    doctorRecommendation: 'BS Vinh dặn: Nếu cơn đau thuyên giảm tốt thì chuyển sang bài tập tăng cường cơ lõi tại nhà; nếu còn tê chân thì chụp MRI kiểm tra thêm.',
    assignedDoctor: 'TS. BS Lê Quang Vinh',
    assignedStaff: 'ĐD. Nguyễn Thu Trang',
    status: 'Đã gọi - Đồng ý đặt lịch',
    notes: 'Bệnh nhân đồng ý tái khám vào Thứ 7 tuần này lúc 14:30.'
  },
  {
    id: 'recall-5',
    patientId: 'pat-6',
    patientName: 'Hoàng Văn Nam',
    patientPhone: '0934 889 900',
    lastVisitDate: '2026-02-20',
    dueDate: '2026-08-20',
    daysOverdue: 3,
    conditionCategory: 'Nha Khoa & Răng Hàm Mặt',
    primaryDiagnosis: 'Lấy cao răng định kỳ & Kiểm tra túi nha chu',
    recallReason: 'Khám răng miệng & cạo vôi răng định kỳ 6 tháng/lần phòng ngừa tụt lợi và viêm nha chu',
    recallIntervalDays: 180,
    doctorRecommendation: 'BS dặn: Bệnh nhân có cầu răng sứ hàm dưới cần kiểm tra định kỳ để phát hiện viêm quanh chân răng sớm.',
    assignedDoctor: 'BS. CKI Đỗ Tuấn Kiệt',
    assignedStaff: 'CSKH Nguyễn Mai Linh',
    status: 'Đến hạn - Chờ liên hệ',
    notes: 'Khách hàng đăng ký gói chăm sóc răng gia đình Diamond.'
  }
];

export const INITIAL_ZNS_LOGS: ZnsCareMessageLog[] = [
  {
    id: 'zns-log-1',
    patientId: 'pat-1',
    patientName: 'Nguyễn Thị Bích Thủy',
    patientPhone: '0912 345 678',
    templateType: 'ZNS_POST_VISIT_CARE',
    templateName: 'ZNS Dặn dò sau khám & Hướng dẫn theo dõi sức khỏe',
    diagnosis: 'Tăng huyết áp vô căn (I10) & Rối loạn Lipid máu',
    doctorCareNotes: 'BS dặn: Đo huyết áp tại nhà 2 lần/ngày (sáng lúc vừa ngủ dậy & tối). Kiêng ăn mặn, giảm mỡ động vật. Nhắc BN không tự ý dừng uống thuốc đột ngột. Hẹn tái khám định kỳ sau 30 ngày.',
    channel: 'Zalo ZNS',
    status: 'Đã đọc',
    sentAt: '2026-08-17 11:30',
    deliveredAt: '2026-08-17 11:30',
    readAt: '2026-08-17 11:34',
    trackingCode: 'ZNS-2026-88102',
    cost: 320
  },
  {
    id: 'zns-log-2',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    templateType: 'ZNS_POST_VISIT_CARE',
    templateName: 'ZNS Hướng dẫn chăm sóc da sau Laser & Bắn vi điểm',
    diagnosis: 'Liệu trình Laser Pico trị thâm nám & Trẻ hóa vi điểm',
    doctorCareNotes: 'BS Da liễu dặn: Chống nắng tuyệt đối (bôi kem chống nắng SPF50+ cách 3 tiếng/lần, đội mũ rộng vành). Dưỡng ẩm phục hồi sáng - tối, rửa mặt bằng nước muối sinh lý/sữa rửa mặt dịu nhẹ, không tự ý cạy bóc vảy. Nhắc lịch buổi 2 vào 30/08.',
    channel: 'Zalo ZNS',
    status: 'Đã đọc',
    sentAt: '2026-08-16 16:45',
    deliveredAt: '2026-08-16 16:45',
    readAt: '2026-08-16 16:50',
    trackingCode: 'ZNS-2026-88103',
    cost: 320
  },
  {
    id: 'zns-log-3',
    patientId: 'pat-5',
    patientName: 'Lê Mai Hương',
    patientPhone: '0966 223 388',
    templateType: 'ZNS_AUTO_RECALL',
    templateName: 'ZNS Nhắc lịch tái khám & Tầm soát định kỳ',
    diagnosis: 'Khám thai 22 tuần & Siêu âm 4D hình thái thai nhi',
    doctorCareNotes: 'BS Sản dặn: Các chỉ số hình thái thai nhi phát triển bình thường. Nhắc lịch tiêm uốn ván mũi 1 và làm xét nghiệm đường huyết ở tuần thai 24.',
    channel: 'Zalo ZNS',
    status: 'Đã gửi thành công',
    sentAt: '2026-08-22 08:30',
    deliveredAt: '2026-08-22 08:30',
    trackingCode: 'ZNS-2026-88104',
    cost: 320
  }
];

export const INITIAL_VOIP_CALLS: VoipCallSession[] = [
  {
    id: 'call-101',
    callType: 'OUTBOUND_CSKH',
    patientId: 'pat-2',
    patientName: 'Trần Đăng Khoa',
    patientPhone: '0983 112 244',
    agentStaffName: 'ĐD. Nguyễn Thu Trang',
    agentExtension: '108',
    startTime: '2026-08-19 14:58',
    endTime: '2026-08-19 15:02',
    durationSeconds: 245,
    status: 'Hoàn tất cuộc gọi',
    audioRecordingUrl: 'https://audio.vithospital.vn/rec-20260819-0983112244.mp3',
    callNotes: 'Bệnh nhân báo lưng đã giảm đau 70%, đi lại nhẹ nhàng tốt. Đã dặn uống nhiều nước và tránh cúi vác nặng.',
    callOutcome: 'Ổn định'
  },
  {
    id: 'call-102',
    callType: 'OUTBOUND_CSKH',
    patientId: 'pat-3',
    patientName: 'Vũ Hoàng Yến Nhi',
    patientPhone: '0975 667 889',
    agentStaffName: 'BS. CKI Vũ Hoàng Yến',
    agentExtension: '102',
    startTime: '2026-08-19 10:12',
    endTime: '2026-08-19 10:17',
    durationSeconds: 310,
    status: 'Hoàn tất cuộc gọi',
    audioRecordingUrl: 'https://audio.vithospital.vn/rec-20260819-0975667889.mp3',
    callNotes: 'Da hồi phục rất đẹp sau Laser. Đã nhắc bôi kem chống nắng kỹ và xác nhận lịch buổi 2 vào ngày 30/08.',
    callOutcome: 'Hẹn tái khám'
  }
];

export const mockAutoRecalls = INITIAL_AUTO_RECALLS;
export const mockZnsLogs = INITIAL_ZNS_LOGS;
export const mockVoipCalls = INITIAL_VOIP_CALLS;
export const mockOmnichannelConversations = INITIAL_OMNICHANNEL_CONVERSATIONS;

export const INITIAL_MEDICAL_PACKAGES: MedicalPackage[] = [
  // ==========================================
  // 1. GÓI KHÁM SỨC KHỎE TRỌN GÓI (PACKAGES)
  // ==========================================
  {
    id: 'pkg-1',
    code: 'VIP-ONCO-01',
    name: 'Gói Tầm Soát Ung Thư Toàn Thân Toàn Diện (MRI + CT 128 Lát)',
    type: 'package',
    category: 'Tầm Soát Ung Thư',
    price: 18500000,
    discountPrice: 16500000,
    unit: 'Gói trọn gói',
    insuranceCovered: true,
    insuranceCoveragePercent: 40,
    targetGender: 'Tất cả',
    targetAgeRange: 'Từ 35 tuổi trở lên',
    department: 'Trung Tâm Tầm Soát & Chẩn Đoán Hình Ảnh',
    items: [
      'Chụp MRI toàn thân 1.5 Tesla khảo sát sọ não, cột sống, ổ bụng',
      'Chụp CT-Scanner lồng ngực liều thấp tầm soát u phổi',
      'Nội soi thực quản - dạ dày - đại tràng tiền mê không đau (NBI)',
      'Bộ chỉ số Tumor Markers máu: CEA, CA 19-9, AFP, PSA (Nam) / CA 125 (Nữ), Cyfra 21-1',
      'Siêu âm Doppler màu tuyến giáp & tuyến vú (Nữ)',
      'Tư vấn kết luận chuyên sâu cùng Bác sĩ Chuyên khoa Ung Bướu'
    ],
    description: 'Tầm soát phát hiện sớm các khối u ác tính từ giai đoạn vi thể, đánh giá tổng thể chức năng cơ quan.',
    preparationNotes: 'Nhịn ăn sáng tối thiểu 6-8 tiếng. Uống nước lọc bình thường.',
    executionTime: '3 - 4 giờ',
    status: 'Đang áp dụng',
    createdDate: '2026-01-10'
  },
  {
    id: 'pkg-2',
    code: 'VIP-MAT-02',
    name: 'Gói Sinh Mổ Trọn Gói Phòng Tổng Thống VIP An Lành',
    type: 'package',
    category: 'Sức Khỏe Phụ Nữ & Mẹ Bé',
    price: 38000000,
    discountPrice: 35000000,
    unit: 'Gói trọn gói',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Nữ',
    targetAgeRange: 'Sản phụ thai kỳ từ tuần 36',
    department: 'Khoa Phụ Sản & Sơ Sinh VIP',
    items: [
      'Phẫu thuật lấy thai lần 1 / lần 2 bởi Bác sĩ Trưởng khoa',
      'Giảm đau sau mổ đa mô thức & Gây tê tủy sống an toàn',
      'Phòng lưu viện Tổng Thống riêng biệt 4 ngày 3 đêm (Bao trọn 3 bữa ăn chuyên gia dinh dưỡng)',
      'Sàng lọc sơ sinh 73 bệnh lý di truyền & Tiêm vắc xin Viêm gan B + Lao cho bé',
      'Chiếu tia Plasma lạnh làm lành vết mổ công nghệ cao',
      'Gói tắm bé & massage phục hồi mẹ sau sinh tại phòng'
    ],
    description: 'Chăm sóc toàn diện cho mẹ và bé chuẩn 5 sao quốc tế, mang lại trải nghiệm vượt cạn êm ái hạnh phúc.',
    preparationNotes: 'Nhập viện trước phẫu thuật 4 tiếng theo hướng dẫn của khoa Sản.',
    executionTime: '4 ngày 3 đêm lưu viện',
    status: 'Đang áp dụng',
    createdDate: '2026-01-15'
  },
  {
    id: 'pkg-3',
    code: 'B2B-CORP-03',
    name: 'Gói Khám Sức Khỏe Định Kỳ Doanh Nghiệp Chuẩn TT14/BYT',
    type: 'package',
    category: 'Khám Đoàn Doanh Nghiệp (B2B)',
    price: 1450000,
    discountPrice: 1200000,
    unit: 'Gói / Nhân viên',
    insuranceCovered: false,
    targetGender: 'Tất cả',
    targetAgeRange: 'Người lao động (18 - 65 tuổi)',
    department: 'Trung Tâm Khám Sức Khỏe Đoàn & Doanh Nghiệp',
    items: [
      'Khám lâm sàng tổng quát: Nội, Ngoại, Mắt, Tai Mũi Họng, Răng Hàm Mặt, Da Liễu',
      'Chụp X-Quang ngực thẳng kỹ thuật số DR',
      'Xét nghiệm công thức máu toàn phần 18 thông số',
      'Đường huyết đói (Glucose), Chức năng gan (AST, ALT), Chức năng thận (Ure, Creatinin)',
      'Tổng phân tích nước tiểu 10 thông số tự động',
      'Phân loại sức khỏe và cấp sổ khám sức khỏe định kỳ theo quy định BYT'
    ],
    description: 'Đầy đủ danh mục theo Thông tư 14/2013/TT-BYT, tối ưu chi phí và thời gian lấy mẫu tận nơi cho doanh nghiệp.',
    preparationNotes: 'Nhịn ăn sáng để lấy mẫu máu xét nghiệm.',
    executionTime: '1.5 - 2 giờ',
    status: 'Đang áp dụng',
    createdDate: '2026-02-01'
  },
  {
    id: 'pkg-4',
    code: 'B2B-EXEC-04',
    name: 'Gói Khám Sức Khỏe Cao Cấp Cán Bộ Lãnh Đạo (C-Level Executive)',
    type: 'package',
    category: 'Khám Đoàn Doanh Nghiệp (B2B)',
    price: 6800000,
    discountPrice: 5800000,
    unit: 'Gói / Lãnh đạo',
    insuranceCovered: true,
    insuranceCoveragePercent: 50,
    targetGender: 'Tất cả',
    targetAgeRange: 'Lãnh đạo, Quản lý cấp cao (30 - 65 tuổi)',
    department: 'Trung Tâm Khám Sức Khỏe Đoàn & Doanh Nghiệp',
    items: [
      'Khám và tư vấn chuyên sâu cùng Giáo sư / Tiến sĩ đầu ngành',
      'Chụp CT-Scanner sọ não & Cột sống thắt lưng',
      'Siêu âm Tim Doppler màu & Siêu âm ổ bụng tổng quát cao cấp',
      'Bộ mỡ máu đầy đủ (Cholesterol, Triglyceride, HDL-C, LDL-C)',
      'Định lượng Acid Uric tầm soát Gút, HbA1c đánh giá tiểu đường 3 tháng',
      'Tầm soát vi khuẩn HP dạ dày qua hơi thở C13 không xâm lấn'
    ],
    description: 'Thiết kế riêng cho khối lãnh đạo và quản lý cấp cao với quy trình ưu tiên không phải chờ đợi.',
    preparationNotes: 'Nhịn ăn sáng, tránh thức khuya đêm hôm trước.',
    executionTime: '2.5 - 3 giờ',
    status: 'Đang áp dụng',
    createdDate: '2026-02-10'
  },
  {
    id: 'pkg-5',
    code: 'CARDIO-VIP-05',
    name: 'Gói Tầm Soát Tim Mạch & Nguy Cơ Đột Quỵ Não Sớm',
    type: 'package',
    category: 'Tim Mạch & Đột Quỵ',
    price: 1250000,
    discountPrice: 1050000,
    unit: 'Gói trọn gói',
    insuranceCovered: true,
    insuranceCoveragePercent: 60,
    targetGender: 'Tất cả',
    targetAgeRange: 'Người có tiền sử tăng huyết áp, hút thuốc, trên 40 tuổi',
    department: 'Khoa Nội Tim Mạch & Can Thiệp Mạch',
    items: [
      'Chụp MRI & MRA mạch máu não không dùng thuốc cản từ (Khảo sát phình mạch, hẹp động mạch)',
      'Siêu âm Doppler động mạch cảnh 2 bên (Đo độ dày lớp nội mạc intima-media IMT)',
      'Điện tâm đồ 12 chuyển đạo (ECG) & Siêu âm tim gắng sức',
      'Định lượng men tim Troponin T-hs, NT-proBNP tầm soát suy tim',
      'Định lượng Homocysteine và D-Dimer đánh giá nguy cơ huyết khối tắc mạch',
      'Bác sĩ chuyên khoa Tim Mạch lập hồ sơ theo dõi nguy cơ tim mạch 10 năm (Framingham Score)'
    ],
    description: 'Tầm soát toàn diện xơ vữa mạch máu, phòng ngừa đột quỵ nhồi máu não và nhồi máu cơ tim cấp.',
    preparationNotes: 'Nghỉ ngơi 15 phút trước khi đo huyết áp và điện tim.',
    executionTime: '2 - 3 giờ',
    status: 'Đang áp dụng',
    createdDate: '2026-03-05'
  },
  {
    id: 'pkg-6',
    code: 'DERMA-LUX-06',
    name: 'Liệu Trình Nâng Cơ Trẻ Hóa Da Ultherapy & Thermage FLX Toàn Mặt',
    type: 'package',
    category: 'Chuyên Khoa Sâu',
    price: 45000000,
    discountPrice: 39000000,
    unit: 'Liệu trình trọn gói',
    insuranceCovered: false,
    targetGender: 'Tất cả',
    targetAgeRange: 'Từ 28 tuổi trở lên',
    department: 'Viện Thẩm Mỹ & Trẻ Hóa Da VitBeauty Center',
    items: [
      'Soi da 3D đa tầng bằng máy Visia thế hệ mới nhất của Hoa Kỳ',
      'Bác sĩ Da liễu thẩm mỹ trực tiếp lên phác đồ điều trị cá nhân hóa',
      'Nâng cơ vi điểm tầng sâu Ultherapy MPT 600 line chính hãng',
      'Săn chắc bề mặt và xóa nhăn Thermage FLX 450 xung',
      'Điện di lạnh Tế Bào Gốc Thụy Sĩ phục hồi và cấp ẩm chuyên sâu',
      'Tặng bộ dược mỹ phẩm chăm sóc độc quyền tại nhà trị giá 5.000.000đ'
    ],
    description: 'Công nghệ nâng cơ trẻ hóa xóa nhăn tầng sâu không xâm lấn, hiệu quả duy trì 1-2 năm.',
    preparationNotes: 'Tẩy trang sạch trước khi thực hiện liệu trình.',
    executionTime: '90 - 120 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-03-12'
  },
  {
    id: 'pkg-7',
    code: 'PRE-MARRY-07',
    name: 'Gói Tầm Soát Sức Khỏe Tiền Hôn Nhân VIP (Cho Cặp Đôi)',
    type: 'package',
    category: 'Sức Khỏe Phụ Nữ & Mẹ Bé',
    price: 5200000,
    discountPrice: 4600000,
    unit: 'Gói / Cặp đôi',
    insuranceCovered: false,
    targetGender: 'Tất cả',
    targetAgeRange: 'Cặp đôi chuẩn bị kết hôn hoặc dự định sinh con',
    department: 'Trung Tâm Hỗ Trợ Sinh Sản & Nam Học',
    items: [
      'Khám lâm sàng Nam khoa / Phụ khoa cùng Bác sĩ Chuyên khoa',
      'Xét nghiệm tinh dịch đồ tự động chuẩn WHO 2021 (Dành cho Nam)',
      'Siêu âm tử cung buồng trứng & Đánh giá dự trữ buồng trứng AMH (Dành cho Nữ)',
      'Sàng lọc bệnh truyền nhiễm: HIV, Viêm gan B, Viêm gan C, Giang mai, Rubella',
      'Xét nghiệm gen Thalassemia tầm soát bệnh tan máu bẩm sinh',
      'Tư vấn tiền sản và tiêm phòng các mũi vắc xin cần thiết trước mang thai'
    ],
    description: 'Đánh giá sức khỏe sinh sản, phát hiện sớm các bệnh lý di truyền và truyền nhiễm trước khi kết hôn.',
    preparationNotes: 'Nam giới kiêng xuất tinh 3-5 ngày trước khi làm tinh dịch đồ.',
    executionTime: '2 giờ',
    status: 'Đang áp dụng',
    createdDate: '2026-04-01'
  },

  // ==========================================
  // 2. DỊCH VỤ ĐƠN LẺ & CẬN LÂM SÀNG (SINGLE SERVICES)
  // ==========================================
  {
    id: 'srv-01',
    code: 'DV-MRI-BRAIN',
    name: 'Chụp Cộng Hưởng Từ MRI Sọ Não 1.5 Tesla',
    type: 'single',
    category: 'Chẩn Đoán Hình Ảnh',
    price: 2500000,
    discountPrice: 2200000,
    unit: 'Ca chụp',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Khoa Chẩn Đoán Hình Ảnh',
    items: [
      'Chụp MRI sọ não chuỗi xung T1, T2, FLAIR, DWI, SWI',
      'Khảo sát nhu mô não, mạch máu não và phát hiện sớm tổn thương thiếu máu, u não',
      'Bác sĩ CKI Chẩn đoán hình ảnh đọc kết quả và trả phim số hóa DICOM qua Cloud'
    ],
    description: 'Chẩn đoán chính xác nguyên nhân đau đầu kéo dài, chóng mặt, co giật hoặc nghi ngờ tai biến mạch máu não.',
    preparationNotes: 'Tháo bỏ toàn bộ trang sức, kim loại, máy trợ thính trước khi vào phòng từ trường.',
    executionTime: '20 - 30 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-05'
  },
  {
    id: 'srv-02',
    code: 'DV-CT-CHEST',
    name: 'Chụp Cắt Lớp Vi Tính CT-Scanner Lồng Ngực Liều Thấp (Low-dose Chest CT)',
    type: 'single',
    category: 'Chẩn Đoán Hình Ảnh',
    price: 1600000,
    discountPrice: 1400000,
    unit: 'Ca chụp',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Tất cả',
    targetAgeRange: 'Người từ 18 tuổi trở lên hoặc người có tiền sử hút thuốc',
    department: 'Khoa Chẩn Đoán Hình Ảnh',
    items: [
      'Chụp cắt lớp vi tính xoắn ốc 128 dãy liều bức xạ thấp an toàn',
      'Tái tạo 3D phát hiện nốt mờ phổi kích thước nhỏ từ 2mm',
      'Đánh giá tổn thương phế quản, trung thất và màng phổi'
    ],
    description: 'Phương pháp tiêu chuẩn vàng tầm soát ung thư phổi giai đoạn sớm và các bệnh lý hô hấp mãn tính.',
    preparationNotes: 'Không yêu cầu nhịn ăn nếu chụp không tiêm cản quang.',
    executionTime: '10 - 15 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-08'
  },
  {
    id: 'srv-03',
    code: 'DV-ENDO-GASTRO',
    name: 'Nội Soi Dạ Dày - Tá Tràng Tiền Mê Công Nghệ NBI Không Đau',
    type: 'single',
    category: 'Nội Soi Tiêu Hóa',
    price: 1850000,
    discountPrice: 1650000,
    unit: 'Ca nội soi',
    insuranceCovered: true,
    insuranceCoveragePercent: 70,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Trung Tâm Nội Soi & Phẫu Thuật Tiêu Hóa',
    items: [
      'Bác sĩ Gây mê hồi sức thực hiện tiền mê êm ái, tỉnh ngay sau 5 phút',
      'Quan sát thực quản, dạ dày, hành tá tràng với ánh sáng dải tần hẹp NBI phóng đại',
      'Test nhanh vi khuẩn HP (Helicobacter Pylori) bằng phương pháp Clo-Test',
      'Sinh thiết mô bệnh học hoặc cắt Polyp dạ dày nếu có chỉ định'
    ],
    description: 'Nội soi hoàn toàn êm ái, không cảm giác buồn nôn hay khó chịu, phát hiện sớm ung thư dạ dày từ tổn thương tiền ung thư.',
    preparationNotes: 'Nhịn ăn tối thiểu 6 tiếng và nhịn uống nước trước 2 tiếng.',
    executionTime: '20 - 30 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-12'
  },
  {
    id: 'srv-04',
    code: 'DV-ENDO-COLON',
    name: 'Nội Soi Toàn Bộ Đại Trực Tràng Tiền Mê NBI & Cắt Polyp Không Đau',
    type: 'single',
    category: 'Nội Soi Tiêu Hóa',
    price: 2400000,
    discountPrice: 2150000,
    unit: 'Ca nội soi',
    insuranceCovered: true,
    insuranceCoveragePercent: 70,
    targetGender: 'Tất cả',
    targetAgeRange: 'Người có rối loạn đại tiện hoặc từ 40 tuổi trở lên',
    department: 'Trung Tâm Nội Soi & Phẫu Thuật Tiêu Hóa',
    items: [
      'Thực hiện tiền mê an toàn bởi Bác sĩ Gây mê hồi sức chuyên khoa',
      'Khảo sát toàn bộ khung đại tràng từ van hồi manh tràng đến ống hậu môn',
      'Sử dụng công nghệ nhuộm màu quang học NBI phân loại Polyp lành tính / ác tính',
      'Sẵn sàng can thiệp cắt polyp đại tràng bằng dao điện cao tần an toàn'
    ],
    description: 'Chẩn đoán và điều trị triệt căn các polyp đại tràng, ngăn ngừa nguy cơ tiến triển thành ung thư đại trực tràng.',
    preparationNotes: 'Làm sạch ruột bằng thuốc theo đúng phác đồ hướng dẫn của bệnh viện.',
    executionTime: '30 - 45 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-15'
  },
  {
    id: 'srv-05',
    code: 'DV-US-CARDIAC',
    name: 'Siêu Âm Tim Doppler Màu 4D & Đánh Giá Chức Năng Tâm Thu',
    type: 'single',
    category: 'Chẩn Đoán Hình Ảnh',
    price: 650000,
    discountPrice: 550000,
    unit: 'Lần khám',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Khoa Tim Mạch & Can Thiệp Mạch Máu',
    items: [
      'Siêu âm tim 2D, 3D, 4D Doppler màu trên máy Philips Affiniti cao cấp',
      'Đo phân suất tống máu EF, kích thước các buồng tim, độ dày thành cơ tim',
      'Khảo sát chức năng hoạt động của các van tim (2 lá, 3 lá, động mạch chủ, động mạch phổi)'
    ],
    description: 'Đánh giá cấu trúc tim, phát hiện suy tim, bệnh lý hẹp hở van tim và bệnh tim bẩm sinh.',
    preparationNotes: 'Không cần nhịn ăn, mặc trang phục thoải mái.',
    executionTime: '20 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-20'
  },
  {
    id: 'srv-06',
    code: 'DV-LAB-CBC',
    name: 'Xét Nghiệm Tổng Phân Tích Tế Bào Máu 24 Chỉ Số Tự Động (CBC)',
    type: 'single',
    category: 'Xét Nghiệm Y Khoa',
    price: 150000,
    discountPrice: 120000,
    unit: 'Mẫu máu',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Khoa Xét Nghiệm Trung Tâm',
    items: [
      'Đếm hồng cầu, bạch cầu, tiểu cầu và 5 thành phần bạch cầu',
      'Đo nồng độ huyết sắc tố Hb, thể tích khối hồng cầu HCT, chỉ số MCV, MCH, MCHC',
      'Phát hiện thiếu máu, nhiễm trùng, dị ứng hoặc bệnh lý ác tính hệ tạo máu'
    ],
    description: 'Xét nghiệm máu cơ bản nhưng tối quan trọng trong mọi đánh giá sức khỏe và trước phẫu thuật.',
    preparationNotes: 'Nên lấy máu vào buổi sáng, có thể uống một ít nước lọc.',
    executionTime: 'Trả kết quả sau 30 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-05'
  },
  {
    id: 'srv-07',
    code: 'DV-LAB-LIVER-KIDNEY',
    name: 'Bộ Xét Nghiệm Chức Năng Gan - Thận Chuyên Sâu (AST, ALT, GGT, Ure, Creatinin, eGFR)',
    type: 'single',
    category: 'Xét Nghiệm Y Khoa',
    price: 350000,
    discountPrice: 290000,
    unit: 'Bộ xét nghiệm',
    insuranceCovered: true,
    insuranceCoveragePercent: 80,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Khoa Xét Nghiệm Trung Tâm',
    items: [
      'Định lượng men gan AST (GOT), ALT (GPT), GGT đánh giá viêm gan, tổn thương gan do bia rượu/thuốc',
      'Định lượng Ure và Creatinin huyết thanh, tự động tính độ lọc cầu thận ước tính eGFR',
      'Bilirubin toàn phần và trực tiếp'
    ],
    description: 'Đánh giá mức độ tổn thương tế bào gan và chức năng lọc của thận, theo dõi khi dùng thuốc dài ngày.',
    preparationNotes: 'Nhịn ăn sáng tối thiểu 4-6 tiếng trước khi lấy mẫu.',
    executionTime: 'Trả kết quả sau 45 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-01-10'
  },
  {
    id: 'srv-08',
    code: 'DV-CONSULT-EXPERT',
    name: 'Khám & Tư Vấn Cùng Bác Sĩ Chuyên Khoa II / Giáo Sư Đầu Ngành',
    type: 'single',
    category: 'Khám Chuyên Khoa',
    price: 500000,
    discountPrice: 450000,
    unit: 'Lượt khám',
    insuranceCovered: true,
    insuranceCoveragePercent: 50,
    targetGender: 'Tất cả',
    targetAgeRange: 'Mọi lứa tuổi',
    department: 'Phòng Khám Chuyên Gia Quốc Tế',
    items: [
      'Thăm khám lâm sàng kỹ lưỡng 1-1 tối thiểu 20 - 30 phút',
      'Hội chẩn hồ sơ bệnh án cũ, tư vấn phác đồ điều trị tiên tiến nhất',
      'Kê đơn điện tử và hướng dẫn phòng ngừa biến chứng'
    ],
    description: 'Thăm khám trực tiếp cùng đội ngũ chuyên gia, Giáo sư, Tiến sĩ, Bác sĩ CKII giàu kinh nghiệm.',
    preparationNotes: 'Mang theo toàn bộ hồ sơ bệnh án, phim chụp và đơn thuốc đang sử dụng.',
    executionTime: '20 - 30 phút / lượt',
    status: 'Đang áp dụng',
    createdDate: '2026-01-05'
  },
  {
    id: 'srv-09',
    code: 'DV-DENTAL-WHITENING',
    name: 'Tẩy Trắng Răng Công Nghệ Laser Whitening Hoa Kỳ',
    type: 'single',
    category: 'Nha Khoa & Thẩm Mỹ',
    price: 2500000,
    discountPrice: 1950000,
    unit: 'Ca điều trị',
    insuranceCovered: false,
    targetGender: 'Tất cả',
    targetAgeRange: 'Từ 16 tuổi trở lên',
    department: 'Khoa Răng Hàm Mặt & Nha Khoa Thẩm Mỹ',
    items: [
      'Khám và lấy cao răng, đánh bóng làm sạch toàn diện bề mặt răng',
      'Bôi gel bảo vệ nướu và thoa tinh chất dưỡng trắng chính hãng USA',
      'Kích hoạt ánh sáng Laser Whitening lạnh 3 chu kỳ (15 phút/chu kỳ)',
      'Tặng máng ngậm duy trì độ trắng tại nhà'
    ],
    description: 'Bật tone răng trắng sáng từ 3-5 cấp độ chỉ sau 45 phút, an toàn cho men răng, không ê buốt.',
    preparationNotes: 'Ăn uống nhẹ trước khi đến điều trị.',
    executionTime: '45 - 60 phút',
    status: 'Đang áp dụng',
    createdDate: '2026-02-01'
  },
  {
    id: 'srv-10',
    code: 'DV-VACCINE-FLU',
    name: 'Tiêm Vắc Xin Cúm Tứ Giá Thế Hệ Mới (Influvac Tetra / Vaxigrip Tetra)',
    type: 'single',
    category: 'Tiêm Chủng Vắc Xin',
    price: 380000,
    discountPrice: 350000,
    unit: 'Mũi tiêm',
    insuranceCovered: false,
    targetGender: 'Tất cả',
    targetAgeRange: 'Trẻ em từ 6 tháng tuổi và người lớn',
    department: 'Trung Tâm Tiêm Chủng Vắc Xin Chất Lượng Cao',
    items: [
      'Khám sàng lọc trước tiêm miễn phí bởi Bác sĩ chuyên khoa',
      'Tiêm bắp 0.5ml vắc xin cúm mùa tứ giá nhập khẩu Hà Lan/Pháp',
      'Theo dõi phản ứng sau tiêm 30 phút tại phòng chờ tiện nghi'
    ],
    description: 'Phòng ngừa 4 chủng virus cúm phổ biến nhất (2 chủng A và 2 chủng B), tăng cường đề kháng đường hô hấp.',
    preparationNotes: 'Khai báo tiền sử dị ứng trứng gà hoặc phản ứng tiêm chủng trước đây.',
    executionTime: '30 - 45 phút (gồm theo dõi sau tiêm)',
    status: 'Đang áp dụng',
    createdDate: '2026-02-10'
  }
];

export const mockMedicalPackages = INITIAL_MEDICAL_PACKAGES;

// Convenience Aliases for all components
export const mockBranches = INITIAL_BRANCHES;
export const mockPatients = INITIAL_PATIENTS;
export const mockDoctors = DOCTORS;
export const mockAppointments = INITIAL_APPOINTMENTS;
export const mockInteractions = INITIAL_INTERACTIONS;
export const mockB2BContracts = INITIAL_B2B_CONTRACTS;
export const mockB2CDeals = INITIAL_B2C_DEALS;
export const mockSegments = INITIAL_SEGMENTS;
export const mockCampaigns = INITIAL_CAMPAIGNS;
export const mockAutomationRules = INITIAL_AUTOMATION_RULES;
export const mockSupportTickets = INITIAL_TICKETS;
export const mockTelemedicineCalls = INITIAL_TELEMEDICINE_CALLS;
export const mockReferrals = INITIAL_REFERRALS;
export const mockMedicalPartners = INITIAL_MEDICAL_PARTNERS;
export const mockPartnerPayouts = INITIAL_PARTNER_PAYOUTS;
export const mockFollowUpCalls = INITIAL_FOLLOW_UP_CALLS;
export const mockCsatFeedbacks = INITIAL_CSAT_FEEDBACKS;
export const mockChatbotFaqScenarios = INITIAL_CHATBOT_FAQ_SCENARIOS;
export const mockUsers = CURRENT_USERS;
