import mammoth from 'mammoth';
import { DOC_TYPES } from '../constants';
import { AppMode, DocumentData, UnitConfig } from '../types';

export const APP_VERSION_TAG = 'v4.9';
export const GEMINI_API_KEY_STORAGE = 'vts_gemini_api_key';
export const GEMINI_MODEL_STORAGE = 'vts_gemini_model';
export const GEMINI_MODELS_CACHE_STORAGE = 'vts_gemini_available_models';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export type GeminiKeyType = 'GEMINI_KEY' | 'UNKNOWN' | 'EMPTY';
export type GeminiStatusCallback = (statusMessage: string) => void;

export interface GeminiModelOption {
  id: string;
  label: string;
  displayName?: string;
}

export const PRESET_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    label: 'gemini-3.8-flash (Mặc định – Thế hệ mới nhất 3.8, tốc độ siêu nhanh & chuẩn xác)'
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'gemini-3.5-flash-lite (Khuyên dùng chống lỗi 429 – Hạn mức miễn phí 500 lượt/ngày)'
  },
  {
    id: 'gemini-3.5-flash',
    label: 'gemini-3.5-flash (Ổn định – Dòng Flash 3.5 tốc độ cao, hạn mức tốt)'
  },
  {
    id: 'gemini-flash-latest',
    label: 'gemini-flash-latest (Bản Flash mới nhất tự động của Google)'
  },
  {
    id: 'gemini-3.8-pro',
    label: 'gemini-3.8-pro (Phân tích chuyên sâu thế hệ 3.8)'
  },
  {
    id: 'gemini-3.5-pro',
    label: 'gemini-3.5-pro (Phân tích chuyên sâu thế hệ 3.5)'
  }
];

export interface GeminiDocResponse {
  docType?: string;
  trichYeu: string;
  kinhGui: string;
  canCu: string[];
  noiDung: string;
  suggestedDocType?: string;
}

export type GeminiErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'QUOTA_EXCEEDED'
  | 'SERVER_OVERLOADED'
  | 'MODEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'API_ERROR';

export class GeminiServiceError extends Error {
  code: GeminiErrorCode;
  httpStatus?: number;
  rawGoogleMessage?: string;
  endpointMasked?: string;

  constructor(
    message: string,
    code: GeminiErrorCode,
    httpStatus?: number,
    rawGoogleMessage?: string,
    endpointMasked?: string
  ) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.rawGoogleMessage = rawGoogleMessage;
    this.endpointMasked = endpointMasked;
  }
}

/**
 * Trim sạch toàn bộ khoảng trắng, ký tự xuống dòng ở đầu và cuối API Key
 */
export function cleanApiKey(rawKey: string): string {
  return (rawKey || '').trim().replace(/[\r\n\s]+/g, '');
}

/**
 * Nhận diện Google Gemini API Key (hỗ trợ cả AIza... và AQ.... trên generativelanguage.googleapis.com)
 */
export function detectGeminiKeyType(rawKey: string): GeminiKeyType {
  const cleaned = cleanApiKey(rawKey);
  if (!cleaned) return 'EMPTY';
  if (/^(AIza|AQ\.)/i.test(cleaned)) return 'GEMINI_KEY';
  return 'UNKNOWN';
}

/**
 * Kiểm tra xem model có thuộc nhóm không dùng soạn thảo văn bản, đã ngừng cấp cho người dùng mới (2.5/2.0/1.5)
 * hoặc hay bị limit: 0 trên gói miễn phí không
 */
const EXCLUDED_MODEL_KEYWORDS_REGEX =
  /(omni|image|tts|audio|embedding|aqa|veo|imagen|learnlm|robotics|computer-use|gemini-2\.5-flash|gemini-2\.5-pro|gemini-2\.5|gemini-2\.0|gemini-1\.5)/i;

export function isExcludedModelId(modelId: string): boolean {
  return EXCLUDED_MODEL_KEYWORDS_REGEX.test(modelId);
}

/**
 * Chuẩn hóa tên model:
 * - Cắt bỏ tiền tố "models/" hoặc "publishers/google/models/" nếu có
 * - Cắt bỏ phần chú thích tiếng Việt phía sau dấu cách hoặc dấu ngoặc đơn
 * - Nếu model thuộc nhóm bị loại trừ (như gemini-2.5-flash cũ) -> tự động nâng lên DEFAULT_GEMINI_MODEL (gemini-3.8-flash)
 */
