import * as XLSX from 'xlsx';
import type { CompareResult, Row } from './types';

/** CompareResult를 xlsx 바이너리(ArrayBuffer)로 만든다. 시트: A에만/B에만/공통 */
export function buildResultWorkbook(result: CompareResult, keyColumn: string): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const changedKeys = new Set(result.changed.map((c) => c.key));
  const norm = (v: unknown) => String(v ?? '').trim();
  const bothRows: Row[] = result.both.map((row) => ({
    ...row,
    변경여부: changedKeys.has(norm(row[keyColumn])) ? '변경됨' : '동일'
  }));

  const sheets: [string, Row[]][] = [
    ['A에만', result.onlyA],
    ['B에만', result.onlyB],
    ['공통', bothRows]
  ];
  for (const [name, rows] of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
