import * as XLSX from 'xlsx';
import type { CompareResult, Row } from './types';
import type { SplitGroup } from './split';
import { sanitizeSheetName, uniqueNames } from './names';

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

/** SplitGroup 배열을 한 워크북(그룹=시트)으로 만든다. 시트명은 정리·중복 해소. */
export function buildSplitWorkbook(groups: SplitGroup[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const names = uniqueNames(groups.map((g) => sanitizeSheetName(g.value)), 31);
  groups.forEach((g, i) => {
    const ws = XLSX.utils.json_to_sheet(g.rows.length ? g.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, names[i]);
  });
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
