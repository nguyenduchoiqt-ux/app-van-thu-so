import { AppMode, DocumentData, ReviewIssue } from '../types';
import { DOC_TYPES } from '../constants';


/**
 * Định dạng Ngày ban hành theo chuẩn:
 * - "Nam Giang, ngày 23 tháng 11 năm 2026"
 * - Các ngày từ 01 đến 09 và tháng 01, 02 giữ số 0 ở trước theo quy định NĐ 30/2020/NĐ-CP
 */
export function formatVietnameseDate(diaDanh: string, dateStr: string): string {
  const place = (diaDanh || '......').trim();
  if (!dateStr) {
    return `${place}, ngày ... tháng ... năm 2026`;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return `${place}, ngày ... tháng ... năm 2026`;
  }
  const [year, monthRaw, dayRaw] = parts;
  const dayNum = parseInt(dayRaw, 10);
  const monthNum = parseInt(monthRaw, 10);

  const dayFormatted = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
  // Theo NĐ 30/2020/NĐ-CP: Tháng 1 và tháng 2 phải có số 0 đứng trước (01, 02)
  const monthFormatted = monthNum < 3 ? `0${monthNum}` : `${monthNum}`;

  return `${place}, ngày ${dayFormatted} tháng ${monthFormatted} năm ${year}`;
}

/**
 * Chuẩn hóa từng dòng Căn cứ ban hành:
 * - Các dòng trên kết thúc bằng dấu chấm phẩy `;`
 * - Dòng cuối cùng kết thúc bằng dấu chấm `.`
 */
export function formatCanCuLine(text: string, isLast: boolean): string {
  const cleaned = text.trim().replace(/[;.,]+$/, '');
  if (!cleaned) return '';
  return isLast ? `${cleaned}.` : `${cleaned};`;
}

/**
 * Phân tích từng dòng Nội dung văn bản để nhận diện:
 * - 'ROMAN_SECTION': I., II., III., IV., V... hoặc PHẦN I, CHƯƠNG I -> In hoa, đậm
 * - 'NUMBER_SUBSECTION': 1., 2., 3. hoặc Điều 1., Điều 2. -> Đậm
 * - 'ALPHA_ITEM': a), b), c), đ) -> Nghiêng
 * - 'BULLET': - hoặc + hoặc * -> Thụt đầu dòng chuẩn
 * - 'PARAGRAPH': Đoạn văn thông thường -> Thụt đầu dòng 1.27cm, căn đều 2 bên
 */
export type LineStyleType =
  | 'ROMAN_SECTION'
  | 'NUMBER_SUBSECTION'
  | 'DIEU_CLAUSE'
  | 'ALPHA_ITEM'
  | 'BULLET'
  | 'PARAGRAPH';

export interface ParsedBodyLine {
  raw: string;
  type: LineStyleType;
  prefix?: string;
  rest?: string;
}

export function parseBodyLines(content: string): ParsedBodyLine[] {
  const rawLines = content.split(/\r?\n/);
  const result: ParsedBodyLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // 1. Mục La Mã: I., II., III., IV., V., VI., VII., VIII., IX., X.
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s+/i.test(trimmed)) {
      result.push({
        raw: trimmed.toUpperCase(),
        type: 'ROMAN_SECTION'
      });
      continue;
    }

    // 2. Điều khoản: Điều 1., Điều 2.
    const dieuMatch = trimmed.match(/^(Điều\s+\d+\.)\s*(.*)$/i);
    if (dieuMatch) {
      result.push({
        raw: trimmed,
        type: 'DIEU_CLAUSE',
        prefix: dieuMatch[1],
        rest: dieuMatch[2]
      });
      continue;
    }

    // 3. Mục số: 1., 2., 3., 1.1., 2.1.
    if (/^\d+(\.\d+)?\.\s+/.test(trimmed)) {
      result.push({
        raw: trimmed,
        type: 'NUMBER_SUBSECTION'
      });
      continue;
    }

    // 4. Điểm chữ cái: a), b), c), d), đ), e)
    if (/^[a-zđ]\)\s+/i.test(trimmed)) {
      result.push({
        raw: trimmed,
        type: 'ALPHA_ITEM'
      });
      continue;
    }

    // 5. Gạch đầu dòng: -, +, •
    if (/^[-+•]\s+/.test(trimmed)) {
      result.push({
        raw: trimmed,
        type: 'BULLET'
      });
      continue;
    }

    // 6. Đoạn văn thông thường
    result.push({
      raw: trimmed,
      type: 'PARAGRAPH'
    });
  }

  return result;
}

