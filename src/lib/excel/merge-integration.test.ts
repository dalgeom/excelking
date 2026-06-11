import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { mergeRows } from './merge';
import { buildMergeWorkbook } from './export';
import type { MergeInput } from './merge';
import type { Row } from './types';

const files: MergeInput[] = [
  { name: '1월.xlsx', rows: [{ 이름: '김철수', 부서: '영업' }] },
  { name: '2월.xlsx', rows: [{ 이름: '박민수', 직급: '대리' }] }
];

function readBack(buf: ArrayBuffer): { sheet: string; rows: Row[]; header: string[] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.SheetNames[0];
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { raw: false, defval: '' });
  const header = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []) as string[];
  return { sheet, rows, header };
}

describe('merge→buildMergeWorkbook 통합', () => {
  it('단일 시트 "합치기"로 만들어진다', () => {
    const { sheet } = readBack(buildMergeWorkbook(mergeRows(files, true)));
    expect(sheet).toBe('합치기');
  });

  it('열 순서(출처·합집합)와 출처·빈 칸이 보존된다', () => {
    const { rows, header } = readBack(buildMergeWorkbook(mergeRows(files, true)));
    expect(header).toEqual(['출처', '이름', '부서', '직급']);
    expect(rows[0]).toEqual({ 출처: '1월.xlsx', 이름: '김철수', 부서: '영업', 직급: '' });
    expect(rows[1]).toEqual({ 출처: '2월.xlsx', 이름: '박민수', 부서: '', 직급: '대리' });
  });
});