export function normalizeModelId(rawModel: string): string {
  const str = (rawModel || '').trim();
  const withoutPrefix = str
    .replace(/^publishers\/google\/models\//i, '')
    .replace(/^models\//i, '')
    .trim();
  const cleanId = withoutPrefix.split(/[\s(]/)[0].trim();
  if (!cleanId || isExcludedModelId(cleanId)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return cleanId;
}

/**
 * Trích xuất số phiên bản từ tên model (VD: gemini-3.8-flash -> 3.8) để ưu tiên dòng flash có phiên bản cao nhất
 */
function extractModelVersionScore(modelId: string): number {
  const match = modelId.toLowerCase().match(/gemini-(\d+(?:\.\d+)?)/);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * Tính điểm ưu tiên sắp xếp model:
 * 1. gemini-3.8-flash (Ưu tiên số 1)
 * 2. Các biến thể gemini-3.8-*flash*
 * 3. gemini-3.5-flash (Ưu tiên số 2)
 * 4. Các biến thể gemini-3.5-*flash*
 * 5. Các model dòng flash có phiên bản cao nhất khác
 * 6. gemini-flash-latest
 * 7. Các dòng pro thế hệ mới
 */
function getModelPriorityRank(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id === 'gemini-3.8-flash') return 1;
  if (id === 'gemini-3.5-flash-lite') return 2;
  if (id.includes('3.5') && id.includes('flash') && id.includes('lite')) return 3;
  if (id.startsWith('gemini-3.8-flash') && !id.includes('lite')) return 4;
  if (id === 'gemini-3.5-flash') return 5;
  if (id.startsWith('gemini-3.5-flash') && !id.includes('lite')) return 6;
  if (id.includes('3.8') && id.includes('flash')) return 7;
  if (id.includes('3.5') && id.includes('flash')) return 8;
  if (id === 'gemini-flash-latest') return 9;
  if (id.includes('flash') && !id.includes('lite')) return 10;
  if (id.includes('flash')) return 11;
  if (id === 'gemini-3.8-pro') return 12;
  if (id === 'gemini-3.5-pro') return 13;
  if (id.includes('pro')) return 14;
  return 20;
}

export function sortGeminiModelsByPriority(models: GeminiModelOption[]): GeminiModelOption[] {
  return [...models].sort((a, b) => {
    const rankA = getModelPriorityRank(a.id);
    const rankB = getModelPriorityRank(b.id);
    if (rankA !== rankB) return rankA - rankB;
    const verA = extractModelVersionScore(a.id);
    const verB = extractModelVersionScore(b.id);
    if (verA !== verB) return verB - verA;
    return b.id.localeCompare(a.id);
  });
}

export function getStoredGeminiApiKey(): string {
  try {
    return cleanApiKey(localStorage.getItem(GEMINI_API_KEY_STORAGE) || '');
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, cleanApiKey(key));
    window.dispatchEvent(new Event('vts-gemini-config-changed'));
  } catch {
    // ignore
  }
}

export function clearStoredGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    localStorage.removeItem(GEMINI_MODELS_CACHE_STORAGE);
    window.dispatchEvent(new Event('vts-gemini-config-changed'));
  } catch {
    // ignore
  }
}

export function getStoredGeminiModel(): string {
  try {
    const saved = (localStorage.getItem(GEMINI_MODEL_STORAGE) || '').trim();
    if (!saved) return DEFAULT_GEMINI_MODEL;
    const normalized = normalizeModelId(saved);
    if (normalized !== saved) {
      localStorage.setItem(GEMINI_MODEL_STORAGE, normalized);
    }
    return normalized;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function setStoredGeminiModel(model: string): void {
  try {
    const clean = normalizeModelId(model);
    localStorage.setItem(GEMINI_MODEL_STORAGE, clean);
    window.dispatchEvent(new Event('vts-gemini-config-changed'));
  } catch {
    // ignore
  }
}

export function getCachedAvailableGeminiModels(): GeminiModelOption[] {
  try {
    const raw = localStorage.getItem(GEMINI_MODELS_CACHE_STORAGE);
    if (!raw) return PRESET_GEMINI_MODELS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed
        .filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            !isExcludedModelId(item.id)
        )
        .map((item) => {
          const cleanId = normalizeModelId(item.id);
          return {
            id: cleanId,
            label: String(item.label || cleanId),
            displayName: item.displayName ? String(item.displayName) : undefined
          };
        });
      if (valid.length > 0) {
        return sortGeminiModelsByPriority(valid);
      }
    }
  } catch {
    // ignore
  }
  return PRESET_GEMINI_MODELS;
}

export function setCachedAvailableGeminiModels(models: GeminiModelOption[]): void {
  try {
    localStorage.setItem(
      GEMINI_MODELS_CACHE_STORAGE,
      JSON.stringify(sortGeminiModelsByPriority(models))
    );
    window.dispatchEvent(new Event('vts-gemini-config-changed'));
  } catch {
    // ignore
  }
}

/**
 * Lấy danh sách các ứng viên model ưu tiên hàng đầu để tự động thử nghiệm / fallback
 * Đảm bảo thứ tự ưu tiên: gemini-3.8-flash -> gemini-3.5-flash -> các model dòng flash có phiên bản cao nhất từ API
 */
export function getOrderedPriorityModelIds(
  availableModels: GeminiModelOption[],
  preferredFirstModel?: string
): string[] {
  const sorted = sortGeminiModelsByPriority(
    availableModels.length > 0 ? availableModels : PRESET_GEMINI_MODELS
  );
  const result: string[] = [];

  if (preferredFirstModel && !isExcludedModelId(preferredFirstModel)) {
    const cleanPref = normalizeModelId(preferredFirstModel);
    if (availableModels.length === 0 || availableModels.some((m) => m.id === cleanPref)) {
      result.push(cleanPref);
    }
  }

  // Luôn ưu tiên gemini-3.5-flash-lite (500 lượt/ngày) ở vị trí dự phòng đầu tiên ngay sau model người dùng đang chọn
  if (!result.includes('gemini-3.5-flash-lite')) {
    result.push('gemini-3.5-flash-lite');
  }

  for (const m of sorted) {
    const id = normalizeModelId(m.id);
    if (!isExcludedModelId(id) && !result.includes(id)) {
      result.push(id);
    }
  }

  // Luôn đảm bảo các model ưu tiên cốt lõi có mặt trong danh sách ứng viên
  for (const coreId of [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-pro',
    'gemini-3.5-pro'
  ]) {
    if (!result.includes(coreId)) {
      result.push(coreId);
    }
  }

  return result;
}

/**
 * Gọi trực tiếp GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}
 * - Cắt bỏ tiền tố "models/"
 * - Chỉ giữ các model gemini-* hỗ trợ generateContent
 * - Lọc bỏ omni, image, tts, audio, embedding, aqa, veo, imagen, learnlm, robotics, computer-use và các bản 2.5 cũ
 * - Ưu tiên: gemini-3.8-flash -> gemini-3.5-flash -> các model flash phiên bản cao nhất
 */
export async function fetchAvailableGeminiModels(
  customApiKey?: string
): Promise<GeminiModelOption[]> {
  const apiKey = cleanApiKey(customApiKey ?? getStoredGeminiApiKey());
  if (!apiKey) {
    throw new GeminiServiceError(
      'Vui lòng nhập Gemini API Key trước khi tải danh sách Model.',
      'NO_KEY'
    );
  }

  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    apiKey
  )}`;
  const maskedEndpoint = 'GET https://generativelanguage.googleapis.com/v1beta/models?key=***';

  let response: Response;
  try {
    response = await fetch(directUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (err) {
    throw new GeminiServiceError(
      `Lỗi kết nối mạng khi gọi [${maskedEndpoint}]: ${
        err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ Google.'
      }`,
      'NETWORK_ERROR',
      undefined,
      undefined,
      maskedEndpoint
    );
  }

  const rawText = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errObj = data?.error as { message?: string } | undefined;
    const rawGoogleMessage = errObj?.message || rawText || `HTTP ${response.status}`;

    const code: GeminiErrorCode =
      response.status === 400 || response.status === 403
        ? 'INVALID_KEY'
        : response.status === 404
        ? 'MODEL_NOT_FOUND'
        : response.status === 429
        ? 'QUOTA_EXCEEDED'
        : 'API_ERROR';

    throw new GeminiServiceError(
      `HTTP ${response.status} tại [${maskedEndpoint}] — Google trả về: ${rawGoogleMessage}`,
      code,
      response.status,
      rawGoogleMessage,
      maskedEndpoint
    );
  }

  const rawModels: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }> = Array.isArray(data?.models)
    ? (data.models as Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>)
    : [];

  const filtered: GeminiModelOption[] = [];
  const seen = new Set<string>();

  for (const m of rawModels) {
    const rawName = (m.name || '').trim();
    if (!rawName) continue;

    const modelId = rawName.replace(/^models\//i, '').trim();
    if (!modelId.toLowerCase().startsWith('gemini-')) continue;
    if (isExcludedModelId(modelId)) continue;

    const methods = Array.isArray(m.supportedGenerationMethods)
      ? m.supportedGenerationMethods
      : [];
    if (!methods.includes('generateContent')) continue;

    if (seen.has(modelId)) continue;
    seen.add(modelId);

    let label = m.displayName ? `${modelId} (${m.displayName})` : modelId;
    if (modelId === 'gemini-3.8-flash') {
      label = 'gemini-3.8-flash (Khuyên dùng số 1 – Thế hệ 3.8 mới nhất, tốc độ siêu nhanh)';
    } else if (modelId === 'gemini-3.5-flash-lite') {
      label = 'gemini-3.5-flash-lite (Khuyên dùng chống lỗi 429 – Hạn mức 500 lượt/ngày)';
    } else if (modelId === 'gemini-3.5-flash') {
      label = 'gemini-3.5-flash (Khuyên dùng số 2 – Thế hệ 3.5 ổn định, tốc độ nhanh)';
    } else if (modelId === 'gemini-flash-latest') {
      label = 'gemini-flash-latest (Bản Flash mới nhất tự động của Google)';
    }

    filtered.push({
      id: modelId,
      label,
      displayName: m.displayName
    });
  }

  const sorted = sortGeminiModelsByPriority(filtered);

  if (sorted.length > 0) {
    setCachedAvailableGeminiModels(sorted);
    return sorted;
  }

  return PRESET_GEMINI_MODELS;
}

/**
 * Đọc phần text kết quả thực sự từ phản hồi Gemini (dòng 3.5 / 3.8):
 * - Tuyệt đối không lấy cứng candidates[0].content.parts[0].text
 * - Lọc bỏ các phần suy luận ngầm (part.thought === true) và ghép các phần text thực sự
 */
export function extractGeminiResponseText(data: Record<string, unknown>): string {
  const candidates = data?.candidates as
    | Array<{
        content?: {
          parts?: Array<{
            text?: unknown;
            thought?: boolean;
          }>;
        };
      }>
    | undefined;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return '';
  }

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) continue;

    const joined = parts
      .filter((p) => p && !p.thought && typeof p.text === 'string')
      .map((p) => (p.text as string).trim())
      .filter(Boolean)
      .join('\n')
      .trim();

    if (joined) {
      return joined;
    }

    // Fallback phòng trường hợp toàn bộ parts đều có text nhưng cờ thought bị gắn nhầm
    const fallbackJoined = parts
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => (p.text as string).trim())
      .filter(Boolean)
      .join('\n')
      .trim();

    if (fallbackJoined) {
      return fallbackJoined;
    }
  }

  return '';
}

/**
 * Thực hiện 1 lần gọi POST trực tiếp tới:
 * https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}
 */
async function executeSingleGenerateRequest(params: {
  apiKey: string;
  cleanModel: string;
  payload: Record<string, unknown>;
}): Promise<{ status: number; data: Record<string, unknown>; maskedEndpoint: string }> {
  const { apiKey, cleanModel, payload } = params;

  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cleanModel
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const maskedEndpoint = `POST https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=***`;

  try {
    const res = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const rawText = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { rawText };
    }

    return {
      status: res.status,
      data: parsed,
      maskedEndpoint
    };
  } catch (networkErr) {
    throw new GeminiServiceError(
      `Lỗi kết nối mạng khi gọi [${maskedEndpoint}]: ${
        networkErr instanceof Error
          ? networkErr.message
          : 'Không thể kết nối tới máy chủ Google Gemini.'
      }`,
      'NETWORK_ERROR',
      undefined,
      undefined,
      maskedEndpoint
    );
  }
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kiểm tra lỗi quá tải máy chủ tạm thời (HTTP 503 / 502 / 504) hoặc nghẽn tốc độ tạm thời (HTTP 429 không phải limit: 0)
 */
function isTransientOverloadOrRateLimit(status: number, rawMessage: string): boolean {
  if (status === 503 || status === 502 || status === 504) return true;
  if (status === 429 && !/limit:\s*0\b/i.test(rawMessage)) return true;
  return false;
}

/**
 * Kiểm tra xem lỗi trả về có phải là lỗi nên bỏ qua ngay lập tức (không chờ) và tự động chuyển sang model khả dụng tiếp theo:
 * - Lỗi HTTP 404 (Model không tồn tại / đã ngừng hỗ trợ)
 * - Lỗi HTTP 429 có chứa "limit: 0" (Model bị giới hạn quota = 0)
 */
function shouldSkipImmediatelyToNextModel(status: number, rawMessage: string): boolean {
  if (status === 404) return true;
  if (status === 429 && /limit:\s*0\b/i.test(rawMessage)) return true;
  return false;
}

/**
 * Lấy danh sách model dự phòng khả dụng thực tế từ API (ưu tiên gemini-3.8-flash -> gemini-3.5-flash -> các model flash cao nhất)
 */
async function getFallbackCandidateModels(
  apiKey: string,
  excludeModelIds: Set<string>
): Promise<string[]> {
  let available: GeminiModelOption[] = getCachedAvailableGeminiModels();
  try {
    available = await fetchAvailableGeminiModels(apiKey);
  } catch {
    // Dùng cache + preset nếu mạng đang nghẽn
  }

  const orderedFromAccount = getOrderedPriorityModelIds(available);
  const reliableFallbacks = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-pro',
    'gemini-3.5-pro'
  ];

  // Đưa gemini-3.5-flash-lite lên vị trí dự phòng đầu tiên ngay sau model người dùng đang chọn
  const merged: string[] = [];
  for (const id of ['gemini-3.5-flash-lite', ...orderedFromAccount, ...reliableFallbacks]) {
    const clean = normalizeModelId(id);
    if (
      clean &&
      !excludeModelIds.has(clean) &&
      !isExcludedModelId(clean) &&
      !merged.includes(clean)
    ) {
      merged.push(clean);
    }
  }
  return merged;
}

/**
 * Hàm gọi generateContent trung tâm với vòng lặp dự phòng thông minh:
 * - Cấu hình mặc định: responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 8192
 * - Lọc bỏ part.thought === true khi đọc phản hồi
 * - Gặp HTTP 503: chờ 2 giây thử lại 1 lần trên model đó rồi mới chuyển sang model dự phòng tiếp theo
 * - Gặp HTTP 404 hoặc HTTP 429 (limit: 0): bỏ qua ngay lập tức (không chờ) và chuyển sang model khả dụng tiếp theo (thử tối đa 4 model)
 * - Khi một model dự phòng chạy thành công thay cho model bị 404 (hoặc limit: 0), tự động lưu làm mặc định mới trong localStorage
 */
async function callGeminiGenerateContent(
  parts: Array<Record<string, unknown>>,
  options?: {
    apiKey?: string;
    model?: string;
    responseMimeType?: string;
    temperature?: number;
    maxOutputTokens?: number;
    disableAutoFallback?: boolean;
    onStatusChange?: GeminiStatusCallback;
  }
): Promise<string> {
  const apiKey = cleanApiKey(options?.apiKey ?? getStoredGeminiApiKey());
  const initialModel = normalizeModelId(options?.model ?? getStoredGeminiModel());
  const onStatusChange = options?.onStatusChange;

  if (!apiKey) {
    throw new GeminiServiceError(
      'Bạn chưa cài đặt Gemini API Key. Vui lòng nhập API Key tại mục "6. Cấu hình đơn vị" để sử dụng Trợ lý AI.',
      'NO_KEY'
    );
  }

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    generationConfig: {
      responseMimeType: options?.responseMimeType ?? 'application/json',
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxOutputTokens ?? 8192
    }
  };

  const getRawErrorMessage = (attempt: { data: Record<string, unknown> }): string => {
    const errObj = attempt.data?.error as { message?: string } | undefined;
    return (
      errObj?.message ||
      (typeof attempt.data?.rawText === 'string'
        ? attempt.data.rawText
        : JSON.stringify(attempt.data))
    );
  };

  const triedModels = new Set<string>();
  let candidateQueue: string[] = [initialModel];
  let fallbackLoaded = false;
  let hadInitial404OrZeroLimit = false;

  let lastAttempt: {
    status: number;
    data: Record<string, unknown>;
    maskedEndpoint: string;
  } | null = null;
  let lastRawMsg = '';

  const maxModelsToTry = options?.disableAutoFallback ? 1 : 6;

  while (candidateQueue.length > 0 && triedModels.size < maxModelsToTry) {
    const currentModel = candidateQueue.shift()!;
    if (triedModels.has(currentModel)) continue;
    triedModels.add(currentModel);

    if (triedModels.size > 1) {
      onStatusChange?.(
        `Đang tự động chuyển sang model khả dụng (${currentModel}) [${triedModels.size}/${maxModelsToTry}]...`
      );
    }

    let attempt = await executeSingleGenerateRequest({
      apiKey,
      cleanModel: currentModel,
      payload
    });

    if (attempt.status >= 200 && attempt.status < 300) {
      const text = extractGeminiResponseText(attempt.data);
      if (text) {
        if (currentModel !== initialModel && hadInitial404OrZeroLimit) {
          setStoredGeminiModel(currentModel);
        }
        return text;
      }
    }

    let rawMsg = getRawErrorMessage(attempt);

    // Nếu gặp HTTP 503 (quá tải máy chủ tạm thời): chờ 2 giây thử lại 1 lần trên chính model đó rồi mới chuyển sang model dự phòng tiếp theo
    if (attempt.status === 503 || attempt.status === 502 || attempt.status === 504) {
      onStatusChange?.(
        `Máy chủ Google đang bận (HTTP ${attempt.status}), đang chờ 2 giây để thử lại trên ${currentModel}...`
      );
      await delayMs(2000);

      const retryAttempt = await executeSingleGenerateRequest({
        apiKey,
        cleanModel: currentModel,
        payload
      });

      if (retryAttempt.status >= 200 && retryAttempt.status < 300) {
        const retryText = extractGeminiResponseText(retryAttempt.data);
        if (retryText) {
          if (currentModel !== initialModel && hadInitial404OrZeroLimit) {
            setStoredGeminiModel(currentModel);
          }
          return retryText;
        }
      }

      attempt = retryAttempt;
      rawMsg = getRawErrorMessage(retryAttempt);
    }

    lastAttempt = attempt;
    lastRawMsg = rawMsg;

    const is404OrZeroQuota = shouldSkipImmediatelyToNextModel(attempt.status, rawMsg);
    const isOverloadOr429 = isTransientOverloadOrRateLimit(attempt.status, rawMsg);

    if (is404OrZeroQuota || attempt.status === 429) {
      hadInitial404OrZeroLimit = true;
    }

    // Nếu gặp lỗi 400 / 403 (Key không hợp lệ hoặc cú pháp sai) -> Dừng ngay để báo lỗi
    if (!is404OrZeroQuota && !isOverloadOr429) {
      break;
    }

    // Nếu cho phép auto-fallback và chưa tải danh sách dự phòng từ API -> Tải ngay (ưu tiên gemini-3.5-flash-lite đầu tiên)
    if (!options?.disableAutoFallback && !fallbackLoaded) {
      fallbackLoaded = true;
      const moreCandidates = await getFallbackCandidateModels(apiKey, triedModels);
      for (const mId of moreCandidates) {
        if (!triedModels.has(mId) && !candidateQueue.includes(mId)) {
          candidateQueue.push(mId);
        }
      }
    }
  }

  const finalStatus = lastAttempt?.status ?? 500;
  const finalEndpoint = lastAttempt?.maskedEndpoint ?? 'POST generativelanguage.googleapis.com';

  if (finalStatus === 429) {
    throw new GeminiServiceError(
      `Tài khoản API Key hiện tại đã chạm giới hạn lượt gọi miễn phí trong ngày (HTTP 429) sau khi đã tự động xoay vòng thử ${triedModels.size} model. Khuyến nghị: Vui lòng mở Tab "6. Cấu hình đơn vị" để chọn model "gemini-3.5-flash-lite" (500 lượt/ngày) hoặc đổi sang API Key từ tài khoản Gmail khác.`,
      'QUOTA_EXCEEDED',
      429,
      lastRawMsg,
      finalEndpoint
    );
  }

  if (finalStatus === 503 || finalStatus === 502 || finalStatus === 504) {
    throw new GeminiServiceError(
      `Máy chủ Google Gemini hiện đang quá tải tạm thời (HTTP ${finalStatus}) sau khi đã thử tự động trên ${triedModels.size} model. Bạn vui lòng chờ khoảng 15–30 giây rồi bấm "Thử lại".`,
      'SERVER_OVERLOADED',
      finalStatus,
      lastRawMsg,
      finalEndpoint
    );
  }

  const code: GeminiErrorCode =
    finalStatus === 404
      ? 'MODEL_NOT_FOUND'
      : finalStatus === 400 || finalStatus === 403
      ? 'INVALID_KEY'
      : finalStatus === 503 || finalStatus === 502 || finalStatus === 504
      ? 'SERVER_OVERLOADED'
      : finalStatus === 429
      ? 'QUOTA_EXCEEDED'
      : 'API_ERROR';

  throw new GeminiServiceError(
    `HTTP ${finalStatus} tại [${finalEndpoint}] — Google trả về: ${lastRawMsg}`,
    code,
    finalStatus,
    lastRawMsg,
    finalEndpoint
  );
}

/**
 * Kiểm tra kết nối trực tiếp tới Google Gemini API (Tab 6 Cấu hình đơn vị):
 * 1. Luôn tải mới danh sách model từ GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}
 * 2. Sắp xếp ưu tiên: gemini-3.8-flash -> gemini-3.5-flash -> các model flash phiên bản cao nhất
 * 3. Nếu model đang chọn bị lỗi 404 / 429 (limit: 0), tự động chuyển ngay sang model khả dụng tiếp theo (tối đa 4 model) và lưu vào localStorage
 */
export async function testGeminiConnection(
  customKey?: string,
  customModel?: string
): Promise<{
  ok: boolean;
  message: string;
  modelUsed: string;
  keyType: GeminiKeyType;
  endpointMasked?: string;
  availableModels?: GeminiModelOption[];
  autoSwitchedFrom?: string;
}> {
  const apiKey = cleanApiKey(customKey ?? getStoredGeminiApiKey());
  const keyType = detectGeminiKeyType(apiKey);
  const userSelectedModel = normalizeModelId(customModel ?? getStoredGeminiModel());

  if (!apiKey) {
    return {
      ok: false,
      message: 'Vui lòng nhập Gemini API Key trước khi kiểm tra kết nối.',
      modelUsed: userSelectedModel,
      keyType: 'EMPTY'
    };
  }

  let availableModels: GeminiModelOption[] = [];

  try {
    availableModels = await fetchAvailableGeminiModels(apiKey);
  } catch (listErr) {
    if (listErr instanceof GeminiServiceError) {
      return {
        ok: false,
        message: listErr.message,
        modelUsed: userSelectedModel,
        keyType,
        endpointMasked: listErr.endpointMasked
      };
    }
  }

  const orderedCandidates = getOrderedPriorityModelIds(
    availableModels,
    userSelectedModel
  );
  const modelsToTry = orderedCandidates.slice(0, 6);

  const testPayload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'Hãy trả về JSON {"status":"ok","greeting":"Kết nối Trợ lý AI Văn Thư Số 4.0 (v4.9) thành công!"}'
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 256
    }
  };

  let lastErrorMsg = '';
  let lastEndpoint = '';
  let lastModelTried = userSelectedModel;

  for (let i = 0; i < modelsToTry.length; i++) {
    const candidateModel = modelsToTry[i];
    lastModelTried = candidateModel;

    try {
      const { status, data, maskedEndpoint } = await executeSingleGenerateRequest({
        apiKey,
        cleanModel: candidateModel,
        payload: testPayload
      });

      lastEndpoint = maskedEndpoint;

      if (status >= 200 && status < 300) {
        const text = extractGeminiResponseText(data);

        let greeting = 'Kết nối Trợ lý AI Văn Thư Số 4.0 (v4.9) thành công!';
        try {
          const parsed = extractAndParseDefensiveJson(text);
          if (typeof parsed?.greeting === 'string' && parsed.greeting.trim()) {
            greeting = parsed.greeting.trim();
          }
        } catch {
          // ignore
        }

        const switched = candidateModel !== userSelectedModel;
        const switchNote = switched
          ? ` (Đã tự động chọn model ưu tiên khả dụng "${candidateModel}" thay cho "${userSelectedModel}" và lưu làm mặc định).`
          : ` (Đã tải ${availableModels.length} model khả dụng; đang dùng "${candidateModel}").`;

        setStoredGeminiModel(candidateModel);

        return {
          ok: true,
          message: `${greeting}${switchNote}`,
          modelUsed: candidateModel,
          keyType,
          endpointMasked: maskedEndpoint,
          availableModels: availableModels.length > 0 ? availableModels : undefined,
          autoSwitchedFrom: switched ? userSelectedModel : undefined
        };
      }

      const errObj = data?.error as { message?: string } | undefined;
      const rawGoogleMessage =
        errObj?.message ||
        (typeof data?.rawText === 'string' ? data.rawText : JSON.stringify(data));

      lastErrorMsg = `HTTP ${status} tại [${maskedEndpoint}] — Google trả về: ${rawGoogleMessage}`;

      if (
        shouldSkipImmediatelyToNextModel(status, rawGoogleMessage) ||
        isTransientOverloadOrRateLimit(status, rawGoogleMessage)
      ) {
        continue;
      } else {
        break;
      }
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        lastErrorMsg = err.message;
        lastEndpoint = err.endpointMasked || '';
      } else {
        lastErrorMsg =
          err instanceof Error ? err.message : 'Lỗi kết nối mạng khi kiểm tra API Key.';
      }
      break;
    }
  }

  return {
    ok: false,
    message:
      lastErrorMsg ||
      'Kết nối thất bại. Vui lòng kiểm tra lại Gemini API Key của bạn.',
    modelUsed: lastModelTried,
    keyType,
    endpointMasked: lastEndpoint,
    availableModels: availableModels.length > 0 ? availableModels : undefined
  };
}

// ============================================================================
// BỘ GIẢI MÃ & CHUẨN HÓA JSON PHÒNG THỦ (DEFENSIVE JSON PARSER)
// ============================================================================

/**
 * Tự động bóc tách khối JSON sạch từ phản hồi AI:
 * - Xóa dấu ```json / ```
 * - Nếu AI trả về mảng [ { ... } ] thì tự lấy phần tử [0]
 * - Cắt từ dấu { đầu tiên đến dấu } cuối cùng
 * - Xử lý lỗi dấu phẩy thừa ở cuối (trailing commas) hoặc ký tự điều khiển
 */
export function extractAndParseDefensiveJson(rawText: string): Record<string, unknown> {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new GeminiServiceError(
      'AI trả về phản hồi rỗng. Vui lòng bấm "Thử lại" để phân tích lại tài liệu.',
      'API_ERROR'
    );
  }

  let cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const normalizeParsedResult = (val: unknown): Record<string, unknown> | null => {
    if (Array.isArray(val)) {
      const firstObj = val.find(
        (item) => item && typeof item === 'object' && !Array.isArray(item)
      );
      if (firstObj) return firstObj as Record<string, unknown>;
      return null;
    }
    if (val && typeof val === 'object') {
      return val as Record<string, unknown>;
    }
    return null;
  };

  // Thử parse trực tiếp lần 1
  try {
    const direct = JSON.parse(cleaned);
    const norm = normalizeParsedResult(direct);
    if (norm) return norm;
  } catch {
    // tiếp tục bóc tách
  }

  // Nếu chuỗi bắt đầu bằng mảng [ ... ] trước dấu {
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (
    firstBracket !== -1 &&
    lastBracket > firstBracket &&
    (firstBrace === -1 || firstBracket < firstBrace)
  ) {
    try {
      const arrCandidate = cleaned.slice(firstBracket, lastBracket + 1);
      const parsedArr = JSON.parse(arrCandidate);
      const norm = normalizeParsedResult(parsedArr);
      if (norm) return norm;
    } catch {
      // tiếp tục cắt theo { ... }
    }
  }

  // Cắt từ dấu { đầu tiên đến dấu } cuối cùng
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliceObj = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsedSlice = JSON.parse(sliceObj);
      const norm = normalizeParsedResult(parsedSlice);
      if (norm) return norm;
    } catch {
      // Thử sửa lỗi trailing commas phổ biến trong JSON của LLM
      try {
        const sanitized = sliceObj.replace(/,\s*([}\]])/g, '$1');
        const parsedSanitized = JSON.parse(sanitized);
        const norm = normalizeParsedResult(parsedSanitized);
        if (norm) return norm;
      } catch {
        // ignore
      }
    }
  }

  throw new GeminiServiceError(
    'Phản hồi từ AI bị ngắt quãng hoặc không đúng cấu trúc JSON chuẩn. Vui lòng bấm nút "Thử lại".',
    'API_ERROR'
  );
}

/**
 * Ép kiểu an toàn về string (không bao giờ trả về undefined / null / "[object Object]")
 */
function toSafeString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    for (const k of ['text', 'content', 'noiDung', 'title', 'name', 'value', 'nhiemVu']) {
      if (typeof obj[k] === 'string' && obj[k]) return (obj[k] as string).trim();
    }
  }
  return fallback;
}

/**
 * Ép kiểu an toàn về string[] từ mảng string, mảng object hoặc chuỗi nhiều dòng
 */
function toSafeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          // Nếu là object mốc thời gian { thoiHan, noiDungHan } hoặc nhiệm vụ { nhiemVu, boPhanChuTri... }
          if (obj.thoiHan || obj.noiDungHan || obj.deadline || obj.date) {
            const timePart = toSafeString(obj.thoiHan ?? obj.deadline ?? obj.date);
            const descPart = toSafeString(
              obj.noiDungHan ?? obj.noiDung ?? obj.content ?? obj.task ?? obj.description
            );
            if (timePart && descPart) return `${timePart}: ${descPart}`;
            return timePart || descPart;
          }
          if (obj.nhiemVu || obj.boPhanChuTri || obj.task) {
            const taskName = toSafeString(obj.nhiemVu ?? obj.task ?? obj.content ?? obj.title);
            const host = toSafeString(obj.boPhanChuTri ?? obj.assignee ?? obj.owner);
            const coord = toSafeString(obj.boPhanPhoiHop ?? obj.coordinators);
            const due = toSafeString(obj.thoiHanHoanThanh ?? obj.thoiHan ?? obj.deadline);
            const parts = [taskName];
            if (host) parts.push(`Chủ trì: ${host}`);
            if (coord) parts.push(`Phối hợp: ${coord}`);
            if (due) parts.push(`Tiến độ: ${due}`);
            return parts.filter(Boolean).join(' — ');
          }
          return toSafeString(obj);
        }
        return '';
      })
      .map((s) => s.replace(/^[-•*+]\s*/, '').trim())
      .filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return val
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-•*+]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function buildSystemInstruction(doc: DocumentData): string {
  const isState = doc.mode === 'NHA_NUOC';
  const docTypeInfo = DOC_TYPES.find((d) => d.code === doc.docType);
  const docTypeName = docTypeInfo ? `${docTypeInfo.name} (${docTypeInfo.code})` : doc.docType;
  const standardName = isState
    ? 'Khối Nhà nước theo Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ về công tác văn thư'
    : 'Khối Đảng theo Hướng dẫn số 05-HD/VPTW của Văn phòng Trung ương Đảng';

  return `Bạn là Chuyên gia Văn thư - Lưu trữ và Soạn thảo văn bản hành chính cao cấp tại Việt Nam.
