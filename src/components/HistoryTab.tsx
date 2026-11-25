import React, { useState } from 'react';
import {
  History,
  FolderOpen,
  Trash2,
  Download,
  Hash,
  Search,
  Filter
} from 'lucide-react';
import { DOC_TYPES } from '../constants';
import { AppMode, DocumentData } from '../types';
import { formatSoKyHieuDisplay, formatVietnameseDate } from '../utils/docHelpers';
import { exportDocumentToDocx } from '../utils/docxExporter';

interface HistoryTabProps {
  mode: AppMode;
  historyList: DocumentData[];
  onOpenDocument: (doc: DocumentData) => void;
  onDeleteDocument: (id: string) => void;
  onClearAllHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  mode,
  historyList,
  onOpenDocument,
  onDeleteDocument,
  onClearAllHistory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | AppMode>('ALL');

  const isState = mode === 'NHA_NUOC';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';
  const primaryBg = isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]';

  // Thống kê số lớn nhất theo từng loại văn bản để phục vụ tính năng "Gợi ý số tiếp theo"
  const maxNumberByType: Record<string, { max: number; next: string; count: number }> = {};
  for (const dt of DOC_TYPES) {
    const docsOfType = historyList.filter((d) => d.docType === dt.code && d.mode === mode);
    let maxNum = 0;
    for (const d of docsOfType) {
      const parsed = parseInt((d.soVanBan || '').trim(), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
    const nextVal = maxNum + 1;
    maxNumberByType[dt.code] = {
      max: maxNum,
      next: isState ? `${nextVal}` : (nextVal < 10 ? `0${nextVal}` : `${nextVal}`),
      count: docsOfType.length
    };
  }

  const filteredList = historyList.filter((item) => {
    if (filterMode !== 'ALL' && item.mode !== filterMode) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.trichYeu.toLowerCase().includes(q) ||
      item.soVanBan.toLowerCase().includes(q) ||
      item.kyHieu.toLowerCase().includes(q) ||
      item.hoTenKy.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. BẢNG ĐẾM SỐ LỚN NHẤT & GỢI Ý SỐ TIẾP THEO THEO TỪNG LOẠI VĂN BẢN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Hash className={`w-5 h-5 ${primaryText}`} />
            <h2 className="text-base font-bold text-slate-900">
              Bộ đếm Số văn bản theo loại ({isState ? 'Khối Nhà nước' : 'Khối Đảng'})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Tự động quét số lớn nhất trong <code className="font-semibold">localStorage</code> để cấp số tiếp theo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {DOC_TYPES.filter((dt) => dt.modes.includes(mode)).map((dt) => {
            const stat = maxNumberByType[dt.code] || { max: 0, next: '01', count: 0 };
            return (
              <div
                key={dt.code}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{dt.name}</span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {dt.code}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500">
                    Đã lưu: <strong>{stat.count}</strong> (Max: {stat.max})
                  </span>
                  <span className={`text-xs font-extrabold ${primaryText}`}>
                    Số kế: {stat.next}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. DANH SÁCH LỊCH SỬ VĂN BẢN ĐÃ LƯU */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${primaryText}`} />
            <h2 className="text-base font-bold text-slate-900">
              Danh sách Văn bản đã lưu ({filteredList.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo số, ký hiệu, trích yếu..."
                className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded ${
                  filterMode === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('NHA_NUOC')}
                className={`px-2.5 py-1 rounded ${
                  filterMode === 'NHA_NUOC' ? 'bg-[#1e4b7a] text-white' : 'text-slate-600'
                }`}
              >
                Nhà nước
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('DANG')}
                className={`px-2.5 py-1 rounded ${
                  filterMode === 'DANG' ? 'bg-[#b91c1c] text-white' : 'text-slate-600'
                }`}
              >
                Khối Đảng
              </button>
            </div>

            {historyList.length > 0 && (
              <button
                type="button"
                onClick={onClearAllHistory}
                className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm font-medium text-slate-600">
              Chưa có văn bản nào trong lịch sử khớp với bộ lọc.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tại Tab Soạn thảo, nhấn nút <strong>"Lưu vào lịch sử"</strong> trên thanh công cụ để lưu trữ văn bản.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {filteredList.map((item) => {
              const dtInfo = DOC_TYPES.find((d) => d.code === item.docType);
              const isItemState = item.mode === 'NHA_NUOC';
              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded text-white ${
                          isItemState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]'
                        }`}
                      >
                        {isItemState ? 'NĐ 30/2020' : 'HD 05-HD/VPTW'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                        {dtInfo ? dtInfo.name : item.docType}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatSoKyHieuDisplay(item.mode, item.soVanBan, item.kyHieu)}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {formatVietnameseDate(item.diaDanh, item.ngayBanHanh)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {item.trichYeu || '(Chưa có trích yếu nội dung)'}
                    </p>

                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>Cơ quan: <strong>{item.coQuanBanHanh}</strong></span>
                      <span>Người ký: <strong>{item.chucVuKy} - {item.hoTenKy}</strong></span>
                      <span>Cập nhật: {item.updatedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(item)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg shadow-sm transition ${primaryBg} hover:opacity-95`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Mở lại để sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => exportDocumentToDocx(item)}
                      className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-300 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .DOCX
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDocument(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Xóa văn bản này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
