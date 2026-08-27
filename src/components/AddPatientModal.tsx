import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Heart,
  AlertCircle,
  Building2,
  Tag,
  X,
  Check,
  CreditCard,
  FileText
} from 'lucide-react';
import { Patient, Branch, BranchId, MembershipTier } from '../types';
import { formatDateVN } from '../utils/dateUtils';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  currentBranchId: BranchId;
  onSavePatient: (patient: Patient) => void;
}

const BLOOD_TYPES = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'Chưa xét nghiệm'];

const COMMON_ALLERGIES = [
  'Không ghi nhận dị ứng',
  'Dị ứng Kháng sinh nhóm Penicillin / Amoxicillin',
  'Dị ứng Thuốc giảm đau NSAIDs (Aspirin/Ibuprofen)',
  'Dị ứng Thuốc cản quang Iod',
  'Dị ứng Hải sản',
  'Dị ứng Đậu phộng / Trứng',
  'Dị ứng Phấn hoa / Bụi nhà'
];

const COMMON_CONDITIONS = [
  'Khám sức khỏe tổng quát định kỳ',
  'Tăng huyết áp vô căn',
  'Đái tháo đường Type 2',
  'Rối loạn chuyển hóa Lipid máu',
  'Viêm dạ dày - Trào ngược dạ dày thực quản (GERD)',
  'Thoái hóa cột sống / Thoát vị đĩa đệm',
  'Hen phế quản / COPD',
  'Bệnh Gout mạn tính',
  'Bệnh tuyến giáp',
  'Theo dõi thai kỳ'
];

const PRIVATE_INSURANCES = [
  'Không có',
  'Bảo Việt Healthcare VIP',
  'PVI Care Toàn Diện',
  'PTI Bảo hiểm Bưu Điện',
  'Insmart TPA Trực Tiếp',
  'Liberty Health Insurance',
  'Manulife Healthcare',
  'AIA Vitality',
  'Dai-ichi Life Care',
  'Bảo Minh Healthcare'
];