Nhiệm vụ của bạn là soạn thảo hoặc biên tập lại văn bản hành chính chuẩn xác 100% về thể thức, kỹ thuật trình bày và văn phong công vụ.

THÔNG TIN NGỮ CẢNH ĐƠN VỊ & VĂN BẢN HIỆN TẠI:
- Chế độ thể thức đang bật: ${standardName}.
- Loại văn bản đang chọn: ${docTypeName}.
- Cơ quan cấp trên trực tiếp: ${doc.coQuanChuQuan || (isState ? 'ỦY BAN NHÂN DÂN TỈNH VIỆT THANH' : 'ĐẢNG BỘ TỈNH VIỆT THANH')}.
- Cơ quan/Tổ chức ban hành văn bản: ${doc.coQuanBanHanh || (isState ? 'ỦY BAN NHÂN DÂN XÃ NAM GIANG' : 'ĐẢNG ỦY XÃ NAM GIANG')}.
- Địa danh ban hành: ${doc.diaDanh || 'Nam Giang'}.
- Ngày ban hành dự kiến: ${doc.ngayBanHanh || '2026'}.
- Lãnh đạo ký văn bản: Quyền hạn "${doc.quyenHanKy || ''}", Chức vụ "${doc.chucVuKy || ''}", Họ và tên "${doc.hoTenKy || ''}".

QUY TẮC ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC TRẢ VỀ JSON HỢP LỆ):
1. Trả về duy nhất 01 đối tượng JSON gồm các trường:
   - "docType": (string) Mã loại văn bản ("${doc.docType}").
   - "trichYeu": (string) Trích yếu nội dung văn bản ngắn gọn, súc tích, chuẩn văn phong hành chính. Nếu loại văn bản là Công văn (CV) thì bắt đầu bằng "V/v ...". Nếu là các văn bản khác (Tờ trình, Kế hoạch, Quyết định, Thông báo, Hợp đồng...) thì bắt đầu bằng "Về việc ..." hoặc cụm danh từ khái quát nội dung.
   - "kinhGui": (string) Tên cơ quan/tổ chức/cá nhân nhận văn bản (chỉ điền đối với Công văn, Tờ trình, hoặc Báo cáo gửi cấp trên; KHÔNG viết chữ "Kính gửi:" ở đầu vì hệ thống đã có sẵn nhãn này; để chuỗi rỗng "" nếu là Quyết định, Kế hoạch, Nghị quyết, Thông báo, Hợp đồng, Biên bản không dùng dòng Kính gửi).
   - "canCu": (string[]) Mảng các dòng căn cứ pháp lý và căn cứ thực tiễn (mỗi phần tử là 1 dòng bắt đầu bằng "Căn cứ ..." hoặc "Thực hiện ..." hoặc "Theo đề nghị của ..."; không cần dấu chấm phẩy ở cuối vì hệ thống tự động chuẩn hóa dấu ";" và "."). Để mảng rỗng [] nếu là Công văn (CV) hoặc loại văn bản không dùng phần căn cứ độc lập.
   - "noiDung": (string) Toàn bộ phần thân nội dung văn bản hoàn chỉnh, chi tiết, mạch lạc, xưng hô đúng tên cơ quan ban hành (${doc.coQuanBanHanh}).

2. QUY TẮC TRÌNH BÀY TRƯỜNG "noiDung" ĐỂ TƯƠNG THÍCH 100% VỚI BỘ HIỂN THỊ A4 & XUẤT WORD (.DOCX):
   - TUYỆT ĐỐI KHÔNG đưa Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số/ký hiệu, Tên loại văn bản, Trích yếu, Kính gửi, Căn cứ ban hành hay phần Chữ ký/Nơi nhận vào trong "noiDung" (vì các phần đó đã được dựng tự động từ các trường riêng biệt trên trang A4).
   - TUYỆT ĐỐI KHÔNG dùng ký hiệu Markdown như **, ##, *, hay bảng Markdown trong "noiDung".
   - Chia đề mục chuẩn hành chính Việt Nam, mỗi đoạn hoặc mỗi ý nằm trên một dòng riêng (ngăn cách bằng ký tự xuống dòng \\n):
     + Nếu là Quyết định (QĐ): Dòng đầu tiên là "QUYẾT ĐỊNH:", các dòng tiếp theo trình bày theo từng điều: "Điều 1. ...", "Điều 2. ...", "Điều 3. ...".
     + Nếu là Hợp đồng (HĐ): Trình bày phần thông tin các bên ("I. THÔNG TIN CÁC BÊN THAM GIA HỢP ĐỒNG", "1. BÊN A...", "2. BÊN B...") và các điều khoản ("Điều 1. ...", "Điều 2. ...", "Điều 3. ...").
     + Nếu là Kế hoạch (KH), Báo cáo (BC), Tờ trình (TTr), Nghị quyết (NQ), Quy chế (QC), Hướng dẫn (HD), Chương trình (CTr): Chia theo mục La Mã viết hoa ("I. MỤC ĐÍCH, YÊU CẦU", "II. NỘI DUNG THỰC HIỆN", "III. TỔ CHỨC THỰC HIỆN"...), tiểu mục số Ả Rập ("1. ...", "2. ..."), ý chữ cái ("a) ...", "b) ...") và gạch đầu dòng ("- ...").
     + Nếu là Công văn (CV) hoặc Thông báo (TB): Mở đầu nêu bối cảnh/lý do, sau đó chia các mục "1. ...", "2. ..." hoặc các đoạn văn rõ ràng, câu kết nêu yêu cầu tổ chức thực hiện.
   - Dòng cuối cùng của "noiDung" BẮT BUỘC kết thúc bằng dấu chấm gạch chéo chấm ("./.").`;
}

export function parseGeminiJsonResponse(rawText: string, defaultDocType?: string): GeminiDocResponse {
  const parsed = extractAndParseDefensiveJson(rawText);

  const trichYeu = toSafeString(
    parsed.trichYeu ?? parsed.trich_yeu ?? parsed.subject ?? parsed.title ?? parsed.summary
  );
  const rawKinhGui = toSafeString(
    parsed.kinhGui ?? parsed.kinh_gui ?? parsed.recipient ?? parsed.to
  );
  const kinhGui = rawKinhGui.replace(/^Kính gửi:\s*/i, '').trim();

  const canCu = toSafeStringArray(
    parsed.canCu ?? parsed.can_cu ?? parsed.legalBasis ?? parsed.bases ?? parsed.grounds
  );

  const noiDung = toSafeString(
    parsed.noiDung ?? parsed.noi_dung ?? parsed.content ?? parsed.body ?? parsed.text
  );

  const docType = toSafeString(
    parsed.docType ?? parsed.suggestedDocType ?? parsed.loaiVanBan,
    defaultDocType || ''
  );

  if (!noiDung && !trichYeu) {
    throw new GeminiServiceError(
      'AI trả về dữ liệu trống hoặc chưa đầy đủ nội dung văn bản. Vui lòng thử lại.',
      'API_ERROR'
    );
  }

  return {
    docType: docType || defaultDocType,
    trichYeu,
    kinhGui,
    canCu,
    noiDung,
    suggestedDocType: docType || defaultDocType
  };
}

/**
 * Chế độ A (Tab 1): AI Hỗ trợ soạn thảo văn bản hoàn chỉnh từ các ý chính / gạch đầu dòng
 */
export async function generateDocumentFromIdeas(params: {
  doc: DocumentData;
  ideasPrompt: string;
  onStatusChange?: GeminiStatusCallback;
}): Promise<GeminiDocResponse> {
  const { doc, ideasPrompt, onStatusChange } = params;
  if (!ideasPrompt.trim()) {
    throw new GeminiServiceError(
      'Vui lòng nhập các ý chính hoặc yêu cầu soạn thảo trước khi nhấn nút AI Soạn thảo.',
      'API_ERROR'
    );
  }

  const systemPrompt = buildSystemInstruction(doc);
  const userRequest = `${systemPrompt}

YÊU CẦU SOẠN THẢO TỪ NGƯỜI DÙNG (CÁC Ý CHÍNH / GẠCH ĐẦU DÒNG):
"""
${ideasPrompt.trim()}
"""

Hãy soạn thảo văn bản hoàn chỉnh, đầy đủ các phần theo đúng quy chuẩn thể thức và trả về đối tượng JSON gồm: "docType", "trichYeu", "kinhGui", "canCu", "noiDung".`;

  const rawText = await callGeminiGenerateContent([{ text: userRequest }], {
    responseMimeType: 'application/json',
    temperature: 0.3,
    maxOutputTokens: 8192,
    onStatusChange
  });

  return parseGeminiJsonResponse(rawText, doc.docType);
}

/**
 * Chế độ B (Tab 1): Tải văn bản mẫu (.docx, .pdf, .txt) lên & Chỉnh sửa / Chuyển hóa bằng AI
 */
export async function transformSampleDocumentWithAI(params: {
  doc: DocumentData;
  editInstruction: string;
  sampleFile: {
    fileName: string;
    fileType: 'docx' | 'txt' | 'pdf';
    extractedText?: string;
    pdfBase64?: string;
  };
  onStatusChange?: GeminiStatusCallback;
}): Promise<GeminiDocResponse> {
  const { doc, editInstruction, sampleFile, onStatusChange } = params;
  const systemPrompt = buildSystemInstruction(doc);

  const effectiveInstruction =
    editInstruction.trim() ||
    `Chuyển hóa toàn bộ văn bản mẫu này về đúng đơn vị "${doc.coQuanBanHanh}" (cơ quan cấp trên: "${doc.coQuanChuQuan}", địa danh: "${doc.diaDanh}"), cập nhật thời gian sang năm hiện hành và chuẩn hóa văn phong hành chính.`;

  const parts: Array<Record<string, unknown>> = [];

  if (sampleFile.fileType === 'pdf' && sampleFile.pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: sampleFile.pdfBase64
      }
    });
    parts.push({
      text: `${systemPrompt}

TÀI LIỆU MẪU ĐÍNH KÈM: File PDF "${sampleFile.fileName}" (đã đính kèm trong inlineData ở trên).

YÊU CẦU CHỈNH SỬA & CHUYỂN HÓA VĂN BẢN MẪU TỪ NGƯỜI DÙNG:
"""
${effectiveInstruction}
"""

