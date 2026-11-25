import { AllConfigs, AppMode, DocTypeInfo, DynamicFormData, PresetTemplate, UnitConfig } from './types';

export const DOC_TYPES: DocTypeInfo[] = [
  {
    code: 'NQ',
    name: 'Nghị quyết',
    upperName: 'NGHỊ QUYẾT',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Nghị quyết của cơ quan nhà nước hoặc cấp ủy, tổ chức Đảng'
  },
  {
    code: 'QĐ',
    name: 'Quyết định',
    upperName: 'QUYẾT ĐỊNH',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Quyết định cá biệt hoặc ban hành quy chế, quy định'
  },
  {
    code: 'KH',
    name: 'Kế hoạch',
    upperName: 'KẾ HOẠCH',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Kế hoạch triển khai công tác, nhiệm vụ trọng tâm'
  },
  {
    code: 'BC',
    name: 'Báo cáo',
    upperName: 'BÁO CÁO',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Báo cáo định kỳ, đột xuất hoặc chuyên đề'
  },
  {
    code: 'TTr',
    name: 'Tờ trình',
    upperName: 'TỜ TRÌNH',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Tờ trình đề xuất phê duyệt chủ trương, đề án, dự thảo'
  },
  {
    code: 'CV',
    name: 'Công văn',
    upperName: 'CÔNG VĂN',
    hasDocTitle: false,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Công văn hành chính trao đổi, đôn đốc, chỉ đạo nghiệp vụ'
  },
  {
    code: 'TB',
    name: 'Thông báo',
    upperName: 'THÔNG BÁO',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Thông báo kết luận cuộc họp, lịch công tác, thông tin'
  },
  {
    code: 'BB',
    name: 'Biên bản',
    upperName: 'BIÊN BẢN',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Biên bản hội nghị, cuộc họp, làm việc, kiểm tra'
  },
  {
    code: 'HĐ',
    name: 'Hợp đồng',
    upperName: 'HỢP ĐỒNG',
    hasDocTitle: true,
    modes: ['NHA_NUOC'],
    description: 'Hợp đồng kinh tế, cung cấp dịch vụ, thuê tài sản, giao khoán'
  },
  {
    code: 'QC',
    name: 'Quy chế',
    upperName: 'QUY CHẾ',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Quy chế làm việc, phối hợp, tổ chức hoạt động'
  },
  {
    code: 'HD',
    name: 'Hướng dẫn',
    upperName: 'HƯỚNG DẪN',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Hướng dẫn thực hiện văn bản, nghiệp vụ chuyên môn'
  },
  {
    code: 'CT',
    name: 'Chỉ thị',
    upperName: 'CHỈ THỊ',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Chỉ thị lãnh đạo, chỉ đạo thực hiện nhiệm vụ'
  },
  {
    code: 'KL',
    name: 'Kết luận',
    upperName: 'KẾT LUẬN',
    hasDocTitle: true,
    modes: ['DANG'],
    description: 'Kết luận của cấp ủy, ban thường vụ (Khối Đảng)'
  },
  {
    code: 'CTr',
    name: 'Chương trình',
    upperName: 'CHƯƠNG TRÌNH',
    hasDocTitle: true,
    modes: ['NHA_NUOC', 'DANG'],
    description: 'Chương trình công tác, chương trình hành động'
  }
];

export const DEFAULT_CONFIGS: AllConfigs = {
  NHA_NUOC: {
    coQuanChuQuan: 'ỦY BAN NHÂN DÂN TỈNH VIỆT THANH',
    coQuanBanHanh: 'ỦY BAN NHÂN DÂN XÃ NAM GIANG',
    kyHieuCoQuan: 'UBND',
    diaDanh: 'Nam Giang',
    signers: [
      {
        id: 'nn-1',
        quyenHan: 'TM. ỦY BAN NHÂN DÂN',
        chucVu: 'CHỦ TỊCH',
        hoTen: 'Thái Hoàng Nam'
      },
      {
        id: 'nn-2',
        quyenHan: 'KT. CHỦ TỊCH',
        chucVu: 'PHÓ CHỦ TỊCH',
        hoTen: 'Nguyễn Trường Bảo'
      },
      {
        id: 'nn-3',
        quyenHan: '',
        chucVu: 'CHỦ TỊCH',
        hoTen: 'Thái Hoàng Nam'
      },
      {
        id: 'nn-4',
        quyenHan: 'TL. CHỦ TỊCH',
        chucVu: 'VĂN PHÒNG HĐND & UBND',
        hoTen: 'Đoàn Hồng Nhung'
      }
    ],
    commonRecipients: [
      'Như trên;',
      'UBND tỉnh Việt Thanh (để b/c);',
      'Thường trực Đảng ủy xã Nam Giang (để b/c);',
      'Thường trực HĐND xã Nam Giang;',
      'Chủ tịch, các Phó Chủ tịch UBND xã;',
      'Ủy ban MTTQ và các đoàn thể xã Nam Giang;',
      'Các bộ phận chuyên môn, đơn vị trực thuộc;',
      'Các thôn, bản trên địa bàn xã Nam Giang;'
    ]
  },
  DANG: {
    coQuanChuQuan: 'ĐẢNG BỘ TỈNH VIỆT THANH',
    coQuanBanHanh: 'ĐẢNG ỦY XÃ NAM GIANG',
    kyHieuCoQuan: 'ĐU',
    diaDanh: 'Nam Giang',
    signers: [
      {
        id: 'd-1',
        quyenHan: 'T/M ĐẢNG ỦY',
        chucVu: 'BÍ THƯ',
        hoTen: 'Hoàng Ngọc Tưởng'
      },
      {
        id: 'd-2',
        quyenHan: 'T/M ĐẢNG ỦY',
        chucVu: 'PHÓ BÍ THƯ THƯỜNG TRỰC',
        hoTen: 'Trần Nghĩa'
      },
      {
        id: 'd-3',
        quyenHan: 'T/M BAN THƯỜNG VỤ',
        chucVu: 'BÍ THƯ',
        hoTen: 'Hoàng Ngọc Tưởng'
      },
      {
        id: 'd-4',
        quyenHan: 'K/T BÍ THƯ',
        chucVu: 'PHÓ BÍ THƯ',
        hoTen: 'Văn Ngọc Đức'
      }
    ],
    commonRecipients: [
      'Ban Thường vụ Tỉnh ủy Việt Thanh (để b/c);',
      'Các đồng chí Đảng ủy viên xã Nam Giang;',
      'Thường trực HĐND, UBND, Ủy ban MTTQ xã Nam Giang;',
      'Các chi bộ trực thuộc Đảng ủy xã Nam Giang;',
      'Các ban, bộ phận tham mưu Đảng ủy xã;'
    ]
  }
};

