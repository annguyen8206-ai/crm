// In-Memory Database Store & Seed Data for VitHospital / VitCRM Backend

export interface PatientRecord {
  id: string;
  pid: string;
  name: string;
  phone: string;
  email: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  dob: string;
  age?: number;
  idCard: string;
  address: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  medicalHistoryNotes: string;
  insuranceCardNumber: string;
  insuranceProvider: string;
  insuranceExpiry: string;
  branchId: string;
  firstVisitDate: string;
  lastVisitDate: string;
  totalVisits: number;
  totalSpent: number;
  riskLevel: 'Cao' | 'Trung bình' | 'Thấp';
  loyaltyTier: 'Standard' | 'Silver' | 'Gold' | 'Diamond' | 'VIP';
  loyaltyPoints: number;
  tags: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  vitalsHistory: Array<{
    date: string;
    bloodPressure: string;
    heartRate: number;
    spo2: number;
    weight: number;
    height: number;
    bmi: number;
    temperature: number;
    bloodGlucose?: number;
  }>;
  lisResults?: Array<{
    id: string;
    testName: string;
    date: string;
    status: string;
    resultSummary: string;
    abnormalFlag: boolean;
  }>;
  pacsResults?: Array<{
    id: string;
    modality: string;
    bodyPart: string;
    date: string;
    conclusion: string;
    imageUrl?: string;
  }>;
}

export interface AppointmentRecord {
  id: string;
  queueNumber?: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  branchId: string;
  date: string;
  timeSlot: string;
  status: 'Chờ tiếp đón' | 'Đã tiếp đón' | 'Đang khám' | 'Chờ cận lâm sàng' | 'Đã khám xong' | 'Đã hủy' | 'Vắng mặt';
  type: 'Khám mới' | 'Tái khám' | 'Cấp cứu' | 'Tầm soát định kỳ' | 'Khám bảo hiểm' | 'Telemedicine';
  channel: 'Website' | 'Zalo OA' | 'Hotline' | 'Trực tiếp tại quầy' | 'Mobile App' | 'Chuyển tuyến';
  symptoms: string;
  notes?: string;
  estimatedCost?: number;
  isPaid?: boolean;
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  ticketCode: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  category: 'Khiếu nại thái độ' | 'Thắc mắc viện phí & bảo lãnh' | 'Tư vấn kết quả chuyên môn' | 'Thời gian chờ đợi' | 'Hỗ trợ thủ tục BHYT' | 'Góp ý dịch vụ';
  priority: 'Khẩn cấp (SLA 30p)' | 'Cao (SLA 2h)' | 'Trung bình (SLA 8h)' | 'Thấp (SLA 24h)';
  status: 'Mới tiếp nhận' | 'Đang xử lý' | 'Đã giải quyết' | 'Đã đóng';
  department: string;
  branchId: string;
  assignedStaff: string;
  description: string;
  resolution?: string;
  slaDeadline: string;
  isOverdue: boolean;
  compensationVoucher?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LeadDealRecord {
  id: string;
  customerName: string;
  type: 'B2C' | 'B2B';
  contactPerson?: string;
  phone: string;
  email: string;
  serviceCategory: string;
  expectedValue: number;
  stage: 'Mới tiếp nhận' | 'Đã liên hệ' | 'Tư vấn chuyên sâu' | 'Gửi báo giá' | 'Đàm phán hợp đồng' | 'Chốt thành công (Won)' | 'Thất bại (Lost)';
  probability: number;
  assignedStaff: string;
  source: 'Zalo Ads' | 'Facebook' | 'Hotline' | 'Giới thiệu' | 'Sự kiện y tế' | 'Website';
  notes: string;
  followUpDate: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  branchId: string;
  department: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    insuranceCoverage: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  insuranceDeduction: number;
  patientPayable: number;
  status: 'Đã thanh toán' | 'Chờ thanh toán' | 'Đã hoàn tiền' | 'Hủy bỏ';
  paymentMethod?: 'VietQR' | 'Tiền mặt' | 'Thẻ POS / Thẻ tín dụng' | 'Ví điện tử' | 'Bảo lãnh trực tiếp';
  vietQrUrl?: string;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
}

export interface FollowUpTaskRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  visitDate: string;
  scheduledTime: string;
  primaryDiagnosis: string;
  doctorCareNotes: string;
  callStatus: 'Chờ gọi' | 'Đã gọi - Ổn định' | 'Đã gọi - Cần tái khám sớm' | 'Không nghe máy' | 'Hẹn gọi lại';
  symptomProgression?: string;
  adverseEffectsReported?: string;
  callNotes?: string;
  assignedStaff: string;
}

