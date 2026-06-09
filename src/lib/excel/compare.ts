import type { Row, CompareResult } from './types';

const norm = (v: unknown): string => String(v ?? '').trim();

/**
 * 두 행 배열을 keyColumn 기준으로 비교한다.
 * 키 값은 앞뒤 공백을 무시하며, 키가 중복되면 각 배열에서 마지막 행을 사용한다.
 * keyColumn이 행에 없으면 그 행의 키는 빈 문자열('')로 처리된다.
 */
export function compareByKey(rowsA: Row[], rowsB: Row[], keyColumn: string): CompareResult {
  const mapA = new Map<string, Row>();
  const mapB = new Map<string, Row>();
  for (const row of rowsA) mapA.set(norm(row[keyColumn]), row);
  for (const row of rowsB) mapB.set(norm(row[keyColumn]), row);

  const result: CompareResult = { onlyA: [], onlyB: [], both: [], changed: [] };

  for (const [key, row] of mapA) {
    if (!mapB.has(key)) {
      result.onlyA.push(row);
      continue;
    }
    result.both.push(row);
    const b = mapB.get(key)!;
    const cols = new Set([...Object.keys(row), ...Object.keys(b)]);
    const diffColumns: string[] = [];
    for (const c of cols) {
      if (c === keyColumn) continue;
      if (norm(row[c]) !== norm(b[c])) diffColumns.push(c);
    }
    if (diffColumns.length > 0) result.changed.push({ key, a: row, b, diffColumns });
  }

  for (const [key, row] of mapB) {
    if (!mapA.has(key)) result.onlyB.push(row);
  }

  return result;
}
