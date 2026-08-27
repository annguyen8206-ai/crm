export type BranchId = 'hn-central' | 'hn-badinh' | 'hn-caugiay' | 'beauty-center' | 'ALL' | string;

export type ActiveTab =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'sales'
  | 'marketing'
  | 'care'
  | 'portal'
  | 'loyalty';

export interface Branch {
  id: BranchId;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  type: 'hospital' | 'clinic' | 'testing' | 'beauty';
}

export type UserRole =
  | 'admin'
  | 'system_admin'
  | 'doctor'
  | 'receptionist'
  | 'cskh_sales_consultant'
  | 'sales_b2b'
  | 'cskh_manager'
  | 'marketing_lead'
  | 'insurance_staff'
  | 'Quản Trị Viên Hệ Thống (Admin)'
  | 'Ban Giám Đốc'
  | 'Bác sĩ Trưởng Khoa'
  | 'Chuyên viên Tiếp đón'
  | 'Tư Vấn, Kinh Doanh & CSKH'
  | 'Trưởng Phòng CSKH'
  | 'Quản lý Kinh doanh B2B'
  | 'Marketing Lead'
  | 'Chuyên viên Bảo hiểm'
  | string;


export interface CurrentUser {
  id: string;
  staffCode?: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  role: UserRole;
  roleTitle: string;
  avatar?: string;
  department?: string;
  branchId?: BranchId;
  status?: 'active' | 'suspended' | 'offline';
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export type MembershipTier = 'Standard' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond VIP';

export interface Patient {
  id: string;
  pid: string; // Mã hồ sơ y tế, ví dụ: BN-2026-88219
  name: string;
  phone: string;
  email?: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  dob?: string;
  age: number;
  avatar: string;
  address: string;
  citizenId?: string;
  bloodType: string;
  allergies: string[];
  underlyingConditions: string[];
  membership: {
    tier: MembershipTier;
    points: number;
    totalSpent?: number;
    totalSpend?: number;
    discountRate?: number;
    memberSince?: string;
  };
  insurance: {
    bhytNo?: string;
    hasBhyt?: boolean;
    privateProvider?: string; // Bảo Việt, PVI, PTI, Insmart, Liberty...
    policyNumber?: string;
    hasGuarantee?: boolean;
    validUntil?: string;
  };
  source: string;
  primaryBranchId: BranchId;
  assignedDoctor?: string;
  tags: string[];
  createdAt?: string;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  notes?: string;
  totalVisits?: number;
}


export interface InteractionLog {
  id: string;
  patientId: string;
  timestamp: string;
  channel: 'Tổng đài (Call)' | 'Zalo ZNS' | 'Zalo OA Chat' | 'SMS Brandname' | 'Email' | 'Trực tiếp tại quầy' | 'Tư vấn Video';
  staffName: string;
  type: 'Inbound' | 'Outbound' | 'System Automated';
  subject: string;
  content: string;
  duration?: string;
  recordingUrl?: string;
  sentiment?: 'Tích cực' | 'Trung tính' | 'Không hài lòng';
}

export type AppointmentStatus = 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã tiếp đón' | 'Đang khám' | 'Hoàn tất khám' | 'No-show (Vắng mặt)' | 'Đã hủy';

export interface Appointment {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  gender: string;
  age: number;
  branchId: BranchId;
  department: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // 08:30 - 09:00
  type: 'Khám mới' | 'Tái khám định kỳ' | 'Gói KSK Doanh nghiệp' | 'Telemedicine Trực tuyến' | 'Thủ thuật/Liệu trình';
  bookingChannel: 'Website' | 'Zalo OA' | 'Facebook Messenger' | 'Call Center' | 'Ứng dụng Bệnh nhân';
  status: AppointmentStatus;
  notes: string;
  reminderStatus: {
    znsSent: boolean;
    smsSent: boolean;
    callConfirmed: boolean;
  };
  fee: number;
}

export interface B2BContract {
  id: string;
  code: string;
  companyName: string;
  taxCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  industry?: string;
  packageType: string;
  employeeCount: number;
  examinedCount: number;
  totalValue: number;
  paidAmount: number;
  debtAmount: number;
  startDate: string;
  endDate: string;
  stage: 'Tư vấn nhu cầu' | 'Thiết kế gói' | 'Báo giá & Đàm phán' | 'Đã ký HĐ điện tử' | 'Đang triển khai khám' | 'Đã hoàn tất & Quyết toán' | string;
  eSignStatus: 'Đã ký số Token' | 'Chờ đối tác ký' | 'Dự thảo' | string;
  designatedBranches?: BranchId[];
  salesRep: string;
  notes: string;
}

export interface MedicalPackage {
  id: string;
  code: string;
  name: string;
  type?: 'package' | 'single'; // 'package': Gói khám trọn gói, 'single': Dịch vụ kỹ thuật đơn lẻ
  category: 'Cá nhân VIP (B2C)' | 'Khám Đoàn Doanh Nghiệp (B2B)' | 'Chuyên Khoa Sâu' | 'Sức Khỏe Phụ Nữ & Mẹ Bé' | 'Tầm Soát Ung Thư' | 'Tim Mạch & Đột Quỵ' | 'Khám Chuyên Khoa' | 'Chẩn Đoán Hình Ảnh' | 'Xét Nghiệm Y Khoa' | 'Nội Soi Tiêu Hóa' | 'Thủ Thuật & Phẫu Thuật' | 'Nha Khoa & Thẩm Mỹ' | 'Tiêm Chủng Vắc Xin' | string;
  price: number;
  discountPrice?: number;
  unit?: string; // e.g. 'Lượt khám', 'Ca chụp', 'Mẫu xét nghiệm', 'Lần soi', 'Răng', 'Gói trọn gói'
  insuranceCovered?: boolean; // Có áp dụng BHYT / Bảo hiểm sức khỏe
  insuranceCoveragePercent?: number; // % BHYT chi trả theo quy định
  targetGender: 'Tất cả' | 'Nam' | 'Nữ';
  targetAgeRange?: string;
  department: string;
  items: string[];
  description: string;
  preparationNotes?: string; // Lưu ý chuẩn bị (nhịn ăn, uống nước, ngừng thuốc...)
  executionTime?: string; // Thời gian thực hiện (VD: 15-30 phút)
  status: 'Đang áp dụng' | 'Tạm dừng';
  createdDate?: string;
}

export interface B2CDeal {
  id: string;
  customerName: string;
  phone?: string;
  customerPhone?: string;
  serviceInterest: string;
  estimatedValue: number;
  stage: 'Mới tiếp nhận' | 'Tư vấn chuyên môn' | 'Gửi báo giá' | 'Đã đặt cọc' | 'Đã thực hiện DV' | 'Chăm sóc hậu mãi' | string;
  probability: number; // %
  source: string;
  assignedStaff?: string;
  assignedConsultant?: string;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  createdAt?: string;
}


export interface MarketingSegment {
  id: string;
  name: string;
  description: string;
  patientCount: number;
  criteriaSummary: string;
  tags: string[];
  suggestedCampaignType: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: 'Zalo ZNS' | 'SMS Brandname' | 'Email HTML' | 'Đa kênh Tự động';
  segmentId: string;
  segmentName: string;
  status: 'Đang chạy' | 'Đã lên lịch' | 'Hoàn thành' | 'Bản nháp';
  scheduledDate: string;
  totalRecipients: number;
  sentCount: number;
  deliveredRate: number; // %
  openRate: number; // %
  conversionAppointments: number;
  estimatedRevenue: number;
  messagePreview: string;
}

export interface CareAutomationRule {
  id: string;
  name: string;
  triggerEvent: 'Sau phẫu thuật D+1' | 'Sau phẫu thuật D+3' | 'Sau phẫu thuật D+7' | 'Nhắc mũi tiêm chủng' | 'Nhắc tái khám mãn tính (30 ngày)' | 'Khảo sát CSAT sau khám';
  channel: 'Zalo ZNS' | 'SMS' | 'Call Center Task';
  autoSend: boolean;
  messageTemplate: string;
  activeCountThisMonth: number;
}

export type TicketPriority = 'Khẩn cấp (SLA 30p)' | 'Cao (SLA 2h)' | 'Trung bình (SLA 8h)' | 'Tiêu chuẩn (SLA 24h)';
export type TicketStatus = 'Mới tiếp nhận' | 'Đang xử lý' | 'Chờ BN phản hồi' | 'Đã giải quyết' | 'Đã đóng';

export interface SupportTicket {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  category: 'Khiếu nại thái độ' | 'Thắc mắc viện phí & bảo lãnh' | 'Tư vấn kết quả chuyên môn' | 'Thời gian chờ đợi' | 'Hỗ trợ thủ tục BHYT' | 'Góp ý dịch vụ';
  priority: TicketPriority;
  assignedDepartment: string;
  assignedStaff: string;
  status: TicketStatus;
  createdAt: string;
  slaDeadline: string;
  isBreached: boolean;
  firstResponseMinutes: number;
  resolutionTimeHours?: number;
  csatScore?: number; // 1-5
  content: string;
  resolutionNotes?: string;
}

export interface TelemedicineCall {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  scheduledTime: string;
  durationMinutes: number;
  status: 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã hoàn tất' | 'Đã hủy';
  chiefComplaint: string;
  videoRoomUrl: string;
  prescribedDrugsCount: number;
}

export interface InsuranceClaim {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  provider: 'Bảo Việt' | 'PTI Bưu Điện' | 'Liberty' | 'Insmart' | 'PVI' | 'BHYT Nhà Nước';
  cardNumber: string;
  serviceType: 'Khám ngoại trú' | 'Phẫu thuật điều trị nội trú' | 'Gói KSK Doanh nghiệp';
  requestedAmount: number;
  approvedAmount: number;
  patientCoPay: number;
  status: 'Đã phê duyệt bảo lãnh' | 'Đang thẩm định' | 'Cần bổ sung chứng từ' | 'Từ chối bảo lãnh';
  submittedDate: string;
  diagnosis: string;
}

export type PartnerCategory = 'Bác sĩ tuyến dưới / PK Vệ tinh' | 'Dược sĩ / Nhà thuốc đối tác' | 'Đại lý bảo hiểm sức khỏe' | 'KOC / Reviewer Y tế' | 'Nhân viên nội bộ bệnh viện';

export interface MedicalPartner {
  id: string;
  code: string; // VD: CTV-MED-101
  name: string;
  title?: string;
  phone: string;
  email?: string;
  category: PartnerCategory;
  workplace: string;
  specialtyOrField: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  commissionRatePercent: number;
  referralCode: string;
  totalPatientsReferred: number;
  totalRevenueGenerated: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingBalance: number;
  status: 'Đang hoạt động' | 'Tạm khóa' | 'Chờ duyệt hồ sơ';
  joinDate: string;
}

export interface PartnerCommissionPayout {
  id: string;
  code: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  bankAccount: string;
  period: string; // e.g. "Kỳ T08/2026"
  totalCases: number;
  revenueTotal: number;
  payoutAmount: number;
  taxDeduction: number; // Thuế TNCN 10% nếu >2tr
  netAmount: number;
  status: 'Đã thanh toán (UNC)' | 'Chờ Kế toán duyệt' | 'Đang xử lý ngân hàng';
  paidAt?: string;
  transactionRef?: string;
}

export interface ReferralRecord {
  id: string;
  partnerId?: string;
  referrerName: string;
  referrerType: 'Bác sĩ tuyến dưới' | 'Khách hàng thân thiết' | 'Cộng tác viên KSK' | 'Dược sĩ đối tác' | 'Đại lý bảo hiểm';
  referrerPhone: string;
  referralCode?: string;
  patientReferredName: string;
  patientPhone?: string;
  serviceUsed: string;
  billAmount: number;
  rewardPoints: number;
  commissionAmount: number;
  status: 'Đã chi trả' | 'Chờ đối soát' | 'Mới ghi nhận';
  date: string;
  notes?: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  branchId: BranchId;
  avatar: string;
  roomNumber: string;
  phone: string;
  rating: number;
  totalPatients: number;
  isAvailableToday: boolean;
}

export interface FollowUpCallTask {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  visitDate: string;
  daysAfterVisit: number; // 1, 3, 7
  primaryDiagnosis: string;
  doctorCareNotes?: string; // Ghi chú chẩn đoán & dặn dò sau khám hỗ trợ CSKH
  prescribedMedicines?: string[];
  callStatus: 'Chờ gọi' | 'Đã gọi - Ổn định' | 'Cần bác sĩ tư vấn lại' | 'Không nghe máy';
  callNotes?: string;
  adverseEffectsReported?: string;
  symptomProgression?: 'Thuyên giảm rõ rệt' | 'Không đổi' | 'Nặng hơn' | 'Đã khỏi hoàn toàn';
  assignedStaff: string;
  scheduledTime: string;
}

export interface CsatFeedbackItem {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  doctorName: string;
  department: string;
  rating: number; // 1 to 5
  npsScore: number; // 0 to 10
  touchpoints: {
    doctorCare: number; // 1-5
    nurseAttitude: number; // 1-5
    waitingTime: number; // 1-5
    cleanliness: number; // 1-5
    billingTransparency: number; // 1-5
  };
  comment: string;
  sentiment: 'Tích cực' | 'Trung lập' | 'Tiêu cực';
  isResolved: boolean;
}

export type ChatbotChannel = 'Zalo OA' | 'Facebook Messenger' | 'Website Livechat' | 'SMS Auto';

export interface ChatbotFaqScenario {
  id: string;
  topic: string;
  category: 'Chi phí & Viện phí' | 'Bảo hiểm & Bảo lãnh' | 'Hướng dẫn khám & Xét nghiệm' | 'Đặt lịch & Bác sĩ' | 'Tra cứu kết quả' | 'Cơ sở & Giờ làm việc';
  keywords: string[];
  channels: ChatbotChannel[];
  botResponse: string;
  quickReplies?: string[];
  suggestedAction?: 'BOOK_APPOINTMENT' | 'VIEW_PRICING' | 'CHECK_INSURANCE' | 'CONNECT_HUMAN';
  fallbackToTicket: boolean;
  ticketCategory: SupportTicket['category'];
  ticketPriority: TicketPriority;
  isActive: boolean;
  hitCount: number;
  escalatedTicketCount: number;
}

export interface ChatbotChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system' | 'agent';
  text: string;
  timestamp: string;
  channel: ChatbotChannel;
  quickReplies?: string[];
  escalatedTicketCode?: string;
  matchedScenarioId?: string;
  attachmentType?: 'qr_payment' | 'appointment_card' | 'lab_result' | 'prep_guide';
  attachmentData?: any;
}