/**
 * Tự động ghép Ký hiệu văn bản theo đúng quy chuẩn NĐ 30/2020/NĐ-CP và HD 05-HD/VPTW
 * - Khối Nhà nước (NĐ 30):
 *   + Văn bản có tên loại: /LOẠI-CƠQUAN (VD: /KH-UBND, /BC-UBND, /QĐ-UBND, /HĐ-UBND)
 *   + Công văn: /CƠQUAN-BỘPHẬN (VD: /UBND-VP)
 * - Khối Đảng (HD 05):
 *   + Văn bản có tên loại: -LOẠI/CƠQUAN (VD: -NQ/ĐU, -KH/ĐU, -BC/ĐU)
 *   + Công văn: -CV/CƠQUAN (VD: -CV/ĐU)
 */
export function buildAutoKyHieu(mode: AppMode, docType: string, kyHieuCoQuan: string): string {
  const cq = (kyHieuCoQuan || (mode === 'NHA_NUOC' ? 'UBND' : 'ĐU')).trim().toUpperCase();
  if (mode === 'NHA_NUOC') {
    if (docType === 'CV') {
      return `/${cq}-VP`;
    }
    return `/${docType}-${cq}`;
  } else {
    return `-${docType}/${cq}`;
  }
}

/**
 * Kết xuất nội dung văn bản từ DynamicFormData để đồng bộ realtime sang A4Preview và docxExporter
 */
export function buildContentFromDynamicForm(docType: string, dyn: DynamicFormData): string {
  if (docType === 'HĐ') {
    const a = dyn.hdBenA || {
      tenDonVi: 'ỦY BAN NHÂN DÂN XÃ NAM GIANG',
      daiDien: 'Thái Hoàng Nam',
      chucVu: 'Chủ tịch UBND xã',
      diaChi: 'Xã Nam Giang, tỉnh Việt Thanh',
      mstCccd: '3200123456',
      dienThoai: '0233.3880.xxx',
      soTaiKhoan: '3713.0.105xxxx tại KBNN Nam Giang'
    };
    const b = dyn.hdBenB || {
      tenDonVi: 'CÔNG TY TNHH CÔNG NGHỆ SỐ VIỆT THANH',
      daiDien: 'Lê Văn Hùng',
      chucVu: 'Giám đốc',
      diaChi: 'Số 12 Lê Duẩn, tỉnh Việt Thanh',
      mstCccd: '3200987654',
      dienThoai: '0905.123.456',
      soTaiKhoan: '0771000888999 tại Ngân hàng Vietcombank Việt Thanh'
    };
    const lines: string[] = [
      'I. THÔNG TIN CÁC BÊN THAM GIA HỢP ĐỒNG',
      `1. BÊN A (Bên giao): ${a.tenDonVi}`,
      `- Đại diện là ông (bà): ${a.daiDien} — Chức vụ: ${a.chucVu}`,
      `- Địa chỉ: ${a.diaChi}`,
      `- Mã số thuế / CCCD: ${a.mstCccd} — Điện thoại: ${a.dienThoai}`,
      `- Số tài khoản: ${a.soTaiKhoan}`,
      `2. BÊN B (Bên nhận): ${b.tenDonVi}`,
      `- Đại diện là ông (bà): ${b.daiDien} — Chức vụ: ${b.chucVu}`,
      `- Địa chỉ: ${b.diaChi}`,
      `- Mã số thuế / CCCD: ${b.mstCccd} — Điện thoại: ${b.dienThoai}`,
      `- Số tài khoản: ${b.soTaiKhoan}`,
      'Hai bên thống nhất ký kết hợp đồng với các điều khoản cụ thể như sau:',
      `Điều 1. Nội dung công việc / Loại tài sản: ${dyn.hdNoiDungCongViec || ''}`,
      `Điều 2. Giá trị hợp đồng và phương thức thanh toán: Tổng giá trị hợp đồng là ${dyn.hdGiaTriSo || '0 đồng'} (Bằng chữ: ${dyn.hdGiaTriChu || '...'}). Phương thức thanh toán: ${dyn.hdPhuongThucThanhToan || ''}`,
      `Điều 3. Thời hạn và tiến độ thực hiện: ${dyn.hdThoiHan || ''}`
    ];

    const extraClauses = dyn.hdDieuKhoan || [];
    extraClauses.forEach((cl, idx) => {
      const dieuNum = idx + 4;
      const prefix = cl.tieuDe.trim().replace(/^Điều\s+\d+\.\s*/i, '');
      lines.push(`Điều ${dieuNum}. ${prefix ? prefix + ': ' : ''}${cl.noiDung.trim()}`);
    });

    return lines.join('\n');
  }

  if (docType === 'TTr') {
    const lines: string[] = [
      'I. SỰ CẦN THIẾT BAN HÀNH / ĐỀ XUẤT',
      dyn.ttrSuCanThiet || '',
      'II. NỘI DUNG PHƯƠNG ÁN ĐỀ XUẤT',
      dyn.ttrNoiDungDeXuat || '',
      'III. KINH PHÍ VÀ NGUỒN THỰC HIỆN',
      dyn.ttrKinhPhiNguon || '',
      'IV. KIẾN NGHỊ, ĐỀ XUẤT',
      dyn.ttrKienNghi || ''
    ];
    return lines.filter(Boolean).join('\n');
  }

  if (docType === 'QĐ') {
    const lines: string[] = [];
    if (dyn.qdXetDeNghi && dyn.qdXetDeNghi.trim()) {
      lines.push('QUYẾT ĐỊNH:');
    }
    const dieuList = dyn.qdDieuList || [];
    dieuList.forEach((d, idx) => {
      const dieuNum = idx + 1;
      const cleanTitle = d.tieuDe.trim().replace(/^Điều\s+\d+\.\s*/i, '');
      const fullFirstLine = cleanTitle ? `Điều ${dieuNum}. ${cleanTitle}` : `Điều ${dieuNum}.`;
      if (d.noiDung.trim()) {
        lines.push(`${fullFirstLine} ${d.noiDung.trim()}`);
      } else {
        lines.push(fullFirstLine);
      }
    });
    return lines.join('\n');
  }

  if (docType === 'CV') {
    return dyn.cvNoiDung || '';
  }

  if (docType === 'BB') {
    const lines: string[] = [
      `1. Thời gian: Bắt đầu lúc ${dyn.bbThoiGianBatDau || '08 giờ 00 phút, ngày .../.../2026'}; kết thúc lúc ${dyn.bbThoiGianKetThuc || '11 giờ 00 phút cùng ngày'}.`,
      `2. Địa điểm: ${dyn.bbDiaDiem || 'Hội trường UBND xã Nam Giang'}.`,
      '3. Thành phần tham dự:',
      `- Chủ tọa: Đồng chí ${dyn.bbChuToa || 'Thái Hoàng Nam'} — Chức vụ: ${dyn.bbChuToaChucVu || 'Chủ tịch UBND xã'}.`,
      `- Thư ký: Đồng chí ${dyn.bbThuKy || 'Đoàn Hồng Nhung'} — Chức vụ: ${dyn.bbThuKyChucVu || 'Công chức Văn phòng - Thống kê'}.`,
      `- Thành phần tham dự: ${dyn.bbThanhPhan || ''}`,
      '4. Nội dung và diễn biến cuộc họp:',
      dyn.bbDienBien || '',
      'Biên bản được lập thành 02 bản có giá trị pháp lý như nhau và đã đọc lại cho toàn thể thành viên dự họp cùng nghe, thống nhất ký tên dưới đây./.'
    ];
    return lines.filter(Boolean).join('\n');
  }

  // Các loại khác: KH, BC, TB, NQ, QC, HD, CT, KL, CTr
  const secs = dyn.sections || [];
  const lines: string[] = [];
  secs.forEach((s) => {
    if (s.tieuDe.trim()) {
      lines.push(s.tieuDe.trim());
    }
    if (s.noiDung.trim()) {
      lines.push(s.noiDung.trim());
    }
  });
  return lines.join('\n');
}