export interface AutoRecallRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastVisitDate: string;
  dueDate: string;
  daysOverdue: number;
  conditionCategory: string;
  primaryDiagnosis: string;
  recallReason: string;
  recallIntervalDays: number;
  doctorRecommendation: string;
  assignedDoctor: string;
  assignedStaff: string;
  status: 'Đến hạn - Chờ liên hệ' | 'Đã gửi ZNS nhắc hẹn' | 'Đã gọi - Đồng ý đặt lịch' | 'Khách từ chối / Đã khám nơi khác' | 'Đã hoàn tất tái khám';
  notes: string;
}

export interface ZnsLogRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  templateType: string;
  templateName: string;
  diagnosis: string;
  doctorCareNotes: string;
  channel: string;
  status: string;
  sentAt: string;
  deliveredAt: string;
  readAt?: string;
  trackingCode: string;
  cost: number;
}

export interface VoipCallRecord {
  id: string;
  callType: 'OUTBOUND_CSKH' | 'INBOUND_HOTLINE';
  patientId: string;
  patientName: string;
  patientPhone: string;
  agentStaffName: string;
  agentExtension: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: string;
  audioRecordingUrl?: string;
  callNotes?: string;
  callOutcome?: string;
}

export interface CsatFeedbackRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  visitDate: string;
  doctorName: string;
  department: string;
  rating: number;
  npsScore: number;
  sentiment: 'Tích cực' | 'Trung lập' | 'Tiêu cực';
  comment: string;
  followUpRequired: boolean;
  followUpStatus?: string;
  submittedAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
}