Hãy đọc kỹ toàn bộ nội dung văn bản mẫu trong file PDF, giữ lại cấu trúc nghiệp vụ cốt lõi nhưng biên tập, cập nhật và thay đổi thông tin đơn vị, địa danh, thời gian, số liệu và nội dung theo đúng Yêu cầu chỉnh sửa ở trên.
Trả về duy nhất đối tượng JSON hợp lệ gồm các trường: "docType", "trichYeu", "kinhGui", "canCu", "noiDung".`
    });
  } else {
    const sampleContent = (sampleFile.extractedText || '').trim();
    if (!sampleContent) {
      throw new GeminiServiceError(
        'Không đọc được nội dung chữ từ file mẫu đã tải lên (file có thể bị trống hoặc chỉ chứa ảnh scan).',
        'API_ERROR'
      );
    }

    parts.push({
      text: `${systemPrompt}

NỘI DUNG VĂN BẢN MẪU ĐÃ TẢI LÊN (Tên file: "${sampleFile.fileName}"):
"""
${sampleContent.slice(0, 60000)}
"""

YÊU CẦU CHỈNH SỬA & CHUYỂN HÓA VĂN BẢN MẪU TỪ NGƯỜI DÙNG:
"""
${effectiveInstruction}
"""

Hãy đọc kỹ văn bản mẫu ở trên, giữ lại bố cục nghiệp vụ tốt nhất và thực hiện đầy đủ các yêu cầu chỉnh sửa/chuyển hóa cho phù hợp với đơn vị "${doc.coQuanBanHanh}".
Trả về duy nhất đối tượng JSON hợp lệ gồm các trường: "docType", "trichYeu", "kinhGui", "canCu", "noiDung".`
    });
  }

  const rawText = await callGeminiGenerateContent(parts, {
    responseMimeType: 'application/json',
    temperature: 0.3,
    maxOutputTokens: 8192,
    onStatusChange
  });

  return parseGeminiJsonResponse(rawText, doc.docType);
}

// ============================================================================
// PHÂN HỆ 2: XỬ LÝ VĂN BẢN ĐẾN (INCOMING DOCUMENT PROCESSING & TRANSFORMATION)
// ============================================================================

export type IncomingFileKind = 'docx' | 'txt' | 'pdf' | 'image';

export interface ParsedIncomingFile {
  fileName: string;
  fileSize: number;
  fileKind: IncomingFileKind;
  mimeType: string;
  extractedText?: string;
  base64Data?: string;
}

export interface IncomingDeadlineItem {
  noiDungHan: string;
  thoiHan: string;
  mucDoKhan: 'KHAN_CAP' | 'QUAN_TRONG' | 'THUONG';
}

export interface IncomingTaskAssignmentItem {
  nhiemVu: string;
  boPhanChuTri: string;
  boPhanPhoiHop: string;
  thoiHanHoanThanh: string;
}

/**
 * Cấu trúc dữ liệu phân tích văn bản đến đã được chuẩn hóa cố định 100% (Defensive Schema)
 * - Không bao giờ có trường undefined hoặc sai kiểu dữ liệu
 * - Có chiTietTrienKhai để phục vụ Khối 2 cực nhanh không cần gửi lại file PDF nặng
 */
export interface IncomingDocAnalysisResult {
  thongTinVanBan: {
    soKyHieu: string;
    ngayBanHanh: string;
    coQuanBanHanh: string;
    trichYeu: string;
    loaiVanBan: string;
  };
  noiDungCotLoi: string[];
  mocThoiGian: string[];
  nhiemVuCapXa: string[];
  butPheLanhDao: string;
  chiTietTrienKhai: string;
  // Các trường chi tiết có cấu trúc để hiển thị bảng/thẻ đẹp trên UI (luôn là mảng hợp lệ)
  thongTinVanBanDen: {
    soKyHieu: string;
    ngayBanHanh: string;
    coQuanBanHanh: string;
    loaiVanBan: string;
    trichYeu: string;
  };
  mocThoiGianVaHanBaoCao: IncomingDeadlineItem[];
  nhiemVuCapXaVaPhanCong: IncomingTaskAssignmentItem[];
  goiYButPheLanhDao: string;
}

export type InfographicAspectRatio = '1:1' | '4:3' | '16:9' | '9:16';
export type InfographicLayoutStyle = 'BENTO' | 'GRID' | 'LIST' | 'TIMELINE';

export type InfographicIconType =
  | 'target'
  | 'flag'
  | 'compass'
  | 'lightbulb'
  | 'star'
  | 'award'
  | 'users'
  | 'cpu'
  | 'settings'
  | 'shield'
  | 'chart'
  | 'book'
  | 'globe'
  | 'briefcase'
  | 'megaphone'
  | 'layers'
  | 'building'
  | 'landmark'
  | 'leaf'
  | 'heart'
  | 'graduation'
  | 'flask'
  | 'file'
  | 'check'
  | 'factory';

export interface InfographicBlockItem {
  icon: string;
  tieuDeNgan: string;
  noiDungNgan: string;
  soLieuHoacMoc?: string;
}

export interface InfographicKhoiTongQuan {
  tieuDe: string;
  nhanManh: string;
  iconType: InfographicIconType;
  cacYChinh: string[];
}

export interface InfographicKhoiTrongTamThe {
  soThuTu: string;
  tieuDe: string;
  noiDung: string;
  iconType: InfographicIconType;
}

export interface InfographicKhoiTrongTam {
  tieuDe: string;
  cacThe: InfographicKhoiTrongTamThe[];
}

export interface InfographicKhoiTrienKhaiNhom {
  ten: string;
  chiTiet: string;
  iconType: InfographicIconType;
}

export interface InfographicKhoiTrienKhai {
  tieuDe: string;
  cacNhom: InfographicKhoiTrienKhaiNhom[];
}

export interface InfographicKhoiMocThoiGianItem {
  nhan: string;
  moTa: string;
}

export interface InfographicKhoiMocThoiGian {
  tieuDe: string;
  cacMoc: InfographicKhoiMocThoiGianItem[];
}

// Legacy aliases
export interface InfographicKhoi1 {
  tieuDeKhoi: string;
  tomTatNoiBat: string;
  cacDiem: string[];
}

export interface InfographicKhoi2Item {
  soThuTu: string;
  tieuDe: string;
  noiDung: string;
  iconType: InfographicIconType;
}

export interface InfographicKhoi2 {
  tieuDeKhoi: string;
  cacMuc: InfographicKhoi2Item[];
}

export interface InfographicKhoi3Item {
  tenNhom: string;
  noiDung: string;
  iconType: InfographicIconType;
}

export interface InfographicKhoi3 {
  tieuDeKhoi: string;
  cacMuc: InfographicKhoi3Item[];
}

export interface InfographicKhoi4Moc {
  nhan: string;
  noiDung: string;
}

export interface InfographicKhoi4 {
  tieuDeKhoi: string;
  cacMoc: InfographicKhoi4Moc[];
}

export interface InfographicDataResult {
  // Cấu trúc Bento 4 tầng chuẩn báo chí / hành chính tổng quát (Universal Schema v4.9)
  coQuanBanHanh: string;
  nhanVanBan: string;
  tieuDeChinh: string;
  dongNgayDiaDanh: string;
  khoiTongQuan: InfographicKhoiTongQuan;
  khoiTrongTam: InfographicKhoiTrongTam;
  khoiTrienKhai: InfographicKhoiTrienKhai;
  khoiMocThoiGian: InfographicKhoiMocThoiGian;
  dongChanTrang: string;
  isLocalFallback?: boolean;
  // Các trường tương thích ngược cho phiên đã lưu trước đó
  phuDe?: string;
  ngayDiaDanh?: string;
  khoi1?: InfographicKhoi1;
  khoi2?: InfographicKhoi2;
  khoi3?: InfographicKhoi3;
  khoi4?: InfographicKhoi4;
  tieuDePhu?: string;
  thongDiepTrongTam?: string;
  soLieuNoiBat?: Array<{
    conSo: string;
    nhanMoTa: string;
  }>;
  cacKhoiNoiDung?: InfographicBlockItem[];
  khauHieuHanhDong?: string;
  nguonVanBan?: string;
}

export interface MediaPostResult {
  tieuDeBaiDang: string;
  noiDungBaiDang: string;
  hashtags: string[];
}

/**
 * Đọc thống nhất file văn bản đến (.docx, .pdf cả bản scan, ảnh .jpg/.jpeg/.png, .txt)
 */
export async function readIncomingFileInput(file: File): Promise<ParsedIncomingFile> {
  const maxBytes = 15 * 1024 * 1024; // 15MB
  if (file.size > maxBytes) {
    throw new Error(
      `File "${file.name}" có dung lượng ${(file.size / (1024 * 1024)).toFixed(
        1
      )}MB, vượt quá giới hạn tối đa 15MB. Vui lòng chọn file nhỏ hơn.`
    );
  }

  const lowerName = file.name.toLowerCase();
  const isDocx =
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
  const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain';
  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    file.type === 'image/jpeg' ||
    file.type === 'image/png';

  if (!isDocx && !isPdf && !isTxt && !isImage) {
    if (lowerName.endsWith('.doc')) {
      throw new Error(
        'File .doc (Word 97-2003 cũ) không hỗ trợ đọc trực tiếp trên trình duyệt. Vui lòng lưu sang .docx hoặc .pdf trước khi tải lên.'
      );
    }
    throw new Error(
      'Định dạng file không hỗ trợ. Vui lòng tải file .docx, .pdf (kể cả bản scan), ảnh chụp .jpg/.jpeg/.png hoặc .txt.'
    );
  }

  if (isDocx) {
    const arrayBuffer = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer });
    const extracted = (res.value || '').trim();
    if (!extracted) {
      throw new Error(
        'File Word (.docx) không có nội dung chữ hoặc chỉ chứa ảnh đính kèm. Vui lòng lưu sang PDF hoặc tải ảnh chụp văn bản lên.'
      );
    }
    return {
      fileName: file.name,
      fileSize: file.size,
      fileKind: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: extracted
    };
  }

  if (isTxt) {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc file .txt'));
      reader.readAsText(file, 'utf-8');
    });
    if (!text.trim()) {
      throw new Error('File .txt không có nội dung.');
    }
    return {
      fileName: file.name,
      fileSize: file.size,
      fileKind: 'txt',
      mimeType: 'text/plain',
      extractedText: text.trim()
    };
  }

  // Với .pdf hoặc ảnh chụp (.jpg, .jpeg, .png): chuyển sang Base64 để gửi inlineData cho Gemini ở Khối 1
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error(`Không thể đọc file "${file.name}"`));
    reader.readAsDataURL(file);
  });

  let mimeType = file.type;
  if (!mimeType) {
    if (isPdf) mimeType = 'application/pdf';
    else if (lowerName.endsWith('.png')) mimeType = 'image/png';
    else mimeType = 'image/jpeg';
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    fileKind: isPdf ? 'pdf' : 'image',
    mimeType,
    base64Data
  };
}

function buildIncomingFileParts(
  parsedFile: ParsedIncomingFile,
  instructionPrompt: string
): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  if ((parsedFile.fileKind === 'pdf' || parsedFile.fileKind === 'image') && parsedFile.base64Data) {
    parts.push({
      inlineData: {
        mimeType: parsedFile.mimeType,
        data: parsedFile.base64Data
      }
    });
    parts.push({
      text: `TÀI LIỆU VĂN BẢN ĐẾN ĐÍNH KÈM: "${parsedFile.fileName}" (${
        parsedFile.fileKind === 'pdf' ? 'File PDF / Bản scan có dấu đỏ' : 'Ảnh chụp văn bản'
      }).\n\n${instructionPrompt}`
    });
  } else {
    const rawContent = (parsedFile.extractedText || '').trim();
    parts.push({
      text: `NỘI DUNG VĂN BẢN ĐẾN (Trích xuất từ file "${parsedFile.fileName}"):
"""
${rawContent.slice(0, 65000)}
"""

