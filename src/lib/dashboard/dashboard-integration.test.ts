import { describe, it, expect } from 'vitest';
import { detectColumns } from './detect';
import { suggestCharts } from './suggest';
import { aggregate } from './aggregate';
import type { Row } from '../excel/types';

const columns = ['부서', '매출', '입사일'];
const rows: Row[] = [
  { 부서: '영업', 매출: '100', 입사일: '2026-01-01' },
  { 부서: '인사', 매출: '200', 입사일: '2026-02-01' },
  { 부서: '영업', 매출: '300', 입사일: '2026-03-01' }
];

describe('detect→suggest→aggregate 파이프라인', () => {
  it('감지된 타입으로 막대 차트가 추천되고 집계가 맞는다', () => {
    const cols = detectColumns(columns, rows);
    const specs = suggestCharts(cols, rows);
    const bar = specs.find((s) => s.kind === 'bar');
    expect(bar).toBeDefined();
    expect(bar!.dimension).toBe('부서');
    const data = aggregate(rows, bar!.dimension!, bar!.measure, bar!.agg);
    expect(data).toEqual({ labels: ['영업', '인사'], values: [400, 200] });
  });

  it('날짜 열이 감지되면 선 차트가 추천된다', () => {
    const cols = detectColumns(columns, rows);
    const specs = suggestCharts(cols, rows);
    expect(specs.some((s) => s.kind === 'line' && s.dimension === '입사일')).toBe(true);
  });
});
