import type { Grid, TextItem } from './types';

const median = (ns: number[]): number => {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * TextItem 배열을 좌표 군집화로 표(Grid)로 복원한다. 선 정보 없이 위치만 사용.
 * 행 임계 = 중앙 height의 0.5배, 열 임계 = 중앙 width의 0.5배.
 */
export function clusterGrid(items: TextItem[]): Grid {
  if (!items.length) return [];

  // 1) 행 묶기: y 내림차순(위→아래)
  const rowThreshold = median(items.map((i) => i.height)) * 0.5 || 1;
  const byY = [...items].sort((a, b) => b.y - a.y);
  const rows: TextItem[][] = [];
  let cur: TextItem[] = [];
  let anchorY = Infinity;
  for (const it of byY) {
    if (cur.length === 0) {
      anchorY = it.y;
      cur.push(it);
    } else if (Math.abs(it.y - anchorY) <= rowThreshold) {
      cur.push(it);
    } else {
      rows.push(cur);
      cur = [it];
      anchorY = it.y;
    }
  }
  if (cur.length) rows.push(cur);

  // 2) 열 경계: 모든 x(left) 군집화(가까운 x끼리)
  const colThreshold = median(items.map((i) => i.width)) * 0.5 || 1;
  const xs = [...items.map((i) => i.x)].sort((a, b) => a - b);
  const cols: number[] = [];
  for (const x of xs) {
    if (!cols.length || x - cols[cols.length - 1] > colThreshold) cols.push(x);
  }

  // 3) 배치: 각 item을 가장 가까운 열에 할당, 같은 셀은 x순 공백 결합
  const nearestCol = (x: number): number => {
    let best = 0;
    let bestD = Infinity;
    cols.forEach((c, j) => {
      const d = Math.abs(x - c);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    return best;
  };

  return rows.map((row) => {
    const cells: TextItem[][] = cols.map(() => []);
    for (const it of row) cells[nearestCol(it.x)].push(it);
    return cells.map((cell) =>
      cell
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .trim()
    );
  });
}
