import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Settings2,
  Filter,
  Check,
  RefreshCw,
  Share2,
  MessageCircle,
  LifeBuoy,
  ThumbsUp,
  ThumbsDown,
  X,
  FileText,
  Building2,
  ArrowRight,
  Search,
  Users,
  Calendar,
  CreditCard,
  QrCode,
  Paperclip,
  Tag,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Headphones,
  FileCheck2,
  Stethoscope,
  Info,
  CheckCheck,
  Flame,
  PhoneCall,
  ExternalLink as LinkIcon
} from 'lucide-react';
import {
  ChatbotFaqScenario,
  ChatbotChannel,
  ChatbotChatMessage,
  SupportTicket,
  Patient,
  TicketPriority,
  OmnichannelConversation,
  ConversationStatus
} from '../types';
import {
  mockChatbotFaqScenarios,
  mockOmnichannelConversations,
  mockPatients,
  mockDoctors
} from '../data/mockData';
import { PatientAvatar } from './PatientAvatar';

interface ChatbotFaqViewProps {
  faqScenarios?: ChatbotFaqScenario[];
  onAddNewTicket?: (ticket: Omit<SupportTicket, 'id'>) => void;
  patients?: Patient[];
  onNavigateToCare?: () => void;
  onSelectPatient?: (patientId: string) => void;
}

