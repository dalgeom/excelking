# pdf-to-excel (PDF 표 → 엑셀 추출) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 텍스트 레이어가 있는 PDF를 올리면 페이지의 표를 격자로 복원해 페이지별 시트 엑셀로 내려받는 도구 `/pdf-to-excel`을 출시한다 (미리보기 포함, 전 과정 브라우저 클라이언트 처리).

**Architecture:** C 하이브리드 — `cluster.ts`(좌표 군집화)·`ruled.ts`(괘선 격자)가 같은 `Grid = string[][]`를 출력하는 독립 순수 함수, `reconstruct.ts`가 페이지별로 둘 중 선택. pdf.js(`pdfjs-dist`)는 `extract.ts` 얇은 어댑터로 격리(클라이언트 동적 import). 정확도 본체인 순수 로직은 합성 데이터로 TDD, pdf.js는 픽스처/수동 QA.

**Tech Stack:** SvelteKit(Svelte 5 runes) + SheetJS(xlsx) + pdfjs-dist(신규) + vitest

**컨벤션 (이 repo):** 셀 값은 문자열, 한국어 describe/it·샘플 데이터, UI는 compare/split 페이지 구조·스타일 재사용, 한글 word-break:keep-all(전역 적용됨), 커밋 `feat:`/`test:` prefix·한 작업 한 커밋.

**상위 문서:** 스펙 `docs/superpowers/specs/2026-06-11-pdf-to-excel-design.md` (알고리즘 세부 §5, 에러 §7, 테스트 §8).

---

## File Structure

| 파일 | 책임 |
|------|------|
| Create `src/lib/pdf/types.ts` | `Grid`, `TextItem`, `Line`, `PageContent`, `PdfSheet` 타입 |
| Create `src/lib/pdf/cluster.ts` + `.test.ts` | A: `clusterGrid(items)` 좌표 군집화 (순수, TDD) |
| Create `src/lib/pdf/ruled.ts` + `.test.ts` | B: `ruledGrid(items,h,v)` 괘선 격자 (순수, TDD) |
| Create `src/lib/pdf/reconstruct.ts` + `.test.ts` | C: `reconstructPage(page)` 선택기 (순수, TDD) |
| Create `src/lib/pdf/toWorkbook.ts` + `pdf-integration.test.ts` | `buildPdfWorkbook(pages)` 페이지별 시트 (통합 round-trip). `names.ts` 재사용 |
| Create `src/lib/pdf/extract.ts` | pdf.js 어댑터 `extractPages(buf)` (브라우저 전용, best-effort, 수동 QA) |
| Create `src/routes/pdf-to-excel/+page.svelte` | 업로드→변환→미리보기→다운로드 + SEO 콘텐츠 |
| Modify `src/routes/+page.svelte` | 허브 카드(③) live 전환 |
| Modify `package.json` | pdfjs-dist 추가 (Task 1) |

---

### Task 1: 의존성 설치 + 타입 정의

**Files:**
- Modify: `package.json` (pdfjs-dist 설치)
- Create: `src/lib/pdf/types.ts`

- [ ] **Step 1: pdfjs-dist 설치**

Run: `npm install pdfjs-dist`
Expected: package.json dependencies에 `"pdfjs-dist"` 추가

- [ ] **Step 2: 타입 파일 작성**

`src/lib/pdf/types.ts`:

```ts
/** 표 1개를 나타내는 격자. 바깥 배열=행, 안쪽 배열=셀 값. */
export type Grid = string[][];

/** PDF에서 추출한 텍스트 조각 하나. 좌표는 PDF 좌하단 원점(y는 위로 갈수록 큼). */
export interface TextItem {
  str: string;
  x: number; // 왼쪽 시작
  y: number; // baseline y
  width: number;
  height: number;
}

/** 선분 하나(가로 또는 세로 괘선). */
export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** PDF 한 페이지의 추출 결과. */
export interface PageContent {
  width: number;
  height: number;
  items: TextItem[];
  hLines: Line[];
  vLines: Line[];
}

/** 엑셀 시트 하나로 내보낼 페이지 단위 데이터. */
export interface PdfSheet {
  name: string;
  grid: Grid;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npm run check`
