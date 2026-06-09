import * as XLSX from 'xlsx';
import type { Row } from './types';

export interface ParsedFile {
  columns: string[];
  rows: Row[];
}

/** 업로드된 File(.xlsx/.xls/.csv)의 첫 시트를 파싱한다. 모든 값은 문자열. */
export async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // raw:false → 날짜/숫자도 표시 문자열로. defval로 빈 셀은 ''.
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: ''
  });
  const rows: Row[] = json.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[k] = String(r[k] ?? '');
    return out;
  });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { columns, rows };
}
