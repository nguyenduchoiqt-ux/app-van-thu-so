import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Wrench,
  ShieldCheck,
  FileSearch
} from 'lucide-react';
import { DocumentData, ReviewIssue } from '../types';
import { reviewDocument, formatSoKyHieuDisplay } from '../utils/docHelpers';
import { buildAutoKyHieu, DOC_TYPES } from '../constants';

interface ReviewTabProps {
  doc: DocumentData;
  setDoc: React.Dispatch<React.SetStateAction<DocumentData>>;
  onBackToEditor: () => void;
  getNextSuggestedNumber: (docType: string) => string;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({
  doc,
  setDoc,
  onBackToEditor,
  getNextSuggestedNumber
}) => {
  const isState = doc.mode === 'NHA_NUOC';
  const issues: ReviewIssue[] = reviewDocument(doc);

  const errorCount = issues.filter((i) => i.level === 'ERROR').length;
  const warningCount = issues.filter((i) => i.level === 'WARNING').length;
  const passCount = issues.filter((i) => i.level === 'PASS').length;

  const docTypeObj = DOC_TYPES.find((d) => d.code === doc.docType);
  const primaryBg = isState ? 'bg-[#1e4b7a]' : 'bg-[#b91c1c]';
  const primaryText = isState ? 'text-[#1e4b7a]' : 'text-[#b91c1c]';

  // Tự động khắc phục nhanh một số lỗi phổ biến
  const handleQuickFix = (issueId: string) => {
    if (issueId === 'missing-number') {
      setDoc((prev) => ({
        ...prev,
        soVanBan: getNextSuggestedNumber(prev.docType)
      }));
    } else if (
      issueId === 'missing-symbol' ||
      issueId === 'wrong-state-symbol' ||
      issueId === 'wrong-party-symbol'
    ) {
      setDoc((prev) => ({
        ...prev,
        autoKyHieu: true,
        kyHieu: buildAutoKyHieu(prev.mode, prev.docType, prev.kyHieuCoQuan)
      }));
    } else if (issueId === 'abstract-all-caps' || issueId === 'abstract-first-lower') {
      setDoc((prev) => {
        const raw = prev.trichYeu.trim();
        if (!raw) return prev;
        const lowered = raw.toLowerCase();
        const fixed = lowered.charAt(0).toUpperCase() + lowered.slice(1);
        return { ...prev, trichYeu: fixed };
      });
    } else if (issueId === 'missing-luu-vt') {
      setDoc((prev) => ({
        ...prev,
        luuVt: prev.mode === 'DANG' ? 'Lưu: VT, VPĐU.' : 'Lưu: VT, VP.'
      }));
    } else if (issueId === 'wrong-deputy-authority') {
      setDoc((prev) => ({
        ...prev,
        quyenHanKy: prev.mode === 'NHA_NUOC' ? 'KT. CHỦ TỊCH' : 'K/T BÍ THƯ'
      }));
    } else if (issueId === 'missing-party-tm') {
      setDoc((prev) => ({
        ...prev,
        quyenHanKy: 'T/M ĐẢNG ỦY'
      }));
    } else if (issueId === 'missing-cancu') {
      setDoc((prev) => ({
        ...prev,
        canCu: [
          ...prev.canCu,
          prev.mode === 'NHA_NUOC'
            ? 'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư'
            : 'Căn cứ Hướng dẫn số 05-HD/VPTW của Văn phòng Trung ương Đảng về thể thức và kỹ thuật trình bày văn bản của Đảng'
        ]
      }));
    }
  };

  const canQuickFix = (id: string) =>
    [
      'missing-number',
      'missing-symbol',
      'wrong-state-symbol',
      'wrong-party-symbol',
      'abstract-all-caps',
      'abstract-first-lower',
      'missing-luu-vt',
      'wrong-deputy-authority',
      'missing-party-tm',
      'missing-cancu'
    ].includes(id);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header tổng quan kết quả Rà soát */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSearch className={`w-6 h-6 ${primaryText}`} />
              <h2 className="text-lg font-bold text-slate-900">
                Báo cáo Rà soát Thể thức Văn bản Tự động
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Đang kiểm tra văn bản:{' '}
              <strong className="text-slate-900">
                {docTypeObj?.name} ({formatSoKyHieuDisplay(doc.mode, doc.soVanBan, doc.kyHieu)})
              </strong>{' '}
              — Chế độ:{' '}
              <span className={`font-semibold ${primaryText}`}>
                {isState ? 'Khối Nhà nước (Nghị định 30/2020/NĐ-CP)' : 'Khối Đảng (Hướng dẫn 05-HD/VPTW)'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToEditor}
            className={`inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition ${primaryBg} hover:opacity-95`}
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Tab Soạn thảo
          </button>
        </div>

        {/* 3 Thẻ thống kê */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex items-center gap-3.5">
            <XCircle className="w-9 h-9 text-red-600 shrink-0" />
            <div>
              <div className="text-2xl font-extrabold text-red-700">{errorCount}</div>
              <div className="text-xs font-semibold text-red-800 uppercase">Lỗi nghiêm trọng (Cần sửa)</div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-center gap-3.5">
            <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0" />
            <div>
              <div className="text-2xl font-extrabold text-amber-700">{warningCount}</div>
              <div className="text-xs font-semibold text-amber-800 uppercase">Cảnh báo lưu ý</div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3.5">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />
            <div>
              <div className="text-2xl font-extrabold text-emerald-700">{passCount}</div>
              <div className="text-xs font-semibold text-emerald-800 uppercase">Tiêu chí đạt chuẩn</div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách chi tiết từng hạng mục kiểm tra */}
      <div className="space-y-3">
        {issues.map((issue) => {
          const isError = issue.level === 'ERROR';
          const isWarn = issue.level === 'WARNING';

          return (
            <div
              key={issue.id}
              className={`rounded-xl border p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isError
                  ? 'border-l-4 border-l-red-600 border-red-200'
                  : isWarn
                  ? 'border-l-4 border-l-amber-500 border-amber-200'
                  : 'border-l-4 border-l-emerald-600 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {isError ? (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                ) : isWarn ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {issue.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{issue.title}</h4>
                  </div>

                  <p className="text-sm text-slate-600 mt-1">{issue.detail}</p>

                  {issue.suggestion && (
                    <p className="text-xs font-medium text-slate-800 mt-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                      💡 <strong>Khuyến nghị:</strong> {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>

              {canQuickFix(issue.id) && (
                <button
                  type="button"
                  onClick={() => handleQuickFix(issue.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Tự động sửa ngay
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
