import * as XLSX from 'xlsx';
import type { CompareResult, Row } from './types';
import { zipSync } from 'fflate';
import type { SplitGroup } from './split';
import type { MergeResult } from './merge';
import { sanitizeSheetName, sanitizeFileName, uniqueNames } from './names';

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

/** SplitGroup 배열을 그룹별 xlsx 파일로 만들어 ZIP(Uint8Array)으로 묶는다. */
export function buildSplitZip(groups: SplitGroup[]): Uint8Array {
  const names = uniqueNames(groups.map((g) => sanitizeFileName(g.value)), 80);
  const files: Record<string, Uint8Array> = {};
  groups.forEach((g, i) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(g.rows.length ? g.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    files[`${names[i]}.xlsx`] = new Uint8Array(buf);
  });
  // xlsx는 이미 압축돼 있어 재압축 이득이 없다
  return zipSync(files, { level: 0 });
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

/** MergeResult를 단일 시트('합치기') xlsx로 만든다. 열 순서는 result.columns로 강제. */
export function buildMergeWorkbook(result: MergeResult): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(result.rows.length ? result.rows : [{}], {
    header: result.columns
  });
  XLSX.utils.book_append_sheet(wb, ws, '합치기');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
