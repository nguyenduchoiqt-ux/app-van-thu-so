import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Save,
  Download,
  Printer,
  Copy,
  ShieldCheck,
  Wand2,
  RotateCcw,
  Check,
  UserCheck,
  Building2,
  Hash,
  Calendar,
  BookOpen,
  SlidersHorizontal,
  Bot,
  Upload,
  FileUp,
  ChevronDown,
  ChevronUp,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  DOC_TYPES,
  OUTLINE_SUGGESTIONS,
  PRESET_TEMPLATES,
  buildAutoKyHieu,
  buildContentFromDynamicForm,
  buildDefaultTemplateForDocType
} from '../constants';
import {
  ClauseItem,
  ContractPartyInfo,
  DocumentData,
  DynamicFormData,
  UnitConfig
} from '../types';
import { A4Preview } from './A4Preview';
import { exportDocumentToDocx } from '../utils/docxExporter';
import { formatCanCuLine, normalizeSoVanBan } from '../utils/docHelpers';
import {
  GeminiDocResponse,
  GeminiServiceError,
  generateDocumentFromIdeas,
  getStoredGeminiApiKey,
  getStoredGeminiModel,
  transformSampleDocumentWithAI
} from '../services/geminiService';

interface EditorTabProps {
  doc: DocumentData;
  setDoc: React.Dispatch<React.SetStateAction<DocumentData>>;
  unitConfig: UnitConfig;
  onSaveHistory: () => void;
  onSendToReview: () => void;
  onOpenApiKeyConfig: () => void;
  getNextSuggestedNumber: (docType: string) => string;
  onResetBlank: () => void;
}

const DEFAULT_PARTY_A: ContractPartyInfo = {
  tenDonVi: 'ỦY BAN NHÂN DÂN XÃ NAM GIANG',
  daiDien: 'Thái Hoàng Nam',
  chucVu: 'Chủ tịch UBND xã',
  diaChi: 'Xã Nam Giang, tỉnh Việt Thanh',
  mstCccd: '3200123456',
  dienThoai: '0233.3880.123',
  soTaiKhoan: '3713.0.1056789 tại Kho bạc Nhà nước Nam Giang'
};

const DEFAULT_PARTY_B: ContractPartyInfo = {
  tenDonVi: 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ SỐ VIỆT THANH',
  daiDien: 'Nguyễn Minh Quân',
  chucVu: 'Giám đốc',
  diaChi: 'Số 68 Hùng Vương, tỉnh Việt Thanh',
  mstCccd: '3200987654',
  dienThoai: '0912.345.678',
  soTaiKhoan: '0771000888999 tại Ngân hàng Vietcombank Việt Thanh'
};