${instructionPrompt}`
    });
  }
  return parts;
}

/**
 * Chuẩn hóa toàn bộ trường dữ liệu đầu ra của analyzeIncomingDocument về đúng 1 cấu trúc cố định
 * không bao giờ bị undefined hoặc sai kiểu dữ liệu (hỗ trợ map linh hoạt cả trường tiếng Việt/tiếng Anh).
 */
export function normalizeIncomingAnalysisResult(
  parsed: Record<string, unknown>,
  unitConfig: UnitConfig,
  isState: boolean
): IncomingDocAnalysisResult {
  const rawInfo = ((parsed.thongTinVanBan ??
    parsed.thongTinVanBanDen ??
    parsed.documentInfo ??
    parsed.metadata ??
    parsed.info ??
    {}) || {}) as Record<string, unknown>;

  const soKyHieu = toSafeString(
    rawInfo.soKyHieu ??
      rawInfo.so_ky_hieu ??
      rawInfo.symbol ??
      rawInfo.docNumber ??
      parsed.soKyHieu,
    'Chưa rõ số/ký hiệu'
  );
  const ngayBanHanh = toSafeString(
    rawInfo.ngayBanHanh ??
      rawInfo.ngay_ban_hanh ??
      rawInfo.issueDate ??
      rawInfo.date ??
      parsed.ngayBanHanh,
    'Chưa rõ ngày ban hành'
  );
  const coQuanBanHanh = toSafeString(
    rawInfo.coQuanBanHanh ??
      rawInfo.co_quan_ban_hanh ??
      rawInfo.issuer ??
      rawInfo.agency ??
      parsed.coQuanBanHanh,
    unitConfig.coQuanChuQuan || 'Cơ quan cấp trên'
  );
  const loaiVanBan = toSafeString(
    rawInfo.loaiVanBan ?? rawInfo.loai_van_ban ?? rawInfo.docType ?? parsed.loaiVanBan,
    'Văn bản chỉ đạo'
  );
  const trichYeu = toSafeString(
    rawInfo.trichYeu ??
      rawInfo.trich_yeu ??
      rawInfo.subject ??
      rawInfo.summary ??
      rawInfo.title ??
      parsed.trichYeu,
    'Văn bản chỉ đạo, điều hành của cơ quan cấp trên'
  );

  // 2. noiDungCotLoi: string[]
  let noiDungCotLoi = toSafeStringArray(
    parsed.noiDungCotLoi ??
      parsed.noi_dung_cot_loi ??
      parsed.coreContents ??
      parsed.keyPoints ??
      parsed.mainPoints ??
      parsed.summaryPoints
  );
  if (noiDungCotLoi.length === 0) {
    noiDungCotLoi = [
      `Quán triệt và tổ chức triển khai thực hiện ${loaiVanBan} ${soKyHieu} (${ngayBanHanh}) của ${coQuanBanHanh} về ${trichYeu}.`
    ];
  }

  // 3. mocThoiGian: string[] & mocThoiGianVaHanBaoCao: IncomingDeadlineItem[]
  const rawDeadlinesSource =
    parsed.mocThoiGian ??
    parsed.mocThoiGianVaHanBaoCao ??
    parsed.moc_thoi_gian ??
    parsed.deadlines ??
    parsed.timelines;

  const mocThoiGian = toSafeStringArray(rawDeadlinesSource);

  const mocThoiGianVaHanBaoCao: IncomingDeadlineItem[] = [];
  if (Array.isArray(rawDeadlinesSource)) {
    for (const item of rawDeadlinesSource) {
      if (typeof item === 'string' && item.trim()) {
        const str = item.trim();
        const colonIdx = str.indexOf(':');
        if (colonIdx > 0 && colonIdx < 35) {
          mocThoiGianVaHanBaoCao.push({
            thoiHan: str.slice(0, colonIdx).trim(),
            noiDungHan: str.slice(colonIdx + 1).trim(),
            mucDoKhan: 'QUAN_TRONG'
          });
        } else {
          mocThoiGianVaHanBaoCao.push({
            thoiHan: 'Theo mốc quy định',
            noiDungHan: str,
            mucDoKhan: 'QUAN_TRONG'
          });
        }
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const rawKhan = toSafeString(obj.mucDoKhan ?? obj.urgency, 'QUAN_TRONG').toUpperCase();
        const mucDoKhan: 'KHAN_CAP' | 'QUAN_TRONG' | 'THUONG' =
          rawKhan === 'KHAN_CAP'
            ? 'KHAN_CAP'
            : rawKhan === 'THUONG'
            ? 'THUONG'
            : 'QUAN_TRONG';
        mocThoiGianVaHanBaoCao.push({
          noiDungHan: toSafeString(
            obj.noiDungHan ?? obj.noiDung ?? obj.content ?? obj.task,
            'Thời hạn triển khai thực hiện'
          ),
          thoiHan: toSafeString(
            obj.thoiHan ?? obj.deadline ?? obj.date,
            'Theo quy định trong văn bản'
          ),
          mucDoKhan
        });
      }
    }
  }

  const normalizedMocThoiGian: string[] =
    mocThoiGian.length > 0
      ? mocThoiGian
      : mocThoiGianVaHanBaoCao.length > 0
      ? mocThoiGianVaHanBaoCao.map((d) => `${d.thoiHan}: ${d.noiDungHan}`)
      : ['Triển khai thường xuyên / Ngay sau khi tiếp nhận văn bản'];

  if (mocThoiGianVaHanBaoCao.length === 0) {
    mocThoiGianVaHanBaoCao.push({
      thoiHan: 'Thường xuyên / Ngay sau khi nhận',
      noiDungHan: normalizedMocThoiGian[0],
      mucDoKhan: 'QUAN_TRONG'
    });
  }

  // 4. nhiemVuCapXa: string[] & nhiemVuCapXaVaPhanCong: IncomingTaskAssignmentItem[]
  const rawTasksSource =
    parsed.nhiemVuCapXa ??
    parsed.nhiemVuCapXaVaPhanCong ??
    parsed.nhiem_vu_cap_xa ??
    parsed.tasks ??
    parsed.communeTasks ??
    parsed.assignments;

  const nhiemVuCapXa = toSafeStringArray(rawTasksSource);
  const defaultHostDept = isState ? 'Văn phòng - Thống kê' : 'Văn phòng Đảng ủy';

  const nhiemVuCapXaVaPhanCong: IncomingTaskAssignmentItem[] = [];
  if (Array.isArray(rawTasksSource)) {
    for (const item of rawTasksSource) {
      if (typeof item === 'string' && item.trim()) {
        nhiemVuCapXaVaPhanCong.push({
          nhiemVu: item.trim(),
          boPhanChuTri: defaultHostDept,
          boPhanPhoiHop: 'Các bộ phận, đoàn thể, thôn/chi bộ liên quan',
          thoiHanHoanThanh: 'Theo tiến độ đề ra'
        });
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const nhiemVu = toSafeString(
          obj.nhiemVu ?? obj.task ?? obj.content ?? obj.title,
          'Tổ chức triển khai nhiệm vụ theo văn bản cấp trên'
        );
        nhiemVuCapXaVaPhanCong.push({
          nhiemVu,
          boPhanChuTri: toSafeString(obj.boPhanChuTri ?? obj.assignee ?? obj.host, defaultHostDept),
          boPhanPhoiHop: toSafeString(
            obj.boPhanPhoiHop ?? obj.coordinators ?? obj.support,
            'Các bộ phận, đơn vị liên quan'
          ),
          thoiHanHoanThanh: toSafeString(
            obj.thoiHanHoanThanh ?? obj.thoiHan ?? obj.deadline,
            'Theo tiến độ đề ra'
          )
        });
      }
    }
  }

  const normalizedNhiemVuCapXa: string[] =
    nhiemVuCapXa.length > 0
      ? nhiemVuCapXa
      : nhiemVuCapXaVaPhanCong.length > 0
      ? nhiemVuCapXaVaPhanCong.map(
          (t) =>
            `${t.nhiemVu} (Chủ trì: ${t.boPhanChuTri}; Phối hợp: ${t.boPhanPhoiHop}; Tiến độ: ${t.thoiHanHoanThanh})`
        )
      : [
          `Tham mưu văn bản chỉ đạo, phân công tổ chức thực hiện trên địa bàn ${unitConfig.diaDanh} (Chủ trì: ${defaultHostDept})`
        ];

  if (nhiemVuCapXaVaPhanCong.length === 0) {
    nhiemVuCapXaVaPhanCong.push({
      nhiemVu: normalizedNhiemVuCapXa[0],
      boPhanChuTri: defaultHostDept,
      boPhanPhoiHop: 'Các bộ phận chuyên môn, thôn/khu dân cư',
      thoiHanHoanThanh: 'Theo tiến độ quy định'
    });
  }

  // 5. butPheLanhDao: string
  const butPheLanhDao = toSafeString(
    parsed.butPheLanhDao ??
      parsed.goiYButPheLanhDao ??
      parsed.but_phe_lanh_dao ??
      parsed.leaderComment ??
      parsed.leaderDirective,
    `Giao ${defaultHostDept} chủ trì, phối hợp với các bộ phận liên quan tham mưu văn bản triển khai thực hiện trên địa bàn ${unitConfig.diaDanh} đảm bảo chất lượng, đúng tiến độ.`
  );

  // 6. chiTietTrienKhai: string
  const rawChiTiet = toSafeString(
    parsed.chiTietTrienKhai ??
      parsed.chi_tiet_trien_khai ??
      parsed.implementationDetails ??
      parsed.detailedSummary
  );

  const chiTietTrienKhai =
    rawChiTiet ||
    [
      `Văn bản gốc: ${loaiVanBan} ${soKyHieu} ngày ${ngayBanHanh} của ${coQuanBanHanh} về "${trichYeu}".`,
      `Nội dung cốt lõi: ${noiDungCotLoi.join('; ')}.`,
      `Mốc thời gian & hạn báo cáo: ${normalizedMocThoiGian.join('; ')}.`,
      `Nhiệm vụ cụ thể tại cấp xã: ${normalizedNhiemVuCapXa.join('; ')}.`,
      `Ý kiến chỉ đạo / Bút phê: ${butPheLanhDao}`
    ].join('\n');

  const thongTinVanBan = {
    soKyHieu,
    ngayBanHanh,
    coQuanBanHanh,
    trichYeu,
    loaiVanBan
  };

  return {
    thongTinVanBan,
    noiDungCotLoi,
    mocThoiGian: normalizedMocThoiGian,
    nhiemVuCapXa: normalizedNhiemVuCapXa,
    butPheLanhDao,
    chiTietTrienKhai,
    thongTinVanBanDen: thongTinVanBan,
    mocThoiGianVaHanBaoCao,
    nhiemVuCapXaVaPhanCong,
    goiYButPheLanhDao: butPheLanhDao
  };
}

/**
 * 1. Phân tích Văn bản đến & Lập Phiếu tóm tắt + Tham mưu xử lý (Khối 1)
 */
export async function analyzeIncomingDocument(params: {
  file: ParsedIncomingFile;
  mode: AppMode;
  unitConfig: UnitConfig;
  onStatusChange?: GeminiStatusCallback;
}): Promise<IncomingDocAnalysisResult> {
  const { file, mode, unitConfig, onStatusChange } = params;
  const isState = mode === 'NHA_NUOC';
  const leaderTitle = isState
    ? `Chủ tịch ${unitConfig.coQuanBanHanh || 'UBND xã Nam Giang'}`
    : `Bí thư ${unitConfig.coQuanBanHanh || 'Đảng ủy xã Nam Giang'}`;

  const prompt = `Bạn là Chuyên gia Văn thư - Hành chính và Tham mưu tổng hợp cấp xã/phường tại Việt Nam.
Đơn vị tiếp nhận văn bản đến hiện tại:
- Chế độ làm việc: ${isState ? 'Khối Nhà nước (UBND cấp xã - chuẩn Nghị định 30/2020/NĐ-CP)' : 'Khối Đảng (Đảng ủy cấp xã - chuẩn Hướng dẫn 05-HD/VPTW)'}
- Cơ quan tiếp nhận: ${unitConfig.coQuanBanHanh} (Trực thuộc: ${unitConfig.coQuanChuQuan})
- Địa danh: ${unitConfig.diaDanh}

Hãy đọc thật kỹ toàn bộ văn bản đến được cung cấp (kể cả chữ trong bản scan hoặc ảnh chụp) và trích xuất, phân tích thành PHIẾU TÓM TẮT & THAM MƯU XỬ LÝ VĂN BẢN ĐẾN theo đúng 5 phần chuẩn công vụ, đồng thời tổng hợp chi tiết các chỉ tiêu, nhiệm vụ, giải pháp cốt lõi vào trường "chiTietTrienKhai".

