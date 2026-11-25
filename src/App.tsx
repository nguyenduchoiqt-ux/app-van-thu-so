import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  Inbox,
  ShieldAlert,
  BookOpenCheck,
  History,
  Settings,
  CheckCircle2,
  DownloadCloud,
  X
} from 'lucide-react';
import { AllConfigs, AppMode, DocumentData, TabKey, UnitConfig } from './types';
import {
  DEFAULT_CONFIGS,
  DOC_TYPES,
  PRESET_TEMPLATES,
  buildAutoKyHieu
} from './constants';
import { EditorTab } from './components/EditorTab';
import { IncomingDocTab } from './components/IncomingDocTab';
import { ReviewTab } from './components/ReviewTab';
import { LookupTab } from './components/LookupTab';
import { HistoryTab } from './components/HistoryTab';
import { ConfigTab } from './components/ConfigTab';
import { GeminiDocResponse } from './services/geminiService';
import { normalizeSoVanBan } from './utils/docHelpers';

const APP_STORAGE_VERSION = 'v4.9_vietthanh_namgiang';
const ORG_CONFIG_VERSION_KEY = 'vts_org_config_version';
const ORG_CONFIG_VERSION_VAL = 'v4.9';
const STORAGE_KEY_CONFIG = 'VAN_THU_SO_CONFIG_V5';
const STORAGE_KEY_HISTORY = 'VAN_THU_SO_HISTORY_V5';
const LEGACY_BANNED_REGEX =
  /thanh\s*h[oó]a|ba\s*[đd][iì]nh|nguy[eễ]n\s*v[aă]n\s*an|l[eê]\s*ho[aà]ng\s*nam|qu[aả]ng\s*tr[iị]|khe\s*sanh|th[aá]i\s*th[iị]\s*nga|nguy[eễ]n\s*tri[eề]u\s*th[uư][oơ]ng|l[eê]\s*th[iị]\s*c[uú]c|ph[aạ]m\s*minh\s*tu[aấ]n|tr[aầ]n\s*v[aă]n\s*b[iì]nh/i;

