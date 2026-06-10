import type { Row } from './types';

export interface SplitGroup {
  /** 기준 열의 값(트림됨). 빈 값은 '(빈 값)' */
  value: string;
  rows: Row[];
}

const norm = (v: unknown): string => String(v ?? '').trim();

/**
 * 행 배열을 column 값 기준으로 그룹화한다.
 * 값은 앞뒤 공백을 무시하고, 빈 값은 '(빈 값)' 그룹으로 묶는다.
 * 그룹 순서는 값의 첫 등장 순서, 그룹 내 행 순서는 원본 순서를 유지한다.
 */
export function splitByColumn(rows: Row[], column: string): SplitGroup[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const key = norm(row[column]) || '(빈 값)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()].map(([value, rows]) => ({ value, rows }));
}
