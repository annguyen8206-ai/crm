import type { Express } from 'express';
import { dbStore } from '../store';

/** CSV export (UTF-8 with BOM so Excel renders Vietnamese correctly). */
export function registerExportRoutes(app: Express): void {
  app.post('/api/export/csv', (req, res) => {
    try {
      const { type, data } = req.body;
      const BOM = String.fromCharCode(0xFEFF); // makes Excel read the file as UTF-8
      let filename = `VitHospital_Export_${type}_${Date.now()}.csv`;
      let csvContent = BOM;

      if (type === 'patients') {
        csvContent += "Mã BN,Họ Và Tên,Số Điện Thoại,Email,Giới Tính,Ngày Sinh,CMND/CCCD,Địa Chỉ,Nhóm Máu,Mức Nguy Cơ,Hạng Thẻ,Tổng Chi Tiêu (VNĐ)\n";
        (data || dbStore.patients).forEach((row: any) => {
          csvContent += `"${row.pid}","${row.name}","${row.phone}","${row.email||''}","${row.gender}","${row.dob}","${row.idCard||''}","${(row.address||'').replace(/"/g, '""')}","${row.bloodType||''}","${row.riskLevel}","${row.loyaltyTier}","${row.totalSpent}"\n`;
        });
      } else if (type === 'appointments') {
        csvContent += "Mã Khám,Số STT,Bệnh Nhân,Số Điện Thoại,Bác Sĩ,Chuyên Khoa,Chi Nhánh,Ngày Khám,Giờ Khám,Trạng Thái,Loại Khám,Kênh Đặt\n";
        (data || dbStore.appointments).forEach((row: any) => {
          csvContent += `"${row.id}","${row.queueNumber||''}","${row.patientName}","${row.patientPhone}","${row.doctorName}","${row.department}","${row.branchId}","${row.date}","${row.timeSlot}","${row.status}","${row.type}","${row.channel}"\n`;
        });
      } else if (type === 'tickets') {
        csvContent += "Mã Phiếu,Bệnh Nhân,Số Điện Thoại,Phân Loại Khiếu Nại,Mức Độ Ưu Tiên (SLA),Trạng Thái,Phòng Ban,Nhân Sự CSKH,Hạn SLA,Quá Hạn,Nội Dung\n";
        (data || dbStore.tickets).forEach((row: any) => {
          csvContent += `"${row.ticketCode}","${row.patientName}","${row.patientPhone}","${row.category}","${row.priority}","${row.status}","${row.department}","${row.assignedStaff}","${row.slaDeadline}","${row.isOverdue ? 'Có' : 'Không'}","${(row.description||'').replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'follow_ups') {
        csvContent += "Mã Ca,Bệnh Nhân,Số Điện Thoại,Ngày Khám,Chẩn Đoán Sau Khám,Ghi Chú Bác Sĩ Dặn Dò,Trạng Thái Gọi,Tiến Triển Triệu Chứng,Nhân Sự CSKH,Thời Gian Hẹn\n";
        (data || dbStore.followUps).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.visitDate}","${(row.primaryDiagnosis||'').replace(/"/g, '""')}","${(row.doctorCareNotes||'').replace(/"/g, '""')}","${row.callStatus}","${row.symptomProgression||''}","${row.assignedStaff}","${row.scheduledTime}"\n`;
        });
      } else if (type === 'recalls') {
        csvContent += "Mã Nhắc,Bệnh Nhân,Số Điện Thoại,Nhóm Bệnh,Chẩn Đoán,Lý Do Nhắc Tái Khám,Chu Kỳ (Ngày),Ngày Hạn,Quá Hạn (Ngày),Bác Sĩ Chỉ Định,Nhân Sự CSKH,Trạng Thái\n";
        (data || dbStore.recalls).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.conditionCategory}","${(row.primaryDiagnosis||'').replace(/"/g, '""')}","${(row.recallReason||'').replace(/"/g, '""')}","${row.recallIntervalDays}","${row.dueDate}","${row.daysOverdue}","${row.assignedDoctor}","${row.assignedStaff}","${row.status}"\n`;
        });
      } else if (type === 'csat_feedbacks') {
        csvContent += "Mã Đánh Giá,Bệnh Nhân,Ngày Khám,Bác Sĩ,Chuyên Khoa,Điểm Sao (1-5),Điểm NPS (0-10),Cảm Xúc,Nội Dung Đóng Góp\n";
        (data || dbStore.csatFeedbacks).forEach((row: any) => {
          csvContent += `"${row.id}","${row.patientName}","${row.visitDate}","${row.doctorName}","${row.department}","${row.rating}","${row.npsScore}","${row.sentiment}","${(row.comment||'').replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'invoices') {
        csvContent += "Mã Hóa Đơn,Bệnh Nhân,Số Điện Thoại,Chuyên Khoa,Tổng Tiền Gốc,Bảo Hiểm Trừ,Giảm Giá,Bệnh Nhân Trả,Trạng Thái,Phương Thức,Ngày Tạo\n";
        (data || dbStore.invoices).forEach((row: any) => {
          csvContent += `"${row.invoiceCode}","${row.patientName}","${row.patientPhone}","${row.department}","${row.subtotal}","${row.insuranceDeduction}","${row.discount}","${row.patientPayable}","${row.status}","${row.paymentMethod||''}","${row.createdAt}"\n`;
        });
      } else {
        csvContent += "ID,Data\n";
        (data || []).forEach((row: any) => {
          csvContent += `"${row.id}","${JSON.stringify(row).replace(/"/g, '""')}"\n`;
        });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi xuất file CSV", details: e.message });
    }
  });
}