export type ConversationStatus = 'agent_needed' | 'bot_handling' | 'agent_handling' | 'resolved';

export interface ZnsCareMessageLog {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  templateType: 'ZNS_POST_VISIT_CARE' | 'ZNS_AUTO_RECALL' | 'ZNS_LAB_READY' | 'ZNS_APPOINTMENT_REMINDER';
  templateName: string;
  diagnosis: string;
  doctorCareNotes: string;
  channel: 'Zalo ZNS' | 'SMS Brandname' | 'Viber Business';
  status: 'Đã gửi thành công' | 'Đang xử lý' | 'Đã đọc' | 'Gửi thất bại';
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  trackingCode: string;
  cost: number;
}

export interface AutoRecallTask {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastVisitDate: string;
  dueDate: string;
  daysOverdue: number; // âm là còn x ngày, dương là quá hạn x ngày
  conditionCategory: 'Bệnh Mạn Tính (Tim mạch / Tiểu đường)' | 'Da Liễu & Thẩm Mỹ' | 'Sản Phụ Khoa & Tiền Sản' | 'Nhi Khoa & Tiêm Chủng' | 'Nha Khoa & Răng Hàm Mặt' | 'Khám Tổng Quát Định Kỳ';
  primaryDiagnosis: string;
  recallReason: string;
  recallIntervalDays: number;
  doctorRecommendation: string;
  assignedDoctor: string;
  assignedStaff: string;
  status: 'Đến hạn - Chờ liên hệ' | 'Đã gửi ZNS nhắc hẹn' | 'Đã gọi - Đồng ý đặt lịch' | 'Đã chuyển thành Lịch Hẹn' | 'Bệnh nhân từ chối / Hẹn lại sau';
  bookedAppointmentId?: string;
  notes?: string;
}

export interface VoipCallSession {
  id: string;
  callType: 'OUTBOUND_CSKH' | 'OUTBOUND_RECALL' | 'INBOUND_HOTLINE';
  patientId: string;
  patientName: string;
  patientPhone: string;
  agentStaffName: string;
  agentExtension: string; // VD: 108, 102
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: 'Đang đổ chuông' | 'Đang đàm thoại' | 'Hoàn tất cuộc gọi' | 'Không bắt máy' | 'Máy bận';
  audioRecordingUrl?: string;
  callNotes?: string;
  callOutcome?: 'Ổn định' | 'Cần bác sĩ hội chẩn lại' | 'Hẹn tái khám' | 'Đổi giờ gọi lại';
}

export interface OmnichannelConversation {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  patientPhone: string;
  channel: ChatbotChannel;
  channelUserId?: string;
  status: ConversationStatus;
  priority: 'Bình thường' | 'Ưu tiên' | 'Khẩn cấp';
  assignedStaff?: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  waitingMinutes: number;
  slaBreached: boolean;
  tags: string[];
  sentiment: 'Tích cực' | 'Trung lập' | 'Tiêu cực / Bức xúc';
  messages: ChatbotChatMessage[];
  notes?: string;
  lastIntent?: string;
}