// Initial Database Seeding
class HospitalBackendStore {
  patients: PatientRecord[] = [
    {
      id: 'pat-1',
      pid: 'BN-2026-88219',
      name: 'Nguyễn Thị Bích Thủy',
      phone: '0912 889 933',
      email: 'bichthuy.nguyen@gmail.com',
      gender: 'Nữ',
      dob: '1979-05-14',
      age: 47,
      idCard: '001179008921',
      address: 'Số 42 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
      bloodType: 'A+',
      allergies: ['Penicillin', 'Hải sản vỏ cứng'],
      chronicConditions: ['Tăng huyết áp vô căn (I10)', 'Đái tháo đường Type 2', 'Rối loạn Lipid máu'],
      medicalHistoryNotes: 'Phát hiện tăng huyết áp 5 năm, đang duy trì Amlodipine 5mg + Metformin 500mg. Tuân thủ phác đồ tốt.',
      insuranceCardNumber: 'DN4010123998811',
      insuranceProvider: 'Bảo hiểm Xã hội TP Hà Nội & Bảo Việt Healthcare VIP',
      insuranceExpiry: '2026-12-31',
      branchId: 'hn-central',
      firstVisitDate: '2023-04-12',
      lastVisitDate: '2026-08-15',
      totalVisits: 14,
      totalSpent: 38500000,
      riskLevel: 'Cao',
      loyaltyTier: 'Diamond',
      loyaltyPoints: 3850,
      tags: ['Bệnh Mạn Tính', 'VIP Care', 'Ưu Tiên Tái Khám', 'Bảo Lãnh Trực Tiếp'],
      emergencyContact: {
        name: 'Trần Quốc Tuấn (Chồng)',
        relationship: 'Chồng',
        phone: '0913 224 556'
      },
      vitalsHistory: [
        { date: '2026-08-15', bloodPressure: '135/85', heartRate: 74, spo2: 98, weight: 62, height: 158, bmi: 24.8, temperature: 36.6, bloodGlucose: 6.8 },
        { date: '2026-07-10', bloodPressure: '142/90', heartRate: 78, spo2: 98, weight: 63, height: 158, bmi: 25.2, temperature: 36.5, bloodGlucose: 7.4 }
      ],
      lisResults: [
        { id: 'lis-101', testName: 'Định lượng Glucose & HbA1c', date: '2026-08-15', status: 'Hoàn tất', resultSummary: 'HbA1c: 6.9%, Glucose đói: 6.8 mmol/L', abnormalFlag: true },
        { id: 'lis-102', testName: 'Bộ mỡ máu Lipid Panel toàn phần', date: '2026-08-15', status: 'Hoàn tất', resultSummary: 'Cholesterol: 5.4 mmol/L, LDL-C: 3.2 mmol/L, TG: 2.1 mmol/L', abnormalFlag: true }
      ],
      pacsResults: [
        { id: 'pacs-101', modality: 'ECG', bodyPart: 'Tim', date: '2026-08-15', conclusion: 'Nhịp xoang đều 74 l/p, dầy thất trái nhẹ do THA.' },
        { id: 'pacs-102', modality: 'Siêu âm Doppler', bodyPart: 'Động mạch cảnh', date: '2026-04-10', conclusion: 'Xơ vữa rải rác không gây hẹp huyết động.' }
      ]
    },
    {
      id: 'pat-2',
      pid: 'BN-2026-88220',
      name: 'Trần Đăng Khoa',
      phone: '0983 112 244',
      email: 'khoa.td@fpt.com.vn',
      gender: 'Nam',
      dob: '1988-11-20',
      age: 38,
      idCard: '001088001234',
      address: 'P1204 Tòa Park 7, Times City, Q. Hoàng Mai, Hà Nội',
      bloodType: 'O+',
      allergies: ['Không có tiền sử dị ứng'],
      chronicConditions: ['Thoái hóa đốt sống thắt lưng L4-L5', 'Hội chứng ống cổ tay'],
      medicalHistoryNotes: 'Kỹ sư phần mềm, ngồi làm việc nhiều, đau lưng âm ỉ lan xuống chân trái.',
      insuranceCardNumber: 'DN4010188992200',
      insuranceProvider: 'PVI Care Diamond',
      insuranceExpiry: '2026-11-30',
      branchId: 'hn-central',
      firstVisitDate: '2025-01-10',
      lastVisitDate: '2026-08-01',
      totalVisits: 6,
      totalSpent: 16200000,
      riskLevel: 'Trung bình',
      loyaltyTier: 'Gold',
      loyaltyPoints: 1620,
      tags: ['Cơ Xương Khớp', 'Vật Lý Trị Liệu', 'Dân Văn Phòng'],
      emergencyContact: {
        name: 'Nguyễn Thúy Hằng (Vợ)',
        relationship: 'Vợ',
        phone: '0988 554 433'
      },
      vitalsHistory: [
        { date: '2026-08-01', bloodPressure: '120/80', heartRate: 72, spo2: 99, weight: 70, height: 174, bmi: 23.1, temperature: 36.5 }
      ],
      lisResults: [
        { id: 'lis-201', testName: 'Công thức máu 24 thông số & Acid Uric', date: '2026-08-01', status: 'Hoàn tất', resultSummary: 'Acid Uric: 380 umol/L (Bình thường)', abnormalFlag: false }
      ],
      pacsResults: [
        { id: 'pacs-201', modality: 'MRI 1.5 Tesla', bodyPart: 'Cột sống thắt lưng', date: '2026-08-01', conclusion: 'Thoát vị đĩa đệm L4-L5 thể trung tâm lệch trái, chèn ép nhẹ bao màng cứng.' }
      ]
    },
    {
      id: 'pat-3',
      pid: 'BN-2026-88221',
      name: 'Vũ Hoàng Yến Nhi',
      phone: '0975 667 889',
      email: 'yennhi.vu@gmail.com',
      gender: 'Nữ',
      dob: '1995-03-08',
      age: 31,
      idCard: '001195007788',
      address: 'Số 15 Liễu Giai, Q. Ba Đình, Hà Nội',
      bloodType: 'B+',
      allergies: ['Aspirin', 'Mỹ phẩm chứa hương liệu cồn'],
      chronicConditions: ['Viêm da tiếp xúc dị ứng', 'Nám da mảng sâu'],
      medicalHistoryNotes: 'Đang theo liệu trình Laser Pico toning kết hợp phục hồi hàng rào da sinh học.',
      insuranceCardNumber: 'HN4019922331100',
      insuranceProvider: 'Bảo Việt An Gia',
      insuranceExpiry: '2027-02-28',
      branchId: 'beauty-center',
      firstVisitDate: '2026-02-14',
      lastVisitDate: '2026-08-10',
      totalVisits: 8,
      totalSpent: 42000000,
      riskLevel: 'Thấp',
      loyaltyTier: 'Diamond',
      loyaltyPoints: 4200,
      tags: ['Thẩm Mỹ & Da Liễu', 'Liệu Trình Laser', 'Khách Thân Thiết'],
      emergencyContact: {
        name: 'Vũ Hải Triều (Bố)',
        relationship: 'Bố',
        phone: '0903 445 566'
      },
      vitalsHistory: [
        { date: '2026-08-10', bloodPressure: '110/70', heartRate: 68, spo2: 99, weight: 49, height: 162, bmi: 18.7, temperature: 36.6 }
      ],
      lisResults: [],
      pacsResults: [
        { id: 'pacs-301', modality: 'VISIA 3D', bodyPart: 'Da mặt', date: '2026-08-10', conclusion: 'Sắc tố melanin dưới biểu bì giảm 35% so với lần soi đầu.' }
      ]
    },
    {
      id: 'pat-4',
      pid: 'BN-2026-88222',
      name: 'Phạm Đức Minh',
      phone: '0904 556 778',
      email: 'ducminh.pham@outlook.com',
      gender: 'Nam',
      dob: '1965-09-22',
      age: 61,
      idCard: '001065004321',
      address: 'Số 88 Trần Thái Tông, Q. Cầu Giấy, Hà Nội',
      bloodType: 'O-',
      allergies: ['Sulfonamides'],
      chronicConditions: ['Bệnh mạch vành sau đặt stent LAD', 'Tăng huyết áp', 'Gout mạn'],
      medicalHistoryNotes: 'Đặt Stent mạch vành năm 2023, duy trì Clopidogrel 75mg + Rosuvastatin 20mg.',
      insuranceCardNumber: 'GD4010199443322',
      insuranceProvider: 'BHYT Đúng Tuyến VitHospital & PTI Care',
      insuranceExpiry: '2026-12-31',
      branchId: 'hn-caugiay',
      firstVisitDate: '2024-01-05',
      lastVisitDate: '2026-08-18',
      totalVisits: 18,
      totalSpent: 65000000,
      riskLevel: 'Cao',
      loyaltyTier: 'VIP',
      loyaltyPoints: 6500,
      tags: ['Tim Mạch Can Thiệp', 'Nguy Cơ Cao', 'Bệnh Mạn Tính', 'VIP'],
      emergencyContact: {
        name: 'Phạm Minh Quân (Con trai)',
        relationship: 'Con trai',
        phone: '0989 332 211'
      },
      vitalsHistory: [
        { date: '2026-08-18', bloodPressure: '125/80', heartRate: 64, spo2: 98, weight: 68, height: 168, bmi: 24.1, temperature: 36.5 }
      ],
      lisResults: [
        { id: 'lis-401', testName: 'Troponin T hs & NT-proBNP', date: '2026-08-18', status: 'Hoàn tất', resultSummary: 'Troponin T: 8 ng/L (Âm tính), NT-proBNP: 110 pg/mL (Bình thường)', abnormalFlag: false }
      ],
      pacsResults: [
        { id: 'pacs-401', modality: 'Siêu âm tim 4D', bodyPart: 'Tim', date: '2026-08-18', conclusion: 'Chức năng tâm thu thất trái EF 62%, không rối loạn vận động vùng mới.' }
      ]
    },
    {
      id: 'pat-5',
      pid: 'BN-2026-88223',
      name: 'Lê Mai Hương',
      phone: '0966 223 388',
      email: 'maihuong.le@gmail.com',
      gender: 'Nữ',
      dob: '1993-12-05',
      age: 33,
      idCard: '001193005544',
      address: 'Số 102 Bà Triệu, Q. Hoàn Kiếm, Hà Nội',
      bloodType: 'AB+',
      allergies: ['Không có tiền sử dị ứng'],
      chronicConditions: ['Quản lý thai kỳ 24 tuần', 'Thiếu máu thai kỳ nhẹ'],
      medicalHistoryNotes: 'Mang thai con đầu lòng 24 tuần, thai phát triển tương đương tuổi thai, đang bổ sung Sắt + Acid Folic.',
      insuranceCardNumber: 'DN4010155667788',
      insuranceProvider: 'Liberty HealthCare Premier',
      insuranceExpiry: '2027-05-31',
      branchId: 'hn-central',
      firstVisitDate: '2026-03-20',
      lastVisitDate: '2026-08-20',
      totalVisits: 5,
      totalSpent: 28000000,
      riskLevel: 'Thấp',
      loyaltyTier: 'Gold',
      loyaltyPoints: 2800,
      tags: ['Sản Phụ Khoa', 'Quản Lý Thai Kỳ', 'Gói Thai Sản VIP'],
      emergencyContact: {
        name: 'Nguyễn Thành Long (Chồng)',
        relationship: 'Chồng',
        phone: '0912 778 899'
      },
      vitalsHistory: [
        { date: '2026-08-20', bloodPressure: '115/75', heartRate: 80, spo2: 99, weight: 58, height: 160, bmi: 22.6, temperature: 36.7 }
      ],
      lisResults: [
        { id: 'lis-501', testName: 'Tổng phân tích tế bào máu ngoại vi & Ferritin', date: '2026-08-20', status: 'Hoàn tất', resultSummary: 'Hb: 11.2 g/dL (Hơi giảm nhẹ), Ferritin: 25 ng/mL', abnormalFlag: true }
      ],
      pacsResults: [
        { id: 'pacs-501', modality: 'Siêu âm 4D hình thái thai nhi', bodyPart: 'Thai nhi', date: '2026-08-20', conclusion: 'Thai 24 tuần 3 ngày, ước tính cân nặng 650g, không phát hiện bất thường hình thái.' }
      ]
    }
  ];

