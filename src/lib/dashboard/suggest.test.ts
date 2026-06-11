import { describe, it, expect } from 'vitest';
import { suggestCharts } from './suggest';
import type { Column } from './types';

const cols = (defs: [string, Column['type']][]): Column[] =>
  defs.map(([name, type]) => ({ name, type }));

describe('suggestCharts', () => {
  it('범주+숫자가 있으면 KPI·막대·원형을 만든다', () => {
    const specs = suggestCharts(cols([['부서', 'category'], ['매출', 'number']]), []);
    const kinds = specs.map((s) => s.kind);
    expect(kinds).toContain('kpi');
    expect(kinds).toContain('bar');
    expect(kinds).toContain('pie');
  });

  it('항상 총 행 수 KPI를 포함한다', () => {
    const specs = suggestCharts(cols([['부서', 'category']]), []);
    expect(specs.some((s) => s.kind === 'kpi' && s.agg === 'count' && !s.measure)).toBe(true);
  });

  it('날짜+숫자가 있으면 선 차트를 만든다', () => {
    const specs = suggestCharts(cols([['날짜', 'date'], ['값', 'number']]), []);
    expect(specs.some((s) => s.kind === 'line' && s.dimension === '날짜')).toBe(true);
  });

  it('숫자 열이 없으면 막대는 개수(count)로 폴백한다', () => {
    const specs = suggestCharts(cols([['부서', 'category']]), []);
    const bar = specs.find((s) => s.kind === 'bar');
    expect(bar?.agg).toBe('count');
    expect(bar?.measure).toBeUndefined();
  });

  it('범주 열이 없으면 막대·원형을 만들지 않고, 총 개수는 6 이하다', () => {
    const specs = suggestCharts(cols([['값1', 'number'], ['값2', 'number'], ['메모', 'text']]), []);
    expect(specs.some((s) => s.kind === 'bar')).toBe(false);
    expect(specs.some((s) => s.kind === 'pie')).toBe(false);
    expect(specs.length).toBeLessThanOrEqual(6);
  });
});
