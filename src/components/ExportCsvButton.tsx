import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Check } from 'lucide-react';

interface ExportCsvButtonProps {
  type: 'follow_ups' | 'recalls' | 'csat' | 'zns_logs' | 'patients' | 'appointments';
  data: any[];
  filename?: string;
  label?: string;
  className?: string;
}

export const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({
  type,
  data,
  filename,
  label = 'Xuất Excel / CSV',
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Direct client-side generation + backend API fallback with UTF-8 BOM for Microsoft Excel
      let csvContent = '\uFEFF'; // UTF-8 BOM

      if (type === 'follow_ups') {
        csvContent += 'Mã Ca,Bệnh Nhân,Số Điện Thoại,Ngày Khám,Chẩn Đoán Sau Khám,Ghi Chú Bác Sĩ Dặn Dò,Trạng Thái Gọi,Tiến Triển Triệu Chứng,Nhân Sự CSKH,Thời Gian Hẹn\n';
        data.forEach(row => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.visitDate}","${(row.primaryDiagnosis || '').replace(/"/g, '""')}","${(row.doctorCareNotes || '').replace(/"/g, '""')}","${row.callStatus}","${row.symptomProgression || ''}","${row.assignedStaff}","${row.scheduledTime}"\n`;
        });
      } else if (type === 'recalls') {
        csvContent += 'Mã Nhắc,Bệnh Nhân,Số Điện Thoại,Nhóm Bệnh,Chẩn Đoán,Lý Do Nhắc Tái Khám,Chu Kỳ (Ngày),Ngày Hạn,Quá Hạn (Ngày),Bác Sĩ Chỉ Định,Nhân Sự CSKH,Trạng Thái\n';
        data.forEach(row => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.conditionCategory}","${(row.primaryDiagnosis || '').replace(/"/g, '""')}","${(row.recallReason || '').replace(/"/g, '""')}","${row.recallIntervalDays}","${row.dueDate}","${row.daysOverdue}","${row.assignedDoctor}","${row.assignedStaff}","${row.status}"\n`;
        });
      } else if (type === 'csat') {
        csvContent += 'Mã Đánh Giá,Bệnh Nhân,Ngày Khám,Bác Sĩ,Chuyên Khoa,Điểm Sao (1-5),Điểm NPS (0-10),Cảm Xúc,Nội Dung Đóng Góp\n';
        data.forEach(row => {
          csvContent += `"${row.id}","${row.patientName}","${row.visitDate}","${row.doctorName}","${row.department}","${row.rating}","${row.npsScore}","${row.sentiment}","${(row.comment || '').replace(/"/g, '""')}"\n`;
        });
      } else if (type === 'zns_logs') {
        csvContent += 'Mã Gửi ZNS,Bệnh Nhân,Số Điện Thoại,Loại Mẫu Tin,Tên Mẫu,Chẩn Đoán,Kênh,Trạng Thái,Thời Gian Gửi,Chi Phí (VNĐ)\n';
        data.forEach(row => {
          csvContent += `"${row.id}","${row.patientName}","${row.patientPhone}","${row.templateType}","${row.templateName}","${(row.diagnosis || '').replace(/"/g, '""')}","${row.channel}","${row.status}","${row.sentAt}","${row.cost}"\n`;
        });
      } else {
        csvContent += 'ID,Dữ Liệu\n';
        data.forEach(row => {
          csvContent += `"${row.id}","${JSON.stringify(row).replace(/"/g, '""')}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename || `VitHospital_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (error) {
      console.error('Export CSV error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${className}`}
      title="Tải tệp Excel / CSV chuẩn mã hóa tiếng Việt UTF-8"
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
      ) : isSuccess ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
      )}
      <span>{isSuccess ? 'Đã xuất file!' : label}</span>
    </button>
  );
};
