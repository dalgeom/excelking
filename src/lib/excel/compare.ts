import type { Row, CompareResult } from './types';

const norm = (v: unknown): string => String(v ?? '').trim();

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
