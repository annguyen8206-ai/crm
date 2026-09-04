import type { Express } from 'express';
import { getAi } from '../http-util';

/** Gemini-powered assistant suite. All endpoints 503 unless AI_ENABLED=true,
 *  and fall back to a deterministic canned response when no API key is set. */
export function registerAiRoutes(app: Express): void {
  // AI Clinical Triage
  app.post('/api/ai/triage', async (req, res) => {
    try {
      const { symptoms, patientAge, patientGender, medicalHistory } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          urgency: symptoms?.toLowerCase().includes("ngực") || symptoms?.toLowerCase().includes("khó thở") ? "Khẩn cấp" : "Tiêu chuẩn",
          suggestedDepartment: symptoms?.toLowerCase().includes("tim") || symptoms?.toLowerCase().includes("ngực") ? "Khoa Tim Mạch" :
            symptoms?.toLowerCase().includes("da") || symptoms?.toLowerCase().includes("mụn") || symptoms?.toLowerCase().includes("ngứa") ? "Viện Thẩm Mỹ & Da Liễu" :
            symptoms?.toLowerCase().includes("ho") || symptoms?.toLowerCase().includes("sốt") ? "Khoa Hô Hấp - Nội Tổng Quát" :
            symptoms?.toLowerCase().includes("răng") || symptoms?.toLowerCase().includes("nướu") ? "Khoa Răng Hàm Mặt" : "Khoa Khám Bệnh Đa Khoa",
          recommendedDoctor: "PGS. TS. BS Trần Minh Đức",
          preliminaryAdvice: "Khuyến nghị bệnh nhân đến phòng khám sớm để được thăm khám lâm sàng và làm các chỉ định cận lâm sàng phù hợp.",
          recommendedTests: ["Công thức máu toàn phần (CBC)", "Điện tâm đồ ECG (nếu có tức ngực)", "Đo huyết áp và chỉ số sinh tồn"],
          questionsToAsk: ["Triệu chứng xuất hiện bao lâu rồi?", "Cơn đau có lan ra sau lưng hay cánh tay không?", "Có tiền sử bệnh tim mạch hay dị ứng thuốc gì không?"]
        });
      }

      const prompt = `Bạn là Trợ lý Y tế AI chuyên nghiệp của hệ thống VitCRM (Việt Nam).
Hãy phân tích thông tin bệnh nhân sau đây để đưa ra phân luồng khám bệnh (Triage) và hỗ trợ nhân viên tiếp đón/CSKH:
- Triệu chứng: ${symptoms}
- Tuổi: ${patientAge || 'Không rõ'}
- Giới tính: ${patientGender || 'Không rõ'}
- Tiền sử bệnh: ${medicalHistory || 'Chưa ghi nhận'}

TrẢ VỀ JSON thuần túy (không markdown bao quanh):
{
  "urgency": "Khẩn cấp" | "Ưu tiên" | "Tiêu chuẩn",
  "suggestedDepartment": "Tên chuyên khoa phù hợp",
  "recommendedDoctor": "Gợi ý bác sĩ chuyên khoa phụ trách",
  "preliminaryAdvice": "Lời khuyên sơ bộ và lưu ý an toàn cho bệnh nhân",
  "recommendedTests": ["Xét nghiệm/Cận lâm sàng đề xuất 1", "Xét nghiệm/Cận lâm sàng đề xuất 2"],
  "questionsToAsk": ["Câu hỏi CSKH nên hỏi thêm 1", "Câu hỏi CSKH nên hỏi thêm 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.2 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Triage Error:", err);
      res.status(500).json({ error: "Không thể xử lý yêu cầu phân luồng AI", details: err.message });
    }
  });

  // AI Patient 360 Summarizer
  app.post('/api/ai/summarize-patient', async (req, res) => {
    try {
      const { patientData } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          summary: `Khách hàng ${patientData?.name || 'Nguyễn Thị Bích Thủy'} (${patientData?.age || '47'} tuổi) là Hội viên VIP Gold, có tiền sử Tăng huyết áp và Đái tháo đường Type 2. Đã hoàn thành đợt tái khám định kỳ gần nhất, phản hồi tích cực về dịch vụ tiếp đón và đang tuân thủ phác đồ chăm sóc tại nhà.`,
          keyAlerts: ["Cần theo dõi sát lịch tái khám sau 30 ngày", "Nhắc nhân viên CSKH liên hệ hỏi thăm chỉ số huyết áp tại nhà"],
          actionPlan: ["Tư vấn khách hàng đặt lịch tái khám định kỳ vào tuần tới", "Gửi tin nhắn ZNS chăm sóc khách hàng và nhắc đo huyết áp 2 lần/ngày"]
        });
      }

      const prompt = `Bạn là Trợ lý AI Bác sĩ của VitCRM. Hãy tóm tắt góc nhìn 360 độ hồ sơ bệnh nhân sau đây để bác sĩ/nhân viên CSKH nắm bắt trong 15 giây:
Dữ liệu bệnh nhân: ${JSON.stringify(patientData)}

Trả về JSON thuần túy:
{
  "summary": "Tóm tắt lâm sàng súc tích, chuyên nghiệp",
  "keyAlerts": ["Cảnh báo 1", "Cảnh báo 2"],
  "actionPlan": ["Hành động đề xuất 1", "Hành động đề xuất 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.3 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Patient Summary Error:", err);
      res.status(500).json({ error: "Lỗi tóm tắt hồ sơ", details: err.message });
    }
  });

  // AI Campaign Copy Generator
  app.post('/api/ai/generate-campaign-content', async (req, res) => {
    try {
      const { segmentName, targetCondition, channel, tone } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          title: `Chăm sóc sức khỏe định kỳ chuyên khoa - VitHospital Healthcare`,
          message: `Kính gửi Quý khách, Hệ thống Bệnh viện VitHospital trân trọng gửi lời chúc sức khỏe. Đã đến lịch kiểm tra sức khỏe định kỳ cho tình trạng ${targetCondition || 'sức khỏe tổng quát'}. Kính mời Quý khách đặt lịch khám để được bác sĩ chuyên khoa tư vấn trực tiếp và nhận ưu đãi 15% gói xét nghiệm. Hotline: 1900 6868.`,
          suggestedSendTime: "08:30 sáng Thứ 3 hoặc Thứ 5",
          estimatedConversionRate: "18.5%"
        });
      }

      const prompt = `Bạn là chuyên gia Marketing Y tế & CSKH của hệ thống VitCRM. Hãy tạo nội dung thông điệp gửi tự động cho chiến dịch:
- Nhóm phân khúc: ${segmentName}
- Tình trạng/Bệnh lý mục tiêu: ${targetCondition}
- Kênh gửi: ${channel} (Zalo ZNS / SMS / Email)
- Giọng văn: ${tone || 'Ân cần, chuẩn mực y khoa, tạo sự tin cậy'}

Trả về JSON thuần túy:
{
  "title": "Tiêu đề thông điệp",
  "message": "Nội dung tin nhắn chuẩn định dạng kênh gửi, đầy đủ lời chào và CTA",
  "suggestedSendTime": "Khung giờ vàng gửi tin",
  "estimatedConversionRate": "Ước lượng tỷ lệ phản hồi dự kiến"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.4 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Campaign Error:", err);
      res.status(500).json({ error: "Lỗi tạo nội dung chiến dịch", details: err.message });
    }
  });

  // AI Empathy Care & Complaint Resolution Assistant
  app.post('/api/ai/generate-care-response', async (req, res) => {
    try {
      const { complaintText, category, patientName, department, priority } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        return res.json({
          empatheticOpening: `Kính gửi Quý khách ${patientName || 'Nguyễn Văn A'}, Ban Giám đốc và Phòng Chăm Sóc Khách Hàng VitHospital đã nhận được phản ánh của Quý khách về sự việc "${category}". Chúng tôi chân thành xin lỗi vì trải nghiệm chưa trọn vẹn này.`,
          explanation: `Ngay sau khi tiếp nhận thông tin, Trưởng phòng CSKH đã phối hợp trực tiếp với đại diện ${department || 'Khoa Khám Bệnh'} để rà soát lại toàn bộ quy trình tiếp đón và phục vụ.`,
          actionTaken: `Hệ thống đã điều chỉnh quy trình luân chuyển hồ sơ để loại bỏ thời gian chờ quá tải, đồng thời nhắc nhở toàn bộ ekip ca trực nâng cao tinh thần phụng sự y đức.`,
          proposedResolution: `VitHospital xin phép gửi tặng Quý khách một Voucher Khám Chuyên Khoa/Chăm sóc phục hồi trị giá 500,000đ và ưu tiên phân luồng phòng khám VIP không chờ đợi trong tất cả các lần thăm khám tiếp theo.`,
          fullLetterDraft: `Kính gửi Quý khách ${patientName || 'Nguyễn Văn A'},\n\nBan Giám đốc và Phòng Chăm Sóc Khách Hàng VitHospital trân trọng cảm ơn Quý khách đã đóng góp ý kiến quý báu. Chúng tôi chân thành gửi lời xin lỗi sâu sắc về sự bất tiện mà Quý khách đã gặp phải tại ${department || 'Phòng khám'}.\n\nSau khi rà soát, chúng tôi đã tiến hành chấn chỉnh quy trình và xử lý dứt điểm nguyên nhân gây trễ. Để tri ân sự thông cảm của Quý khách, VitHospital trân trọng gửi tặng Quý khách Voucher ưu đãi y tế và mã định danh Chăm sóc Ưu tiên VIP.\n\nKính chúc Quý khách và gia đình luôn dồi dào sức khỏe!\nTrân trọng,\nPhòng Chăm Sóc Khách Hàng & Trải Nghiệm Bệnh Nhân - VitHospital Healthcare.`
        });
      }

      const prompt = `Bạn là Trưởng Phòng Chăm Sóc Khách Hàng & Trải Nghiệm Bệnh Nhân cao cấp của hệ thống Y tế VitHospital (Việt Nam).