  appointments: AppointmentRecord[] = [
    {
      id: 'apt-1',
      queueNumber: 'A-102',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      doctorId: 'doc-1',
      doctorName: 'PGS. TS. BS Trần Minh Đức',
      department: 'Khoa Tim Mạch & Huyết Áp',
      branchId: 'hn-central',
      date: '2026-08-24',
      timeSlot: '08:30 - 09:00',
      status: 'Chờ tiếp đón',
      type: 'Tái khám',
      channel: 'Zalo OA',
      symptoms: 'Tái khám định kỳ tăng huyết áp & kiểm tra mỡ máu sau 1 tháng chỉnh thuốc.',
      estimatedCost: 650000,
      isPaid: true,
      createdAt: '2026-08-21 10:15'
    },
    {
      id: 'apt-2',
      queueNumber: 'A-103',
      patientId: 'pat-3',
      patientName: 'Vũ Hoàng Yến Nhi',
      patientPhone: '0975 667 889',
      doctorId: 'doc-3',
      doctorName: 'BS. CKI Vũ Hải Nam',
      department: 'Viện Thẩm Mỹ & Da Liễu VitBeauty',
      branchId: 'beauty-center',
      date: '2026-08-24',
      timeSlot: '09:30 - 10:30',
      status: 'Đang khám',
      type: 'Tái khám',
      channel: 'Website',
      symptoms: 'Bắn Laser Pico buổi 2 và điện di tinh chất phục hồi màng tế bào.',
      estimatedCost: 3500000,
      isPaid: true,
      createdAt: '2026-08-22 14:00'
    },
    {
      id: 'apt-3',
      queueNumber: 'B-201',
      patientId: 'pat-2',
      patientName: 'Trần Đăng Khoa',
      patientPhone: '0983 112 244',
      doctorId: 'doc-5',
      doctorName: 'BS. CKII Lê Tuấn Hưng',
      department: 'Khoa Cơ Xương Khớp & Cột Sống',
      branchId: 'hn-caugiay',
      date: '2026-08-24',
      timeSlot: '14:30 - 15:00',
      status: 'Chờ tiếp đón',
      type: 'Tái khám',
      channel: 'Hotline',
      symptoms: 'Đánh giá cơn đau cột sống thắt lưng sau tập vật lý trị liệu.',
      estimatedCost: 500000,
      isPaid: false,
      createdAt: '2026-08-23 09:00'
    },
    {
      id: 'apt-4',
      queueNumber: 'C-305',
      patientId: 'pat-5',
      patientName: 'Lê Mai Hương',
      patientPhone: '0966 223 388',
      doctorId: 'doc-4',
      doctorName: 'ThS. BS Phạm Diệu Linh',
      department: 'Khoa Sản Phụ Khoa & Quản Lý Thai Kỳ',
      branchId: 'hn-central',
      date: '2026-08-25',
      timeSlot: '08:00 - 09:30',
      status: 'Chờ tiếp đón',
      type: 'Khám mới',
      channel: 'Mobile App',
      symptoms: 'Nghiệm pháp dung nạp đường huyết 3 mẫu tuần 24 & tiêm uốn ván mũi 1.',
      estimatedCost: 1200000,
      isPaid: true,
      createdAt: '2026-08-22 16:30'
    }
  ];

