import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { ZnsCareMessageLog } from '../types';
import { mockZnsLogs } from '../data/mockData';
import { ExportCsvButton } from './ExportCsvButton';

export const ZnsMessageLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<ZnsCareMessageLog[]>(mockZnsLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [templateFilter, setTemplateFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/zns/logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.warn('Fetch ZNS logs error fallback to state', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.patientPhone.includes(searchTerm) ||
                          (log.diagnosis && log.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          log.trackingCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = channelFilter === 'ALL' || log.channel === channelFilter;
    const matchesTemplate = templateFilter === 'ALL' || log.templateType === templateFilter;
    return matchesSearch && matchesChannel && matchesTemplate;
  });

  const totalSent = logs.length;
  const totalSuccess = logs.filter(l => l.status.includes('thành công')).length;
  const totalCost = logs.reduce((acc, l) => acc + (l.cost || 320), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              Zalo ZNS & SMS Brandname Log Engine
            </span>
            <span className="text-xs text-slate-500 font-medium">Báo cáo truyền thông tự động theo thời gian thực</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Nhật Ký Phát Tin Nhắn Zalo ZNS & Dặn Dò Sau Khám
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch sử toàn bộ tin nhắn dặn dò hậu khám, nhắc tái khám tự động gửi qua Zalo Official Account có tích xanh doanh nghiệp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportCsvButton
            type="zns_logs"
            data={filteredLogs}
            filename={`VitHospital_ZNS_Logs_${new Date().toISOString().slice(0, 10)}.csv`}
            label="Xuất Báo Cáo ZNS (Excel)"
          />
          <button
            onClick={fetchLogs}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Tổng Lượt Tin Đã Phát</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalSent} tin</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Bao gồm ZNS, SMS Brand và Viber</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Tỷ Lệ Giao Thành Công</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {((totalSuccess / (totalSent || 1)) * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-emerald-700 font-bold mt-0.5 block">100% đến đúng số điện thoại đăng ký</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Tổng Chi Phí ZNS (VNĐ)</span>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">
            {totalCost.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Đơn giá ưu đãi y tế 320đ/tin</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên BN, SĐT, mã tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả Kênh Gửi</option>
            <option value="Zalo ZNS">Zalo ZNS (OA)</option>
            <option value="SMS Brandname">SMS Brandname</option>
            <option value="Viber Business">Viber Business</option>
          </select>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả Mẫu Tin</option>
            <option value="ZNS_POST_VISIT_CARE">ZNS Dặn Dò Sau Khám</option>
            <option value="ZNS_AUTO_RECALL">ZNS Nhắc Lịch Tái Khám</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3.5 px-4">Mã Vận Đơn & Thời Gian</th>
                <th className="py-3.5 px-4">Bệnh Nhân & Điện Thoại</th>
                <th className="py-3.5 px-4">Mẫu Tin & Kênh</th>
                <th className="py-3.5 px-4">Nội Dung Dặn Dò Lâm Sàng</th>
                <th className="py-3.5 px-4">Trạng Thái Giao</th>
                <th className="py-3.5 px-4 text-right">Chi Phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 align-top font-mono">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] block w-fit">
                      {log.trackingCode}
                    </span>
                    <span className="text-slate-400 text-[10px] block mt-1">
                      {log.sentAt}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 align-top">
                    <strong className="text-slate-900 block text-sm">{log.patientName}</strong>
                    <span className="font-mono text-slate-500 text-[11px] block mt-0.5">{log.patientPhone}</span>
                  </td>

                  <td className="py-3.5 px-4 align-top">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200 inline-block mb-1">
                      {log.templateName}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                      <Smartphone className="w-3 h-3 text-blue-600" />
                      <span>{log.channel}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-[280px]">
                    {log.diagnosis && (
                      <span className="font-bold text-slate-800 block text-xs mb-0.5">
                        {log.diagnosis}
                      </span>
                    )}
                    <p className="text-slate-600 text-[11px] leading-relaxed italic bg-slate-50 p-2 rounded-xl border border-slate-200">
                      "{log.doctorCareNotes}"
                    </p>
                  </td>

                  <td className="py-3.5 px-4 align-top">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{log.status}</span>
                    </span>
                    {log.deliveredAt && (
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        Đã nhận: {log.deliveredAt}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right align-top font-mono font-bold text-slate-900">
                    {log.cost} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
