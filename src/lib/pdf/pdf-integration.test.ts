import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildPdfWorkbook } from './toWorkbook';
import type { PdfSheet } from './types';

function readBack(buf: ArrayBuffer): Record<string, string[][]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, string[][]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: ''
    });
  }
  return out;
}

const PAGES: PdfSheet[] = [
  { name: '1페이지', grid: [['이름', '부서'], ['김철수', '영업']] },
  { name: '2페이지', grid: [['상품', '수량'], ['연필', '3']] }
];

describe('buildPdfWorkbook 통합', () => {
  it('페이지별 시트가 만들어진다', () => {
    const wb = readBack(buildPdfWorkbook(PAGES));
    expect(Object.keys(wb)).toEqual(['1페이지', '2페이지']);
  });

  it('시트의 셀 값이 grid와 일치한다', () => {
    const wb = readBack(buildPdfWorkbook(PAGES));
    expect(wb['1페이지']).toEqual([['이름', '부서'], ['김철수', '영업']]);
    expect(wb['2페이지']).toEqual([['상품', '수량'], ['연필', '3']]);
  });

  it('빈 grid 페이지는 시트로 만들지 않는다', () => {
    const wb = readBack(buildPdfWorkbook([
      { name: '빈페이지', grid: [] },
      { name: '내용', grid: [['a']] }
    ]));
    expect(Object.keys(wb)).toEqual(['내용']);
  });
});