  tickets: SupportTicketRecord[] = [
    {
      id: 'ticket-1',
      ticketCode: 'SLA-2026-081',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      category: 'Thắc mắc viện phí & bảo lãnh',
      priority: 'Cao (SLA 2h)',
      status: 'Đang xử lý',
      department: 'Phòng Kế Toán & Bảo Lãnh Viện Phí',
      branchId: 'hn-central',
      assignedStaff: 'CSKH Nguyễn Mai Linh',
      description: 'Bệnh nhân thắc mắc thời gian bảo lãnh viện phí với Bảo Việt kéo dài hơn 30 phút tại quầy thu ngân tầng 1.',
      slaDeadline: '2026-08-24 11:30',
      isOverdue: false,
      compensationVoucher: 'VOUCHER-VIP-300K',
      createdAt: '2026-08-24 09:30'
    },
    {
      id: 'ticket-2',
      ticketCode: 'SLA-2026-082',
      patientId: 'pat-2',
      patientName: 'Trần Đăng Khoa',
      patientPhone: '0983 112 244',
      category: 'Thời gian chờ đợi',
      priority: 'Trung bình (SLA 8h)',
      status: 'Đã giải quyết',
      department: 'Khoa Chẩn Đoán Hình Ảnh (PACS)',
      branchId: 'hn-caugiay',
      assignedStaff: 'ĐD. Lê Thị Diệu',
      description: 'Khách phản ánh chờ đọc kết quả phim MRI hơn 45 phút.',
      resolution: 'Đã giải thích nguyên nhân do ca cấp cứu sọ não ưu tiên trước, xin lỗi khách hàng và gửi kết quả đọc trực tiếp qua Zalo kèm tư vấn online.',
      slaDeadline: '2026-08-23 17:00',
      isOverdue: false,
      createdAt: '2026-08-23 09:15',
      resolvedAt: '2026-08-23 11:00'
    }
  ];

