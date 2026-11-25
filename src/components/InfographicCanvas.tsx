import React from 'react';
import {
  Target,
  Flag,
  Compass,
  Lightbulb,
  Star,
  Award,
  Users,
  Cpu,
  Settings,
  Shield,
  BarChart3,
  BookOpen,
  Globe,
  Briefcase,
  Megaphone,
  Layers,
  Building2,
  Landmark,
  Leaf,
  Heart,
  GraduationCap,
  FlaskConical,
  FileText,
  CheckCircle2,
  Factory,
  Calendar,
  Check
} from 'lucide-react';
import { AppMode, UnitConfig } from '../types';
import {
  IncomingDocAnalysisResult,
  InfographicAspectRatio,
  InfographicDataResult,
  InfographicIconType,
  InfographicLayoutStyle,
  buildLocalInfographicFromAnalysis
} from '../services/geminiService';

export interface InfographicCanvasProps {
  canvasRef?: React.Ref<HTMLDivElement>;
  data: InfographicDataResult;
  analysisResult?: IncomingDocAnalysisResult | null;
  unitConfig: UnitConfig;
  mode: AppMode;
  aspectRatio: InfographicAspectRatio;
  layoutStyle: InfographicLayoutStyle;
  previewScale: number;
}

export function renderInfographicVectorIcon(
  iconType?: InfographicIconType | string,
  className = 'w-5 h-5'
): React.ReactNode {
  switch ((iconType || '').toLowerCase().trim()) {
    case 'target':
      return <Target className={className} />;
    case 'flag':
      return <Flag className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'lightbulb':
      return <Lightbulb className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'settings':
      return <Settings className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'chart':
      return <BarChart3 className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'megaphone':
      return <Megaphone className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'landmark':
      return <Landmark className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'graduation':
      return <GraduationCap className={className} />;
    case 'flask':
      return <FlaskConical className={className} />;
    case 'file':
      return <FileText className={className} />;
    case 'check':
      return <CheckCircle2 className={className} />;
    case 'factory':
      return <Factory className={className} />;
    default:
      return <Target className={className} />;
  }
}