BẮT BUỘC TRẢ VỀ DUY NHẤT 01 ĐỐI TƯỢNG JSON HỢP LỆ THEO CẤU TRÚC SAU:
{
  "thongTinVanBan": {
    "soKyHieu": "Số và ký hiệu đầy đủ của văn bản đến (VD: Số 145/UBND-VX hoặc Số 07-NQ/ĐU; nếu văn bản không rõ ghi 'Chưa rõ số/ký hiệu')",
    "ngayBanHanh": "Ngày tháng năm ban hành văn bản đến (VD: ngày 15 tháng 11 năm 2026)",
    "coQuanBanHanh": "Tên cơ quan ban hành văn bản đến (VD: ỦY BAN NHÂN DÂN TỈNH VIỆT THANH)",
    "loaiVanBan": "Loại văn bản đến (VD: Nghị quyết, Công văn, Kế hoạch, Quyết định, Chỉ thị, Hướng dẫn...)",
    "trichYeu": "Trích yếu nội dung chính xác của văn bản đến"
  },
  "noiDungCotLoi": [
    "Ý trọng tâm 1: Tóm tắt nội dung cốt lõi, mục tiêu, chỉ đạo quan trọng nhất...",
    "Ý trọng tâm 2: Các chỉ tiêu, con số định lượng, yêu cầu hoặc phạm vi áp dụng...",
    "Ý trọng tâm 3: ... (từ 3 đến 6 ý trọng tâm, súc tích, đầy đủ thông tin)"
  ],
  "mocThoiGian": [
    "Trước ngày ...: Nội dung công việc hoặc báo cáo phải hoàn thành",
    "... (nếu văn bản không nêu hạn cụ thể thì ghi 'Triển khai thường xuyên / Ngay sau khi tiếp nhận văn bản')"
  ],
  "mocThoiGianVaHanBaoCao": [
    {
      "noiDungHan": "Mô tả công việc hoặc báo cáo phải nộp đúng hạn",
      "thoiHan": "Ngày/tháng/năm hoặc mốc thời gian cụ thể",
      "mucDoKhan": "KHAN_CAP hoặc QUAN_TRONG hoặc THUONG"
    }
  ],
  "nhiemVuCapXa": [
    "Nhiệm vụ 1 — Chủ trì: ... — Phối hợp: ... — Tiến độ: ...",
    "Nhiệm vụ 2 — Chủ trì: ... — Phối hợp: ... — Tiến độ: ..."
  ],
  "nhiemVuCapXaVaPhanCong": [
    {
      "nhiemVu": "Đầu việc cụ thể thuộc trách nhiệm của ${unitConfig.coQuanBanHanh}",
      "boPhanChuTri": "${
        isState
          ? 'Gợi ý bộ phận chuyên môn cấp xã chủ trì (VD: Văn phòng - Thống kê / Công chức Văn hóa - Xã hội / Địa chính - Nông nghiệp - Xây dựng / Tài chính - Kế toán / Công an - Quân sự xã...)'
          : 'Gợi ý bộ phận tham mưu Đảng ủy chủ trì (VD: Văn phòng Đảng ủy / Ban Xây dựng Đảng / Ủy ban Kiểm tra Đảng ủy / Khối Dân vận / Các Chi bộ trực thuộc...)'
      }",
      "boPhanPhoiHop": "Các bộ phận, đoàn thể hoặc các thôn, bản, chi bộ phối hợp",
      "thoiHanHoanThanh": "Mốc hoàn thành đề xuất"
    }
  ],
  "butPheLanhDao": "1–2 câu dự thảo ý kiến bút phê chỉ đạo ngắn gọn, chuẩn mực của ${leaderTitle} để giao việc",
  "chiTietTrienKhai": "Bản tổng hợp chi tiết đầy đủ các mục tiêu, chỉ tiêu, số liệu định lượng, các nhóm nhiệm vụ và giải pháp cốt lõi từ tài liệu gốc (khoảng 250–500 từ) để dùng làm dữ liệu nguồn soạn Kế hoạch/Công văn triển khai và Infographic mà không cần đọc lại file PDF gốc."
}`;

  const parts = buildIncomingFileParts(file, prompt);
  const rawText = await callGeminiGenerateContent(parts, {
    responseMimeType: 'application/json',
    temperature: 0.3,
    maxOutputTokens: 8192,
    onStatusChange
  });

  const parsed = extractAndParseDefensiveJson(rawText);
  return normalizeIncomingAnalysisResult(parsed, unitConfig, isState);
}

/**
 * Xây dựng khối ngữ cảnh JSON chi tiết đã trích xuất từ Khối 1 để gửi cho Khối 2
 * (Tuyệt đối KHÔNG gửi lại file PDF/ảnh gốc nặng hàng MB lên API)
 */
function buildExtractedJsonContextForBlock2(analysis: IncomingDocAnalysisResult): string {
  const info = analysis.thongTinVanBan || analysis.thongTinVanBanDen;
  const payload = {
    thongTinVanBan: {
      soKyHieu: info?.soKyHieu || 'Chưa rõ số/ký hiệu',
      ngayBanHanh: info?.ngayBanHanh || 'Chưa rõ ngày ban hành',
      coQuanBanHanh: info?.coQuanBanHanh || '',
      loaiVanBan: info?.loaiVanBan || 'Văn bản chỉ đạo',
      trichYeu: info?.trichYeu || ''
    },
    noiDungCotLoi: Array.isArray(analysis.noiDungCotLoi) ? analysis.noiDungCotLoi : [],
    mocThoiGian: Array.isArray(analysis.mocThoiGian) ? analysis.mocThoiGian : [],
    nhiemVuCapXa: Array.isArray(analysis.nhiemVuCapXa) ? analysis.nhiemVuCapXa : [],
    nhiemVuCapXaVaPhanCong: Array.isArray(analysis.nhiemVuCapXaVaPhanCong)
      ? analysis.nhiemVuCapXaVaPhanCong
      : [],
    butPheLanhDao: analysis.butPheLanhDao || analysis.goiYButPheLanhDao || '',
    chiTietTrienKhai: analysis.chiTietTrienKhai || ''
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Định dạng câu viện dẫn văn bản đến tự nhiên, đúng chuẩn văn phong hành chính / Đảng tiếng Việt:
 * - Không viết hoa toàn bộ tên cơ quan (ví dụ: "Bộ Chính trị" thay vì "BỘ CHÍNH TRỊ (BAN CHẤP HÀNH TRUNG ƯƠNG)")
 * - Chữ "số" viết thường (ví dụ: "số 57-NQ/TW")
 * - Không lặp từ khi trích yếu đã bắt đầu bằng loại văn bản hoặc "về / về việc" (ví dụ: "Thực hiện Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia")
 */
export function buildNaturalIncomingCitation(info: {
  loaiVanBan?: string;
  soKyHieu?: string;
  ngayBanHanh?: string;
  coQuanBanHanh?: string;
  trichYeu?: string;
}): string {
  const loai = (info.loaiVanBan || 'Văn bản').trim();

  // Chuẩn hóa số ký hiệu: chữ "số" viết thường
  let rawSo = (info.soKyHieu || '').trim();
  rawSo = rawSo.replace(/^(số|so)\s*:?\s*/i, '').trim();
  const soFormatted = rawSo && !/chưa rõ/i.test(rawSo) ? `số ${rawSo}` : '';

  // Chuẩn hóa ngày ban hành: chữ "ngày" viết thường
  let rawNgay = (info.ngayBanHanh || '').trim();
  if (rawNgay && !/chưa rõ/i.test(rawNgay)) {
    rawNgay = rawNgay.replace(/^Ngày\b/, 'ngày');
    if (!/^ngày\b/i.test(rawNgay)) {
      rawNgay = `ngày ${rawNgay}`;
    }
  } else {
    rawNgay = '';
  }

  // Chuẩn hóa tên cơ quan ban hành: bỏ cụm phụ trong ngoặc đơn và chuyển từ IN HOA toàn bộ sang viết hoa chuẩn danh từ riêng
  let rawCq = (info.coQuanBanHanh || '').trim();
  rawCq = rawCq.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

  const formatAgencyNaturalCase = (agency: string): string => {
    if (!agency) return 'cơ quan cấp trên';
    // Nếu không phải đang viết IN HOA toàn bộ thì giữ nguyên
    if (agency !== agency.toUpperCase()) return agency;

    const lower = agency.toLowerCase();
    const replacements: Array<[RegExp, string]> = [
      [/^bộ chính trị$/i, 'Bộ Chính trị'],
      [/^ban bí thư$/i, 'Ban Bí thư'],
      [/^ban chấp hành trung ương(?:\s+đảng)?$/i, 'Ban Chấp hành Trung ương'],
      [/^chính phủ$/i, 'Chính phủ'],
      [/^thủ tướng chính phủ$/i, 'Thủ tướng Chính phủ'],
      [/^quốc hội$/i, 'Quốc hội'],
      [/^văn phòng trung ương đảng$/i, 'Văn phòng Trung ương Đảng'],
      [/^ủy ban nhân dân\s+tỉnh\s+(.+)$/i, 'Ủy ban nhân dân tỉnh $1'],
      [/^ubnd\s+tỉnh\s+(.+)$/i, 'UBND tỉnh $1'],
      [/^ủy ban nhân dân\s+xã\s+(.+)$/i, 'Ủy ban nhân dân xã $1'],
      [/^ubnd\s+xã\s+(.+)$/i, 'UBND xã $1'],
      [/^tỉnh ủy\s+(.+)$/i, 'Tỉnh ủy $1'],
      [/^ban thường vụ tỉnh ủy\s+(.+)$/i, 'Ban Thường vụ Tỉnh ủy $1'],
      [/^đảng ủy\s+xã\s+(.+)$/i, 'Đảng ủy xã $1'],
      [/^ban thường vụ đảng ủy\s+xã\s+(.+)$/i, 'Ban Thường vụ Đảng ủy xã $1'],
      [/^hội đồng nhân dân\s+tỉnh\s+(.+)$/i, 'Hội đồng nhân dân tỉnh $1'],
      [/^hội đồng nhân dân\s+xã\s+(.+)$/i, 'Hội đồng nhân dân xã $1']
    ];

    const capitalizeProperName = (str: string) =>
      str
        .split(/\s+/)
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ');

    for (const [regex, template] of replacements) {
      const m = lower.match(regex);
      if (m) {
        if (m[1]) {
          return template.replace('$1', capitalizeProperName(m[1]));
        }
        return template;
      }
    }

    // Fallback: Viết hoa chữ cái đầu mỗi từ cho danh từ riêng hoặc giữ các từ viết tắt thông dụng
    const keepUpper = new Set(['UBND', 'HĐND', 'UBMTTQ', 'BCH', 'BTV', 'TW', 'TƯ', 'ĐU', 'TU']);
    return agency
      .split(/\s+/)
      .map((word, idx) => {
        const cleanW = word.replace(/[^A-Za-zÀ-ỹĐđ]/g, '');
        if (keepUpper.has(cleanW.toUpperCase())) return word.toUpperCase();
        const lw = word.toLowerCase();
        if (
          idx === 0 ||
          /^(bộ|ban|ủy|tỉnh|thành|xã|phường|thị|việt|thanh|nam|giang|đảng|chính|văn|phòng|sở|ngành|trung|ương)$/i.test(
            lw
          )
        ) {
          return lw.charAt(0).toUpperCase() + lw.slice(1);
        }
        return lw;
      })
      .join(' ');
  };

  const coQuanFormatted = formatAgencyNaturalCase(rawCq);

  // Chuẩn hóa trích yếu: không lặp lại tên loại văn bản hoặc tên cơ quan ở đầu trích yếu
  let cleanTrichYeu = (info.trichYeu || '').trim().replace(/[.;]+$/, '');
  // Bỏ dấu ngoặc kép bao quanh nếu có
  cleanTrichYeu = cleanTrichYeu.replace(/^["“”']+|["“”']+$/g, '').trim();

  // Loại bỏ tiền tố lặp lại như "Nghị quyết của Bộ Chính trị về...", "Kế hoạch số ... của ... về...", "V/v...", "Về việc..."
  cleanTrichYeu = cleanTrichYeu
    .replace(
      /^(?:v\/v|về\s+việc)\s+(?:triển\s+khai\s+|thực\s+hiện\s+)?(?:nghị\s+quyết|quyết\s+định|kế\s+hoạch|công\s+văn|chỉ\s+thị|kết\s+luận|thông\s+báo|hướng\s+dẫn)\s+(?:số\s+\S+\s+)?(?:ngày\s+[\d/.-]+\s+)?(?:của\s+[^v]+?\s+)?(?=về\b)/i,
      ''
    )
    .replace(
      /^(?:nghị\s+quyết|quyết\s+định|kế\s+hoạch|công\s+văn|chỉ\s+thị|kết\s+luận|thông\s+báo|hướng\s+dẫn)\s+(?:số\s+\S+\s+)?(?:ngày\s+[\d/.-]+\s+)?(?:của\s+.+?\s+)?(?=về\b)/i,
      ''
    )
    .replace(/^(?:v\/v|về\s+việc|về)\s+/i, '')
    .trim();

  if (cleanTrichYeu) {
    cleanTrichYeu = cleanTrichYeu.charAt(0).toLowerCase() + cleanTrichYeu.slice(1);
  }

  const headParts = [`Thực hiện ${loai}`, soFormatted, rawNgay, `của ${coQuanFormatted}`].filter(
    Boolean
  );
  if (!cleanTrichYeu) {
    return headParts.join(' ');
  }

  const connector = /^(nghị\s+quyết|chỉ\s+thị|kết\s+luận)/i.test(loai) ? 'về' : 'về việc';
  return `${headParts.join(' ')} ${connector} ${cleanTrichYeu}`;
}

/**
 * 2. Soạn thảo Văn bản triển khai ở xã từ dữ liệu JSON đã trích xuất ở Khối 1 (KHÔNG gửi lại file PDF/ảnh gốc)
 *    & Kết nối liên thông đổ sang Tab 1
 */
export async function generateImplementationDocFromIncoming(params: {
  analysis: IncomingDocAnalysisResult;
  targetDocType: 'KH' | 'CV' | 'TB' | 'QĐ';
  unitNote: string;
  docContext: DocumentData;
  onStatusChange?: GeminiStatusCallback;
}): Promise<GeminiDocResponse> {
  const { analysis, targetDocType, unitNote, docContext, onStatusChange } = params;
  const virtualDoc: DocumentData = {
    ...docContext,
    docType: targetDocType
  };
  const systemPrompt = buildSystemInstruction(virtualDoc);
  const info = analysis.thongTinVanBan || analysis.thongTinVanBanDen;

  const naturalFirstCanCu = buildNaturalIncomingCitation(info);
  const extractedJsonStr = buildExtractedJsonContextForBlock2(analysis);

  const prompt = `${systemPrompt}

NHIỆM VỤ CHUYỂN HÓA DỮ LIỆU VĂN BẢN ĐẾN THÀNH VĂN BẢN TRIỂN KHAI TẠI CƠ SỞ:
Dựa trên toàn bộ dữ liệu JSON chi tiết đã trích xuất từ văn bản đến dưới đây, hãy soạn thảo 01 văn bản triển khai hoàn chỉnh của "${docContext.coQuanBanHanh}" thuộc loại "${targetDocType}".

DỮ LIỆU JSON CHI TIẾT ĐÃ TRÍCH XUẤT TỪ VĂN BẢN ĐẾN (KHỐI 1):
\`\`\`json
${extractedJsonStr}
\`\`\`

GHI CHÚ / SỐ LIỆU THỰC TẾ CỦA ĐƠN VỊ XÃ DO NGƯỜI DÙNG CUNG CẤP Ở KHỐI 2 (HÃY LỒNG GHÉP TỰ NHIÊN VÀO NỘI DUNG):
"""
${unitNote.trim() || 'Không có ghi chú bổ sung; hãy cụ thể hóa phù hợp với tình hình thực tế tại địa phương.'}
"""

YÊU CẦU BẮT BUỘC VỀ CÂU VIỆN DẪN CĂN CỨ ĐẦU TIÊN (CHUẨN VĂN PHONG HÀNH CHÍNH / ĐẢNG TIẾNG VIỆT):
1. Dòng căn cứ đầu tiên trong mảng "canCu" (và câu mở đầu nếu là Công văn/Thông báo) PHẢI viết tự nhiên theo đúng chuẩn văn phong hành chính/Đảng:
   - KHÔNG viết hoa toàn bộ tên cơ quan ban hành và bỏ phần chú thích trong ngoặc đơn (ví dụ: viết "Bộ Chính trị" thay vì "BỘ CHÍNH TRỊ (BAN CHẤP HÀNH TRUNG ƯƠNG)", viết "Ủy ban nhân dân tỉnh Việt Thanh" thay vì "ỦY BAN NHÂN DÂN TỈNH VIỆT THANH").
   - Chữ "số" viết thường (ví dụ: "số 57-NQ/TW", "số 145/UBND-VX").
   - KHÔNG lặp từ khi trích yếu đã bắt đầu bằng loại văn bản hoặc tên cơ quan (ví dụ chuẩn: "Thực hiện Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia" — TUYỆT ĐỐI KHÔNG viết lặp kiểu "về việc Nghị quyết của Bộ Chính trị về...").
   - Mẫu dòng căn cứ đầu tiên đã chuẩn hóa cho văn bản này: "${naturalFirstCanCu}".
2. Nếu là Công văn (CV): "kinhGui" phải ghi rõ các bộ phận chuyên môn, đơn vị trực thuộc hoặc các thôn/chi bộ trên địa bàn ${docContext.diaDanh} nhận văn bản để thực hiện; và câu mở đầu trong "noiDung" cũng viện dẫn tự nhiên theo mẫu "${naturalFirstCanCu}".
3. Cụ thể hóa đầy đủ các mục tiêu, chỉ tiêu, nhiệm vụ của từng bộ phận tại "${docContext.coQuanBanHanh}" dựa trên "chiTietTrienKhai" và "nhiemVuCapXa", kèm mốc thời gian hoàn thành và chế độ báo cáo.
4. Trả về duy nhất 01 đối tượng JSON hợp lệ gồm: "docType": "${targetDocType}", "trichYeu", "kinhGui", "canCu", "noiDung".`;

  const rawText = await callGeminiGenerateContent([{ text: prompt }], {
    responseMimeType: 'application/json',
    temperature: 0.3,
    maxOutputTokens: 8192,
    onStatusChange
  });

  const result = parseGeminiJsonResponse(rawText, targetDocType);
  result.docType = targetDocType;
  result.suggestedDocType = targetDocType;

  // Chuẩn hóa và đảm bảo dòng căn cứ đầu tiên luôn có trích dẫn tự nhiên, không bị IN HOA tên cơ quan hay lặp từ
  const safeCanCu = Array.isArray(result.canCu) ? result.canCu : [];
  const rawSoClean = (info.soKyHieu || '').replace(/^(số|so)\s*:?\s*/i, '').trim().toLowerCase();
  const matchIdx = safeCanCu.findIndex(
    (c) =>
      (rawSoClean && c.toLowerCase().includes(rawSoClean)) ||
      c.toLowerCase().includes((info.trichYeu || '').slice(0, 20).toLowerCase())
  );

  if (matchIdx === -1) {
    result.canCu = [naturalFirstCanCu, ...safeCanCu];
  } else {
    // Nếu AI vẫn trả về dòng căn cứ có chứa chuỗi IN HOA dài hoặc bị lặp "về việc Nghị quyết...", thay bằng câu chuẩn hóa tự nhiên
    const candidateLine = safeCanCu[matchIdx];
    const hasAllCapsAgencyOrDup =
      /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{4,}\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{3,}/.test(
        candidateLine
      ) ||
      /về\s+việc\s+(?:nghị\s+quyết|quyết\s+định|kế\s+hoạch|chỉ\s+thị|kết\s+luận)\b/i.test(
        candidateLine
      );
    if (hasAllCapsAgencyOrDup) {
      safeCanCu[matchIdx] = naturalFirstCanCu;
    }
    result.canCu = safeCanCu;
  }

  return result;
}

const VALID_INFOGRAPHIC_ICONS = new Set<InfographicIconType>([
  'target',
  'flag',
  'compass',
  'lightbulb',
  'star',
  'award',
  'users',
  'cpu',
  'settings',
  'shield',
  'chart',
  'book',
  'globe',
  'briefcase',
  'megaphone',
  'layers',
  'building',
  'landmark',
  'leaf',
  'heart',
  'graduation',
  'flask',
  'file',
  'check',
  'factory'
]);

function normalizeInfographicIconType(
  raw: unknown,
  fallback: InfographicIconType
): InfographicIconType {
  const clean = toSafeString(raw).toLowerCase().trim() as InfographicIconType;
  if (VALID_INFOGRAPHIC_ICONS.has(clean)) {
    return clean;
  }
  return fallback;
}

/**
 * Dự phòng dựng Infographic cục bộ (Zero-API Fallback - 0 tốn lượt API):
 * Ánh xạ trực tiếp dữ liệu JSON đã tóm tắt ở Khối 1 sang đúng schema 4 tầng chuẩn báo chí / hành chính v4.9.
 * Tuyệt đối không ghi cứng tên văn bản, số hiệu, tiêu đề mục hay dữ liệu mẫu cụ thể nào.
 */