  leads: LeadDealRecord[] = [
    {
      id: 'deal-1',
      customerName: 'Tập đoàn Công nghệ Viễn thông V-Tech',
      type: 'B2B',
      contactPerson: 'Ông Nguyễn Đức Chung - Trưởng phòng Nhân sự',
      phone: '0913 554 488',
      email: 'chung.nd@vtechcorp.vn',
      serviceCategory: 'Gói Khám Sức Khỏe Doanh Nghiệp Định Kỳ 2026 (450 nhân sự)',
      expectedValue: 480000000,
      stage: 'Đàm phán hợp đồng',
      probability: 85,
      assignedStaff: 'Lê Hoàng Long',
      source: 'Giới thiệu',
      notes: 'Đã duyệt báo giá gói Platinum + khám tại cơ sở của doanh nghiệp bằng xe lưu động. Đang chỉnh sửa điều khoản thanh toán chia 3 đợt.',
      followUpDate: '2026-08-26',
      createdAt: '2026-08-01'
    },
    {
      id: 'deal-2',
      customerName: 'Bà Hoàng Kim Ngân',
      type: 'B2C',
      phone: '0944 889 911',
      email: 'kimngan.hoang@gmail.com',
      serviceCategory: 'Gói Thai Sản Trọn Gói VIP Diamond & Sinh Không Đau',
      expectedValue: 45000000,
      stage: 'Tư vấn chuyên sâu',
      probability: 70,
      assignedStaff: 'Phạm Thu Trang',
      source: 'Zalo Ads',
      notes: 'Khách hàng đang mang thai tuần 12, đã gửi bảng so sánh quyền lợi phòng VIP đơn và dịch vụ xe đưa đón tận nhà.',
      followUpDate: '2026-08-25',
      createdAt: '2026-08-19'
    }
  ];