export const EditorTab: React.FC<EditorTabProps> = ({
  doc,
  setDoc,
  unitConfig,
  onSaveHistory,
  onSendToReview,
  onOpenApiKeyConfig,
  getNextSuggestedNumber,
  onResetBlank
}) => {
  const isState = doc.mode === 'NHA_NUOC';
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PRESET_TEMPLATES[0].id);
  const [copiedToast, setCopiedToast] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [appliedTypeToast, setAppliedTypeToast] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // --- STATE TRỢ LÝ AI VĂN THƯ ---
  const [aiExpanded, setAiExpanded] = useState<boolean>(true);
  const [aiModeTab, setAiModeTab] = useState<'IDEAS' | 'UPLOAD'>('IDEAS');
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(getStoredGeminiApiKey()));
  const [currentAiModel, setCurrentAiModel] = useState<string>(() => getStoredGeminiModel());

  // Chế độ A: Soạn từ ý chính
  const [aiIdeasPrompt, setAiIdeasPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiLoadingStatus, setAiLoadingStatus] = useState<string | null>(null);
  const [aiError, setAiError] = useState<{ message: string; needKeyConfig?: boolean } | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Chế độ B: Tải file mẫu (.docx, .pdf, .txt) & Chỉnh sửa bằng AI
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [parsingFile, setParsingFile] = useState<boolean>(false);
  const [uploadedSample, setUploadedSample] = useState<{
    fileName: string;
    fileSize: number;
    fileType: 'docx' | 'txt' | 'pdf';
    extractedText?: string;
    pdfBase64?: string;
  } | null>(null);
  const [aiEditInstruction, setAiEditInstruction] = useState<string>(
    `Chuyển toàn bộ thông tin về đơn vị ${doc.coQuanBanHanh}, địa danh ${doc.diaDanh}; cập nhật thời gian sang năm 2026–2027 và chuẩn hóa văn phong hành chính.`
  );

  // Lắng nghe thay đổi cấu hình API Key trong localStorage
  useEffect(() => {
    const syncKeyStatus = () => {
      setHasApiKey(Boolean(getStoredGeminiApiKey()));
      setCurrentAiModel(getStoredGeminiModel());
    };
    syncKeyStatus();
    window.addEventListener('vts-gemini-config-changed', syncKeyStatus);
    window.addEventListener('storage', syncKeyStatus);
    return () => {
      window.removeEventListener('vts-gemini-config-changed', syncKeyStatus);
      window.removeEventListener('storage', syncKeyStatus);
    };
  }, []);

  // Đồng bộ local state & cuộn khung xem trước A4 lên đầu trang khi nhận dữ liệu chuyển sang từ Tab 2 (syncTimestamp)
  useEffect(() => {
    if (doc.syncTimestamp) {
      setAiError(null);
      const matchingTpl = PRESET_TEMPLATES.find((t) => t.docType === doc.docType);
      if (matchingTpl) {
        setSelectedTemplateId(matchingTpl.id);
      }
      const paperScroll = document.querySelector('.a4-scroll-container');
      if (paperScroll instanceof HTMLElement) {
        paperScroll.scrollTop = 0;
      }
    }
  }, [doc.syncTimestamp, doc.docType]);

  // Điền kết quả JSON từ Gemini vào Form và cập nhật ngay lên A4Preview
  const applyAiResultToDocument = (res: GeminiDocResponse, sourceLabel: string) => {
    setDoc((prev) => {
      const nextNoiDung = res.noiDung || prev.noiDung;
      const nextTrichYeu = res.trichYeu || prev.trichYeu;
      const nextKinhGui = res.kinhGui !== undefined ? res.kinhGui : prev.kinhGui;
      const nextCanCu = Array.isArray(res.canCu) ? res.canCu : prev.canCu;

      // Đồng bộ thêm với dynamicData nếu là Công văn (CV) hoặc các đề mục cơ bản
      let nextDyn = prev.dynamicData;
      if (prev.docType === 'CV' && nextDyn) {
        nextDyn = { ...nextDyn, cvNoiDung: nextNoiDung };
      }

      return {
        ...prev,
        trichYeu: nextTrichYeu,
        kinhGui: nextKinhGui,
        canCu: nextCanCu,
        noiDung: nextNoiDung,
        dynamicData: nextDyn
      };
    });

    setAiSuccessMsg(
      `✨ Đã điền hoàn tất Trích yếu, Kính gửi, Căn cứ và Nội dung từ ${sourceLabel} vào Form & Bản xem trước A4!`
    );
    setTimeout(() => setAiSuccessMsg(null), 6000);
  };

  // Xử lý gọi AI ở Chế độ A (Từ ý chính)
  const handleRunAiFromIdeas = async () => {
    setAiError(null);
    setAiSuccessMsg(null);
    setAiLoadingStatus(null);
    setAiLoading(true);
    try {
      const result = await generateDocumentFromIdeas({
        doc,
        ideasPrompt: aiIdeasPrompt,
        onStatusChange: (msg) => setAiLoadingStatus(msg)
      });
      applyAiResultToDocument(result, 'Trợ lý AI');
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        setAiError({
          message: err.message,
          needKeyConfig:
            err.code === 'NO_KEY' || err.code === 'INVALID_KEY' || err.code === 'MODEL_NOT_FOUND'
        });
      } else {
        setAiError({
          message: 'Đã xảy ra lỗi không xác định khi gọi AI. Vui lòng thử lại.'
        });
      }
    } finally {
      setAiLoading(false);
      setAiLoadingStatus(null);
    }
  };

  // Đọc file .docx, .pdf, .txt trên trình duyệt
  const handleProcessSelectedFile = async (file: File) => {
    setAiError(null);
    setAiSuccessMsg(null);

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setAiError({
        message: `File "${file.name}" có dung lượng ${(file.size / (1024 * 1024)).toFixed(
          1
        )}MB, vượt quá giới hạn 10MB. Vui lòng chọn file nhỏ hơn.`
      });
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isDocx =
      lowerName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain';

    if (!isDocx && !isPdf && !isTxt) {
      if (lowerName.endsWith('.doc')) {
        setAiError({
          message:
            'Định dạng .doc (Word 97-2003 cũ) không hỗ trợ đọc trực tiếp trên trình duyệt. Vui lòng lưu file sang định dạng .docx hoặc .pdf rồi tải lên.'
        });
      } else {
        setAiError({
          message: 'Chỉ hỗ trợ tải lên file văn bản mẫu định dạng .docx, .pdf hoặc .txt.'
        });
      }
      return;
    }

    setParsingFile(true);
    try {
      if (isDocx) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extracted = (result.value || '').trim();
        if (!extracted) {
          throw new Error('File Word (.docx) không có nội dung văn bản hoặc bị trống.');
        }
        setUploadedSample({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'docx',
          extractedText: extracted
        });
      } else if (isTxt) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Không thể đọc file .txt'));
          reader.readAsText(file, 'utf-8');
        });
        if (!text.trim()) {
          throw new Error('File .txt không có nội dung.');
        }
        setUploadedSample({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'txt',
          extractedText: text.trim()
        });
      } else if (isPdf) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const commaIdx = dataUrl.indexOf(',');
            resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
          };
          reader.onerror = () => reject(new Error('Không thể đọc file .pdf'));
          reader.readAsDataURL(file);
        });
        setUploadedSample({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'pdf',
          pdfBase64: base64
        });
      }
    } catch (err) {
      setUploadedSample(null);
      setAiError({
        message:
          err instanceof Error
            ? err.message
            : 'Không thể đọc nội dung file đã chọn. Vui lòng kiểm tra lại file.'
      });
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xử lý gọi AI ở Chế độ B (Sửa lại theo văn bản mẫu đã tải lên)
  const handleRunAiTransformSample = async () => {
    if (!uploadedSample) {
      setAiError({
        message: 'Vui lòng tải lên 01 file văn bản mẫu (.docx, .pdf hoặc .txt) trước.'
      });
      return;
    }

    setAiError(null);
    setAiSuccessMsg(null);
    setAiLoadingStatus(null);
    setAiLoading(true);
    try {
      const result = await transformSampleDocumentWithAI({
        doc,
        editInstruction: aiEditInstruction,
        sampleFile: {
          fileName: uploadedSample.fileName,
          fileType: uploadedSample.fileType,
          extractedText: uploadedSample.extractedText,
          pdfBase64: uploadedSample.pdfBase64
        },
        onStatusChange: (msg) => setAiLoadingStatus(msg)
      });
      applyAiResultToDocument(result, `văn bản mẫu "${uploadedSample.fileName}"`);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        setAiError({
          message: err.message,
          needKeyConfig:
            err.code === 'NO_KEY' || err.code === 'INVALID_KEY' || err.code === 'MODEL_NOT_FOUND'
        });
      } else {
        setAiError({
          message: 'Đã xảy ra lỗi khi xử lý văn bản mẫu bằng AI. Vui lòng thử lại.'
        });
      }
    } finally {
      setAiLoading(false);
      setAiLoadingStatus(null);
    }
  };

  const availableDocTypes = DOC_TYPES.filter((dt) => dt.modes.includes(doc.mode));
  const currentDocTypeInfo = DOC_TYPES.find((dt) => dt.code === doc.docType);

  const primaryBg = isState ? 'bg-[#1e4b7a] hover:bg-[#173a5e]' : 'bg-[#b91c1c] hover:bg-[#991b1b]';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';
  const primaryBorder = isState ? 'border-[#1e4b7a]' : 'border-[#b91c1c]';
  const primaryBadge = isState
    ? 'bg-blue-50 text-[#1e4b7a] border-blue-200'
    : 'bg-red-50 text-[#b91c1c] border-red-200';

  // Áp dụng Mẫu soạn sẵn từ mục 1
  const handleApplyTemplate = () => {
    const tpl = PRESET_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const firstSigner = unitConfig.signers[0] || {
      quyenHan: doc.mode === 'NHA_NUOC' ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
      chucVu: doc.mode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
      hoTen: doc.mode === 'NHA_NUOC' ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
    };

    const newKyHieu = doc.autoKyHieu
      ? buildAutoKyHieu(doc.mode, tpl.docType, unitConfig.kyHieuCoQuan)
      : doc.kyHieu;

    setDoc((prev) => ({
      ...prev,
      docType: tpl.docType,
      coQuanChuQuan: unitConfig.coQuanChuQuan,
      coQuanBanHanh: unitConfig.coQuanBanHanh,
      kyHieuCoQuan: unitConfig.kyHieuCoQuan,
      diaDanh: unitConfig.diaDanh,
      kyHieu: newKyHieu,
      trichYeu: tpl.trichYeu,
      kinhGui: tpl.kinhGui || '',
      canCu: [...tpl.canCu],
      noiDung: tpl.noiDung,
      quyenHanKy: firstSigner.quyenHan,
      chucVuKy: firstSigner.chucVu,
      hoTenKy: firstSigner.hoTen,
      noiNhanList: unitConfig.commonRecipients.slice(0, 3),
      luuVt: doc.mode === 'DANG' ? 'Lưu: VT, VPĐU.' : tpl.luuVt,
      dynamicData: tpl.dynamicData ? JSON.parse(JSON.stringify(tpl.dynamicData)) : undefined
    }));
  };

  // Nút nổi bật "Dùng mẫu theo loại này" ngay tại mục 2 (nạp mẫu chuẩn + mở Dynamic Form theo loại văn bản đang chọn)
  const handleApplyCurrentDocTypeTemplate = () => {
    const built = buildDefaultTemplateForDocType(doc.mode, doc.docType, unitConfig);
    const firstSigner = unitConfig.signers[0] || {
      quyenHan: doc.mode === 'NHA_NUOC' ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
      chucVu: doc.mode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
      hoTen: doc.mode === 'NHA_NUOC' ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
    };
    const newKyHieu = doc.autoKyHieu
      ? buildAutoKyHieu(doc.mode, doc.docType, unitConfig.kyHieuCoQuan)
      : doc.kyHieu;

    setDoc((prev) => ({
      ...prev,
      coQuanChuQuan: unitConfig.coQuanChuQuan,
      coQuanBanHanh: unitConfig.coQuanBanHanh,
      kyHieuCoQuan: unitConfig.kyHieuCoQuan,
      diaDanh: unitConfig.diaDanh,
      kyHieu: newKyHieu,
      trichYeu: built.trichYeu,
      kinhGui: built.kinhGui,
      canCu: [...built.canCu],
      noiDung: built.noiDung,
      quyenHanKy: firstSigner.quyenHan,
      chucVuKy: firstSigner.chucVu,
      hoTenKy: firstSigner.hoTen,
      noiNhanList: [...built.noiNhanList],
      luuVt: built.luuVt,
      dynamicData: JSON.parse(JSON.stringify(built.dynamicData))
    }));

    setAppliedTypeToast(true);
    setTimeout(() => setAppliedTypeToast(false), 2500);
  };

  // Đổi Loại văn bản trên Dropdown
  const handleDocTypeChange = (newDocType: string) => {
    const built = buildDefaultTemplateForDocType(doc.mode, newDocType, unitConfig);
    setDoc((prev) => ({
      ...prev,
      docType: newDocType,
      kyHieu: prev.autoKyHieu
        ? buildAutoKyHieu(prev.mode, newDocType, prev.kyHieuCoQuan || unitConfig.kyHieuCoQuan)
        : prev.kyHieu,
      // Khởi tạo sẵn dynamicData của loại mới nếu người dùng đang bật form động
      dynamicData: prev.dynamicData ? JSON.parse(JSON.stringify(built.dynamicData)) : prev.dynamicData
    }));
  };

  // Cập nhật DynamicFormData và tự động đồng bộ realtime sang doc.noiDung (và canCu/chữ ký nếu liên quan)
  const updateDynamicData = (updater: (prevDyn: DynamicFormData) => DynamicFormData) => {
    setDoc((prev) => {
      const currentDyn: DynamicFormData =
        prev.dynamicData ||
        buildDefaultTemplateForDocType(prev.mode, prev.docType, unitConfig).dynamicData;
      const nextDyn = updater(currentDyn);
      const nextNoiDung = buildContentFromDynamicForm(prev.docType, nextDyn);

      // Đồng bộ thêm các trường đặc thù nếu là Quyết định (Xét đề nghị), Hợp đồng (Bên A ký) hoặc Biên bản (Chủ tọa)
      let nextCanCu = prev.canCu;
      if (prev.docType === 'QĐ' && nextDyn.qdXetDeNghi !== undefined) {
        const filtered = prev.canCu.filter(
          (c) => !/^(Theo đề nghị|Xét đề nghị)/i.test(c.trim())
        );
        if (nextDyn.qdXetDeNghi.trim()) {
          nextCanCu = [...filtered, nextDyn.qdXetDeNghi.trim()];
        } else {
          nextCanCu = filtered;
        }
      }

      let nextHoTenKy = prev.hoTenKy;
      let nextChucVuKy = prev.chucVuKy;
      if (prev.docType === 'HĐ' && nextDyn.hdBenA) {
        nextHoTenKy = nextDyn.hdBenA.daiDien || prev.hoTenKy;
        nextChucVuKy = (nextDyn.hdBenA.chucVu || prev.chucVuKy).toUpperCase();
      } else if (prev.docType === 'BB' && nextDyn.bbChuToa) {
        nextHoTenKy = nextDyn.bbChuToa;
      }

      return {
        ...prev,
        dynamicData: nextDyn,
        noiDung: nextNoiDung,
        canCu: nextCanCu,
        hoTenKy: nextHoTenKy,
        chucVuKy: nextChucVuKy
      };
    });
  };

  // Bật/Tắt Tự ghép ký hiệu
  const handleAutoKyHieuToggle = (checked: boolean) => {
    setDoc((prev) => ({
      ...prev,
      autoKyHieu: checked,
      kyHieu: checked
        ? buildAutoKyHieu(prev.mode, prev.docType, prev.kyHieuCoQuan || unitConfig.kyHieuCoQuan)
        : prev.kyHieu
    }));
  };

  // Gợi ý số tiếp theo
  const handleSuggestNumber = () => {
    const suggested = getNextSuggestedNumber(doc.docType);
    setDoc((prev) => ({
      ...prev,
      soVanBan: suggested
    }));
  };

  // Thêm dòng căn cứ
  const handleAddCanCu = () => {
    setDoc((prev) => ({
      ...prev,
      canCu: [...prev.canCu, 'Căn cứ ']
    }));
  };

  // Sửa dòng căn cứ
  const handleUpdateCanCu = (index: number, value: string) => {
    setDoc((prev) => {
      const updated = [...prev.canCu];
      updated[index] = value;
      return { ...prev, canCu: updated };
    });
  };

  // Xóa dòng căn cứ
  const handleRemoveCanCu = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      canCu: prev.canCu.filter((_, i) => i !== index)
    }));
  };

  // Chèn khung gợi ý theo loại văn bản
  const handleInsertOutline = () => {
    const suggestion =
      OUTLINE_SUGGESTIONS[doc.docType] ||
      `I. MỤC ĐÍCH, YÊU CẦU\n1. Mục đích\n- ...\n\nII. NỘI DUNG THỰC HIỆN\n1. Nội dung trọng tâm\n- ...\n\nIII. TỔ CHỨC THỰC HIỆN\n- .../.`;

    setDoc((prev) => ({
      ...prev,
      noiDung: prev.noiDung.trim() ? `${prev.noiDung.trim()}\n\n${suggestion}` : suggestion
    }));
  };

  // Chọn nhanh Người ký từ cấu hình
  const handleSelectSigner = (signerId: string) => {
    const found = unitConfig.signers.find((s) => s.id === signerId);
    if (!found) return;
    setDoc((prev) => ({
      ...prev,
      quyenHanKy: found.quyenHan,
      chucVuKy: found.chucVu,
      hoTenKy: found.hoTen
    }));
  };

  // Bật/Tắt checkbox Nơi nhận có sẵn
  const handleToggleRecipient = (recipient: string) => {
    setDoc((prev) => {
      const exists = prev.noiNhanList.includes(recipient);
      const next = exists
        ? prev.noiNhanList.filter((r) => r !== recipient)
        : [...prev.noiNhanList, recipient];
      return { ...prev, noiNhanList: next };
    });
  };

  // Lưu lịch sử
  const handleSaveClick = () => {
    onSaveHistory();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  // Xuất file Word (.docx)
  const handleExportWord = async () => {
    try {
      setExportingDocx(true);
      await exportDocumentToDocx(doc);
    } finally {
      setExportingDocx(false);
    }
  };

  // In / Lưu PDF (@media print)
  const handlePrintPdf = () => {
    window.print();
  };

  // Sao chép toàn văn
  const handleCopyPlainText = async () => {
    const paperEl = document.getElementById('a4-preview-paper');
    const textToCopy = paperEl ? paperEl.innerText : doc.noiDung;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const dyn: DynamicFormData =
    doc.dynamicData ||
    buildDefaultTemplateForDocType(doc.mode, doc.docType, unitConfig).dynamicData;

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      {/* CỘT TRÁI (45%): FORM NHẬP LIỆU SOẠN THẢO */}
      <div className="w-full lg:w-[45%] space-y-4 no-print">
        {/* 1. CHỌN MẪU SOẠN SẴN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
              <Sparkles className="w-4 h-4" />
              1. Chọn mẫu văn bản soạn sẵn
            </h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${primaryBadge}`}>
              {PRESET_TEMPLATES.length} mẫu chuẩn
            </span>
          </div>

          <div className="space-y-2.5">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              {PRESET_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyTemplate}
                className={`flex-1 flex items-center justify-center gap-1.5 text-white text-sm font-medium py-2 px-3 rounded-lg shadow-sm transition ${primaryBg}`}
              >
                <FileText className="w-4 h-4" />
                Dùng mẫu này
              </button>
              <button
                type="button"
                onClick={onResetBlank}
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 px-3 rounded-lg border border-slate-300 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Văn bản trống
              </button>
            </div>
          </div>
        </div>

        {/* KHỐI TRỢ LÝ AI VĂN THƯ (2 CHẾ ĐỘ: SOẠN TỪ Ý CHÍNH & CHỈNH SỬA TỪ FILE MẪU .DOCX/.PDF/.TXT) */}
        <div className="bg-gradient-to-br from-indigo-50/95 via-white to-blue-50/80 rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
          {/* Header Khối AI */}
          <div className="p-3.5 bg-indigo-600/5 border-b border-indigo-100 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAiExpanded((prev) => !prev)}
              className="flex items-center gap-2 text-left group"
            >
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-indigo-950 uppercase tracking-wide">
                    Trợ lý AI Văn thư (Google Gemini)
                  </span>
                  {aiExpanded ? (
                    <ChevronUp className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600">
                  Soạn thảo tự động từ ý chính hoặc tải file mẫu (.docx, .pdf, .txt) lên để AI sửa theo đơn vị
                </p>
              </div>
            </button>

            {/* Nút góc trên bên phải: ⚙️ Cài đặt API Key */}
            <button
              type="button"
              onClick={onOpenApiKeyConfig}
              title="Nhấn để chuyển tới mục Cài đặt Gemini API Key tại Tab 6 (Cấu hình đơn vị)"
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border shadow-sm transition ${
                hasApiKey
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Cài đặt API Key:</span>
              <span className="underline">
                {hasApiKey ? `Đã kết nối (${currentAiModel})` : 'Chưa có API Key'}
              </span>
            </button>
          </div>

          {aiExpanded && (
            <div className="p-4 space-y-3.5">
              {/* 2 Tab con chuyển đổi nhanh: Chế độ A & Chế độ B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAiModeTab('IDEAS');
                    setAiError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
                    aiModeTab === 'IDEAS'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ✨ AI Hỗ trợ soạn thảo (Từ ý chính)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiModeTab('UPLOAD');
                    setAiError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
                    aiModeTab === 'UPLOAD'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  📂 Tải văn bản mẫu lên & Chỉnh sửa bằng AI
                </button>
              </div>

              {/* Thanh trạng thái loại văn bản & đơn vị đang áp dụng */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
                <div className="text-slate-700">
                  Đang soạn:{' '}
                  <strong className="text-indigo-900">
                    {currentDocTypeInfo?.name} ({doc.docType}) –{' '}
                    {isState ? 'Khối Nhà nước (NĐ 30/2020)' : 'Khối Đảng (HD 05-HD/VPTW)'}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  Đơn vị: <strong className="text-slate-800">{doc.coQuanBanHanh}</strong>
                </div>
              </div>

              {/* CHẾ ĐỘ A: AI HỖ TRỢ SOẠN THẢO TỪ Ý CHÍNH */}
              {aiModeTab === 'IDEAS' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Nhập các ý chính, gạch đầu dòng hoặc nội dung cần soạn thảo:
                      </label>
                      <span className="text-[11px] text-slate-500">Chèn gợi ý nhanh bên dưới</span>
                    </div>

                    {/* 3 nút chèn gợi ý nhanh */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAiIdeasPrompt(
                            `Soạn ${currentDocTypeInfo?.name || 'văn bản'} của ${doc.coQuanBanHanh} về việc triển khai nhiệm vụ cải cách hành chính, chuyển đổi số và chuẩn hóa văn thư lưu trữ năm 2027 tại ${doc.diaDanh}; phân công rõ trách nhiệm cho Văn phòng và các bộ phận chuyên môn.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        + Gợi ý 1: Chuyển đổi số & CCHC
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiIdeasPrompt(
                            `Soạn ${currentDocTypeInfo?.name || 'văn bản'} của ${doc.coQuanBanHanh} đề xuất phê duyệt kinh phí 95.000.000 đồng để mua sắm trang thiết bị máy tính, máy quét số hóa hồ sơ phục vụ bộ phận Một cửa xã ${doc.diaDanh} năm 2027.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        + Gợi ý 2: Đề xuất kinh phí & Thiết bị
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiIdeasPrompt(
                            `Soạn ${currentDocTypeInfo?.name || 'văn bản'} của ${doc.coQuanBanHanh} về tổ chức Hội nghị tổng kết công tác năm 2026 và triển khai phương hướng, nhiệm vụ trọng tâm năm 2027 tại Hội trường ${doc.coQuanBanHanh}, thời gian dự kiến ngày 28/12/2026.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        + Gợi ý 3: Hội nghị tổng kết năm
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={aiIdeasPrompt}
                      onChange={(e) => setAiIdeasPrompt(e.target.value)}
                      placeholder={`Ví dụ: Soạn ${currentDocTypeInfo?.name?.toLowerCase() || 'văn bản'} về việc kiểm tra công tác phòng chống thiên tai và tìm kiếm cứu nạn trên địa bàn ${doc.diaDanh}; thời gian thực hiện từ ngày 01/12/2026; giao Văn phòng tổng hợp báo cáo...`}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAiFromIdeas}
                    disabled={aiLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-md transition"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {aiLoadingStatus ||
                            `AI đang soạn thảo chuẩn thể thức (${currentAiModel})...`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Soạn thảo & Điền vào Form</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* CHẾ ĐỘ B: TẢI VĂN BẢN MẪU (.DOCX, .PDF, .TXT) LÊN & CHỈNH SỬA BẰNG AI */}
              {aiModeTab === 'UPLOAD' && (
                <div className="space-y-3">
                  {/* Khung chọn / kéo-thả file */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleProcessSelectedFile(f);
                    }}
                    className="hidden"
                  />

                  {!uploadedSample ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleProcessSelectedFile(f);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
                        isDraggingFile
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-indigo-300 bg-white hover:bg-indigo-50/40'
                      }`}
                    >
                      {parsingFile ? (
                        <div className="flex flex-col items-center justify-center py-2 text-indigo-700">
                          <Loader2 className="w-6 h-6 animate-spin mb-1.5" />
                          <span className="text-xs font-bold">
                            Đang trích xuất nội dung văn bản mẫu...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            Nhấn để chọn file văn bản mẫu hoặc kéo-thả file vào đây
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Hỗ trợ <strong>.DOCX</strong> (Word), <strong>.PDF</strong> và{' '}
                            <strong>.TXT</strong> (Tối đa 10MB – Xử lý trực tiếp trên trình duyệt)
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Hiển thị file đã tải lên */
                    <div className="p-3 rounded-xl bg-white border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-1 rounded-md text-[11px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                            .{uploadedSample.fileType}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {uploadedSample.fileName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Dung lượng: {(uploadedSample.fileSize / 1024).toFixed(1)} KB •{' '}
                              {uploadedSample.fileType === 'pdf'
                                ? 'Đã mã hóa PDF trực tiếp cho Gemini Vision/Document AI'
                                : `Đã trích xuất ${uploadedSample.extractedText?.length.toLocaleString(
                                    'vi-VN'
                                  )} ký tự văn bản`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            Đổi file
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadedSample(null)}
                            title="Xóa file mẫu"
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {uploadedSample.extractedText && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-20 overflow-y-auto font-mono">
                          {uploadedSample.extractedText.slice(0, 400)}
                          {uploadedSample.extractedText.length > 400 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ô nhập Yêu cầu chỉnh sửa + 3 chip chọn nhanh */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Yêu cầu AI chỉnh sửa / chuyển hóa văn bản mẫu:
                      </label>
                    </div>

                    {/* 3 chip bấm chọn nhanh yêu cầu mẫu */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAiEditInstruction(
                            `Chuyển toàn bộ thông tin sang đơn vị "${doc.coQuanBanHanh}" (cơ quan cấp trên: "${doc.coQuanChuQuan}", địa danh: "${doc.diaDanh}"); người ký "${doc.hoTenKy}" (${doc.chucVuKy}); cập nhật thời gian sang năm 2026–2027 và điều chỉnh các nội dung cho sát thực tế địa phương.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        🔄 Chuyển về đơn vị của tôi
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAiEditInstruction(
                            `Viết lại toàn bộ văn bản mẫu theo đúng chuẩn văn phong hành chính công vụ (${
                              isState ? 'Nghị định 30/2020/NĐ-CP' : 'Hướng dẫn 05-HD/VPTW'
                            }), chia rõ các đề mục I, 1, a, - và áp dụng cho đơn vị ${doc.coQuanBanHanh}.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        ✍️ Viết lại chuẩn văn phong hành chính
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAiEditInstruction(
                            `Rút gọn văn bản mẫu cho súc tích, cô đọng, lược bỏ các mục rườm rà không phù hợp với cấp xã; giữ lại các nhiệm vụ trọng tâm và chuyển về đơn vị ${doc.coQuanBanHanh}.`
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition"
                      >
                        ✂️ Rút gọn súc tích hơn
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={aiEditInstruction}
                      onChange={(e) => setAiEditInstruction(e.target.value)}
                      placeholder="Ví dụ: Chuyển sang đơn vị UBND xã Nam Giang, tỉnh Việt Thanh; cập nhật thời gian sang năm 2026–2027; bỏ các mục không phù hợp với cấp xã..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAiTransformSample}
                    disabled={aiLoading || parsingFile}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-md transition"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {aiLoadingStatus ||
                            `AI đang phân tích file mẫu & biên tập lại (${currentAiModel})...`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Sửa lại theo mẫu & Điền vào Form</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Hộp thông báo lỗi rõ ràng bằng tiếng Việt (kèm nút nhảy sang Tab 6 nếu chưa có Key / sai Key) */}
              {aiError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="font-medium leading-relaxed">{aiError.message}</div>
                    {aiError.needKeyConfig && (
                      <button
                        type="button"
                        onClick={onOpenApiKeyConfig}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Mở Tab 6: Cấu hình Gemini API Key ngay
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Hộp thông báo thành công */}
              {aiSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiSuccessMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. THÔNG TIN HÀNH CHÍNH & SỐ KÝ HIỆU */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3.5">
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
            <Building2 className="w-4 h-4" />
            2. Thông tin thể thức & Số ký hiệu
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Loại văn bản ({isState ? 'NĐ 30/2020' : 'HD 05-HD/VPTW'})
              </label>
              <div className="flex flex-col gap-1.5">
                <select
                  value={doc.docType}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableDocTypes.map((dt) => (
                    <option key={dt.code} value={dt.code}>
                      {dt.name} ({dt.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleApplyCurrentDocTypeTemplate}
                  className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition"
                >
                  {appliedTypeToast ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Đã nạp mẫu {currentDocTypeInfo?.name} ({doc.docType})!
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Dùng mẫu theo loại này ({currentDocTypeInfo?.name})
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Chữ viết tắt cơ quan ban hành
              </label>
              <input
                type="text"
                value={doc.kyHieuCoQuan}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setDoc((prev) => ({
                    ...prev,
                    kyHieuCoQuan: val,
                    kyHieu: prev.autoKyHieu ? buildAutoKyHieu(prev.mode, prev.docType, val) : prev.kyHieu
                  }));
                }}
                placeholder={isState ? 'VD: UBND, HĐND' : 'VD: ĐU, TU, HU'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Ký hiệu tự động: <strong className={primaryText}>{buildAutoKyHieu(doc.mode, doc.docType, doc.kyHieuCoQuan)}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cơ quan cấp trên trực tiếp
              </label>
              <input
                type="text"
                value={doc.coQuanChuQuan}
                onChange={(e) => setDoc((prev) => ({ ...prev, coQuanChuQuan: e.target.value }))}
                placeholder={isState ? 'ỦY BAN NHÂN DÂN TỈNH VIỆT THANH' : 'ĐẢNG BỘ TỈNH VIỆT THANH'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cơ quan ban hành văn bản *
              </label>
              <input
                type="text"
                value={doc.coQuanBanHanh}
                onChange={(e) => setDoc((prev) => ({ ...prev, coQuanBanHanh: e.target.value }))}
                placeholder={isState ? 'ỦY BAN NHÂN DÂN XÃ NAM GIANG' : 'ĐẢNG ỦY XÃ NAM GIANG'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Số văn bản + Nút Gợi ý số tiếp theo & Ký hiệu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                <span>Số văn bản</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isState ? 'Bỏ số 0 đầu (<10)' : 'Giữ số 0 đầu (<10)'}
                </span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={doc.soVanBan}
                  onChange={(e) => setDoc((prev) => ({ ...prev, soVanBan: e.target.value }))}
                  onBlur={() =>
                    setDoc((prev) => ({
                      ...prev,
                      soVanBan: normalizeSoVanBan(prev.mode, prev.soVanBan)
                    }))
                  }
                  placeholder={isState ? 'VD: 1, 2, 15' : 'VD: 01, 02, 15'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSuggestNumber}
                  title="Tự động đếm số lớn nhất trong lịch sử theo loại văn bản + 1"
                  className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-lg border transition ${primaryBadge} hover:opacity-90`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Gợi ý số tiếp theo
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">Ký hiệu văn bản</label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={doc.autoKyHieu}
                    onChange={(e) => handleAutoKyHieuToggle(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Tự ghép theo loại & CQ</span>
                </label>
              </div>
              <input
                type="text"
                value={doc.kyHieu}
                disabled={doc.autoKyHieu}
                onChange={(e) => setDoc((prev) => ({ ...prev, kyHieu: e.target.value }))}
                placeholder={isState ? '/KH-UBND' : '-NQ/ĐU'}
                className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:outline-none ${
                  doc.autoKyHieu ? 'bg-slate-100 text-slate-700' : 'bg-white'
                }`}
              />
            </div>
          </div>

          {/* Địa danh & Ngày ban hành */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Địa danh ban hành
              </label>
              <input
                type="text"
                value={doc.diaDanh}
                onChange={(e) => setDoc((prev) => ({ ...prev, diaDanh: e.target.value }))}
                placeholder="VD: Nam Giang"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Ngày ban hành
              </label>
              <input
                type="date"
                value={doc.ngayBanHanh}
                onChange={(e) => setDoc((prev) => ({ ...prev, ngayBanHanh: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Trích yếu nội dung */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                {doc.docType === 'CV'
                  ? 'Trích yếu Công văn (V/v ... đặt ngay dưới Số, ký hiệu) *'
                  : 'Trích yếu nội dung văn bản *'}
              </label>
              <span className="text-[11px] text-slate-500">
                {doc.docType === 'CV'
                  ? 'Đặt dưới Số, ký hiệu (NĐ 30)'
                  : isState
                  ? 'Cỡ 14 đậm + kẻ ngang dưới'
                  : 'Cỡ 14 in thường + không kẻ ngang'}
              </span>
            </div>
            <textarea
              rows={2}
              value={doc.trichYeu}
              onChange={(e) => setDoc((prev) => ({ ...prev, trichYeu: e.target.value }))}
              placeholder={
                doc.docType === 'CV'
                  ? 'V/v chấn chỉnh, nâng cao chất lượng soạn thảo văn bản hành chính...'
                  : 'Về việc tổ chức hội nghị tổng kết công tác năm 2026 và triển khai nhiệm vụ năm 2027...'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dòng Kính gửi (tùy chọn hoặc dành cho Công văn, Tờ trình, Báo cáo) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kính gửi (Chữ đứng, in thường chuẩn NĐ 30 - dùng cho Công văn, Tờ trình, Báo cáo)
            </label>
            <input
              type="text"
              value={doc.kinhGui}
              onChange={(e) => setDoc((prev) => ({ ...prev, kinhGui: e.target.value }))}
              placeholder="VD: Ủy ban nhân dân tỉnh Việt Thanh / Các bộ phận chuyên môn trực thuộc"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 2.5. FORM NHẬP LIỆU CHUYÊN BIỆT THEO TỪNG LOẠI VĂN BẢN (DYNAMIC FORM) */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300 p-4 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-amber-800">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                Form nhập liệu động: {currentDocTypeInfo?.name} ({doc.docType})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Điền/sửa trực tiếp các trường chuyên biệt bên dưới — tự đồng bộ realtime sang Preview A4 & file .DOCX
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyCurrentDocTypeTemplate}
              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition"
            >
              Nạp lại mẫu chuẩn {doc.docType}
            </button>
          </div>

          {/* CASE 1: HỢP ĐỒNG (HĐ) */}
          {doc.docType === 'HĐ' && (
            <div className="space-y-3 text-xs">
              {/* BÊN A */}
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="font-bold text-[#1e4b7a] uppercase">
                  Thông tin Bên A (Bên giao / Cơ quan ký kết)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Tên đơn vị / Cá nhân Bên A</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.tenDonVi ?? DEFAULT_PARTY_A.tenDonVi}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), tenDonVi: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Người đại diện Bên A</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.daiDien ?? DEFAULT_PARTY_A.daiDien}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), daiDien: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Chức vụ Bên A</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.chucVu ?? DEFAULT_PARTY_A.chucVu}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), chucVu: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Địa chỉ Bên A</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.diaChi ?? DEFAULT_PARTY_A.diaChi}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), diaChi: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Mã số thuế / CCCD</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.mstCccd ?? DEFAULT_PARTY_A.mstCccd}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), mstCccd: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Số điện thoại</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.dienThoai ?? DEFAULT_PARTY_A.dienThoai}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), dienThoai: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Số tài khoản & Kho bạc / Ngân hàng</label>
                    <input
                      type="text"
                      value={dyn.hdBenA?.soTaiKhoan ?? DEFAULT_PARTY_A.soTaiKhoan}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenA: { ...(d.hdBenA || DEFAULT_PARTY_A), soTaiKhoan: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* BÊN B */}
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-800 uppercase">
                  Thông tin Bên B (Nhà thầu / Đơn vị cung cấp / Cá nhân)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Tên đơn vị / Cá nhân Bên B</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.tenDonVi ?? DEFAULT_PARTY_B.tenDonVi}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), tenDonVi: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Người đại diện Bên B</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.daiDien ?? DEFAULT_PARTY_B.daiDien}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), daiDien: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Chức vụ Bên B</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.chucVu ?? DEFAULT_PARTY_B.chucVu}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), chucVu: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Địa chỉ Bên B</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.diaChi ?? DEFAULT_PARTY_B.diaChi}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), diaChi: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Mã số thuế / CCCD</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.mstCccd ?? DEFAULT_PARTY_B.mstCccd}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), mstCccd: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Số điện thoại</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.dienThoai ?? DEFAULT_PARTY_B.dienThoai}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), dienThoai: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-0.5">Số tài khoản & Ngân hàng</label>
                    <input
                      type="text"
                      value={dyn.hdBenB?.soTaiKhoan ?? DEFAULT_PARTY_B.soTaiKhoan}
                      onChange={(e) =>
                        updateDynamicData((d) => ({
                          ...d,
                          hdBenB: { ...(d.hdBenB || DEFAULT_PARTY_B), soTaiKhoan: e.target.value }
                        }))
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* THÔNG TIN CÔNG VIỆC, GIÁ TRỊ, THỜI HẠN, THANH TOÁN */}
              <div className="space-y-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Điều 1. Loại tài sản / Nội dung công việc hợp đồng
                  </label>
                  <textarea
                    rows={2}
                    value={dyn.hdNoiDungCongViec || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, hdNoiDungCongViec: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Giá trị hợp đồng (Bằng số)
                    </label>
                    <input
                      type="text"
                      value={dyn.hdGiaTriSo || ''}
                      onChange={(e) =>
                        updateDynamicData((d) => ({ ...d, hdGiaTriSo: e.target.value }))
                      }
                      placeholder="VD: 85.000.000 đồng"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Giá trị hợp đồng (Bằng chữ)
                    </label>
                    <input
                      type="text"
                      value={dyn.hdGiaTriChu || ''}
                      onChange={(e) =>
                        updateDynamicData((d) => ({ ...d, hdGiaTriChu: e.target.value }))
                      }
                      placeholder="VD: Tám mươi lăm triệu đồng chẵn"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs italic"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Phương thức thanh toán (Điều 2)
                  </label>
                  <textarea
                    rows={2}
                    value={dyn.hdPhuongThucThanhToan || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, hdPhuongThucThanhToan: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Điều 3. Thời hạn thực hiện hợp đồng
                  </label>
                  <input
                    type="text"
                    value={dyn.hdThoiHan || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, hdThoiHan: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* DANH SÁCH CÁC ĐIỀU KHOẢN BỔ SUNG */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    Các Điều khoản tiếp theo (Điều 4, Điều 5...)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateDynamicData((d) => ({
                        ...d,
                        hdDieuKhoan: [
                          ...(d.hdDieuKhoan || []),
                          { tieuDe: 'Cam kết thực hiện', noiDung: '' }
                        ]
                      }))
                    }
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded text-white ${primaryBg}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Thêm điều
                  </button>
                </div>

                {(dyn.hdDieuKhoan || []).map((cl, idx) => (
                  <div key={idx} className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 shrink-0">Điều {idx + 4}.</span>
                      <input
                        type="text"
                        value={cl.tieuDe}
                        onChange={(e) =>
                          updateDynamicData((d) => {
                            const list = [...(d.hdDieuKhoan || [])];
                            list[idx] = { ...list[idx], tieuDe: e.target.value };
                            return { ...d, hdDieuKhoan: list };
                          })
                        }
                        placeholder="Tiêu đề điều khoản..."
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDynamicData((d) => ({
                            ...d,
                            hdDieuKhoan: (d.hdDieuKhoan || []).filter((_, i) => i !== idx)
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={cl.noiDung}
                      onChange={(e) =>
                        updateDynamicData((d) => {
                          const list = [...(d.hdDieuKhoan || [])];
                          list[idx] = { ...list[idx], noiDung: e.target.value };
                          return { ...d, hdDieuKhoan: list };
                        })
                      }
                      placeholder="Nội dung chi tiết của điều khoản..."
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CASE 2: TỜ TRÌNH (TTr) */}
          {doc.docType === 'TTr' && (
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  I. Sự cần thiết ban hành / đề xuất
                </label>
                <textarea
                  rows={3}
                  value={dyn.ttrSuCanThiet || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, ttrSuCanThiet: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  II. Nội dung phương án đề xuất
                </label>
                <textarea
                  rows={3}
                  value={dyn.ttrNoiDungDeXuat || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, ttrNoiDungDeXuat: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  III. Kinh phí và nguồn thực hiện
                </label>
                <textarea
                  rows={2}
                  value={dyn.ttrKinhPhiNguon || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, ttrKinhPhiNguon: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  IV. Kiến nghị, đề xuất trình phê duyệt
                </label>
                <textarea
                  rows={2}
                  value={dyn.ttrKienNghi || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, ttrKienNghi: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>
          )}

          {/* CASE 3: QUYẾT ĐỊNH (QĐ) */}
          {doc.docType === 'QĐ' && (
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Xét đề nghị của / Theo đề nghị của (dòng cuối phần Căn cứ trước chữ QUYẾT ĐỊNH:)
                </label>
                <input
                  type="text"
                  value={dyn.qdXetDeNghi || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, qdXetDeNghi: e.target.value }))
                  }
                  placeholder="Theo đề nghị của Công chức Văn phòng - Thống kê xã Nam Giang..."
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs italic"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-700">
                  Danh sách các Điều của Quyết định
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateDynamicData((d) => ({
                      ...d,
                      qdDieuList: [
                        ...(d.qdDieuList || []),
                        { tieuDe: 'Nội dung điều mới', noiDung: '' }
                      ]
                    }))
                  }
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded text-white ${primaryBg}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Thêm Điều
                </button>
              </div>

              {(dyn.qdDieuList || []).map((dieu, idx) => (
                <div key={idx} className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 shrink-0">Điều {idx + 1}.</span>
                    <input
                      type="text"
                      value={dieu.tieuDe}
                      onChange={(e) =>
                        updateDynamicData((d) => {
                          const list = [...(d.qdDieuList || [])];
                          list[idx] = { ...list[idx], tieuDe: e.target.value };
                          return { ...d, qdDieuList: list };
                        })
                      }
                      placeholder="Tiêu đề / câu mở đầu Điều..."
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDynamicData((d) => ({
                          ...d,
                          qdDieuList: (d.qdDieuList || []).filter((_, i) => i !== idx)
                        }))
                      }
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={dieu.noiDung}
                    onChange={(e) =>
                      updateDynamicData((d) => {
                        const list = [...(d.qdDieuList || [])];
                        list[idx] = { ...list[idx], noiDung: e.target.value };
                        return { ...d, qdDieuList: list };
                      })
                    }
                    placeholder="Nội dung quy định chi tiết tại Điều này..."
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
          )}

          {/* CASE 4: CÔNG VĂN (CV) */}
          {doc.docType === 'CV' && (
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900">
                Chuẩn Nghị định 30/2020/NĐ-CP: Công văn <strong>ẩn tên loại văn bản ở giữa trang</strong> và tự động đưa Trích yếu (<code className="font-bold">V/v ...</code>) xuống ngay dưới <code className="font-bold">Số, ký hiệu</code> ở cột trái Header.
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Kính gửi (Cơ quan, tổ chức, cá nhân nhận công văn)
                </label>
                <input
                  type="text"
                  value={doc.kinhGui}
                  onChange={(e) => setDoc((prev) => ({ ...prev, kinhGui: e.target.value }))}
                  placeholder="Các ban, bộ phận chuyên môn và các đơn vị trực thuộc..."
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Nội dung Công văn
                </label>
                <textarea
                  rows={6}
                  value={dyn.cvNoiDung ?? doc.noiDung}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, cvNoiDung: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* CASE 5: BIÊN BẢN (BB) */}
          {doc.docType === 'BB' && (
            <div className="space-y-2.5 text-xs">
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                Cuối trang Biên bản tự động chuyển sang bố cục chữ ký 2 bên: <strong>THƯ KÝ</strong> (trái) – <strong>CHỦ TỌA</strong> (phải).
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Thời gian bắt đầu</label>
                  <input
                    type="text"
                    value={dyn.bbThoiGianBatDau || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbThoiGianBatDau: e.target.value }))
                    }
                    placeholder="08 giờ 00 phút, ngày 23/11/2026"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Thời gian kết thúc</label>
                  <input
                    type="text"
                    value={dyn.bbThoiGianKetThuc || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbThoiGianKetThuc: e.target.value }))
                    }
                    placeholder="11 giờ 15 phút cùng ngày"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Địa điểm tổ chức</label>
                <input
                  type="text"
                  value={dyn.bbDiaDiem || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, bbDiaDiem: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Họ tên Chủ tọa (Ký bên phải)</label>
                  <input
                    type="text"
                    value={dyn.bbChuToa || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbChuToa: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Chức vụ Chủ tọa</label>
                  <input
                    type="text"
                    value={dyn.bbChuToaChucVu || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbChuToaChucVu: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Họ tên Thư ký (Ký bên trái)</label>
                  <input
                    type="text"
                    value={dyn.bbThuKy || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbThuKy: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Chức vụ Thư ký</label>
                  <input
                    type="text"
                    value={dyn.bbThuKyChucVu || ''}
                    onChange={(e) =>
                      updateDynamicData((d) => ({ ...d, bbThuKyChucVu: e.target.value }))
                    }
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Thành phần tham dự</label>
                <textarea
                  rows={2}
                  value={dyn.bbThanhPhan || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, bbThanhPhan: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Nội dung diễn biến & Kết luận</label>
                <textarea
                  rows={5}
                  value={dyn.bbDienBien || ''}
                  onChange={(e) =>
                    updateDynamicData((d) => ({ ...d, bbDienBien: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>
          )}

          {/* CASE 6: KẾ HOẠCH (KH) / BÁO CÁO (BC) / THÔNG BÁO (TB) / NGHỊ QUYẾT (NQ) & CÁC LOẠI KHÁC */}
          {!['HĐ', 'TTr', 'QĐ', 'CV', 'BB'].includes(doc.docType) && (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Cấu trúc các Đề mục ({currentDocTypeInfo?.name})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateDynamicData((d) => ({
                      ...d,
                      sections: [
                        ...(d.sections || []),
                        { tieuDe: 'IV. ĐỀ MỤC MỚI', noiDung: '- Nội dung chi tiết...' }
                      ]
                    }))
                  }
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded text-white ${primaryBg}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Thêm đề mục
                </button>
              </div>

              {(dyn.sections || []).map((sec: ClauseItem, idx: number) => (
                <div key={idx} className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sec.tieuDe}
                      onChange={(e) =>
                        updateDynamicData((d) => {
                          const list = [...(d.sections || [])];
                          list[idx] = { ...list[idx], tieuDe: e.target.value };
                          return { ...d, sections: list };
                        })
                      }
                      placeholder="Tiêu đề mục (VD: I. MỤC ĐÍCH, YÊU CẦU)"
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-bold bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDynamicData((d) => ({
                          ...d,
                          sections: (d.sections || []).filter((_, i) => i !== idx)
                        }))
                      }
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={sec.noiDung}
                    onChange={(e) =>
                      updateDynamicData((d) => {
                        const list = [...(d.sections || [])];
                        list[idx] = { ...list[idx], noiDung: e.target.value };
                        return { ...d, sections: list };
                      })
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. CĂN CỨ BAN HÀNH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
                <BookOpen className="w-4 h-4" />
                3. Căn cứ ban hành / Căn cứ pháp lý
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động thêm dấu chấm phẩy <code className="font-bold text-slate-700">;</code> ở các dòng trên và dấu chấm <code className="font-bold text-slate-700">.</code> ở dòng cuối
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCanCu}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-sm transition ${primaryBg}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng
            </button>
          </div>

          {doc.canCu.length === 0 ? (
            <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-center">
              Chưa có dòng căn cứ nào (Thường dùng cho Kế hoạch, Quyết định, Nghị quyết, Hợp đồng). Nhấn <strong>+ Thêm dòng</strong> để bổ sung.
            </div>
          ) : (
            <div className="space-y-2">
              {doc.canCu.map((item, idx) => {
                const isLast = idx === doc.canCu.length - 1;
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-slate-400 mt-2.5 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleUpdateCanCu(idx, e.target.value)}
                        placeholder="Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm italic focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-[11px] text-slate-500 mt-0.5 pl-1">
                        Hiển thị chuẩn: <span className="italic text-slate-700">{formatCanCuLine(item, isLast)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCanCu(idx)}
                      className="mt-1.5 p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Xóa dòng căn cứ này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. NỘI DUNG VĂN BẢN (TOÀN VĂN ĐỒNG BỘ TỪ FORM ĐỘNG HOẶC SOẠN TRỰC TIẾP) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
                <FileText className="w-4 h-4" />
                4. Nội dung văn bản hoàn chỉnh
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động đồng bộ từ Form nhập liệu động ở trên hoặc chỉnh sửa trực tiếp từng dòng
              </p>
            </div>
            <button
              type="button"
              onClick={handleInsertOutline}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${primaryBadge} hover:opacity-90`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Chèn khung gợi ý ({doc.docType})
            </button>
          </div>

          <textarea
            rows={12}
            value={doc.noiDung}
            onChange={(e) => setDoc((prev) => ({ ...prev, noiDung: e.target.value }))}
            placeholder={`I. MỤC ĐÍCH, YÊU CẦU\n1. Mục đích\n- Nội dung chi tiết...\na) Về phía đơn vị:\n- Triển khai thực hiện...`}
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '15.5px',
              lineHeight: 1.55
            }}
            className="w-full rounded-lg border border-slate-300 p-3.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 a4-scroll-container"
          />
        </div>

        {/* 5. NGƯỜI KÝ & NƠI NHẬN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
            <UserCheck className="w-4 h-4" />
            5. Người ký & Nơi nhận
          </h3>

          {/* Dropdown chọn nhanh người ký từ Cấu hình */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Chọn nhanh Người ký từ Cấu hình đơn vị (Xã Nam Giang)
            </label>
            <select
              onChange={(e) => handleSelectSigner(e.target.value)}
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                -- Chọn lãnh đạo ký ban hành ({unitConfig.signers.length} cấu hình sẵn) --
              </option>
              {unitConfig.signers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.quyenHan ? `${s.quyenHan} - ` : ''}{s.chucVu}: {s.hoTen}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Quyền hạn ký (TM. / KT.)
              </label>
              <input
                type="text"
                value={doc.quyenHanKy}
                onChange={(e) => setDoc((prev) => ({ ...prev, quyenHanKy: e.target.value }))}
                placeholder={isState ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY'}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Chức vụ người ký *
              </label>
              <input
                type="text"
                value={doc.chucVuKy}
                onChange={(e) => setDoc((prev) => ({ ...prev, chucVuKy: e.target.value }))}
                placeholder={isState ? 'CHỦ TỊCH' : 'BÍ THƯ'}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Họ và tên người ký *
              </label>
              <input
                type="text"
                value={doc.hoTenKy}
                onChange={(e) => setDoc((prev) => ({ ...prev, hoTenKy: e.target.value }))}
                placeholder={isState ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Danh sách checkbox Nơi nhận có sẵn */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Danh sách Nơi nhận thường dùng (tích chọn)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-44 overflow-y-auto">
              {unitConfig.commonRecipients.map((recipient, idx) => {
                const checked = doc.noiNhanList.includes(recipient);
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-2 text-xs p-1.5 rounded cursor-pointer select-none transition ${
                      checked ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleRecipient(recipient)}
                      className="mt-0.5 rounded text-blue-600"
                    />
                    <span>{recipient}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ô nhập thêm nơi nhận tùy chỉnh & dòng Lưu: VT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thêm nơi nhận tùy chỉnh (mỗi dòng 1 nơi nhận)
              </label>
              <textarea
                rows={2}
                value={doc.noiNhanTuyChinh}
                onChange={(e) => setDoc((prev) => ({ ...prev, noiNhanTuyChinh: e.target.value }))}
                placeholder="Phòng Tài chính - Kế hoạch;\nCổng thông tin điện tử xã Nam Giang;"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Dòng Lưu văn thư cuối cùng (Bắt buộc) *
              </label>
              <input
                type="text"
                value={doc.luuVt}
                onChange={(e) => setDoc((prev) => ({ ...prev, luuVt: e.target.value }))}
                placeholder="Lưu: VT, VP."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Chuẩn: <code className="font-semibold">Lưu: VT, VP.</code> hoặc <code className="font-semibold">Lưu: VT, hồ sơ.</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI (55%): THANH CÔNG CỤ CỐ ĐỊNH + KHUNG LIVE PREVIEW TỜ GIẤY A4 CÓ THANH CUỘN DỌC ĐỘC LẬP */}
      <div className="w-full lg:w-[55%] lg:sticky lg:top-4 lg:h-[calc(100vh-110px)] flex flex-col gap-2.5 print-only-container">
        {/* THANH CÔNG CỤ CỘT PHẢI (CỐ ĐỊNH PHÍA TRÊN) */}
        <div className="shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Lưu vào lịch sử */}
            <button
              type="button"
              onClick={handleSaveClick}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition"
            >
              {savedToast ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {savedToast ? 'Đã lưu Lịch sử!' : 'Lưu vào lịch sử'}
            </button>

            {/* 2. Xuất Word (.docx) */}
            <button
              type="button"
              onClick={handleExportWord}
              disabled={exportingDocx}
              className={`flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition ${primaryBg}`}
            >
              <Download className="w-4 h-4" />
              {exportingDocx ? 'Đang tạo .docx...' : 'Xuất Word (.docx)'}
            </button>

            {/* 3. In / Lưu PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              In / Lưu PDF (A4)
            </button>

            {/* 4. Sao chép */}
            <button
              type="button"
              onClick={handleCopyPlainText}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedToast ? 'Đã sao chép!' : 'Sao chép'}
            </button>
          </div>

          {/* 5. Gửi sang Rà soát */}
          <button
            type="button"
            onClick={onSendToReview}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg border-2 transition ${primaryBorder} ${primaryText} hover:bg-slate-50`}
          >
            <ShieldCheck className="w-4 h-4" />
            Gửi sang Rà soát
          </button>
        </div>

        {/* Chú thích thông số trang A4 (Cố định phía trên) */}
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-200/80 text-[11px] text-slate-600 no-print">
          <span>
            Bản xem trước trực tiếp (Live Preview) • Khổ giấy <strong>A4 (210 × 297 mm)</strong> • Font <strong>Times New Roman</strong>
          </span>
          <span>
            Lề chuẩn: <strong>Trên 20mm • Dưới 20mm • Trái 30mm • Phải 15mm</strong>
          </span>
        </div>

        {/* KHUNG HIỂN THỊ TỜ GIẤY A4 CÓ THANH CUỘN DỌC ĐỘC LẬP */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto a4-scroll-container bg-slate-300/75 rounded-xl p-4 sm:p-6 pb-12 border border-slate-300 shadow-inner print-only-container">
          <A4Preview doc={doc} />
        </div>
      </div>
    </div>
  );
};
