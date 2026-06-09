import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { compareByKey } from './compare';
import { buildResultWorkbook } from './export';
import type { Row } from './types';

const A: Row[] = [
  { 사번: '1', 이름: '김철수', 부서: '영업' },
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '개발' }
];
const B: Row[] = [
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '기획' },
  { 사번: '4', 이름: '최지우', 부서: '영업' }
];

/** export한 바이너리를 다시 읽어 시트별 행 배열로 돌려준다. */
function readBack(buf: ArrayBuffer): Record<string, Row[]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, Row[]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { raw: false, defval: '' });
  }
  return out;
}

describe('compare→export 통합', () => {
  it('export 결과를 다시 읽으면 시트 3개(A에만/B에만/공통)가 있다', () => {
    const result = compareByKey(A, B, '사번');
    const wb = readBack(buildResultWorkbook(result, '사번'));
    expect(Object.keys(wb).sort()).toEqual(['A에만', 'B에만', '공통']);
  });

  it('A에만/B에만 시트의 행이 비교 결과와 일치한다', () => {
    const result = compareByKey(A, B, '사번');
    const wb = readBack(buildResultWorkbook(result, '사번'));
    expect(wb['A에만'].map((r) => r.사번)).toEqual(['1']);
    expect(wb['B에만'].map((r) => r.사번)).toEqual(['4']);
  });

  it('공통 시트에 변경여부 열이 채워진다 (사번3=변경됨, 사번2=동일)', () => {
    const result = compareByKey(A, B, '사번');
    const wb = readBack(buildResultWorkbook(result, '사번'));
    const byId = Object.fromEntries(wb['공통'].map((r) => [r.사번, r.변경여부]));
    expect(byId['2']).toBe('동일');
    expect(byId['3']).toBe('변경됨');
  });
});