  invoices: InvoiceRecord[] = [
    {
      id: 'inv-1001',
      invoiceCode: 'HD-2026-8801',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      branchId: 'hn-central',
      department: 'Khoa Tim Mạch',
      items: [
        { name: 'Khám Giáo sư Tim mạch', quantity: 1, unitPrice: 500000, insuranceCoverage: 150000, total: 350000 },
        { name: 'Xét nghiệm Glucose & HbA1c', quantity: 1, unitPrice: 380000, insuranceCoverage: 380000, total: 0 },
        { name: 'Siêu âm Doppler Tim màu', quantity: 1, unitPrice: 850000, insuranceCoverage: 500000, total: 350000 }
      ],
      subtotal: 1730000,
      discount: 0,
      insuranceDeduction: 1030000,
      patientPayable: 700000,
      status: 'Đã thanh toán',
      paymentMethod: 'VietQR',
      transactionRef: 'VQR-20260824-8801',
      paidAt: '2026-08-24 09:15',
      createdAt: '2026-08-24 08:45'
    },
    {
      id: 'inv-1002',
      invoiceCode: 'HD-2026-8802',
      patientId: 'pat-3',
      patientName: 'Vũ Hoàng Yến Nhi',
      patientPhone: '0975 667 889',
      branchId: 'beauty-center',
      department: 'Viện Thẩm Mỹ VitBeauty',
      items: [
        { name: 'Liệu trình Laser Pico trị thâm nám (Buổi 2)', quantity: 1, unitPrice: 3500000, insuranceCoverage: 0, total: 3500000 },
        { name: 'Bộ sản phẩm phục hồi da sinh học', quantity: 1, unitPrice: 1200000, insuranceCoverage: 0, total: 1200000 }
      ],
      subtotal: 4700000,
      discount: 470000,
      insuranceDeduction: 0,
      patientPayable: 4230000,
      status: 'Đã thanh toán',
      paymentMethod: 'VietQR',
      transactionRef: 'VQR-20260824-8802',
      paidAt: '2026-08-24 10:45',
      createdAt: '2026-08-24 09:40'
    }
  ];

  followUps: FollowUpTaskRecord[] = [
    {
      id: 'fup-1',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      visitDate: '2026-08-21',
      scheduledTime: 'Hôm nay, 14:00',
      primaryDiagnosis: 'Tăng huyết áp vô căn (I10) & Rối loạn Lipid máu',
      doctorCareNotes: 'BS dặn: Đo huyết áp tại nhà 2 lần/ngày (sáng lúc vừa ngủ dậy & tối). Kiêng ăn mặn, giảm mỡ động vật. Nhắc BN không tự ý dừng uống thuốc đột ngột.',
      callStatus: 'Chờ gọi',
      assignedStaff: 'CSKH Nguyễn Mai Linh'
    },
    {
      id: 'fup-2',
      patientId: 'pat-2',
      patientName: 'Trần Đăng Khoa',
      patientPhone: '0983 112 244',
      visitDate: '2026-08-20',
      scheduledTime: 'Hôm qua, 15:30',
      primaryDiagnosis: 'Thoái hóa đốt sống thắt lưng L4-L5',
      doctorCareNotes: 'BS Vinh dặn: Đánh giá xem còn tê chân trái không sau khi dùng thuốc giãn cơ kết hợp vật lý trị liệu.',
      callStatus: 'Đã gọi - Ổn định',
      symptomProgression: 'Thuyên giảm rõ rệt',
      adverseEffectsReported: 'Không có tác dụng phụ',
      callNotes: 'Bệnh nhân báo giảm đau 70%, đi lại nhẹ nhàng, khen bác sĩ nhiệt tình.',
      assignedStaff: 'ĐD. Lê Thị Diệu'
    }
  ];

  recalls: AutoRecallRecord[] = [
    {
      id: 'recall-1',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
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
    }
  ];