export function buildLocalInfographicFromAnalysis(
  analysisResult: IncomingDocAnalysisResult,
  orgConfig: UnitConfig,
  mode: AppMode,
  extraNotes = ''
): InfographicDataResult {
  const info = analysisResult.thongTinVanBan || analysisResult.thongTinVanBanDen;
  const rawSoClean = (info?.soKyHieu || '').trim();
  const hasRealSymbol = Boolean(rawSoClean && !/chưa rõ/i.test(rawSoClean));
  const rawNgayClean = (info?.ngayBanHanh || '').trim();
  const hasRealDate = Boolean(rawNgayClean && !/chưa rõ/i.test(rawNgayClean));
  const loaiVbUpper = (info?.loaiVanBan || 'VĂN BẢN').trim().toUpperCase();

  const coQuanBanHanh = (
    info?.coQuanBanHanh && !/chưa rõ/i.test(info.coQuanBanHanh)
      ? info.coQuanBanHanh
      : orgConfig.coQuanBanHanh || orgConfig.coQuanChuQuan
  )
    .trim()
    .toUpperCase();

  const nhanVanBan = hasRealSymbol
    ? `${loaiVbUpper} ${rawSoClean.toUpperCase()}`
    : loaiVbUpper;

  const tieuDeChinh = (
    info?.trichYeu || `${loaiVbUpper} CỦA ${coQuanBanHanh}`
  )
    .trim()
    .toUpperCase();

  const dongNgayDiaDanh = `${orgConfig.diaDanh}, ${
    hasRealDate
      ? rawNgayClean.replace(/^Ngày\b/i, 'ngày')
      : `ngày ${new Date().toLocaleDateString('vi-VN')}`
  }`;

  const safeCorePoints = Array.isArray(analysisResult.noiDungCotLoi)
    ? analysisResult.noiDungCotLoi.filter(Boolean)
    : [];
  const safeTasks = Array.isArray(analysisResult.nhiemVuCapXaVaPhanCong)
    ? analysisResult.nhiemVuCapXaVaPhanCong
    : [];
  const safeTaskStrings = Array.isArray(analysisResult.nhiemVuCapXa)
    ? analysisResult.nhiemVuCapXa.filter(Boolean)
    : [];
  const safeDeadlines = Array.isArray(analysisResult.mocThoiGianVaHanBaoCao)
    ? analysisResult.mocThoiGianVaHanBaoCao
    : [];
  const safeMocStrings = Array.isArray(analysisResult.mocThoiGian)
    ? analysisResult.mocThoiGian.filter(Boolean)
    : [];

  const noteClean = extraNotes.trim();
  const mergedCore = noteClean ? [...safeCorePoints, noteClean] : safeCorePoints;

  // 1. Khối Tổng quan (3-4 ý)
  const cacYChinh =
    mergedCore.length >= 3
      ? mergedCore.slice(0, 4)
      : [
          ...mergedCore,
          ...safeTaskStrings.slice(0, Math.max(0, 3 - mergedCore.length))
        ].slice(0, 4);

  if (cacYChinh.length === 0) {
    cacYChinh.push(info?.trichYeu || `Triển khai thực hiện tại ${orgConfig.coQuanBanHanh}`);
  }

  const khoiTongQuan: InfographicKhoiTongQuan = {
    tieuDe: `${loaiVbUpper} & MỤC TIÊU`.split(/\s+/).slice(0, 5).join(' '),
    nhanManh:
      safeCorePoints[0] ||
      info?.trichYeu ||
      `Triển khai thực hiện nghiêm túc tại ${orgConfig.coQuanBanHanh}`,
    iconType: mode === 'DANG' ? 'flag' : 'target',
    cacYChinh
  };

  // 2. Khối Trọng tâm (3 hoặc 4 thẻ, ưu tiên 4 thẻ cân lưới)
  const defaultKhoi2Icons: InfographicIconType[] = [
    'chart',
    'shield',
    'cpu',
    'users',
    'settings',
    'book',
    'globe',
    'briefcase',
    'megaphone',
    'layers'
  ];

  const extractShortCardTitle = (text: string, index: number): string => {
    const cleaned = text.replace(/^[-•*+\d.)\s]+/, '').trim();
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx > 2 && colonIdx <= 32) {
      const prefixWords = cleaned.slice(0, colonIdx).trim().split(/\s+/);
      if (prefixWords.length <= 5) {
        return prefixWords.join(' ').toUpperCase();
      }
    }
    const words = cleaned.split(/\s+/).slice(0, 4).join(' ').replace(/[,.;:]+$/, '');
    return (words || `${loaiVbUpper} 0${index + 1}`).toUpperCase();
  };

  const sourceForCards =
    safeCorePoints.length >= 3
      ? safeCorePoints.slice(0, 4)
      : [...safeCorePoints, ...safeTaskStrings].slice(0, 4);

  const cacThe: InfographicKhoiTrongTamThe[] = (
    sourceForCards.length > 0 ? sourceForCards : [info?.trichYeu || coQuanBanHanh]
  ).map((pt, idx) => ({
    soThuTu: String(idx + 1),
    tieuDe: extractShortCardTitle(pt, idx),
    noiDung: pt,
    iconType: defaultKhoi2Icons[idx % defaultKhoi2Icons.length]
  }));

  const khoiTrongTam: InfographicKhoiTrongTam = {
    tieuDe: `NỘI DUNG TRỌNG TÂM ${loaiVbUpper}`.split(/\s+/).slice(0, 6).join(' '),
    cacThe
  };

  // 3. Khối Triển khai (3, 4 hoặc 5 nhóm)
  const defaultKhoi3Icons: InfographicIconType[] = [
    'building',
    'landmark',
    'users',
    'shield',
    'check',
    'file',
    'leaf',
    'heart',
    'graduation',
    'flask'
  ];

  const cacNhom: InfographicKhoiTrienKhaiNhom[] =
    safeTasks.length > 0
      ? safeTasks.slice(0, 5).map((t, idx) => ({
          ten: (t.boPhanChuTri || orgConfig.coQuanBanHanh)
            .split(/\s+/)
            .slice(0, 6)
            .join(' ')
            .toUpperCase(),
          chiTiet: t.nhiemVu,
          iconType: defaultKhoi3Icons[idx % defaultKhoi3Icons.length]
        }))
      : cacYChinh.slice(0, 4).map((pt, idx) => ({
          ten: orgConfig.coQuanBanHanh.split(/\s+/).slice(0, 6).join(' ').toUpperCase(),
          chiTiet: pt,
          iconType: defaultKhoi3Icons[idx % defaultKhoi3Icons.length]
        }));

  const khoiTrienKhai: InfographicKhoiTrienKhai = {
    tieuDe: 'TỔ CHỨC & PHÂN CÔNG',
    cacNhom
  };

  // 4. Khối Mốc thời gian (2 hoặc 3 mốc nối tiếp nhau)
  const hasRealDeadlines =
    safeDeadlines.length > 0 &&
    !safeDeadlines.every((d) => /thường xuyên|theo quy định/i.test(d.thoiHan));

  const cacMoc: InfographicKhoiMocThoiGianItem[] =
    safeDeadlines.length > 0
      ? safeDeadlines.slice(0, 3).map((d) => ({
          nhan: d.thoiHan.split(/\s+/).slice(0, 4).join(' ').toUpperCase(),
          moTa: d.noiDungHan
        }))
      : safeMocStrings.length > 0
      ? safeMocStrings.slice(0, 3).map((m, idx) => ({
          nhan: `MỐC 0${idx + 1}`,
          moTa: m
        }))
      : cacYChinh.slice(0, 3).map((pt, idx) => ({
          nhan: `YÊU CẦU 0${idx + 1}`,
          moTa: pt
        }));

  const khoiMocThoiGian: InfographicKhoiMocThoiGian = {
    tieuDe: hasRealDeadlines ? 'TIẾN ĐỘ THỰC HIỆN' : 'YÊU CẦU TRỌNG TÂM',
    cacMoc: cacMoc.slice(0, 3)
  };

  const dongChanTrang =
    analysisResult.butPheLanhDao ||
    `${orgConfig.coQuanBanHanh} (${orgConfig.coQuanChuQuan}) chủ trì theo dõi, đôn đốc triển khai thực hiện.`;

  return {
    coQuanBanHanh,
    nhanVanBan,
    tieuDeChinh,
    dongNgayDiaDanh,
    khoiTongQuan,
    khoiTrongTam,
    khoiTrienKhai,
    khoiMocThoiGian,
    dongChanTrang,
    isLocalFallback: true,
    // Tương thích ngược
    phuDe: khoiTongQuan.nhanManh,
    ngayDiaDanh: dongNgayDiaDanh,
    khoi1: {
      tieuDeKhoi: khoiTongQuan.tieuDe,
      tomTatNoiBat: khoiTongQuan.nhanManh,
      cacDiem: khoiTongQuan.cacYChinh
    },
    khoi2: {
      tieuDeKhoi: khoiTrongTam.tieuDe,
      cacMuc: khoiTrongTam.cacThe
    },
    khoi3: {
      tieuDeKhoi: khoiTrienKhai.tieuDe,
      cacMuc: khoiTrienKhai.cacNhom.map((n) => ({
        tenNhom: n.ten,
        noiDung: n.chiTiet,
        iconType: n.iconType
      }))
    },
    khoi4: {
      tieuDeKhoi: khoiMocThoiGian.tieuDe,
      cacMoc: khoiMocThoiGian.cacMoc.map((m) => ({
        nhan: m.nhan,
        noiDung: m.moTa
      }))
    }
  };
}

/**
 * 3A. Tạo dữ liệu JSON Infographic truyền thông tổng quát chuẩn báo chí / hành chính (v4.9)
 *     cho MỌI loại văn bản đến từ dữ liệu đã trích xuất ở Khối 1 (KHÔNG gửi lại file PDF/ảnh gốc).
 *     Tự động kích hoạt Zero-API Fallback nếu toàn bộ 6 model đều báo HTTP 429 hoặc HTTP 503.
 */