Expected: 0 errors (기존 `node` 타입 경고 1개는 무관)

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json src/lib/pdf/types.ts
git commit -m "feat: pdfjs-dist 설치 + pdf 모듈 타입 정의"
```

---

### Task 2: 좌표 군집화 `clusterGrid` (TDD)

선 정보 없이 텍스트 좌표만으로 표를 복원한다. y로 행을 묶고, x를 군집화해 열을 잡는다.

**Files:**
- Create: `src/lib/pdf/cluster.ts`
- Test: `src/lib/pdf/cluster.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/pdf/cluster.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clusterGrid } from './cluster';
import type { TextItem } from './types';

/** 간단 생성기: 높이 10, 너비 40 기본 */
const T = (str: string, x: number, y: number, width = 40, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});

describe('clusterGrid', () => {
  it('y 간격으로 행을, x 군집으로 열을 잡아 격자를 만든다', () => {
    const items = [
      T('이름', 0, 100), T('부서', 100, 100), T('금액', 200, 100),
      T('김철수', 0, 80), T('영업', 100, 80), T('1000', 200, 80)
    ];
    expect(clusterGrid(items)).toEqual([
      ['이름', '부서', '금액'],
      ['김철수', '영업', '1000']
    ]);
  });

  it('같은 셀의 여러 조각은 x순으로 공백 결합한다', () => {
    // 열 임계 = 중앙 width(20)의 0.5배 = 10. '김'(x0)·'철수'(x8)는 gap 8 ≤ 10 → 한 열.
    const items = [
      T('김', 0, 100, 10), T('철수', 8, 100, 20), T('영업', 100, 100, 40)
    ];
    expect(clusterGrid(items)).toEqual([['김 철수', '영업']]);
  });

  it('같은 열의 x가 임계 내에서 흔들려도 한 열로 유지한다', () => {
    const items = [
      T('머리', 0, 100), T('값', 100, 100),
      T('머리2', 2, 80), T('값2', 103, 80)
    ];
    expect(clusterGrid(items)).toEqual([
      ['머리', '값'],
      ['머리2', '값2']
    ]);
  });

  it('한 열짜리(문단형)도 처리한다', () => {
    const items = [T('첫 줄', 0, 100), T('둘째 줄', 0, 80)];
    expect(clusterGrid(items)).toEqual([['첫 줄'], ['둘째 줄']]);
  });

  it('빈 입력은 빈 격자를 돌려준다', () => {
    expect(clusterGrid([])).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/pdf/cluster.test.ts`
Expected: FAIL — `Cannot find module './cluster'`

- [ ] **Step 3: 구현**

`src/lib/pdf/cluster.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/pdf/cluster.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pdf/cluster.ts src/lib/pdf/cluster.test.ts
git commit -m "feat: clusterGrid — 좌표 군집화로 표 복원 (TDD)"
```

---

### Task 3: 괘선 격자 `ruledGrid` (TDD)

가로선 y들로 행 경계를, 세로선 x들로 열 경계를 만들고, 텍스트 중심좌표가 속한 셀에 배치한다.

**Files:**
- Create: `src/lib/pdf/ruled.ts`
- Test: `src/lib/pdf/ruled.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/pdf/ruled.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ruledGrid } from './ruled';
import type { Line, TextItem } from './types';

const T = (str: string, x: number, y: number, width = 8, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});
const H = (y: number): Line => ({ x1: 0, y1: y, x2: 20, y2: y });
const V = (x: number): Line => ({ x1: x, y1: 0, x2: x, y2: 30 });

// 가로선 y=30,20,10 → 2행 / 세로선 x=0,10,20 → 2열
const h = [H(30), H(20), H(10)];
const v = [V(0), V(10), V(20)];

describe('ruledGrid', () => {
  it('괘선 격자에 텍스트를 중심좌표 기준으로 배치한다', () => {
    const items = [
      T('A', 3, 25), T('B', 13, 25),
      T('C', 3, 15), T('D', 13, 15)
    ];
    expect(ruledGrid(items, h, v)).toEqual([
      ['A', 'B'],
      ['C', 'D']
    ]);
  });

  it('값이 한 셀에만 들어가면 나머지 셀은 빈 문자열이다 (병합 흉내)', () => {
    const items = [T('제목', 3, 25)];
    expect(ruledGrid(items, h, v)).toEqual([
      ['제목', ''],
      ['', '']
    ]);
  });

  it('격자 밖(선 바깥) 텍스트는 무시한다', () => {
    const items = [T('밖', 3, 100), T('안', 3, 15)];
    expect(ruledGrid(items, h, v)).toEqual([
      ['', ''],
      ['안', '']
    ]);
  });

  it('가로선이나 세로선이 부족하면 빈 격자를 돌려준다', () => {
    expect(ruledGrid([T('x', 3, 25)], [H(30)], v)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/pdf/ruled.test.ts`
Expected: FAIL — `Cannot find module './ruled'`

- [ ] **Step 3: 구현**

`src/lib/pdf/ruled.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/pdf/ruled.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pdf/ruled.ts src/lib/pdf/ruled.test.ts
git commit -m "feat: ruledGrid — 괘선 격자로 표 복원 (TDD)"
```

---

### Task 4: 선택기 `reconstructPage` (TDD)

페이지의 괘선이 충분하면 `ruledGrid`, 아니면 `clusterGrid`로 폴백한다.

**Files:**
- Create: `src/lib/pdf/reconstruct.ts`
- Test: `src/lib/pdf/reconstruct.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/pdf/reconstruct.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reconstructPage } from './reconstruct';
import type { Line, PageContent, TextItem } from './types';

const T = (str: string, x: number, y: number, width = 8, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});
const H = (y: number): Line => ({ x1: 0, y1: y, x2: 20, y2: y });
const V = (x: number): Line => ({ x1: x, y1: 0, x2: x, y2: 30 });

const page = (over: Partial<PageContent>): PageContent => ({
  width: 100,
  height: 100,
  items: [],
  hLines: [],
  vLines: [],
  ...over
});

describe('reconstructPage', () => {
  it('괘선이 충분하면 괘선 격자(ruled)를 쓴다', () => {
    const p = page({
      items: [T('A', 3, 25), T('B', 13, 25), T('C', 3, 15), T('D', 13, 15)],
      hLines: [H(30), H(20), H(10)],
      vLines: [V(0), V(10), V(20)]
    });
    expect(reconstructPage(p)).toEqual([
      ['A', 'B'],
      ['C', 'D']
    ]);
  });

  it('괘선이 없으면 좌표 군집화(cluster)로 폴백한다', () => {
    const p = page({
      items: [T('이름', 0, 100, 40), T('부서', 100, 100, 40), T('김', 0, 80, 40), T('영업', 100, 80, 40)]
    });
    expect(reconstructPage(p)).toEqual([
      ['이름', '부서'],
      ['김', '영업']
    ]);
  });

  it('가로선 1줄만 있으면(불충분) 군집화로 폴백한다', () => {
    const p = page({
      items: [T('이름', 0, 100, 40), T('부서', 100, 100, 40)],
      hLines: [H(30)],
      vLines: [V(0), V(10), V(20)]
    });
    expect(reconstructPage(p)).toEqual([['이름', '부서']]);
  });

  it('텍스트가 없으면 빈 격자를 돌려준다', () => {
    expect(reconstructPage(page({}))).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/pdf/reconstruct.test.ts`
Expected: FAIL — `Cannot find module './reconstruct'`

- [ ] **Step 3: 구현**

`src/lib/pdf/reconstruct.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/pdf/reconstruct.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pdf/reconstruct.ts src/lib/pdf/reconstruct.test.ts
git commit -m "feat: reconstructPage — 괘선/군집 선택기 (TDD)"
```

---

### Task 5: 엑셀 내보내기 `buildPdfWorkbook` (통합 round-trip)

페이지별 Grid를 시트로 묶는다. 빈 그리드(표 없는 페이지)는 스킵. 시트명은 기존 `names.ts` 재사용.

**Files:**
- Create: `src/lib/pdf/toWorkbook.ts`
- Test: `src/lib/pdf/pdf-integration.test.ts`

- [ ] **Step 1: 실패하는 round-trip 테스트 작성**

`src/lib/pdf/pdf-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildPdfWorkbook } from './toWorkbook';
import type { PdfSheet } from './types';

function readBack(buf: ArrayBuffer): Record<string, string[][]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, string[][]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: ''
    });
  }
  return out;
}

const PAGES: PdfSheet[] = [
  { name: '1페이지', grid: [['이름', '부서'], ['김철수', '영업']] },
  { name: '2페이지', grid: [['상품', '수량'], ['연필', '3']] }
];

describe('buildPdfWorkbook 통합', () => {
  it('페이지별 시트가 만들어진다', () => {
    const wb = readBack(buildPdfWorkbook(PAGES));
    expect(Object.keys(wb)).toEqual(['1페이지', '2페이지']);
  });

  it('시트의 셀 값이 grid와 일치한다', () => {
    const wb = readBack(buildPdfWorkbook(PAGES));
    expect(wb['1페이지']).toEqual([['이름', '부서'], ['김철수', '영업']]);
    expect(wb['2페이지']).toEqual([['상품', '수량'], ['연필', '3']]);
  });

  it('빈 grid 페이지는 시트로 만들지 않는다', () => {
    const wb = readBack(buildPdfWorkbook([
      { name: '빈페이지', grid: [] },
      { name: '내용', grid: [['a']] }
    ]));
    expect(Object.keys(wb)).toEqual(['내용']);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/pdf/pdf-integration.test.ts`
Expected: FAIL — `Cannot find module './toWorkbook'`

- [ ] **Step 3: 구현**

`src/lib/pdf/toWorkbook.ts`:

```ts
import * as XLSX from 'xlsx';
import type { PdfSheet } from './types';
import { sanitizeSheetName, uniqueNames } from '../excel/names';

/** 페이지별 Grid를 시트로 묶어 xlsx(ArrayBuffer)로 만든다. 빈 그리드 페이지는 스킵. */
export function buildPdfWorkbook(pages: PdfSheet[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const nonEmpty = pages.filter((p) => p.grid.length > 0);
  const names = uniqueNames(nonEmpty.map((p) => sanitizeSheetName(p.name)), 31);
  nonEmpty.forEach((p, i) => {
    const ws = XLSX.utils.aoa_to_sheet(p.grid);
    XLSX.utils.book_append_sheet(wb, ws, names[i]);
  });
  if (!wb.SheetNames.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), 'Sheet1');
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/pdf/pdf-integration.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 전체 테스트 확인**

Run: `npm test`
Expected: PASS — 기존 26 + cluster 5 + ruled 4 + reconstruct 4 + pdf-integration 3 = 42 tests

- [ ] **Step 6: 커밋**

```bash
git add src/lib/pdf/toWorkbook.ts src/lib/pdf/pdf-integration.test.ts
git commit -m "feat: buildPdfWorkbook — 페이지별 시트 엑셀 내보내기"
```

---

### Task 6: pdf.js 어댑터 `extractPages` (best-effort, 수동 QA)

PDF를 페이지별 `PageContent`로 추출한다. 텍스트는 `getTextContent`, 괘선은 `getOperatorList`의 path/rectangle op에서 best-effort로 뽑는다. **순수 단위 테스트 없음** — pdf.js는 브라우저/Worker 의존이라 Task 7 dev 렌더 + 수동 QA로 검증한다 (스펙 §8-3).

**Files:**
- Create: `src/lib/pdf/extract.ts`

- [ ] **Step 1: 어댑터 작성**

`src/lib/pdf/extract.ts`:

```ts
import type { Line, PageContent, TextItem } from './types';

/** getOperatorList에서 가로/세로 직선을 best-effort로 추출한다. CTM 미적용(단순 표 가정). */
async function extractLines(page: any, OPS: any): Promise<{ hLines: Line[]; vLines: Line[] }> {
  const opList = await page.getOperatorList();
  const hLines: Line[] = [];
  const vLines: Line[] = [];
  const eps = 2;
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    if (Math.abs(y1 - y2) <= eps && Math.abs(x1 - x2) > eps) hLines.push({ x1, y1, x2, y2 });
    else if (Math.abs(x1 - x2) <= eps && Math.abs(y1 - y2) > eps) vLines.push({ x1, y1, x2, y2 });
  };
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== OPS.constructPath) continue;
    const [ops, coords] = opList.argsArray[i];
    let cx = 0;
    let cy = 0;
    let k = 0;
    let aborted = false;
    for (const op of ops) {
      if (op === OPS.moveTo) {
        cx = coords[k++];
        cy = coords[k++];
      } else if (op === OPS.lineTo) {
        const nx = coords[k++];
        const ny = coords[k++];
        add(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
      } else if (op === OPS.rectangle) {
        const x = coords[k++];
        const y = coords[k++];
        const w = coords[k++];
        const h = coords[k++];
        add(x, y, x + w, y);
        add(x, y + h, x + w, y + h);
        add(x, y, x, y + h);
        add(x + w, y, x + w, y + h);
        cx = x;
        cy = y;
      } else {
        aborted = true; // 알 수 없는 op(curveTo 등) → 좌표 소비 추정 불가, 이 path 중단
        break;
      }
    }
    void aborted;
  }
  return { hLines, vLines };
}

/**
 * PDF ArrayBuffer를 페이지별 PageContent로 추출한다. (브라우저 전용 — pdfjs 동적 로드)
 * 텍스트가 한 글자도 없으면 스캔본으로 간주, 빈 items 페이지가 된다.
 */
export async function extractPages(buf: ArrayBuffer): Promise<PageContent[]> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: PageContent[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items: TextItem[] = tc.items
      .filter((it: any) => typeof it.str === 'string' && it.str.trim() !== '')
      .map((it: any) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width,
        height: it.height
      }));
    const { hLines, vLines } = await extractLines(page, pdfjs.OPS);
    pages.push({ width: viewport.width, height: viewport.height, items, hLines, vLines });
  }
  return pages;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

주의: worker import 경로 `pdfjs-dist/build/pdf.worker.min.mjs?url`가 설치된 버전에 없으면 Task 7 빌드에서 드러난다. 그 경우 `pdfjs-dist/build/pdf.worker.mjs?url`로 교체 (둘 다 안 되면 `node_modules/pdfjs-dist/build/`에서 실제 worker 파일명 확인).

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pdf/extract.ts
git commit -m "feat: extractPages — pdf.js 어댑터(텍스트+괘선 추출, best-effort)"
```

---

### Task 7: `/pdf-to-excel` 페이지 UI + SEO 콘텐츠

**Files:**
- Create: `src/routes/pdf-to-excel/+page.svelte`

- [ ] **Step 1: 페이지 작성**

`src/routes/pdf-to-excel/+page.svelte`:

```svelte
<script lang="ts">
  import { reconstructPage } from '$lib/pdf/reconstruct';
  import { buildPdfWorkbook } from '$lib/pdf/toWorkbook';
  import type { PdfSheet } from '$lib/pdf/types';

  let fileName = $state('');
  let pages = $state<PdfSheet[] | null>(null);
  let busy = $state(false);
  let error = $state('');

  const PREVIEW_ROWS = 50;

  async function onUpload(e: Event) {
    error = '';
    pages = null;
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    fileName = f.name.replace(/\.[^.]+$/, '');
    busy = true;
    try {
      const { extractPages } = await import('$lib/pdf/extract');
      const contents = await extractPages(await f.arrayBuffer());
      const result: PdfSheet[] = contents.map((p, i) => ({
        name: `${i + 1}페이지`,
        grid: reconstructPage(p)
      }));
      if (result.every((p) => p.grid.length === 0)) {
        error =
          '표를 찾지 못했습니다. 텍스트가 없는 스캔본(이미지) PDF는 지원하지 않습니다(OCR 필요).';
        return;
      }
      pages = result;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (/password/i.test(msg)) error = '암호가 걸린 PDF는 열 수 없습니다.';
      else error = 'PDF를 읽지 못했습니다. 올바른 PDF인지 확인해 주세요.';
    } finally {
      busy = false;
    }
  }

  function download() {
    if (!pages) return;
    const bytes = buildPdfWorkbook(pages);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_표.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>PDF 표 엑셀 변환 — PDF 표를 엑셀로 추출 | 엑셀왕</title>
  <meta
    name="description"
    content="PDF 안의 표를 엑셀(.xlsx)로 추출하세요. 페이지별 시트로 변환, 미리보기 제공. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>PDF 표 → 엑셀 추출</h1>
<p class="lead">PDF를 올리면 표를 찾아 페이지별 시트 엑셀로 만들어 드립니다. 다운로드 전 미리보기로 확인하세요.</p>

<div class="uploads">
  <label class="drop">
    <span>PDF 파일 {fileName ? `· ${fileName}` : ''}</span>
    <input type="file" accept="application/pdf,.pdf" onchange={onUpload} />
  </label>
</div>

{#if busy}<p class="busy">PDF를 처리하는 중입니다…</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

{#if pages}
  <div class="summary">
    <div class="stat"><strong>{pages.length}</strong><span>페이지</span></div>
    <div class="stat">
      <strong>{pages.filter((p) => p.grid.length > 0).length}</strong><span>표 추출됨</span>
    </div>
  </div>

  <button class="primary" onclick={download}>엑셀 다운로드</button>

  <div class="previews">
    {#each pages as p, i}
      <div class="preview">
        <h3>{i + 1}페이지</h3>
        {#if p.grid.length === 0}
          <p class="muted">표를 찾지 못했습니다.</p>
        {:else}
          <div class="tablewrap">
            <table>
              <tbody>
                {#each p.grid.slice(0, PREVIEW_ROWS) as row}
                  <tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if p.grid.length > PREVIEW_ROWS}
            <p class="muted">…상위 {PREVIEW_ROWS}행만 미리보기. 전체는 다운로드해서 확인하세요.</p>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>표가 들어 있는 PDF 파일을 올립니다. (텍스트로 된 디지털 PDF)</li>
    <li>잠시 기다리면 페이지별로 추출된 표를 미리보기로 보여줍니다.</li>
    <li>[엑셀 다운로드]로 페이지마다 시트가 나뉜 .xlsx 파일을 받습니다.</li>
    <li>표가 일부 어긋났다면 받은 엑셀에서 바로 수정하세요.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>거래명세서·세금계산서 PDF의 품목 표를 엑셀로 옮길 때</li>
    <li>은행 거래내역 PDF를 정리·합계 내고 싶을 때</li>
    <li>보고서·논문 속 표를 복붙하면 깨져서 곤란할 때</li>
    <li>여러 페이지에 걸친 표를 한 번에 엑셀로</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. PDF 분석과 엑셀 생성 모두 브라우저 안에서만 이뤄지고, 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>스캔한 PDF(이미지)도 되나요?</h3>
  <p>아니요. 글자를 선택·복사할 수 있는 텍스트 PDF만 지원합니다. 스캔본(이미지)은 글자 정보가 없어 추출되지 않으며, 이 경우 OCR이 필요합니다.</p>
  <h3>표가 어긋나게 추출되면요?</h3>
  <p>PDF 구조에 따라 셀이 합쳐지거나 어긋날 수 있습니다. 미리보기로 확인한 뒤, 받은 엑셀에서 직접 수정하시면 됩니다. 점차 정확도를 개선하고 있습니다.</p>
  <h3>여러 페이지 PDF는 어떻게 되나요?</h3>
  <p>각 페이지가 엑셀의 별도 시트로 만들어집니다. 표가 없는 페이지는 시트를 만들지 않습니다.</p>

  <!-- AdSense 광고 슬롯 (승인 후 코드 삽입) -->
  <div class="ad-slot" aria-hidden="true"></div>
</section>

<style>
  h1 { font-size: 28px; margin: 0 0 8px; }
  .lead { color: #555; margin: 0 0 24px; }
  .uploads { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .drop {
    display: flex; flex-direction: column; gap: 8px;
    border: 1.5px dashed #ccc; border-radius: 12px; padding: 20px; cursor: pointer;
  }
  .drop span { font-weight: 600; font-size: 14px; }
  .busy { color: #1a73e8; margin: 16px 0; }
  button {
    padding: 9px 18px; border: none; border-radius: 8px;
    background: #1a73e8; color: #fff; font-weight: 600; cursor: pointer;
  }
  button.primary { margin: 16px 0; }
  .summary { display: flex; gap: 12px; margin: 24px 0 8px; flex-wrap: wrap; }
  .stat {
    flex: 1; min-width: 90px; border: 1px solid #eee; border-radius: 12px;
    padding: 16px; text-align: center;
  }
  .stat strong { display: block; font-size: 24px; }
  .stat span { font-size: 13px; color: #777; }
  .previews { display: flex; flex-direction: column; gap: 24px; margin-top: 16px; }
  .preview h3 { font-size: 15px; margin: 0 0 8px; color: #555; }
  .tablewrap { overflow-x: auto; border: 1px solid #eee; border-radius: 10px; }
  table { border-collapse: collapse; font-size: 13px; }
  td { border: 1px solid #eee; padding: 6px 10px; white-space: nowrap; }
  .muted { color: #999; font-size: 13px; margin: 8px 0 0; }
  .error { color: #d33; }
  .privacy { margin-top: 32px; color: #888; font-size: 13px; }
  .content { margin-top: 48px; border-top: 1px solid #eee; padding-top: 32px; }
  .content h2 { font-size: 20px; margin: 28px 0 12px; }
  .content h3 { font-size: 16px; margin: 18px 0 6px; }
  .content p, .content li { color: #444; line-height: 1.7; }
  .ad-slot { min-height: 90px; margin-top: 32px; }
</style>
```

- [ ] **Step 2: 타입 체크 + 빌드**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 빌드 성공. **pdfjs worker 관련 에러가 나면** Task 6 Step 2 주의의 worker 경로로 교체 후 재빌드.

- [ ] **Step 3: dev 서버 수동 QA (pdf.js 검증의 핵심)**

Run: `npm run dev` → `http://localhost:5173/pdf-to-excel` (5173 점유 시 5174)
- 선 있는 표 PDF(예: 거래명세서) 1개 업로드 → 미리보기 표가 그럴듯한지 확인 → 다운로드 → 엑셀 열어 셀 확인
- 선 없는 표/보고서 PDF 1개 업로드 → 미리보기 확인
- 스캔본(있으면) 또는 표 없는 PDF → "표를 찾지 못했습니다…" 안내 확인
- browse skill 사용 가능하면 활용. 정확도가 완벽할 필요는 없음(점진 개선) — 크래시·빈 화면·잘못된 다운로드가 없는지가 합격선.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/pdf-to-excel/+page.svelte
git commit -m "feat: /pdf-to-excel 페이지 — 업로드·미리보기·다운로드 + 콘텐츠"
```

---

### Task 8: 허브 카드 활성화 + 전체 검증 + 배포

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: 허브 카드 live 전환**

`src/routes/+page.svelte`에서 PDF 카드 줄을 찾는다:

```ts
    { href: '#', title: 'PDF 표 → 엑셀 추출', desc: '준비 중', live: false },
```

다음으로 교체:

```ts
    {
      href: '/pdf-to-excel',
      title: 'PDF 표 → 엑셀 추출',
      desc: 'PDF 속 표를 찾아 페이지별 시트 엑셀로 추출합니다.',
      live: true
    },
```

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: PASS (42 tests)

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 허브에 pdf-to-excel 카드 활성화"
```

- [ ] **Step 4: 배포 (사용자 확인 후)**

`main` push = Cloudflare Pages 자동배포. push 전 사용자에게 배포 여부 확인.

```bash
git push origin main
```

배포 후: https://excelking.pages.dev/pdf-to-excel HTTP 200 + 렌더 확인. (CF Git 연동 끊김 이력 있음 — 배포 안 뜨면 대시보드 재연결 확인, 메모리 `project_excelking` 참고)
