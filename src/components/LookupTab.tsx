import React from 'react';
import { BookMarked, Ruler, Type, FileCode2, GitCompare } from 'lucide-react';
import { DOC_TYPES } from '../constants';
import { AppMode } from '../types';

interface LookupTabProps {
  mode: AppMode;
}

export const LookupTab: React.FC<LookupTabProps> = ({ mode }) => {
  const isState = mode === 'NHA_NUOC';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';
  const primaryBg = isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]';

  const fontSizeSpecs = [
    {
      component: '1. Quốc hiệu / Tiêu ngữ Khối Đảng (Dòng 1 ô phải)',
      nd30: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Cỡ 12 - 13pt, IN HOA, Đậm',
      hd05: 'ĐẢNG CỘNG SẢN VIỆT NAM — Cỡ 15pt, IN HOA, Đậm + Đường kẻ ngang nét liền bằng độ dài dòng chữ'
    },
    {
      component: '2. Tiêu ngữ Khối Nhà nước (Dòng 2 ô phải)',
      nd30: 'Độc lập - Tự do - Hạnh phúc — Cỡ 13 - 14pt, In thường, Đậm + Đường kẻ ngang bằng độ dài dòng chữ',
      hd05: 'Không có dòng Tiêu ngữ thứ 2'
    },
    {
      component: '3. Tên cơ quan cấp trên trực tiếp (Dòng 1 ô trái)',
      nd30: 'Cỡ 12 - 13pt, IN HOA, Đứng (không đậm)',
      hd05: 'Cỡ 12 - 13pt, IN HOA, Đứng (VD: ĐẢNG BỘ TỈNH VIỆT THANH)'
    },
    {
      component: '4. Tên cơ quan, tổ chức ban hành (Dòng 2 ô trái)',
      nd30: 'Cỡ 12 - 13pt, IN HOA, Đậm + Đường kẻ ngang 1/3 đến 1/2 độ dài dòng chữ',
      hd05: 'Cỡ 12 - 13pt, IN HOA, Đậm + Dấu hoa thị (*) đặt căn giữa bên dưới'
    },
    {
      component: '5. Số và Ký hiệu văn bản',
      nd30: 'Cỡ 13pt, In thường, Đứng — Định dạng: Số: .../LOẠI-CQ (VD: Số: 15/KH-UBND)',
      hd05: 'Cỡ 13pt, In thường, Đứng — Định dạng: Số ...-LOẠI/CQ (VD: Số 15-NQ/ĐU)'
    },
    {
      component: '6. Địa danh và ngày, tháng, năm ban hành',
      nd30: 'Cỡ 13 - 14pt, In thường, Nghiêng (VD: Nam Giang, ngày 05 tháng 02 năm 2026)',
      hd05: 'Cỡ 13 - 14pt, In thường, Nghiêng'
    },
    {
      component: '7. Tên loại văn bản (KẾ HOẠCH, BÁO CÁO, NGHỊ QUYẾT...)',
      nd30: 'Cỡ 14 - 15pt, IN HOA, Đậm, căn giữa',
      hd05: 'Cỡ 14 - 15pt, IN HOA, Đậm, căn giữa'
    },
    {
      component: '8. Trích yếu nội dung văn bản',
      nd30: 'Cỡ 13 - 14pt, In thường, Đậm + Đường kẻ ngang 1/3 đến 1/2 bên dưới',
      hd05: 'Cỡ 14pt, In thường, KHÔNG có đường kẻ ngang bên dưới'
    },
    {
      component: '9. Căn cứ ban hành',
      nd30: 'Cỡ 13 - 14pt, In thường, Nghiêng; cuối mỗi dòng có dấu (;), dòng cuối dấu (.)',
      hd05: 'Cỡ 13 - 14pt, In thường, Nghiêng; cuối mỗi dòng có dấu (;), dòng cuối dấu (.)'
    },
    {
      component: '10. Nội dung văn bản (Body)',
      nd30: 'Cỡ 13 - 14pt, Đứng, căn đều 2 bên (Justify), lùi đầu dòng 1.27cm (720 twips)',
      hd05: 'Cỡ 14pt, Đứng, căn đều 2 bên (Justify), lùi đầu dòng 1.27cm'
    },
    {
      component: '11. Quyền hạn, Chức vụ & Họ tên người ký',
      nd30: 'Quyền hạn & Chức vụ: Cỡ 13 - 14pt, IN HOA, Đậm. Họ tên: Cỡ 13 - 14pt, Đậm (cách 4 dòng trắng)',
      hd05: 'Quyền hạn (T/M ĐẢNG ỦY...) & Chức vụ: Cỡ 13 - 14pt, IN HOA, Đậm. Họ tên: Cỡ 14pt, Đậm'
    },
    {
      component: '12. Nơi nhận',
      nd30: 'Chữ "Nơi nhận:": Cỡ 12pt, Nghiêng đậm. Danh sách nơi nhận: Cỡ 11pt, Đứng. Cuối có "- Lưu: VT, ... ."',
      hd05: 'Chữ "Nơi nhận:": Cỡ 12pt, Nghiêng đậm (hoặc gạch chân). Danh sách: Cỡ 11 - 12pt, Đứng'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. THÔNG SỐ LỀ TRANG A4 & ĐỊNH DẠNG ĐOẠN VĂN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Ruler className={`w-5 h-5 ${primaryText}`} />
          <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
            1. Quy chuẩn Khổ giấy A4, Canh lề trang & Khoảng cách đoạn (SPEC_THE_THUC.md)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Khổ giấy chuẩn</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">A4 Dọc (210 × 297 mm)</div>
            <div className="text-[11px] text-slate-500">11906 × 16838 twips</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Lề trên (Top)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">20 mm (2.0 cm)</div>
            <div className="text-[11px] text-slate-500">1134 twips (DOCX)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Lề dưới (Bottom)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">20 mm (2.0 cm)</div>
            <div className="text-[11px] text-slate-500">1134 twips (DOCX)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Lề trái (Left - Đóng ghim)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">30 mm (3.0 cm)</div>
            <div className="text-[11px] text-slate-500">1701 twips (DOCX)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Lề phải (Right)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">15 mm (1.5 cm)</div>
            <div className="text-[11px] text-slate-500">850 twips (DOCX)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Thụt đầu dòng & Giãn dòng</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">1.27 cm (720 twips)</div>
            <div className="text-[11px] text-slate-500">Line 1.15 - 1.5 • Before/After 6pt</div>
          </div>
        </div>
      </div>

      {/* 2. BẢNG ĐỐI CHIẾU CỠ CHỮ & KIỂU CHỮ GIỮA NĐ 30/2020 VÀ HD 05-HD/VPTW */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitCompare className={`w-5 h-5 ${primaryText}`} />
            <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
              2. Bảng tra cứu đối chiếu quy chuẩn Cỡ chữ & Trình bày (NĐ 30/2020 vs HD 05-HD/VPTW)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Phông chữ bắt buộc: <strong>Times New Roman</strong> (Unicode TCVN 6909:2001), màu đen (#000000)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-3 px-4 font-bold w-1/4">Thành phần thể thức</th>
                <th className="py-3 px-4 font-bold w-[37.5%] text-[#1e4b7a] bg-blue-50/60">
                  Khối Nhà nước (Nghị định 30/2020/NĐ-CP)
                </th>
                <th className="py-3 px-4 font-bold w-[37.5%] text-[#b91c1c] bg-red-50/60">
                  Khối Đảng (Hướng dẫn 05-HD/VPTW)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {fontSizeSpecs.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-semibold text-slate-800">{row.component}</td>
                  <td className="py-3 px-4 text-slate-700">{row.nd30}</td>
                  <td className="py-3 px-4 text-slate-700">{row.hd05}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. BẢNG MÃ VIẾT TẮT CÁC LOẠI VĂN BẢN HÀNH CHÍNH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <BookMarked className={`w-5 h-5 ${primaryText}`} />
          <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
            3. Bảng mã Ký hiệu viết tắt các loại văn bản hành chính
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className={`text-white ${primaryBg}`}>
                <th className="py-2.5 px-4 font-bold w-16">STT</th>
                <th className="py-2.5 px-4 font-bold">Tên loại văn bản</th>
                <th className="py-2.5 px-4 font-bold">Ký hiệu viết tắt</th>
                <th className="py-2.5 px-4 font-bold">Mẫu ghép Số/Ký hiệu Nhà nước</th>
                <th className="py-2.5 px-4 font-bold">Mẫu ghép Số/Ký hiệu Đảng</th>
                <th className="py-2.5 px-4 font-bold">Phạm vi áp dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DOC_TYPES.map((dt, index) => (
                <tr key={dt.code} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-500">{index + 1}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{dt.name}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-block font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                      {dt.code}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[#1e4b7a]">
                    {dt.code === 'CV' ? 'Số: 15/UBND-VP' : `Số: 15/${dt.code}-UBND`}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[#b91c1c]">
                    {dt.modes.includes('DANG') ? `Số 15-${dt.code}/ĐU` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">
                    {dt.modes.length === 2
                      ? 'Nhà nước / Đảng'
                      : dt.modes.includes('NHA_NUOC')
                      ? 'Khối Nhà nước'
                      : 'Khối Đảng'}
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