export function getLockedInfographicDimensions(ratio: InfographicAspectRatio): {
  width: number;
  height: number;
} {
  switch (ratio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '4:3':
      return { width: 1440, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
  }
}

export const InfographicCanvas: React.FC<InfographicCanvasProps> = ({
  canvasRef,
  data,
  analysisResult,
  unitConfig,
  mode,
  aspectRatio,
  layoutStyle,
  previewScale
}) => {
  const isState = mode === 'NHA_NUOC';
  const { width: W, height: H } = getLockedInfographicDimensions(aspectRatio);

  // Chuẩn hóa dữ liệu động 100% từ data hoặc fallback từ analysisResult + unitConfig
  const fallbackBase = analysisResult
    ? buildLocalInfographicFromAnalysis(analysisResult, unitConfig, mode)
    : null;

  const coQuanBanHanh = (
    data.coQuanBanHanh ||
    fallbackBase?.coQuanBanHanh ||
    unitConfig.coQuanBanHanh ||
    unitConfig.coQuanChuQuan
  ).toUpperCase();

  const nhanVanBan = (
    data.nhanVanBan ||
    fallbackBase?.nhanVanBan ||
    unitConfig.coQuanBanHanh
  ).toUpperCase();

  const tieuDeChinh = (
    data.tieuDeChinh ||
    fallbackBase?.tieuDeChinh ||
    unitConfig.coQuanBanHanh
  ).toUpperCase();

  const dongNgayDiaDanh =
    data.dongNgayDiaDanh ||
    data.ngayDiaDanh ||
    fallbackBase?.dongNgayDiaDanh ||
    `${unitConfig.diaDanh}, ngày ${new Date().toLocaleDateString('vi-VN')}`;

  const khoiTongQuan = data.khoiTongQuan || {
    tieuDe: data.khoi1?.tieuDeKhoi || fallbackBase?.khoiTongQuan.tieuDe || 'TỔNG QUAN & MỤC TIÊU',
    nhanManh:
      data.khoi1?.tomTatNoiBat ||
      data.thongDiepTrongTam ||
      fallbackBase?.khoiTongQuan.nhanManh ||
      tieuDeChinh,
    iconType: fallbackBase?.khoiTongQuan.iconType || (isState ? 'target' : 'flag'),
    cacYChinh:
      Array.isArray(data.khoi1?.cacDiem) && data.khoi1!.cacDiem.length > 0
        ? data.khoi1!.cacDiem.slice(0, 4)
        : fallbackBase?.khoiTongQuan.cacYChinh || [tieuDeChinh]
  };

  const khoiTrongTam = data.khoiTrongTam || {
    tieuDe: data.khoi2?.tieuDeKhoi || fallbackBase?.khoiTrongTam.tieuDe || 'NỘI DUNG TRỌNG TÂM',
    cacThe:
      Array.isArray(data.khoi2?.cacMuc) && data.khoi2!.cacMuc.length > 0
        ? data.khoi2!.cacMuc.slice(0, 4)
        : fallbackBase?.khoiTrongTam.cacThe || []
  };

  const khoiTrienKhai = data.khoiTrienKhai || {
    tieuDe: data.khoi3?.tieuDeKhoi || fallbackBase?.khoiTrienKhai.tieuDe || 'TỔ CHỨC TRIỂN KHAI',
    cacNhom:
      Array.isArray(data.khoi3?.cacMuc) && data.khoi3!.cacMuc.length > 0
        ? data.khoi3!.cacMuc.slice(0, 5).map((m) => ({
            ten: m.tenNhom,
            chiTiet: m.noiDung,
            iconType: m.iconType
          }))
        : fallbackBase?.khoiTrienKhai.cacNhom || []
  };

  const khoiMocThoiGian = data.khoiMocThoiGian || {
    tieuDe: data.khoi4?.tieuDeKhoi || fallbackBase?.khoiMocThoiGian.tieuDe || 'TIẾN ĐỘ & LƯU Ý',
    cacMoc:
      Array.isArray(data.khoi4?.cacMoc) && data.khoi4!.cacMoc.length > 0
        ? data.khoi4!.cacMoc.slice(0, 3).map((m) => ({
            nhan: m.nhan,
            moTa: m.noiDung
          }))
        : fallbackBase?.khoiMocThoiGian.cacMoc || []
  };

  const dongChanTrang =
    data.dongChanTrang ||
    data.khauHieuHanhDong ||
    fallbackBase?.dongChanTrang ||
    `${unitConfig.coQuanBanHanh} (${unitConfig.coQuanChuQuan}) chủ trì theo dõi, đôn đốc thực hiện.`;

  const safeYChinh = Array.isArray(khoiTongQuan.cacYChinh)
    ? khoiTongQuan.cacYChinh.slice(0, 4)
    : [];
  const safeCacThe = Array.isArray(khoiTrongTam.cacThe)
    ? khoiTrongTam.cacThe.slice(0, 4)
    : [];
  const safeCacNhom = Array.isArray(khoiTrienKhai.cacNhom)
    ? khoiTrienKhai.cacNhom.slice(0, 5)
    : [];
  const safeCacMoc = Array.isArray(khoiMocThoiGian.cacMoc)
    ? khoiMocThoiGian.cacMoc.slice(0, 3)
    : [];

  const effectiveLayout: 'BENTO' | 'LIST' | 'TIMELINE' =
    layoutStyle === 'LIST'
      ? 'LIST'
      : layoutStyle === 'TIMELINE'
      ? 'TIMELINE'
      : 'BENTO';

  // Grid cột tự động cho khoiTrongTam (3 hoặc 4 thẻ)
  const trongTamGridColsClass =
    safeCacThe.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  // Grid cột tự động cho khoiTrienKhai (3, 4 hoặc 5 nhóm)
  const trienKhaiGridColsClass =
    safeCacNhom.length >= 5
      ? 'grid-cols-5'
      : safeCacNhom.length === 4
      ? 'grid-cols-4'
      : 'grid-cols-3';

  // ============================================================================
  // TẦNG 1: BANNER TIÊU ĐỀ (CẶP BĂNG RÔN HÌNH THANG CHÉO ĐỎ CỜ - XANH DƯƠNG ĐẬM)
  // ============================================================================
  const renderTier1HeaderBanner = () => {
    const isLandscape16x9 = aspectRatio === '16:9';
    const isLandscape4x3 = aspectRatio === '4:3';
    const isSquare = aspectRatio === '1:1';
    const isPortrait = aspectRatio === '9:16';

    return (
      <div
        className={`relative z-10 shrink-0 flex flex-col items-center text-center ${
          isLandscape16x9
            ? 'px-12 pt-5 pb-2'
            : isLandscape4x3
            ? 'px-9 pt-4 pb-2'
            : isSquare
            ? 'px-7 pt-4 pb-1.5'
            : 'px-8 pt-7 pb-3'
        }`}
      >
        {/* Dòng trên cùng căn giữa: Logo (/quoc-huy.png hoặc /co-dang.png) + coQuanBanHanh in đậm màu Xanh dương đậm (#0A3D6B) */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {isState ? (
            <img
              src="/quoc-huy.png"
              alt="Quốc huy"
              crossOrigin="anonymous"
              className={`${
                isPortrait
                  ? 'w-14 h-14'
                  : isLandscape16x9
                  ? 'w-12 h-12'
                  : isLandscape4x3
                  ? 'w-11 h-11'
                  : 'w-10 h-10'
              } object-contain drop-shadow-sm shrink-0`}
            />
          ) : (
            <img
              src="/co-dang.png"
              alt="Cờ Đảng"
              crossOrigin="anonymous"
              className={`${
                isPortrait
                  ? 'w-16 h-11'
                  : isLandscape16x9
                  ? 'w-14 h-10'
                  : 'w-12 h-8'
              } object-cover rounded-md ring-2 ring-[#C8102E]/40 shadow-sm shrink-0`}
            />
          )}
          <div className="text-left">
            <div
              contentEditable
              suppressContentEditableWarning
              style={{ color: '#0A3D6B' }}
              className={`${
                isPortrait
                  ? 'text-[23px]'
                  : isLandscape16x9
                  ? 'text-[22px]'
                  : isLandscape4x3
                  ? 'text-[19px]'
                  : 'text-[16.5px]'
              } font-black uppercase tracking-wider leading-tight outline-none`}
            >
              {coQuanBanHanh}
            </div>
            {unitConfig.coQuanBanHanh &&
              coQuanBanHanh !== unitConfig.coQuanBanHanh.toUpperCase() && (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ color: '#0F5CA8' }}
                  className={`${
                    isPortrait ? 'text-[14px]' : 'text-[12px]'
                  } font-bold uppercase tracking-wide outline-none`}
                >
                  ĐƠN VỊ TRIỂN KHAI: {unitConfig.coQuanBanHanh.toUpperCase()}
                </div>
              )}
          </div>
        </div>

        {/* Băng rôn 1 (nhanVanBan): Hình thang vát chéo 2 đầu, nền Đỏ cờ linear-gradient(90deg, #B91C1C, #DC2626) */}
        <div
          style={{
            background: 'linear-gradient(90deg, #B91C1C 0%, #DC2626 50%, #B91C1C 100%)',
            clipPath: 'polygon(22px 0%, calc(100% - 22px) 0%, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0% 50%)'
          }}
          className={`inline-flex items-center justify-center shadow-md ${
            isPortrait
              ? 'px-12 py-2 min-w-[420px]'
              : isLandscape16x9
              ? 'px-14 py-1.5 min-w-[440px]'
              : isLandscape4x3
              ? 'px-11 py-1.5 min-w-[360px]'
              : 'px-9 py-1 min-w-[300px]'
          }`}
        >
          <span
            contentEditable
            suppressContentEditableWarning
            className={`text-white font-extrabold uppercase tracking-widest outline-none ${
              isPortrait
                ? 'text-[21px]'
                : isLandscape16x9
                ? 'text-[20px]'
                : isLandscape4x3
                ? 'text-[17.5px]'
                : 'text-[15px]'
            }`}
          >
            {nhanVanBan}
          </span>
        </div>

        {/* Băng rôn 2 (tieuDeChinh): Đặt sát ngay dưới băng rôn đỏ, rộng hơn, vát chéo đồng bộ, nền Xanh dương đậm linear-gradient(90deg, #0B4F8A, #1262AB) */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0B4F8A 0%, #1262AB 50%, #0B4F8A 100%)',
            clipPath: 'polygon(28px 0%, calc(100% - 28px) 0%, 100% 50%, calc(100% - 28px) 100%, 28px 100%, 0% 50%)'
          }}
          className={`w-full flex items-center justify-center shadow-lg -mt-0.5 ${
            isPortrait
              ? 'max-w-[960px] px-12 py-3.5'
              : isLandscape16x9
              ? 'max-w-[1660px] px-16 py-2.5'
              : isLandscape4x3
              ? 'max-w-[1280px] px-12 py-2.5'
              : 'max-w-[960px] px-9 py-2'
          }`}
        >
          <h1
            contentEditable
            suppressContentEditableWarning
            className={`text-white font-black uppercase tracking-tight text-center outline-none ${
              isPortrait
                ? 'text-[28px] leading-[1.22]'
                : isLandscape16x9
                ? 'text-[27px] leading-[1.2]'
                : isLandscape4x3
                ? 'text-[23px] leading-[1.2]'
                : 'text-[19px] leading-[1.22]'
            }`}
          >
            {tieuDeChinh}
          </h1>
        </div>

        {/* Dòng dongNgayDiaDanh căn giữa bên dưới, chữ nghiêng đậm màu xanh than (#1E3A5F), hai bên có 2 vạch kẻ ngang mảnh màu xanh dương (#60A5FA) */}
        <div className="flex items-center justify-center gap-3 mt-1.5">
          <span
            style={{ backgroundColor: '#60A5FA' }}
            className={`${isSquare ? 'w-14' : 'w-24'} h-[2px] rounded-full`}
          />
          <span
            contentEditable
            suppressContentEditableWarning
            style={{ color: '#1E3A5F' }}
            className={`italic font-bold outline-none ${
              isPortrait
                ? 'text-[16.5px]'
                : isLandscape16x9
                ? 'text-[14.5px]'
                : isLandscape4x3
                ? 'text-[13.5px]'
                : 'text-[12.5px]'
            }`}
          >
            {dongNgayDiaDanh}
          </span>
          <span
            style={{ backgroundColor: '#60A5FA' }}
            className={`${isSquare ? 'w-14' : 'w-24'} h-[2px] rounded-full`}
          />
        </div>
      </div>
    );
  };

  // ============================================================================
  // KHỐI TỔNG QUAN (THẺ NỀN TRẮNG #FFFFFF, VIỀN #7DD3FC, THANH VIÊN THUỐC ĐỎ CỜ #C8102E)
  // ============================================================================
  const renderKhoiTongQuanCard = (sizeMode: '16:9' | '4:3' | '1:1' | '9:16') => {
    const is16x9 = sizeMode === '16:9';
    const is4x3 = sizeMode === '4:3';
    const is1x1 = sizeMode === '1:1';
    const is9x16 = sizeMode === '9:16';

    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#7DD3FC',
          boxShadow: '0 8px 22px -6px rgba(11, 79, 138, 0.12)'
        }}
        className={`relative rounded-2xl border-2 flex flex-col justify-between ${
          is9x16
            ? 'pt-7 pb-4 px-5'
            : is16x9
            ? 'pt-6 pb-3.5 px-5 h-full'
            : is4x3
            ? 'pt-6 pb-3 px-4 h-full'
            : 'pt-5 pb-2.5 px-3.5 h-full'
        }`}
      >
        {/* Thanh tiêu đề dạng viên thuốc (rounded-full) đè nổi trên mép trên: nền Đỏ cờ (#C8102E) */}
        <div
          style={{ backgroundColor: '#C8102E' }}
          className={`absolute -top-4 left-4 right-4 rounded-full shadow-md flex items-center gap-2.5 ${
            is9x16
              ? 'px-3.5 py-1.5'
              : is1x1
              ? 'px-2.5 py-1'
              : 'px-3 py-1'
          }`}
        >
          <div
            style={{ borderColor: '#C8102E', color: '#C8102E' }}
            className={`${
              is9x16 ? 'w-8 h-8' : is1x1 ? 'w-6 h-6' : 'w-7 h-7'
            } rounded-full bg-white border-2 flex items-center justify-center shrink-0 shadow-sm`}
          >
            {renderInfographicVectorIcon(
              khoiTongQuan.iconType,
              is9x16 ? 'w-4 h-4' : 'w-3.5 h-3.5'
            )}
          </div>
          <h3
            contentEditable
            suppressContentEditableWarning
            className={`text-white font-black uppercase tracking-wide outline-none leading-tight ${
              is9x16
                ? 'text-[18.5px]'
                : is16x9
                ? 'text-[16px]'
                : is4x3
                ? 'text-[14.5px]'
                : 'text-[13px]'
            }`}
          >
            {khoiTongQuan.tieuDe}
          </h3>
        </div>

        {/* Câu nhanManh in đậm màu Đỏ cờ (#B91C1C) đứng cạnh icon minh họa tinh gọn */}
        <div
          style={{
            backgroundColor: '#FFF5F5',
            borderColor: '#FECACA'
          }}
          className={`rounded-xl border flex items-start gap-2.5 shrink-0 ${
            is9x16
              ? 'p-3.5 mb-3 mt-1'
              : is16x9
              ? 'p-3 mb-2.5 mt-1'
              : is4x3
              ? 'p-2.5 mb-2 mt-1'
              : 'p-2 mb-1.5 mt-0.5'
          }`}
        >
          <div
            style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
            className={`${
              is9x16 ? 'w-9 h-9' : is1x1 ? 'w-7 h-7' : 'w-8 h-8'
            } rounded-lg flex items-center justify-center shrink-0 mt-0.5`}
          >
            {renderInfographicVectorIcon(
              khoiTongQuan.iconType,
              is9x16 ? 'w-5 h-5' : 'w-4 h-4'
            )}
          </div>
          <p
            contentEditable
            suppressContentEditableWarning
            style={{ color: '#B91C1C' }}
            className={`font-extrabold leading-snug outline-none ${
              is9x16
                ? 'text-[17px]'
                : is16x9
                ? 'text-[15px]'
                : is4x3
                ? 'text-[13.5px]'
                : 'text-[12px]'
            }`}
          >
            {khoiTongQuan.nhanManh}
          </p>
        </div>

        {/* Danh sách cacYChinh: chữ đen xanh sắc nét (#0F172A), mỗi ý gắn dấu tích tròn màu Đỏ cờ (#C8102E) với dấu ✓ trắng */}
        <div
          className={`flex-1 flex flex-col justify-around ${
            is9x16 ? 'gap-2.5' : is1x1 ? 'gap-1.5' : 'gap-2'
          }`}
        >
          {safeYChinh.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div
                style={{ backgroundColor: '#C8102E' }}
                className={`${
                  is9x16 ? 'w-6 h-6' : is1x1 ? 'w-4.5 h-4.5' : 'w-5 h-5'
                } rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
              >
                <Check className={is9x16 ? 'w-3.5 h-3.5 stroke-[3]' : 'w-3 h-3 stroke-[3]'} />
              </div>
              <span
                contentEditable
                suppressContentEditableWarning
                style={{ color: '#0F172A' }}
                className={`font-bold leading-snug outline-none ${
                  is9x16
                    ? 'text-[16px]'
                    : is16x9
                    ? 'text-[14.5px]'
                    : is4x3
                    ? 'text-[13px]'
                    : 'text-[11.8px]'
                }`}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // KHỐI TRỌNG TÂM (KHUNG NỀN XANH DA TRỜI NHẠT #E3F2FD, VIỀN #60A5FA, LƯỚI THẺ CON)
  // ============================================================================
  const renderKhoiTrongTamCard = (
    sizeMode: '16:9' | '4:3' | '1:1' | '9:16',
    forceColsClass?: string
  ) => {
    const is16x9 = sizeMode === '16:9';
    const is4x3 = sizeMode === '4:3';
    const is1x1 = sizeMode === '1:1';
    const is9x16 = sizeMode === '9:16';

    const gridCols =
      forceColsClass ||
      (is9x16 ? 'grid-cols-2' : trongTamGridColsClass);

    return (
      <div
        style={{
          backgroundColor: '#E3F2FD',
          borderColor: '#60A5FA',
          boxShadow: '0 8px 22px -6px rgba(15, 92, 168, 0.13)'
        }}
        className={`relative rounded-2xl border-2 flex flex-col justify-between ${
          is9x16
            ? 'pt-7 pb-4 px-4'
            : is16x9
            ? 'pt-6 pb-3.5 px-4 h-full'
            : is4x3
            ? 'pt-6 pb-3 px-3.5 h-full'
            : 'pt-5 pb-2.5 px-3 h-full'
        }`}
      >
        {/* Thanh tiêu đề dạng viên thuốc đặt trên đỉnh: nền Xanh dương đậm (#0F5CA8), đầu trái có huy hiệu tròn icon xanh dương */}
        <div
          style={{ backgroundColor: '#0F5CA8' }}
          className={`absolute -top-4 left-4 right-4 rounded-full shadow-md flex items-center gap-2.5 ${
            is9x16
              ? 'px-3.5 py-1.5'
              : is1x1
              ? 'px-2.5 py-1'
              : 'px-3 py-1'
          }`}
        >
          <div
            style={{ borderColor: '#0F5CA8', color: '#0F5CA8' }}
            className={`${
              is9x16 ? 'w-8 h-8' : is1x1 ? 'w-6 h-6' : 'w-7 h-7'
            } rounded-full bg-white border-2 flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Layers className={is9x16 ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </div>
          <h3
            contentEditable
            suppressContentEditableWarning
            className={`text-white font-black uppercase tracking-wide outline-none leading-tight ${
              is9x16
                ? 'text-[18.5px]'
                : is16x9
                ? 'text-[16px]'
                : is4x3
                ? 'text-[14.5px]'
                : 'text-[13px]'
            }`}
          >
            {khoiTrongTam.tieuDe}
          </h3>
        </div>

        {/* Lưới thẻ con chia cột tự động theo cacThe.length */}
        <div className={`grid ${gridCols} gap-3 flex-1 min-h-0 items-stretch mt-1`}>
          {safeCacThe.map((the, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#93C5FD'
              }}
              className={`rounded-xl border-2 shadow-sm flex flex-col justify-between ${
                is9x16
                  ? 'p-3.5'
                  : is16x9
                  ? 'p-3'
                  : is4x3
                  ? 'p-2.5'
                  : 'p-2'
              }`}
            >
              {/* 1. Đỉnh thẻ: Icon vector màu Xanh dương đậm (#0B4F8A) cỡ lớn căn giữa */}
              <div className="flex flex-col items-center">
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#0B4F8A',
                    borderColor: '#BFDBFE'
                  }}
                  className={`${
                    is9x16
                      ? 'w-12 h-12 mb-2'
                      : is16x9
                      ? 'w-11 h-11 mb-2'
                      : is4x3
                      ? 'w-9 h-9 mb-1.5'
                      : 'w-8 h-8 mb-1'
                  } rounded-full border flex items-center justify-center shrink-0`}
                >
                  {renderInfographicVectorIcon(
                    the.iconType,
                    is9x16
                      ? 'w-6 h-6'
                      : is16x9
                      ? 'w-5 h-5'
                      : 'w-4 h-4'
                  )}
                </div>

                {/* 2. Dải tiêu đề ở giữa: Thanh bo góc nền Đỏ cờ (#C8102E), chữ trắng in hoa đậm (cho phép xuống 2 dòng, tuyệt đối không dùng truncate hay ...) */}
                <div
                  style={{ backgroundColor: '#C8102E' }}
                  className={`w-full rounded-lg text-center flex items-center justify-center shadow-sm ${
                    is9x16
                      ? 'px-2.5 py-1.5 min-h-[46px] mb-2'
                      : is16x9
                      ? 'px-2 py-1.5 min-h-[42px] mb-2'
                      : is4x3
                      ? 'px-1.5 py-1 min-h-[38px] mb-1.5'
                      : 'px-1.5 py-1 min-h-[34px] mb-1'
                  }`}
                >
                  <h4
                    contentEditable
                    suppressContentEditableWarning
                    className={`text-white font-black uppercase leading-tight break-words outline-none ${
                      is9x16
                        ? 'text-[15.5px]'
                        : is16x9
                        ? 'text-[13.5px]'
                        : is4x3
                        ? 'text-[12px]'
                        : 'text-[11px]'
                    }`}
                  >
                    {the.soThuTu ? `${the.soThuTu}. ` : ''}
                    {the.tieuDe}
                  </h4>
                </div>
              </div>

              {/* 3. Thân thẻ: Nội dung noiDung màu #0F172A căn đều vừa khít */}
              <div className="flex-1 flex items-center">
                <p
                  contentEditable
                  suppressContentEditableWarning
                  style={{ color: '#0F172A' }}
                  className={`font-semibold leading-snug text-center w-full outline-none ${
                    is9x16
                      ? 'text-[15px]'
                      : is16x9
                      ? 'text-[13.2px]'
                      : is4x3
                      ? 'text-[11.8px]'
                      : 'text-[11px]'
                  }`}
                >
                  {the.noiDung}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TẦNG 3: KHỐI TRIỂN KHAI (THANH VIÊN THUỐC XANH DƯƠNG ĐẬM #0F5CA8 CĂN GIỮA + LƯỚI NGANG)
  // ============================================================================
  const renderKhoiTrienKhaiTier = (
    sizeMode: '16:9' | '4:3' | '1:1' | '9:16',
    forceColsClass?: string
  ) => {
    const is16x9 = sizeMode === '16:9';
    const is4x3 = sizeMode === '4:3';
    const is1x1 = sizeMode === '1:1';
    const is9x16 = sizeMode === '9:16';

    const gridCols =
      forceColsClass ||
      (is9x16 ? 'grid-cols-2' : trienKhaiGridColsClass);

    return (
      <div className="relative flex flex-col">
        {/* Thanh tiêu đề dạng viên thuốc căn giữa trên cùng: nền Xanh dương đậm (#0F5CA8), chữ trắng in hoa kèm icon trắng */}
        <div className="flex justify-center mb-2">
          <div
            style={{ backgroundColor: '#0F5CA8' }}
            className={`inline-flex items-center gap-2 rounded-full shadow-md ${
              is9x16
                ? 'px-6 py-1.5'
                : is16x9
                ? 'px-6 py-1'
                : is4x3
                ? 'px-5 py-1'
                : 'px-4 py-0.5'
            }`}
          >
            <Building2 className={is9x16 ? 'w-4 h-4 text-white' : 'w-3.5 h-3.5 text-white'} />
            <h3
              contentEditable
              suppressContentEditableWarning
              className={`text-white font-black uppercase tracking-wider outline-none ${
                is9x16
                  ? 'text-[17.5px]'
                  : is16x9
                  ? 'text-[15px]'
                  : is4x3
                  ? 'text-[13.5px]'
                  : 'text-[12px]'
              }`}
            >
              {khoiTrienKhai.tieuDe}
            </h3>
          </div>
        </div>

        {/* Lưới ngang tự chia cột theo cacNhom.length */}
        <div className={`grid ${gridCols} gap-3 items-stretch`}>
          {safeCacNhom.map((nhom, idx) => (
            <div
              key={idx}
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
                borderColor: '#7DD3FC',
                boxShadow: '0 4px 12px -3px rgba(10, 61, 107, 0.1)'
              }}
              className={`rounded-2xl border-2 flex flex-col justify-between ${
                is9x16
                  ? 'p-3.5'
                  : is16x9
                  ? 'p-3'
                  : is4x3
                  ? 'p-2.5'
                  : 'p-2'
              }`}
            >
              {/* Đầu thẻ có vòng tròn nền Xanh dương đậm (#0F5CA8) chứa icon trắng đứng cạnh ten in hoa đậm màu Xanh dương đậm (#0A3D6B) */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  style={{ backgroundColor: '#0F5CA8' }}
                  className={`${
                    is9x16
                      ? 'w-9 h-9'
                      : is16x9
                      ? 'w-8 h-8'
                      : is4x3
                      ? 'w-7 h-7'
                      : 'w-6 h-6'
                  } rounded-full text-white flex items-center justify-center shrink-0 shadow-sm`}
                >
                  {renderInfographicVectorIcon(
                    nhom.iconType,
                    is9x16 ? 'w-4.5 h-4.5' : is1x1 ? 'w-3.5 h-3.5' : 'w-4 h-4'
                  )}
                </div>
                <h4
                  contentEditable
                  suppressContentEditableWarning
                  style={{ color: '#0A3D6B' }}
                  className={`font-black uppercase leading-tight break-words outline-none ${
                    is9x16
                      ? 'text-[15.5px]'
                      : is16x9
                      ? 'text-[13.5px]'
                      : is4x3
                      ? 'text-[12px]'
                      : 'text-[11px]'
                  }`}
                >
                  {nhom.ten}
                </h4>
              </div>

              {/* Bên dưới là chiTiet chữ #1E293B gọn gàng */}
              <p
                contentEditable
                suppressContentEditableWarning
                style={{ color: '#1E293B' }}
                className={`font-semibold leading-snug outline-none ${
                  is9x16
                    ? 'text-[14.5px]'
                    : is16x9
                    ? 'text-[12.8px]'
                    : is4x3
                    ? 'text-[11.5px]'
                    : 'text-[10.8px]'
                }`}
              >
                {nhom.chiTiet}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TẦNG 4: KHỐI MỐC THỜI GIAN (NGANG CHO 16:9, 4:3, 9:16 HOẶC DỌC CHO 1:1)
  // ============================================================================
  const renderKhoiMocThoiGianHorizontal = (sizeMode: '16:9' | '4:3' | '9:16') => {
    const is16x9 = sizeMode === '16:9';
    const is4x3 = sizeMode === '4:3';
    const is9x16 = sizeMode === '9:16';

    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#7DD3FC',
          boxShadow: '0 6px 16px -4px rgba(10, 61, 107, 0.1)'
        }}
        className={`rounded-2xl border-2 flex items-stretch overflow-hidden shrink-0 ${
          is9x16 ? 'p-2.5 gap-3' : is16x9 ? 'p-2 gap-3' : 'p-2 gap-2.5'
        }`}
      >
        {/* Bên trái là ô nhãn nền Đỏ cờ (#C8102E) bo góc lớn chứa icon lịch trắng + tieuDe chữ trắng in hoa */}
        <div
          style={{ backgroundColor: '#C8102E' }}
          className={`rounded-xl text-white flex items-center justify-center gap-2 shrink-0 shadow-sm ${
            is9x16
              ? 'px-4 py-2.5 min-w-[205px]'
              : is16x9
              ? 'px-5 py-2 min-w-[230px]'
              : 'px-3.5 py-2 min-w-[185px]'
          }`}
        >
          <Calendar className={is9x16 ? 'w-5 h-5 shrink-0' : 'w-4 h-4 shrink-0'} />
          <h3
            contentEditable
            suppressContentEditableWarning
            className={`font-black uppercase tracking-wide text-center leading-tight outline-none ${
              is9x16
                ? 'text-[16px]'
                : is16x9
                ? 'text-[14.5px]'
                : 'text-[13px]'
            }`}
          >
            {khoiMocThoiGian.tieuDe}
          </h3>
        </div>

        {/* Phần còn lại dàn ngang các mục cacMoc, ngăn cách giữa các mục bằng mũi tên kép (») màu Đỏ cờ (#C8102E) */}
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          {safeCacMoc.map((moc, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  backgroundColor: '#F8FCFF',
                  borderColor: '#BAE6FD'
                }}
                className={`flex-1 h-full rounded-xl border flex items-center gap-2.5 min-w-0 ${
                  is9x16 ? 'px-3 py-2' : is16x9 ? 'px-3.5 py-1.5' : 'px-2.5 py-1.5'
                }`}
              >
                <div
                  style={{ backgroundColor: '#FEE2E2', color: '#C8102E' }}
                  className={`${
                    is9x16 ? 'w-7 h-7' : 'w-6 h-6'
                  } rounded-full flex items-center justify-center shrink-0`}
                >
                  <CheckCircle2 className={is9x16 ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ color: '#C8102E' }}
                    className={`font-black uppercase leading-tight outline-none ${
                      is9x16
                        ? 'text-[15px]'
                        : is16x9
                        ? 'text-[13.5px]'
                        : 'text-[12px]'
                    }`}
                  >
                    {moc.nhan}
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ color: '#0F172A' }}
                    className={`font-bold leading-snug outline-none ${
                      is9x16
                        ? 'text-[13.8px]'
                        : is16x9
                        ? 'text-[12.8px]'
                        : 'text-[11.5px]'
                    }`}
                  >
                    {moc.moTa}
                  </div>
                </div>
              </div>

              {idx < safeCacMoc.length - 1 && (
                <span
                  style={{ color: '#C8102E' }}
                  className={`font-black select-none shrink-0 ${
                    is9x16 ? 'text-[24px]' : is16x9 ? 'text-[22px]' : 'text-[18px]'
                  }`}
                >
                  »
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Khối Mốc thời gian xếp dọc bên phải cho tỉ lệ 1:1 (1080×1080)
  const renderKhoiMocThoiGianVerticalForSquare = () => {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#7DD3FC',
          boxShadow: '0 8px 22px -6px rgba(11, 79, 138, 0.12)'
        }}
        className="relative rounded-2xl border-2 pt-5 pb-2.5 px-3.5 h-full flex flex-col justify-between"
      >
        {/* Thanh nhãn Đỏ cờ (#C8102E) trên đỉnh */}
        <div
          style={{ backgroundColor: '#C8102E' }}
          className="absolute -top-4 left-4 right-4 rounded-full shadow-md flex items-center gap-2 px-2.5 py-1"
        >
          <div
            style={{ borderColor: '#C8102E', color: '#C8102E' }}
            className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shrink-0 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <h3
            contentEditable
            suppressContentEditableWarning
            className="text-white font-black uppercase tracking-wide text-[13px] outline-none leading-tight"
          >
            {khoiMocThoiGian.tieuDe}
          </h3>
        </div>

        <div className="flex-1 flex flex-col justify-around gap-1.5 mt-1">
          {safeCacMoc.map((moc, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#F8FCFF',
                borderColor: '#BAE6FD'
              }}
              className="rounded-xl border p-2 flex items-start gap-2"
            >
              <span
                style={{ color: '#C8102E' }}
                className="font-black text-[15px] leading-none mt-0.5 shrink-0"
              >
                »
              </span>
              <div className="min-w-0 flex-1">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ color: '#C8102E' }}
                  className="text-[11.8px] font-black uppercase leading-tight outline-none"
                >
                  {moc.nhan}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ color: '#0F172A' }}
                  className="text-[11.2px] font-bold leading-snug outline-none"
                >
                  {moc.moTa}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // KIỂU PHỤ 1: DANH SÁCH TRỌNG TÂM (LIST) - ĐỒNG BỘ HỆ MÀU TRẮNG - XANH DA TRỜI - XANH DƯƠNG ĐẬM - ĐỎ CỜ
  // ============================================================================
  const renderListVariantBody = () => {
    const isPortrait = aspectRatio === '9:16';
    const is1x1 = aspectRatio === '1:1';
    const is4x3 = aspectRatio === '4:3';

    return (
      <div
        className={`relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col justify-between ${
          isPortrait
            ? 'px-8 py-4 gap-5'
            : aspectRatio === '16:9'
            ? 'px-12 py-3.5 gap-3.5'
            : is4x3
            ? 'px-9 py-3 gap-3'
            : 'px-7 py-2.5 gap-2.5'
        }`}
      >
        <div
          className={`grid ${
            isPortrait ? 'grid-cols-1 gap-5' : 'grid-cols-12 gap-4'
          } flex-1 min-h-0 items-stretch`}
        >
          <div className={isPortrait ? '' : 'col-span-5 h-full'}>
            {renderKhoiTongQuanCard(aspectRatio)}
          </div>

          {/* Cột phải trình bày dạng Danh sách ngang cho khoiTrongTam */}
          <div
            style={{
              backgroundColor: '#E3F2FD',
              borderColor: '#60A5FA'
            }}
            className={`${
              isPortrait ? 'flex-1' : 'col-span-7 h-full'
            } relative rounded-2xl border-2 pt-6 pb-3 px-4 flex flex-col justify-between shadow-md`}
          >
            <div
              style={{ backgroundColor: '#0F5CA8' }}
              className="absolute -top-4 left-4 right-4 rounded-full shadow-md flex items-center gap-2.5 px-3 py-1"
            >
              <div
                style={{ borderColor: '#0F5CA8', color: '#0F5CA8' }}
                className="w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3
                contentEditable
                suppressContentEditableWarning
                className={`text-white font-black uppercase tracking-wide outline-none ${
                  isPortrait ? 'text-[18px]' : is1x1 ? 'text-[13px]' : 'text-[15px]'
                }`}
              >
                {khoiTrongTam.tieuDe}
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-around gap-2 mt-1">
              {safeCacThe.map((the, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#93C5FD'
                  }}
                  className="rounded-xl border-2 px-3 py-2 flex items-center gap-3 shadow-sm"
                >
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#0B4F8A',
                      borderColor: '#BFDBFE'
                    }}
                    className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
                  >
                    {renderInfographicVectorIcon(the.iconType, 'w-5 h-5')}
                  </div>
                  <div
                    style={{ backgroundColor: '#C8102E' }}
                    className="px-3 py-1.5 rounded-lg text-white font-black uppercase text-[12px] w-44 shrink-0 text-center leading-tight"
                  >
                    <span contentEditable suppressContentEditableWarning className="outline-none">
                      {the.soThuTu}. {the.tieuDe}
                    </span>
                  </div>
                  <p
                    contentEditable
                    suppressContentEditableWarning
                    style={{ color: '#0F172A' }}
                    className={`font-semibold leading-snug flex-1 outline-none ${
                      isPortrait ? 'text-[15px]' : is1x1 ? 'text-[11.2px]' : 'text-[12.8px]'
                    }`}
                  >
                    {the.noiDung}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {renderKhoiTrienKhaiTier(aspectRatio, isPortrait ? 'grid-cols-2' : undefined)}
        </div>

        <div className="shrink-0">
          {renderKhoiMocThoiGianHorizontal(isPortrait ? '9:16' : aspectRatio === '16:9' ? '16:9' : '4:3')}
        </div>
      </div>
    );
  };

  // ============================================================================
  // KIỂU PHỤ 2: MỐC THỜI GIAN (TIMELINE) - ĐỒNG BỘ HỆ MÀU TRẮNG - XANH DA TRỜI - XANH DƯƠNG ĐẬM - ĐỎ CỜ
  // ============================================================================
  const renderTimelineVariantBody = () => {
    const isPortrait = aspectRatio === '9:16';
    const is4x3 = aspectRatio === '4:3';

    return (
      <div
        className={`relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col justify-between ${
          isPortrait
            ? 'px-8 py-4 gap-5'
            : aspectRatio === '16:9'
            ? 'px-12 py-3.5 gap-3.5'
            : is4x3
            ? 'px-9 py-3 gap-3'
            : 'px-7 py-2.5 gap-2.5'
        }`}
      >
        {/* Đưa Lộ trình / Mốc thời gian lên nổi bật ngay dưới Banner */}
        <div className="shrink-0">
          {renderKhoiMocThoiGianHorizontal(isPortrait ? '9:16' : aspectRatio === '16:9' ? '16:9' : '4:3')}
        </div>

        <div
          className={`grid ${
            isPortrait ? 'grid-cols-1 gap-5' : 'grid-cols-12 gap-4'
          } flex-1 min-h-0 items-stretch pt-2`}
        >
          <div className={isPortrait ? '' : 'col-span-5 h-full'}>
            {renderKhoiTongQuanCard(aspectRatio)}
          </div>
          <div className={isPortrait ? 'flex-1' : 'col-span-7 h-full'}>
            {renderKhoiTrongTamCard(aspectRatio, isPortrait ? 'grid-cols-2' : undefined)}
          </div>
        </div>

        <div className="shrink-0">
          {renderKhoiTrienKhaiTier(aspectRatio, isPortrait ? 'grid-cols-2' : undefined)}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      style={{
        width: `${W}px`,
        height: `${H}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        transform: `scale(${previewScale})`,
        transformOrigin: 'top left',
        fontFamily:
          '"Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: 'linear-gradient(180deg, #F8FCFF 0%, #EBF5FE 52%, #D7ECFC 100%)'
      }}
      className="relative flex flex-col justify-between select-text"
    >
      {/* =====================================================================
          NỀN TỔNG THỂ SÁNG THOÁNG (UNIFIED CIVIC CANVAS) & NHẬN DIỆN KHỐI Ở GÓC TRÊN TRÁI
         ===================================================================== */}
      {/* Dải sóng sáng xanh dương mờ tinh tế ở nền */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id="civicWaveBlue1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0F5CA8" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="civicCornerFlagRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C8102E" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="civicCornerGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Sóng sáng xanh dương mờ ở giữa và đáy */}
        <path
          d="M0,260 C460,180 920,340 1440,220 C1680,170 1820,210 1920,190 L1920,1080 L0,1080 Z"
          fill="url(#civicWaveBlue1)"
        />
        <circle cx="1760" cy="140" r="240" fill="#60A5FA" fillOpacity="0.1" />
        <circle cx="140" cy="920" r="260" fill="#38BDF8" fillOpacity="0.12" />

        {/* Họa tiết cờ Tổ quốc (Khối Nhà nước) hoặc cờ Đảng (Khối Đảng) cách điệu mềm ở góc trên trái */}
        <path
          d="M0,0 L390,0 C285,48 165,118 0,220 Z"
          fill="url(#civicCornerFlagRed)"
        />
        <path
          d="M0,220 C140,140 265,70 430,0 L465,0 C295,82 155,160 0,248 Z"
          fill="url(#civicCornerGold)"
        />
        {isState ? (
          /* Ngôi sao vàng 5 cánh cách điệu cho Khối Nhà nước */
          <polygon
            points="72,38 81,64 109,64 86,80 95,106 72,90 49,106 58,80 35,64 63,64"
            fill="#FACC15"
            fillOpacity="0.85"
          />
        ) : (
          /* Biểu trưng Đảng ánh vàng cách điệu góc trên trái cho Khối Đảng */
          <g opacity="0.88">
            <circle cx="72" cy="70" r="30" fill="none" stroke="#FACC15" strokeWidth="3.5" strokeDasharray="8 5" />
            <polygon
              points="72,46 78,63 96,63 81,73 87,90 72,80 57,90 63,73 48,63 66,63"
              fill="#FACC15"
            />
          </g>
        )}

        {/* Đường uốn lượn mảnh đỏ–xanh ở viền đáy để tạo chiều sâu hiện đại */}
        <path
          d="M0,1030 C520,1000 1080,1060 1920,1018 L1920,1045 L0,1045 Z"
          fill="#C8102E"
          fillOpacity="0.18"
        />
        <path
          d="M0,1040 C640,1015 1260,1062 1920,1025 L1920,1055 L0,1055 Z"
          fill="#0F5CA8"
          fillOpacity="0.22"
        />
      </svg>

      {/* =====================================================================
          TẦNG 1: BANNER TIÊU ĐỀ
         ===================================================================== */}
      {renderTier1HeaderBanner()}

      {/* =====================================================================
          PHẦN THÂN (TẦNG 2 -> TẦNG 3 -> TẦNG 4) THEO KIỂU BỐ CỤC & TỈ LỆ PIXEL KHÓA CỨNG
         ===================================================================== */}
      {effectiveLayout === 'LIST' ? (
        renderListVariantBody()
      ) : effectiveLayout === 'TIMELINE' ? (
        renderTimelineVariantBody()
      ) : aspectRatio === '16:9' || aspectRatio === '4:3' ? (
        /* ==================== BỐ CỤC BENTO 4 TẦNG NGANG CHUẨN CHO 16:9 (1920×1080) & 4:3 (1440×1080) ==================== */
        <div
          className={`relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col justify-between ${
            aspectRatio === '16:9'
              ? 'px-12 pt-4 pb-3 gap-4'
              : 'px-9 pt-4 pb-2.5 gap-3.5'
          }`}
        >
          {/* Tầng 2 – Khu trung tâm 2 cột (grid-cols-12, đối trọng Đỏ cờ col-span-5 – Xanh dương đậm col-span-7) */}
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
            <div className="col-span-5 h-full">
              {renderKhoiTongQuanCard(aspectRatio)}
            </div>
            <div className="col-span-7 h-full">
              {renderKhoiTrongTamCard(aspectRatio)}
            </div>
          </div>

          {/* Tầng 3 – khoiTrienKhai */}
          <div className="shrink-0">
            {renderKhoiTrienKhaiTier(aspectRatio)}
          </div>

          {/* Tầng 4 – khoiMocThoiGian */}
          <div className="shrink-0">
            {renderKhoiMocThoiGianHorizontal(aspectRatio)}
          </div>
        </div>
      ) : aspectRatio === '1:1' ? (
        /* ==================== BỐ CỤC BENTO TỈ LỆ 1:1 (1080×1080 px) ====================
           Banner -> Hàng giữa 2 cột (khoiTongQuan trái, khoiMocThoiGian xếp dọc phải) -> Lưới khoiTrongTam -> Hàng ngang khoiTrienKhai -> Footer */
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col justify-between px-7 pt-3.5 pb-2.5 gap-3">
          {/* Hàng giữa 2 cột: khoiTongQuan trái (7 cột) + khoiMocThoiGian xếp dọc phải (5 cột) */}
          <div className="grid grid-cols-12 gap-3.5 shrink-0 items-stretch">
            <div className="col-span-7">
              {renderKhoiTongQuanCard('1:1')}
            </div>
            <div className="col-span-5">
              {renderKhoiMocThoiGianVerticalForSquare()}
            </div>
          </div>

          {/* Lưới khoiTrongTam */}
          <div className="flex-1 min-h-0 pt-2">
            {renderKhoiTrongTamCard('1:1')}
          </div>

          {/* Hàng ngang khoiTrienKhai */}
          <div className="shrink-0">
            {renderKhoiTrienKhaiTier('1:1')}
          </div>
        </div>
      ) : (
        /* ==================== BỐ CỤC BENTO DỌC 9:16 (1080×1920 px) ====================
           Dàn dọc 5 tầng cỡ chữ lớn tối ưu màn hình điện thoại:
           Banner -> khoiTongQuan -> khoiTrongTam lưới 2×2 -> khoiTrienKhai lưới 2×2 -> khoiMocThoiGian -> Footer */
        <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col justify-between px-8 pt-4 pb-3.5 gap-5">
          {/* Tầng 2: khoiTongQuan */}
          <div className="shrink-0">
            {renderKhoiTongQuanCard('9:16')}
          </div>

          {/* Tầng 3: khoiTrongTam lưới 2×2 */}
          <div className="flex-1 min-h-0 pt-2">
            {renderKhoiTrongTamCard('9:16', 'grid-cols-2')}
          </div>

          {/* Tầng 4: khoiTrienKhai lưới 2×2 */}
          <div className="shrink-0">
            {renderKhoiTrienKhaiTier('9:16', 'grid-cols-2')}
          </div>

          {/* Tầng 5: khoiMocThoiGian */}
          <div className="shrink-0">
            {renderKhoiMocThoiGianHorizontal('9:16')}
          </div>
        </div>
      )}

      {/* =====================================================================
          THANH CHÂN TRANG MỎNG DƯỚI CÙNG: NỀN XANH DƯƠNG ĐẬM (#0A3D6B), VIỀN TRÊN ĐỎ CỜ (#C8102E)
         ===================================================================== */}
      <div
        style={{
          backgroundColor: '#0A3D6B',
          borderTop: '4px solid #C8102E'
        }}
        className={`relative z-10 shrink-0 flex items-center justify-between gap-4 text-white ${
          aspectRatio === '16:9'
            ? 'px-12 py-2.5'
            : aspectRatio === '4:3'
            ? 'px-9 py-2.5'
            : aspectRatio === '1:1'
            ? 'px-7 py-2'
            : 'px-8 py-3.5'
        }`}
      >
        <div
          contentEditable
          suppressContentEditableWarning
          className={`font-extrabold uppercase tracking-wider truncate outline-none ${
            aspectRatio === '9:16'
              ? 'text-[15.5px]'
              : aspectRatio === '1:1'
              ? 'text-[12px]'
              : 'text-[13.5px]'
          }`}
        >
          {dongChanTrang}
        </div>
        <div
          contentEditable
          suppressContentEditableWarning
          style={{ color: '#BAE6FD' }}
          className={`font-bold uppercase shrink-0 outline-none ${
            aspectRatio === '9:16'
              ? 'text-[14px]'
              : aspectRatio === '1:1'
              ? 'text-[11.5px]'
              : 'text-[12.5px]'
          }`}
        >
          {unitConfig.coQuanBanHanh} • {unitConfig.diaDanh}
        </div>
      </div>
    </div>
  );
};