  znsLogs: ZnsLogRecord[] = [
    {
      id: 'zns-log-1',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      templateType: 'ZNS_POST_VISIT_CARE',
      templateName: 'ZNS Dặn dò sau khám & Hướng dẫn theo dõi sức khỏe',
      diagnosis: 'Tăng huyết áp vô căn (I10) & Rối loạn Lipid máu',
      doctorCareNotes: 'BS dặn: Đo huyết áp tại nhà 2 lần/ngày (sáng lúc vừa ngủ dậy & tối). Kiêng ăn mặn, giảm mỡ động vật. Nhắc BN không tự ý dừng uống thuốc đột ngột. Hẹn tái khám định kỳ sau 30 ngày.',
      channel: 'Zalo ZNS',
      status: 'Đã đọc',
      sentAt: '2026-08-21 11:30',
      deliveredAt: '2026-08-21 11:30',
      readAt: '2026-08-21 11:34',
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
      doctorCareNotes: 'BS Da liễu dặn: Chống nắng tuyệt đối (bôi kem chống nắng SPF50+ cách 3 tiếng/lần, đội mũ rộng vành). Dưỡng ẩm phục hồi sáng - tối, rửa mặt bằng nước muối sinh lý/sữa rửa mặt dịu nhẹ, không tự ý cạy bóc vảy. Nhắc lịch buổi 2 vào 24/08.',
      channel: 'Zalo ZNS',
      status: 'Đã đọc',
      sentAt: '2026-08-22 16:45',
      deliveredAt: '2026-08-22 16:45',
      readAt: '2026-08-22 16:50',
      trackingCode: 'ZNS-2026-88103',
      cost: 320
    }
  ];

  voipCalls: VoipCallRecord[] = [
    {
      id: 'call-101',
      callType: 'OUTBOUND_CSKH',
      patientId: 'pat-2',
      patientName: 'Trần Đăng Khoa',
      patientPhone: '0983 112 244',
      agentStaffName: 'ĐD. Lê Thị Diệu',
      agentExtension: '108',
      startTime: '2026-08-23 15:30',
      endTime: '2026-08-23 15:34',
      durationSeconds: 245,
      status: 'Hoàn tất cuộc gọi',
      audioRecordingUrl: 'https://audio.vithospital.vn/rec-20260823-0983112244.mp3',
      callNotes: 'Bệnh nhân báo lưng đã giảm đau 70%, đi lại nhẹ nhàng tốt. Đã dặn uống nhiều nước và tránh cúi vác nặng.',
      callOutcome: 'Ổn định'
    }
  ];

  csatFeedbacks: CsatFeedbackRecord[] = [
    {
      id: 'csat-1',
      patientId: 'pat-1',
      patientName: 'Nguyễn Thị Bích Thủy',
      patientPhone: '0912 889 933',
      visitDate: '2026-08-15',
      doctorName: 'PGS. TS. BS Trần Minh Đức',
      department: 'Khoa Tim Mạch',
      rating: 5,
      npsScore: 10,
      sentiment: 'Tích cực',
      comment: 'Bác sĩ Đức giải thích bệnh rất tỉ mỉ, ân cần. Không gian phòng khám sạch đẹp, nhân viên lễ tân hỗ trợ nhiệt tình.',
      followUpRequired: false,
      submittedAt: '2026-08-16 09:30'
    },
    {
      id: 'csat-2',
      patientId: 'pat-2',
      patientName: 'Trần Đăng Khoa',
      patientPhone: '0983 112 244',
      visitDate: '2026-08-01',
      doctorName: 'BS. CKII Lê Tuấn Hưng',
      department: 'Khoa Cơ Xương Khớp',
      rating: 4,
      npsScore: 8,
      sentiment: 'Tích cực',
      comment: 'Chất lượng điều trị rất tốt, tuy nhiên thời gian chờ kết quả chụp MRI hơi lâu khoảng 45 phút.',
      followUpRequired: true,
      followUpStatus: 'Đã giải quyết',
      submittedAt: '2026-08-02 10:15'
    }
  ];

  auditLogs: AuditLogRecord[] = [
    {
      id: 'log-1',
      timestamp: '2026-08-24 08:30:15',
      userId: 'u-admin',
      userName: 'BS. CKII Hoàng Minh Tuấn',
      role: 'Ban Giám Đốc',
      action: 'SYSTEM_BOOTSTRAP',
      module: 'Core System',
      details: 'Khởi động hệ thống VitCRM Healthcare Backend Service v2.6',
      ipAddress: '10.0.0.1'
    }
  ];

  // Helper logging
  addAuditLog(userId: string, userName: string, role: string, action: string, module: string, details: string) {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      userId: userId || 'system',
      userName: userName || 'Hệ Thống Tự Động',
      role: role || 'System',
      action,
      module,
      details,
      ipAddress: '127.0.0.1'
    });
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }
}

export const dbStore = new HospitalBackendStore();
