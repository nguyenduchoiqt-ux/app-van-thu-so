export type AppMode = 'NHA_NUOC' | 'DANG';

export type TabKey = 'SOAN_THAO' | 'VAN_BAN_DEN' | 'RA_SOAT' | 'TRA_CUU' | 'LICH_SU' | 'CAUHINH';

export interface DocTypeInfo {
  code: string; // e.g., 'NQ', 'QĐ', 'KH', 'BC', 'TTr', 'CV', 'TB', 'BB', 'QC', 'HD', 'CT', 'KL', 'CTr', 'HĐ'
  name: string; // e.g., 'Kế hoạch'
  upperName: string; // e.g., 'KẾ HOẠCH'
  hasDocTitle: boolean; // Công văn không có dòng tên loại văn bản độc lập
  modes: AppMode[];
  description: string;
}

export interface SignerItem {
  id: string;
  quyenHan: string; // e.g. '', 'KT. CHỦ TỊCH', 'TM. ỦY BAN NHÂN DÂN', 'T/M ĐẢNG ỦY', 'K/T BÍ THƯ'
  chucVu: string;   // e.g. 'CHỦ TỊCH', 'PHÓ CHỦ TỊCH', 'BÍ THƯ', 'PHÓ BÍ THƯ'
  hoTen: string;    // e.g. 'Thái Thị Nga'
}

export interface UnitConfig {
  coQuanChuQuan: string;
  coQuanBanHanh: string;
  kyHieuCoQuan: string; // e.g. 'UBND' hoặc 'ĐU'
  diaDanh: string;      // e.g. 'Khe Sanh'
  signers: SignerItem[];
  commonRecipients: string[];
}

export interface AllConfigs {
  NHA_NUOC: UnitConfig;
  DANG: UnitConfig;
}

export interface ContractPartyInfo {
  tenDonVi: string;
  daiDien: string;
  chucVu: string;
  diaChi: string;
  mstCccd: string;
  dienThoai: string;
  soTaiKhoan: string;
}

export interface ClauseItem {
  tieuDe: string;
  noiDung: string;
}

export interface DynamicFormData {
  // 1. Hợp đồng (HĐ)
  hdBenA?: ContractPartyInfo;
  hdBenB?: ContractPartyInfo;
  hdNoiDungCongViec?: string;
  hdGiaTriSo?: string;
  hdGiaTriChu?: string;
  hdThoiHan?: string;
  hdPhuongThucThanhToan?: string;
  hdDieuKhoan?: ClauseItem[];

  // 2. Tờ trình (TTr)
  ttrSuCanThiet?: string;
  ttrNoiDungDeXuat?: string;
  ttrKinhPhiNguon?: string;
  ttrKienNghi?: string;

  // 3. Quyết định (QĐ)
  qdXetDeNghi?: string;
  qdDieuList?: ClauseItem[];

  // 4. Công văn (CV)
  cvNoiDung?: string;

  // 5. Biên bản (BB)
  bbThoiGianBatDau?: string;
  bbThoiGianKetThuc?: string;
  bbDiaDiem?: string;
  bbChuToa?: string;
  bbChuToaChucVu?: string;
  bbThuKy?: string;
  bbThuKyChucVu?: string;
  bbThanhPhan?: string;
  bbDienBien?: string;

  // 6. Kế hoạch (KH) / Báo cáo (BC) / Thông báo (TB) / Các loại khác
  sections?: ClauseItem[];
}

export interface DocumentData {
  id: string;
  mode: AppMode;
  docType: string; // code e.g. 'KH', 'BC', 'TTr', 'CV', 'NQ', 'HĐ', 'BB'
  coQuanChuQuan: string;
  coQuanBanHanh: string;
  kyHieuCoQuan: string;
  soVanBan: string; // e.g. '1' or '01'
  kyHieu: string;   // e.g. '/KH-UBND', '/HĐ-UBND' or '-NQ/ĐU'
  autoKyHieu: boolean;
  diaDanh: string;
  ngayBanHanh: string; // YYYY-MM-DD
  trichYeu: string;
  kinhGui: string; // Dùng cho Công văn, Tờ trình, Báo cáo (nếu có)
  canCu: string[];
  noiDung: string;
  quyenHanKy: string;
  chucVuKy: string;
  hoTenKy: string;
  noiNhanList: string[];
  noiNhanTuyChinh: string; // Các dòng nơi nhận nhập thêm (ngăn cách bởi xuống dòng hoặc dấu phẩy)
  luuVt: string; // e.g. 'Lưu: VT, VP.'
  dynamicData?: DynamicFormData;
  updatedAt: string;
  syncTimestamp?: number;
}

export interface PresetTemplate {
  id: string;
  title: string;
  mode: AppMode | 'BOTH';
  docType: string;
  trichYeu: string;
  kinhGui?: string;
  canCu: string[];
  noiDung: string;
  noiNhanList: string[];
  luuVt: string;
  dynamicData?: DynamicFormData;
}

export interface ReviewIssue {
  id: string;
  level: 'ERROR' | 'WARNING' | 'PASS';
  category: string;
  title: string;
  detail: string;
  suggestion?: string;
}
