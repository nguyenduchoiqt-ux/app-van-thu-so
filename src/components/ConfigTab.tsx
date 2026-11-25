import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Users,
  Send,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { AllConfigs, AppMode, SignerItem, UnitConfig } from '../types';
import {
  APP_VERSION_TAG,
  DEFAULT_GEMINI_MODEL,
  GeminiModelOption,
  PRESET_GEMINI_MODELS,
  cleanApiKey,
  clearStoredGeminiApiKey,
  detectGeminiKeyType,
  fetchAvailableGeminiModels,
  getCachedAvailableGeminiModels,
  getOrderedPriorityModelIds,
  getStoredGeminiApiKey,
  getStoredGeminiModel,
  normalizeModelId,
  setStoredGeminiApiKey,
  setStoredGeminiModel,
  testGeminiConnection
} from '../services/geminiService';

interface ConfigTabProps {
  mode: AppMode;
  configs: AllConfigs;
  onSaveConfig: (mode: AppMode, updated: UnitConfig) => void;
  onResetDefaultConfig: (mode: AppMode) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  mode,
  configs,
  onSaveConfig,
  onResetDefaultConfig
}) => {
  const isState = mode === 'NHA_NUOC';
  const currentConfig = configs[mode];

  // --- STATE CẤU HÌNH GEMINI API KEY (BYOK) ---
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredGeminiApiKey());
  const [hasSavedKey, setHasSavedKey] = useState<boolean>(() => Boolean(getStoredGeminiApiKey()));
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const [modelOptions, setModelOptions] = useState<GeminiModelOption[]>(() =>
    getCachedAvailableGeminiModels()
  );

  const initialModel = getStoredGeminiModel();
  const isInitialInOptions = modelOptions.some((m) => m.id === initialModel);
  const [selectedModelOption, setSelectedModelOption] = useState<string>(
    isInitialInOptions ? initialModel : 'CUSTOM'
  );
  const [customModelInput, setCustomModelInput] = useState<string>(
    isInitialInOptions ? '' : initialModel
  );

  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);
  const [keyClearedToast, setKeyClearedToast] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    modelUsed: string;
    endpointMasked?: string;
  } | null>(null);

  // --- STATE CẤU HÌNH ĐƠN VỊ ---
  const [formState, setFormState] = useState<UnitConfig>(currentConfig);
  const [newRecipient, setNewRecipient] = useState('');
  const [newSigner, setNewSigner] = useState<Omit<SignerItem, 'id'>>({
    quyenHan: isState ? 'KT. CHỦ TỊCH' : 'T/M ĐẢNG ỦY',
    chucVu: isState ? 'PHÓ CHỦ TỊCH' : 'PHÓ BÍ THƯ',
    hoTen: ''
  });
  const [savedNotice, setSavedNotice] = useState(false);

  // Đồng bộ khi người dùng chuyển chế độ Khối Nhà nước <-> Khối Đảng trên Header
  useEffect(() => {
    setFormState(configs[mode]);
    setNewSigner({
      quyenHan: mode === 'NHA_NUOC' ? 'KT. CHỦ TỊCH' : 'T/M ĐẢNG ỦY',
      chucVu: mode === 'NHA_NUOC' ? 'PHÓ CHỦ TỊCH' : 'PHÓ BÍ THƯ',
      hoTen: ''
    });
  }, [mode, configs]);

  const primaryBg = isState ? 'bg-[#1e4b7a] hover:bg-[#163a5f]' : 'bg-[#b91c1c] hover:bg-[#991b1b]';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';

  const detectedKeyType = detectGeminiKeyType(apiKeyInput);

  const getEffectiveModel = (): string => {
    if (selectedModelOption === 'CUSTOM') {
      return normalizeModelId(customModelInput.trim() || DEFAULT_GEMINI_MODEL);
    }
    return normalizeModelId(selectedModelOption);
  };

  // Lưu API Key & Model vào localStorage riêng của trình duyệt máy hiện tại
  const handleSaveGeminiKey = () => {
    const cleanKey = cleanApiKey(apiKeyInput);
    const effectiveModel = getEffectiveModel();
    setApiKeyInput(cleanKey);
    setStoredGeminiApiKey(cleanKey);
    setStoredGeminiModel(effectiveModel);
    setHasSavedKey(Boolean(cleanKey));
    setTestResult(null);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2500);
  };

  // Xóa API Key khỏi máy (khi dùng máy công cộng)
  const handleClearGeminiKey = () => {
    clearStoredGeminiApiKey();
    setApiKeyInput('');
    setHasSavedKey(false);
    setModelOptions(PRESET_GEMINI_MODELS);
    setSelectedModelOption(DEFAULT_GEMINI_MODEL);
    setCustomModelInput('');
    setTestResult(null);
    setKeyClearedToast(true);
    setTimeout(() => setKeyClearedToast(false), 2500);
  };

  // Thay đổi lựa chọn Model trên dropdown
  const handleModelOptionChange = (val: string) => {
    setSelectedModelOption(val);
    if (val !== 'CUSTOM') {
      setStoredGeminiModel(val);
    }
    setTestResult(null);
  };

  // Làm mới danh sách Model trực tiếp từ GET https://generativelanguage.googleapis.com/v1beta/models
  const handleRefreshModels = async () => {
    const cleanKey = cleanApiKey(apiKeyInput);
    if (!cleanKey) {
      setTestResult({
        ok: false,
        message: 'Vui lòng nhập Gemini API Key trước khi tải danh sách Model.',
        modelUsed: getEffectiveModel()
      });
      return;
    }

    setApiKeyInput(cleanKey);
    setStoredGeminiApiKey(cleanKey);
    setHasSavedKey(true);
    setLoadingModels(true);
    setTestResult(null);

    try {
      const fetched = await fetchAvailableGeminiModels(cleanKey);
      setModelOptions(fetched);

      const orderedIds = getOrderedPriorityModelIds(fetched);
      const topPriorityModel = orderedIds[0] || DEFAULT_GEMINI_MODEL;

      setSelectedModelOption(topPriorityModel);
      setCustomModelInput('');
      setStoredGeminiModel(topPriorityModel);

      setTestResult({
        ok: true,
        message: `Đã tải thành công ${fetched.length} model văn bản khả dụng từ Google AI Studio. Đã chọn model ưu tiên số 1: "${topPriorityModel}".`,
        modelUsed: topPriorityModel
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách Model từ Google Gemini API.',
        modelUsed: getEffectiveModel()
      });
    } finally {
      setLoadingModels(false);
    }
  };

  // Kiểm tra kết nối trực tiếp tới Google Gemini API (generativelanguage.googleapis.com)
  const handleTestConnection = async () => {
    const cleanKey = cleanApiKey(apiKeyInput);
    const effectiveModel = getEffectiveModel();
    if (cleanKey) {
      setApiKeyInput(cleanKey);
      setStoredGeminiApiKey(cleanKey);
      setStoredGeminiModel(effectiveModel);
      setHasSavedKey(true);
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testGeminiConnection(cleanKey, effectiveModel);
      if (res.availableModels && res.availableModels.length > 0) {
        setModelOptions(res.availableModels);
      }
      if (res.modelUsed) {
        const listToCheck = res.availableModels || modelOptions;
        const inDropdown = listToCheck.some((m) => m.id === res.modelUsed);
        if (inDropdown) {
          setSelectedModelOption(res.modelUsed);
          setCustomModelInput('');
        } else {
          setSelectedModelOption('CUSTOM');
          setCustomModelInput(res.modelUsed);
        }
      }
      setTestResult(res);
    } finally {
      setTestingKey(false);
    }
  };

  const handleAddSigner = () => {
    if (!newSigner.chucVu.trim() || !newSigner.hoTen.trim()) return;
    const item: SignerItem = {
      id: `signer-${Date.now()}`,
      quyenHan: newSigner.quyenHan.trim().toUpperCase(),
      chucVu: newSigner.chucVu.trim().toUpperCase(),
      hoTen: newSigner.hoTen.trim()
    };
    setFormState((prev) => ({
      ...prev,
      signers: [...prev.signers, item]
    }));
    setNewSigner((prev) => ({ ...prev, hoTen: '' }));
  };

  const handleRemoveSigner = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      signers: prev.signers.filter((s) => s.id !== id)
    }));
  };

  const handleAddRecipient = () => {
    if (!newRecipient.trim()) return;
    const cleaned = newRecipient.trim().replace(/;+$/, '') + ';';
    setFormState((prev) => ({
      ...prev,
      commonRecipients: [...prev.commonRecipients, cleaned]
    }));
    setNewRecipient('');
  };

  const handleRemoveRecipient = (idx: number) => {
    setFormState((prev) => ({
      ...prev,
      commonRecipients: prev.commonRecipients.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveAll = () => {
    onSaveConfig(mode, formState);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KHỐI NỔI BẬT TRÊN CÙNG: CẤU HÌNH TRỢ LÝ AI (GEMINI API KEY - BYOK DÙNG RIÊNG THEO TỪNG MÁY) */}
      <div
        id="gemini-api-config-section"
        className="bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/80 rounded-2xl shadow-md border-2 border-indigo-200 p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3.5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Cấu hình Trợ lý AI (Gemini API Key – Dùng riêng theo từng máy)
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {APP_VERSION_TAG}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    hasSavedKey
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {hasSavedKey ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Đã lưu Key trên máy này
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Chưa nhập API Key
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Bảo mật & Độc lập (BYOK):</strong> Hỗ trợ cả định dạng Key <code className="font-mono text-indigo-700">AIza...</code> và <code className="font-mono text-indigo-700">AQ....</code> từ Google AI Studio. Key chỉ lưu cục bộ trong <code className="font-mono font-semibold text-indigo-700">localStorage</code> trên máy của bạn và gọi trực tiếp tới <code className="font-mono text-indigo-700">generativelanguage.googleapis.com</code>.
                </span>
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            Lấy Gemini API Key miễn phí
          </a>
        </div>

        {/* Ô NHẬP KEY + NÚT ẨN/HIỆN + LƯU KEY + XÓA KEY + KIỂM TRA KẾT NỐI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Cột nhập API Key (7 phần) */}
          <div className="lg:col-span-7 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Google Gemini API Key của bạn *
            </label>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Dán mã API Key (AIzaSy... hoặc AQ....) vào đây"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-20 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                title={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                className="absolute right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
              >
                {showApiKey ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Ẩn
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Hiện
                  </>
                )}
              </button>
            </div>

            {/* Nhãn nhận diện Google Gemini API Key ngay dưới ô nhập */}
            {detectedKeyType !== 'EMPTY' && (
              <div className="flex items-center gap-1.5 text-xs">
                {detectedKeyType === 'GEMINI_KEY' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã nhận diện: Google Gemini API Key
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Đã nhận diện: Google Gemini API Key (Định dạng tùy chỉnh)
                  </span>
                )}
              </div>
            )}

            {/* Các nút thao tác Key */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              >
                {keySavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {keySavedToast ? 'Đã lưu Key!' : 'Lưu Key'}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingKey || loadingModels}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-sm transition"
              >
                {testingKey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải danh sách Model & Kiểm tra...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Kiểm tra kết nối (Test Key)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearGeminiKey}
                title="Xóa API Key khỏi trình duyệt khi sử dụng máy tính công cộng"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {keyClearedToast ? 'Đã xóa Key khỏi máy!' : 'Xóa Key'}
              </button>
            </div>
          </div>

          {/* Cột chọn Model Gemini (5 phần) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Chọn Model Gemini ({modelOptions.length})
              </label>
              <button
                type="button"
                onClick={handleRefreshModels}
                disabled={loadingModels || testingKey}
                title="Tải danh sách các model gemini-* có hỗ trợ generateContent trực tiếp từ API Key của bạn"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                {loadingModels ? 'Đang tải...' : 'Làm mới danh sách Model'}
              </button>
            </div>

            <select
              value={selectedModelOption}
              onChange={(e) => handleModelOptionChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="CUSTOM">⚙️ Tự nhập tên model (Khi Google ra phiên bản mới)...</option>
            </select>

            {selectedModelOption === 'CUSTOM' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/^models\//i, '');
                    setCustomModelInput(cleanVal);
                    if (cleanVal.trim()) {
                      setStoredGeminiModel(cleanVal.trim());
                    }
                  }}
                  placeholder="Nhập mã model (VD: gemini-3.8-flash, gemini-3.5-flash...)"
                  className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ưu tiên số 1: <code className="font-bold text-indigo-700">gemini-3.8-flash</code> (dự phòng hạn mức cao 500 lượt/ngày: <code className="font-bold text-emerald-700">gemini-3.5-flash-lite</code>, tiếp theo <code className="font-semibold text-slate-700">gemini-3.5-flash</code>). Nếu gặp lỗi giới hạn lượt gọi <code className="font-mono text-red-600">HTTP 429</code>, hãy chọn <code className="font-bold text-emerald-700">gemini-3.5-flash-lite</code> hoặc đổi sang API Key từ Gmail khác.
            </p>
          </div>
        </div>

        {/* THÔNG BÁO KẾT QUẢ TEST KEY (XANH HOẶC ĐỎ KÈM CHẨN ĐOÁN CHI TIẾT) */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold">
                {testResult.ok
                  ? `Kết nối thành công (Model: ${testResult.modelUsed})`
                  : `Kết nối không thành công (Model thử nghiệm: ${testResult.modelUsed})`}
              </div>
              <div className="mt-1 break-words font-mono text-[11.5px] leading-relaxed">
                {testResult.message}
              </div>
            </div>
          </div>
        )}

        {/* HỘP HƯỚNG DẪN 3 BƯỚC LẤY GEMINI API KEY MIỄN PHÍ TRONG 30 GIÂY */}
        <div className="bg-white/90 rounded-xl border border-indigo-100 p-3.5 text-xs text-slate-700">
          <div className="font-bold text-indigo-900 mb-2 flex items-center justify-between flex-wrap gap-2">
            <span>💡 Hướng dẫn 3 bước tự tạo Gemini API Key miễn phí bằng Gmail (chỉ 30 giây):</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-bold inline-flex items-center gap-1"
            >
              Mở Google AI Studio (aistudio.google.com/apikey)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
              <span className="font-extrabold text-indigo-700">Bước 1:</span> Nhấn nút{' '}
              <strong>&ldquo;Lấy Gemini API Key miễn phí&rdquo;</strong> ở trên để mở trang{' '}
              <code className="font-semibold">Google AI Studio</code> và đăng nhập bằng Gmail.
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
              <span className="font-extrabold text-indigo-700">Bước 2:</span> Nhấn nút{' '}
              <strong>&ldquo;Create API key&rdquo;</strong> và <strong>Copy</strong> mã Key (bắt đầu bằng{' '}
              <code className="font-mono">AIzaSy...</code> hoặc <code className="font-mono">AQ....</code>).
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
              <span className="font-extrabold text-indigo-700">Bước 3:</span> Dán mã vào ô phía trên, nhấn{' '}
              <strong>&ldquo;Lưu Key&rdquo;</strong> và <strong>&ldquo;Kiểm tra kết nối&rdquo;</strong> để tải danh sách model (gồm <code className="font-mono">gemini-3.8-flash</code>, <code className="font-mono">gemini-3.5-flash</code>) và bắt đầu sử dụng.
            </div>
          </div>
        </div>
      </div>

      {/* Header Cấu hình đơn vị */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className={`w-6 h-6 ${primaryText}`} />
            <h2 className="text-lg font-bold text-slate-900">
              Cấu hình Đơn vị mặc định ({isState ? 'Khối Nhà nước - NĐ 30/2020' : 'Khối Đảng - HD 05-HD/VPTW'})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin được lưu tự động vào <code className="font-semibold">localStorage</code> riêng cho từng chế độ và áp dụng ngay cho văn bản mới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onResetDefaultConfig(mode)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Khôi phục mặc định
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg text-white shadow-sm transition ${primaryBg}`}
          >
            {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedNotice ? 'Đã lưu & Áp dụng!' : 'Lưu cấu hình đơn vị'}
          </button>
        </div>
      </div>

      {/* 1. THÔNG TIN CƠ QUAN & ĐỊA DANH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
          <Building className="w-4 h-4" />
          1. Cơ quan chủ quản, Cơ quan ban hành & Địa danh mặc định
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tên cơ quan chủ quản cấp trên trực tiếp (Dòng 1 ô trái)
            </label>
            <input
              type="text"
              value={formState.coQuanChuQuan}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, coQuanChuQuan: e.target.value.toUpperCase() }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tên cơ quan, tổ chức ban hành văn bản (Dòng 2 ô trái - In đậm)
            </label>
            <input
              type="text"
              value={formState.coQuanBanHanh}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, coQuanBanHanh: e.target.value.toUpperCase() }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ký hiệu viết tắt cơ quan ban hành (dùng để tự ghép Số/Ký hiệu)
            </label>
            <input
              type="text"
              value={formState.kyHieuCoQuan}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, kyHieuCoQuan: e.target.value.toUpperCase() }))
              }
              placeholder={isState ? 'VD: UBND, HĐND' : 'VD: ĐU, TU, HU'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Địa danh hành chính mặc định
            </label>
            <input
              type="text"
              value={formState.diaDanh}
              onChange={(e) => setFormState((prev) => ({ ...prev, diaDanh: e.target.value }))}
              placeholder="VD: Nam Giang"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. DANH SÁCH NGƯỜI KÝ (QUYỀN HẠN, CHỨC VỤ, HỌ TÊN) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
          <Users className="w-4 h-4" />
          2. Danh sách Người ký thường dùng (Quyền hạn, Chức vụ, Họ tên)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <input
            type="text"
            value={newSigner.quyenHan}
            onChange={(e) => setNewSigner((prev) => ({ ...prev, quyenHan: e.target.value }))}
            placeholder={isState ? 'Quyền hạn (TM. / KT.)' : 'Quyền hạn (T/M ĐẢNG ỦY)'}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase bg-white"
          />
          <input
            type="text"
            value={newSigner.chucVu}
            onChange={(e) => setNewSigner((prev) => ({ ...prev, chucVu: e.target.value }))}
            placeholder="Chức vụ (CHỦ TỊCH / BÍ THƯ) *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase bg-white"
          />
          <input
            type="text"
            value={newSigner.hoTen}
            onChange={(e) => setNewSigner((prev) => ({ ...prev, hoTen: e.target.value }))}
            placeholder="Họ và tên người ký *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
          <button
            type="button"
            onClick={handleAddSigner}
            className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-lg shadow-sm transition ${primaryBg}`}
          >
            <Plus className="w-4 h-4" />
            Thêm người ký
          </button>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {formState.signers.map((signer) => (
            <div
              key={signer.id}
              className="p-3 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {signer.quyenHan && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                    {signer.quyenHan}
                  </span>
                )}
                <span className="font-bold text-slate-900">{signer.chucVu}</span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-slate-800">{signer.hoTen}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSigner(signer.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. DANH SÁCH NƠI NHẬN THƯỜNG DÙNG */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${primaryText}`}>
          <Send className="w-4 h-4" />
          3. Danh sách Nơi nhận thường dùng
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            placeholder="Nhập nơi nhận thường dùng mới (VD: Phòng Văn hóa - Thông tin;)..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddRecipient}
            className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-lg shadow-sm transition ${primaryBg}`}
          >
            <Plus className="w-4 h-4" />
            Thêm nơi nhận
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {formState.commonRecipients.map((rec, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
            >
              <span className="text-slate-800">- {rec}</span>
              <button
                type="button"
                onClick={() => handleRemoveRecipient(idx)}
                className="p-1 text-slate-400 hover:text-red-600 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