/**
 * Tổng hợp toàn bộ danh sách Nơi nhận (bao gồm checkbox đã chọn + tùy chỉnh + Lưu: VT)
 */
export function buildFullRecipients(doc: DocumentData): string[] {
  const items: string[] = [];

  for (const r of doc.noiNhanList) {
    const t = r.trim();
    if (t) items.push(t.replace(/;+$/, '') + ';');
  }

  if (doc.noiNhanTuyChinh && doc.noiNhanTuyChinh.trim()) {
    const customParts = doc.noiNhanTuyChinh
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const c of customParts) {
      const cleaned = c.replace(/^[-+•]\s*/, '').replace(/[;.]+$/, '');
      if (cleaned) items.push(`${cleaned};`);
    }
  }

  const luu = (doc.luuVt || '').trim();
  if (luu) {
    const cleanLuu = luu.replace(/^[-+•]\s*/, '');
    items.push(cleanLuu.endsWith('.') ? cleanLuu : `${cleanLuu}.`);
  }

  return items;
}

/**
 * Chuẩn hóa Số văn bản theo từng khối:
 * - Khối Nhà nước (NĐ 30/2020/NĐ-CP): Tự động bỏ số 0 ở đầu các số văn bản nhỏ hơn 10 (ví dụ: 1, 2, 9 thay vì 01, 02).
 * - Khối Đảng (HD 05-HD/VPTW): Giữ nguyên số 0 ở đầu với số nhỏ hơn 10 (ví dụ: 01, 02, 09).
 */
export function normalizeSoVanBan(mode: AppMode, soVanBan: string): string {
  const trimmed = (soVanBan || '').trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num <= 0) return trimmed;
    if (mode === 'NHA_NUOC') {
      return `${num}`;
    } else {
      return num < 10 ? `0${num}` : `${num}`;
    }
  }
  return trimmed;
}

/**
 * Ghép Số và Ký hiệu hoàn chỉnh hiển thị trên văn bản
 * - Khối Nhà nước: "Số: 1/KH-UBND", "Số: 15/KH-UBND" (bỏ số 0 ở đầu với số < 10)
 * - Khối Đảng: "Số 01-NQ/ĐU", "Số 15-NQ/ĐU" (giữ số 0 ở đầu với số < 10)
 */
export function formatSoKyHieuDisplay(mode: AppMode, soVanBan: string, kyHieu: string): string {
  const normalizedSo = normalizeSoVanBan(mode, soVanBan);
  const so = normalizedSo || '...';
  const kh = (kyHieu || '').trim();
  if (mode === 'NHA_NUOC') {
    const normalizedKh = kh ? (kh.startsWith('/') ? kh : `/${kh}`) : '';
    return `Số: ${so}${normalizedKh}`;
  } else {
    const normalizedKh = kh ? (kh.startsWith('-') ? kh : `-${kh}`) : '';
    return `Số ${so}${normalizedKh}`;
  }
}

/**
 * Rà soát toàn diện văn bản hiện tại theo quy chuẩn Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW
 */
