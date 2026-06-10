import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { unzipSync } from 'fflate';
import { splitByColumn } from './split';
import { buildSplitWorkbook, buildSplitZip } from './export';
import type { Row } from './types';

const ROWS: Row[] = [
  { 이름: '김철수', 부서: '영업' },
  { 이름: '이영희', 부서: '인사' },
  { 이름: '박민수', 부서: '영업' }
];

function readBack(buf: ArrayBuffer): Record<string, Row[]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, Row[]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { raw: false, defval: '' });
  }
  return out;
}

describe('split→buildSplitWorkbook 통합', () => {
  it('그룹별 시트가 첫 등장 순서로 만들어진다', () => {
    const wb = readBack(buildSplitWorkbook(splitByColumn(ROWS, '부서')));
    expect(Object.keys(wb)).toEqual(['영업', '인사']);
  });

  it('각 시트의 행이 그룹과 일치한다', () => {
    const wb = readBack(buildSplitWorkbook(splitByColumn(ROWS, '부서')));
    expect(wb['영업'].map((r) => r.이름)).toEqual(['김철수', '박민수']);
    expect(wb['인사'].map((r) => r.이름)).toEqual(['이영희']);
  });

  it('시트명 금지문자가 들어간 값도 안전하게 시트가 된다', () => {
    const rows: Row[] = [
      { 이름: 'a', 팀: '영업/마케팅' },
      { 이름: 'b', 팀: '영업?마케팅' }
    ];
    const wb = readBack(buildSplitWorkbook(splitByColumn(rows, '팀')));
    expect(Object.keys(wb)).toEqual(['영업 마케팅', '영업 마케팅 (2)']);
  });
});

describe('split→buildSplitZip 통합', () => {
  it('그룹별 xlsx 파일이 ZIP에 들어간다', () => {
    const zip = unzipSync(buildSplitZip(splitByColumn(ROWS, '부서')));
    expect(Object.keys(zip).sort()).toEqual(['영업.xlsx', '인사.xlsx']);
  });

  it('ZIP 안 xlsx를 다시 읽으면 그룹 행과 일치한다', () => {
    const zip = unzipSync(buildSplitZip(splitByColumn(ROWS, '부서')));
    const wb = XLSX.read(zip['영업.xlsx'], { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], {
      raw: false,
      defval: ''
    });
    expect(rows.map((r) => r.이름)).toEqual(['김철수', '박민수']);
  });
});
