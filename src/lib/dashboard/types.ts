export type ColumnType = 'number' | 'date' | 'category' | 'text';

export interface Column {
  name: string;
  type: ColumnType;
}

export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max';

export type ChartKind = 'kpi' | 'bar' | 'line' | 'pie';

export interface ChartSpec {
  id: string;
  kind: ChartKind;
  dimension?: string; // 범주/날짜 열 (kpi는 없음)
  measure?: string; // 숫자 열 (count·행수 KPI는 없음)
  agg: Agg;
  title: string;
}

export interface AggResult {
  labels: string[];
  values: number[];
}
