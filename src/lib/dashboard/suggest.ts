import type { Row } from '../excel/types';
import type { Column, ChartSpec } from './types';

/** 감지된 열로 기본 대시보드(KPI·막대·선·원형, 최대 6개)를 구성한다. */
export function suggestCharts(columns: Column[], _rows: Row[]): ChartSpec[] {
  const nums = columns.filter((c) => c.type === 'number');
  const cats = columns.filter((c) => c.type === 'category');
  const dates = columns.filter((c) => c.type === 'date');
  const specs: ChartSpec[] = [];

  // KPI: 총 행 수
  specs.push({ id: 'kpi-rows', kind: 'kpi', agg: 'count', title: '총 행 수' });
  // KPI: 숫자 열 상위 2개 합
  nums.slice(0, 2).forEach((c, i) =>
    specs.push({ id: `kpi-sum-${i}`, kind: 'kpi', measure: c.name, agg: 'sum', title: `${c.name} 합계` })
  );

  // 막대: 첫 범주 × 첫 숫자(없으면 개수)
  if (cats.length) {
    const measure = nums[0]?.name;
    specs.push({
      id: 'bar-0',
      kind: 'bar',
      dimension: cats[0].name,
      measure,
      agg: measure ? 'sum' : 'count',
      title: measure ? `${cats[0].name}별 ${measure} 합계` : `${cats[0].name}별 개수`
    });
  }

  // 선: 날짜 × 첫 숫자
  if (dates.length && nums.length) {
    specs.push({
      id: 'line-0',
      kind: 'line',
      dimension: dates[0].name,
      measure: nums[0].name,
      agg: 'sum',
      title: `${dates[0].name}별 ${nums[0].name} 추이`
    });
  }

  // 원형: 첫 범주 구성비
  if (cats.length) {
    specs.push({ id: 'pie-0', kind: 'pie', dimension: cats[0].name, agg: 'count', title: `${cats[0].name} 구성비` });
  }

  return specs;
}