export async function generateInfographicData(params: {
  analysis: IncomingDocAnalysisResult;
  aspectRatio: InfographicAspectRatio;
  layoutStyle: InfographicLayoutStyle;
  layout?: InfographicLayoutStyle;
  unitNote: string;
  mode: AppMode;
  unitConfig: UnitConfig;
  onStatusChange?: GeminiStatusCallback;
}): Promise<InfographicDataResult> {
  const { analysis, aspectRatio, layoutStyle, layout, unitNote, mode, unitConfig, onStatusChange } =
    params;
  const effectiveLayout = layout || layoutStyle || 'BENTO';
  const isState = mode === 'NHA_NUOC';
  const info = analysis.thongTinVanBan || analysis.thongTinVanBanDen;

  const extractedJsonStr = buildExtractedJsonContextForBlock2(analysis);
  const localFallback = buildLocalInfographicFromAnalysis(
    analysis,
    unitConfig,
    mode,
    unitNote
  );

  const prompt = `Bạn là Tổng Biên tập & Kiến trúc sư Thiết kế Infographic Truyền thông Báo chí / Hành chính công cao cấp tại Việt Nam.
Nhiệm vụ của bạn là tự đọc hiểu bản chất thực tế của văn bản đến dưới đây (từ Thông báo/Công văn ngắn đến Nghị quyết/Kế hoạch/Quyết định/Chỉ thị dài), tự đặt tên tiêu đề cho 4 khối nội dung sao cho đúng ngữ cảnh văn bản đó (không ép cứng tên khối) và trả về JSON hoàn toàn SINH ĐỘNG (DYNAMIC) 100% từ văn bản đến và cấu hình đơn vị đang lưu.

NGUYÊN TẮC BẮT BUỘC & QUY TẮC CHỐNG BỊA ĐẶT (ANTI-HALLUCINATION):
- TUYỆT ĐỐI KHÔNG ghi cứng (hardcode) bất kỳ tên văn bản, số hiệu, tiêu đề mục hay dữ liệu mẫu cụ thể nào ngoài văn bản đến được cung cấp.
- Chỉ sử dụng số liệu, bộ phận, thời hạn và nội dung có thật trong văn bản đến (kết hợp ghi chú thực tế của người dùng nếu có).
- Nếu văn bản không có mốc thời gian cụ thể, hãy tự động chuyển "khoiMocThoiGian" thành các Lưu ý quan trọng / Yêu cầu tổ chức thực hiện để 4 tầng luôn đầy đặn, logic.
- Tỉ lệ khung hình cố định: ${aspectRatio} — Kiểu bố cục: ${effectiveLayout}.
- Cấu hình đơn vị tại Tab 6: Cơ quan "${unitConfig.coQuanBanHanh}" (Trực thuộc: "${unitConfig.coQuanChuQuan}", Địa danh: "${unitConfig.diaDanh}", Chế độ: ${
    isState ? 'Khối Nhà nước' : 'Khối Đảng'
  }).
- Ghi chú thực tế bổ sung của đơn vị: "${
    unitNote.trim() || 'Không có ghi chú bổ sung; bám sát 100% văn bản đến'
  }".

DỮ LIỆU JSON ĐÃ TRÍCH XUẤT TỪ VĂN BẢN ĐẾN (KHỐI 1):
\`\`\`json
${extractedJsonStr}
\`\`\`

QUY ĐỊNH SỐ LƯỢNG PHẦN TỬ & ĐỘ DÀI CÂU CHỮ CHUẨN XÁC ĐỂ KHÔNG BỊ CẮT CHỮ:
- "khoiTongQuan.cacYChinh": có 3–4 ý (mỗi ý tối đa 14 từ).
- "khoiTrongTam.cacThe": có 3 hoặc 4 thẻ (ưu tiên 4 thẻ cho cân lưới; "tieuDe" mỗi thẻ viết hoa tối đa 5 từ để không bị cắt chữ; "noiDung" từ 18 đến 26 từ).
- "khoiTrienKhai.cacNhom": có 3, 4 hoặc 5 nhóm theo đúng nội dung văn bản ("ten" viết hoa tối đa 6 từ; "chiTiet" từ 15 đến 22 từ).
- "khoiMocThoiGian.cacMoc": có 2 hoặc 3 mốc nối tiếp nhau ("nhan" viết hoa từ 2 đến 4 từ; "moTa" từ 12 đến 20 từ).

BẮT BUỘC TRẢ VỀ DUY NHẤT 01 ĐỐI TƯỢNG JSON HỢP LỆ THEO ĐÚNG CẤU TRÚC CHUẨN SAU:
{
  "coQuanBanHanh": "Tên cơ quan ban hành văn bản gốc hoặc cơ quan hiển thị trên cùng lấy từ cấu hình Tab 6 (viết hoa)",
  "nhanVanBan": "Loại và Số/ký hiệu văn bản ngắn gọn nổi bật (viết hoa; nếu không có số hiệu thì ghi tên loại văn bản)",
  "tieuDeChinh": "Tiêu đề truyền thông súc tích, nêu rõ nội dung cốt lõi nhất (tối đa 16 từ)",
  "dongNgayDiaDanh": "Địa danh, ngày ... tháng ... năm ...",

  "khoiTongQuan": {
    "tieuDe": "Tiêu đề khối 1 tự đặt theo ngữ cảnh văn bản (viết hoa, tối đa 5 từ)",
    "nhanManh": "1 câu khái quát quan trọng nhất, in đậm nổi bật (tối đa 18 từ)",
    "iconType": "target | flag | compass | lightbulb | star | award",
    "cacYChinh": [
      "Điểm chính 1 cô đọng, ưu tiên số liệu hoặc mục tiêu thực tế (tối đa 14 từ)",
      "Điểm chính 2 cô đọng (tối đa 14 từ)",
      "Điểm chính 3 cô đọng (tối đa 14 từ)",
      "Điểm chính 4 cô đọng (tối đa 14 từ)"
    ]
  },

  "khoiTrongTam": {
    "tieuDe": "Tiêu đề khối 2 tự đặt theo ngữ cảnh văn bản (viết hoa, tối đa 6 từ)",
    "cacThe": [
      {
        "soThuTu": "1",
        "tieuDe": "Tên nhóm nội dung hoặc nhiệm vụ ngắn gọn (viết hoa, tối đa 5 từ để không bị cắt chữ)",
        "noiDung": "Diễn giải súc tích, đầy đủ ý (từ 18 đến 26 từ)",
        "iconType": "users | cpu | settings | shield | chart | book | globe | briefcase | megaphone | layers"
      }
    ]
  },

  "khoiTrienKhai": {
    "tieuDe": "Tiêu đề khối 3 tự đặt theo ngữ cảnh văn bản như phân công, đối tượng hoặc lĩnh vực (viết hoa, tối đa 5 từ)",
    "cacNhom": [
      {
        "ten": "Tên bộ phận, lĩnh vực hoặc đối tượng áp dụng (viết hoa, tối đa 6 từ)",
        "chiTiet": "Nhiệm vụ, yêu cầu hoặc quyền lợi cụ thể (từ 15 đến 22 từ)",
        "iconType": "building | landmark | leaf | heart | graduation | flask | file | check | users | shield"
      }
    ]
  },

  "khoiMocThoiGian": {
    "tieuDe": "Tiêu đề khối 4 tự đặt như Mốc thực hiện, Thời hạn hoặc Lưu ý trọng tâm (viết hoa, tối đa 4 từ)",
    "cacMoc": [
      {
        "nhan": "Mốc thời gian hoặc từ khóa ngắn nhấn mạnh (viết hoa, từ 2 đến 4 từ)",
        "moTa": "Kết quả cần đạt, hành động tương ứng hoặc lưu ý đi kèm (từ 12 đến 20 từ)"
      }
    ]
  },

  "dongChanTrang": "1 câu ngắn gọn ghi cơ quan chủ trì theo dõi, đôn đốc thực hiện theo cấu hình đơn vị tại Tab 6"
}`;

  let rawText = '';
  try {
    rawText = await callGeminiGenerateContent([{ text: prompt }], {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192,
      onStatusChange
    });
  } catch (err) {
    // Dự phòng dựng Infographic cục bộ (Zero-API Fallback) khi mọi model đều báo HTTP 429 hoặc HTTP 503
    if (
      err instanceof GeminiServiceError &&
      (err.code === 'QUOTA_EXCEEDED' ||
        err.code === 'SERVER_OVERLOADED' ||
        err.httpStatus === 429 ||
        err.httpStatus === 503)
    ) {
      return localFallback;
    }
    throw err;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractAndParseDefensiveJson(rawText);
  } catch {
    return localFallback;
  }

  // 1. Chuẩn hóa khoiTongQuan
  const rawTongQuan = ((parsed.khoiTongQuan ?? parsed.khoi1) || {}) as Record<string, unknown>;
  const rawYChinh = toSafeStringArray(rawTongQuan.cacYChinh ?? rawTongQuan.cacDiem);
  const khoiTongQuan: InfographicKhoiTongQuan = {
    tieuDe: toSafeString(
      rawTongQuan.tieuDe ?? rawTongQuan.tieuDeKhoi,
      localFallback.khoiTongQuan.tieuDe
    ).toUpperCase(),
    nhanManh: toSafeString(
      rawTongQuan.nhanManh ?? rawTongQuan.tomTatNoiBat ?? parsed.thongDiepTrongTam,
      localFallback.khoiTongQuan.nhanManh
    ),
    iconType: normalizeInfographicIconType(
      rawTongQuan.iconType,
      localFallback.khoiTongQuan.iconType
    ),
    cacYChinh:
      rawYChinh.length > 0
        ? rawYChinh.slice(0, 4)
        : localFallback.khoiTongQuan.cacYChinh
  };

  // 2. Chuẩn hóa khoiTrongTam
  const rawTrongTam = ((parsed.khoiTrongTam ?? parsed.khoi2) || {}) as Record<string, unknown>;
  const rawCacThe = Array.isArray(rawTrongTam.cacThe)
    ? rawTrongTam.cacThe
    : Array.isArray(rawTrongTam.cacMuc)
    ? rawTrongTam.cacMuc
    : Array.isArray(parsed.cacKhoiNoiDung)
    ? parsed.cacKhoiNoiDung
    : [];

  const defaultKhoi2Icons: InfographicIconType[] = [
    'chart',
    'shield',
    'cpu',
    'users',
    'settings',
    'book',
    'globe',
    'briefcase',
    'megaphone',
    'layers'
  ];

  const cacThe: InfographicKhoiTrongTamThe[] =
    rawCacThe.length > 0
      ? rawCacThe.slice(0, 4).map((item: unknown, idx: number) => {
          const obj = (item || {}) as Record<string, unknown>;
          const fbCard = localFallback.khoiTrongTam.cacThe[idx] || localFallback.khoiTrongTam.cacThe[0];
          return {
            soThuTu: toSafeString(obj.soThuTu, String(idx + 1)),
            tieuDe: toSafeString(
              obj.tieuDe ?? obj.tieuDeNgan ?? obj.title,
              fbCard?.tieuDe || `${(info?.loaiVanBan || 'NHIỆM VỤ').toUpperCase()} 0${idx + 1}`
            ).toUpperCase(),
            noiDung: toSafeString(
              obj.noiDung ?? obj.noiDungNgan ?? obj.description,
              fbCard?.noiDung || info?.trichYeu || ''
            ),
            iconType: normalizeInfographicIconType(
              obj.iconType,
              defaultKhoi2Icons[idx % defaultKhoi2Icons.length]
            )
          };
        })
      : localFallback.khoiTrongTam.cacThe;

  const khoiTrongTam: InfographicKhoiTrongTam = {
    tieuDe: toSafeString(
      rawTrongTam.tieuDe ?? rawTrongTam.tieuDeKhoi,
      localFallback.khoiTrongTam.tieuDe
    ).toUpperCase(),
    cacThe
  };

  // 3. Chuẩn hóa khoiTrienKhai
  const rawTrienKhai = ((parsed.khoiTrienKhai ?? parsed.khoi3) || {}) as Record<string, unknown>;
  const rawCacNhom = Array.isArray(rawTrienKhai.cacNhom)
    ? rawTrienKhai.cacNhom
    : Array.isArray(rawTrienKhai.cacMuc)
    ? rawTrienKhai.cacMuc
    : [];

  const defaultKhoi3Icons: InfographicIconType[] = [
    'building',
    'landmark',
    'users',
    'shield',
    'check',
    'file',
    'leaf',
    'heart',
    'graduation',
    'flask'
  ];

  const cacNhom: InfographicKhoiTrienKhaiNhom[] =
    rawCacNhom.length > 0
      ? rawCacNhom.slice(0, 5).map((item: unknown, idx: number) => {
          const obj = (item || {}) as Record<string, unknown>;
          const fbGroup = localFallback.khoiTrienKhai.cacNhom[idx] || localFallback.khoiTrienKhai.cacNhom[0];
          return {
            ten: toSafeString(
              obj.ten ?? obj.tenNhom ?? obj.boPhanChuTri ?? obj.title,
              fbGroup?.ten || unitConfig.coQuanBanHanh
            ).toUpperCase(),
            chiTiet: toSafeString(
              obj.chiTiet ?? obj.noiDung ?? obj.nhiemVu ?? obj.description,
              fbGroup?.chiTiet || ''
            ),
            iconType: normalizeInfographicIconType(
              obj.iconType,
              defaultKhoi3Icons[idx % defaultKhoi3Icons.length]
            )
          };
        })
      : localFallback.khoiTrienKhai.cacNhom;

  const khoiTrienKhai: InfographicKhoiTrienKhai = {
    tieuDe: toSafeString(
      rawTrienKhai.tieuDe ?? rawTrienKhai.tieuDeKhoi,
      localFallback.khoiTrienKhai.tieuDe
    ).toUpperCase(),
    cacNhom
  };

  // 4. Chuẩn hóa khoiMocThoiGian
  const rawMoc = ((parsed.khoiMocThoiGian ?? parsed.khoi4) || {}) as Record<string, unknown>;
  const rawCacMoc = Array.isArray(rawMoc.cacMoc) ? rawMoc.cacMoc : [];

  const cacMoc: InfographicKhoiMocThoiGianItem[] =
    rawCacMoc.length > 0
      ? rawCacMoc.slice(0, 3).map((item: unknown, idx: number) => {
          const obj = (item || {}) as Record<string, unknown>;
          const fbMoc = localFallback.khoiMocThoiGian.cacMoc[idx] || localFallback.khoiMocThoiGian.cacMoc[0];
          return {
            nhan: toSafeString(
              obj.nhan ?? obj.thoiHan ?? obj.conSo,
              fbMoc?.nhan || `MỐC 0${idx + 1}`
            ).toUpperCase(),
            moTa: toSafeString(
              obj.moTa ?? obj.noiDung ?? obj.noiDungHan ?? obj.nhanMoTa,
              fbMoc?.moTa || ''
            )
          };
        })
      : localFallback.khoiMocThoiGian.cacMoc;

  const khoiMocThoiGian: InfographicKhoiMocThoiGian = {
    tieuDe: toSafeString(
      rawMoc.tieuDe ?? rawMoc.tieuDeKhoi,
      localFallback.khoiMocThoiGian.tieuDe
    ).toUpperCase(),
    cacMoc
  };

  const coQuanBanHanh = toSafeString(
    parsed.coQuanBanHanh,
    localFallback.coQuanBanHanh
  ).toUpperCase();
  const nhanVanBan = toSafeString(
    parsed.nhanVanBan,
    localFallback.nhanVanBan
  ).toUpperCase();
  const tieuDeChinh = toSafeString(
    parsed.tieuDeChinh ?? parsed.title,
    localFallback.tieuDeChinh
  ).toUpperCase();
  const dongNgayDiaDanh = toSafeString(
    parsed.dongNgayDiaDanh ?? parsed.ngayDiaDanh,
    localFallback.dongNgayDiaDanh
  );
  const dongChanTrang = toSafeString(
    parsed.dongChanTrang ?? parsed.khauHieuHanhDong ?? parsed.nguonVanBan,
    localFallback.dongChanTrang
  );

  return {
    coQuanBanHanh,
    nhanVanBan,
    tieuDeChinh,
    dongNgayDiaDanh,
    khoiTongQuan,
    khoiTrongTam,
    khoiTrienKhai,
    khoiMocThoiGian,
    dongChanTrang,
    isLocalFallback: false,
    // Tương thích ngược
    phuDe: khoiTongQuan.nhanManh,
    ngayDiaDanh: dongNgayDiaDanh,
    khoi1: {
      tieuDeKhoi: khoiTongQuan.tieuDe,
      tomTatNoiBat: khoiTongQuan.nhanManh,
      cacDiem: khoiTongQuan.cacYChinh
    },
    khoi2: {
      tieuDeKhoi: khoiTrongTam.tieuDe,
      cacMuc: khoiTrongTam.cacThe
    },
    khoi3: {
      tieuDeKhoi: khoiTrienKhai.tieuDe,
      cacMuc: khoiTrienKhai.cacNhom.map((n) => ({
        tenNhom: n.ten,
        noiDung: n.chiTiet,
        iconType: n.iconType
      }))
    },
    khoi4: {
      tieuDeKhoi: khoiMocThoiGian.tieuDe,
      cacMoc: khoiMocThoiGian.cacMoc.map((m) => ({
        nhan: m.nhan,
        noiDung: m.moTa
      }))
    }
  };
}

/**
 * 3B. Viết bài truyền thông Zalo / Facebook / Trang Thông tin điện tử xã từ dữ liệu JSON Khối 1 (KHÔNG gửi lại file PDF/ảnh gốc)
 */
export async function generateMediaPost(params: {
  analysis: IncomingDocAnalysisResult;
  unitNote: string;
  mode: AppMode;
  unitConfig: UnitConfig;
  onStatusChange?: GeminiStatusCallback;
}): Promise<MediaPostResult> {
  const { analysis, unitNote, mode, unitConfig, onStatusChange } = params;
  const isState = mode === 'NHA_NUOC';
  const info = analysis.thongTinVanBan || analysis.thongTinVanBanDen;
  const extractedJsonStr = buildExtractedJsonContextForBlock2(analysis);

  const prompt = `Bạn là Biên tập viên Trang Thông tin điện tử và Kênh Zalo OA / Fanpage tuyên truyền chính sách tại cơ sở của "${unitConfig.coQuanBanHanh}".
Dựa trên dữ liệu JSON chi tiết đã trích xuất từ văn bản đến dưới đây, hãy viết 01 BÀI TIN TUYÊN TRUYỀN ngắn gọn, thân thiện, rõ ràng, dễ hiểu để đăng lên nhóm Zalo thôn/khu dân cư, Fanpage Facebook và Trang Thông tin điện tử xã ${unitConfig.diaDanh}.

DỮ LIỆU JSON ĐÃ TRÍCH XUẤT TỪ VĂN BẢN ĐẾN (KHỐI 1):
\`\`\`json
${extractedJsonStr}
\`\`\`

GHI CHÚ / SỐ LIỆU THỰC TẾ TẠI ĐỊA PHƯƠNG (KHỐI 2):
"""
${unitNote.trim() || 'Triển khai đồng bộ, hiệu quả trên toàn địa bàn xã'}
"""

YÊU CẦU TRÌNH BÀY:
1. Văn phong gần gũi với người dân và cán bộ cơ sở, trình bày thoáng, sử dụng các biểu tượng (emoji) đầu dòng hợp lý (📢, 📌, ⏰, ✅, 📍) để dán trực tiếp lên Zalo/Facebook đọc ngay không cần chỉnh sửa.
2. Không dùng cú pháp Markdown như ** hay ##.
3. Nêu rõ: Thông báo về việc gì? Những điểm chính người dân/cán bộ cần biết hoặc cần thực hiện là gì? Thời gian, địa điểm hoặc bộ phận liên hệ tại ${unitConfig.coQuanBanHanh} (${
    isState ? 'UBND xã' : 'Đảng ủy xã'
  }).
4. Trả về duy nhất 01 đối tượng JSON hợp lệ:
{
  "tieuDeBaiDang": "Tiêu đề bài đăng thu hút, viết hoa kèm emoji mở đầu",
  "noiDungBaiDang": "Toàn bộ nội dung bài đăng hoàn chỉnh (các đoạn cách nhau bằng \\n\\n)",
  "hashtags": ["#NamGiang", "#VietThanh", "#ThongTinTuyenTruyen", "..."]
}`;

  const rawText = await callGeminiGenerateContent([{ text: prompt }], {
    responseMimeType: 'application/json',
    temperature: 0.3,
    maxOutputTokens: 8192,
    onStatusChange
  });

  const parsed = extractAndParseDefensiveJson(rawText);
  const tieuDeBaiDang = toSafeString(
    parsed.tieuDeBaiDang ?? parsed.title ?? parsed.headline,
    `📢 THÔNG TIN TUYÊN TRUYỀN: ${(info.trichYeu || '').toUpperCase()}`
  );

  const safeCoreList = Array.isArray(analysis.noiDungCotLoi) ? analysis.noiDungCotLoi : [];
  const defaultBody = [
    `Thực hiện ${info.loaiVanBan} ${info.soKyHieu} (${info.ngayBanHanh}) của ${info.coQuanBanHanh} về ${info.trichYeu}, ${unitConfig.coQuanBanHanh} thông tin những nội dung trọng tâm như sau:`,
    ...safeCoreList.map((item) => `📌 ${item}`),
    `📍 Đề nghị các ban ngành, đoàn thể, thôn/khu dân cư và bà con nhân dân trên địa bàn ${unitConfig.diaDanh} phối hợp triển khai thực hiện hiệu quả.`
  ].join('\n\n');

  const noiDungBaiDang = toSafeString(
    parsed.noiDungBaiDang ?? parsed.content ?? parsed.body,
    defaultBody
  );

  const rawHashtags = toSafeStringArray(parsed.hashtags ?? parsed.tags);
  const hashtags =
    rawHashtags.length > 0
      ? rawHashtags.map((h) => (h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`))
      : [`#${unitConfig.diaDanh.replace(/\s+/g, '')}`, '#ThongTinTuyenTruyen', '#ChuyenDoiSo'];

  return {
    tieuDeBaiDang,
    noiDungBaiDang,
    hashtags
  };
}
