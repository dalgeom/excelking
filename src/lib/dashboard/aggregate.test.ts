import { describe, it, expect } from 'vitest';
import { aggregate } from './aggregate';
import type { Row } from '../excel/types';

const rows: Row[] = [
  { 부서: '영업', 매출: '100' },
  { 부서: '인사', 매출: '200' },
  { 부서: '영업', 매출: '300' },
  { 부서: '인사', 매출: '50' }
];

describe('aggregate', () => {
  it('범주별 합계를 큰 순으로 낸다', () => {
    expect(aggregate(rows, '부서', '매출', 'sum')).toEqual({
      labels: ['영업', '인사'],
      values: [400, 250]
    });
  });

  it('범주별 개수를 낸다 (measure 없음)', () => {
    expect(aggregate(rows, '부서', undefined, 'count')).toEqual({
      labels: ['영업', '인사'],
      values: [2, 2]
    });
  });

  it('평균·최소·최대를 낸다', () => {
    expect(aggregate(rows, '부서', '매출', 'avg').values).toEqual([200, 125]);
    expect(aggregate(rows, '부서', '매출', 'min').values).toEqual([100, 50]);
    expect(aggregate(rows, '부서', '매출', 'max').values).toEqual([300, 200]);
  });

  it('날짜 차원은 시간순으로 정렬한다', () => {
    const r: Row[] = [
      { 날짜: '2026-03-01', 값: '3' },
      { 날짜: '2026-01-01', 값: '1' },
      { 날짜: '2026-02-01', 값: '2' }
    ];
    expect(aggregate(r, '날짜', '값', 'sum').labels).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01'
    ]);
  });

  it('범주가 12개를 넘으면 상위 12 + 기타로 묶는다', () => {
    const r: Row[] = Array.from({ length: 14 }, (_, i) => ({
      cat: `C${String(i).padStart(2, '0')}`,
      v: String(14 - i) // C00=14 … C13=1
    }));
    const result = aggregate(r, 'cat', 'v', 'sum');
    expect(result.labels).toHaveLength(13);
    expect(result.labels[12]).toBe('기타');
    expect(result.values[12]).toBe(3); // 상위12 제외 나머지 C12(2)+C13(1)=3
  });
});
