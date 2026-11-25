import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  Inbox,
  Upload,
  Search,
  FileText,
  Palette,
  Megaphone,
  Copy,
  Printer,
  Download,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
  Building2,
  Calendar,
  Hash,
  Settings,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  LayoutGrid,
  ListChecks,
  GitCommitHorizontal,
  Edit3,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { AppMode, DocumentData, UnitConfig } from '../types';
import {
  GeminiDocResponse,
  GeminiServiceError,
  IncomingDocAnalysisResult,
  IncomingFileKind,
  InfographicAspectRatio,
  InfographicDataResult,
  InfographicLayoutStyle,
  MediaPostResult,
  ParsedIncomingFile,
  analyzeIncomingDocument,
  buildLocalInfographicFromAnalysis,
  generateImplementationDocFromIncoming,
  generateInfographicData,
  generateMediaPost,
  getStoredGeminiApiKey,
  getStoredGeminiModel,
  readIncomingFileInput
} from '../services/geminiService';
import {
  InfographicCanvas,
  getLockedInfographicDimensions
} from './InfographicCanvas';

export const INCOMING_DOC_SESSION_STORAGE = 'vts_incoming_doc_session';

export interface IncomingFileMeta {
  name: string;
  size: number;
  type: IncomingFileKind;
  mimeType?: string;
}

interface IncomingDocSavedSession {
  fileMeta: IncomingFileMeta | null;
  analysisResult: IncomingDocAnalysisResult | null;
  extraNotes: string;
  selectedImplDocType?: 'KH' | 'CV' | 'TB' | 'QĐ';
  infographicData: InfographicDataResult | null;
  aspectRatio: InfographicAspectRatio;
  layoutStyle: InfographicLayoutStyle;
  mediaPost: MediaPostResult | null;
  activePreviewTab: PreviewSubMode;
}

function loadSavedIncomingSession(): IncomingDocSavedSession | null {
  try {
    const raw = localStorage.getItem(INCOMING_DOC_SESSION_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (parsed.aspectRatio === '3:4') {
        parsed.aspectRatio = '4:3';
      }
      return parsed as IncomingDocSavedSession;
    }
  } catch {
    // ignore
  }
  return null;
}

interface IncomingDocTabProps {
  mode: AppMode;
  doc: DocumentData;
  unitConfig: UnitConfig;
  onTransferToEditor: (
    targetDocType: string,
    aiResult: GeminiDocResponse,
    bannerMessage: string
  ) => void;
  onOpenApiKeyConfig: () => void;
}

type PreviewSubMode = 'summary' | 'infographic' | 'media';

const IMPLEMENTATION_DOC_TYPES: Array<{ code: 'KH' | 'CV' | 'TB' | 'QĐ'; label: string }> = [
  { code: 'KH', label: 'Kế hoạch (KH)' },
  { code: 'CV', label: 'Công văn (CV)' },
  { code: 'TB', label: 'Thông báo (TB)' },
  { code: 'QĐ', label: 'Quyết định (QĐ)' }
];

const ASPECT_RATIO_OPTIONS: Array<{
  value: InfographicAspectRatio;
  label: string;
  subLabel: string;
  width: number;
  height: number;
}> = [
  { value: '1:1', label: '1:1 (Facebook / Zalo)', subLabel: '1080 × 1080 px', width: 1080, height: 1080 },
  { value: '4:3', label: '4:3 (Khổ ngang chuẩn / Bảng tin)', subLabel: '1440 × 1080 px', width: 1440, height: 1080 },
  { value: '16:9', label: '16:9 (Trình chiếu hội nghị HD)', subLabel: '1920 × 1080 px', width: 1920, height: 1080 },
  { value: '9:16', label: '9:16 (Điện thoại / Story dọc)', subLabel: '1080 × 1920 px', width: 1080, height: 1920 }
];

const LAYOUT_STYLE_OPTIONS: Array<{
  value: InfographicLayoutStyle;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'BENTO',
    label: 'Bento Tổng hợp (4 tầng)',
    icon: <LayoutGrid className="w-3.5 h-3.5" />
  },
  {
    value: 'LIST',
    label: 'Danh sách trọng tâm',
    icon: <ListChecks className="w-3.5 h-3.5" />
  },
  {
    value: 'TIMELINE',
    label: 'Mốc thời gian',
    icon: <GitCommitHorizontal className="w-3.5 h-3.5" />
  }
];

