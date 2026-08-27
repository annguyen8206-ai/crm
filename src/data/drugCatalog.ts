export interface DrugCatalogItem {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  unit: string;
  route: string; // Đường dùng: Uống, Tiêm, Bôi, Xịt,...
  category: string; // Nhóm thuốc: Kháng sinh, Tim mạch, Dạ dày, Giảm đau, Kháng viêm, Tiểu đường, Cơ xương khớp,...
  defaultFrequency: string;
  defaultInstructions: string;
  defaultQuantity: number;
  warnings?: string;
}

export const COMMON_DRUG_CATALOG: DrugCatalogItem[] = [
  // Tim Mạch & Huyết Áp
  {
    id: 'drug-1',
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine besylate',
    dosage: '5mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Tim Mạch - Huyết Áp',
    defaultFrequency: 'Ngày 1 lần (uống vào buổi sáng)',
    defaultInstructions: 'Uống 1 viên vào mỗi buổi sáng sau khi ăn',
    defaultQuantity: 30,
    warnings: 'Theo dõi huyết áp hàng ngày, cảnh báo phù chân'
  },
  {
    id: 'drug-2',
    name: 'Losartan 50mg',
    genericName: 'Losartan potassium',
    dosage: '50mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Tim Mạch - Huyết Áp',
    defaultFrequency: 'Ngày 1 lần (uống buổi sáng)',
    defaultInstructions: 'Uống 1 viên vào buổi sáng cùng hoặc xa bữa ăn',
    defaultQuantity: 30
  },
  {
    id: 'drug-3',
    name: 'Atorvastatin 20mg (Lipitor)',
    genericName: 'Atorvastatin calcium',
    dosage: '20mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Hạ Mỡ Máu & Tim Mạch',
    defaultFrequency: 'Ngày 1 lần (uống vào buổi tối)',
    defaultInstructions: 'Uống 1 viên trước khi đi ngủ 30 phút',
    defaultQuantity: 30,
    warnings: 'Kiểm tra men gan định kỳ'
  },
  {
    id: 'drug-4',
    name: 'Concor 2.5mg (Bisoprolol)',
    genericName: 'Bisoprolol fumarate',
    dosage: '2.5mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Tim Mạch - Chẹn Beta',
    defaultFrequency: 'Ngày 1 lần (buổi sáng)',
    defaultInstructions: 'Uống 1 viên vào buổi sáng, kiểm tra mạch trước uống',
    defaultQuantity: 30
  },
  {
    id: 'drug-5',
    name: 'Aspirin 81mg (Stada)',
    genericName: 'Acetylsalicylic acid',
    dosage: '81mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Chống Đông & Tim Mạch',
    defaultFrequency: 'Ngày 1 lần (buổi trưa)',
    defaultInstructions: 'Uống sau bữa ăn trưa no, uống nguyên viên với nhiều nước',
    defaultQuantity: 30,
    warnings: 'Thận trọng với bệnh nhân tiền sử loét dạ dày'
  },

  // Đái Tháo Đường / Nội Tiết
  {
    id: 'drug-6',
    name: 'Glucophage XR 500mg (Metformin)',
    genericName: 'Metformin hydrochloride',
    dosage: '500mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Nội Tiết - Đái Tháo Đường',
    defaultFrequency: 'Ngày 1-2 lần (sáng - tối)',
    defaultInstructions: 'Uống ngay trong hoặc sau bữa ăn chính, nuốt nguyên viên',
    defaultQuantity: 60
  },
  {
    id: 'drug-7',
    name: 'Januvia 100mg (Sitagliptin)',
    genericName: 'Sitagliptin phosphate',
    dosage: '100mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Nội Tiết - Đái Tháo Đường',
    defaultFrequency: 'Ngày 1 lần (buổi sáng)',
    defaultInstructions: 'Uống 1 viên vào buổi sáng cùng bữa ăn',
    defaultQuantity: 30
  },
  {
    id: 'drug-8',
    name: 'Diamicron MR 60mg (Gliclazide)',
    genericName: 'Gliclazide phóng thích biến đổi',
    dosage: '60mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Nội Tiết - Đái Tháo Đường',
    defaultFrequency: 'Ngày 1 lần (bữa ăn sáng)',
    defaultInstructions: 'Uống 1 viên duy nhất vào bữa ăn sáng',
    defaultQuantity: 30,
    warnings: 'Phòng ngừa hạ đường huyết khi ăn không đúng giờ'
  },

  // Dạ Dày & Tiêu Hóa
  {
    id: 'drug-9',
    name: 'Nexium Mups 40mg (Esomeprazole)',
    genericName: 'Esomeprazole magnesium',
    dosage: '40mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Tiêu Hóa - Dạ Dày (PPI)',
    defaultFrequency: 'Ngày 1 lần (sáng trước ăn 30-60p)',
    defaultInstructions: 'Uống trước bữa ăn sáng 30 - 60 phút, không bẻ viên',
    defaultQuantity: 28
  },
  {
    id: 'drug-10',
    name: 'Phosphalugel (Gel nhôm phosphat)',
    genericName: 'Aluminium phosphate gel',
    dosage: 'Gói 20g',
    unit: 'Gói',
    route: 'Đường uống',
    category: 'Tiêu Hóa - Kháng Acid',
    defaultFrequency: 'Ngày 2-3 lần khi đau hoặc sau ăn 2h',
    defaultInstructions: 'Uống trực tiếp 1 gói khi cảm thấy đau rát thượng vị hoặc sau bữa ăn 2 tiếng',
    defaultQuantity: 20
  },
  {
    id: 'drug-11',
    name: 'Gaster DM (Domperidone + Omeprazole)',
    genericName: 'Domperidone 10mg / Omeprazole 20mg',
    dosage: 'Viên nang',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Tiêu Hóa - Trào Ngược',
    defaultFrequency: 'Ngày 2 lần (sáng - tối trước ăn 30p)',
    defaultInstructions: 'Uống 1 viên trước bữa ăn 30 phút để giảm trào ngược buồn nôn',
    defaultQuantity: 28
  },
  {
    id: 'drug-12',
    name: 'Enterogermina 2 tỷ / 5ml (Men vi sinh)',
    genericName: 'Bacillus clausii spores',
    dosage: '5ml',
    unit: 'Ống',
    route: 'Đường uống',
    category: 'Tiêu Hóa - Men Vi Sinh',
    defaultFrequency: 'Ngày 2 ống (cách kháng sinh 2h)',
    defaultInstructions: 'Lắc kỹ ống trước khi uống, uống trực tiếp hoặc hòa với nước nguội',
    defaultQuantity: 20
  },

  // Cơ Xương Khớp & Giảm Đau - Kháng Viêm
  {
    id: 'drug-13',
    name: 'Celebrex 200mg (Celecoxib)',
    genericName: 'Celecoxib',
    dosage: '200mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Cơ Xương Khớp - Kháng Viêm NSAID',
    defaultFrequency: 'Ngày 1-2 lần (sau ăn no)',
    defaultInstructions: 'Uống 1 viên sau khi ăn no, không nằm ngay sau uống',
    defaultQuantity: 20,
    warnings: 'Thận trọng với bệnh nhân đau dạ dày nặng'
  },
  {
    id: 'drug-14',
    name: 'Arcoxia 90mg (Etoricoxib)',
    genericName: 'Etoricoxib',
    dosage: '90mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Cơ Xương Khớp - Giảm Đau Gout & Khớp',
    defaultFrequency: 'Ngày 1 lần (sau ăn)',
    defaultInstructions: 'Uống 1 viên sau bữa ăn, đợt dùng tối đa 7-10 ngày',
    defaultQuantity: 10
  },
  {
    id: 'drug-15',
    name: 'Myonal 50mg (Eperisone HCl)',
    genericName: 'Eperisone hydrochloride',
    dosage: '50mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Cơ Xương Khớp - Giãn Cơ',
    defaultFrequency: 'Ngày 3 lần (sáng - trưa - tối)',
    defaultInstructions: 'Uống 1 viên sau mỗi bữa ăn, giúp giảm co thắt cơ thắt lưng/cổ',
    defaultQuantity: 30
  },
  {
    id: 'drug-16',
    name: 'Glucosamine Sulfate 1500mg',
    genericName: 'Glucosamine crystalline',
    dosage: '1500mg',
    unit: 'Gói/Viên',
    route: 'Đường uống',
    category: 'Cơ Xương Khớp - Bổ Khớp',
    defaultFrequency: 'Ngày 1 lần (sau bữa ăn chính)',
    defaultInstructions: 'Uống hoặc pha gói bột với nước ấm sau bữa ăn sáng',
    defaultQuantity: 30
  },

  // Giảm Đau, Hạ Sốt & Kháng Histamin
  {
    id: 'drug-17',
    name: 'Panadol Extra (Paracetamol 500mg + Caffeine 65mg)',
    genericName: 'Paracetamol / Caffeine',
    dosage: '500mg/65mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Giảm Đau & Hạ Sốt',
    defaultFrequency: 'Cách 4-6 giờ/lần khi đau hoặc sốt >38.5°C',
    defaultInstructions: 'Uống 1-2 viên khi đau đầu hoặc sốt, không quá 8 viên/ngày',
    defaultQuantity: 16
  },
  {
    id: 'drug-18',
    name: 'Efferalgan 500mg (Sủi)',
    genericName: 'Paracetamol viên sủi',
    dosage: '500mg',
    unit: 'Viên sủi',
    route: 'Đường uống',
    category: 'Giảm Đau & Hạ Sốt',
    defaultFrequency: 'Cách 4-6h/lần khi sốt cao',
    defaultInstructions: 'Hòa tan hoàn toàn 1 viên vào 200ml nước đun sôi để nguội',
    defaultQuantity: 16
  },
  {
    id: 'drug-19',
    name: 'Telfast HD 180mg (Fexofenadine)',
    genericName: 'Fexofenadine hydrochloride',
    dosage: '180mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Dị Ứng & Da Liễu (Kháng Histamin)',
    defaultFrequency: 'Ngày 1 lần (buổi tối)',
    defaultInstructions: 'Uống 1 viên vào buổi tối trước khi ngủ, không uống với nước bưởi',
    defaultQuantity: 10
  },

  // Kháng Sinh & Hô Hấp
  {
    id: 'drug-20',
    name: 'Augmentin 1g (Amoxicillin/Clavulanate 875/125mg)',
    genericName: 'Amoxicillin + Clavulanic Acid',
    dosage: '1000mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Kháng Sinh Hô Hấp & Nhiễm Khuẩn',
    defaultFrequency: 'Ngày 2 lần (cách 12 giờ)',
    defaultInstructions: 'Uống 1 viên vào đầu bữa ăn, uống đúng giờ cách nhau 12h, uống đủ 5-7 ngày',
    defaultQuantity: 14,
    warnings: 'Hỏi tiền sử dị ứng Penicillin trước khi cấp toa'
  },
  {
    id: 'drug-21',
    name: 'Zithromax 500mg (Azithromycin)',
    genericName: 'Azithromycin dihydrate',
    dosage: '500mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Kháng Sinh Hô Hấp',
    defaultFrequency: 'Ngày 1 lần (uống liền 3 ngày)',
    defaultInstructions: 'Uống 1 viên duy nhất mỗi ngày trước ăn 1h hoặc sau ăn 2h',
    defaultQuantity: 3
  },
  {
    id: 'drug-22',
    name: 'Acemuc 200mg (Acetylcysteine)',
    genericName: 'Acetylcysteine',
    dosage: '200mg',
    unit: 'Gói',
    route: 'Đường uống',
    category: 'Hô Hấp - Tiêu Đờm',
    defaultFrequency: 'Ngày 3 lần (mỗi lần 1 gói)',
    defaultInstructions: 'Hòa tan 1 gói với nửa ly nước, uống sau bữa ăn',
    defaultQuantity: 20
  },

  // Vitamin & Khoáng Chất / Bổ Não
  {
    id: 'drug-23',
    name: 'Tanakan 40mg (Ginkgo Biloba)',
    genericName: 'Ginkgo Biloba Extract',
    dosage: '40mg',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Bổ Não & Tuần Hoàn Não',
    defaultFrequency: 'Ngày 3 lần (sáng - trưa - tối)',
    defaultInstructions: 'Uống 1 viên vào bữa ăn, hỗ trợ giảm hoa mắt chóng mặt thiếu máu não',
    defaultQuantity: 30
  },
  {
    id: 'drug-24',
    name: 'Berocca Performance (Vitamin tổng hợp & Kẽm)',
    genericName: 'Multivitamins + Zinc + Magnesium',
    dosage: 'Viên sủi',
    unit: 'Viên',
    route: 'Đường uống',
    category: 'Vitamin & Nâng Cao Đề Kháng',
    defaultFrequency: 'Ngày 1 viên (uống buổi sáng)',
    defaultInstructions: 'Hòa tan 1 viên trong ly nước 200ml, uống sau ăn sáng để tăng năng lượng',
    defaultQuantity: 10
  }
];