export function reviewDocument(doc: DocumentData): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const docTypeObj = DOC_TYPES.find((d) => d.code === doc.docType);
  const docTypeName = docTypeObj ? docTypeObj.name : doc.docType;

  // 1. Kiểm tra Số văn bản
  if (!doc.soVanBan || !doc.soVanBan.trim()) {
    issues.push({
      id: 'missing-number',
      level: 'ERROR',
      category: 'Số & Ký hiệu',
      title: 'Thiếu Số văn bản',
      detail: 'Văn bản chưa được cấp hoặc nhập Số thứ tự ban hành (ví dụ: 01, 15, 24...).',
      suggestion: 'Nhấn nút "Gợi ý số tiếp theo" ở cột trái để tự động lấy số lớn nhất + 1 theo loại văn bản.'
    });
  } else if (!/^\d+$/.test(doc.soVanBan.trim())) {
    issues.push({
      id: 'invalid-number-format',
      level: 'WARNING',
      category: 'Số & Ký hiệu',
      title: 'Số văn bản chứa ký tự không phải chữ số Ả Rập',
      detail: `Số văn bản hiện tại là "${doc.soVanBan}". Theo quy định, số của văn bản phải ghi bằng chữ số Ả Rập (01, 02, 15...).`,
      suggestion: 'Chỉ nhập chữ số vào ô Số văn bản, phần chữ viết tắt đặt ở ô Ký hiệu.'
    });
  } else {
    issues.push({
      id: 'pass-number',
      level: 'PASS',
      category: 'Số & Ký hiệu',
      title: 'Số văn bản hợp lệ',
      detail: `Đã ghi số văn bản: ${formatSoKyHieuDisplay(doc.mode, doc.soVanBan, doc.kyHieu)}.`
    });
  }

  // 2. Kiểm tra Ký hiệu văn bản theo chế độ
  const kh = (doc.kyHieu || '').trim();
  if (!kh) {
    issues.push({
      id: 'missing-symbol',
      level: 'ERROR',
      category: 'Số & Ký hiệu',
      title: 'Thiếu Ký hiệu văn bản',
      detail: 'Ký hiệu văn bản đang để trống.',
      suggestion: 'Bật checkbox "Tự ghép ký hiệu" để tự động ghép đúng quy chuẩn.'
    });
  } else if (doc.mode === 'NHA_NUOC' && !kh.startsWith('/')) {
    issues.push({
      id: 'wrong-state-symbol',
      level: 'WARNING',
      category: 'Số & Ký hiệu',
      title: 'Ký hiệu Khối Nhà nước (NĐ 30/2020) chưa đúng cấu trúc dấu gạch chéo (/)',
      detail: `Ký hiệu hiện tại "${kh}" không bắt đầu bằng dấu "/" (Chuẩn NĐ 30: Số: .../LOẠI-CƠQUAN, ví dụ: /KH-UBND).`,
      suggestion: 'Đổi ký hiệu bắt đầu bằng dấu "/" hoặc tích chọn "Tự ghép ký hiệu".'
    });
  } else if (doc.mode === 'DANG' && !kh.startsWith('-')) {
    issues.push({
      id: 'wrong-party-symbol',
      level: 'WARNING',
      category: 'Số & Ký hiệu',
      title: 'Ký hiệu Khối Đảng (HD 05-HD/VPTW) chưa đúng cấu trúc dấu gạch nối (-)',
      detail: `Ký hiệu hiện tại "${kh}" không bắt đầu bằng dấu "-" (Chuẩn HD 05: Số ...-LOẠI/CƠQUAN, ví dụ: -NQ/ĐU, -KH/ĐU).`,
      suggestion: 'Đổi ký hiệu bắt đầu bằng dấu "-" hoặc tích chọn "Tự ghép ký hiệu".'
    });
  } else {
    issues.push({
      id: 'pass-symbol',
      level: 'PASS',
      category: 'Số & Ký hiệu',
      title: 'Cấu trúc Ký hiệu chuẩn thể thức',
      detail: `Ký hiệu "${kh}" tuân thủ đúng quy chuẩn ${doc.mode === 'NHA_NUOC' ? 'Nghị định 30/2020/NĐ-CP' : 'Hướng dẫn 05-HD/VPTW'}.`
    });
  }

  // 3. Kiểm tra Địa danh và Ngày tháng năm ban hành
  if (!doc.diaDanh || !doc.diaDanh.trim()) {
    issues.push({
      id: 'missing-place',
      level: 'ERROR',
      category: 'Địa danh & Thời gian',
      title: 'Thiếu Địa danh ban hành văn bản',
      detail: 'Chưa nhập địa danh nơi cơ quan ban hành đóng trụ sở (ví dụ: Nam Giang, Việt Thanh...).',
      suggestion: 'Bổ sung địa danh tại Form soạn thảo hoặc lưu mặc định trong Tab Cấu hình đơn vị.'
    });
  }
  if (!doc.ngayBanHanh) {
    issues.push({
      id: 'missing-date',
      level: 'ERROR',
      category: 'Địa danh & Thời gian',
      title: 'Thiếu Ngày, tháng, năm ban hành',
      detail: 'Chưa chọn ngày ban hành văn bản.',
      suggestion: 'Chọn ngày ban hành hợp lệ.'
    });
  } else {
    issues.push({
      id: 'pass-date',
      level: 'PASS',
      category: 'Địa danh & Thời gian',
      title: 'Địa danh và ngày tháng ban hành đúng quy cách',
      detail: `Hiển thị chuẩn: "${formatVietnameseDate(doc.diaDanh, doc.ngayBanHanh)}" (tự động thêm số 0 cho ngày 01-09 và tháng 01, 02).`
    });
  }

  // 4. Kiểm tra Trích yếu nội dung (lỗi viết hoa toàn bộ hoặc viết thường chữ cái đầu)
  const ty = (doc.trichYeu || '').trim();
  if (!ty) {
    issues.push({
      id: 'missing-abstract',
      level: 'ERROR',
      category: 'Trích yếu nội dung',
      title: 'Thiếu Trích yếu nội dung văn bản',
      detail: 'Văn bản chưa có trích yếu tóm tắt nội dung chính.',
      suggestion: 'Nhập trích yếu ngắn gọn, bắt đầu bằng "Về việc..." hoặc "V/v..." (đối với Công văn).'
    });
  } else {
    const isAllUpper = ty === ty.toUpperCase() && ty !== ty.toLowerCase();
    const firstChar = ty.charAt(0);
    const isFirstLower = firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase();

    if (isAllUpper) {
      issues.push({
        id: 'abstract-all-caps',
        level: 'ERROR',
        category: 'Trích yếu nội dung',
        title: 'Sai quy định viết hoa Trích yếu (đang IN HOA toàn bộ)',
        detail: `Theo ${doc.mode === 'NHA_NUOC' ? 'NĐ 30/2020/NĐ-CP' : 'HD 05-HD/VPTW'}, trích yếu nội dung văn bản trình bày bằng chữ in thường (chỉ viết hoa chữ cái đầu câu và danh từ riêng), KHÔNG viết in hoa toàn bộ.`,
        suggestion: 'Chuyển trích yếu về chữ in thường, viết hoa chữ cái đầu tiên.'
      });
    } else if (isFirstLower) {
      issues.push({
        id: 'abstract-first-lower',
        level: 'WARNING',
        category: 'Trích yếu nội dung',
        title: 'Chữ cái đầu của Trích yếu chưa viết hoa',
        detail: `Trích yếu "${ty}" đang bắt đầu bằng chữ thường ("${firstChar}").`,
        suggestion: 'Viết hoa chữ cái đầu tiên của trích yếu (ví dụ: "Về việc...", "Kết quả...").'
      });
    } else {
      issues.push({
        id: 'pass-abstract',
        level: 'PASS',
        category: 'Trích yếu nội dung',
        title: 'Trích yếu nội dung đúng quy chuẩn viết hoa và trình bày',
        detail: `Trích yếu trình bày chữ in thường, cỡ chữ chuẩn ${doc.mode === 'NHA_NUOC' ? '13-14pt đậm kèm đường kẻ ngang bên dưới' : '14pt không có đường kẻ ngang (Khối Đảng)'}.`
      });
    }
  }

  // 5. Kiểm tra Căn cứ ban hành
  const nonEmptyCanCu = doc.canCu.map((c) => c.trim()).filter(Boolean);
  const typesRequiringCanCu = ['NQ', 'QĐ', 'KH', 'QC', 'HD'];
  if (typesRequiringCanCu.includes(doc.docType) && nonEmptyCanCu.length === 0) {
    issues.push({
      id: 'missing-cancu',
      level: 'WARNING',
      category: 'Căn cứ ban hành',
      title: `Văn bản loại "${docTypeName}" thiếu Căn cứ ban hành`,
      detail: `Đối với ${docTypeName}, phần mở đầu thường phải nêu các căn cứ pháp lý, văn bản chỉ đạo của cấp trên hoặc thực tiễn làm cơ sở ban hành.`,
      suggestion: 'Nhấn "+ Thêm dòng căn cứ" ở cột trái để bổ sung ít nhất 1-2 căn cứ pháp lý.'
    });
  } else if (nonEmptyCanCu.length > 0) {
    issues.push({
      id: 'pass-cancu',
      level: 'PASS',
      category: 'Căn cứ ban hành',
      title: `Đã có ${nonEmptyCanCu.length} dòng Căn cứ ban hành đúng dấu câu`,
      detail: 'Hệ thống tự động chuẩn hóa chữ in nghiêng, kết thúc các dòng trên bằng dấu chấm phẩy (;) và dòng cuối bằng dấu chấm (.).'
    });
  }

  // 6. Kiểm tra Nơi nhận & dòng Lưu: VT
  const luu = (doc.luuVt || '').trim();
  const hasLuuVt = /lưu\s*:\s*vt/i.test(luu) || doc.noiNhanList.some((r) => /lưu\s*:\s*vt/i.test(r));
  if (!hasLuuVt) {
    issues.push({
      id: 'missing-luu-vt',
      level: 'ERROR',
      category: 'Nơi nhận',
      title: 'Thiếu nơi nhận "Lưu: VT" theo quy định bắt buộc',
      detail: 'Theo Phụ lục I Nghị định 30/2020/NĐ-CP và Hướng dẫn 05-HD/VPTW, dòng cuối cùng của mục Nơi nhận bắt buộc phải có cụm từ "Lưu: VT, ..." và kết thúc bằng dấu chấm (.).',
      suggestion: 'Nhập "Lưu: VT, VP." hoặc "Lưu: VT, hồ sơ." vào ô Lưu văn thư tại khu vực Nơi nhận.'
    });
  } else {
    issues.push({
      id: 'pass-luu-vt',
      level: 'PASS',
      category: 'Nơi nhận',
      title: 'Mục Nơi nhận có đầy đủ dòng "Lưu: VT"',
      detail: `Dòng cuối nơi nhận đã ghi chuẩn: "- ${luu.endsWith('.') ? luu : luu + '.'}".`
    });
  }

  // 7. Kiểm tra Thẩm quyền ký, Chức vụ và Họ tên người ký
  const qh = (doc.quyenHanKy || '').trim().toUpperCase();
  const cv = (doc.chucVuKy || '').trim().toUpperCase();
  const ht = (doc.hoTenKy || '').trim();

  if (!cv || !ht) {
    issues.push({
      id: 'missing-signer',
      level: 'ERROR',
      category: 'Thẩm quyền ký',
      title: 'Thiếu Chức vụ hoặc Họ tên người ký',
      detail: 'Chưa điền đầy đủ chức vụ hoặc họ và tên của người ký ban hành văn bản.',
      suggestion: 'Chọn nhanh người ký từ Dropdown hoặc nhập đầy đủ Chức vụ, Họ tên.'
    });
  } else {
    // Kiểm tra logic thẩm quyền ký:
    // Nếu chức vụ là PHÓ (PHÓ CHỦ TỊCH, PHÓ BÍ THƯ...) mà không có KT. hoặc K/T hoặc TM.
    const isDeputy = cv.includes('PHÓ');
    const hasKyThay = qh.includes('KT.') || qh.includes('K/T') || qh.includes('TM.') || qh.includes('T/M') || qh.includes('TUQ.');

    if (isDeputy && !hasKyThay) {
      issues.push({
        id: 'wrong-deputy-authority',
        level: 'ERROR',
        category: 'Thẩm quyền ký',
        title: 'Sai thể thức thẩm quyền ký đối với cấp Phó',
        detail: `Chức vụ người ký là "${cv}" nhưng dòng Quyền hạn ký đang để trống. Cấp Phó ký văn bản phải ghi rõ ký thay (KT. CHỦ TỊCH / K/T BÍ THƯ) hoặc thay mặt tập thể (TM. ỦY BAN NHÂN DÂN / T/M ĐẢNG ỦY).`,
        suggestion: doc.mode === 'NHA_NUOC'
          ? 'Điền Quyền hạn ký là "KT. CHỦ TỊCH" hoặc "TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH".'
          : 'Điền Quyền hạn ký là "T/M ĐẢNG ỦY" hoặc "K/T BÍ THƯ".'
      });
    } else if (doc.mode === 'DANG' && !qh && ['NQ', 'KH', 'BC', 'QĐ', 'KL'].includes(doc.docType)) {
      issues.push({
        id: 'missing-party-tm',
        level: 'WARNING',
        category: 'Thẩm quyền ký',
        title: 'Văn bản của cấp ủy Đảng nên ghi rõ "T/M ĐẢNG ỦY" hoặc "T/M BAN THƯỜNG VỤ"',
        detail: `Theo Hướng dẫn 05-HD/VPTW, văn bản ban hành nhân danh cấp ủy Đảng phải ghi quyền hạn thay mặt tập thể cấp ủy (T/M ĐẢNG ỦY, T/M BAN THƯỜNG VỤ...) phía trên chức vụ "${cv}".`,
        suggestion: 'Chọn quyền hạn "T/M ĐẢNG ỦY" hoặc "T/M BAN THƯỜNG VỤ".'
      });
    } else {
      issues.push({
        id: 'pass-signer',
        level: 'PASS',
        category: 'Thẩm quyền ký',
        title: 'Thẩm quyền ký, chức vụ và họ tên người ký hợp lệ',
        detail: `Người ký: ${qh ? qh + ' - ' : ''}${cv} (${ht}).`
      });
    }
  }

  return issues;
}
