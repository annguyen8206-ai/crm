import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  Plus,
  Building2,
  User,
  ArrowRight,
  X,
  FileText,
  CreditCard
} from 'lucide-react';
import { InsuranceClaim, Patient } from '../types';
import { formatDateVN } from '../utils/dateUtils';

interface InsuranceClaimsViewProps {
  claims: InsuranceClaim[];
  patients: Patient[];
  onUpdateClaimStatus: (claimId: string, status: InsuranceClaim['status']) => void;
  onAddNewClaim?: (claim: Omit<InsuranceClaim, 'id'>) => void;
  onSelectPatient: (patientId: string) => void;
}

export const InsuranceClaimsView: React.FC<InsuranceClaimsViewProps> = ({
  claims = [],
  patients = [],
  onUpdateClaimStatus,
  onAddNewClaim,
  onSelectPatient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);

  // New Claim Form state
  const [selectedPatId, setSelectedPatId] = useState(patients[0]?.id || '');
  const [provider, setProvider] = useState('Bảo Việt Healthcare');
  const [cardNumber, setCardNumber] = useState('BV-992019482');
  const [serviceType, setServiceType] = useState('Khám Chuyên Khoa & Nội Soi Tiêu Hóa');
  const [diagnosis, setDiagnosis] = useState('K29.0 - Viêm dạ dày xuất huyết cấp tính');
  const [requestedAmount, setRequestedAmount] = useState<number>(3850000);
  const [coPayPercent, setCoPayPercent] = useState<number>(10);

  const totalRequested = (claims || []).reduce((acc, c) => acc + (c?.requestedAmount || 0), 0);
  const totalApproved = (claims || []).reduce((acc, c) => acc + (c?.approvedAmount || 0), 0);
  const totalCoPay = (claims || []).reduce((acc, c) => acc + (c?.patientCoPay || 0), 0);

  const filteredClaims = (claims || []).filter(c => {
    if (!c) return false;
    const matchesSearch = (c.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.cardNumber || '').includes(searchTerm);
    const matchesProv = selectedProvider === 'ALL' || c.provider.includes(selectedProvider);
    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
    return matchesSearch && matchesProv && matchesStatus;
  });

  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === selectedPatId) || patients[0];
    const approved = Math.round(requestedAmount * (1 - coPayPercent / 100));
    const copay = requestedAmount - approved;

    if (onAddNewClaim) {
      onAddNewClaim({
        code: `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: pat?.id || 'P-01',
        patientName: pat?.name || 'Bệnh Nhân',
        patientPhone: pat?.phone || '0901234567',
        provider,
        cardNumber,
        serviceType,
        requestedAmount,
        approvedAmount: approved,
        patientCoPay: copay,
        status: 'Đang thẩm định',
        submittedDate: new Date().toISOString().substring(0, 10),
        diagnosis
      });
    }
    setIsNewClaimModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Bảo Hiểm Y Tế & Bảo Lãnh Viện Phí
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Direct Billing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kết nối hơn 25 đơn vị bảo hiểm tư nhân và BHYT, thẩm định trực tuyến trong 15 phút
          </p>
        </div>

        <button
          onClick={() => setIsNewClaimModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo Bảo Lãnh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-slate-500 text-xs font-bold">Tổng Đề Nghị Bảo Lãnh</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {(totalRequested / 1e6).toLocaleString()} tr đ
          </div>
          <span className="text-slate-500 text-[11px] mt-1 block">{claims.length} Hồ sơ bảo lãnh</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-slate-500 text-xs font-bold">Bảo Hiểm Đã Chấp Thuận</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {(totalApproved / 1e6).toLocaleString()} tr đ
          </div>
          <span className="text-emerald-700 text-[11px] font-bold mt-1 block">
            {((totalApproved / (totalRequested || 1)) * 100).toFixed(1)}% Tỷ lệ duyệt thành công
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-slate-500 text-xs font-bold">Bệnh Nhân Đồng Chi Trả (Co-pay)</span>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
            {(totalCoPay / 1e6).toLocaleString()} tr đ
          </div>
          <span className="text-slate-500 text-[11px] mt-1 block">Khấu trừ theo hợp đồng bảo hiểm</span>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên bệnh nhân, mã claim, số thẻ..."
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-full text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả Đơn vị Bảo hiểm</option>
                <option value="Bảo Việt">Bảo Việt Healthcare</option>
                <option value="PVI">PVI Care</option>
                <option value="Liberty">Liberty Insurance</option>
                <option value="Insmart">Insmart TPA</option>
                <option value="PTI">PTI Bưu Điện</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="Đang thẩm định">Đang thẩm định</option>
                <option value="Đã phê duyệt bảo lãnh">Đã phê duyệt bảo lãnh</option>
                <option value="Từ chối bảo lãnh">Từ chối bảo lãnh</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Mã Claim & Bệnh Nhân</th>
                <th className="py-3.5 px-4">Hãng Bảo Hiểm & Số Thẻ</th>
                <th className="py-3.5 px-4">Chẩn Đoán / Dịch Vụ</th>
                <th className="py-3.5 px-4">Đề Nghị Bảo Lãnh</th>
                <th className="py-3.5 px-4">Được Duyệt & Co-Pay</th>
                <th className="py-3.5 px-4">Trạng Thái Thẩm Định</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy hồ sơ bảo lãnh phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Code & Patient */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-700 font-bold block">{claim.code}</span>
                        {claim.submittedDate && (
                          <span className="text-[10px] text-slate-400 font-medium">({formatDateVN(claim.submittedDate)})</span>
                        )}
                      </div>
                      <span
                        onClick={() => onSelectPatient(claim.patientId)}
                        className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer block mt-0.5"
                      >
                        {claim.patientName}
                      </span>
                      <span className="text-slate-500 text-[10px]">{claim.patientPhone}</span>
                    </td>

                    {/* Provider & Card */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{claim.provider}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{claim.cardNumber}</span>
                    </td>

                    {/* Diagnosis & Service */}
                    <td className="py-3.5 px-4">
                      <span className="text-blue-700 font-bold block">{claim.serviceType}</span>
                      <span className="text-slate-500 text-[11px] truncate block max-w-[200px] mt-0.5" title={claim.diagnosis}>
                        {claim.diagnosis}
                      </span>
                    </td>

                    {/* Requested Amount */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {claim.requestedAmount.toLocaleString()} đ
                    </td>

                    {/* Approved & Co-pay */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700 font-mono block">
                        {claim.approvedAmount.toLocaleString()} đ
                      </span>
                      {claim.patientCoPay > 0 && (
                        <span className="text-amber-600 font-semibold text-[10px] block">
                          Đồng chi trả: {claim.patientCoPay.toLocaleString()} đ
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        claim.status === 'Đã phê duyệt bảo lãnh' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        claim.status === 'Đang thẩm định' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {claim.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {claim.status === 'Đang thẩm định' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onUpdateClaimStatus(claim.id, 'Đã phê duyệt bảo lãnh')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => onUpdateClaimStatus(claim.id, 'Từ chối bảo lãnh')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">Đã hoàn tất</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Claim Modal */}
      {isNewClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tạo Hồ Sơ Yêu Cầu Bảo Lãnh Viện Phí</h3>
              </div>
              <button
                onClick={() => setIsNewClaimModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn Bệnh Nhân</label>
                <select
                  value={selectedPatId}
                  onChange={(e) => setSelectedPatId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - SĐT: {p.phone} ({p.insurance?.privateProvider || 'Chưa có thẻ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Công Ty Bảo Hiểm</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Bảo Việt Healthcare">Bảo Việt Healthcare</option>
                    <option value="PVI Care">PVI Care</option>
                    <option value="Liberty Insurance">Liberty Insurance</option>
                    <option value="Insmart TPA">Insmart TPA</option>
                    <option value="PTI Bưu Điện">PTI Bưu Điện</option>
                    <option value="BHYT Nhà Nước">BHYT Nhà Nước</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Thẻ / Mã Hợp Đồng</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: BV-992019482"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dịch Vụ Khám / Điều Trị</label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  placeholder="VD: Khám Chuyên Khoa & Nội Soi Tiêu Hóa"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chẩn Đoán Lâm Sàng & Mã ICD</label>
                <input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  placeholder="VD: K29.0 - Viêm dạ dày xuất huyết cấp"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chi Phí Đề Nghị Bảo Lãnh (VNĐ)</label>
                  <input
                    type="number"
                    min={100000}
                    step={50000}
                    required
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đồng Chi Trả Co-Pay (%)</label>
                  <select
                    value={coPayPercent}
                    onChange={(e) => setCoPayPercent(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value={0}>0% (Bảo hiểm chi trả 100%)</option>
                    <option value={10}>10% (Bệnh nhân trả 10%)</option>
                    <option value={20}>20% (Bệnh nhân trả 20%)</option>
                    <option value={30}>30% (Bệnh nhân trả 30%)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 space-y-1">
                <div className="flex justify-between">
                  <span>Ước tính bảo hiểm duyệt:</span>
                  <strong className="font-mono font-bold">{Math.round(requestedAmount * (1 - coPayPercent / 100)).toLocaleString()} đ</strong>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Bệnh nhân đóng tại quầy:</span>
                  <strong className="font-mono font-bold">{Math.round(requestedAmount * (coPayPercent / 100)).toLocaleString()} đ</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClaimModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Gửi Thẩm Định Trực Tuyến
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

