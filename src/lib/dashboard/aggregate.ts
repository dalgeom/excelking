import type { Row } from '../excel/types';
import type { Agg, AggResult } from './types';
import { parseNumber, parseDate } from './number';

const TOP = 12;

/**
 * rows를 dimension 값으로 그룹화하고 measure를 agg로 집계한다.
 * count는 그룹의 행 수, 그 외는 measure의 유효 숫자만 사용.
 * 날짜 차원은 시간순, 그 외는 값 내림차순 + 상위 12 + '기타'.
 */
export function aggregate(
  rows: Row[],
  dimension: string,
  measure: string | undefined,
  agg: Agg
): AggResult {
  const nums = new Map<string, number[]>();
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const row of rows) {
    const key = (row[dimension] ?? '').trim() || '(빈 값)';
    if (!counts.has(key)) {
      counts.set(key, 0);
      nums.set(key, []);
      order.push(key);
    }
    counts.set(key, counts.get(key)! + 1);
    if (measure) {
      const n = parseNumber(row[measure] ?? '');
      if (n !== null) nums.get(key)!.push(n);
    }
  }

  const reduce = (key: string): number => {
    if (agg === 'count') return counts.get(key)!;
    const arr = nums.get(key)!;
    if (arr.length === 0) return 0;
    if (agg === 'sum') return arr.reduce((a, b) => a + b, 0);
    if (agg === 'avg') return arr.reduce((a, b) => a + b, 0) / arr.length;
    if (agg === 'min') return Math.min(...arr);
    return Math.max(...arr); // 'max'
  };

  let entries = order.map((k) => ({ label: k, value: reduce(k) }));

  const allDates = entries.length > 0 && entries.every((e) => parseDate(e.label) !== null);
  if (allDates) {
    entries.sort((a, b) => parseDate(a.label)!.getTime() - parseDate(b.label)!.getTime());
  } else {
    entries.sort((a, b) => b.value - a.value);
    if (entries.length > TOP) {
      const top = entries.slice(0, TOP);
      const rest = entries.slice(TOP).reduce((s, e) => s + e.value, 0);
      top.push({ label: '기타', value: rest });
      entries = top;
    }
  }

  return { labels: entries.map((e) => e.label), values: entries.map((e) => e.value) };
}
