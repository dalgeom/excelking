import { describe, it, expect } from 'vitest';
import { detectColumns } from './detect';
import type { Row } from '../excel/types';

const rows: Row[] = [
  { 부서: '영업', 매출: '1000', 입사일: '2020-01-05', 메모: '특이사항 가' },
  { 부서: '인사', 매출: '2,000', 입사일: '2021-03-10', 메모: '특이사항 나' },
  { 부서: '영업', 매출: '₩3000', 입사일: '2022-06-01', 메모: '특이사항 다' },
  { 부서: '인사', 매출: '4000', 입사일: '2023-09-20', 메모: '특이사항 라' }
];

describe('detectColumns', () => {
  it('숫자가 대부분인 열은 number', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '매출')?.type).toBe('number');
  });

  it('날짜가 대부분인 열은 date', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '입사일')?.type).toBe('date');
  });

  it('반복되는 값(고유값 적음)은 category', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '부서')?.type).toBe('category');
  });

  it('고유값이 많은 자유 텍스트는 text', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '메모')?.type).toBe('text');
  });

  it('빈 셀은 무시하고 80% 임계로 판정한다', () => {
    const r: Row[] = [
      { v: '1' },
      { v: '2' },
      { v: '3' },
      { v: '4' },
      { v: '비숫자' }
    ];
    expect(detectColumns(['v'], r)[0].type).toBe('number'); // 4/5 = 80%
  });
});
