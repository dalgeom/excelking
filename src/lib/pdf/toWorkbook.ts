import * as XLSX from 'xlsx';
import type { PdfSheet } from './types';
import { sanitizeSheetName, uniqueNames } from '../excel/names';

/** 페이지별 Grid를 시트로 묶어 xlsx(ArrayBuffer)로 만든다. 빈 그리드 페이지는 스킵. */
export function buildPdfWorkbook(pages: PdfSheet[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const nonEmpty = pages.filter((p) => p.grid.length > 0);
  const names = uniqueNames(nonEmpty.map((p) => sanitizeSheetName(p.name)), 31);
  nonEmpty.forEach((p, i) => {
    const ws = XLSX.utils.aoa_to_sheet(p.grid);
    XLSX.utils.book_append_sheet(wb, ws, names[i]);
  });
  if (!wb.SheetNames.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), 'Sheet1');
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
