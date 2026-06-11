import type { Grid, PageContent } from './types';
import { clusterGrid } from './cluster';
import { ruledGrid } from './ruled';

/** eps 이내를 같은 값으로 본 서로 다른 좌표 개수. */
const distinct = (ns: number[], eps = 1): number => {
  const s = [...ns].sort((a, b) => a - b);
  let count = 0;
  let prev = -Infinity;
  for (const n of s) if (n - prev > eps) { count++; prev = n; }
  return count;
};

/**
 * 페이지의 괘선이 충분(서로 다른 가로선 y ≥ 2 AND 세로선 x ≥ 2)하면 ruledGrid,
 * 아니면 clusterGrid로 폴백한다. 텍스트가 없으면 빈 격자.
 */
export function reconstructPage(page: PageContent): Grid {
  if (!page.items.length) return [];
  const hY = distinct(page.hLines.flatMap((l) => [l.y1, l.y2]));
  const vX = distinct(page.vLines.flatMap((l) => [l.x1, l.x2]));
  if (hY >= 2 && vX >= 2) {
    const g = ruledGrid(page.items, page.hLines, page.vLines);
    if (g.length) return g;
  }
  return clusterGrid(page.items);
}
