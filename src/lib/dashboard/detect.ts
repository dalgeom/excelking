import type { Row } from '../excel/types';
import type { Column, ColumnType } from './types';
import { parseNumber, parseDate } from './number';

function detectType(name: string, rows: Row[]): ColumnType {
  const values = rows.map((r) => (r[name] ?? '').trim()).filter((v) => v !== '');
  if (values.length === 0) return 'text';
  const numFrac = values.filter((v) => parseNumber(v) !== null).length / values.length;
  if (numFrac >= 0.8) return 'number';
  const dateFrac = values.filter((v) => parseDate(v) !== null).length / values.length;
  if (dateFrac >= 0.8) return 'date';
  const distinct = new Set(values).size;
  // 반복되는 값이 하나라도 있고(distinct < 행수) 고유값이 30 이하면 범주
  if (distinct < rows.length && distinct <= 30) return 'category';
  return 'text';
}

/** 각 열의 비어있지 않은 값을 표본으로 타입을 감지한다. */
export function detectColumns(columns: string[], rows: Row[]): Column[] {
  return columns.map((name) => ({ name, type: detectType(name, rows) }));
}
