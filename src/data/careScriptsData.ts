export interface CareScenario {
  id: string;
  category: 'pre_visit' | 'in_visit' | 'post_visit' | 'recall_chronic' | 'complaint_sla' | 'loyalty_vip' | 'b2b_corporate';
  categoryLabel: string;
  code: string;
  title: string;
  situationSummary: string;
  recommendedChannels: ('Zalo ZNS' | 'Zalo OA Chat' | 'Facebook Messenger' | 'Tổng đài (Call)' | 'SMS Brandname' | 'Trực tiếp tại quầy' | 'Gặp trực tiếp' | 'Cấp cứu 24/7' | 'Email')[];
  primaryGoal: string;
  timingRule: string;
  scriptTemplate: {
    callScript?: {
      greeting: string;
      body: string;
      objectionHandling: string;
      closing: string;
    };
    chatOrZnsTemplate?: {
      title: string;
      content: string;
      buttonAction?: string;
    };
    smsTemplate?: string;
  };
  keyNotes: string[];
  aiPromptGuidance: string;
}

export const CARE_SCENARIOS_DATA: CareScenario[] = [
  // ==========================================
  // GIAI ĐOẠN 1: TRƯỚC KHÁM & TIẾP NHẬN (PRE-VISIT)
  // ==========================================
  {
    id: 'sc-01',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-01',
    title: 'Tư vấn Bảng giá, Gói khám tổng quát & Tầm soát chuyên sâu',
    situationSummary: 'Khách hàng nhắn tin qua Zalo OA, Facebook Fanpage hoặc gọi hotline hỏi giá gói khám sức khỏe tổng quát, tầm soát ung thư hoặc gói sinh.',
    recommendedChannels: ['Zalo OA Chat', 'Facebook Messenger', 'Tổng đài (Call)'],
    primaryGoal: 'Khảo sát nhanh nhu cầu, độ tuổi, tiền sử bệnh để gợi ý đúng gói khám và chốt lịch hẹn.',
    timingRule: 'Phản hồi trong vòng 3 phút kể từ khi nhận tin nhắn/cuộc gọi.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ VitHospital xin kính chào Quý khách {ten_benh_nhan}! Em là {ten_nhan_vien} - Chuyên viên tư vấn y tế phòng khám. Em có thể hỗ trợ thông tin gói khám cho Anh/Chị hay người thân trong gia đình mình ạ?',
        body: 'Dạ thưa Anh/Chị, hiện tại VitHospital có các gói khám được thiết kế chuyên biệt theo từng độ tuổi và nhu cầu: Gói Khám Tổng Quát Cơ Bản (từ 1.850.000đ), Gói Tiêu Chuẩn Nâng Cao (từ 3.600.000đ) và Gói Tầm Soát Ung Thư Toàn Diện kèm Chụp MRI/CT (từ 6.800.000đ). Không biết Anh/Chị đang quan tâm gói khám cho bản thân hay bố mẹ, và gần đây cơ thể mình có triệu chứng gì đặc biệt cần bác sĩ kiểm tra kỹ không ạ?',
        objectionHandling: 'Nếu khách bảo giá cao: "Dạ thưa Anh/Chị, gói khám tại VitHospital đã bao gồm trọn gói 28 danh mục từ xét nghiệm máu chuyên sâu, chẩn đoán hình ảnh kỹ thuật số đến bác sĩ Trưởng khoa trực tiếp đọc kết quả và tư vấn dinh dưỡng 1-1, hoàn toàn không phát sinh chi phí phụ ạ."',
        closing: 'Dạ hiện tại trong tuần này phòng khám đang có chương trình tặng Voucher 200.000đ và suất ăn nhẹ sau lấy máu. Em xin phép giữ lịch hẹn sáng thứ {ngay_kham} lúc {gio_kham} với Bác sĩ {bac_si} cho Anh/Chị nhé ạ?'
      },
      chatOrZnsTemplate: {
        title: 'Tư vấn Gói Khám Sức Khỏe Toàn Diện VitHospital',
        content: 'Chào Anh/Chị {ten_benh_nhan},\n\nCảm ơn Anh/Chị đã quan tâm đến dịch vụ khám sức khỏe tại Bệnh viện Đa khoa Quốc tế VitHospital. Em gửi Anh/Chị bảng danh mục chi tiết 3 gói khám được lựa chọn nhiều nhất:\n\n1. Gói Tổng Quát Cơ Bản: 1.850.000đ (18 danh mục)\n2. Gói Nâng Cao Chuyên Sâu: 3.600.000đ (28 danh mục kèm Siêu âm tim, Đo loãng xương)\n3. Gói Tầm Soát Toàn Diện: 6.800.000đ (Kèm Nội soi tiêu hóa không đau & Tầm soát 6 loại ung thư phổ biến)\n\nAnh/Chị nhắn giúp em độ tuổi và nhu cầu để em gửi chi tiết danh mục và giữ lịch khám ưu tiên với Bác sĩ Trưởng khoa nhé ạ!',
        buttonAction: 'Xem Chi Tiết Gói & Đặt Lịch'
      },
      smsTemplate: '[VitHospital] Chao Anh/Chi {ten_benh_nhan}, PK gui thong tin goi kham tong quat tai: vithospital.vn/goi-kham. Hotline tu van uu tien: 1900-6868.'
    },
    keyNotes: ['Luôn hỏi độ tuổi và triệu chứng trước khi báo giá', 'Nhấn mạnh trang thiết bị hiện đại và không chờ đợi', 'Gợi ý suất ăn nhẹ miễn phí sau khi nhịn ăn lấy máu'],
    aiPromptGuidance: 'Tập trung tư vấn ân cần, giải thích rõ các hạng mục xét nghiệm mang lại lợi ích gì cho sức khỏe.'
  },
  {
    id: 'sc-02',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-02',
    title: 'Tiếp nhận & Xác nhận Lịch hẹn Khám mới từ Đa kênh',
    situationSummary: 'Bệnh nhân vừa đặt hẹn thành công trên Website, Cổng Bệnh nhân (Patient Portal), Zalo Mini App hoặc Facebook Ads.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)', 'SMS Brandname'],
    primaryGoal: 'Xác nhận thông tin, khoa phòng, bác sĩ phụ trách và thời gian khám chính xác.',
    timingRule: 'Gửi ZNS tức thì và gọi điện xác nhận trong vòng 15 phút.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}! Em gọi từ Bộ phận Tiếp đón Bệnh viện Đa khoa VitHospital ạ.',
        body: 'Em xin phép gọi xác nhận lịch hẹn khám của Anh/Chị tại {khoa_kham}, Bác sĩ {bac_si} phụ trách vào lúc {gio_kham}, ngày {ngay_kham} tại Cơ sở {co_so} ạ. Thông tin trên phiếu hẹn đã hoàn toàn chính xác chưa Anh/Chị?',
        objectionHandling: 'Nếu khách muốn đổi giờ: "Dạ không sao ạ, hiện khung giờ {gio_kham_moi} cùng ngày Bác sĩ {bac_si} vẫn còn trống lịch, em đã cập nhật lại trên hệ thống cho Anh/Chị rồi ạ."',
        closing: 'Dạ em đã gửi tin nhắn xác nhận kèm mã QR tiếp đón qua Zalo của Anh/Chị. Hẹn gặp Anh/Chị tại quầy Lễ tân số {so_quay} sáng ngày {ngay_kham} ạ. Em chúc Anh/Chị một ngày nhiều sức khỏe!'
      },
      chatOrZnsTemplate: {
        title: 'Xác Nhận Đặt Lịch Khám Thành Công - VitHospital',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nLịch hẹn khám của Quý khách đã được xác nhận thành công trên hệ thống VitHospital:\n• Mã lịch hẹn: {ma_lich_hen}\n• Thời gian: {gio_kham} - Ngày {ngay_kham}\n• Chuyên khoa: {khoa_kham}\n• Bác sĩ phụ trách: {bac_si}\n• Địa điểm: {dia_chi_co_so}\n\nQuý khách vui lòng đến trước 10 phút và đưa mã QR này tại Quầy tiếp đón ưu tiên để được hỗ trợ nhanh nhất.',
        buttonAction: 'Xem Hướng Dẫn Đường Đi & Mã Tiếp Đón'
      },
      smsTemplate: '[VitHospital] Xac nhan lich hen {ma_lich_hen} luc {gio_kham} ngay {ngay_kham} tai {khoa_kham}, BS {bac_si}. LH: 1900-6868.'
    },
    keyNotes: ['Cung cấp rõ mã lịch hẹn và địa chỉ cơ sở', 'Nhắc bệnh nhân đến trước 10-15 phút để làm thủ tục thuận lợi'],
    aiPromptGuidance: 'Văn phong chuyên nghiệp, chuẩn xác thời gian, tạo sự an tâm và tin tưởng tuyệt đối.'
  },
  {
    id: 'sc-03',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-03',
    title: 'Nhắc Lịch Hẹn T-24h (Dặn dò nhịn ăn & chuẩn bị giấy tờ BHYT/CCCD)',
    situationSummary: 'Tự động kích hoạt trước giờ khám 24 tiếng cho toàn bộ bệnh nhân có lịch hẹn ngày hôm sau.',
    recommendedChannels: ['Zalo ZNS', 'SMS Brandname', 'Tổng đài (Call)'],
    primaryGoal: 'Đảm bảo tỷ lệ đến khám (Show-up Rate > 92%) và bệnh nhân chuẩn bị đúng chỉ định y khoa (nhịn ăn lấy máu, mang hồ sơ cũ).',
    timingRule: 'Tự động kích hoạt lúc 08:30 sáng hoặc 14:00 chiều trước ngày khám 1 ngày.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}, em là {ten_nhan_vien} phụ trách chăm sóc bệnh nhân tại VitHospital ạ.',
        body: 'Em gọi nhắc lịch hẹn khám của Anh/Chị vào ngày mai lúc {gio_kham} với Bác sĩ {bac_si}. Do ngày mai Anh/Chị có thực hiện xét nghiệm máu và siêu âm ổ bụng, Anh/Chị lưu ý giúp em nhịn ăn sáng trước khi lấy máu (có thể uống ít nước lọc) và mang theo CCCD/Thẻ BHYT hoặc hồ sơ khám bệnh cũ nếu có nhé ạ.',
        objectionHandling: 'Nếu khách có lịch bận: "Dạ nếu ngày mai Anh/Chị có việc đột xuất, em có thể hỗ trợ dời lịch sang ngày tiếp theo để Anh/Chị không bị lỡ hẹn với Bác sĩ Trưởng khoa ạ."',
        closing: 'Dạ em chúc Anh/Chị có một buổi tối nghỉ ngơi thoải mái. Hẹn gặp Anh/Chị vào {gio_kham} ngày mai tại phòng khám ạ!'
      },
      chatOrZnsTemplate: {
        title: 'Nhắc Lịch Hẹn & Dặn Dò Y Khoa Trước Khám (T-24h)',
        content: 'Kính gửi Anh/Chị {ten_benh_nhan},\n\nVitHospital xin nhắc lịch hẹn khám của Anh/Chị vào ngày mai:\n⏰ Thời gian: {gio_kham} - {ngay_kham}\n🏥 Chuyên khoa: {khoa_kham} (BS {bac_si})\n\n📋 DẶN DÒ Y KHOA QUAN TRỌNG:\n1. Nhịn ăn từ 6 - 8 tiếng trước khi lấy máu (có thể uống nước lọc tinh khiết).\n2. Không sử dụng rượu bia, chất kích thích hoặc cà phê trước khi khám.\n3. Vui lòng mang theo CCCD gắn chip, Thẻ BHYT/Bảo hiểm tư nhân và các đơn thuốc đang sử dụng.\n\nPhòng khám có phục vụ bữa ăn nhẹ dinh dưỡng miễn phí sau khi hoàn thành lấy mẫu xét nghiệm.',
        buttonAction: 'Xác Nhận Sẽ Đến / Đổi Giờ'
      },
      smsTemplate: '[VitHospital] Nhac hen: {ten_benh_nhan} co lich kham luc {gio_kham} ngay mai {ngay_kham}. Xin nho nhin an sang neu co xet nghiem mau. LH: 1900-6868.'
    },
    keyNotes: ['Nhắc rõ việc nhịn ăn 6-8 tiếng nếu có xét nghiệm máu', 'Nhắc mang thẻ bảo hiểm để được trừ quyền lợi', 'Nhắc việc có bữa ăn phụ sau lấy máu'],
    aiPromptGuidance: 'Nhấn mạnh tính chuẩn xác y khoa, tạo cảm giác được quan tâm chu đáo từng chi tiết nhỏ.'
  },
  {
    id: 'sc-04',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-04',
    title: 'Nhắc Lịch Hẹn T-2h & Hướng Dẫn Vị Trí Đỗ Xe / Quầy Tiếp Đón',
    situationSummary: 'Tự động gửi trước giờ khám 2 tiếng để hỗ trợ bệnh nhân di chuyển và hướng dẫn vào đúng khu vực phòng khám.',
    recommendedChannels: ['Zalo ZNS', 'SMS Brandname'],
    primaryGoal: 'Giúp bệnh nhân tìm đường dễ dàng, tránh tắc đường và đến đúng quầy tiếp đón.',
    timingRule: 'T-2 giờ trước giờ hẹn khám.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Hướng Dẫn Tiếp Đón Ưu Tiên (T-2h)',
        content: 'Chào Anh/Chị {ten_benh_nhan},\n\nChỉ còn 2 tiếng nữa là đến giờ hẹn khám của Anh/Chị tại VitHospital ({gio_kham}):\n📍 Địa chỉ: {dia_chi_co_so}\n🅿️ Bãi đỗ xe: Tầng hầm B1 (Ô tô) và Bãi xe cạnh cổng số 2 (Xe máy) - Miễn phí vé gửi xe cho bệnh nhân.\n🚪 Quầy tiếp đón: Quầy số {so_quay} (Tầng 1 - Sảnh chính).\n\nChúc Anh/Chị có chuyến đi an toàn và thuận lợi!',
        buttonAction: 'Mở Chỉ Đường Google Maps'
      },
      smsTemplate: '[VitHospital] Con 2 tieng den gio hen {gio_kham}. Do xe tai Ham B1, den Quay tiep don so {so_quay} de duoc tiep don uu tien.'
    },
    keyNotes: ['Cung cấp vị trí đỗ xe rõ ràng', 'Chỉ rõ số quầy tiếp đón ưu tiên'],
    aiPromptGuidance: 'Ngắn gọn, súc tích, định vị rõ ràng.'
  },
  {
    id: 'sc-05',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-05',
    title: 'Khách Yêu Cầu Hủy Hẹn / Xin Dời Giờ Khám (Kịch bản Giữ Chân)',
    situationSummary: 'Bệnh nhân gọi điện hoặc nhắn tin báo bận, muốn hủy lịch hẹn khám hoặc đổi sang ngày khác.',
    recommendedChannels: ['Tổng đài (Call)', 'Zalo OA Chat', 'Facebook Messenger'],
    primaryGoal: 'Lắng nghe lý do, thấu cảm và chuyển lịch sang khung giờ phù hợp nhất thay vì để mất khách hàng.',
    timingRule: 'Ngay khi nhận được yêu cầu hủy hẹn.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}, em nhận được thông tin Anh/Chị đang cần điều chỉnh lại lịch hẹn khám ngày {ngay_kham} đúng không ạ?',
        body: 'Dạ em rất hiểu là công việc đôi khi có phát sinh đột xuất ạ. Để không làm gián đoạn kế hoạch kiểm tra sức khỏe của mình, em xin phép kiểm tra lịch trống của Bác sĩ {bac_si} vào cuối tuần này hoặc buổi sáng tuần tới, khung giờ nào sẽ thuận tiện nhất cho Anh/Chị ạ?',
        objectionHandling: 'Nếu khách ngần ngại: "Dạ thưa Anh/Chị, việc theo dõi triệu chứng {trieu_chung} cần được kiểm tra sớm để bác sĩ có phác đồ can thiệp kịp thời. Em xin phép giữ trước cho Anh/Chị một chỗ ưu tiên vào 09:00 sáng Thứ Bảy tuần này nhé ạ."',
        closing: 'Dạ em đã dời lịch hẹn của mình sang {gio_kham_moi} ngày {ngay_kham_moi} rồi ạ. Em gửi lại xác nhận qua Zalo cho Anh/Chị ngay đây ạ!'
      },
      chatOrZnsTemplate: {
        title: 'Hỗ Trợ Dời Lịch Hẹn Khám - VitHospital',
        content: 'Chào Anh/Chị {ten_benh_nhan},\n\nVitHospital đã ghi nhận yêu cầu thay đổi lịch khám của Anh/Chị. Để đảm bảo kế hoạch theo dõi sức khỏe không bị gián đoạn, phòng khám đã sắp xếp lại lịch khám mới:\n⏰ Thời gian mới: {gio_kham_moi} - Ngày {ngay_kham_moi}\n👨‍⚕️ Bác sĩ: {bac_si} ({khoa_kham})\n\nNếu cần thay đổi khung giờ khác, Anh/Chị chỉ cần nhắn lại cho em nhé ạ!',
        buttonAction: 'Xác Nhận Lịch Mới'
      }
    },
    keyNotes: ['Luôn thấu cảm lý do của khách hàng', 'Chủ động đưa ra 2 lựa chọn khung giờ mới cụ thể', 'Nhấn mạnh tầm quan trọng của việc kiểm tra sức khỏe đúng hạn'],
    aiPromptGuidance: 'Thấu cảm, nhẹ nhàng, giữ chân khéo léo không tạo cảm giác ép buộc.'
  },
  {
    id: 'sc-06',
    category: 'pre_visit',
    categoryLabel: '1. Trước khám & Tiếp nhận',
    code: 'PRE-06',
    title: 'Bác Sĩ Có Ca Mổ Đột Xuất / Ca Cấp Cứu (Xin dời lịch hẹn êm thấm)',
    situationSummary: 'Bác sĩ phụ trách có ca phẫu thuật cấp cứu khẩn cấp hoặc việc đột xuất tại bệnh viện, cần thông báo dời lịch hẹn của bệnh nhân.',
    recommendedChannels: ['Tổng đài (Call)', 'Zalo ZNS'],
    primaryGoal: 'Giải thích chân thành, giữ sự tôn trọng tối đa và đền bù trải nghiệm (tặng voucher/nâng cấp dịch vụ).',
    timingRule: 'Gọi điện ngay lập tức khi nhận thông báo từ Bác sĩ/Ban Giám Đốc.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}! Em là {ten_nhan_vien} - Quản lý CSKH Bệnh viện Đa khoa VitHospital ạ.',
        body: 'Dạ trước hết, VitHospital xin gửi lời cáo lỗi chân thành nhất tới Anh/Chị. Sáng nay Bác sĩ {bac_si} có một ca phẫu thuật cấp cứu đột xuất tại phòng mổ để hỗ trợ một bệnh nhân nguy kịch. Vì vậy, khung giờ {gio_kham} hôm nay của Bác sĩ bị hoãn lại.',
        objectionHandling: 'Phương án xử lý: "Để đảm bảo quyền lợi cho Anh/Chị, phòng khám xin đề xuất 2 phương án: 1 là TS.BS {bac_si_thay_the} - Phó Trưởng khoa sẽ trực tiếp thăm khám ưu tiên ngay cho Anh/Chị mà không phải chờ đợi; Hoặc 2 là em xin phép dời lịch của Bác sĩ {bac_si} sang chiều nay lúc {gio_kham_moi}. Đồng thời phòng khám xin gửi tặng Anh/Chị 1 Voucher miễn phí gói khám mắt/răng miệng như lời tạ lỗi sâu sắc ạ."',
        closing: 'Dạ em cảm ơn sự thấu hiểu và đồng cảm tuyệt vời của Anh/Chị dành cho các y bác sĩ ạ!'
      },
      chatOrZnsTemplate: {
        title: 'Thông Báo Điều Chỉnh Lịch Khám Đột Xuất - VitHospital',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nVitHospital xin chân thành cáo lỗi vì sự bất tiện này. Do Bác sĩ {bac_si} có ca phẫu thuật cấp cứu khẩn cấp, lịch hẹn lúc {gio_kham} của Quý khách cần được điều chỉnh.\n\nPhòng khám đã bố trí Bác sĩ Trưởng khoa thay thế hoặc dời sang khung giờ ưu tiên {gio_kham_moi}. Chuyên viên CSKH đang liên hệ trực tiếp với Quý khách để hỗ trợ chu đáo nhất.',
        buttonAction: 'Xem Lịch Thay Thế'
      }
    },
    keyNotes: ['Nhận lỗi chân thành, không đổ lỗi vòng vo', 'Đưa ra 2 giải pháp rõ ràng (BS thay thế tương đương hoặc dời giờ kèm quà tặng tạ lỗi)'],
    aiPromptGuidance: 'Thể hiện sự tôn trọng tối cao, ngôn từ khiêm nhường và đền bù trải nghiệm xứng đáng.'
  },

  // ==========================================
  // GIAI ĐOẠN 2: TRONG KHÁM & TẠI QUẦY (IN-VISIT)
  // ==========================================
  {
    id: 'sc-07',
    category: 'in_visit',
    categoryLabel: '2. Trong khám & Tại quầy',
    code: 'INV-01',
    title: 'Hướng Dẫn Check-in Tự Động & Quẹt Thẻ BHYT / CCCD Gắn Chip',
    situationSummary: 'Bệnh nhân đến sảnh phòng khám, cần hướng dẫn nhận số thứ tự thông minh và tiếp đón vào đúng chuyên khoa.',
    recommendedChannels: ['Trực tiếp tại quầy', 'Zalo ZNS'],
    primaryGoal: 'Rút ngắn thời gian chờ đợi dưới 3 phút, số hóa hồ sơ tự động.',
    timingRule: 'Ngay khi bệnh nhân bước vào sảnh lễ tân.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ VitHospital kính chào Cô/Bác/Anh/Chị {ten_benh_nhan}! Em mời Anh/Chị qua Quầy Tiếp Đón Ưu Tiên số {so_quay} ạ.',
        body: 'Dạ Anh/Chị cho em xin mã QR trên tin nhắn Zalo hoặc CCCD gắn chip/Thẻ BHYT để em quét thông tin hồ sơ điện tử trong 30 giây nhé ạ. Em đã in sẵn phiếu tiếp đón và số thứ tự phòng khám {so_phong} của Bác sĩ {bac_si} cho mình rồi ạ.',
        objectionHandling: 'Nếu khách chưa có mã: "Dạ không sao ạ, em chỉ cần số điện thoại là hệ thống tự động nhận diện lịch hẹn đã đặt của Anh/Chị rồi ạ."',
        closing: 'Dạ em mời Anh/Chị di chuyển lên Tầng {so_tang}, Phòng {so_phong}, Điều dưỡng phụ trách tại phòng sẽ mời Anh/Chị vào ngay ạ!'
      }
    },
    keyNotes: ['Tươi cười, cúi chào theo chuẩn dịch vụ 5 sao', 'Hỗ trợ quét CCCD/BHYT nhanh chóng'],
    aiPromptGuidance: 'Thân thiện, niềm nở, chỉ dẫn rõ ràng số tầng và số phòng.'
  },
  {
    id: 'sc-08',
    category: 'in_visit',
    categoryLabel: '2. Trong khám & Tại quầy',
    code: 'INV-02',
    title: 'Dặn Dò Chuẩn Bị Xét Nghiệm Máu, Nội Soi Gây Mê & Chụp CT/MRI',
    situationSummary: 'Bác sĩ chỉ định các dịch vụ cận lâm sàng chuyên sâu, điều dưỡng cần hướng dẫn quy trình an toàn người bệnh.',
    recommendedChannels: ['Trực tiếp tại quầy', 'Zalo ZNS'],
    primaryGoal: 'Đảm bảo an toàn tuyệt đối trước can thiệp thủ thuật và xét nghiệm chẩn đoán hình ảnh.',
    timingRule: 'Sau khi bác sĩ kê phiếu chỉ định cận lâm sàng.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Cô/Bác {ten_benh_nhan}, Bác sĩ vừa chỉ định cho mình làm xét nghiệm máu và Nội soi dạ dày gây mê êm ái ạ.',
        body: 'Dạ em xin phép hướng dẫn quy trình để đảm bảo an toàn tuyệt đối: Trước khi nội soi, Bác sĩ gây mê sẽ thăm khám và kiểm tra điện tim. Quá trình nội soi diễn ra hoàn toàn êm ái trong 10-15 phút như một giấc ngủ ngắn, không hề đau rát hay buồn nôn ạ.',
        objectionHandling: 'Nếu bệnh nhân sợ gây mê: "Dạ Cô/Bác hoàn toàn yên tâm ạ, thuốc tiền mê tại VitHospital là dòng cao cấp tan nhanh, sau khi soi xong Cô/Bác tỉnh táo ngay sau 5 phút và có phòng hồi tỉnh riêng theo dõi sát sao ạ."',
        closing: 'Em mời Cô/Bác sang Phòng Lấy Mẫu số {so_phong} trước, sau đó điều dưỡng bên em sẽ dẫn Cô/Bác sang Khu Nội Soi Kỹ Thuật Cao ạ.'
      }
    },
    keyNotes: ['Giải thích quy trình nhẹ nhàng để giải tỏa lo lắng cho bệnh nhân', 'Khẳng định trang thiết bị vô khuẩn chuẩn quốc tế'],
    aiPromptGuidance: 'Trấn an tâm lý, giải thích rõ cơ chế an toàn y khoa.'
  },
  {
    id: 'sc-09',
    category: 'in_visit',
    categoryLabel: '2. Trong khám & Tại quầy',
    code: 'INV-03',
    title: 'Hướng Dẫn Bảo Lãnh Viện Phí Bảo Hiểm Tư Nhân Trực Tiếp',
    situationSummary: 'Bệnh nhân có thẻ bảo hiểm sức khỏe tư nhân (Bảo Việt, PVI, Manulife, Prudential, Insmart, AIA, Dai-ichi...) muốn bảo lãnh viện phí không cần trả tiền mặt.',
    recommendedChannels: ['Trực tiếp tại quầy', 'Zalo OA Chat'],
    primaryGoal: 'Bảo lãnh viện phí thành công trong 15-20 phút, hỗ trợ xuất hóa đơn VAT điện tử và hồ sơ y tế chuẩn.',
    timingRule: 'Khi làm thủ tục thanh toán tại quầy Thu ngân / Bảo lãnh.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}! VitHospital là đối tác liên kết bảo lãnh trực tiếp với hơn 30 hãng bảo hiểm lớn ạ.',
        body: 'Dạ Anh/Chị cho em mượn thẻ bảo hiểm {ten_hang_bh} và CCCD bản gốc. Em sẽ tiến hành gửi yêu cầu bảo lãnh trực tiếp trên cổng điện tử của công ty bảo hiểm ngay cho Anh/Chị, thời gian duyệt chỉ mất khoảng 15 phút thôi ạ.',
        objectionHandling: 'Nếu có phần phụ thu ngoài phạm vi: "Dạ thưa Anh/Chị, công ty bảo hiểm đã đồng ý chi trả 100% các hạng mục khám và xét nghiệm (trị giá 2.450.000đ). Chỉ có phần thuốc bổ sung đặc thù 150.000đ nằm ngoài danh mục của gói bảo hiểm, em xin phép gửi hóa đơn chi tiết cho Anh/Chị xem qua ạ."',
        closing: 'Dạ thủ tục bảo lãnh đã hoàn tất. Em gửi lại thẻ và hóa đơn điện tử qua Zalo cho Anh/Chị nhé ạ!'
      }
    },
    keyNotes: ['Kiểm tra hạn mức bảo hiểm nhanh chóng', 'Minh bạch các khoản được bảo lãnh và không được bảo lãnh'],
    aiPromptGuidance: 'Minh bạch, chu đáo, giải thích chi tiết quyền lợi bảo hiểm.'
  },
  {
    id: 'sc-10',
    category: 'in_visit',
    categoryLabel: '2. Trong khám & Tại quầy',
    code: 'INV-04',
    title: 'Thông Báo Đã Hoàn Tất Hồ Sơ Khám & Mời Trở Lại Bàn Tư Vấn / Phòng Khám',
    situationSummary: 'Hệ thống đã hoàn tất kết quả dịch vụ khám sức khỏe vào hồ sơ khách hàng, thông báo khách hàng quay lại phòng khám kết luận và nhận tư vấn chăm sóc.',
    recommendedChannels: ['Zalo ZNS', 'SMS Brandname', 'Tổng đài (Call)'],
    primaryGoal: 'Bệnh nhân không phải đứng chờ tại quầy, có thể ngồi nghỉ ngơi hoặc dùng bữa nhẹ và được gọi tự động khi có kết quả.',
    timingRule: 'Ngay khi Bác sĩ xét nghiệm/CĐHA ký số kết quả.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Đã Có Đầy Đủ Kết Quả Xét Nghiệm & Chẩn Đoán Hình Ảnh',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nToàn bộ kết quả xét nghiệm và chẩn đoán hình ảnh của Quý khách đã được cập nhật đầy đủ lên Hồ sơ Bệnh án Điện tử EMR.\n\n👨‍⚕️ Bác sĩ {bac_si} trân trọng mời Quý khách quay trở lại Phòng Khám số {so_phong} để được giải thích chi tiết kết quả, tư vấn phác đồ và nhận đơn thuốc điện tử.\n\nQuý khách có thể xem trước kết quả trực tuyến tại liên kết bên dưới.',
        buttonAction: 'Xem Kết Quả Xét Nghiệm & Đơn Thuốc'
      },
      smsTemplate: '[VitHospital] Ket qua xet nghiem cua {ten_benh_nhan} da hoan tat. Kinh moi Quy khach quay lai Phong {so_phong} gap BS {bac_si}.'
    },
    keyNotes: ['Tự động hóa thông báo giúp giảm tải ùn tắc sảnh chờ', 'Cung cấp liên kết xem trực tuyến an toàn bảo mật'],
    aiPromptGuidance: 'Trang trọng, lịch sự, hướng dẫn chính xác số phòng quay lại.'
  },

  // ==========================================
  // GIAI ĐOẠN 3: SAU KHÁM & XUẤT VIỆN (POST-VISIT)
  // ==========================================
  {
    id: 'sc-11',
    category: 'post_visit',
    categoryLabel: '3. Sau khám & Xuất viện',
    code: 'POST-01',
    title: 'Chăm Sóc D+1 Sau Can Thiệp Tiểu Phẫu / Thủ Thuật / Nhổ Răng / Tiêm Chủng',
    situationSummary: 'Cuộc gọi hoặc tin nhắn ZNS của Điều dưỡng chăm sóc sau 24h xuất viện/làm thủ thuật để theo dõi phản ứng và hướng dẫn giảm đau, chăm sóc vết thương.',
    recommendedChannels: ['Tổng đài (Call)', 'Zalo ZNS'],
    primaryGoal: 'Phát hiện sớm biến chứng, theo dõi mức độ hồi phục và tạo sự an tâm tuyệt đối.',
    timingRule: 'D+1 (Sáng hôm sau từ 09:00 - 11:00).',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}! Em là {ten_nhan_vien} - Điều dưỡng phụ trách theo dõi sau khám tại Bệnh viện VitHospital ạ.',
        body: 'Hôm qua Anh/Chị có thực hiện {loai_thu_thuat} tại phòng khám. Em gọi thăm hỏi xem tình trạng sức khỏe hiện tại của Anh/Chị như thế nào rồi ạ? Vết thương có còn đau nhiều hay bị chảy máu, sưng nề gì không ạ?',
        objectionHandling: 'Nếu bệnh nhân còn đau nhẹ: "Dạ thưa Anh/Chị, cảm giác hơi ê ẩm trong 24-48h đầu là phản ứng bình thường của mô ạ. Anh/Chị nhớ uống thuốc giảm đau và kháng viêm đúng theo liều bác sĩ kê, chườm lạnh nhẹ nhàng bên ngoài và kiêng đồ ăn cay nóng/dai cứng nhé ạ. Nếu có bất kỳ dấu hiệu sốt trên 38.5 độ hoặc sưng tấy tăng dần, Anh/Chị hãy gọi ngay hotline cấp cứu bên em để bác sĩ hỗ trợ trực tiếp ạ."',
        closing: 'Dạ em đã ghi nhận tình trạng ổn định của mình vào hồ sơ theo dõi rồi ạ. Em chúc Anh/Chị mau chóng hồi phục hoàn toàn ạ!'
      },
      chatOrZnsTemplate: {
        title: 'Thăm Khám & Dặn Dò Sau Thủ Thuật (D+1) - VitHospital',
        content: 'Chào Anh/Chị {ten_benh_nhan},\n\nVitHospital gửi lời hỏi thăm sức khỏe sau khi Anh/Chị thực hiện {loai_thu_thuat} vào ngày hôm qua.\n\n💊 LƯU Ý CHĂM SÓC TẠI NHÀ:\n• Uống thuốc đúng giờ theo đơn Bác sĩ {bac_si} đã kê.\n• Giữ vết thương khô thoáng, vệ sinh bằng nước muối sinh lý.\n• Chườm lạnh trong 24h đầu để giảm sưng nề.\n\nNếu có thắc mắc hoặc cần bác sĩ hỗ trợ khẩn cấp, Anh/Chị nhấn nút gọi hotline 24/7 bên dưới nhé ạ!',
        buttonAction: 'Liên Hệ Bác Sĩ Trực Tuyến 24/7'
      }
    },
    keyNotes: ['Hỏi kỹ về cảm giác đau, sốt, chảy máu', 'Dặn dò cách uống thuốc và chườm lạnh/nóng đúng kỹ thuật'],
    aiPromptGuidance: 'Ân cần, ấm áp, đậm tính y khoa thực tiễn.'
  },
  {
    id: 'sc-12',
    category: 'post_visit',
    categoryLabel: '3. Sau khám & Xuất viện',
    code: 'POST-02',
    title: 'Khảo Sát Mức Độ Hài Lòng CSAT / NPS & Lắng Nghe Ý Kiến (D+3)',
    situationSummary: 'Tự động gửi phiếu khảo sát đánh giá chất lượng dịch vụ 5 sao sau 3 ngày khám bệnh.',
    recommendedChannels: ['Zalo ZNS', 'SMS Brandname'],
    primaryGoal: 'Thu thập chỉ số NPS/CSAT thực tế, phát hiện sớm các điểm chưa hài lòng để kịp thời xử lý trước khi khách phản ánh lên mạng xã hội.',
    timingRule: 'D+3 sau ngày khám.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Khảo Sát Trải Nghiệm Khám Chữa Bệnh - VitHospital',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nSự hài lòng và sức khỏe của Quý khách là ưu tiên hàng đầu tại VitHospital. Quý khách vui lòng dành 30 giây để đánh giá trải nghiệm buổi khám ngày {ngay_kham} với Bác sĩ {bac_si}:\n\n⭐ Quý khách đánh giá chất lượng phục vụ ở mức độ nào? (1 - 5 sao)\n\nMọi ý kiến đóng góp của Quý khách sẽ giúp VitHospital nâng cao chất lượng dịch vụ ngày một tốt hơn.',
        buttonAction: 'Đánh Giá Ngay (Tặng 50 Điểm Thưởng)'
      },
      smsTemplate: '[VitHospital] Cam on Quy khach {ten_benh_nhan} da tham kham. Xin danh 30s danh gia chat luong tai: vithospital.vn/danh-gia/{ma_kham}.'
    },
    keyNotes: ['Tặng điểm thưởng hội viên để tăng tỷ lệ phản hồi khảo sát', 'Nếu khách chấm dưới 3 sao, hệ thống tự động sinh Ticket CSKH khẩn cấp'],
    aiPromptGuidance: 'Cầu thị, trân trọng, khuyến khích phản hồi đóng góp xây dựng.'
  },
  {
    id: 'sc-13',
    category: 'post_visit',
    categoryLabel: '3. Sau khám & Xuất viện',
    code: 'POST-03',
    title: 'Dặn Dò Tuân Thủ Đơn Thuốc & Cảnh Báo Tác Dụng Phụ Thường Gặp (D+7)',
    situationSummary: 'Nhắc nhở bệnh nhân dùng thuốc liên tục, không tự ý ngưng thuốc khi thấy đỡ triệu chứng và lưu ý tương tác thực phẩm.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)'],
    primaryGoal: 'Nâng cao tỷ lệ tuân thủ điều trị (Medication Adherence) và hiệu quả phục hồi bệnh.',
    timingRule: 'D+7 sau khi bắt đầu liệu trình thuốc.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Nhắc Nhở Tuân Thủ Đơn Thuốc & Sức Khỏe D+7',
        content: 'Chào Anh/Chị {ten_benh_nhan},\n\nĐã 7 ngày kể từ khi Anh/Chị bắt đầu liệu trình điều trị theo đơn của Bác sĩ {bac_si}.\n\n🩺 LƯU Ý TỪ DƯỢC SĨ LÂM SÀNG:\n• Vui lòng uống đủ số ngày thuốc được kê, không tự ý ngưng thuốc ngay cả khi các triệu chứng đã thuyên giảm hoàn toàn.\n• Uống thuốc sau ăn 30 phút và uống nhiều nước lọc.\n• Tránh sử dụng bia rượu hoặc nước ngọt có gas trong thời gian dùng kháng sinh.\n\nChúc Anh/Chị luôn dồi dào sức khỏe và bình an!',
        buttonAction: 'Xem Lại Đơn Thuốc Điện Tử'
      }
    },
    keyNotes: ['Nhấn mạnh việc uống đủ liều kháng sinh để tránh kháng thuốc', 'Cung cấp nút xem lại đơn thuốc có hướng dẫn chi tiết'],
    aiPromptGuidance: 'Mang giọng điệu của Dược sĩ chuyên môn tận tâm.'
  },
  {
    id: 'sc-14',
    category: 'post_visit',
    categoryLabel: '3. Sau khám & Xuất viện',
    code: 'POST-04',
    title: 'Trả Kết Quả Giải Phẫu Bệnh / Sinh Thiết Online & Kết Nối Bác Sĩ Giải Thích',
    situationSummary: 'Kết quả sinh thiết hoặc giải phẫu bệnh thường có sau 3-5 ngày làm việc, gửi thông báo bảo mật cho bệnh nhân kèm lời mời bác sĩ tư vấn.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)'],
    primaryGoal: 'Bảo mật kết quả nhạy cảm, giải tỏa hoang mang và kết nối tư vấn chuyên môn kịp thời.',
    timingRule: 'Ngay khi có kết quả giải phẫu bệnh.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Cô/Bác {ten_benh_nhan}, em gọi từ Phòng Quản lý Bệnh án VitHospital ạ.',
        body: 'Dạ em xin thông báo kết quả giải phẫu bệnh mẫu sinh thiết của mình ngày {ngay_kham} đã hoàn thành và được Bác sĩ {bac_si} ký duyệt. Em đã gửi bản sao điện tử bảo mật qua ứng dụng/Zalo cho mình.',
        objectionHandling: 'Tư vấn chuyên môn: "Dạ thưa Cô/Bác, để giúp mình hiểu rõ các chỉ số y khoa một cách chuẩn xác và an tâm nhất, Bác sĩ {bac_si} đã bố trí một khung giờ tư vấn trực tuyến (Telehealth) hoặc trực tiếp tại phòng khám vào chiều mai lúc {gio_kham}. Em xin phép đặt lịch tư vấn cho mình nhé ạ."',
        closing: 'Dạ Cô/Bác nhớ giữ tinh thần thật thoải mái và nghỉ ngơi điều độ nhé ạ!'
      }
    },
    keyNotes: ['Không tự ý giải thích kết quả nếu là ca bệnh phức tạp', 'Luôn kết nối với Bác sĩ chuyên khoa để giải thích trực tiếp'],
    aiPromptGuidance: 'Thấu hiểu, bảo mật, cẩn trọng tuyệt đối với kết quả giải phẫu bệnh.'
  },

  // ==========================================
  // GIAI ĐOẠN 4: TÁI KHÁM & QUẢN LÝ BỆNH MÃN TÍNH (RECALL)
  // ==========================================
  {
    id: 'sc-15',
    category: 'recall_chronic',
    categoryLabel: '4. Tái khám & Bệnh mãn tính',
    code: 'REC-01',
    title: 'Nhắc Lịch Tái Khám Tim Mạch & Tăng Huyết Áp Định Kỳ 30 Ngày',
    situationSummary: 'Tự động kích hoạt khi bệnh nhân sắp hết đợt thuốc huyết áp/tim mạch (ngày thứ 27-28 sau lần khám trước).',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)', 'SMS Brandname'],
    primaryGoal: 'Bệnh nhân tái khám kiểm tra huyết áp, điều chỉnh liều thuốc và không bị đứt quãng thuốc điều trị.',
    timingRule: 'Trước khi hết thuốc 3 ngày (D+27).',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ con chào Cô/Bác {ten_benh_nhan}, con là {ten_nhan_vien} gọi từ Khoa Nội Tim Mạch Bệnh viện VitHospital ạ.',
        body: 'Dạ thưa Cô/Bác, theo hồ sơ bệnh án thì đơn thuốc tim mạch và huyết áp của Cô/Bác sắp hết vào cuối tuần này. Bác sĩ {bac_si} có hẹn Cô/Bác tái khám để đo lại huyết áp, đo điện tim và điều chỉnh liều thuốc duy trì phù hợp ạ.',
        objectionHandling: 'Nếu bệnh nhân bảo huyết áp đã ổn: "Dạ thưa Cô/Bác, thuốc huyết áp có tác dụng duy trì chỉ số ổn định, nếu mình tự ý ngưng thuốc khi thấy khỏe thì huyết áp có thể tăng vọt đột ngột gây nguy hiểm ạ. Bác sĩ cần kiểm tra định kỳ 1 tháng/lần để bảo vệ tim và thận tốt nhất cho Cô/Bác ạ."',
        closing: 'Dạ con xin phép đặt lịch cho Cô/Bác vào 08:30 sáng Thứ {ngay_kham} gặp lại Bác sĩ {bac_si} nhé ạ!'
      },
      chatOrZnsTemplate: {
        title: 'Nhắc Lịch Tái Khám Định Kỳ Tim Mạch & Huyết Áp',
        content: 'Kính gửi Cô/Bác {ten_benh_nhan},\n\nĐơn thuốc điều trị Tăng Huyết Áp của Cô/Bác sẽ hết vào ngày {ngay_het_thuoc}. Bác sĩ {bac_si} kính mời Cô/Bác tái khám định kỳ:\n\n⏰ Thời gian đề xuất: {gio_kham} - Ngày {ngay_kham}\n🏥 Chuyên khoa: Nội Tim Mạch (Phòng {so_phong})\n\nViệc tái khám đúng hẹn giúp bác sĩ đánh giá hiệu quả kiểm soát huyết áp và điều chỉnh đơn thuốc an toàn.',
        buttonAction: 'Xác Nhận Lịch Tái Khám'
      }
    },
    keyNotes: ['Nhấn mạnh nguy cơ khi tự ý ngưng thuốc huyết áp', 'Hỗ trợ đặt lịch sớm khung giờ sáng để người cao tuổi đỡ mệt'],
    aiPromptGuidance: 'Lễ phép, kính trọng, nhấn mạnh tầm quan trọng của việc duy trì huyết áp ổn định.'
  },
  {
    id: 'sc-16',
    category: 'recall_chronic',
    categoryLabel: '4. Tái khám & Bệnh mãn tính',
    code: 'REC-02',
    title: 'Nhắc Tái Khám Đái Tháo Đường & Kiểm Tra Chỉ Số HbA1c Định Kỳ 3 Tháng',
    situationSummary: 'Bệnh nhân tiểu đường cần xét nghiệm chỉ số HbA1c định kỳ 3 tháng một lần để theo dõi đường huyết trung bình.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)'],
    primaryGoal: 'Kiểm tra đường huyết đói, HbA1c và tầm soát biến chứng mắt, bàn chân đái tháo đường.',
    timingRule: 'Mỗi 90 ngày kể từ lần xét nghiệm HbA1c gần nhất.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Lịch Kiểm Tra HbA1c & Tái Khám Đái Tháo Đường Định Kỳ',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nĐã đến kỳ kiểm tra chỉ số đường huyết 3 tháng (HbA1c) theo phác đồ quản lý Đái tháo đường của Bác sĩ {bac_si}.\n\n🔬 DANH MỤC KIỂM TRA ĐỊNH KỲ:\n• Xét nghiệm Đường huyết đói & HbA1c.\n• Đánh giá chức năng Thận (Microalbumin niệu, Creatinine).\n• Kiểm tra thị lực và tầm soát bàn chân đái tháo đường.\n\nQuý khách vui lòng nhịn ăn sáng trước khi đến lấy máu xét nghiệm.',
        buttonAction: 'Đặt Lịch Tái Khám & Xét Nghiệm'
      }
    },
    keyNotes: ['Dặn nhịn ăn sáng trước khi lấy mẫu máu HbA1c', 'Nhấn mạnh việc tầm soát sớm biến chứng mắt và thận'],
    aiPromptGuidance: 'Chu đáo, chuyên sâu về quản lý bệnh mạn tính đái tháo đường.'
  },
  {
    id: 'sc-17',
    category: 'recall_chronic',
    categoryLabel: '4. Tái khám & Bệnh mãn tính',
    code: 'REC-03',
    title: 'Nhắc Lịch Khám Thai Định Kỳ Theo Tuần Tuổi (Mốc 12, 22, 32 tuần)',
    situationSummary: 'Nhắc nhở mẹ bầu các mốc khám thai quan trọng (Đo độ mờ da gáy, Siêu âm 4D/5D dị tật hình thái, Đánh giá ngôi thai và ngôi tim thai).',
    recommendedChannels: ['Zalo ZNS', 'Zalo OA Chat', 'Tổng đài (Call)'],
    primaryGoal: 'Không bỏ lỡ các mốc vàng tầm soát dị tật thai nhi và chăm sóc sức khỏe mẹ và bé.',
    timingRule: 'Trước mốc tuần thai quan trọng 3-5 ngày.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Nhắc Lịch Siêu Âm & Khám Thai Mốc Vàng {tuan_thai} Tuần',
        content: 'Chào Mẹ {ten_benh_nhan},\n\nTheo hồ sơ theo dõi thai kỳ tại VitHospital, bé yêu của mẹ hiện đã đạt mốc {tuan_thai} tuần tuổi - Đây là MỐC VÀNG rất quan trọng trong thai kỳ:\n\n✨ NỘI DUNG THĂM KHÁM:\n• Siêu âm 5D khảo sát chi tiết hình thái thai nhi.\n• Xét nghiệm tầm soát dị tật & kiểm tra sức khỏe của Mẹ.\n• Bác sĩ Trưởng khoa Sản {bac_si} trực tiếp thăm khám và tư vấn dinh dưỡng thai kỳ.\n\nPhòng khám có lưu sẵn file video và ảnh siêu âm 5D HD gửi về điện thoại cho Mẹ và gia đình.',
        buttonAction: 'Đặt Lịch Siêu Âm 5D Mẹ & Bé'
      }
    },
    keyNotes: ['Giọng văn ấm áp, tràn đầy niềm vui thai kỳ', 'Nhấn mạnh tầm quan trọng của mốc tuần thai vàng'],
    aiPromptGuidance: 'Tươi vui, ngọt ngào, chúc mừng mẹ và bé.'
  },
  {
    id: 'sc-18',
    category: 'recall_chronic',
    categoryLabel: '4. Tái khám & Bệnh mãn tính',
    code: 'REC-04',
    title: 'Nhắc Lịch Tiêm Chủng Mũi Nhắc Lại Cho Trẻ Sơ Sinh & Trẻ Nhỏ',
    situationSummary: 'Hệ thống tự động tính toán phác đồ tiêm chủng quốc gia và dịch vụ (6in1, Phế cầu, Rotavirus, Cúm, Sởi-Quai bị-Rubella) theo tháng tuổi của bé.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)', 'SMS Brandname'],
    primaryGoal: 'Đảm bảo trẻ được tiêm đúng lịch, vắc xin được giữ trước và khám sàng lọc kỹ trước tiêm.',
    timingRule: 'Trước ngày đến lịch tiêm 3 ngày.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Nhắc Lịch Tiêm Chủng Cho Bé {ten_be} ({thang_tuoi} tháng)',
        content: 'Kính gửi Ba/Mẹ bé {ten_be},\n\nTheo phác đồ tiêm chủng tại Trung tâm Tiêm chủng VitHospital, bé {ten_be} đã đến lịch tiêm mũi tiếp theo:\n💉 Vắc xin dự kiến: {ten_vac_xin} (Phòng bệnh {phong_benh})\n⏰ Thời gian đề xuất: Sáng {ngay_kham}\n\n100% vắc xin tại VitHospital được bảo quản theo chuẩn GSP quốc tế nghiêm ngặt. Bé sẽ được Bác sĩ Nhi khoa khám sàng lọc toàn diện miễn phí trước khi tiêm.',
        buttonAction: 'Giữ Vắc Xin & Đặt Hẹn Khám'
      }
    },
    keyNotes: ['Khẳng định vắc xin chuẩn GSP', 'Miễn phí khám sàng lọc trước tiêm cho bé'],
    aiPromptGuidance: 'Nhẹ nhàng, chu đáo với phụ huynh và an toàn cho trẻ nhỏ.'
  },

  // ==========================================
  // GIAI ĐOẠN 5: XỬ LÝ KHIẾU NẠI & KHỦNG HOẢNG (SLA & COMPLAINT)
  // ==========================================
  {
    id: 'sc-19',
    category: 'complaint_sla',
    categoryLabel: '5. Xử lý khiếu nại & Khủng hoảng',
    code: 'SLA-01',
    title: 'Xử Lý Phàn Nàn Bệnh Nhân Chờ Đợi Quá Lâu Tại Phòng Khám / Xét Nghiệm',
    situationSummary: 'Bệnh nhân bức xúc vì thời gian chờ đợi khám hoặc chờ lấy kết quả xét nghiệm lâu hơn dự kiến (giờ cao điểm).',
    recommendedChannels: ['Trực tiếp tại quầy', 'Tổng đài (Call)', 'Zalo OA Chat'],
    primaryGoal: 'Hạ nhiệt cảm xúc tiêu cực ngay lập tức, xin lỗi chân thành, phục vụ nước uống/bánh nhẹ và ưu tiên đẩy nhanh quy trình.',
    timingRule: 'Phản ứng trực tiếp trong 5 phút; Xử lý cuộc gọi/chat trong 15 phút (SLA Cấp 1).',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}! Em là {ten_nhan_vien} - Trưởng bộ phận Trải nghiệm Bệnh nhân VitHospital ạ.',
        body: 'Dạ trước hết, em xin được thay mặt Ban Giám Đốc và phòng khám gửi lời xin lỗi chân thành nhất tới Anh/Chị vì sự chờ đợi lâu bất tiện trong buổi sáng hôm nay. Do hôm nay phòng khám có tiếp nhận một số ca cấp cứu đột xuất nên tiến độ các phòng khám bị chậm hơn dự kiến.',
        objectionHandling: 'Biện pháp khắc phục ngay: "Em đã trực tiếp báo phòng xét nghiệm đẩy ưu tiên cao nhất kết quả của Anh/Chị. Em mời Anh/Chị qua khu vực Ghế nghỉ VIP dùng một tách trà nóng và bánh ngọt nhẹ trong lúc chờ đợi kết quả in ra trong 10 phút tới ạ."',
        closing: 'Dạ em cảm ơn Anh/Chị đã rất kiên nhẫn và lượng thứ cho sự việc ngày hôm nay ạ. Em xin phép gửi tặng Anh/Chị phiếu ưu tiên khám lần tới ạ!'
      }
    },
    keyNotes: ['Không bao giờ tranh cãi hay giải thích bao biện', 'Lắng nghe hết bức xúc của khách trước khi nói', 'Mời vào phòng riêng/khu VIP, phục vụ nước uống bánh ngọt'],
    aiPromptGuidance: 'Thấu cảm sâu sắc, hạ hỏa cơn giận, hành động khắc phục ngay lập tức.'
  },
  {
    id: 'sc-20',
    category: 'complaint_sla',
    categoryLabel: '5. Xử lý khiếu nại & Khủng hoảng',
    code: 'SLA-02',
    title: 'Xử Lý Thắc Mắc Viện Phí Cao / Chi Phí Phát Sinh Không Báo Trước',
    situationSummary: 'Bệnh nhân thắc mắc tại sao tổng hóa đơn cao hơn dự tính ban đầu hoặc có chỉ định xét nghiệm phát sinh trong lúc khám.',
    recommendedChannels: ['Trực tiếp tại quầy', 'Tổng đài (Call)'],
    primaryGoal: 'Minh bạch chi tiết từng khoản mục, giải thích lý do chỉ định y khoa của Bác sĩ và hỗ trợ chính sách thanh toán linh hoạt.',
    timingRule: 'SLA giải quyết trong vòng 30 phút.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_benh_nhan}, em rất hiểu cảm giác băn khoăn của Anh/Chị khi thấy chi phí phát sinh ngoài dự kiến ạ.',
        body: 'Dạ em xin phép cùng Anh/Chị rà soát lại từng hạng mục trên bảng kê chi tiết viện phí: Ban đầu mình đăng ký gói khám cơ bản 1.850.000đ. Tuy nhiên trong quá trình Bác sĩ thăm khám lâm sàng phát hiện dấu hiệu {dau_hieu_bat_thuong}, Bác sĩ đã chỉ định bổ sung thêm xét nghiệm {ten_xet_nghiem} trị giá 350.000đ để loại trừ nguy cơ viêm nhiễm cấp tính ạ.',
        objectionHandling: 'Nếu nhân viên quên giải thích trước: "Dạ việc nhân viên quầy chưa giải thích cặn kẽ trước khi in phiếu chỉ định là thiếu sót trong quy trình tiếp đón. Em xin chân thành nhận lỗi. Em xin phép áp dụng chiết khấu giảm 15% phần phí phát sinh này cho Anh/Chị để thể hiện sự cầu thị của phòng khám ạ."',
        closing: 'Dạ em cảm ơn Anh/Chị đã góp ý thẳng thắn để bên em chấn chỉnh lại quy trình phục vụ ngày một hoàn thiện hơn ạ!'
      }
    },
    keyNotes: ['Rà soát bảng kê chi tiết từng dòng', 'Giải thích mục đích bảo vệ sức khỏe của bác sĩ', 'Linh hoạt hỗ trợ chiết khấu nếu lỗi do nhân viên chưa giải thích trước'],
    aiPromptGuidance: 'Minh bạch số liệu, điềm đạm, cầu thị và tôn trọng khách hàng.'
  },
  {
    id: 'sc-21',
    category: 'complaint_sla',
    categoryLabel: '5. Xử lý khiếu nại & Khủng hoảng',
    code: 'SLA-03',
    title: 'Xử Lý Khiếu Nại Thái Độ Của Nhân Viên Tiếp Đón / Điều Dưỡng',
    situationSummary: 'Bệnh nhân phản ánh nhân viên lễ tân, điều dưỡng hoặc bảo vệ có thái độ thiếu nhã nhặn hoặc chưa nhiệt tình.',
    recommendedChannels: ['Tổng đài (Call)', 'Gặp trực tiếp'],
    primaryGoal: 'Bảo vệ danh dự phòng khám, nhận lỗi nghiêm túc, xử lý kỷ luật nội bộ và gửi thư xin lỗi chính thức.',
    timingRule: 'SLA phản hồi trong vòng 1 giờ, giải quyết dứt điểm trong 4 giờ.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em kính chào Quý khách {ten_benh_nhan}! Em là {ten_quan_ly} - Giám Đốc Dịch Vụ Khách Hàng Bệnh viện VitHospital ạ.',
        body: 'Em xin được gọi điện trực tiếp tới Anh/Chị để gửi lời xin lỗi sâu sắc nhất về trải nghiệm không hài lòng với nhân viên {ten_nhan_vien_vi_pham} tại quầy tiếp đón sáng nay. Tiêu chuẩn của VitHospital là luôn xem người bệnh như người thân, và hành vi thiếu kiên nhẫn của nhân viên hoàn toàn đi ngược lại giá trị cốt lõi của chúng em.',
        objectionHandling: 'Biện pháp kỷ luật & Khắc phục: "Ngay sau khi nhận phản ánh của Anh/Chị, Ban Giám Đốc đã trích xuất camera, đình chỉ công tác tại quầy của nhân viên và chuyển sang lớp đào tạo lại văn hóa ứng xử y tế. Chúng em vô cùng cảm ơn phản ánh quý báu của Anh/Chị đã giúp bệnh viện làm trong sạch đội ngũ phục vụ."',
        closing: 'Dạ thay mặt Bệnh viện, em xin phép gửi thư xin lỗi chính thức và kính mời Anh/Chị cùng gia đình đến trải nghiệm lại dịch vụ với sự chăm sóc trực tiếp từ em ạ.'
      }
    },
    keyNotes: ['Cấp quản lý trực tiếp gọi điện xin lỗi', 'Thông báo rõ biện pháp xử lý kỷ luật nhân viên', 'Gửi thư xin lỗi chính thức có chữ ký Ban Giám Đốc'],
    aiPromptGuidance: 'Nghiêm túc, tôn trọng, khẳng định chuẩn mực y đức không khoan nhượng.'
  },
  {
    id: 'sc-22',
    category: 'complaint_sla',
    categoryLabel: '5. Xử lý khiếu nại & Khủng hoảng',
    code: 'SLA-04',
    title: 'Khẩn Cấp: Tiếp Nhận Phản Ánh Phản Ứng Phụ / Nghi Ngờ Dị Ứng Thuốc Sau Khám',
    situationSummary: 'Bệnh nhân gọi hotline báo sau khi uống thuốc hoặc tiêm thuốc có biểu hiện phát ban ngứa, khó thở, chóng mặt, buồn nôn.',
    recommendedChannels: ['Tổng đài (Call)', 'Cấp cứu 24/7'],
    primaryGoal: 'Đảm bảo an toàn tính mạng người bệnh hàng đầu, nối máy Bác sĩ Trưởng khoa ngay lập tức và điều động xe cấp cứu nếu cần.',
    timingRule: 'SLA KHẨN CẤP: Phản ứng trong vòng 60 giây.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ VitHospital Cấp Cứu xin nghe! Anh/Chị {ten_benh_nhan} đang gặp tình trạng gì ạ?',
        body: 'Dạ Anh/Chị bình tĩnh giúp em: 1. Anh/Chị ngưng ngay liều thuốc vừa uống. 2. Hiện tại mình có bị cảm giác nghẹn thở, sưng môi/mắt hay tức ngực không ạ? Em đang chuyển máy khẩn cấp tới Bác sĩ Trực Cấp cứu {bac_si} đang cầm máy đây ạ!',
        objectionHandling: 'Nếu có dấu hiệu nặng: "Dạ Anh/Chị giữ nguyên vị trí, ngồi tựa lưng thoải mái, đội xe cấp cứu lưu động của VitHospital cùng Bác sĩ hồi sức đang xuất phát tới địa chỉ của Anh/Chị ngay lập tức ạ!"',
        closing: 'Bác sĩ {bac_si} sẽ trực tiếp hướng dẫn Anh/Chị từng bước qua điện thoại ngay bây giờ!'
      }
    },
    keyNotes: ['Ngưng ngay việc dùng thuốc', 'Đánh giá nhanh dấu hiệu sốc phản vệ (thở, môi, mạch)', 'Kết nối bác sĩ hồi sức cấp cứu ngay lập tức'],
    aiPromptGuidance: 'Bình tĩnh, quyết đoán, ưu tiên an toàn tính mạng người bệnh tuyệt đối.'
  },

  // ==========================================
  // GIAI ĐOẠN 6: TRI ÂN, HỘI VIÊN & VIP (LOYALTY)
  // ==========================================
  {
    id: 'sc-23',
    category: 'loyalty_vip',
    categoryLabel: '6. Tri ân & Hội viên VIP',
    code: 'LOY-01',
    title: 'Chúc Mừng Sinh Nhật Bệnh Nhân + Tặng Voucher Khám Sức Khỏe Gia Đình',
    situationSummary: 'Tự động gửi lời chúc mừng sinh nhật vào đúng ngày sinh của bệnh nhân kèm quà tặng tri ân thiết thực.',
    recommendedChannels: ['Zalo ZNS', 'SMS Brandname', 'Tổng đài (Call)'],
    primaryGoal: 'Gia tăng tình cảm gắn kết thương hiệu, kích hoạt nhu cầu chăm sóc sức khỏe gia đình.',
    timingRule: 'Tự động lúc 08:00 sáng ngày sinh nhật.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Chúc Mừng Sinh Nhật Quý Khách {ten_benh_nhan} 🎂',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nNhân ngày sinh nhật của Quý khách, toàn thể Ban Giám Đốc và Y Bác sĩ Bệnh viện VitHospital xin gửi lời chúc mừng chân thành nhất: Chúc Quý khách một tuổi mới luôn dồi dào sức khỏe, ngập tràn hạnh phúc và thành công viên mãn!\n\n🎁 MÓN QUÀ SỨC KHỎE TRI ÂN DÀNH TẶNG QUÝ KHÁCH:\n• 01 Voucher kiểm tra sức khỏe tổng quát trị giá 500.000đ.\n• 01 Suất Tầm Soát Loãng Xương / Siêu Âm Tuyến Giáp miễn phí cho người thân đi cùng.\n• Mã ưu đãi: HPBD-{ma_benh_nhan} (Có giá trị trong 30 ngày).',
        buttonAction: 'Nhận Quà & Đặt Lịch Ưu Tiên'
      }
    },
    keyNotes: ['Cá nhân hóa lời chúc mừng trang trọng', 'Mã voucher có hạn dùng 30 ngày để kích thích chuyển đổi'],
    aiPromptGuidance: 'Ấm áp, tràn đầy lời chúc tốt đẹp và tình cảm chân thành.'
  },
  {
    id: 'sc-24',
    category: 'loyalty_vip',
    categoryLabel: '6. Tri ân & Hội viên VIP',
    code: 'LOY-02',
    title: 'Thông Báo Nâng Hạng Thẻ Hội Viên VIP (Gold / Platinum / Diamond)',
    situationSummary: 'Bệnh nhân tích lũy đủ điểm chi tiêu hoặc số lượt khám, tự động nâng hạng thẻ thành viên kèm các đặc quyền cao cấp.',
    recommendedChannels: ['Zalo ZNS', 'Tổng đài (Call)'],
    primaryGoal: 'Tôn vinh khách hàng thân thiết, kích hoạt đặc quyền phòng chờ VIP và Bác sĩ riêng.',
    timingRule: 'Ngay khi hệ thống tự động thăng hạng thẻ.',
    scriptTemplate: {
      chatOrZnsTemplate: {
        title: 'Chúc Mừng Quý Khách Đã Trở Thành Hội Viên {hang_the} VitHospital',
        content: 'Kính gửi Quý khách {ten_benh_nhan},\n\nVitHospital xin trân trọng thông báo: Thẻ Hội Viên của Quý khách đã chính thức được nâng hạng lên {hang_the}!\n\n👑 ĐẶC QUYỀN VIP DÀNH RIÊNG CHO QUÝ KHÁCH:\n• Ưu tiên tiếp đón tại Sảnh VIP Lounge (Không cần xếp hàng).\n• Bác sĩ Trưởng khoa/Phó Giáo Sư trực tiếp thăm khám và theo dõi.\n• Giảm 15% tất cả dịch vụ cận lâm sàng và gói khám sức khỏe cho cả gia đình.\n• Hotline CSKH VIP chuyên trách 24/7: {hotline_vip}.',
        buttonAction: 'Xem Danh Sách Đặc Quyền VIP'
      }
    },
    keyNotes: ['Nhấn mạnh các đặc quyền thực tế (Phòng chờ riêng, Bác sĩ Trưởng khoa, Chiết khấu gia đình)'],
    aiPromptGuidance: 'Sang trọng, đẳng cấp, tôn vinh vị thế hội viên VIP.'
  },

  // ==========================================
  // GIAI ĐOẠN 7: KHÁCH HÀNG DOANH NGHIỆP B2B (CORPORATE)
  // ==========================================
  {
    id: 'sc-25',
    category: 'b2b_corporate',
    categoryLabel: '7. Khách hàng Doanh nghiệp B2B',
    code: 'B2B-01',
    title: 'Tư Vấn & Gửi Báo Giá Gói Khám Sức Khỏe Định Kỳ Doanh Nghiệp (Thông tư 14/BYT)',
    situationSummary: 'Đại diện phòng Nhân sự (HR) hoặc Công đoàn doanh nghiệp liên hệ tìm hiểu gói khám sức khỏe định kỳ cho hàng trăm cán bộ nhân viên.',
    recommendedChannels: ['Tổng đài (Call)', 'Zalo OA Chat', 'Email'],
    primaryGoal: 'Thiết kế gói khám linh hoạt theo ngân sách của doanh nghiệp, cam kết lấy mẫu tận nơi hoặc chia ca khám khoa học.',
    timingRule: 'Phản hồi và gửi bản chào đề xuất trong vòng 2 giờ.',
    scriptTemplate: {
      callScript: {
        greeting: 'Dạ em chào Anh/Chị {ten_hr} - Phòng Nhân sự Công ty {ten_cong_ty}! Em là {ten_nhan_vien} - Giám Đốc Khách Hàng Doanh Nghiệp VitHospital ạ.',
        body: 'Dạ em nhận được thông tin quý Công ty đang lên kế hoạch khám sức khỏe định kỳ năm 2026 cho khoảng {so_luong_nhan_su} cán bộ nhân viên. VitHospital có đội ngũ y bác sĩ lưu động và xe chụp X-quang kỹ thuật số hiện đại, có thể tổ chức lấy mẫu xét nghiệm tận trụ sở công ty hoặc tiếp đón theo luồng riêng tại bệnh viện để không ảnh hưởng đến giờ làm việc của nhân viên ạ.',
        objectionHandling: 'Nếu HR lo ngại chi phí: "Dạ thưa Anh/Chị, bên em có các gói khám linh hoạt từ cơ bản theo chuẩn Thông tư 14 Bộ Y Tế đến các gói nâng cao cho cấp Quản lý/Ban Lãnh đạo với mức chiết khấu doanh nghiệp lên tới 25% kèm quà tặng gói khám cho người thân CBNV ạ."',
        closing: 'Dạ em xin phép gửi bản báo giá chi tiết và hồ sơ năng lực qua Zalo/Email cho Anh/Chị ngay trong sáng nay nhé ạ!'
      }
    },
    keyNotes: ['Nhấn mạnh năng lực lưu động và trang thiết bị hiện đại', 'Cung cấp phương án chia ca khoa học không gián đoạn sản xuất kinh doanh'],
    aiPromptGuidance: 'Chuyên nghiệp, chuẩn mực doanh nghiệp B2B, tối ưu hóa lợi ích đôi bên.'
  }
];
