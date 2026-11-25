import React from 'react';
import { DOC_TYPES } from '../constants';
import { DocumentData } from '../types';
import {
  buildFullRecipients,
  formatCanCuLine,
  formatSoKyHieuDisplay,
  formatVietnameseDate,
  parseBodyLines
} from '../utils/docHelpers';

interface A4PreviewProps {
  doc: DocumentData;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ doc }) => {
  const isState = doc.mode === 'NHA_NUOC';
  const docTypeInfo = DOC_TYPES.find((t) => t.code === doc.docType);
  const hasDocTitle = docTypeInfo ? docTypeInfo.hasDocTitle : doc.docType !== 'CV';
  const upperTypeName = docTypeInfo ? docTypeInfo.upperName : doc.docType.toUpperCase();

  const soKyHieuText = formatSoKyHieuDisplay(doc.mode, doc.soVanBan, doc.kyHieu);
  const dateText = formatVietnameseDate(doc.diaDanh, doc.ngayBanHanh);
  const validCanCu = doc.canCu.map((c) => c.trim()).filter(Boolean);
  const parsedBody = parseBodyLines(doc.noiDung);
  const fullRecipients = buildFullRecipients(doc);

  const isContract = doc.docType === 'HĐ';
  const isMinutes = doc.docType === 'BB';
  const benA = doc.dynamicData?.hdBenA;
  const benB = doc.dynamicData?.hdBenB;

  return (
    <div className="w-full overflow-visible print-only-container">
      <div
        id="a4-preview-paper"
        className="a4-paper mx-auto shadow-2xl border border-slate-300 select-text"
        style={{
          width: '210mm',
          minHeight: '297mm',
          height: 'auto',
          overflow: 'visible',
          padding: '20mm 15mm 20mm 30mm',
          boxSizing: 'border-box',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000000',
          backgroundColor: '#ffffff'
        }}
      >
        {/* 1. BẢNG TIÊU ĐỀ GIÃN LỀ RỘNG 182mm (marginLeft: -12mm, marginRight: -5mm) ĐỂ HIỂN THỊ ĐÚNG 2 DÒNG CÂN ĐỐI */}
        <div
          className="mb-3"
          style={{
            marginLeft: '-12mm',
            marginRight: '-5mm',
            width: '182mm',
            display: 'grid',
            gridTemplateColumns: '82mm 95.3mm',
            columnGap: '4.7mm',
            alignItems: 'start'
          }}
        >
          {/* CỘT TRÁI (82mm): HIỂN THỊ ĐÚNG 2 DÒNG CƠ QUAN CẤP TRÊN & CƠ QUAN BAN HÀNH (12pt, whiteSpace: nowrap) */}
          <div className="text-center">
            {doc.coQuanChuQuan && doc.coQuanChuQuan.trim() && (
              <div
                className="uppercase leading-snug"
                style={{ fontSize: '12pt', fontWeight: 400, whiteSpace: 'nowrap' }}
              >
                {doc.coQuanChuQuan.trim()}
              </div>
            )}
            <div
              className="uppercase font-bold leading-snug"
              style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}
            >
              {doc.coQuanBanHanh.trim() || 'CƠ QUAN BAN HÀNH'}
            </div>

            {/* Phía dưới tên cơ quan: Khối Nhà nước kẻ ngang 1/3 - 1/2 ôm sát chữ; Khối Đảng dùng dấu hoa thị * */}
            {isState ? (
              <div className="flex justify-center mt-0.5 mb-1.5">
                <div className="border-b border-black" style={{ width: '96px' }} />
              </div>
            ) : (
              <div className="text-center font-bold leading-none my-0.5" style={{ fontSize: '14pt' }}>
                *
              </div>
            )}

            {/* Số và ký hiệu văn bản */}
            <div className="mt-1" style={{ fontSize: '13pt' }}>
              {soKyHieuText}
            </div>

            {/* Nếu là Công văn (CV), Trích yếu V/v đặt ngay dưới Số, ký hiệu theo đúng NĐ 30 */}
            {!hasDocTitle && doc.trichYeu && (
              <div
                className="mt-1.5 px-1 text-center leading-snug"
                style={{ fontSize: '12.5pt' }}
              >
                {doc.trichYeu}
              </div>
            )}
          </div>

          {/* CỘT PHẢI (95.3mm): QUỐC HIỆU (12pt đậm, nowrap) & TIÊU NGỮ (13pt đậm, nowrap) */}
          <div className="text-center">
            {isState ? (
              <>
                <div
                  className="uppercase font-bold leading-snug"
                  style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}
                >
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div
                  className="font-bold leading-snug"
                  style={{ fontSize: '13pt', whiteSpace: 'nowrap' }}
                >
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="flex justify-center mt-0.5 mb-1.5">
                  <div className="border-b border-black" style={{ width: '165px' }} />
                </div>
              </>
            ) : (
              <>
                {/* Khối Đảng: ĐẢNG CỘNG SẢN VIỆT NAM cỡ 15, in hoa, đậm, có đường kẻ ngang nét liền bằng đúng độ dài dòng chữ */}
                <div className="flex justify-center">
                  <div
                    className="uppercase font-bold leading-snug inline-block"
                    style={{
                      fontSize: '15pt',
                      whiteSpace: 'nowrap',
                      borderBottom: '1.2px solid #000000',
                      paddingBottom: '3px',
                      marginBottom: '8px'
                    }}
                  >
                    ĐẢNG CỘNG SẢN VIỆT NAM
                  </div>
                </div>
              </>
            )}

            {/* Địa danh và ngày, tháng, năm ban hành */}
            <div
              className="italic mt-1"
              style={{ fontSize: '13.5pt', whiteSpace: 'nowrap' }}
            >
              {dateText}
            </div>
          </div>
        </div>

        {/* 2. TÊN LOẠI VĂN BẢN & TRÍCH YẾU NỘI DUNG */}
        {hasDocTitle && (
          <div className="text-center mt-4 mb-3">
            <div
              className="uppercase font-bold tracking-wide"
              style={{ fontSize: '14pt' }}
            >
              {upperTypeName}
            </div>

            {doc.trichYeu && doc.trichYeu.trim() && (
              <div className="mt-1 flex flex-col items-center">
                <div
                  className={`max-w-[92%] leading-snug ${isState ? 'font-bold' : 'font-normal'}`}
                  style={{ fontSize: '13.5pt' }}
                >
                  {doc.trichYeu.trim()}
                </div>

                {/* Khối Nhà nước có đường kẻ ngang 1/3 - 1/2 ôm sát dưới trích yếu; Khối Đảng KHÔNG có */}
                {isState && (
                  <div className="border-b border-black mt-1" style={{ width: '135px' }} />
                )}
              </div>
            )}
          </div>
        )}

        {/* 2.1. Dòng Kính gửi: chữ đứng, in thường (KHÔNG in đậm), cỡ chữ 13.5-14pt theo đúng Nghị định 30/2020/NĐ-CP */}
        {doc.kinhGui && doc.kinhGui.trim() && (
          <div
            className="text-center font-normal my-2.5"
            style={{ fontSize: '13.5pt', fontWeight: 400 }}
          >
            Kính gửi: {doc.kinhGui.trim()}
          </div>
        )}

        {/* 3. CĂN CỨ BAN HÀNH */}
        {validCanCu.length > 0 && (
          <div className="mt-2.5 mb-2.5 space-y-1">
            {validCanCu.map((cc, index) => {
              const isLast = index === validCanCu.length - 1;
              const formattedLine = formatCanCuLine(cc, isLast);
              return (
                <p
                  key={index}
                  className="italic text-justify leading-relaxed"
                  style={{
                    fontSize: '13.5pt',
                    textIndent: '1.27cm'
                  }}
                >
                  {formattedLine}
                </p>
              );
            })}
          </div>
        )}

        {/* 4. PHẦN NỘI DUNG VĂN BẢN (BODY) */}
        <div className="mt-2.5 space-y-1.5">
          {parsedBody.map((line, idx) => {
            if (line.raw === 'QUYẾT ĐỊNH:') {
              return (
                <p
                  key={idx}
                  className="font-bold uppercase text-center py-1.5"
                  style={{ fontSize: '14pt' }}
                >
                  QUYẾT ĐỊNH:
                </p>
              );
            }

            if (line.type === 'ROMAN_SECTION') {
              return (
                <p
                  key={idx}
                  className="font-bold uppercase pt-1.5 leading-relaxed"
                  style={{
                    fontSize: '13.5pt',
                    textIndent: '1.27cm'
                  }}
                >
                  {line.raw}
                </p>
              );
            }

            if (line.type === 'DIEU_CLAUSE') {
              return (
                <p
                  key={idx}
                  className="text-justify pt-1 leading-relaxed"
                  style={{
                    fontSize: '13.5pt',
                    textIndent: '1.27cm'
                  }}
                >
                  <span className="font-bold">{line.prefix} </span>
                  <span>{line.rest}</span>
                </p>
              );
            }

            if (line.type === 'NUMBER_SUBSECTION') {
              return (
                <p
                  key={idx}
                  className="font-bold text-justify pt-0.5 leading-relaxed"
                  style={{
                    fontSize: '13.5pt',
                    textIndent: '1.27cm'
                  }}
                >
                  {line.raw}
                </p>
              );
            }

            if (line.type === 'ALPHA_ITEM') {
              return (
                <p
                  key={idx}
                  className="italic text-justify leading-relaxed"
                  style={{
                    fontSize: '13.5pt',
                    textIndent: '1.27cm'
                  }}
                >
                  {line.raw}
                </p>
              );
            }

            // BULLET hoặc PARAGRAPH chuẩn
            return (
              <p
                key={idx}
                className="text-justify leading-relaxed"
                style={{
                  fontSize: '13.5pt',
                  textIndent: '1.27cm'
                }}
              >
                {line.raw}
              </p>
            );
          })}
        </div>

        {/* 5. BẢNG FOOTER 2 CỘT KHÔNG VIỀN */}
        {isContract ? (
          /* Bố cục Chữ ký 2 bên dành riêng cho Hợp đồng (HĐ): ĐẠI DIỆN BÊN A (trái) - ĐẠI DIỆN BÊN B (phải) */
          <table className="w-full border-collapse border-0 mt-7" style={{ tableLayout: 'fixed', pageBreakInside: 'avoid' }}>
            <tbody>
              <tr className="align-top">
                <td className="w-[50%] text-center pr-2 align-top">
                  <div className="uppercase font-bold leading-snug" style={{ fontSize: '13.5pt' }}>
                    ĐẠI DIỆN BÊN A
                  </div>
                  <div className="uppercase font-bold leading-snug mt-0.5" style={{ fontSize: '12.5pt' }}>
                    {(benA?.chucVu || doc.chucVuKy || 'CHỦ TỊCH').trim()}
                  </div>
                  <div className="italic text-slate-700" style={{ fontSize: '11pt' }}>
                    (Ký, ghi rõ họ tên và đóng dấu)
                  </div>
                  <div style={{ height: '64px' }} />
                  <div className="font-bold" style={{ fontSize: '13.5pt' }}>
                    {(benA?.daiDien || doc.hoTenKy || 'Thái Hoàng Nam').trim()}
                  </div>
                </td>

                <td className="w-[50%] text-center pl-2 align-top">
                  <div className="uppercase font-bold leading-snug" style={{ fontSize: '13.5pt' }}>
                    ĐẠI DIỆN BÊN B
                  </div>
                  <div className="uppercase font-bold leading-snug mt-0.5" style={{ fontSize: '12.5pt' }}>
                    {(benB?.chucVu || 'GIÁM ĐỐC').trim()}
                  </div>
                  <div className="italic text-slate-700" style={{ fontSize: '11pt' }}>
                    (Ký, ghi rõ họ tên và đóng dấu)
                  </div>
                  <div style={{ height: '64px' }} />
                  <div className="font-bold" style={{ fontSize: '13.5pt' }}>
                    {(benB?.daiDien || 'Đại diện Bên B').trim()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : isMinutes ? (
          /* Bố cục Chữ ký dành riêng cho Biên bản (BB): THƯ KÝ (trái) - CHỦ TỌA (phải) */
          <table className="w-full border-collapse border-0 mt-7" style={{ tableLayout: 'fixed', pageBreakInside: 'avoid' }}>
            <tbody>
              <tr className="align-top">
                <td className="w-[50%] text-center pr-2 align-top">
                  <div className="uppercase font-bold leading-snug" style={{ fontSize: '13.5pt' }}>
                    THƯ KÝ
                  </div>
                  <div className="italic" style={{ fontSize: '11pt' }}>
                    (Ký, ghi rõ họ và tên)
                  </div>
                  <div style={{ height: '60px' }} />
                  <div className="font-bold" style={{ fontSize: '13.5pt' }}>
                    {(doc.dynamicData?.bbThuKy || 'Đoàn Hồng Nhung').trim()}
                  </div>
                </td>

                <td className="w-[50%] text-center pl-2 align-top">
                  <div className="uppercase font-bold leading-snug" style={{ fontSize: '13.5pt' }}>
                    CHỦ TỌA
                  </div>
                  {doc.chucVuKy && doc.chucVuKy.trim() && (
                    <div className="uppercase font-bold leading-snug" style={{ fontSize: '13pt' }}>
                      {doc.chucVuKy.trim()}
                    </div>
                  )}
                  <div style={{ height: '60px' }} />
                  <div className="font-bold" style={{ fontSize: '13.5pt' }}>
                    {(doc.dynamicData?.bbChuToa || doc.hoTenKy || 'Thái Hoàng Nam').trim()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* Bố cục chuẩn Nơi nhận (trái) & Người ký (phải) */
          <table className="w-full border-collapse border-0 mt-7" style={{ tableLayout: 'fixed', pageBreakInside: 'avoid' }}>
            <tbody>
              <tr className="align-top">
                {/* Ô TRÁI: NƠI NHẬN (Cỡ 12 nghiêng đậm cho tiêu đề, cỡ 11 đứng cho danh sách) */}
                <td className="w-[50%] pr-3 align-top">
                  <div
                    className="font-bold italic mb-1"
                    style={{ fontSize: '12pt' }}
                  >
                    Nơi nhận:
                  </div>
                  <div className="space-y-0.5" style={{ fontSize: '11pt', lineHeight: 1.3 }}>
                    {fullRecipients.map((item, i) => (
                      <div key={i}>- {item}</div>
                    ))}
                  </div>
                </td>

                {/* Ô PHẢI: QUYỀN HẠN, CHỨC VỤ & HỌ TÊN NGƯỜI KÝ */}
                <td className="w-[50%] text-center pl-2 align-top">
                  {doc.quyenHanKy && doc.quyenHanKy.trim() && (
                    <div
                      className="uppercase font-bold leading-snug"
                      style={{ fontSize: '13.5pt' }}
                    >
                      {doc.quyenHanKy.trim()}
                    </div>
                  )}
                  {doc.chucVuKy && doc.chucVuKy.trim() && (
                    <div
                      className="uppercase font-bold leading-snug"
                      style={{ fontSize: '13.5pt' }}
                    >
                      {doc.chucVuKy.trim()}
                    </div>
                  )}

                  {/* Khoảng trống 4 dòng trắng (56px) dành cho chữ ký và dấu */}
                  <div style={{ height: '56px' }} />

                  <div
                    className="font-bold"
                    style={{ fontSize: '13.5pt' }}
                  >
                    {doc.hoTenKy.trim() || 'Họ và tên'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
