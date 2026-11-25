import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType
} from 'docx';
import { saveAs } from 'file-saver';
import { DOC_TYPES } from '../constants';
import { DocumentData } from '../types';
import {
  buildFullRecipients,
  formatCanCuLine,
  formatSoKyHieuDisplay,
  formatVietnameseDate,
  normalizeSoVanBan,
  parseBodyLines
} from './docHelpers';

const FONT_FAMILY = 'Times New Roman';

// Tổng bề rộng vùng in thân văn bản A4 chuẩn NĐ 30/2020: 210mm (11906 twips) - Lề trái 30mm (1701 twips) - Lề phải 15mm (850 twips) = 165mm (9354 twips)
const PRINTABLE_WIDTH_TWIPS = 9354;

// Riêng bảng Header 3 cột không viền giãn rộng 182mm (10318 twips) và kéo lề trái ra ngoài -12mm (-680 twips):
// Cột 1 (Tên cơ quan & Số ký hiệu): 4650 twips (~82mm)
// Cột 2 (Đệm trống ở giữa): 268 twips (~4.7mm)
// Cột 3 (Quốc hiệu, Tiêu ngữ, Ngày tháng): 5400 twips (~95.3mm)
// Tổng: 4650 + 268 + 5400 = 10318 twips (182mm)
const HEADER_TABLE_WIDTH_TWIPS = 10318;
const HEADER_NEGATIVE_LEFT_INDENT_TWIPS = -680;
const HEADER_COL1_TWIPS = 4650;
const HEADER_COL2_GAP_TWIPS = 268;
const HEADER_COL3_TWIPS = 5400;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const ZERO_CELL_MARGINS = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};

/**
 * Tạo đường kẻ ngang ôm sát chữ, không giãn khoảng trắng thừa bằng bảng 1 ô căn giữa:
 * - Không viền trừ viền dưới (BorderStyle.SINGLE, size: 6, color: "000000")
 * - cellMargins bằng 0 cả 4 cạnh
 * - Bên trong chứa 1 paragraph rỗng cỡ chữ siêu nhỏ (size: 2 = 1pt, spacing: { before: 0, after: 0, line: 20 })
 */