function ensureCleanStorage(): void {
  try {
    const ver = localStorage.getItem('vts_version');
    const orgVer = localStorage.getItem(ORG_CONFIG_VERSION_KEY);
    let dirty = false;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k === 'vts_gemini_api_key' ||
        k === 'vts_gemini_model' ||
        k === 'vts_gemini_available_models'
      ) {
        continue;
      }
      const v = localStorage.getItem(k) || '';
      if (LEGACY_BANNED_REGEX.test(v)) {
        dirty = true;
        break;
      }
    }
    if (ver !== APP_STORAGE_VERSION || orgVer !== ORG_CONFIG_VERSION_VAL || dirty) {
      const savedGeminiKey = localStorage.getItem('vts_gemini_api_key');
      const savedGeminiModel = localStorage.getItem('vts_gemini_model');
      const savedGeminiModelsCache = localStorage.getItem('vts_gemini_available_models');
      const savedIncomingSession = localStorage.getItem('vts_incoming_doc_session');
      localStorage.clear();
      localStorage.setItem('vts_version', APP_STORAGE_VERSION);
      localStorage.setItem(ORG_CONFIG_VERSION_KEY, ORG_CONFIG_VERSION_VAL);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(DEFAULT_CONFIGS));
      if (savedGeminiKey) {
        localStorage.setItem('vts_gemini_api_key', savedGeminiKey);
      }
      if (savedGeminiModel) {
        localStorage.setItem('vts_gemini_model', savedGeminiModel);
      }
      if (savedGeminiModelsCache) {
        localStorage.setItem('vts_gemini_available_models', savedGeminiModelsCache);
      }
      if (savedIncomingSession && !LEGACY_BANNED_REGEX.test(savedIncomingSession)) {
        localStorage.setItem('vts_incoming_doc_session', savedIncomingSession);
      }
    }
  } catch {
    // ignore
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createInitialDoc(mode: AppMode, cfg: UnitConfig): DocumentData {
  const defaultTemplate = PRESET_TEMPLATES[0];
  const defaultSigner = cfg.signers[0] || {
    quyenHan: mode === 'NHA_NUOC' ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
    chucVu: mode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
    hoTen: mode === 'NHA_NUOC' ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
  };
  const docType = mode === 'DANG' ? 'NQ' : defaultTemplate.docType;
  const tpl = mode === 'DANG' ? PRESET_TEMPLATES[4] : defaultTemplate;

  return {
    id: `doc-${Date.now()}`,
    mode,
    docType,
    coQuanChuQuan: cfg.coQuanChuQuan,
    coQuanBanHanh: cfg.coQuanBanHanh,
    kyHieuCoQuan: cfg.kyHieuCoQuan,
    // Khối Nhà nước bỏ số 0 đầu (<10 -> '1'), Khối Đảng giữ số 0 đầu (<10 -> '01')
    soVanBan: mode === 'NHA_NUOC' ? '1' : '01',
    kyHieu: buildAutoKyHieu(mode, docType, cfg.kyHieuCoQuan),
    autoKyHieu: true,
    diaDanh: cfg.diaDanh,
    ngayBanHanh: getTodayIso(),
    trichYeu: tpl.trichYeu,
    kinhGui: tpl.kinhGui || '',
    canCu: [...tpl.canCu],
    noiDung: tpl.noiDung,
    quyenHanKy: defaultSigner.quyenHan,
    chucVuKy: defaultSigner.chucVu,
    hoTenKy: defaultSigner.hoTen,
    noiNhanList: cfg.commonRecipients.slice(0, 3),
    noiNhanTuyChinh: '',
    luuVt: mode === 'DANG' ? 'Lưu: VT, VPĐU.' : 'Lưu: VT, VP.',
    dynamicData: tpl.dynamicData,
    updatedAt: new Date().toLocaleString('vi-VN')
  };
}

export function App() {
  // 0. Dọn sạch localStorage cũ nếu chưa đúng phiên bản v5_quangtri_khesanh
  ensureCleanStorage();

  // 1. Nạp Cấu hình đơn vị từ localStorage
  const [configs, setConfigs] = useState<AllConfigs>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved && !LEGACY_BANNED_REGEX.test(saved)) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIGS;
  });

  // 2. Nạp Lịch sử văn bản từ localStorage
  const [historyList, setHistoryList] = useState<DocumentData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved && !LEGACY_BANNED_REGEX.test(saved)) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const sampleState = {
      ...createInitialDoc('NHA_NUOC', DEFAULT_CONFIGS.NHA_NUOC),
      id: 'sample-nd30-1',
      soVanBan: '8',
      updatedAt: '23/11/2026, 08:30:00'
    };
    const sampleParty = {
      ...createInitialDoc('DANG', DEFAULT_CONFIGS.DANG),
      id: 'sample-hd05-1',
      soVanBan: '08',
      updatedAt: '23/11/2026, 09:00:00'
    };
    return [sampleState, sampleParty];
  });

  const [mode, setMode] = useState<AppMode>('NHA_NUOC');
  const [activeTab, setActiveTab] = useState<TabKey>('SOAN_THAO');
  const [doc, setDoc] = useState<DocumentData>(() =>
    createInitialDoc('NHA_NUOC', configs.NHA_NUOC)
  );
  const [incomingTransferNotice, setIncomingTransferNotice] = useState<string | null>(null);

  // PWA beforeinstallprompt state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaMessage, setPwaMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwaClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setPwaMessage(
        'Ứng dụng đã sẵn sàng chuẩn PWA! Nếu trình duyệt chưa hiện hộp thoại tự động, hãy nhấn biểu tượng Cài đặt (Install App) trên thanh địa chỉ trình duyệt.'
      );
      setTimeout(() => setPwaMessage(null), 5000);
    }
  };

  // Lưu historyList vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyList));
    } catch {
      // ignore
    }
  }, [historyList]);

  // Lưu configs vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configs));
    } catch {
      // ignore
    }
  }, [configs]);

  // Chuyển đổi chế độ Khối Nhà nước (NĐ 30/2020) <-> Khối Đảng (HD 05-HD/VPTW)
  const handleSwitchMode = (targetMode: AppMode) => {
    if (targetMode === mode) return;
    setMode(targetMode);

    const targetCfg = configs[targetMode];
    const validTypesForTarget = DOC_TYPES.filter((dt) => dt.modes.includes(targetMode));
    const nextDocType = validTypesForTarget.some((d) => d.code === doc.docType)
      ? doc.docType
      : validTypesForTarget[0].code;

    const firstSigner = targetCfg.signers[0] || {
      quyenHan: targetMode === 'NHA_NUOC' ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
      chucVu: targetMode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
      hoTen: targetMode === 'NHA_NUOC' ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
    };

    setDoc((prev) => {
      const nextDyn = prev.dynamicData
        ? {
            ...prev.dynamicData,
            ...(prev.dynamicData.hdBenA
              ? {
                  hdBenA: {
                    ...prev.dynamicData.hdBenA,
                    tenDonVi: targetCfg.coQuanBanHanh,
                    daiDien: firstSigner.hoTen
                  }
                }
              : {}),
            ...(prev.dynamicData.bbChuToa
              ? {
                  bbChuToa: firstSigner.hoTen,
                  bbChuToaChucVu:
                    targetMode === 'NHA_NUOC'
                      ? 'Chủ tịch UBND xã Nam Giang'
                      : 'Bí thư Đảng ủy xã Nam Giang'
                }
              : {})
          }
        : undefined;

      return {
        ...prev,
        mode: targetMode,
        docType: nextDocType,
        // Chuẩn hóa số văn bản ngay khi chuyển chế độ (Khối Nhà nước bỏ số 0 đầu, Khối Đảng giữ số 0 đầu)
        soVanBan: normalizeSoVanBan(targetMode, prev.soVanBan),
        coQuanChuQuan: targetCfg.coQuanChuQuan,
        coQuanBanHanh: targetCfg.coQuanBanHanh,
        kyHieuCoQuan: targetCfg.kyHieuCoQuan,
        diaDanh: targetCfg.diaDanh,
        kyHieu: buildAutoKyHieu(targetMode, nextDocType, targetCfg.kyHieuCoQuan),
        quyenHanKy: firstSigner.quyenHan,
        chucVuKy: firstSigner.chucVu,
        hoTenKy: firstSigner.hoTen,
        noiNhanList: targetCfg.commonRecipients.slice(0, 3),
        luuVt: targetMode === 'DANG' ? 'Lưu: VT, VPĐU.' : 'Lưu: VT, VP.',
        dynamicData: nextDyn
      };
    });
  };

  // Tính số lớn nhất trong lịch sử theo loại văn bản & chế độ hiện tại để gợi ý số tiếp theo
  // Khối Nhà nước (NĐ 30/2020): bỏ số 0 ở đầu cho số < 10 (1, 2, 9)
  // Khối Đảng (HD 05-HD/VPTW): giữ nguyên số 0 ở đầu cho số < 10 (01, 02, 09)
  const getNextSuggestedNumber = (docType: string): string => {
    const matchingDocs = historyList.filter(
      (item) => item.mode === mode && item.docType === docType
    );
    let maxNum = 0;
    for (const item of matchingDocs) {
      const parsed = parseInt((item.soVanBan || '').trim(), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
    const next = maxNum + 1;
    if (mode === 'NHA_NUOC') {
      return `${next}`;
    }
    return next < 10 ? `0${next}` : `${next}`;
  };

  // Lưu văn bản hiện tại vào Lịch sử
  const handleSaveToHistory = () => {
    const nowStr = new Date().toLocaleString('vi-VN');
    const normalizedSo = normalizeSoVanBan(doc.mode, doc.soVanBan);
    const updatedDoc: DocumentData = {
      ...doc,
      soVanBan: normalizedSo,
      updatedAt: nowStr
    };
    setDoc(updatedDoc);

    setHistoryList((prev) => {
      const existsIndex = prev.findIndex((item) => item.id === updatedDoc.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = updatedDoc;
        return copy;
      }
      return [updatedDoc, ...prev];
    });
  };

  // Tạo văn bản trống mới
  const handleResetBlank = () => {
    const cfg = configs[mode];
    const firstSigner = cfg.signers[0] || {
      quyenHan: '',
      chucVu: mode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
      hoTen: ''
    };
    const nextNum = getNextSuggestedNumber(doc.docType);
    setDoc({
      id: `doc-${Date.now()}`,
      mode,
      docType: doc.docType,
      coQuanChuQuan: cfg.coQuanChuQuan,
      coQuanBanHanh: cfg.coQuanBanHanh,
      kyHieuCoQuan: cfg.kyHieuCoQuan,
      soVanBan: nextNum,
      kyHieu: buildAutoKyHieu(mode, doc.docType, cfg.kyHieuCoQuan),
      autoKyHieu: true,
      diaDanh: cfg.diaDanh,
      ngayBanHanh: getTodayIso(),
      trichYeu: '',
      kinhGui: '',
      canCu: [],
      noiDung: '',
      quyenHanKy: firstSigner.quyenHan,
      chucVuKy: firstSigner.chucVu,
      hoTenKy: firstSigner.hoTen,
      noiNhanList: cfg.commonRecipients.slice(0, 2),
      noiNhanTuyChinh: '',
      luuVt: mode === 'DANG' ? 'Lưu: VT, VPĐU.' : 'Lưu: VT, VP.',
      dynamicData: undefined,
      updatedAt: new Date().toLocaleString('vi-VN')
    });
  };

  // Mở lại văn bản từ Lịch sử
  const handleOpenFromHistory = (selectedDoc: DocumentData) => {
    setMode(selectedDoc.mode);
    setDoc({
      ...selectedDoc,
      soVanBan: normalizeSoVanBan(selectedDoc.mode, selectedDoc.soVanBan)
    });
    setActiveTab('SOAN_THAO');
  };

  // Xóa 1 văn bản khỏi lịch sử
  const handleDeleteHistoryItem = (id: string) => {
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
  };

  // Xóa toàn bộ lịch sử
  const handleClearAllHistory = () => {
    setHistoryList([]);
  };

  // Lưu cấu hình đơn vị
  const handleSaveUnitConfig = (targetMode: AppMode, updatedCfg: UnitConfig) => {
    setConfigs((prev) => ({
      ...prev,
      [targetMode]: updatedCfg
    }));
    if (doc.mode === targetMode) {
      setDoc((prev) => ({
        ...prev,
        coQuanChuQuan: updatedCfg.coQuanChuQuan,
        coQuanBanHanh: updatedCfg.coQuanBanHanh,
        kyHieuCoQuan: updatedCfg.kyHieuCoQuan,
        diaDanh: updatedCfg.diaDanh,
        kyHieu: prev.autoKyHieu
          ? buildAutoKyHieu(targetMode, prev.docType, updatedCfg.kyHieuCoQuan)
          : prev.kyHieu
      }));
    }
  };

  // Khôi phục cấu hình mặc định
  const handleResetDefaultConfig = (targetMode: AppMode) => {
    const def = DEFAULT_CONFIGS[targetMode];
    handleSaveUnitConfig(targetMode, def);
  };

  // Nhận kết quả văn bản triển khai hoặc Báo cáo từ Tab 2 (Xử lý văn bản đến) đổ thẳng sang Tab 1
  const handleTransferFromIncomingToEditor = (
    targetDocType: string,
    aiResult: GeminiDocResponse,
    bannerMessage: string
  ) => {
    const cfg = configs[mode];
    const firstSigner = cfg.signers[0] || {
      quyenHan: mode === 'NHA_NUOC' ? 'TM. ỦY BAN NHÂN DÂN' : 'T/M ĐẢNG ỦY',
      chucVu: mode === 'NHA_NUOC' ? 'CHỦ TỊCH' : 'BÍ THƯ',
      hoTen: mode === 'NHA_NUOC' ? 'Thái Hoàng Nam' : 'Hoàng Ngọc Tưởng'
    };
    const effectiveDocType = aiResult.docType || targetDocType;
    const nextNum = getNextSuggestedNumber(effectiveDocType);
    const nowTs = Date.now();

    setDoc((prev) => ({
      ...prev,
      id: `doc-${nowTs}`,
      mode,
      docType: effectiveDocType,
      coQuanChuQuan: cfg.coQuanChuQuan,
      coQuanBanHanh: cfg.coQuanBanHanh,
      kyHieuCoQuan: cfg.kyHieuCoQuan,
      soVanBan: nextNum,
      kyHieu: buildAutoKyHieu(mode, effectiveDocType, cfg.kyHieuCoQuan),
      autoKyHieu: true,
      diaDanh: cfg.diaDanh,
      ngayBanHanh: getTodayIso(),
      trichYeu: aiResult.trichYeu || prev.trichYeu,
      kinhGui: aiResult.kinhGui !== undefined ? aiResult.kinhGui : '',
      canCu: Array.isArray(aiResult.canCu) ? aiResult.canCu : [],
      noiDung: aiResult.noiDung || prev.noiDung,
      quyenHanKy: firstSigner.quyenHan,
      chucVuKy: firstSigner.chucVu,
      hoTenKy: firstSigner.hoTen,
      noiNhanList: Array.isArray(cfg.commonRecipients) ? cfg.commonRecipients.slice(0, 3) : [],
      luuVt: mode === 'DANG' ? 'Lưu: VT, VPĐU.' : 'Lưu: VT, VP.',
      dynamicData:
        effectiveDocType === 'CV' ? { cvNoiDung: aiResult.noiDung || '' } : undefined,
      updatedAt: new Date().toLocaleString('vi-VN'),
      syncTimestamp: nowTs
    }));

    setActiveTab('SOAN_THAO');
    setIncomingTransferNotice(bannerMessage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isState = mode === 'NHA_NUOC';
  const headerBg = isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]';
  const activeTabBorder = isState
    ? 'border-[#1e4b7a] text-[#1e4b7a] bg-blue-50/70'
    : 'border-[#b91c1c] text-[#b91c1c] bg-red-50/70';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* HEADER CHÍNH & NÚT CHUYỂN ĐỔI CHẾ ĐỘ + NÚT TẢI ỨNG DỤNG VỀ MÁY (PWA) */}
      <header className={`${headerBg} text-white shadow-md transition-colors duration-300 no-print`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Logo & Tên ứng dụng */}
          <div className="flex items-center gap-3.5">
            {isState ? (
              <img
                src="/quoc-huy.png"
                alt="Quốc huy Việt Nam"
                className="w-12 h-12 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] shrink-0"
              />
            ) : (
              <img
                src="/co-dang.png"
                alt="Cờ Đảng Cộng sản Việt Nam"
                className="w-14 h-9 object-cover rounded-md ring-1 ring-yellow-300/70 shadow-md shrink-0"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">APP VĂN THƯ SỐ 4.0</h1>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  v4.9
                </span>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                  {isState ? 'Chuẩn NĐ 30/2020/NĐ-CP' : 'Chuẩn HD 05-HD/VPTW'}
                </span>
              </div>
              <p className="text-xs text-white/85">
                Hệ thống soạn thảo, rà soát lỗi thể thức và xuất văn bản hành chính chuẩn A4 (.DOCX / PDF)
              </p>
            </div>
          </div>

          {/* KHU VỰC PHẢI HEADER: 2 NÚT CHUYỂN CHẾ ĐỘ + NÚT TẢI ỨNG DỤNG VỀ MÁY (PWA) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 2 NÚT CHUYỂN ĐỔI CHẾ ĐỘ: KHỐI NHÀ NƯỚC (#1e4b7a) & KHỐI ĐẢNG (#b91c1c) */}
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => handleSwitchMode('NHA_NUOC')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  isState
                    ? 'bg-white text-[#1e4b7a] shadow-md'
                    : 'text-white/85 hover:bg-white/10'
                }`}
              >
                <img
                  src="/quoc-huy.png"
                  alt="Quốc huy"
                  className="w-5 h-5 object-contain shrink-0"
                />
                <span>Khối Nhà nước – NĐ 30/2020</span>
                {isState && <CheckCircle2 className="w-4 h-4 text-[#1e4b7a]" />}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('DANG')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  !isState
                    ? 'bg-white text-[#b91c1c] shadow-md'
                    : 'text-white/85 hover:bg-white/10'
                }`}
              >
                <img
                  src="/co-dang.png"
                  alt="Cờ Đảng"
                  className="w-5 h-3.5 object-cover rounded-[2px] ring-1 ring-yellow-300/60 shrink-0"
                />
                <span>Khối Đảng – HD 05-HD/VPTW</span>
                {!isState && <CheckCircle2 className="w-4 h-4 text-[#b91c1c]" />}
              </button>
            </div>

            {/* NÚT TẢI ỨNG DỤNG VỀ MÁY (PWA - beforeinstallprompt) */}
            <button
              type="button"
              onClick={handleInstallPwaClick}
              title="Cài đặt App Văn Thư Số 4.0 về máy tính hoặc điện thoại (PWA)"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md border border-amber-200 transition"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Tải ứng dụng về máy</span>
            </button>
          </div>
        </div>

        {/* Thông báo hướng dẫn PWA nếu trình duyệt chưa kích hoạt prompt tự động */}
        {pwaMessage && (
          <div className="max-w-[1600px] mx-auto px-4 pb-2.5">
            <div className="bg-amber-100 text-amber-950 text-xs font-medium px-3 py-2 rounded-lg border border-amber-300 flex items-center justify-between">
              <span>{pwaMessage}</span>
              <button
                type="button"
                onClick={() => setPwaMessage(null)}
                className="font-bold underline ml-3"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* THANH ĐIỀU HƯỚNG 6 TAB CHỨC NĂNG */}
        <div className="bg-white text-slate-700 border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-4 flex items-center whitespace-nowrap overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('SOAN_THAO')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'SOAN_THAO'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileEdit className="w-4 h-4 shrink-0" />
              <span>1. Soạn thảo & Xem trước A4</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('VAN_BAN_DEN')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'VAN_BAN_DEN'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4 shrink-0" />
              <span>2. Xử lý văn bản đến</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RA_SOAT')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'RA_SOAT'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>3. Rà soát thể thức</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TRA_CUU')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'TRA_CUU'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpenCheck className="w-4 h-4 shrink-0" />
              <span>4. Tra cứu quy chuẩn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LICH_SU')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'LICH_SU'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>5. Lịch sử & Cấp số</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {historyList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CAUHINH')}
              className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
                activeTab === 'CAUHINH'
                  ? activeTabBorder
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>6. Cấu hình đơn vị</span>
            </button>
          </div>
        </div>
      </header>

      {/* NỘI DUNG TỪNG TAB */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-5 print-only-container">
        {/* Thông báo khi vừa chuyển hóa văn bản từ Tab 2 sang Tab 1 */}
        {activeTab === 'SOAN_THAO' && incomingTransferNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-sm no-print">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{incomingTransferNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setIncomingTransferNotice(null)}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition shrink-0"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'SOAN_THAO' && (
          <EditorTab
            doc={doc}
            setDoc={setDoc}
            unitConfig={configs[mode]}
            onSaveHistory={handleSaveToHistory}
            onSendToReview={() => setActiveTab('RA_SOAT')}
            onOpenApiKeyConfig={() => {
              setActiveTab('CAUHINH');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            getNextSuggestedNumber={getNextSuggestedNumber}
            onResetBlank={handleResetBlank}
          />
        )}

        {/* Luôn giữ IncomingDocTab được mount để không bao giờ bị mất state khi chuyển qua lại giữa Tab 1 và Tab 2 */}
        <div
          className={
            activeTab === 'VAN_BAN_DEN'
              ? 'block print-only-container'
              : 'hidden no-print'
          }
        >
          <IncomingDocTab
            mode={mode}
            doc={doc}
            unitConfig={configs[mode]}
            onTransferToEditor={handleTransferFromIncomingToEditor}
            onOpenApiKeyConfig={() => {
              setActiveTab('CAUHINH');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>

        {activeTab === 'RA_SOAT' && (
          <ReviewTab
            doc={doc}
            setDoc={setDoc}
            onBackToEditor={() => setActiveTab('SOAN_THAO')}
            getNextSuggestedNumber={getNextSuggestedNumber}
          />
        )}

        {activeTab === 'TRA_CUU' && <LookupTab mode={mode} />}

        {activeTab === 'LICH_SU' && (
          <HistoryTab
            mode={mode}
            historyList={historyList}
            onOpenDocument={handleOpenFromHistory}
            onDeleteDocument={handleDeleteHistoryItem}
            onClearAllHistory={handleClearAllHistory}
          />
        )}

        {activeTab === 'CAUHINH' && (
          <ConfigTab
            mode={mode}
            configs={configs}
            onSaveConfig={handleSaveUnitConfig}
            onResetDefaultConfig={handleResetDefaultConfig}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 no-print">
        <strong>App Văn Thư Số 4.0 (Bản cập nhật v4.9)</strong> • Tuân thủ quy chuẩn thể thức Nghị định số 30/2020/NĐ-CP của Chính phủ & Hướng dẫn số 05-HD/VPTW của Văn phòng Trung ương Đảng
      </footer>
    </div>
  );
}
export default App;