export const IncomingDocTab: React.FC<IncomingDocTabProps> = ({
  mode,
  doc,
  unitConfig,
  onTransferToEditor,
  onOpenApiKeyConfig
}) => {
  const isState = mode === 'NHA_NUOC';
  const primaryBg = isState
    ? 'bg-[#1e4b7a] hover:bg-[#173a5e]'
    : 'bg-[#b91c1c] hover:bg-[#991b1b]';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';
  const primarySoftBg = isState
    ? 'bg-blue-50/80 border-blue-200 text-[#1e4b7a]'
    : 'bg-red-50/80 border-red-200 text-[#b91c1c]';

  // --- STATE API KEY & MODEL ---
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(getStoredGeminiApiKey()));
  const [currentAiModel, setCurrentAiModel] = useState<string>(() => getStoredGeminiModel());

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

  // --- KHỞI TẠO TỪ PHIÊN LÀM VIỆC ĐÃ LƯU TRONG LOCALSTORAGE ---
  const [initialSession] = useState<IncomingDocSavedSession | null>(() =>
    loadSavedIncomingSession()
  );

  // --- STATE FILE VĂN BẢN ĐẾN ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [readingFile, setReadingFile] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<ParsedIncomingFile | null>(() => {
    const meta = initialSession?.fileMeta;
    if (meta && meta.name) {
      return {
        fileName: meta.name,
        fileSize: Number(meta.size) || 0,
        fileKind: meta.type || 'pdf',
        mimeType: meta.mimeType || 'application/pdf'
      };
    }
    return null;
  });
  const [fileMeta, setFileMeta] = useState<IncomingFileMeta | null>(
    () => initialSession?.fileMeta ?? null
  );

  // --- STATE KẾT QUẢ PHÂN TÍCH & CHUYỂN HÓA ---
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewSubMode>(() => {
    const savedTab = initialSession?.activePreviewTab;
    if (savedTab === 'summary' || savedTab === 'infographic' || savedTab === 'media') {
      return savedTab;
    }
    return 'summary';
  });
  const [analysisResult, setAnalysisResult] = useState<IncomingDocAnalysisResult | null>(
    () => initialSession?.analysisResult ?? null
  );
  const [infographicData, setInfographicData] = useState<InfographicDataResult | null>(
    () => initialSession?.infographicData ?? null
  );
  const [mediaPostData, setMediaPostData] = useState<MediaPostResult | null>(
    () => initialSession?.mediaPost ?? null
  );

  // --- STATE TÙY CHỌN CHUYỂN HÓA (KHỐI 2) ---
  const [unitActualNote, setUnitActualNote] = useState<string>(
    () => initialSession?.extraNotes ?? ''
  );
  const [selectedImplDocType, setSelectedImplDocType] = useState<'KH' | 'CV' | 'TB' | 'QĐ'>(
    () => initialSession?.selectedImplDocType ?? 'KH'
  );
  const [aspectRatio, setAspectRatio] = useState<InfographicAspectRatio>(() => {
    const saved = initialSession?.aspectRatio;
    if (saved === '1:1' || saved === '4:3' || saved === '16:9' || saved === '9:16') {
      return saved;
    }
    return '4:3';
  });
  const [layoutStyle, setLayoutStyle] = useState<InfographicLayoutStyle>(() => {
    const saved = initialSession?.layoutStyle;
    if (saved === 'BENTO' || saved === 'LIST' || saved === 'TIMELINE') {
      return saved;
    }
    return 'BENTO';
  });

  // Tự động lưu phiên làm việc của Tab 2 vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    try {
      const hasAnyData =
        Boolean(fileMeta) ||
        Boolean(analysisResult) ||
        Boolean(unitActualNote.trim()) ||
        Boolean(infographicData) ||
        Boolean(mediaPostData);

      if (!hasAnyData) {
        localStorage.removeItem(INCOMING_DOC_SESSION_STORAGE);
        return;
      }

      const sessionToSave: IncomingDocSavedSession = {
        fileMeta,
        analysisResult,
        extraNotes: unitActualNote,
        selectedImplDocType,
        infographicData,
        aspectRatio,
        layoutStyle,
        mediaPost: mediaPostData,
        activePreviewTab
      };
      localStorage.setItem(INCOMING_DOC_SESSION_STORAGE, JSON.stringify(sessionToSave));
    } catch {
      // ignore storage quota errors
    }
  }, [
    fileMeta,
    analysisResult,
    unitActualNote,
    selectedImplDocType,
    infographicData,
    aspectRatio,
    layoutStyle,
    mediaPostData,
    activePreviewTab
  ]);

  // Xóa phiên làm việc cũ để xử lý văn bản đến mới
  const handleClearIncomingSession = () => {
    try {
      localStorage.removeItem(INCOMING_DOC_SESSION_STORAGE);
    } catch {
      // ignore
    }
    setUploadedFile(null);
    setFileMeta(null);
    setAnalysisResult(null);
    setInfographicData(null);
    setMediaPostData(null);
    setUnitActualNote('');
    setActivePreviewTab('summary');
    setBlock1Error(null);
    setBlock2Error(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- STATE LOADING & ERROR TÁCH BIỆT RÕ CHO KHỐI 1 VÀ KHỐI 2 ---
  const [loadingAction, setLoadingAction] = useState<
    null | 'ANALYZE' | 'IMPLEMENTATION' | 'INFOGRAPHIC' | 'MEDIA_POST'
  >(null);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  // Lỗi ở Khối 1 (Tải file & Phân tích tóm tắt)
  const [block1Error, setBlock1Error] = useState<{
    message: string;
    needKeyConfig?: boolean;
  } | null>(null);

  // Lỗi hiển thị ngay bên trong Khối 2 (Tạo văn bản triển khai / Infographic / Tin tuyên truyền)
  const [block2Error, setBlock2Error] = useState<{
    message: string;
    needKeyConfig?: boolean;
    failedAction?: 'IMPLEMENTATION' | 'INFOGRAPHIC' | 'MEDIA_POST';
  } | null>(null);

  // --- STATE TOAST & EXPORT PNG ---
  const [copiedZaloToast, setCopiedZaloToast] = useState<boolean>(false);
  const [copiedMediaToast, setCopiedMediaToast] = useState<boolean>(false);
  const [exportingPng, setExportingPng] = useState<boolean>(false);
  const infographicCanvasRef = useRef<HTMLDivElement>(null);
  const infographicStageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.5);

  const scrollPreviewToTop = () => {
    requestAnimationFrame(() => {
      if (previewScrollContainerRef.current) {
        previewScrollContainerRef.current.scrollTop = 0;
      }
    });
  };

  // Chọn và đọc file đầu vào
  const handleSelectIncomingFile = async (file: File) => {
    setBlock1Error(null);
    setBlock2Error(null);
    setReadingFile(true);
    try {
      const parsed = await readIncomingFileInput(file);
      setUploadedFile(parsed);
      setFileMeta({
        name: parsed.fileName,
        size: parsed.fileSize,
        type: parsed.fileKind,
        mimeType: parsed.mimeType
      });
    } catch (err) {
      setBlock1Error({
        message:
          err instanceof Error
            ? err.message
            : 'Không thể đọc file đã chọn. Vui lòng kiểm tra lại định dạng file.'
      });
    } finally {
      setReadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatApiError = (err: unknown, defaultMsg: string) => {
    if (err instanceof GeminiServiceError) {
      return {
        message: err.message,
        needKeyConfig:
          err.code === 'NO_KEY' ||
          err.code === 'INVALID_KEY' ||
          err.code === 'MODEL_NOT_FOUND' ||
          err.code === 'QUOTA_EXCEEDED'
      };
    }
    return {
      message: err instanceof Error ? err.message : defaultMsg,
      needKeyConfig: false
    };
  };

  // 1. Nút chính Khối 1: Xử lý & Tóm tắt văn bản đến
  const handleAnalyzeIncoming = async () => {
    if (!uploadedFile) {
      setBlock1Error({
        message:
          'Vui lòng tải lên 01 file văn bản đến (.docx, .pdf, ảnh chụp .jpg/.png hoặc .txt) trước khi phân tích.'
      });
      return;
    }

    const isRestoredWithoutBinary =
      ((uploadedFile.fileKind === 'pdf' || uploadedFile.fileKind === 'image') &&
        !uploadedFile.base64Data) ||
      ((uploadedFile.fileKind === 'docx' || uploadedFile.fileKind === 'txt') &&
        !uploadedFile.extractedText);

    if (isRestoredWithoutBinary) {
      setBlock1Error({
        message:
          'Phiên làm việc hiện tại đã có sẵn Phiếu tóm tắt và sẵn sàng dùng ngay các nút ở Khối 2. Nếu bạn muốn AI đọc & phân tích lại từ đầu, vui lòng nhấn nút "Đổi file" để chọn lại file gốc từ máy.'
      });
      return;
    }

    setBlock1Error(null);
    setBlock2Error(null);
    setAiStatusMessage(null);
    setLoadingAction('ANALYZE');
    setActivePreviewTab('summary');

    try {
      const res = await analyzeIncomingDocument({
        file: uploadedFile,
        mode,
        unitConfig,
        onStatusChange: (msg) => setAiStatusMessage(msg)
      });

      const hasValidSummary =
        res &&
        res.thongTinVanBan &&
        Array.isArray(res.noiDungCotLoi) &&
        res.noiDungCotLoi.length > 0;

      if (!hasValidSummary) {
        throw new Error(
          'Không trích xuất được nội dung từ văn bản đến. Vui lòng kiểm tra lại file hoặc bấm "Thử lại".'
        );
      }

      setAnalysisResult(res);
      setActivePreviewTab('summary');
      scrollPreviewToTop();
    } catch (err) {
      setBlock1Error(formatApiError(err, 'Đã xảy ra lỗi khi phân tích văn bản đến.'));
    } finally {
      setLoadingAction(null);
      setAiStatusMessage(null);
    }
  };

  // 2. Mục 1 Khối 2: Tạo văn bản triển khai ở xã (từ JSON Khối 1, không gửi lại PDF nặng) & tự động đổ sang Tab 1
  const handleGenerateImplementationDoc = async () => {
    if (!analysisResult) {
      setBlock2Error({
        message:
          'Vui lòng bấm "Xử lý & Tóm tắt văn bản đến" ở Khối 1 trước khi tạo văn bản triển khai.'
      });
      return;
    }

    setBlock2Error(null);
    setAiStatusMessage(null);
    setLoadingAction('IMPLEMENTATION');
    try {
      const res = await generateImplementationDocFromIncoming({
        analysis: analysisResult,
        targetDocType: selectedImplDocType,
        unitNote: unitActualNote,
        docContext: doc,
        onStatusChange: (msg) => setAiStatusMessage(msg)
      });

      const docLabel =
        IMPLEMENTATION_DOC_TYPES.find((d) => d.code === selectedImplDocType)?.label ||
        selectedImplDocType;

      const info = analysisResult.thongTinVanBan || analysisResult.thongTinVanBanDen;

      onTransferToEditor(
        selectedImplDocType,
        res,
        `Đã tự động soạn thảo ${docLabel} triển khai văn bản đến "${info?.soKyHieu || ''}" của ${info?.coQuanBanHanh || ''} và nạp hoàn tất vào Form & Bản xem trước A4!`
      );
    } catch (err) {
      setBlock2Error({
        ...formatApiError(err, 'Đã xảy ra lỗi khi tạo văn bản triển khai.'),
        failedAction: 'IMPLEMENTATION'
      });
    } finally {
      setLoadingAction(null);
      setAiStatusMessage(null);
    }
  };

  // 3. Mục 2 Khối 2: Tạo Infographic truyền thông chuyên nghiệp (từ JSON Khối 1 + Tự động Zero-API Fallback khi chạm hạn mức 429/503)
  const handleGenerateInfographic = async () => {
    if (!analysisResult) {
      setBlock2Error({
        message:
          'Vui lòng bấm "Xử lý & Tóm tắt văn bản đến" ở Khối 1 trước khi tạo Infographic.'
      });
      return;
    }

    setBlock2Error(null);
    setAiStatusMessage(null);
    setLoadingAction('INFOGRAPHIC');
    try {
      const res = await generateInfographicData({
        analysis: analysisResult,
        aspectRatio,
        layoutStyle,
        layout: layoutStyle,
        unitNote: unitActualNote,
        mode,
        unitConfig,
        onStatusChange: (msg) => setAiStatusMessage(msg)
      });
      setInfographicData(res);
      setActivePreviewTab('infographic');
      scrollPreviewToTop();
    } catch (err) {
      if (
        err instanceof GeminiServiceError &&
        (err.code === 'QUOTA_EXCEEDED' ||
          err.code === 'SERVER_OVERLOADED' ||
          err.httpStatus === 429 ||
          err.httpStatus === 503)
      ) {
        const localInfographic = buildLocalInfographicFromAnalysis(
          analysisResult,
          unitConfig,
          mode,
          unitActualNote
        );
        setInfographicData(localInfographic);
        setActivePreviewTab('infographic');
        scrollPreviewToTop();
      } else {
        setBlock2Error({
          ...formatApiError(err, 'Đã xảy ra lỗi khi tạo dữ liệu Infographic.'),
          failedAction: 'INFOGRAPHIC'
        });
      }
    } finally {
      setLoadingAction(null);
      setAiStatusMessage(null);
    }
  };

  // 4. Mục 3 Khối 2: Viết tin tuyên truyền Zalo / Facebook / Trang TTĐT (từ JSON Khối 1)
  const handleGenerateMediaPost = async () => {
    if (!analysisResult) {
      setBlock2Error({
        message:
          'Vui lòng bấm "Xử lý & Tóm tắt văn bản đến" ở Khối 1 trước khi viết tin tuyên truyền.'
      });
      return;
    }

    setBlock2Error(null);
    setAiStatusMessage(null);
    setLoadingAction('MEDIA_POST');
    try {
      const res = await generateMediaPost({
        analysis: analysisResult,
        unitNote: unitActualNote,
        mode,
        unitConfig,
        onStatusChange: (msg) => setAiStatusMessage(msg)
      });
      setMediaPostData(res);
      setActivePreviewTab('media');
      scrollPreviewToTop();
    } catch (err) {
      setBlock2Error({
        ...formatApiError(err, 'Đã xảy ra lỗi khi viết tin tuyên truyền.'),
        failedAction: 'MEDIA_POST'
      });
    } finally {
      setLoadingAction(null);
      setAiStatusMessage(null);
    }
  };

  // Sao chép Phiếu tóm tắt định dạng sạch gửi Zalo Lãnh đạo
  const handleCopySummaryForZalo = async () => {
    if (!analysisResult) return;
    const info = analysisResult.thongTinVanBan || analysisResult.thongTinVanBanDen;
    const safeCore = Array.isArray(analysisResult.noiDungCotLoi)
      ? analysisResult.noiDungCotLoi
      : [];
    const safeDeadlines = Array.isArray(analysisResult.mocThoiGianVaHanBaoCao)
      ? analysisResult.mocThoiGianVaHanBaoCao
      : [];
    const safeMocStrings = Array.isArray(analysisResult.mocThoiGian)
      ? analysisResult.mocThoiGian
      : [];
    const safeTasks = Array.isArray(analysisResult.nhiemVuCapXaVaPhanCong)
      ? analysisResult.nhiemVuCapXaVaPhanCong
      : [];
    const safeTaskStrings = Array.isArray(analysisResult.nhiemVuCapXa)
      ? analysisResult.nhiemVuCapXa
      : [];
    const butPhe =
      analysisResult.butPheLanhDao || analysisResult.goiYButPheLanhDao || '';

    const deadlineLines =
      safeDeadlines.length > 0
        ? safeDeadlines.map((d) => `⏰ ${d.thoiHan}: ${d.noiDungHan}`)
        : safeMocStrings.length > 0
        ? safeMocStrings.map((m) => `⏰ ${m}`)
        : [`⏰ Triển khai thường xuyên / Theo quy định`];

    const taskLines =
      safeTasks.length > 0
        ? safeTasks.map(
            (t, idx) =>
              `${idx + 1}. ${t.nhiemVu}\n   👉 Chủ trì: ${t.boPhanChuTri} | Phối hợp: ${
                t.boPhanPhoiHop
              } (${t.thoiHanHoanThanh})`
          )
        : safeTaskStrings.map((t, idx) => `${idx + 1}. ${t}`);

    const lines: string[] = [
      `📋 PHIẾU TÓM TẮT & THAM MƯU VĂN BẢN ĐẾN`,
      `🏛️ Đơn vị: ${unitConfig.coQuanBanHanh}`,
      `────────────────────`,
      `1️⃣ THÔNG TIN VĂN BẢN ĐẾN:`,
      `• Số/Ký hiệu: ${info?.soKyHieu || ''} (${info?.loaiVanBan || 'Văn bản chỉ đạo'})`,
      `• Ngày ban hành: ${info?.ngayBanHanh || ''}`,
      `• Cơ quan ban hành: ${info?.coQuanBanHanh || ''}`,
      `• Trích yếu: ${info?.trichYeu || ''}`,
      ``,
      `2️⃣ NỘI DUNG CỐT LÕI:`,
      ...safeCore.map((item) => `• ${item}`),
      ``,
      `3️⃣ MỐC THỜI GIAN & HẠN BÁO CÁO:`,
      ...deadlineLines,
      ``,
      `4️⃣ NHIỆM VỤ CẤP XÃ & GỢI Ý PHÂN CÔNG:`,
      ...taskLines,
      ``,
      `5️⃣ GỢI Ý BÚT PHÊ TRÌNH LÃNH ĐẠO:`,
      `✍️ "${butPhe}"`
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedZaloToast(true);
    setTimeout(() => setCopiedZaloToast(false), 2500);
  };

  // In Phiếu tham mưu
  const handlePrintSummary = () => {
    window.print();
  };

  const infoDims = getLockedInfographicDimensions(aspectRatio);

  // Tự động tính hệ số thu phóng (scale) bằng ResizeObserver để hiển thị trọn vẹn đúng tỉ lệ 100% trên màn hình laptop
  useEffect(() => {
    const computeScale = () => {
      const stageEl = infographicStageRef.current;
      const scrollEl = previewScrollContainerRef.current;
      const rawWidth = stageEl?.clientWidth || scrollEl?.clientWidth || 720;
      const rawHeight = scrollEl?.clientHeight || window.innerHeight - 240;

      const availableW = Math.max(300, rawWidth - 16);
      const availableH = Math.max(360, rawHeight - 85);

      const nextScale = Math.min(
        availableW / infoDims.width,
        availableH / infoDims.height,
        1
      );
      setPreviewScale(Number(Math.max(0.22, nextScale).toFixed(4)));
    };

    computeScale();
    const ro = new ResizeObserver(() => computeScale());
    if (infographicStageRef.current) ro.observe(infographicStageRef.current);
    if (previewScrollContainerRef.current) ro.observe(previewScrollContainerRef.current);
    window.addEventListener('resize', computeScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeScale);
    };
  }, [infoDims.width, infoDims.height, activePreviewTab, infographicData]);

  // Tải ảnh Infographic (.PNG sắc nét) bằng html-to-image với kích thước pixel khóa cứng tuyệt đối
  const handleDownloadInfographicPng = async () => {
    if (!infographicCanvasRef.current) return;
    setExportingPng(true);
    setBlock2Error(null);
    try {
      const node = infographicCanvasRef.current;
      const W = infoDims.width;
      const H = infoDims.height;

      const dataUrl = await toPng(node, {
        width: W,
        height: H,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#EBF5FE',
        style: {
          width: `${W}px`,
          height: `${H}px`,
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0'
        }
      });

      const link = document.createElement('a');
      const safeUnit = (unitConfig.diaDanh || 'DonVi').replace(/\s+/g, '_');
      link.download = `Infographic_${safeUnit}_${aspectRatio.replace(':', 'x')}_${W}x${H}px_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setBlock2Error({
        message:
          err instanceof Error
            ? `Không thể xuất ảnh PNG: ${err.message}`
            : 'Đã xảy ra lỗi khi kết xuất ảnh Infographic PNG.'
      });
    } finally {
      setExportingPng(false);
    }
  };

  // Sao chép bài truyền thông Zalo / Trang TTĐT
  const handleCopyMediaPost = async () => {
    if (!mediaPostData) return;
    const safeTags = Array.isArray(mediaPostData.hashtags) ? mediaPostData.hashtags : [];
    const fullPost = `${mediaPostData.tieuDeBaiDang || ''}\n\n${
      mediaPostData.noiDungBaiDang || ''
    }\n\n${safeTags.join(' ')}`;
    await navigator.clipboard.writeText(fullPost);
    setCopiedMediaToast(true);
    setTimeout(() => setCopiedMediaToast(false), 2500);
  };

  // Các biến mảng đã được bảo vệ bằng Array.isArray để không bao giờ crash khi render
  const summaryInfo =
    analysisResult?.thongTinVanBan || analysisResult?.thongTinVanBanDen || null;
  const safeNoiDungCotLoi = Array.isArray(analysisResult?.noiDungCotLoi)
    ? analysisResult.noiDungCotLoi
    : [];
  const safeDeadlines = Array.isArray(analysisResult?.mocThoiGianVaHanBaoCao)
    ? analysisResult.mocThoiGianVaHanBaoCao
    : [];
  const safeMocThoiGianStrings = Array.isArray(analysisResult?.mocThoiGian)
    ? analysisResult.mocThoiGian
    : [];
  const safeTasks = Array.isArray(analysisResult?.nhiemVuCapXaVaPhanCong)
    ? analysisResult.nhiemVuCapXaVaPhanCong
    : [];
  const safeNhiemVuStrings = Array.isArray(analysisResult?.nhiemVuCapXa)
    ? analysisResult.nhiemVuCapXa
    : [];
  const safeButPhe =
    analysisResult?.butPheLanhDao || analysisResult?.goiYButPheLanhDao || '';

  const safeMediaHashtags = Array.isArray(mediaPostData?.hashtags)
    ? mediaPostData.hashtags
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      {/* =====================================================================
          CỘT BÊN TRÁI (~42%): TẢI TÀI LIỆU & TÙY CHỌN CHUYỂN HÓA
         ===================================================================== */}
      <div className="w-full lg:w-[42%] space-y-4 no-print">
        {/* KHỐI 1: TẢI VĂN BẢN ĐẾN & PHÂN TÍCH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg text-white shadow-sm ${
                  isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                }`}
              >
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`font-extrabold text-sm uppercase tracking-wide ${primaryText}`}>
                  Khối 1: Tải văn bản đến & Phân tích AI
                </h3>
                <p className="text-[11px] text-slate-500">
                  Đơn vị tiếp nhận: <strong className="text-slate-800">{unitConfig.coQuanBanHanh}</strong>
                </p>
              </div>
            </div>

            {/* Thanh trạng thái API Key + Nút Xóa phiên / Xử lý văn bản mới */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(fileMeta || analysisResult || infographicData || mediaPostData) && (
                <button
                  type="button"
                  onClick={handleClearIncomingSession}
                  disabled={loadingAction !== null}
                  title="Xóa sạch dữ liệu phiên hiện tại để chuyển sang xử lý văn bản đến khác"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 shadow-sm transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa phiên / Xử lý văn bản mới</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenApiKeyConfig}
                title="Nhấn để mở Tab 6: Cấu hình Gemini API Key"
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border shadow-sm transition ${
                  hasApiKey
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{hasApiKey ? `Đã kết nối (${currentAiModel})` : 'Mở Tab 6: Cài API Key'}</span>
              </button>
            </div>
          </div>

          {/* Input file ẩn */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.jpg,.jpeg,.png,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleSelectIncomingFile(f);
            }}
            className="hidden"
          />

          {/* Khu vực kéo-thả hoặc hiển thị file đã chọn */}
          {!uploadedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleSelectIncomingFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/70'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-400'
              }`}
            >
              {readingFile ? (
                <div className="flex flex-col items-center justify-center py-3 text-indigo-700">
                  <Loader2 className="w-7 h-7 animate-spin mb-2" />
                  <span className="text-xs font-bold">
                    Đang đọc dữ liệu file văn bản đến...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div
                    className={`p-3 rounded-full ${
                      isState
                        ? 'bg-blue-100 text-[#1e4b7a]'
                        : 'bg-red-100 text-[#b91c1c]'
                    }`}
                  >
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Kéo-thả file văn bản đến vào đây hoặc nhấn để chọn file
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">.DOCX</span>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">
                      .PDF (Cả bản scan)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      .JPG / .PNG
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">.TXT</span>
                    <span className="text-slate-500 font-normal">(Tối đa ~15MB)</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase text-white shrink-0 ${
                      isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                    }`}
                  >
                    {uploadedFile.fileKind === 'image' ? 'ẢNH' : `.${uploadedFile.fileKind}`}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {uploadedFile.fileName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Dung lượng:{' '}
                      {uploadedFile.fileSize > 1024 * 1024
                        ? `${(uploadedFile.fileSize / (1024 * 1024)).toFixed(2)} MB`
                        : `${(uploadedFile.fileSize / 1024).toFixed(1)} KB`}{' '}
                      •{' '}
                      {uploadedFile.fileKind === 'pdf'
                        ? 'Đọc trực tiếp PDF/Scan bằng Gemini Vision'
                        : uploadedFile.fileKind === 'image'
                        ? 'Đọc trực tiếp ảnh chụp văn bản bằng Gemini Vision'
                        : `Đã trích xuất ${(uploadedFile.extractedText?.length || 0).toLocaleString(
                            'vi-VN'
                          )} ký tự`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition"
                  >
                    Đổi file
                  </button>
                  <button
                    type="button"
                    onClick={handleClearIncomingSession}
                    title="Xóa file & phiên hiện tại"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ghi chú định dạng hỗ trợ */}
          <p className="text-[11.5px] text-slate-500 leading-relaxed bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            💡 <em>&ldquo;Hỗ trợ .docx, .pdf (cả bản scan dấu đỏ), ảnh chụp .jpg/.png. File .doc cũ vui lòng lưu sang .docx hoặc .pdf trước khi tải.&rdquo;</em>
          </p>

          {/* Cảnh báo nếu chưa có API Key */}
          {!hasApiKey && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bạn chưa cấu hình Gemini API Key trên trình duyệt này.</span>
              </div>
              <button
                type="button"
                onClick={onOpenApiKeyConfig}
                className="shrink-0 font-bold underline text-amber-950 hover:text-indigo-700"
              >
                Mở Tab 6 ngay →
              </button>
            </div>
          )}

          {/* Nút chính nổi bật: Xử lý & Tóm tắt văn bản đến */}
          <button
            type="button"
            onClick={handleAnalyzeIncoming}
            disabled={!uploadedFile || loadingAction !== null}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-extrabold shadow-md transition disabled:opacity-50 ${primaryBg}`}
          >
            {loadingAction === 'ANALYZE' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>
                  {aiStatusMessage || `Đang đọc & phân tích văn bản đến (${currentAiModel})...`}
                </span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 shrink-0" />
                <span>Xử lý & Tóm tắt văn bản đến</span>
              </>
            )}
          </button>

          {/* Hiển thị lỗi Khối 1 kèm nút Thử lại */}
          {block1Error && (
            <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2.5">
                <div className="font-semibold leading-relaxed">{block1Error.message}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {uploadedFile && (
                    <button
                      type="button"
                      onClick={handleAnalyzeIncoming}
                      disabled={loadingAction !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-300 shadow-sm transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại ngay</span>
                    </button>
                  )}
                  {block1Error.needKeyConfig && (
                    <button
                      type="button"
                      onClick={onOpenApiKeyConfig}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Mở Tab 6: Cấu hình Gemini API Key</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KHỐI 2: CHUYỂN HÓA KẾT QUẢ (KÍCH HOẠT NGAY SAU KHI XỬ LÝ XONG VĂN BẢN ĐẾN) */}
        <div
          className={`bg-white rounded-xl shadow-sm border-2 p-4 space-y-4 transition ${
            analysisResult
              ? isState
                ? 'border-[#1e4b7a]/40'
                : 'border-[#b91c1c]/40'
              : 'border-slate-200 opacity-70 pointer-events-none select-none'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${primaryText}`} />
              <h3 className={`font-extrabold text-sm uppercase tracking-wide ${primaryText}`}>
                Khối 2: Chuyển hóa kết quả & Tham mưu
              </h3>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                analysisResult
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {analysisResult ? 'Đã sẵn sàng chuyển hóa (Tốc độ cao)' : 'Chờ xử lý văn bản ở Khối 1'}
            </span>
          </div>

          {/* HỘP BÁO LỖI NGAY BÊN TRONG KHỐI 2 (NẾU CÓ SỰ CỐ KHI BẤM CÁC NÚT Ở KHỐI 2) */}
          {block2Error && (
            <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-bold text-red-800">
                  Không thể thực hiện thao tác chuyển hóa ở Khối 2:
                </div>
                <div className="font-medium leading-relaxed">{block2Error.message}</div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {block2Error.failedAction === 'IMPLEMENTATION' && (
                    <button
                      type="button"
                      onClick={handleGenerateImplementationDoc}
                      disabled={loadingAction !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-300 shadow-sm transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại Tạo văn bản triển khai</span>
                    </button>
                  )}
                  {block2Error.failedAction === 'INFOGRAPHIC' && (
                    <button
                      type="button"
                      onClick={handleGenerateInfographic}
                      disabled={loadingAction !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-300 shadow-sm transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại Tạo Infographic</span>
                    </button>
                  )}
                  {block2Error.failedAction === 'MEDIA_POST' && (
                    <button
                      type="button"
                      onClick={handleGenerateMediaPost}
                      disabled={loadingAction !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-300 shadow-sm transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại Viết tin tuyên truyền</span>
                    </button>
                  )}
                  {block2Error.needKeyConfig && (
                    <button
                      type="button"
                      onClick={onOpenApiKeyConfig}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Mở Tab 6: Cấu hình API Key</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlock2Error(null)}
                className="p-1 text-red-500 hover:bg-red-100 rounded-lg"
                title="Đóng thông báo lỗi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Ô nhập tùy chọn: Ghi chú / Số liệu thực tế của đơn vị */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú / Số liệu thực tế của đơn vị (không bắt buộc):
            </label>
            <textarea
              rows={2}
              value={unitActualNote}
              onChange={(e) => setUnitActualNote(e.target.value)}
              placeholder="VD: Đã triển khai 5/5 thôn, dự kiến hoàn thành trước 15/12, khó khăn về kinh phí..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              AI sử dụng trực tiếp dữ liệu JSON chi tiết đã trích xuất ở Khối 1 kết hợp ghi chú của <strong>{unitConfig.coQuanBanHanh}</strong> để xử lý siêu tốc trong 3–5 giây.
            </p>
          </div>

          {/* TÙY CHỌN 1: RA VĂN BẢN TRIỂN KHAI Ở XÃ */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className={`w-4 h-4 ${primaryText}`} />
                1. Ra văn bản triển khai tại {unitConfig.diaDanh}
              </span>
              <span className="text-[11px] text-slate-500">Tự động viện dẫn văn bản đến</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {IMPLEMENTATION_DOC_TYPES.map((item) => {
                const active = selectedImplDocType === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setSelectedImplDocType(item.code)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      active
                        ? `${primaryBg} text-white border-transparent shadow-sm`
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleGenerateImplementationDoc}
              disabled={!analysisResult || loadingAction !== null}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 ${primaryBg}`}
            >
              {loadingAction === 'IMPLEMENTATION' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {aiStatusMessage || 'Đang soạn văn bản triển khai...'}
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Tạo văn bản triển khai</span>
                </>
              )}
            </button>
          </div>

          {/* TÙY CHỌN 2: TẠO INFOGRAPHIC TRUYỀN THÔNG CHUYÊN NGHIỆP */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-600" />
                2. Tạo Infographic truyền thông
              </span>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                100% Chuẩn tiếng Việt
              </span>
            </div>

            {/* Chọn Tỉ lệ ảnh */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Chọn Tỉ lệ khung hình Infographic:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const active = aspectRatio === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAspectRatio(opt.value)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                        active
                          ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div
                        className={`text-[10px] ${
                          active ? 'text-amber-100' : 'text-slate-400'
                        }`}
                      >
                        {opt.subLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn Kiểu bố cục */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Chọn Kiểu bố cục trình bày:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {LAYOUT_STYLE_OPTIONS.map((opt) => {
                  const active = layoutStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLayoutStyle(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-[11px] font-bold text-center transition ${
                        active
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateInfographic}
              disabled={!analysisResult || loadingAction !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition disabled:opacity-50"
            >
              {loadingAction === 'INFOGRAPHIC' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {aiStatusMessage || 'Đang dựng Infographic...'}
                  </span>
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>Tạo Infographic truyền thông</span>
                </>
              )}
            </button>
          </div>

          {/* TÙY CHỌN 3: VIẾT TIN TUYÊN TRUYỀN ZALO / TRANG TTĐT */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                3. Viết tin tuyên truyền Zalo / Trang TTĐT
              </span>
              <span className="text-[11px] text-indigo-700 font-semibold">Dễ hiểu cho người dân</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateMediaPost}
              disabled={!analysisResult || loadingAction !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              {loadingAction === 'MEDIA_POST' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {aiStatusMessage || 'Đang viết tin tuyên truyền...'}
                  </span>
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span>Viết tin tuyên truyền</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CỘT BÊN PHẢI (~58%): CỬA SỔ XEM TRƯỚC ĐA CHẾ ĐỘ CÓ CHIỀU CAO RÕ RÀNG & CUỘN ĐỘC LẬP
         ===================================================================== */}
      <div className="w-full lg:w-[58%] lg:sticky lg:top-4 min-h-[580px] lg:h-[calc(100vh-110px)] flex flex-col gap-2.5 print-only-container">
        {/* THANH CHUYỂN NHANH 3 CHẾ ĐỘ XEM Ở TRÊN CÙNG CỘT PHẢI */}
        <div className="shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActivePreviewTab('summary');
                scrollPreviewToTop();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition ${
                activePreviewTab === 'summary'
                  ? `${primaryBg} text-white shadow-sm`
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>📋 Phiếu tóm tắt & Tham mưu</span>
              {analysisResult && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePreviewTab('infographic');
                scrollPreviewToTop();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition ${
                activePreviewTab === 'infographic'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>🎨 Xem trước Infographic</span>
              {infographicData && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePreviewTab('media');
                scrollPreviewToTop();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold transition ${
                activePreviewTab === 'media'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>📢 Tin tuyên truyền</span>
              {mediaPostData && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>

          {/* Nút thao tác nhanh theo từng chế độ xem */}
          <div className="flex items-center gap-2">
            {activePreviewTab === 'summary' && analysisResult && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummaryForZalo}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                >
                  {copiedZaloToast ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã sao chép chuẩn Zalo!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép gửi Zalo Lãnh đạo</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintSummary}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Phiếu tham mưu</span>
                </button>
              </>
            )}

            {activePreviewTab === 'infographic' && infographicData && (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300">
                  <span>Chuẩn {aspectRatio} • {infoDims.width}×{infoDims.height} px</span>
                </span>
                <button
                  type="button"
                  onClick={handleDownloadInfographicPng}
                  disabled={exportingPng}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition disabled:opacity-50"
                >
                  {exportingPng ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kết xuất PNG ({infoDims.width * 2}×{infoDims.height * 2} px)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Tải ảnh Infographic (.PNG sắc nét)</span>
                    </>
                  )}
                </button>
              </>
            )}

            {activePreviewTab === 'media' && mediaPostData && (
              <button
                type="button"
                onClick={handleCopyMediaPost}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              >
                {copiedMediaToast ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã sao chép bài đăng!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép bài đăng</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* KHUNG NỘI DUNG CUỘN DỌC ĐỘC LẬP */}
        <div
          ref={previewScrollContainerRef}
          className="flex-1 min-h-[500px] overflow-y-auto overflow-x-auto a4-scroll-container bg-slate-200/80 rounded-xl p-4 sm:p-6 border border-slate-300 shadow-inner print-only-container"
        >
          {/* =================================================================
              CHẾ ĐỘ XEM 1: PHIẾU TÓM TẮT & THAM MƯU XỬ LÝ (5 PHẦN CHUẨN CÔNG VỤ)
             ================================================================= */}
          {activePreviewTab === 'summary' && (
            <>
              {loadingAction === 'ANALYZE' ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  <Loader2
                    className={`w-12 h-12 animate-spin mb-4 ${
                      isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]'
                    }`}
                  />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {aiStatusMessage || `Trợ lý AI (${currentAiModel}) đang đọc & phân tích văn bản đến...`}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                    Hệ thống đang trích xuất Số/Ký hiệu, Nội dung cốt lõi, Mốc thời gian, Nhiệm vụ cấp xã và Dự thảo bút phê lãnh đạo.
                  </p>
                </div>
              ) : !analysisResult ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  {block1Error ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 border border-red-300 flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-red-900">
                        Phân tích văn bản đến chưa hoàn tất
                      </h3>
                      <p className="text-xs sm:text-sm text-red-700 mt-2 max-w-lg leading-relaxed">
                        {block1Error.message}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                        {uploadedFile && (
                          <button
                            type="button"
                            onClick={handleAnalyzeIncoming}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-md transition ${primaryBg}`}
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Thử lại phân tích văn bản</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onOpenApiKeyConfig}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-sm transition"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Kiểm tra Cấu hình API Key (Tab 6)</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                          isState
                            ? 'bg-blue-50 text-[#1e4b7a] border border-blue-200'
                            : 'bg-red-50 text-[#b91c1c] border border-red-200'
                        }`}
                      >
                        <Inbox className="w-8 h-8" />
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                        Chưa có dữ liệu Phiếu tóm tắt & Tham mưu văn bản đến
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg leading-relaxed">
                        Hãy tải lên file văn bản của cấp trên (<strong>.docx</strong>, <strong>.pdf</strong> kể cả bản scan dấu đỏ, hoặc ảnh chụp <strong>.jpg/.png</strong>) ở cột bên trái và nhấn nút{' '}
                        <strong className={primaryText}>&ldquo;Xử lý & Tóm tắt văn bản đến&rdquo;</strong>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 w-full text-left text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-800">1. Tóm tắt 5 mục chuẩn</div>
                          <p className="text-slate-500 mt-1">
                            Trích xuất số ký hiệu, nội dung cốt lõi, cảnh báo hạn báo cáo và gợi ý bút phê lãnh đạo.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-800">2. Ra văn bản triển khai</div>
                          <p className="text-slate-500 mt-1">
                            Tự động soạn Kế hoạch, Công văn, Thông báo hoặc Quyết định triển khai và đổ thẳng sang Tab 1.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-800">3. Infographic & Zalo</div>
                          <p className="text-slate-500 mt-1">
                            Dựng Infographic truyền thông chuẩn tiếng Việt 100% xuất ảnh PNG nét căng.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
                  {/* Tiêu đề Phiếu tham mưu */}
                  <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={isState ? '/quoc-huy.png' : '/co-dang.png'}
                        alt="Logo"
                        className={
                          isState
                            ? 'w-12 h-12 object-contain shrink-0'
                            : 'w-14 h-9 object-cover rounded shadow-sm shrink-0'
                        }
                      />
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-500">
                          {unitConfig.coQuanChuQuan}
                        </div>
                        <div className={`text-sm font-extrabold uppercase ${primaryText}`}>
                          {unitConfig.coQuanBanHanh}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span
                        className={`inline-block text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${primarySoftBg}`}
                      >
                        PHIẾU TÓM TẮT & THAM MƯU XỬ LÝ VĂN BẢN ĐẾN
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Ngày lập phiếu: {new Date().toLocaleDateString('vi-VN')} • Địa danh:{' '}
                        {unitConfig.diaDanh}
                      </div>
                    </div>
                  </div>

                  {/* PHẦN 1: THÔNG TIN VĂN BẢN ĐẾN */}
                  <div className="space-y-2.5">
                    <h4
                      className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${
                          isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                        }`}
                      >
                        1
                      </span>
                      Thông tin văn bản đến
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                      <div className="flex items-start gap-2">
                        <Hash className={`w-4 h-4 shrink-0 mt-0.5 ${primaryText}`} />
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            Số / Ký hiệu & Loại văn bản
                          </div>
                          <div className="font-extrabold text-slate-900">
                            {summaryInfo?.soKyHieu || 'Chưa rõ số/ký hiệu'}{' '}
                            <span className="font-normal text-slate-600">
                              ({summaryInfo?.loaiVanBan || 'Văn bản chỉ đạo'})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className={`w-4 h-4 shrink-0 mt-0.5 ${primaryText}`} />
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            Ngày ban hành
                          </div>
                          <div className="font-bold text-slate-900">
                            {summaryInfo?.ngayBanHanh || 'Chưa rõ ngày ban hành'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Building2 className={`w-4 h-4 shrink-0 mt-0.5 ${primaryText}`} />
                        <div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            Cơ quan ban hành
                          </div>
                          <div className="font-bold text-slate-900 uppercase">
                            {summaryInfo?.coQuanBanHanh || unitConfig.coQuanChuQuan}
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-3 pt-2 border-t border-slate-200/80">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Trích yếu nội dung văn bản đến:
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5 leading-relaxed">
                          {summaryInfo?.trichYeu || ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PHẦN 2: NỘI DUNG CỐT LÕI (3-5 GẠCH ĐẦU DÒNG TRỌNG TÂM) */}
                  <div className="space-y-2.5">
                    <h4
                      className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${
                          isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                        }`}
                      >
                        2
                      </span>
                      Nội dung cốt lõi & Chỉ đạo trọng tâm
                    </h4>

                    <ul className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                      {safeNoiDungCotLoi.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed"
                        >
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-1 ${
                              isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]'
                            }`}
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* PHẦN 3: MỐC THỜI GIAN & HẠN BÁO CÁO (KHUNG CẢNH BÁO VIỀN ĐỎ / NỀN HỒNG NHẠT) */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-red-700">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                        3
                      </span>
                      Mốc thời gian & Hạn báo cáo bắt buộc
                    </h4>

                    <div className="rounded-xl border-2 border-red-300 bg-rose-50/90 p-4 space-y-2.5">
                      {safeDeadlines.length > 0 ? (
                        safeDeadlines.map((dl, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/90 p-3 rounded-lg border border-red-200 shadow-sm"
                          >
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                {dl.noiDungHan}
                              </span>
                            </div>
                            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full bg-red-600 text-white">
                              <Clock className="w-3.5 h-3.5" />
                              {dl.thoiHan}
                            </span>
                          </div>
                        ))
                      ) : safeMocThoiGianStrings.length > 0 ? (
                        safeMocThoiGianStrings.map((mStr, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 bg-white/90 p-3 rounded-lg border border-red-200 shadow-sm"
                          >
                            <Clock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">
                              {mStr}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-rose-900 font-medium">
                          <Clock className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            Văn bản không quy định hạn cố định — Đề nghị triển khai ngay sau khi tiếp nhận.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PHẦN 4: NHIỆM VỤ CẤP XÃ & GỢI Ý PHÂN CÔNG */}
                  <div className="space-y-2.5">
                    <h4
                      className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${
                          isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                        }`}
                      >
                        4
                      </span>
                      Nhiệm vụ của {unitConfig.coQuanBanHanh} & Gợi ý phân công
                    </h4>

                    {safeTasks.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                              <th className="py-2.5 px-3 font-bold w-10">TT</th>
                              <th className="py-2.5 px-3 font-bold">Đầu việc / Nhiệm vụ tại xã</th>
                              <th className="py-2.5 px-3 font-bold w-44">Bộ phận chủ trì</th>
                              <th className="py-2.5 px-3 font-bold w-44">Bộ phận phối hợp</th>
                              <th className="py-2.5 px-3 font-bold w-32">Tiến độ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {safeTasks.map((task, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {task.nhiemVu}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block font-bold px-2 py-0.5 rounded text-xs border ${primarySoftBg}`}
                                  >
                                    {task.boPhanChuTri}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">{task.boPhanPhoiHop}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {task.thoiHanHoanThanh}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <ul className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                        {safeNhiemVuStrings.map((tStr, idx) => (
                          <li key={idx} className="font-medium text-slate-800">
                            {idx + 1}. {tStr}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* PHẦN 5: GỢI Ý BÚT PHÊ TRÌNH LÃNH ĐẠO */}
                  <div className="space-y-2.5">
                    <h4
                      className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${
                          isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                        }`}
                      >
                        5
                      </span>
                      Gợi ý Bút phê trình Lãnh đạo ({isState ? 'Chủ tịch UBND' : 'Bí thư Đảng ủy'})
                    </h4>

                    <div
                      className={`p-4 rounded-xl border-2 ${
                        isState
                          ? 'bg-blue-50/60 border-[#1e4b7a]/30'
                          : 'bg-red-50/60 border-[#b91c1c]/30'
                      } flex items-start gap-3`}
                    >
                      <UserCheck className={`w-5 h-5 shrink-0 mt-0.5 ${primaryText}`} />
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase text-slate-500">
                          Dự thảo ý kiến chỉ đạo của{' '}
                          {Array.isArray(unitConfig.signers) && unitConfig.signers[0]
                            ? `${unitConfig.signers[0].chucVu} ${unitConfig.signers[0].hoTen}`
                            : isState
                            ? 'CHỦ TỊCH UBND XÃ'
                            : 'BÍ THƯ ĐẢNG ỦY XÃ'}
                          :
                        </div>
                        <p className="text-sm font-bold italic text-slate-900 leading-relaxed">
                          &ldquo;{safeButPhe}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* =================================================================
              CHẾ ĐỘ XEM 2: INFOGRAPHIC TRUYỀN THÔNG & XUẤT ẢNH PNG NÉT CĂNG
             ================================================================= */}
          {activePreviewTab === 'infographic' && (
            <>
              {loadingAction === 'INFOGRAPHIC' ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  <Loader2 className="w-12 h-12 animate-spin text-amber-600 mb-4" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {aiStatusMessage || 'Đang dựng Infographic truyền thông chuẩn tiếng Việt...'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md">
                    Đang chắt lọc số liệu nổi bật và dàn trang chuẩn {aspectRatio} ({infoDims.width}×{infoDims.height} px • {layoutStyle}).
                  </p>
                </div>
              ) : !infographicData ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mb-4">
                    <Palette className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Sẵn sàng tạo Infographic truyền thông chuẩn tiếng Việt 100%
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
                    Chọn <strong>Tỉ lệ ảnh</strong> ({aspectRatio} • {infoDims.width}×{infoDims.height} px) và <strong>Kiểu bố cục</strong> ({layoutStyle}) ở cột bên trái, sau đó nhấn nút{' '}
                    <strong className="text-amber-700">&ldquo;Tạo Infographic truyền thông&rdquo;</strong>.
                  </p>
                  {analysisResult && (
                    <button
                      type="button"
                      onClick={handleGenerateInfographic}
                      disabled={loadingAction !== null}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition"
                    >
                      <Palette className="w-4 h-4" />
                      <span>Tạo Infographic ngay (Chuẩn {aspectRatio} • {infoDims.width}×{infoDims.height} px)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div ref={infographicStageRef} className="w-full flex flex-col items-center space-y-3">
                  {/* Ghi chú nhỏ màu vàng nếu dựng qua Dự phòng cục bộ (Zero-API Fallback - 0 tốn lượt API) */}
                  {infographicData.isLocalFallback && (
                    <div className="w-full bg-yellow-50 border border-yellow-300 text-yellow-950 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 no-print">
                      <AlertTriangle className="w-4 h-4 text-yellow-700 shrink-0" />
                      <span>
                        <strong>Chế độ dựng Infographic cục bộ (Zero-API Fallback):</strong> Đã tự động ánh xạ trực tiếp từ Phiếu tóm tắt Khối 1 để không bị gián đoạn khi API chạm hạn mức. Bạn có thể bấm trực tiếp vào bất kỳ dòng chữ nào bên dưới để sửa nhanh trước khi bấm <strong>Tải ảnh (.PNG)</strong>.
                      </span>
                    </div>
                  )}

                  {/* Thanh nhắc nhở có thể bấm sửa trực tiếp chữ trên Infographic & Nhãn kích thước chuẩn */}
                  <div className="w-full bg-amber-50 border border-amber-300 text-amber-950 px-3.5 py-2 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 no-print">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>Mẹo:</strong> Bấm trực tiếp vào bất kỳ dòng chữ nào trên Infographic để sửa nhanh câu chữ trước khi bấm <strong>Tải ảnh (.PNG)</strong>.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-extrabold text-[11px] px-2.5 py-0.5 rounded-md bg-amber-200/90 text-amber-950 border border-amber-400">
                        Chuẩn {aspectRatio} • {infoDims.width}×{infoDims.height} px
                      </span>
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-300">
                        {layoutStyle === 'LIST'
                          ? 'Danh sách trọng tâm'
                          : layoutStyle === 'TIMELINE'
                          ? 'Mốc thời gian'
                          : 'Bento Tổng hợp (4 tầng)'}{' '}
                        • Zoom {Math.round(previewScale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* KHUNG STAGE TỰ ĐỘNG SCALE ĐỂ HIỂN THỊ TRỌN VẸN 100% TRÊN MÀN HÌNH LAPTOP */}
                  <div className="w-full flex justify-center items-start py-1 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(infoDims.width * previewScale)}px`,
                        height: `${Math.round(infoDims.height * previewScale)}px`,
                        position: 'relative'
                      }}
                      className="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/15 shrink-0"
                    >
                      <InfographicCanvas
                        canvasRef={infographicCanvasRef}
                        data={infographicData}
                        analysisResult={analysisResult}
                        unitConfig={unitConfig}
                        mode={mode}
                        aspectRatio={aspectRatio}
                        layoutStyle={layoutStyle}
                        previewScale={previewScale}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* =================================================================
              CHẾ ĐỘ XEM 3: TIN TUYÊN TRUYỀN ZALO / TRANG TTĐT XÃ
             ================================================================= */}
          {activePreviewTab === 'media' && (
            <>
              {loadingAction === 'MEDIA_POST' ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {aiStatusMessage || 'Đang biên tập tin tuyên truyền Zalo / Trang TTĐT...'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md">
                    Đang chuyển hóa nội dung hành chính sang ngôn ngữ gần gũi, dễ hiểu cho cán bộ và người dân.
                  </p>
                </div>
              ) : !mediaPostData ? (
                <div className="min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center mb-4">
                    <Megaphone className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Chưa có bài viết tuyên truyền Zalo / Trang Thông tin điện tử
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
                    Nhấn nút <strong className="text-indigo-700">&ldquo;Viết tin tuyên truyền&rdquo;</strong> ở cột bên trái để AI chuyển hóa văn bản hành chính thành bản tin ngắn gọn, gần gũi với người dân.
                  </p>
                  {analysisResult && (
                    <button
                      type="button"
                      onClick={handleGenerateMediaPost}
                      disabled={loadingAction !== null}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition"
                    >
                      <Megaphone className="w-4 h-4" />
                      <span>Viết tin tuyên truyền ngay</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Bản tin tuyên truyền Zalo OA / Fanpage / Trang TTĐT
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Đơn vị phát hành: <strong>{unitConfig.coQuanBanHanh}</strong> • Có thể chỉnh sửa trực tiếp bên dưới
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyMediaPost}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                    >
                      {copiedMediaToast ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao chép bài đăng</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Tiêu đề bài đăng:
                      </label>
                      <input
                        type="text"
                        value={mediaPostData.tieuDeBaiDang || ''}
                        onChange={(e) =>
                          setMediaPostData((prev) =>
                            prev ? { ...prev, tieuDeBaiDang: e.target.value } : prev
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Nội dung chi tiết (Chuẩn định dạng Zalo / Facebook):
                      </label>
                      <textarea
                        rows={14}
                        value={mediaPostData.noiDungBaiDang || ''}
                        onChange={(e) =>
                          setMediaPostData((prev) =>
                            prev ? { ...prev, noiDungBaiDang: e.target.value } : prev
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {safeMediaHashtags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
