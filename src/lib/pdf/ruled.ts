import type { Grid, Line, TextItem } from './types';

/** 정렬·중복(eps 이내) 제거한 좌표 목록. */
const uniqSorted = (ns: number[], eps = 1): number[] => {
  const s = [...ns].sort((a, b) => a - b);
  const out: number[] = [];
  for (const n of s) if (!out.length || n - out[out.length - 1] > eps) out.push(n);
  return out;
};

/**
 * 가로선 y들(행 경계)·세로선 x들(열 경계)로 격자를 만들고
 * 각 텍스트를 중심좌표가 속한 셀에 배치한다. 선이 부족하면 빈 격자.
 */
export function ruledGrid(items: TextItem[], hLines: Line[], vLines: Line[]): Grid {
  const ys = uniqSorted(hLines.flatMap((l) => [l.y1, l.y2])).reverse(); // 위(큰 y)부터
  const xs = uniqSorted(vLines.flatMap((l) => [l.x1, l.x2]));
  if (ys.length < 2 || xs.length < 2) return [];

  const R = ys.length - 1;
  const C = xs.length - 1;
  const cells: TextItem[][][] = Array.from({ length: R }, () =>
    Array.from({ length: C }, () => [] as TextItem[])
  );

  for (const it of items) {
    const cx = it.x + it.width / 2;
    const cy = it.y;
    let r = -1;
    for (let i = 0; i < R; i++) if (cy <= ys[i] && cy > ys[i + 1]) { r = i; break; }
    let c = -1;
    for (let j = 0; j < C; j++) if (cx >= xs[j] && cx < xs[j + 1]) { c = j; break; }
    if (r >= 0 && c >= 0) cells[r][c].push(it);
  }

  return cells.map((row) =>
    row.map((cell) =>
      cell
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .trim()
    )
  );
}