const PATIENT_SOURCES = [
  'Tiếp đón trực tiếp tại quầy Lễ tân',
  'Zalo Official Account (Zalo OA)',
  'Hotline Tổng Đài 1900',
  'Facebook Fanpage / Quảng cáo',
  'Website & Đặt lịch trực tuyến',
  'Bác sĩ chỉ định / Chuyển tuyến',
  'Hội viên cũ giới thiệu (Referral)',
  'Khám đoàn Doanh nghiệp (B2B)'
];

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  branches = [],
  currentBranchId = 'ALL',
  onSavePatient
}) => {
  if (!isOpen) return null;

  const initialBranch = currentBranchId !== 'ALL' ? currentBranchId : (branches[0]?.id || 'hn-central');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nữ');
  const [dob, setDob] = useState('1990-05-15');
  const [age, setAge] = useState<number>(36);
  const [citizenId, setCitizenId] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // Medical & Clinical
  const [bloodType, setBloodType] = useState('O+');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Không ghi nhận dị ứng']);
  const [customAllergy, setCustomAllergy] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>(['Khám sức khỏe tổng quát định kỳ']);
  const [customCondition, setCustomCondition] = useState('');
  const [initialNotes, setInitialNotes] = useState('');

  // Insurance & Membership
  const [hasBhyt, setHasBhyt] = useState(true);
  const [bhytNo, setBhytNo] = useState('');
  const [privateProvider, setPrivateProvider] = useState('Không có');
  const [policyNumber, setPolicyNumber] = useState('');
  const [tier, setTier] = useState<MembershipTier>('Standard');
  
  // Logistics
  const [primaryBranchId, setPrimaryBranchId] = useState<BranchId>(initialBranch);
  const [source, setSource] = useState(PATIENT_SOURCES[0]);
  const [tagsInput, setTagsInput] = useState('Khám Mới, Ngoại Trú');

  // Calculate age from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birthYear = new Date(val).getFullYear();
      const currentYear = new Date().getFullYear();
      if (birthYear > 1900 && birthYear <= currentYear) {
        setAge(currentYear - birthYear);
      }
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    setAge(num);
    if (num > 0 && num < 120) {
      const year = new Date().getFullYear() - num;
      setDob(`${year}-01-01`);
    }
  };

  const handleToggleAllergy = (allergy: string) => {
    if (allergy === 'Không ghi nhận dị ứng') {
      setSelectedAllergies(['Không ghi nhận dị ứng']);
      return;
    }
    const filtered = selectedAllergies.filter(a => a !== 'Không ghi nhận dị ứng');
    if (filtered.includes(allergy)) {
      const next = filtered.filter(a => a !== allergy);
      setSelectedAllergies(next.length ? next : ['Không ghi nhận dị ứng']);
    } else {
      setSelectedAllergies([...filtered, allergy]);
    }
  };

  const handleAddCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    const filtered = selectedAllergies.filter(a => a !== 'Không ghi nhận dị ứng');
    setSelectedAllergies([...filtered, customAllergy.trim()]);
    setCustomAllergy('');
  };

  const handleToggleCondition = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      const next = selectedConditions.filter(c => c !== condition);
      setSelectedConditions(next.length ? next : ['Khám sức khỏe tổng quát định kỳ']);
    } else {
      setSelectedConditions([...selectedConditions, condition]);
    }
  };

  const handleAddCustomCondition = () => {
    if (!customCondition.trim()) return;
    setSelectedConditions([...selectedConditions, customCondition.trim()]);
    setCustomCondition('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập Họ và tên bệnh nhân!');
      return;
    }
    if (!phone.trim()) {
      alert('Vui lòng nhập Số điện thoại liên hệ!');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newPatient: Patient = {
      id: `P-${Date.now()}`,
      pid: `BN-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gender,
      dob,
      age: Number(age) || 30,
      citizenId: citizenId.trim() || undefined,
      avatar: gender === 'Nữ'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      address: address.trim() || 'Hà Nội',
      bloodType,
      allergies: selectedAllergies,
      underlyingConditions: selectedConditions,
      membership: {
        tier,
        points: tier === 'Standard' ? 50 : 200,
        totalSpend: 0,
        memberSince: new Date().toISOString().substring(0, 10)
      },
      insurance: {
        hasBhyt,
        bhytNo: hasBhyt ? (bhytNo.trim() || `DN479${Math.floor(1000000000 + Math.random() * 9000000000)}`) : undefined,
        privateProvider: privateProvider !== 'Không có' ? privateProvider : undefined,
        policyNumber: policyNumber.trim() || undefined,
        hasGuarantee: privateProvider !== 'Không có'
      },
      source,
      primaryBranchId,
      tags: tags.length ? tags : ['Khám Mới'],
      createdAt: new Date().toISOString().substring(0, 10),
      lastVisitDate: new Date().toISOString().substring(0, 10),
      notes: initialNotes.trim() || undefined,
      totalVisits: 1
    };

    onSavePatient(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col text-slate-800 my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tạo Hồ Sơ Khách Hàng Mới (CRM 360°)</h3>
              <p className="text-xs text-slate-500">Lưu trữ thông tin định danh, thẻ hội viên, phân khúc và kênh tiếp cận phục vụ chăm sóc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* SECTION 1: Personal & Contact Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs text-blue-700">
                <User className="w-3.5 h-3.5" />
                1. Thông Tin Định Danh & Liên Lạc
              </h4>
              <span className="text-[10px] text-slate-500">(*) Các trường bắt buộc</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Họ và Tên Khách Hàng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Thị Lan Anh"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Số Điện Thoại Liên Hệ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912 345 678"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Giới Tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Nữ">Nữ</option>
                  <option value="Nam">Nam</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span>Ngày Sinh</span>
                  <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {formatDateVN(dob)} (Ngày/Tháng/Năm)
                  </span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={handleDobChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tuổi</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  value={age}
                  onChange={handleAgeChange}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số CCCD / Định Danh Cá Nhân</label>
                <input
                  type="text"
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value)}
                  placeholder="VD: 001190012345"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Email Liên Hệ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: lananh.nguyen@email.com (để nhận thông báo chăm sóc & thư cảm ơn)"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Địa Chỉ Thường Trú / Nơi Ở Hiện Tại</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: Số 45 Phố Lý Thường Kiệt, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Clinical & Medical History */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs text-blue-700">
              <Heart className="w-3.5 h-3.5" />
              2. Tiền Sử Y Khoa & Cảnh Báo Lâm Sàng
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nhóm Máu</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {BLOOD_TYPES.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Tiền Sử Dị Ứng (Thuốc / Thức Ăn / Hóa Chất)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_ALLERGIES.map((alg, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleToggleAllergy(alg)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                        selectedAllergies.includes(alg)
                          ? alg.includes('Không ghi nhận')
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : 'bg-rose-600 text-white border-rose-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {alg}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    placeholder="Nhập loại dị ứng khác nếu có..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAllergy}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">
                  Bệnh Nền Mãn Tính / Lý Do Đến Khám
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_CONDITIONS.map((cond, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleToggleCondition(cond)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                        selectedConditions.includes(cond)
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value)}
                    placeholder="Nhập bệnh nền / chẩn đoán khác..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCondition}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Tiếp Nhận Lâm Sàng Ban Đầu</label>
                <textarea
                  rows={2}
                  value={initialNotes}
                  onChange={(e) => setInitialNotes(e.target.value)}
                  placeholder="VD: Bệnh nhân đau tức ngực trái 2 ngày nay, có tiền sử tăng huyết áp 5 năm, yêu cầu khám PGS.TS chuyên khoa Tim Mạch..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Insurance & Loyalty */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs text-blue-700">
              <Shield className="w-3.5 h-3.5" />
              3. Chế Độ Bảo Hiểm & Phân Hạng Hội Viên
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Thẻ BHYT Toàn Dân</label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBhyt}
                      onChange={(e) => setHasBhyt(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-600 font-bold">Có BHYT</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={!hasBhyt}
                  value={bhytNo}
                  onChange={(e) => setBhytNo(e.target.value)}
                  placeholder="Mã số BHYT (15 ký tự)"
                  className="w-full px-3.5 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Bảo Hiểm Sức Khỏe Tư Nhân</label>
                <select
                  value={privateProvider}
                  onChange={(e) => setPrivateProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {PRIVATE_INSURANCES.map(ins => (
                    <option key={ins} value={ins}>{ins}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số Thẻ / Mã HĐ Bảo Hiểm Tư Nhân</label>
                <input
                  type="text"
                  disabled={privateProvider === 'Không có'}
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="VD: BV-88910248"
                  className="w-full px-3.5 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Hạng Thẻ Khách Hàng (Loyalty)</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Standard">Standard (Tiêu chuẩn)</option>
                  <option value="Silver">Silver (Hội viên Bạc)</option>
                  <option value="Gold">Gold (Hội viên Vàng)</option>
                  <option value="Platinum">Platinum (Hội viên Bạch Kim)</option>
                  <option value="Diamond VIP">Diamond VIP (Khách hàng VIP Đỉnh Cao)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cơ Sở / Chi Nhánh Tiếp Nhận</label>
                <select
                  value={primaryBranchId}
                  onChange={(e) => setPrimaryBranchId(e.target.value as BranchId)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nguồn Tiếp Cận (Lead Source)</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {PATIENT_SOURCES.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">Nhãn Phân Loại (Tags - Cách nhau bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="VD: VIP Diamond, Tái Khám Tim Mạch, Phụ Khoa, Bảo Lãnh Trực Tiếp"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Hồ Sơ Khách Hàng (CRM)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