/**
 * Tạo dữ liệu Mẫu chuẩn kèm DynamicFormData theo từng loại văn bản khi người dùng bấm "Dùng mẫu theo loại này"
 */
export function buildDefaultTemplateForDocType(
  mode: AppMode,
  docType: string,
  unitConfig: UnitConfig
): {
  trichYeu: string;
  kinhGui: string;
  canCu: string[];
  noiDung: string;
  noiNhanList: string[];
  luuVt: string;
  dynamicData: DynamicFormData;
} {
  const isState = mode === 'NHA_NUOC';
  const defaultLuu = isState ? 'Lưu: VT, VP.' : 'Lưu: VT, VPĐU.';
  const defaultRecipients = unitConfig.commonRecipients.slice(0, 3);
  const firstSigner = unitConfig.signers[0] || {
    quyenHan: isState ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
    chucVu: isState ? 'CHỦ TỊCH' : 'BÍ THƯ',
    hoTen: isState ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
  };

  if (docType === 'HĐ') {
    const dynamicData: DynamicFormData = {
      hdBenA: {
        tenDonVi: unitConfig.coQuanBanHanh || 'ỦY BAN NHÂN DÂN XÃ NAM GIANG',
        daiDien: firstSigner.hoTen || 'Thái Hoàng Nam',
        chucVu: 'Chủ tịch UBND xã',
        diaChi: 'Xã Nam Giang, tỉnh Việt Thanh',
        mstCccd: '3200123456',
        dienThoai: '0233.3880.123',
        soTaiKhoan: '3713.0.1056789 tại Kho bạc Nhà nước Nam Giang'
      },
      hdBenB: {
        tenDonVi: 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ SỐ VIỆT THANH',
        daiDien: 'Nguyễn Minh Quân',
        chucVu: 'Giám đốc',
        diaChi: 'Số 68 Hùng Vương, tỉnh Việt Thanh',
        mstCccd: '3200987654',
        dienThoai: '0912.345.678',
        soTaiKhoan: '0771000888999 tại Ngân hàng Vietcombank Chi nhánh Việt Thanh'
      },
      hdNoiDungCongViec:
        'Cung cấp, lắp đặt thiết bị số hóa tài liệu và triển khai hệ thống phần mềm Văn Thư Số 4.0 phục vụ cải cách hành chính tại UBND xã Nam Giang theo đúng danh mục kỹ thuật đính kèm.',
      hdGiaTriSo: '85.000.000 đồng',
      hdGiaTriChu: 'Tám mươi lăm triệu đồng chẵn',
      hdThoiHan: '30 ngày kể từ ngày ký hợp đồng (từ ngày 23/11/2026 đến hết ngày 23/12/2026).',
      hdPhuongThucThanhToan:
        'Thanh toán bằng hình thức chuyển khoản qua Kho bạc Nhà nước làm 02 đợt: Đợt 1 tạm ứng 50% sau khi ký hợp đồng; Đợt 2 thanh toán 50% giá trị còn lại sau khi nghiệm thu, bàn giao đưa vào sử dụng.',
      hdDieuKhoan: [
        {
          tieuDe: 'Quyền và nghĩa vụ của các bên',
          noiDung:
            'Bên A có trách nhiệm bố trí mặt bằng, hạ tầng mạng và cử cán bộ phối hợp nghiệm thu, thanh toán đúng hạn. Bên B cam kết cung cấp thiết bị, phần mềm đúng chất lượng, bảo hành 24 tháng và hướng dẫn sử dụng tận nơi.'
        },
        {
          tieuDe: 'Điều khoản chung và hiệu lực hợp đồng',
          noiDung:
            'Hai bên cam kết thực hiện nghiêm túc các điều khoản đã thỏa thuận. Hợp đồng có hiệu lực kể từ ngày ký và được lập thành 04 bản có giá trị pháp lý như nhau, mỗi bên giữ 02 bản./.'
        }
      ]
    };
    return {
      trichYeu:
        'Về việc cung cấp thiết bị số hóa và triển khai phần mềm Văn Thư Số 4.0 tại UBND xã Nam Giang',
      kinhGui: '',
      canCu: [
        'Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015',
        'Căn cứ Luật Đấu thầu số 22/2023/QH15 ngày 23 tháng 6 năm 2023',
        'Căn cứ nhu cầu nâng cấp hạ tầng công nghệ thông tin và thỏa thuận giữa hai bên'
      ],
      noiDung: buildContentFromDynamicForm('HĐ', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'TTr') {
    const dynamicData: DynamicFormData = {
      ttrSuCanThiet: `- Hiện nay, hệ thống máy tính và thiết bị số hóa tài liệu tại bộ phận Văn thư - Lưu trữ xã Nam Giang đã qua nhiều năm sử dụng, cấu hình thấp, ảnh hưởng đến tốc độ ký số và lập hồ sơ điện tử.\n- Việc đầu tư, nâng cấp hạ tầng công nghệ thông tin và triển khai đồng bộ phần mềm Văn Thư Số 4.0 là hết sức cấp thiết nhằm đáp ứng yêu cầu chuẩn hóa văn bản và kết nối liên thông dữ liệu với UBND tỉnh Việt Thanh.`,
      ttrNoiDungDeXuat: `1. Danh mục hạng mục nâng cấp\n- Trang bị 02 máy quét (scanner) tốc độ cao chuyên dụng phục vụ số hóa tài liệu lưu trữ.\n- Nâng cấp hệ thống mạng nội bộ (LAN), thiết bị lưu trữ dự phòng (NAS) và phần mềm hỗ trợ rà soát thể thức văn bản tự động theo Nghị định 30/2020/NĐ-CP.`,
      ttrKinhPhiNguon: `- Tổng kinh phí dự kiến: 85.000.000 đồng (Bằng chữ: Tám mươi lăm triệu đồng chẵn).\n- Nguồn kinh phí: Từ nguồn kinh phí chi thường xuyên và kinh phí sự nghiệp chuyển đổi số năm 2027 của xã Nam Giang.`,
      ttrKienNghi: `Ủy ban nhân dân xã Nam Giang kính trình cấp có thẩm quyền xem xét, phê duyệt Phương án nâng cấp hạ tầng công nghệ thông tin và phần mềm Văn thư số năm 2027 như nội dung nêu trên để địa phương có cơ sở triển khai thực hiện theo đúng quy định của pháp luật./.`
    };
    return {
      trichYeu:
        'Về việc đề nghị phê duyệt Phương án nâng cấp hạ tầng công nghệ thông tin và phần mềm Văn thư số xã Nam Giang năm 2027',
      kinhGui: isState
        ? 'Ủy ban nhân dân tỉnh Việt Thanh / Thường trực HĐND xã Nam Giang'
        : 'Ban Thường vụ Tỉnh ủy Việt Thanh / Ban Thường vụ Đảng ủy xã Nam Giang',
      canCu: [
        'Căn cứ Luật Ngân sách nhà nước ngày 25 tháng 6 năm 2015',
        'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư',
        'Căn cứ nhu cầu thực tế về hiện đại hóa nền hành chính và chuyển đổi số tại xã Nam Giang'
      ],
      noiDung: buildContentFromDynamicForm('TTr', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'QĐ') {
    const xetDeNghi =
      'Theo đề nghị của Công chức Văn phòng - Thống kê xã Nam Giang tại Tờ trình số 12/TTr-VP ngày 20 tháng 11 năm 2026';
    const dynamicData: DynamicFormData = {
      qdXetDeNghi: xetDeNghi,
      qdDieuList: [
        {
          tieuDe: 'Ban hành Quy chế / Phê duyệt nội dung',
          noiDung:
            'Ban hành kèm theo Quyết định này Quy chế quản lý, vận hành và khai thác Hệ thống phần mềm Văn Thư Số 4.0 trong công tác soạn thảo, ký số và lưu trữ hồ sơ điện tử tại xã Nam Giang.'
        },
        {
          tieuDe: 'Trách nhiệm tổ chức thực hiện và kinh phí',
          noiDung:
            'Giao Văn phòng chủ trì, phối hợp với bộ phận Tài chính - Kế toán và các ban, ngành, đoàn thể hướng dẫn, kiểm tra, đôn đốc việc thực hiện Quyết định này đảm bảo đồng bộ, đúng quy chuẩn Nghị định số 30/2020/NĐ-CP.'
        },
        {
          tieuDe: 'Hiệu lực và trách nhiệm thi hành',
          noiDung:
            'Quyết định này có hiệu lực kể từ ngày ký. Công chức Văn phòng - Thống kê, Trưởng các bộ phận chuyên môn, đơn vị trực thuộc và các cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./.'
        }
      ]
    };
    return {
      trichYeu:
        'Về việc ban hành Quy chế quản lý, vận hành Hệ thống phần mềm Văn Thư Số 4.0 tại xã Nam Giang',
      kinhGui: '',
      canCu: [
        'Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015',
        'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư',
        xetDeNghi
      ],
      noiDung: buildContentFromDynamicForm('QĐ', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'CV') {
    const dynamicData: DynamicFormData = {
      cvNoiDung: `Thực hiện Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư và Hướng dẫn số 05-HD/VPTW của Văn phòng Trung ương Đảng; qua công tác kiểm tra, rà soát văn bản ban hành tại xã Nam Giang trong thời gian qua, nhìn chung các bộ phận đã chú trọng tuân thủ quy định về thể thức và kỹ thuật trình bày văn bản.\n\nTuy nhiên, vẫn còn một số dự thảo văn bản trình ký mắc lỗi kỹ thuật như: trình bày chưa đúng cỡ chữ Quốc hiệu, Tiêu ngữ; thiếu dấu chấm phẩy (;) hoặc dấu chấm (.) ở phần căn cứ ban hành; sai quy cách ghi số, ký hiệu hoặc thiếu dòng "Lưu: VT" tại mục Nơi nhận.\n\nĐể khắc phục triệt để các hạn chế nêu trên và nâng cao tính chuyên nghiệp trong công tác ban hành văn bản, ${isState ? 'Chủ tịch UBND xã Nam Giang' : 'Ban Thường vụ Đảng ủy xã Nam Giang'} yêu cầu các bộ phận, đơn vị thực hiện nghiêm các nội dung sau:\n1. Tổ chức rà soát chặt chẽ 100% dự thảo văn bản trên ứng dụng Văn Thư Số 4.0 trước khi trình lãnh đạo ký ban hành, đảm bảo đúng phông chữ Times New Roman, định dạng lề trang A4 (Trái 30mm, Phải 15mm, Trên 20mm, Dưới 20mm).\n2. Văn phòng có trách nhiệm kiểm tra thể thức, kỹ thuật trình bày và kiên quyết trả lại các dự thảo văn bản không đảm bảo quy chuẩn theo quy định.\n\nYêu cầu các bộ phận, đơn vị nghiêm túc quán triệt và triển khai thực hiện./.`
    };
    return {
      trichYeu:
        'V/v chấn chỉnh, nâng cao chất lượng soạn thảo và ban hành văn bản hành chính theo đúng quy chuẩn thể thức',
      kinhGui: 'Các ban, bộ phận chuyên môn và các đơn vị trực thuộc trên địa bàn xã Nam Giang',
      canCu: [],
      noiDung: buildContentFromDynamicForm('CV', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'BB') {
    const dynamicData: DynamicFormData = {
      bbThoiGianBatDau: '08 giờ 00 phút, ngày 23 tháng 11 năm 2026',
      bbThoiGianKetThuc: '11 giờ 15 phút cùng ngày',
      bbDiaDiem: 'Hội trường lớn UBND xã Nam Giang, tỉnh Việt Thanh',
      bbChuToa: firstSigner.hoTen || 'Thái Hoàng Nam',
      bbChuToaChucVu: isState ? 'Chủ tịch UBND xã Nam Giang' : 'Bí thư Đảng ủy xã Nam Giang',
      bbThuKy: 'Đoàn Hồng Nhung',
      bbThuKyChucVu: 'Công chức Văn phòng - Thống kê',
      bbThanhPhan:
        'Các đồng chí trong Thường trực Đảng ủy, Thường trực HĐND, Lãnh đạo UBND, Chủ tịch Ủy ban MTTQ Việt Nam xã và toàn thể cán bộ, công chức xã Nam Giang (Có mặt: 28/28 đồng chí; Vắng mặt: 0).',
      bbDienBien: `a) Báo cáo trung tâm:\n- Đồng chí Chủ tọa quán triệt mục đích, yêu cầu cuộc họp đánh giá tiến độ thực hiện nhiệm vụ cải cách hành chính, chuyển đổi số và chuẩn hóa văn thư lưu trữ quý IV năm 2026.\n- Đồng chí Công chức Văn phòng - Thống kê trình bày báo cáo kết quả rà soát hồ sơ điện tử và tỷ lệ ký số văn bản trên toàn xã.\nb) Ý kiến thảo luận:\n- Các bộ phận chuyên môn phát biểu làm rõ những thuận lợi, vướng mắc trong quá trình số hóa hồ sơ và đề xuất trang bị bổ sung thiết bị quét tài liệu.\nc) Kết luận của Chủ tọa:\n- Thống nhất 100% cán bộ, công chức áp dụng hệ thống Văn Thư Số 4.0 để chuẩn hóa thể thức văn bản trước khi trình ký ban hành.`
    };
    return {
      trichYeu:
        'Hội nghị giao ban đánh giá công tác cải cách hành chính, chuyển đổi số và văn thư lưu trữ tháng 11 năm 2026',
      kinhGui: '',
      canCu: [],
      noiDung: buildContentFromDynamicForm('BB', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'BC') {
    const dynamicData: DynamicFormData = {
      sections: [
        {
          tieuDe: 'I. TÌNH HÌNH VÀ KẾT QUẢ THỰC HIỆN',
          noiDung: `1. Công tác chỉ đạo, điều hành\n- UBND xã Nam Giang đã kịp thời ban hành các văn bản chỉ đạo, quy chế quản lý và vận hành hệ thống quản lý văn bản và điều hành điện tử.\n- Quán triệt 100% cán bộ, công chức thực hiện nghiêm quy chuẩn thể thức văn bản theo Nghị định số 30/2020/NĐ-CP và Hướng dẫn số 05-HD/VPTW.\n2. Kết quả tiếp nhận và ban hành văn bản điện tử\n- Tổng số văn bản đến tiếp nhận qua hệ thống: 1.450 văn bản; tỷ lệ số hóa và xử lý trên môi trường mạng đạt 100%.\n- Tổng số văn bản đi ban hành: 620 văn bản; 100% văn bản được ký số và phát hành điện tử đúng quy định.`
        },
        {
          tieuDe: 'II. ĐÁNH GIÁ CHUNG',
          noiDung: `1. Ưu điểm\n- Thể thức, kỹ thuật trình bày văn bản tại xã Nam Giang được chuẩn hóa đồng bộ; thời gian xử lý công việc rút ngắn trên 40% so với trước đây.\n2. Tồn tại, hạn chế\n- Một số hồ sơ chuyên môn cập nhật danh mục tài liệu còn chậm so với tiến độ đề ra.`
        },
        {
          tieuDe: 'III. PHƯƠNG HƯỚNG, NHIỆM VỤ THỜI GIAN TỚI',
          noiDung: `1. Tiếp tục rà soát, chuẩn hóa 100% văn bản trước khi trình ký thông qua hệ thống Văn Thư Số 4.0.\n2. Tổ chức tập huấn nâng cao kỹ năng lập hồ sơ điện tử và nộp lưu vào Lưu trữ lịch sử tỉnh Việt Thanh đúng thời hạn quy định./.`
        }
      ]
    };
    return {
      trichYeu: 'Kết quả thực hiện công tác văn thư, lưu trữ và chuyển đổi số quý IV năm 2026 trên địa bàn xã Nam Giang',
      kinhGui: '',
      canCu: [
        'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư',
        'Thực hiện Kế hoạch cải cách hành chính và chuyển đổi số năm 2026 của xã Nam Giang'
      ],
      noiDung: buildContentFromDynamicForm('BC', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'TB') {
    const dynamicData: DynamicFormData = {
      sections: [
        {
          tieuDe: '1. Đánh giá kết quả thực hiện nhiệm vụ thời gian qua',
          noiDung:
            'Thực hiện chương trình công tác tháng 11 năm 2026, lãnh đạo xã Nam Giang ghi nhận và biểu dương tinh thần chủ động của các bộ phận chuyên môn trong công tác giải quyết thủ tục hành chính và số hóa hồ sơ cho người dân, doanh nghiệp.'
        },
        {
          tieuDe: '2. Nhiệm vụ trọng tâm cần tập trung triển khai trong thời gian tới',
          noiDung: `- Giao bộ phận Văn phòng - Thống kê: Chủ trì kiểm tra, rà soát 100% thể thức văn bản hành chính trước khi trình ký phát hành.\n- Giao các bộ phận chuyên môn, các thôn trên địa bàn xã Nam Giang: Khẩn trương hoàn thành chỉ tiêu kế hoạch năm 2026 và gửi báo cáo đúng thời hạn.\nThừa lệnh lãnh đạo cơ quan, Văn phòng thông báo để các bộ phận, đơn vị, cá nhân có liên quan biết, nghiêm túc thực hiện./.`
        }
      ]
    };
    return {
      trichYeu:
        'Kết luận của lãnh đạo tại Hội nghị giao ban công tác tháng 11 và triển khai nhiệm vụ trọng tâm tháng 12 năm 2026',
      kinhGui: '',
      canCu: [],
      noiDung: buildContentFromDynamicForm('TB', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  if (docType === 'NQ') {
    const dynamicData: DynamicFormData = {
      sections: [
        {
          tieuDe: 'I. ĐÁNH GIÁ TÌNH HÌNH',
          noiDung:
            'Trong năm 2026, công tác cải cách hành chính và ứng dụng công nghệ thông tin trong hoạt động lãnh đạo, điều hành tại xã Nam Giang đã đạt được nhiều kết quả tích cực. Kỷ luật, kỷ cương hành chính được tăng cường; tỷ lệ giải quyết thủ tục hành chính đúng và trước hạn đạt trên 99%.'
        },
        {
          tieuDe: 'II. MỤC TIÊU VÀ NHIỆM VỤ, GIẢI PHÁP TRỌNG TÂM NĂM 2027',
          noiDung: `1. Mục tiêu tổng quát\n- Nâng cao năng lực lãnh đạo, chỉ đạo điều hành trên môi trường số; xây dựng nền hành chính xã Nam Giang chuyên nghiệp, hiện đại, minh bạch.\n2. Các chỉ tiêu và giải pháp chủ yếu\n- 100% văn bản đi, đến (trừ văn bản mật) được xử lý, ký số và phát hành hoàn toàn trên môi trường điện tử.\n- 100% cán bộ, công chức sử dụng thành thạo công cụ chuẩn hóa văn bản số theo đúng quy định của Nhà nước và của Đảng.`
        },
        {
          tieuDe: 'III. TỔ CHỨC THỰC HIỆN',
          noiDung: `1. Giao Ủy ban nhân dân xã Nam Giang và các bộ phận tham mưu cụ thể hóa Nghị quyết này thành kế hoạch, chương trình hành động để triển khai thực hiện hiệu quả.\n2. Các chi bộ, bộ phận trực thuộc tổ chức quán triệt Nghị quyết đến toàn thể cán bộ, đảng viên, công chức và định kỳ báo cáo kết quả thực hiện./.`
        }
      ]
    };
    return {
      trichYeu:
        'Về tăng cường sự lãnh đạo đối với công tác cải cách hành chính và chuyển đổi số tại xã Nam Giang năm 2027',
      kinhGui: '',
      canCu: [
        'Căn cứ Điều lệ Đảng Cộng sản Việt Nam và Quy chế làm việc của Ban Chấp hành Đảng bộ xã Nam Giang nhiệm kỳ 2025 - 2030',
        'Căn cứ Nghị quyết của Tỉnh ủy Việt Thanh về đẩy mạnh chuyển đổi số gắn với cải cách hành chính tại cơ sở',
        'Xét đề nghị của Văn phòng và báo cáo đánh giá tình hình thực hiện nhiệm vụ năm 2026'
      ],
      noiDung: buildContentFromDynamicForm('NQ', dynamicData),
      noiNhanList: defaultRecipients,
      luuVt: defaultLuu,
      dynamicData
    };
  }

  // Mặc định cho KH (Kế hoạch) và các loại QC, HD, CT, KL, CTr
  const dynamicData: DynamicFormData = {
    sections: [
      {
        tieuDe: 'I. MỤC ĐÍCH, YÊU CẦU',
        noiDung: `1. Mục đích\n- Đánh giá toàn diện kết quả thực hiện nhiệm vụ phát triển kinh tế - xã hội, quốc phòng - an ninh và công tác cải cách hành chính năm 2026 trên địa bàn xã Nam Giang.\n- Biểu dương, khen thưởng các tập thể, cá nhân có thành tích xuất sắc trong phong trào thi đua năm 2026.\n2. Yêu cầu\n- Công tác tổ chức triển khai đảm bảo trang trọng, thiết thực, tiết kiệm, hiệu quả và đúng quy định.`
      },
      {
        tieuDe: 'II. NỘI DUNG, THỜI GIAN VÀ ĐỊA ĐIỂM THỰC HIỆN',
        noiDung: `1. Nội dung trọng tâm\n- Báo cáo tổng kết công tác năm 2026 và triển khai phương hướng, nhiệm vụ trọng tâm năm 2027.\n- Thảo luận, đóng góp ý kiến của các đại biểu và công bố các quyết định khen thưởng.\n2. Thời gian và địa điểm\n- Thời gian: 01 buổi, bắt đầu từ 08 giờ 00 phút, ngày 28 tháng 12 năm 2026.\n- Địa điểm: Hội trường lớn UBND xã Nam Giang, tỉnh Việt Thanh.`
      },
      {
        tieuDe: 'III. TỔ CHỨC THỰC HIỆN',
        noiDung: `1. Văn phòng / Bộ phận tham mưu\n- Chủ trì phối hợp với các bộ phận liên quan chuẩn bị nội dung báo cáo, tài liệu, giấy mời và các điều kiện cơ sở vật chất phục vụ hội nghị.\n2. Các bộ phận chuyên môn, đơn vị trực thuộc\n- Căn cứ chức năng, nhiệm vụ được giao, chủ động phối hợp triển khai thực hiện nghiêm túc./.`
      }
    ]
  };
  return {
    trichYeu:
      'Về việc tổ chức hội nghị tổng kết công tác năm 2026 và triển khai nhiệm vụ trọng tâm năm 2027 tại xã Nam Giang',
    kinhGui: '',
    canCu: [
      'Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015',
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư',
      'Thực hiện Chương trình công tác trọng tâm năm 2026 của xã Nam Giang'
    ],
    noiDung: buildContentFromDynamicForm(docType, dynamicData),
    noiNhanList: defaultRecipients,
    luuVt: defaultLuu,
    dynamicData
  };
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'tpl-ke-hoach',
    title: 'Mẫu 1: Kế hoạch triển khai công tác / chuyển đổi số (Xã Nam Giang)',
    mode: 'BOTH',
    docType: 'KH',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'KH', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-bao-cao',
    title: 'Mẫu 2: Báo cáo kết quả công tác cải cách hành chính & văn thư lưu trữ',
    mode: 'BOTH',
    docType: 'BC',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'BC', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-to-trinh',
    title: 'Mẫu 3: Tờ trình đề nghị phê duyệt kinh phí / phương án nâng cấp hạ tầng số',
    mode: 'BOTH',
    docType: 'TTr',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'TTr', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-cong-van',
    title: 'Mẫu 4: Công văn đôn đốc thực hiện quy chuẩn thể thức văn bản hành chính',
    mode: 'BOTH',
    docType: 'CV',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'CV', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-nghi-quyet',
    title: 'Mẫu 5: Nghị quyết lãnh đạo thực hiện nhiệm vụ chính trị & chuyển đổi số',
    mode: 'BOTH',
    docType: 'NQ',
    ...buildDefaultTemplateForDocType('DANG', 'NQ', DEFAULT_CONFIGS.DANG)
  },
  {
    id: 'tpl-quyet-dinh',
    title: 'Mẫu 6: Quyết định ban hành Quy chế quản lý, vận hành Văn Thư Số 4.0',
    mode: 'BOTH',
    docType: 'QĐ',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'QĐ', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-hop-dong',
    title: 'Mẫu 7: Hợp đồng cung cấp thiết bị số hóa & phần mềm Văn Thư Số (2 bên ký)',
    mode: 'NHA_NUOC',
    docType: 'HĐ',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'HĐ', DEFAULT_CONFIGS.NHA_NUOC)
  },
  {
    id: 'tpl-bien-ban',
    title: 'Mẫu 8: Biên bản hội nghị giao ban công tác (Thư ký & Chủ tọa ký)',
    mode: 'BOTH',
    docType: 'BB',
    ...buildDefaultTemplateForDocType('NHA_NUOC', 'BB', DEFAULT_CONFIGS.NHA_NUOC)
  }
];

export const OUTLINE_SUGGESTIONS: Record<string, string> = {
  KH: `I. MỤC ĐÍCH, YÊU CẦU
1. Mục đích
- ...
2. Yêu cầu
- ...

II. NỘI DUNG VÀ THỜI GIAN THỰC HIỆN
1. Nội dung trọng tâm
- ...
2. Thời gian, địa điểm
- ...

III. KINH PHÍ THỰC HIỆN
- Nguồn kinh phí: ...

IV. TỔ CHỨC THỰC HIỆN
1. Bộ phận chủ trì
- ...
2. Bộ phận phối hợp
- .../.`,
  BC: `I. ĐẶC ĐIỂM TÌNH HÌNH
1. Thuận lợi
- ...
2. Khó khăn
- ...

II. KẾT QUẢ THỰC HIỆN
1. Công tác lãnh đạo, chỉ đạo
- ...
2. Kết quả cụ thể trên các lĩnh vực
a) Lĩnh vực 1: ...
b) Lĩnh vực 2: ...

III. ĐÁNH GIÁ CHUNG
1. Ưu điểm
- ...
2. Tồn tại, hạn chế và nguyên nhân
- ...

IV. PHƯƠNG HƯỚNG, NHIỆM VỤ VÀ KIẾN NGHỊ
1. Phương hướng, nhiệm vụ trọng tâm thời gian tới
- ...
2. Kiến nghị, đề xuất
- .../.`,
  TTr: `I. SỰ CẦN THIẾT BAN HÀNH / ĐỀ XUẤT
- ...

II. QUÁ TRÌNH XÂY DỰNG VÀ NỘI DUNG CHỦ YẾU
1. Quá trình chuẩn bị
- ...
2. Nội dung chính của phương án / dự thảo
- ...

III. KINH PHÍ VÀ NGUỒN THỰC HIỆN
- ...

IV. KIẾN NGHỊ, ĐỀ XUẤT
Trên đây là Tờ trình về việc ..., kính trình cấp có thẩm quyền xem xét, quyết định./.`,
  CV: `Thực hiện ... ngày ... tháng ... năm ... của ... về việc ...;
Qua rà soát tình hình thực tế tại đơn vị, UBND xã Nam Giang đề nghị các bộ phận, đơn vị triển khai thực hiện tốt các nội dung sau:
1. Về công tác tổ chức thực hiện
- ...
2. Về thời gian báo cáo kết quả
- Các đơn vị gửi báo cáo kết quả thực hiện về Văn phòng trước ngày .../.../2026 để tổng hợp.
Trong quá trình thực hiện, nếu có khó khăn, vướng mắc, đề nghị phản ánh kịp thời về cơ quan thường trực để phối hợp giải quyết./.`,
  NQ: `I. TÌNH HÌNH VÀ NGUYÊN NHÂN
1. Kết quả đạt được
- ...
2. Hạn chế, khuyết điểm và nguyên nhân
- ...

II. QUAN ĐIỂM, MỤC TIÊU VÀ NHIỆM VỤ, GIẢI PHÁP
1. Mục tiêu
- ...
2. Nhiệm vụ và giải pháp chủ yếu
a) Nhiệm vụ thứ nhất: ...
b) Nhiệm vụ thứ hai: ...

III. TỔ CHỨC THỰC HIỆN
1. Giao ... chủ trì xây dựng kế hoạch triển khai thực hiện Nghị quyết.
2. Các ban, chi bộ, đơn vị trực thuộc tổ chức phổ biến, quán triệt và báo cáo kết quả thực hiện theo quy định./.`,
  QĐ: `Điều 1. Ban hành kèm theo Quyết định này / Phê duyệt nội dung sau:
- ...

Điều 2. Tổ chức thực hiện và nguồn kinh phí (nếu có):
- ...

Điều 3. Quyết định này có hiệu lực kể từ ngày ký.
Văn phòng, Thủ trưởng các bộ phận, đơn vị có liên quan và các ông (bà) có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này./.`,
  TB: `Thực hiện chương trình công tác, ngày ... tháng ... năm 2026, đồng chí ... đã chủ trì hội nghị ... Sau khi nghe báo cáo và ý kiến phát biểu của các đại biểu, chủ trì hội nghị kết luận và thông báo các nội dung như sau:
1. Đánh giá kết quả thực hiện
- ...
2. Nhiệm vụ cần tập trung triển khai trong thời gian tới
- Giao bộ phận ...: ...
- Giao bộ phận ...: ...
Thừa lệnh lãnh đạo cơ quan, Văn phòng thông báo để các đơn vị, cá nhân có liên quan biết, thực hiện./.`,
  BB: `1. Thời gian: Bắt đầu lúc 08 giờ 00 phút, ngày ... tháng ... năm 2026; kết thúc lúc 11 giờ 00 phút cùng ngày.
2. Địa điểm: Hội trường UBND xã Nam Giang.
3. Thành phần tham dự:
- Chủ tọa: Đồng chí Thái Hoàng Nam — Chức vụ: Chủ tịch UBND xã.
- Thư ký: Đồng chí Đoàn Hồng Nhung — Chức vụ: Công chức Văn phòng - Thống kê.
- Thành phần tham dự: ...
4. Nội dung và diễn biến cuộc họp:
- ...
Biên bản kết thúc vào lúc 11 giờ 00 phút cùng ngày, đã đọc lại cho toàn thể thành viên dự họp cùng nghe và thống nhất ký tên./.`,
  HĐ: `I. THÔNG TIN CÁC BÊN THAM GIA HỢP ĐỒNG
1. BÊN A: ỦY BAN NHÂN DÂN XÃ NAM GIANG
- Đại diện: Ông Thái Hoàng Nam — Chức vụ: Chủ tịch UBND xã
- Địa chỉ: Xã Nam Giang, tỉnh Việt Thanh
2. BÊN B: ...
- Đại diện: ... — Chức vụ: ...
- Địa chỉ: ...
Điều 1. Nội dung công việc / Loại tài sản: ...
Điều 2. Giá trị hợp đồng và phương thức thanh toán: ...
Điều 3. Thời hạn thực hiện: ...
Điều 4. Quyền và nghĩa vụ của các bên: .../.`
};