Hãy soạn một phản hồi chuyên nghiệp, ân cần, thấu cảm y khoa (Medical Empathy) và đề xuất giải pháp xử lý thỏa đáng cho khiếu nại của bệnh nhân sau:
- Tên bệnh nhân: ${patientName}
- Phân loại khiếu nại: ${category}
- Mức độ ưu tiên/SLA: ${priority}
- Phòng ban liên quan: ${department}
- Nội dung phản ánh của bệnh nhân: "${complaintText}"

Nguyên tắc phản hồi:
1. Lắng nghe và thấu cảm sâu sắc, không đổ lỗi cho bệnh nhân.
2. Thể hiện tinh thần cầu thị và minh bạch quy trình y tế.
3. Đưa ra giải pháp khắc phục cụ thể và chính sách hỗ trợ/bảo đảm quyền lợi.

Trả về JSON thuần túy:
{
  "empatheticOpening": "Lời chào và mở đầu thấu cảm, xoa dịu cảm xúc",
  "explanation": "Giải thích nguyên nhân một cách cầu thị, chuẩn mực",
  "actionTaken": "Các biện pháp khắc phục nội bộ đã triển khai ngay",
  "proposedResolution": "Giải pháp giải quyết và chính sách hỗ trợ bệnh nhân",
  "fullLetterDraft": "Toàn văn thư/tin nhắn phản hồi hoàn chỉnh, trang trọng, ấm áp để gửi cho bệnh nhân"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.3 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Empathy Care Error:", err);
      res.status(500).json({ error: "Lỗi tạo phản hồi CSKH AI", details: err.message });
    }
  });

  // AI Omnichannel Chatbot FAQ & Auto-Ticket Escalation
  app.post('/api/ai/chatbot-faq-reply', async (req, res) => {
    try {
      const { message, channel, patientName, patientPhone } = req.body;
      if (process.env.AI_ENABLED !== 'true') return res.status(503).json({ error: 'AI services are disabled by policy' });
      const ai = getAi();

      if (!ai) {
        const msgLower = (message || '').toLowerCase();
        let shouldEscalate = false;
        let reply = "Dạ chào Quý khách! VitHospital có thể hỗ trợ Quý khách đặt lịch khám, hướng dẫn chuẩn bị xét nghiệm, tra cứu viện phí và bảo lãnh bảo hiểm ạ.";
        let category: any = "Góp ý dịch vụ";
        let priority: any = "Trung bình (SLA 8h)";

        if (msgLower.includes("giá") || msgLower.includes("chi phí") || msgLower.includes("bao nhiêu tiền")) {
          reply = "Dạ, chi phí khám lâm sàng chuyên khoa tại VitHospital là 350.000đ - 500.000đ (Bác sĩ Trưởng khoa). Gói Tầm soát sức khỏe Tổng quát từ 2.800.000đ. Quý khách có muốn đặt lịch hẹn ngay không ạ?";
        } else if (msgLower.includes("bảo hiểm") || msgLower.includes("bảo lãnh") || msgLower.includes("bhyt")) {
          reply = "Dạ, VitHospital liên kết bảo lãnh viện phí trực tiếp với hơn 25 công ty bảo hiểm tư nhân (Bảo Việt, PVI, PTI, Liberty, Insmart...) và tiếp nhận BHYT đúng tuyến/thông tuyến. Quý khách chỉ cần mang theo CCCD và Thẻ bảo hiểm cứng hoặc VssID ạ.";
        } else if (msgLower.includes("nhịn ăn") || msgLower.includes("xét nghiệm") || msgLower.includes("chuẩn bị")) {
          reply = "Dạ, đối với xét nghiệm máu (đường huyết, mỡ máu) và siêu âm bụng tổng quát, Quý khách vui lòng nhịn ăn sáng từ 6 - 8 tiếng, có thể uống một ít nước lọc tinh khiết ạ.";
        } else if (msgLower.includes("khiếu nại") || msgLower.includes("thái độ") || msgLower.includes("bực") || msgLower.includes("gặp nhân viên") || msgLower.includes("người thật") || msgLower.includes("chưa hài lòng")) {
          shouldEscalate = true;
          category = msgLower.includes("thái độ") ? "Khiếu nại thái độ" : "Tư vấn kết quả chuyên môn";
          priority = "Cao (SLA 2h)";
          reply = `Dạ em đã hiểu vấn đề của Quý khách. Em đã chuyển tiếp yêu cầu và tự động tạo Phiếu Tiếp Nhận Khẩn Cấp gửi đến Đội ngũ Chăm Sóc Khách Hàng & Điều Dưỡng Trưởng. Nhân sự phụ trách sẽ gọi điện trực tiếp đến số điện thoại của Quý khách trong vòng 15 - 30 phút để hỗ trợ giải quyết dứt điểm ạ.`;
        }

        return res.json({
          reply,
          shouldEscalate,
          ticketData: shouldEscalate ? {
            category,
            priority,
            department: "Phòng CSKH & Trải Nghiệm Bệnh Nhân",
            reason: `Bệnh nhân cần hỗ trợ trực tiếp qua kênh ${channel || 'Zalo OA'}: "${message}"`
          } : null
        });
      }

      const prompt = `Bạn là Trợ Lý Chatbot Y Tế Thông Minh Đa Kênh của Hệ Thống Bệnh Viện & Phòng Khám Quốc Tế VitHospital (hoạt động trên ${channel || 'Zalo OA / Messenger'}).
Dưới đây là câu hỏi từ bệnh nhân:
- Tên khách/bệnh nhân: ${patientName || 'Khách hàng'}
- Tin nhắn gửi đến: "${message}"

Nhiệm vụ của bạn:
1. Trả lời ngắn gọn, lịch sự, ân cần, chuẩn mực y khoa, chuẩn ngôn ngữ chat tiếng Việt.
2. Cung cấp thông tin chuẩn xác về dịch vụ khám, giờ mở cửa (7:30 - 20:00 hàng ngày), bảo lãnh viện phí, chuẩn bị xét nghiệm.
3. QUAN TRỌNG: Phát hiện các trường hợp CẦN TỰ ĐỘNG TẠO TICKET CHĂM SÓC KHÁCH HÀNG (shouldEscalate = true) khi bệnh nhân khiếu nại, bức xúc, cần gặp bác sĩ/người thật.

Trả về JSON thuần túy:
{
  "reply": "Nội dung tin nhắn chatbot phản hồi lại bệnh nhân",
  "shouldEscalate": boolean,
  "ticketData": {
    "category": "Khiếu nại thái độ" | "Thắc mắc viện phí & bảo lãnh" | "Tư vấn kết quả chuyên môn" | "Thời gian chờ đợi" | "Hỗ trợ thủ tục BHYT" | "Góp ý dịch vụ",
    "priority": "Khẩn cấp (SLA 30p)" | "Cao (SLA 2h)" | "Trung bình (SLA 8h)",
    "department": "Khoa / Phòng ban phụ trách",
    "reason": "Tóm tắt lý do tạo ticket cho nhân viên CSKH"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.2 }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("AI Chatbot FAQ Error:", err);
      res.status(500).json({ error: "Lỗi chatbot FAQ", details: err.message });
    }
  });
}