export const ChatbotFaqView: React.FC<ChatbotFaqViewProps> = ({
  faqScenarios = mockChatbotFaqScenarios,
  onAddNewTicket,
  patients = mockPatients,
  onNavigateToCare,
  onSelectPatient
}) => {
  // Main view navigation tabs
  const [viewMode, setViewMode] = useState<'inbox' | 'scenarios' | 'escalation_rules' | 'simulator'>('inbox');

  // Omnichannel Live Inbox State
  const [conversations, setConversations] = useState<OmnichannelConversation[]>(mockOmnichannelConversations);
  const [selectedConvId, setSelectedConvId] = useState<string>(mockOmnichannelConversations[0]?.id || '');
  
  // Filters for conversations list (Managing hundreds of conversations)
  const [statusFilter, setStatusFilter] = useState<'ALL' | ConversationStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | ChatbotChannel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Khẩn cấp' | 'Ưu tiên' | 'Bình thường'>('ALL');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Chat message input state
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>([
    'Dạ em đã kiểm tra lịch trực và có thể xếp slot khám ưu tiên lúc 10:00 sáng nay cho chị Thủy ạ.',
    'Dạ chị mang theo kết quả xét nghiệm và CCCD đến Quầy tiếp đón Tầng 1 để được hướng dẫn nhanh nhé ạ.',
    'Dạ chi phí chụp MRI Sọ não có tiêm thuốc cản từ là 2.850.000đ (đã áp dụng bảo hiểm bảo lãnh).'
  ]);

  // Canned Responses / Quick Templates Modal & dropdown
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Scenarios Tab State
  const [scenariosList, setScenariosList] = useState<ChatbotFaqScenario[]>(faqScenarios);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [scenarioCategoryFilter, setScenarioCategoryFilter] = useState<string>('ALL');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ChatbotFaqScenario | null>(null);

  // Scenario modal fields
  const [scenarioTopic, setScenarioTopic] = useState('');
  const [scenarioCategory, setScenarioCategory] = useState<ChatbotFaqScenario['category']>('Chi phí & Viện phí');
  const [scenarioKeywords, setScenarioKeywords] = useState('');
  const [scenarioChannels, setScenarioChannels] = useState<ChatbotChannel[]>(['Zalo OA', 'Facebook Messenger', 'Website Livechat']);
  const [scenarioResponse, setScenarioResponse] = useState('');
  const [scenarioQuickReplies, setScenarioQuickReplies] = useState('');
  const [scenarioFallbackToTicket, setScenarioFallbackToTicket] = useState(true);
  const [scenarioTicketCategory, setScenarioTicketCategory] = useState<SupportTicket['category']>('Thắc mắc viện phí & bảo lãnh');
  const [scenarioTicketPriority, setScenarioTicketPriority] = useState<TicketPriority>('Trung bình (SLA 8h)');

  // Simulator Tab State
  const [simulatorChannel, setSimulatorChannel] = useState<ChatbotChannel>('Zalo OA');
  const [simulatorPatientId, setSimulatorPatientId] = useState<string>(patients[0]?.id || 'pat-1');
  const [simulatorMessages, setSimulatorMessages] = useState<ChatbotChatMessage[]>([
    {
      id: 'sim-1',
      sender: 'bot',
      text: 'Xin chào Quý khách! VitCRM hân hạnh đồng hành chăm sóc sức khỏe. Quý khách đang quan tâm đến thông tin y tế nào dưới đây ạ?',
      timestamp: '09:00',
      channel: 'Zalo OA',
      quickReplies: ['Bảng giá khám chuyên khoa', 'Thủ tục bảo lãnh bảo hiểm', 'Chuẩn bị xét nghiệm máu', 'Đặt lịch hẹn Bác sĩ', 'Cần gặp tư vấn viên trực']
    }
  ]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimBotTyping, setIsSimBotTyping] = useState(false);

  // Quick Action Notification / Ticket toast
  const [actionAlert, setActionAlert] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active selected conversation
  const activeConversation = conversations.find(c => c.id === selectedConvId) || conversations[0];
  const activePatient = patients.find(p => p.id === activeConversation?.patientId) || patients[0];

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, simulatorMessages]);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setActionAlert({ message, type });
    setTimeout(() => {
      setActionAlert(null);
    }, 4000);
  };

  // Filter conversations for the Omnichannel Inbox
  const filteredConversations = conversations.filter(c => {
    // Channel filter
    if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
    
    // Status filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

    // Priority filter
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;

    // Tag filter
    if (selectedTagFilter !== 'ALL' && !c.tags.some(t => t.toLowerCase().includes(selectedTagFilter.toLowerCase()))) return false;

    // Search query (matches name, phone, message content, tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.patientName.toLowerCase().includes(q);
      const matchPhone = c.patientPhone.toLowerCase().includes(q);
      const matchMsg = c.lastMessage.toLowerCase().includes(q);
      const matchTag = c.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchMsg && !matchTag) return false;
    }

    return true;
  });

  // Calculate high-level queue metrics
  const totalConvs = conversations.length;
  const urgentCount = conversations.filter(c => c.status === 'agent_needed' || c.priority === 'Khẩn cấp').length;
  const botHandledCount = conversations.filter(c => c.status === 'bot_handling').length;
  const agentHandledCount = conversations.filter(c => c.status === 'agent_handling').length;
  const resolvedCount = conversations.filter(c => c.status === 'resolved').length;

  // Canned response templates
  const cannedTemplates = [
    {
      id: 'canned-1',
      title: 'Bảng giá khám chuyên khoa',
      text: 'Dạ, chi phí khám chuyên khoa với Bác sĩ CKI/CKII là 350.000đ, Bác sĩ Trưởng khoa/Phó Giáo Sư là 500.000đ. Phí khám đã bao gồm tư vấn lâm sàng và kê đơn điều trị ạ.'
    },
    {
      id: 'canned-2',
      title: 'Hướng dẫn nhịn ăn xét nghiệm',
      text: 'Dạ, đối với xét nghiệm máu (Đường huyết, Men gan, Mỡ máu) và Siêu âm bụng, Quý khách vui lòng nhịn ăn sáng từ 6 - 8 tiếng, chỉ uống một ít nước lọc tinh khiết để kết quả chuẩn xác nhất ạ.'
    },
    {
      id: 'canned-3',
      title: 'Thủ tục bảo lãnh trực tiếp',
      text: 'Dạ, VitHospital bảo lãnh viện phí trực tiếp với hơn 25 đơn vị bảo hiểm (Bảo Việt, PVI, PTI, Liberty, Insmart, BHYT...). Quý khách chỉ cần xuất trình Thẻ bảo hiểm và CCCD tại Quầy bảo hiểm Tầng 1 ạ.'
    },
    {
      id: 'canned-4',
      title: 'Chỉ đường & Bãi đỗ xe',
      text: 'Dạ, Phòng khám có 2 tầng hầm đỗ xe ô tô 7 chỗ và xe máy miễn phí tại Số 188 Phố Huế (HBT) và Số 45 Liễu Giai (Ba Đình). Có nhân viên bảo vệ hỗ trợ đỗ xe 24/7 ạ.'
    },
    {
      id: 'canned-5',
      title: 'Số tài khoản cọc giữ lịch VIP',
      text: 'Dạ Quý khách có thể chuyển khoản cọc giữ chỗ 200.000đ qua STK: 1903889988 - Ngân hàng Techcombank - CTCP Bệnh viện Quốc tế VitHospital. Cú pháp: [Họ Tên] [SĐT] CocKham.'
    }
  ];

  // Handle Agent Sending a Message in Live Inbox
  const handleSendAgentReply = (customText?: string) => {
    const text = customText || replyText;
    if (!text.trim() || !activeConversation) return;

    const newMsg: ChatbotChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: activeConversation.channel
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            status: c.status === 'agent_needed' ? 'agent_handling' : c.status,
            lastMessage: text.trim(),
            lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: 0,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    if (!customText) setReplyText('');
    showNotification('Đã gửi tin nhắn phản hồi tới bệnh nhân qua ' + activeConversation.channel, 'success');
  };

  // Toggle Bot vs Agent mode
  const handleToggleBotMode = (convId: string, currentStatus: ConversationStatus) => {
    const newStatus: ConversationStatus =
      currentStatus === 'bot_handling' ? 'agent_handling' : 'bot_handling';
    
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, status: newStatus } : c))
    );

    showNotification(
      newStatus === 'agent_handling'
        ? '👨‍⚕️ Nhân viên CSKH đã tiếp quản cuộc trò chuyện.'
        : '🤖 Đã kích hoạt lại Chatbot AI tự động hỗ trợ.',
      'info'
    );
  };

  // Mark as Resolved
  const handleMarkResolved = (convId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, status: 'resolved', unreadCount: 0 } : c))
    );
    showNotification('Đã đánh dấu hoàn tất cuộc hội thoại!', 'success');
  };

  // Escalate to Support Ticket
  const handleEscalateToTicket = () => {
    if (!activeConversation) return;

    const ticketCode = `TK-${activeConversation.channel === 'Zalo OA' ? 'ZALO' : 'MESS'}-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();
    const deadline = new Date(now.getTime() + 120 * 60000);
    const deadlineStr = deadline.toISOString().replace('T', ' ').substring(0, 16);

    const ticketData: Omit<SupportTicket, 'id'> = {
      code: ticketCode,
      patientId: activeConversation.patientId,
      patientName: activeConversation.patientName,
      patientPhone: activeConversation.patientPhone,
      category: 'Khiếu nại thái độ',
      priority: activeConversation.priority === 'Khẩn cấp' ? 'Khẩn cấp (SLA 30p)' : 'Cao (SLA 2h)',
      assignedDepartment: 'Phòng CSKH & Trải Nghiệm Bệnh Nhân',
      assignedStaff: 'Lê Thanh Thảo (CSKH Hotline)',
      status: 'Mới tiếp nhận',
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
      slaDeadline: deadlineStr,
      isBreached: false,
      firstResponseMinutes: 2,
      content: `[Tạo từ Omnichannel Inbox ${activeConversation.channel}] Khách hàng: ${activeConversation.patientName} (${activeConversation.patientPhone}). Nội dung: "${activeConversation.lastMessage}". Ghi chú: ${activeConversation.notes || 'Cần điều dưỡng trưởng/bác sĩ gọi lại gấp'}`
    };

    if (onAddNewTicket) {
      onAddNewTicket(ticketData);
    }

    // Add system message to chat
    const sysMsg: ChatbotChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      text: `Đã tạo Phiếu Tiếp Nhận SLA ${ticketCode} và chuyển sang Phòng CSKH xử lý ưu tiên.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: activeConversation.channel,
      escalatedTicketCode: ticketCode
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: [...c.messages, sysMsg]
            }
          : c
      )
    );

    showNotification(`Đã tạo Ticket SLA ${ticketCode} và đồng bộ sang Phân hệ CSKH!`, 'success');
  };

  // Send Rich Attachment Card (QR, Appointment, Prep Guide)
  const handleSendRichCard = (type: 'qr_payment' | 'appointment_card' | 'prep_guide') => {
    if (!activeConversation) return;

    let cardText = '';
    if (type === 'qr_payment') {
      cardText = '💳 Mã VietQR Thanh Toán Cọc Giữ Chỗ Khám VIP\n• Đơn vị: CTCP Bệnh viện Quốc tế VitHospital\n• Số tiền: 200.000đ\n• Nội dung: ' + activeConversation.patientPhone + ' DatLichKham\nQuý khách quét mã trên App ngân hàng để nhận vé khám ưu tiên tức thì!';
    } else if (type === 'appointment_card') {
      cardText = '📅 Thẻ Hẹn Khám Điện Tử VitHospital\n• Bệnh nhân: ' + activeConversation.patientName + '\n• Chuyên khoa: Nội Tim Mạch & Tầm Soát Đột Quỵ\n• Bác sĩ: PGS. TS. BS Trần Minh Đức\n• Thời gian: 09:30 Ngày 22/08/2026\n• Địa điểm: Phòng khám 204, Tầng 2, Cơ sở 188 Phố Huế.';
    } else if (type === 'prep_guide') {
      cardText = '📋 Cẩm Nang Chuẩn Bị Trước Khi Nội Soi & Xét Nghiệm\n1. Nhịn ăn tối thiểu 6 tiếng trước giờ khám.\n2. Được uống tối đa 100ml nước lọc tinh khiết trước 2 tiếng.\n3. Ngưng thuốc chống đông máu nếu có chỉ định của Bác sĩ.\n4. Mang theo các đơn thuốc đang uống hàng ngày.';
    }

    const richMsg: ChatbotChatMessage = {
      id: `rich-${Date.now()}`,
      sender: 'agent',
      text: cardText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: activeConversation.channel,
      attachmentType: type
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversation.id
          ? {
              ...c,
              lastMessage: cardText.substring(0, 60) + '...',
              messages: [...c.messages, richMsg]
            }
          : c
      )
    );

    setShowAttachmentMenu(false);
    showNotification('Đã gửi thẻ tương tác thành công!', 'success');
  };

  // Simulator Send Handler
  const handleSendSimulatorMessage = async (customText?: string) => {
    const textToSend = customText || simulatorInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatbotChatMessage = {
      id: `sim-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: simulatorChannel
    };

    setSimulatorMessages(prev => [...prev, userMsg]);
    if (!customText) setSimulatorInput('');
    setIsSimBotTyping(true);

    try {
      const res = await fetch('/api/ai/chatbot-faq-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          channel: simulatorChannel,
          patientName: activePatient.name,
          patientPhone: activePatient.phone,
          faqList: scenariosList
        })
      });
      const data = await res.json();

      let botReplyText = data.reply || 'Dạ VitCRM đã ghi nhận câu hỏi của Quý khách.';
      let escalatedTicketCode = undefined;

      if (data.shouldEscalate || textToSend.includes('gặp tư vấn viên') || textToSend.includes('chưa được giải quyết')) {
        const ticketCode = `TK-${simulatorChannel === 'Zalo OA' ? 'ZALO' : 'MESS'}-2026-${Math.floor(100 + Math.random() * 900)}`;
        escalatedTicketCode = ticketCode;

        if (onAddNewTicket) {
          const now = new Date();
          const deadline = new Date(now.getTime() + 120 * 60000);
          onAddNewTicket({
            code: ticketCode,
            patientId: activePatient.id,
            patientName: activePatient.name,
            patientPhone: activePatient.phone,
            category: data.ticketData?.category || 'Khiếu nại thái độ',
            priority: data.ticketData?.priority || 'Cao (SLA 2h)',
            assignedDepartment: data.ticketData?.department || 'Phòng CSKH & Trải Nghiệm Bệnh Nhân',
            assignedStaff: 'Điều Dưỡng Trực Hotline Đa Kênh',
            status: 'Mới tiếp nhận',
            createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
            slaDeadline: deadline.toISOString().replace('T', ' ').substring(0, 16),
            isBreached: false,
            firstResponseMinutes: 2,
            content: `[Tự động từ Sandbox Chatbot] Khách: ${activePatient.name} phản ánh: "${textToSend}"`
          });
        }
      }

      const botMsg: ChatbotChatMessage = {
        id: `sim-bot-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: simulatorChannel,
        quickReplies: data.shouldEscalate
          ? ['Tôi muốn gọi tổng đài 1900 8866 22', 'Xem bảng giá dịch vụ']
          : ['Đặt lịch khám ngay', 'Bảng giá dịch vụ', 'Vấn đề chưa được giải quyết (Gặp CSKH)'],
        escalatedTicketCode
      };

      setSimulatorMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setSimulatorMessages(prev => [
        ...prev,
        {
          id: `sim-bot-${Date.now()}`,
          sender: 'bot',
          text: 'Dạ VitCRM đã tiếp nhận thông tin. Quý khách vui lòng liên hệ hotline 1900 8866 22 để được tư vấn viên hỗ trợ ngay ạ.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          channel: simulatorChannel,
          quickReplies: ['Gọi 1900 8866 22', 'Đặt lịch khám']
        }
      ]);
    } finally {
      setIsSimBotTyping(false);
    }
  };

  // Helper channel colors & icons
  const getChannelBadge = (ch: ChatbotChannel) => {
    switch (ch) {
      case 'Zalo OA':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Zalo OA
          </span>
        );
      case 'Facebook Messenger':
        return (
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            Messenger
          </span>
        );
      case 'Website Livechat':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Livechat
          </span>
        );
      case 'SMS Auto':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            SMS Portal
          </span>
        );
    }
  };

  // Helper status badge
  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case 'agent_needed':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[10px] flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Cần Agent Hỗ Trợ
          </span>
        );
      case 'bot_handling':
        return (
          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200 text-[10px] flex items-center gap-1">
            <Bot className="w-3 h-3 text-sky-600" />
            Bot Tự Động
          </span>
        );
      case 'agent_handling':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px] flex items-center gap-1">
            <User className="w-3 h-3 text-purple-600" />
            Đang Tiếp Quản
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã Hoàn Tất
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Toast Alert */}
      {actionAlert && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionAlert.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{actionAlert.message}</span>
        </div>
      )}

      {/* Header & KPI Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Trung Tâm Điều Hành Chatbot & Live Chat Đa Kênh
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Quản lý hàng trăm hội thoại Zalo OA, Facebook Messenger, Livechat tập trung
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Hộp Thư Đa Kênh & Trợ Lý Tương Tác Y Tế
            </h1>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('inbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'inbox'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Hộp Thư Trực Tiếp</span>
              {urgentCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                  {urgentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('scenarios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'scenarios'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Kịch Bản FAQ ({scenariosList.length})</span>
            </button>
            <button
              onClick={() => setViewMode('escalation_rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'escalation_rules'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quy Tắc Chuyển Tuyến SLA</span>
            </button>
            <button
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'simulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phòng Thử Nghiệm Bot</span>
            </button>
          </div>
        </div>

        {/* Operational Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Tổng hội thoại đang mở</span>
            <span className="text-lg font-bold text-slate-900">{totalConvs} cuộc trò chuyện</span>
          </div>
          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            <span className="text-rose-600 block text-[11px] font-medium">Cần hỗ trợ khẩn / SLA</span>
            <span className="text-lg font-bold text-rose-700">{urgentCount} yêu cầu</span>
          </div>
          <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200">
            <span className="text-sky-600 block text-[11px] font-medium">Bot xử lý không cần chuyển tiếp</span>
            <span className="text-lg font-bold text-sky-700">{totalConvs - urgentCount} / {totalConvs}</span>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
            <span className="text-purple-600 block text-[11px] font-medium">Đã chuyển CSKH xử lý</span>
            <span className="text-lg font-bold text-purple-700">{urgentCount} yêu cầu</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: OMNICHANNEL LIVE INBOX (3-COLUMN HIGH CAPACITY WORKSPACE) */}
      {/* ========================================================================= */}
      {viewMode === 'inbox' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
            
            {/* ------------------------------------------------------------------- */}
            {/* COLUMN 1: CONVERSATION QUEUE & SMART SEARCH (4 COLS / 340px) */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
              
              {/* Search & Quick Filter Bar */}
              <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên BN, SĐT, triệu chứng, tag..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({conversations.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('agent_needed')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                      statusFilter === 'agent_needed'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Cần Hỗ Trợ ({urgentCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('bot_handling')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                      statusFilter === 'bot_handling'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    Bot ({botHandledCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('agent_handling')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === 'agent_handling'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    Đang Chat ({agentHandledCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('resolved')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === 'resolved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Đã Xong ({resolvedCount})
                  </button>
                </div>

                {/* Channel Filter Row */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">Kênh:</span>
                    <select
                      value={channelFilter}
                      onChange={(e) => setChannelFilter(e.target.value as any)}
                      className="bg-transparent border-0 font-bold text-blue-600 focus:ring-0 p-0 cursor-pointer text-[11px]"
                    >
                      <option value="ALL">Tất cả kênh (Zalo, FB, Web...)</option>
                      <option value="Zalo OA">Zalo Official Account</option>
                      <option value="Facebook Messenger">Facebook Messenger</option>
                      <option value="Website Livechat">Website Livechat</option>
                    </select>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {filteredConversations.length} kết quả
                  </span>
                </div>
              </div>

              {/* Conversations List Scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[560px]">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs">Không tìm thấy cuộc hội thoại nào phù hợp bộ lọc.</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = conv.id === activeConversation?.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConvId(conv.id)}
                        className={`p-3.5 cursor-pointer transition-all hover:bg-white space-y-1.5 ${
                          isSelected ? 'bg-white border-l-4 border-blue-600 shadow-xs' : ''
                        } ${conv.status === 'agent_needed' ? 'bg-rose-50/40' : ''}`}
                      >
                        {/* Row 1: Avatar, Name, Channel, Time */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PatientAvatar
                              src={conv.patientAvatar}
                              name={conv.patientName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs">{conv.patientName}</span>
                                {conv.priority === 'Khẩn cấp' && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium block">
                                {conv.patientPhone}
                              </span>
                            </div>
                          </div>

                          <div className="text-right space-y-0.5">
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {conv.lastMessageTime}
                            </span>
                            {getChannelBadge(conv.channel)}
                          </div>
                        </div>

                        {/* Row 2: Message Snippet & Unread */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-600 line-clamp-1 flex-1 font-normal">
                            {conv.lastMessage}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Status & Tag badges */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {getStatusBadge(conv.status)}
                            {conv.tags.slice(0, 1).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>

                          {conv.waitingMinutes > 0 && (
                            <span
                              className={`text-[10px] font-bold ${
                                conv.waitingMinutes >= 5 ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            >
                              Chờ {conv.waitingMinutes}p
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* COLUMN 2: ACTIVE LIVE CHAT CANVAS & COPILOT (5 or 8 COLS) */}
            {/* ------------------------------------------------------------------- */}
            <div
              className={`${
                isRightSidebarOpen ? 'lg:col-span-5' : 'lg:col-span-8'
              } flex flex-col bg-white border-r border-slate-200 transition-all`}
            >
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <PatientAvatar
                        src={activeConversation.patientAvatar}
                        name={activeConversation.patientName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{activeConversation.patientName}</h3>
                          {getChannelBadge(activeConversation.channel)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>SĐT: <strong className="text-slate-800">{activeConversation.patientPhone}</strong></span>
                          <span>•</span>
                          <span>Phụ trách: <strong className="text-blue-600">{activeConversation.assignedStaff || 'Chưa phân công'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Mode Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Take over button */}
                      <button
                        onClick={() => handleToggleBotMode(activeConversation.id, activeConversation.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeConversation.status === 'bot_handling'
                            ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                            : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                        }`}
                        title="Chuyển chế độ tiếp quản giữa Bot AI và Nhân viên"
                      >
                        {activeConversation.status === 'bot_handling' ? (
                          <>
                            <User className="w-3.5 h-3.5" />
                            <span>Tiếp Quản Live Chat</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5" />
                            <span>Bật Lại Bot AI</span>
                          </>
                        )}
                      </button>

                      {/* Escalate to Ticket */}
                      <button
                        onClick={handleEscalateToTicket}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Tạo phiếu SLA chuyển tiếp sang bộ phận CSKH"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Tạo Ticket SLA</span>
                      </button>

                      {/* Mark Resolved */}
                      {activeConversation.status !== 'resolved' && (
                        <button
                          onClick={() => handleMarkResolved(activeConversation.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Đánh dấu hoàn tất"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}

                      {/* Toggle Sidebar */}
                      <button
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className={`p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ${
                          isRightSidebarOpen ? 'bg-slate-200 text-slate-900' : 'bg-white'
                        }`}
                        title="Ẩn/Hiện hồ sơ bệnh nhân 360°"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Thread Container */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/30 max-h-[420px]">
                    {activeConversation.messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      const isBot = msg.sender === 'bot';
                      const isAgent = msg.sender === 'agent';
                      const isSystem = msg.sender === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-full font-medium flex items-center gap-1.5 shadow-2xs">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                              <span>{msg.text}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2 ${isUser ? 'justify-start' : 'justify-end'}`}
                        >
                          {isUser && (
                            <PatientAvatar
                              src={activeConversation.patientAvatar}
                              name={activeConversation.patientName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 mt-1 shrink-0"
                            />
                          )}

                          <div className={`space-y-1 max-w-[82%]`}>
                            {/* Sender title */}
                            <div className={`flex items-center gap-1.5 text-[10px] ${isUser ? 'text-slate-500' : 'justify-end text-slate-500'}`}>
                              {isUser && <span className="font-bold text-slate-800">{activeConversation.patientName}</span>}
                              {isBot && (
                                <span className="font-bold text-sky-700 flex items-center gap-1">
                                  <Bot className="w-3 h-3" /> Trợ lý AI VitCRM
                                </span>
                              )}
                              {isAgent && (
                                <span className="font-bold text-blue-700 flex items-center gap-1">
                                  <User className="w-3 h-3" /> {activeConversation.assignedStaff || 'Nhân viên CSKH'}
                                </span>
                              )}
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </div>

                            {/* Message Bubble */}
                            <div
                              className={`p-3 rounded-2xl text-xs whitespace-pre-line shadow-2xs ${
                                isUser
                                  ? 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                                  : isBot
                                  ? 'bg-sky-50 text-slate-900 border border-sky-200 rounded-tr-xs'
                                  : 'bg-blue-600 text-white rounded-tr-xs'
                              }`}
                            >
                              {msg.text}

                              {/* Attachment Rich Card Preview */}
                              {msg.attachmentType === 'qr_payment' && (
                                <div className="mt-2.5 p-2.5 bg-white text-slate-900 rounded-xl border border-slate-200 flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                    <QrCode className="w-8 h-8 text-blue-600" />
                                  </div>
                                  <div className="text-[11px] space-y-0.5">
                                    <span className="font-bold text-slate-900 block">Mã VietQR NAPAS 24/7</span>
                                    <span className="text-slate-500">Giữ slot ưu tiên 200.000đ</span>
                                  </div>
                                </div>
                              )}

                              {msg.attachmentType === 'appointment_card' && (
                                <div className="mt-2.5 p-2.5 bg-white text-slate-900 rounded-xl border border-blue-200 flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                  <div className="text-[11px] space-y-0.5">
                                    <span className="font-bold text-blue-900 block">Thẻ Lịch Hẹn Khám Điện Tử</span>
                                    <span className="text-slate-500">09:30 Ngày 22/08/2026 - BS. Minh Đức</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Quick replies */}
                            {msg.quickReplies && msg.quickReplies.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {msg.quickReplies.map((qr, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSendAgentReply(qr)}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                                  >
                                    {qr}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* AI Copilot Smart Suggestion Bar */}
                  <div className="px-3.5 py-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-t border-blue-100 flex items-center gap-2 overflow-x-auto text-[11px]">
                    <div className="flex items-center gap-1 text-blue-700 font-bold shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI Gợi Ý Nhanh:</span>
                    </div>
                    {copilotSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReplyText(sug)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 text-slate-700 hover:text-blue-900 border border-blue-200 rounded-lg whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px]"
                      >
                        {sug.length > 45 ? sug.substring(0, 45) + '...' : sug}
                      </button>
                    ))}
                  </div>

                  {/* Canned Templates Popup */}
                  {showCannedMenu && (
                    <div className="p-3 bg-white border-t border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">Chọn Tin Nhắn Mẫu Chuẩn Y Khoa</span>
                        <button
                          onClick={() => setShowCannedMenu(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cannedTemplates.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setReplyText(t.text);
                              setShowCannedMenu(false);
                            }}
                            className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl cursor-pointer text-xs space-y-1"
                          >
                            <span className="font-bold text-slate-900 block">{t.title}</span>
                            <p className="text-[10px] text-slate-500 line-clamp-2">{t.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rich Attachment Menu Popup */}
                  {showAttachmentMenu && (
                    <div className="p-3 bg-white border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">Chèn Thẻ Tương Tác Y Tế</span>
                        <button
                          onClick={() => setShowAttachmentMenu(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleSendRichCard('qr_payment')}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer"
                        >
                          <QrCode className="w-5 h-5 text-blue-600" />
                          <span>Mã QR Cọc</span>
                        </button>
                        <button
                          onClick={() => handleSendRichCard('appointment_card')}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer"
                        >
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span>Thẻ Hẹn Khám</span>
                        </button>
                        <button
                          onClick={() => handleSendRichCard('prep_guide')}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span>Hướng Dẫn Khám</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chat Input Bar */}
                  <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowCannedMenu(!showCannedMenu)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-[11px]"
                        >
                          <FileText className="w-3 h-3 text-slate-600" />
                          <span>Mẫu Trả Lời</span>
                        </button>
                        <button
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-[11px]"
                        >
                          <Paperclip className="w-3 h-3 text-slate-600" />
                          <span>Gửi Thẻ/Mã QR</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        Nhấn Enter để gửi phản hồi
                      </span>
                    </div>

                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendAgentReply();
                          }
                        }}
                        rows={2}
                        placeholder={`Soạn tin nhắn gửi tới ${activeConversation.patientName} qua ${activeConversation.channel}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                      />

                      <button
                        onClick={() => handleSendAgentReply()}
                        disabled={!replyText.trim()}
                        className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-12 h-12 stroke-1" />
                  <p className="text-sm font-medium">Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu hỗ trợ.</p>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* COLUMN 3: PATIENT 360° CONTEXT & MEDICAL PROFILE (3 COLS / 300px) */}
            {/* ------------------------------------------------------------------- */}
            {isRightSidebarOpen && activeConversation && (
              <div className="lg:col-span-3 p-4 bg-slate-50/60 flex flex-col space-y-4 max-h-[680px] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Hồ Sơ Y Tế Bệnh Nhân 360°
                  </h4>
                  <button
                    onClick={() => {
                      if (onSelectPatient) onSelectPatient(activePatient.id);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <span>Xem Sổ Khám</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Patient Summary Card */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <PatientAvatar
                      src={activeConversation.patientAvatar}
                      name={activePatient.name}
                      gender={activePatient.gender}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{activePatient.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium block">{activePatient.gender} • {activePatient.age} tuổi</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] inline-block mt-0.5">
                        {activePatient.membership?.tier || 'Hội viên Thân Thiết'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Mã BN:</span>
                      <strong className="text-slate-800">{activePatient.id}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">SĐT:</span>
                      <strong className="text-slate-800">{activePatient.phone}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Cơ sở thường khám:</span>
                      <span className="text-slate-700 font-medium">188 Phố Huế</span>
                    </div>
                  </div>
                </div>

                {/* Medical Warning Alerts */}
                <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cảnh Báo Lâm Sàng & Dị Ứng</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    {activePatient.allergies?.length
                      ? `Dị ứng: ${activePatient.allergies.join(', ')}`
                      : 'Dị ứng: Kháng sinh nhóm Penicillin, Hải sản biển.'}
                  </p>
                  <p className="text-[11px] text-rose-700">
                    {activePatient.underlyingConditions?.length
                      ? `Bệnh nền: ${activePatient.underlyingConditions.join(', ')}`
                      : 'Bệnh nền: Tăng huyết áp độ 2, Đái tháo đường Type 2.'}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-[11px] block">Tác Vụ CSKH Nhanh</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        showNotification('Đã mở kết nối gọi VoIP tổng đài tới ' + activePatient.phone, 'info');
                      }}
                      className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                      <span>Gọi VoIP</span>
                    </button>
                    <button
                      onClick={handleEscalateToTicket}
                      className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tạo Ticket</span>
                    </button>
                  </div>
                </div>

                {/* Internal Agent Notes */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 text-xs block">Ghi Chú Nội Bộ CSKH</span>
                  <p className="text-[11px] text-slate-600 italic">
                    "{activeConversation.notes || 'Khách hàng VIP, cần giải thích ân cần và ưu tiên xếp slot Bác sĩ Trưởng khoa.'}"
                  </p>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FAQ SCENARIOS LIST & INTENTS */}
      {/* ========================================================================= */}
      {viewMode === 'scenarios' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Kho Kịch Bản Trả Lời Tự Động & Huấn Luyện AI</h3>
                <p className="text-xs text-slate-500">Các chủ đề FAQ chuẩn y khoa được tự động phân phối qua Zalo OA, Messenger và Web</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scenarioSearch}
                  onChange={(e) => setScenarioSearch(e.target.value)}
                  placeholder="Tìm theo chủ đề, từ khóa..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    setEditingScenario(null);
                    setScenarioTopic('');
                    setScenarioResponse('');
                    setScenarioKeywords('chi phí, bảng giá, khám');
                    setIsScenarioModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Kịch Bản</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenariosList.map((sc) => (
                <div
                  key={sc.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs hover:bg-white hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">
                      {sc.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Đã kích hoạt: <strong className="text-slate-900">{sc.hitCount} lượt</strong>
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{sc.topic}</h4>
                  <p className="text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line text-[11px]">
                    {sc.botResponse}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
                    <div className="flex items-center gap-1 flex-wrap">
                      {sc.keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                          #{kw}
                        </span>
                      ))}
                    </div>

                    <span className="text-amber-700 font-semibold text-[10px]">
                      Tự tạo Ticket khiếu nại: {sc.fallbackToTicket ? 'Bật (SLA)' : 'Tắt'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: ESCALATION & SLA AUTOMATION RULES */}
      {/* ========================================================================= */}
      {viewMode === 'escalation_rules' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Quy Tắc Tự Động Chuyển Tuyến (Auto-Escalation to SLA Ticket)</h3>
            <p className="text-xs text-slate-500">Tự động phát hiện khi bệnh nhân bức xúc, triệu chứng khẩn cấp hoặc yêu cầu gặp người thật để tạo Ticket SLA tức thì</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  Khiếu Nại Viện Phí & Thái Độ Phục Vụ
                </span>
                <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px]">
                  SLA Khẩn Cấp (30 Phút)
                </span>
              </div>
              <p className="text-slate-700 text-[11px]">
                <strong>Từ khóa kích hoạt:</strong> "thái độ kém", "tính nhầm tiền", "hoàn tiền", "chưa trừ voucher", "bực mình", "gặp lãnh đạo".
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>Hành động tự động:</strong> Tạo mã Ticket SLA #TK-ZALO, gán phòng CSKH & Điều Dưỡng Trưởng, kích hoạt thông báo Push Notification tới di động nhân sự trực hotline.
              </p>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Triệu Chứng Lâm Sàng Khẩn Cấp / Nghi Ngờ Đột Quỵ
                </span>
                <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px]">
                  SLA Ưu Tiên (15 Phút)
                </span>
              </div>
              <p className="text-slate-700 text-[11px]">
                <strong>Từ khóa kích hoạt:</strong> "đau ngực dữ dội", "méo miệng", "yếu nửa người", "khó thở", "chảy máu không cầm", "sốt cao co giật".
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>Hành động tự động:</strong> Phản hồi ngay số Hotline Cấp Cứu 1900 8866 22, hướng dẫn người nhà sơ cứu tạm thời và báo động Đội Cấp cứu Ngoại viện.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: BOT SANDBOX SIMULATOR */}
      {/* ========================================================================= */}
      {viewMode === 'simulator' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Phòng Thử Nghiệm Tương Tác Bot AI (Sandbox Simulator)</h3>
              <p className="text-xs text-slate-500">Mô phỏng tin nhắn từ góc nhìn của bệnh nhân để kiểm tra độ chính xác của phản hồi AI</p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={simulatorChannel}
                onChange={(e) => setSimulatorChannel(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
              >
                <option value="Zalo OA">Kênh: Zalo OA</option>
                <option value="Facebook Messenger">Kênh: FB Messenger</option>
                <option value="Website Livechat">Kênh: Website Livechat</option>
              </select>
            </div>
          </div>

          {/* Simulator Window */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-2xl mx-auto space-y-3 min-h-[380px] flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto max-h-[320px]">
              {simulatorMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[85%] whitespace-pre-line ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {m.text}
                    {m.quickReplies && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.quickReplies.map((qr, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendSimulatorMessage(qr)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-medium"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSimBotTyping && (
                <div className="flex items-center gap-1 text-slate-400 text-xs italic">
                  <Bot className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Bot đang soạn câu trả lời y khoa...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={simulatorInput}
                onChange={(e) => setSimulatorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendSimulatorMessage();
                }}
                placeholder="Nhập câu hỏi thử nghiệm (VD: Tôi muốn hỏi giá khám thai sản)..."
                className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSendSimulatorMessage()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Gửi Thử
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