function createShortDivider(widthTwips: number): Table {
  return new Table({
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    width: { size: widthTwips, type: WidthType.DXA },
    columnWidths: [widthTwips],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: widthTwips, type: WidthType.DXA },
            margins: ZERO_CELL_MARGINS,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 20 },
                children: [
                  new TextRun({
                    text: '',
                    font: FONT_FAMILY,
                    size: 2 // 1pt
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

export async function exportDocumentToDocx(docData: DocumentData): Promise<void> {
  const isState = docData.mode === 'NHA_NUOC';
  const docTypeInfo = DOC_TYPES.find((t) => t.code === docData.docType);
  const hasDocTitle = docTypeInfo ? docTypeInfo.hasDocTitle : docData.docType !== 'CV';
  const upperTypeName = docTypeInfo ? docTypeInfo.upperName : docData.docType.toUpperCase();

  const soKyHieuText = formatSoKyHieuDisplay(docData.mode, docData.soVanBan, docData.kyHieu);
  const dateText = formatVietnameseDate(docData.diaDanh, docData.ngayBanHanh);

  // 1. HEADER TABLE 3 CỘT KHÔNG VIỀN GIÃN LỀ RỘNG 182mm (4650 + 268 + 5400 = 10318 twips, indent: -680 twips)
  // Hiển thị ĐÚNG 2 DÒNG cho cột Tên cơ quan (cỡ chữ 12pt = size 24)
  const leftHeaderChildren: (Paragraph | Table)[] = [];

  if (docData.coQuanChuQuan && docData.coQuanChuQuan.trim()) {
    leftHeaderChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 20 },
        children: [
          new TextRun({
            text: docData.coQuanChuQuan.trim().toUpperCase(),
            font: FONT_FAMILY,
            size: 24, // 12pt in hoa đứng, nằm trọn 1 dòng
            bold: false
          })
        ]
      })
    );
  }

  leftHeaderChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: (docData.coQuanBanHanh || 'CƠ QUAN BAN HÀNH').trim().toUpperCase(),
          font: FONT_FAMILY,
          size: 24, // 12pt in hoa đậm, nằm trọn 1 dòng
          bold: true
        })
      ]
    })
  );

  // Phía dưới Tên cơ quan ban hành:
  // - Khối Nhà nước (NĐ 30): Đường kẻ ngang ôm sát chữ bằng createShortDivider(1800) (1/3 đến 1/2 độ dài dòng chữ)
  // - Khối Đảng (HD 05): Dấu hoa thị * căn giữa
  if (isState) {
    leftHeaderChildren.push(createShortDivider(1800));
  } else {
    leftHeaderChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: '*',
            font: FONT_FAMILY,
            size: 28,
            bold: true
          })
        ]
      })
    );
  }

  // Số và Ký hiệu (spacing.before = 80 để cân đối với đường kẻ ngang)
  leftHeaderChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: hasDocTitle ? 40 : 60 },
      children: [
        new TextRun({
          text: soKyHieuText,
          font: FONT_FAMILY,
          size: 26 // 13pt
        })
      ]
    })
  );

  // Nếu là Công văn (CV), đưa Trích yếu (V/v ...) xuống ngay dưới Số, ký hiệu ở cột trái theo đúng NĐ 30
  if (!hasDocTitle && docData.trichYeu && docData.trichYeu.trim()) {
    leftHeaderChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: docData.trichYeu.trim(),
            font: FONT_FAMILY,
            size: 25, // 12.5pt
            bold: false
          })
        ]
      })
    );
  }

  // Cột 3 Header (5400 twips ~95.3mm - Quốc hiệu / Tiêu ngữ + Địa danh ngày tháng)
  const rightHeaderChildren: (Paragraph | Table)[] = [];

  if (isState) {
    // Khối Nhà nước (NĐ 30/2020/NĐ-CP)
    // Tuyệt đối không đặt indent trái/phải để Quốc hiệu (12pt đậm) và Tiêu ngữ (13pt đậm) nằm gọn trên 1 dòng
    rightHeaderChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 20 },
        children: [
          new TextRun({
            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
            font: FONT_FAMILY,
            size: 24, // 12pt in hoa đậm chuẩn NĐ 30
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: 'Độc lập - Tự do - Hạnh phúc',
            font: FONT_FAMILY,
            size: 26, // 13pt in thường đậm chuẩn NĐ 30
            bold: true
          })
        ]
      }),
      createShortDivider(3100) // Dài đúng bằng dòng "Độc lập - Tự do - Hạnh phúc"
    );
  } else {
    // Khối Đảng (HD 05-HD/VPTW): ĐẢNG CỘNG SẢN VIỆT NAM cỡ 15pt, đậm, có đường kẻ ngang liền nét bằng đúng độ dài dòng chữ bên dưới
    rightHeaderChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: 'ĐẢNG CỘNG SẢN VIỆT NAM',
            font: FONT_FAMILY,
            size: 30, // 15pt
            bold: true
          })
        ]
      }),
      createShortDivider(4680) // Dài đúng bằng dòng "ĐẢNG CỘNG SẢN VIỆT NAM" (4600-4800 twips)
    );
  }

  // Địa danh, ngày tháng năm (spacing.before = 80 cho Nhà nước, 100 cho Khối Đảng để nằm sát cân đối dưới đường kẻ)
  rightHeaderChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: isState ? 80 : 100, after: 40 },
      children: [
        new TextRun({
          text: dateText,
          font: FONT_FAMILY,
          size: 27, // 13.5pt
          italics: true
        })
      ]
    })
  );

  const headerTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: HEADER_TABLE_WIDTH_TWIPS, type: WidthType.DXA },
    indent: { size: HEADER_NEGATIVE_LEFT_INDENT_TWIPS, type: WidthType.DXA },
    columnWidths: [HEADER_COL1_TWIPS, HEADER_COL2_GAP_TWIPS, HEADER_COL3_TWIPS],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          // Cột 1: Tên cơ quan & Số ký hiệu (4650 twips ~82mm)
          new TableCell({
            width: { size: HEADER_COL1_TWIPS, type: WidthType.DXA },
            margins: ZERO_CELL_MARGINS,
            borders: NO_BORDERS,
            children: leftHeaderChildren
          }),
          // Cột 2: Cột đệm trống cách ly ở giữa (268 twips ~4.7mm)
          new TableCell({
            width: { size: HEADER_COL2_GAP_TWIPS, type: WidthType.DXA },
            margins: ZERO_CELL_MARGINS,
            borders: NO_BORDERS,
            children: [new Paragraph({ children: [] })]
          }),
          // Cột 3: Quốc hiệu, Tiêu ngữ, Ngày tháng (5400 twips ~95.3mm)
          new TableCell({
            width: { size: HEADER_COL3_TWIPS, type: WidthType.DXA },
            margins: ZERO_CELL_MARGINS,
            borders: NO_BORDERS,
            children: rightHeaderChildren
          })
        ]
      })
    ]
  });

  const sectionChildren: (Paragraph | Table)[] = [headerTable];

  // 2. TÊN LOẠI VĂN BẢN & TRÍCH YẾU NỘI DUNG
  if (hasDocTitle) {
    sectionChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({
            text: upperTypeName,
            font: FONT_FAMILY,
            size: 28, // 14pt in hoa đậm
            bold: true
          })
        ]
      })
    );

    if (docData.trichYeu && docData.trichYeu.trim()) {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: isState ? 40 : 140 },
          children: [
            new TextRun({
              text: docData.trichYeu.trim(),
              font: FONT_FAMILY,
              size: 28, // 14pt
              bold: isState // Khối Nhà nước đậm, Khối Đảng in thường cỡ 14 không gạch dưới
            })
          ]
        })
      );

      // Chỉ Khối Nhà nước (NĐ 30, không áp dụng Công văn & Khối Đảng) có đường kẻ ngang dưới Trích yếu (2400-2800 twips)
      if (isState) {
        sectionChildren.push(createShortDivider(2600));
      }
    }
  }

  // 2.1. Dòng Kính gửi: chữ đứng, in thường (KHÔNG in đậm), cỡ chữ 14pt theo đúng Nghị định 30/2020/NĐ-CP
  if (docData.kinhGui && docData.kinhGui.trim()) {
    sectionChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 120 },
        children: [
          new TextRun({
            text: `Kính gửi: ${docData.kinhGui.trim()}`,
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: false // Chuẩn NĐ 30: chữ đứng, in thường, KHÔNG in đậm
          })
        ]
      })
    );
  }

  // 3. CĂN CỨ BAN HÀNH (In nghiêng, cỡ 13.5-14pt, thụt đầu dòng 720 twips)
  const validCanCu = docData.canCu.map((c) => c.trim()).filter(Boolean);
  validCanCu.forEach((cc, idx) => {
    const isLast = idx === validCanCu.length - 1;
    const formatted = formatCanCuLine(cc, isLast);
    sectionChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 }, // 1.27cm
        spacing: { before: idx === 0 ? 80 : 40, after: isLast ? 120 : 60, line: 276 },
        children: [
          new TextRun({
            text: formatted,
            font: FONT_FAMILY,
            size: 27, // 13.5pt
            italics: true
          })
        ]
      })
    );
  });

  // 4. NỘI DUNG VĂN BẢN (BODY)
  const parsedLines = parseBodyLines(docData.noiDung);
  parsedLines.forEach((line, idx) => {
    const firstBodySpacingBefore = idx === 0 && validCanCu.length === 0 ? 80 : undefined;

    if (line.raw === 'QUYẾT ĐỊNH:') {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 100 },
          children: [
            new TextRun({
              text: 'QUYẾT ĐỊNH:',
              font: FONT_FAMILY,
              size: 28, // 14pt
              bold: true
            })
          ]
        })
      );
    } else if (line.type === 'ROMAN_SECTION') {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 720 },
          spacing: { before: firstBodySpacingBefore ?? 140, after: 80, line: 276 },
          children: [
            new TextRun({
              text: line.raw,
              font: FONT_FAMILY,
              size: 28, // 14pt
              bold: true
            })
          ]
        })
      );
    } else if (line.type === 'DIEU_CLAUSE') {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 },
          spacing: { before: firstBodySpacingBefore ?? 100, after: 80, line: 276 },
          children: [
            new TextRun({
              text: `${line.prefix} `,
              font: FONT_FAMILY,
              size: 28,
              bold: true
            }),
            new TextRun({
              text: line.rest || '',
              font: FONT_FAMILY,
              size: 28,
              bold: false
            })
          ]
        })
      );
    } else if (line.type === 'NUMBER_SUBSECTION') {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 },
          spacing: { before: firstBodySpacingBefore ?? 100, after: 60, line: 276 },
          children: [
            new TextRun({
              text: line.raw,
              font: FONT_FAMILY,
              size: 28, // 14pt
              bold: true
            })
          ]
        })
      );
    } else if (line.type === 'ALPHA_ITEM') {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 },
          spacing: { before: firstBodySpacingBefore ?? 60, after: 60, line: 276 },
          children: [
            new TextRun({
              text: line.raw,
              font: FONT_FAMILY,
              size: 28, // 14pt
              italics: true
            })
          ]
        })
      );
    } else {
      // BULLET hoặc PARAGRAPH chuẩn
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 }, // 1.27 cm (720 twips)
          spacing: { before: firstBodySpacingBefore ?? 60, after: 80, line: 276 },
          children: [
            new TextRun({
              text: line.raw,
              font: FONT_FAMILY,
              size: 28 // 14pt
            })
          ]
        })
      );
    }
  });

  // Khoảng cách trước Footer Table
  sectionChildren.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: []
    })
  );

  // 5. FOOTER TABLE (2 Cột không viền: 50% - 50%, cantSplit: true)
  const halfFooterColTwips = Math.floor(PRINTABLE_WIDTH_TWIPS / 2);
  let leftFooterChildren: Paragraph[] = [];
  let rightFooterChildren: Paragraph[] = [];

  if (docData.docType === 'HĐ') {
    // Bố cục Chữ ký 2 bên dành cho Hợp đồng (HĐ): ĐẠI DIỆN BÊN A (trái) - ĐẠI DIỆN BÊN B (phải)
    const benA = docData.dynamicData?.hdBenA;
    const benB = docData.dynamicData?.hdBenB;

    leftFooterChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: 'ĐẠI DIỆN BÊN A',
            font: FONT_FAMILY,
            size: 27, // 13.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: (benA?.chucVu || docData.chucVuKy || 'CHỦ TỊCH').trim().toUpperCase(),
            font: FONT_FAMILY,
            size: 25, // 12.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1150 }, // Chừa khoảng trống ký và đóng dấu
        children: [
          new TextRun({
            text: '(Ký, ghi rõ họ tên và đóng dấu)',
            font: FONT_FAMILY,
            size: 22, // 11pt
            italics: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: (benA?.daiDien || docData.hoTenKy || 'Thái Hoàng Nam').trim(),
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true
          })
        ]
      })
    ];

    rightFooterChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: 'ĐẠI DIỆN BÊN B',
            font: FONT_FAMILY,
            size: 27, // 13.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: (benB?.chucVu || 'GIÁM ĐỐC').trim().toUpperCase(),
            font: FONT_FAMILY,
            size: 25, // 12.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1150 },
        children: [
          new TextRun({
            text: '(Ký, ghi rõ họ tên và đóng dấu)',
            font: FONT_FAMILY,
            size: 22, // 11pt
            italics: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: (benB?.daiDien || 'Đại diện Bên B').trim(),
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true
          })
        ]
      })
    ];
  } else if (docData.docType === 'BB') {
    // Bố cục Chữ ký 2 bên dành cho Biên bản (BB): THƯ KÝ (trái) - CHỦ TỌA (phải)
    leftFooterChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: 'THƯ KÝ',
            font: FONT_FAMILY,
            size: 27, // 13.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1150 },
        children: [
          new TextRun({
            text: '(Ký, ghi rõ họ và tên)',
            font: FONT_FAMILY,
            size: 22, // 11pt
            italics: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: (docData.dynamicData?.bbThuKy || 'Đoàn Hồng Nhung').trim(),
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true
          })
        ]
      })
    ];

    rightFooterChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: 'CHỦ TỌA',
            font: FONT_FAMILY,
            size: 27, // 13.5pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1150 },
        children: [
          new TextRun({
            text: (docData.chucVuKy || 'CHỦ TỊCH').trim().toUpperCase(),
            font: FONT_FAMILY,
            size: 26, // 13pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: (docData.dynamicData?.bbChuToa || docData.hoTenKy || 'Thái Hoàng Nam').trim(),
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true
          })
        ]
      })
    ];
  } else {
    // Bố cục chuẩn Nơi nhận (trái) & Người ký (phải)
    const recipients = buildFullRecipients(docData);
    leftFooterChildren = [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'Nơi nhận:',
            font: FONT_FAMILY,
            size: 24, // 12pt
            bold: true,
            italics: true
          })
        ]
      })
    ];

    for (const r of recipients) {
      leftFooterChildren.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: `- ${r}`,
              font: FONT_FAMILY,
              size: 22 // 11pt
            })
          ]
        })
      );
    }

    if (docData.quyenHanKy && docData.quyenHanKy.trim()) {
      rightFooterChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: docData.quyenHanKy.trim().toUpperCase(),
              font: FONT_FAMILY,
              size: 27, // 13.5pt
              bold: true
            })
          ]
        })
      );
    }

    if (docData.chucVuKy && docData.chucVuKy.trim()) {
      rightFooterChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1100 }, // 4 dòng trắng (~1100 twips) dành cho chữ ký và con dấu
          children: [
            new TextRun({
              text: docData.chucVuKy.trim().toUpperCase(),
              font: FONT_FAMILY,
              size: 27, // 13.5pt
              bold: true
            })
          ]
        })
      );
    }

    rightFooterChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: (docData.hoTenKy || 'Họ và tên').trim(),
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true
          })
        ]
      })
    );
  }

  const footerTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: PRINTABLE_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: [halfFooterColTwips, PRINTABLE_WIDTH_TWIPS - halfFooterColTwips],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true, // Không ngắt trang giữa chữ ký và nơi nhận theo SPEC_THE_THUC.md
        children: [
          new TableCell({
            width: { size: halfFooterColTwips, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: leftFooterChildren
          }),
          new TableCell({
            width: { size: PRINTABLE_WIDTH_TWIPS - halfFooterColTwips, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: rightFooterChildren
          })
        ]
      })
    ]
  });

  sectionChildren.push(footerTable);

  // Cấu hình Document chuẩn SPEC_THE_THUC.md Mục 4
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // 210mm A4
              height: 16838 // 297mm A4
            },
            margin: {
              top: 1134,    // 20mm
              bottom: 1134, // 20mm
              left: 1701,   // 30mm
              right: 850    // 15mm
            }
          }
        },
        children: sectionChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const normalizedNum = normalizeSoVanBan(docData.mode, docData.soVanBan) || '0';
  const safeSo = normalizedNum.replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `VanBan_${docData.mode === 'NHA_NUOC' ? 'ND30' : 'HD05'}_${docData.docType}_So_${safeSo}.docx`;
  saveAs(blob, fileName);
}
