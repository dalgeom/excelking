# excel-dashboard (엑셀 자동 대시보드) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀을 올리면 열 타입을 자동 감지해 KPI·막대·선·원형 차트 대시보드를 즉시 생성하고, 차트 추가/제거 후 PNG로 저장하는 도구 `/excel-dashboard`를 출시한다 (전 과정 브라우저 클라이언트 처리).

**Architecture:** 순수 로직(열 타입 감지 `detect` → 집계 `aggregate` → 자동 차트 추천 `suggest`, 숫자/날짜 파서 `number`)을 `$lib/dashboard/`에 TDD로 격리. 렌더링(Chart.js)·내보내기(html2canvas)는 `/excel-dashboard` 페이지에서 클라이언트 동적 import 어댑터로. 정확도 본체인 순수 로직은 합성 데이터로 단위 테스트, 차트/이미지는 dev·수동 QA.

**Tech Stack:** SvelteKit(Svelte 5 runes) + SheetJS(xlsx, 기존) + chart.js(신규) + html2canvas(신규) + vitest

**컨벤션 (이 repo):** 셀 값은 문자열(`Row = Record<string,string>`, `$lib/excel/types`에서 재사용), 한국어 describe/it·샘플 데이터, UI는 compare/split/pdf 페이지 구조·스타일 재사용, 한글 word-break:keep-all(전역), 커밋 `feat:`/`test:` prefix·한 작업 한 커밋.

**상위 문서:** 스펙 `docs/superpowers/specs/2026-06-11-excel-dashboard-design.md` (알고리즘 §5, 흐름 §6, 에러 §7, 테스트 §8).

---

## File Structure

| 파일 | 책임 |
|------|------|
| Create `src/lib/dashboard/types.ts` | `ColumnType`, `Column`, `Agg`, `ChartKind`, `ChartSpec`, `AggResult` |
| Create `src/lib/dashboard/number.ts` + `.test.ts` | `parseNumber`·`parseDate` (순수, TDD) |
| Create `src/lib/dashboard/detect.ts` + `.test.ts` | `detectColumns` 열 타입 감지 (순수, TDD) |
| Create `src/lib/dashboard/aggregate.ts` + `.test.ts` | `aggregate` 범주/날짜별 집계 (순수, TDD) |
| Create `src/lib/dashboard/suggest.ts` + `.test.ts` | `suggestCharts` 자동 차트 선정 (순수, TDD) |
| Create `src/lib/dashboard/dashboard-integration.test.ts` | detect→suggest→aggregate 파이프라인 통합 |
| Create `src/routes/excel-dashboard/+page.svelte` | 업로드→자동생성→Chart.js 렌더→수정→PNG + 콘텐츠 |
| Modify `src/routes/+page.svelte` | 허브 카드(⑤) live 전환 |
| Modify `package.json` | chart.js, html2canvas 추가 (Task 1) |

---

### Task 1: 의존성 + 타입 정의

**Files:**
- Modify: `package.json`
- Create: `src/lib/dashboard/types.ts`

- [ ] **Step 1: 의존성 설치**

Run: `npm install chart.js html2canvas`
Expected: package.json dependencies에 `chart.js`, `html2canvas` 추가

- [ ] **Step 2: 타입 작성**

`src/lib/dashboard/types.ts`:

```ts
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
```

- [ ] **Step 3: 타입 체크**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json src/lib/dashboard/types.ts
git commit -m "feat: chart.js·html2canvas 설치 + dashboard 타입 정의"
```

---

### Task 2: 숫자/날짜 파서 `number.ts` (TDD)

**Files:**
- Create: `src/lib/dashboard/number.ts`
- Test: `src/lib/dashboard/number.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/dashboard/number.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseNumber, parseDate } from './number';

describe('parseNumber', () => {
  it('콤마·통화·% ·공백을 제거하고 숫자로 만든다', () => {
    expect(parseNumber('1,000')).toBe(1000);
    expect(parseNumber('₩5000')).toBe(5000);
    expect(parseNumber('12%')).toBe(12);
    expect(parseNumber(' 3.14 ')).toBe(3.14);
    expect(parseNumber('-5')).toBe(-5);
  });

  it('빈 문자열·비숫자는 null', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
    expect(parseNumber('영업')).toBeNull();
  });
});

describe('parseDate', () => {
  it('여러 날짜 형식을 파싱한다', () => {
    expect(parseDate('2026-06-11')?.getTime()).toBe(new Date(2026, 5, 11).getTime());
    expect(parseDate('2026/6/1')?.getTime()).toBe(new Date(2026, 5, 1).getTime());
    expect(parseDate('2026.06.11')?.getTime()).toBe(new Date(2026, 5, 11).getTime());
    expect(parseDate('2026년 6월')?.getTime()).toBe(new Date(2026, 5, 1).getTime());
    expect(parseDate('2026년 6월 5일')?.getTime()).toBe(new Date(2026, 5, 5).getTime());
  });

  it('비날짜는 null', () => {
    expect(parseDate('영업')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('1000')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/dashboard/number.test.ts`
Expected: FAIL — `Cannot find module './number'`

- [ ] **Step 3: 구현**

`src/lib/dashboard/number.ts`:

```ts
/** 콤마·통화기호(₩,$)·%·공백을 제거하고 숫자로 만든다. 실패 시 null. */
export function parseNumber(s: string): number | null {
  if (typeof s !== 'string') return null;
  const cleaned = s.replace(/[\s,₩$%]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY년 MM월 [DD일] 을 Date로. 실패 시 null. */
export function parseDate(s: string): Date | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = t.match(/^(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1);
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/dashboard/number.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/dashboard/number.ts src/lib/dashboard/number.test.ts
git commit -m "feat: parseNumber·parseDate — 숫자/날짜 파서 (TDD)"
```

---

### Task 3: 열 타입 감지 `detectColumns` (TDD)

**Files:**
- Create: `src/lib/dashboard/detect.ts`
- Test: `src/lib/dashboard/detect.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/dashboard/detect.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectColumns } from './detect';
import type { Row } from '../excel/types';

const rows: Row[] = [
  { 부서: '영업', 매출: '1000', 입사일: '2020-01-05', 메모: '특이사항 가' },
  { 부서: '인사', 매출: '2,000', 입사일: '2021-03-10', 메모: '특이사항 나' },
  { 부서: '영업', 매출: '₩3000', 입사일: '2022-06-01', 메모: '특이사항 다' },
  { 부서: '인사', 매출: '4000', 입사일: '2023-09-20', 메모: '특이사항 라' }
];

describe('detectColumns', () => {
  it('숫자가 대부분인 열은 number', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '매출')?.type).toBe('number');
  });

  it('날짜가 대부분인 열은 date', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '입사일')?.type).toBe('date');
  });

  it('반복되는 값(고유값 적음)은 category', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '부서')?.type).toBe('category');
  });

  it('고유값이 많은 자유 텍스트는 text', () => {
    const cols = detectColumns(['부서', '매출', '입사일', '메모'], rows);
    expect(cols.find((c) => c.name === '메모')?.type).toBe('text');
  });

  it('빈 셀은 무시하고 80% 임계로 판정한다', () => {
    const r: Row[] = [
      { v: '1' },
      { v: '2' },
      { v: '3' },
      { v: '4' },
      { v: '비숫자' }
    ];
    expect(detectColumns(['v'], r)[0].type).toBe('number'); // 4/5 = 80%
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/dashboard/detect.test.ts`
Expected: FAIL — `Cannot find module './detect'`

- [ ] **Step 3: 구현**

`src/lib/dashboard/detect.ts`:

```ts
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
  if (distinct <= rows.length * 0.5 && distinct <= 30) return 'category';
  return 'text';
}

/** 각 열의 비어있지 않은 값을 표본으로 타입을 감지한다. */
export function detectColumns(columns: string[], rows: Row[]): Column[] {
  return columns.map((name) => ({ name, type: detectType(name, rows) }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/dashboard/detect.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/dashboard/detect.ts src/lib/dashboard/detect.test.ts
git commit -m "feat: detectColumns — 열 타입 감지 (TDD)"
```

---

### Task 4: 집계 `aggregate` (TDD)

**Files:**
- Create: `src/lib/dashboard/aggregate.ts`
- Test: `src/lib/dashboard/aggregate.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/dashboard/aggregate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { aggregate } from './aggregate';
import type { Row } from '../excel/types';

const rows: Row[] = [
  { 부서: '영업', 매출: '100' },
  { 부서: '인사', 매출: '200' },
  { 부서: '영업', 매출: '300' },
  { 부서: '인사', 매출: '50' }
];

describe('aggregate', () => {
  it('범주별 합계를 큰 순으로 낸다', () => {
    expect(aggregate(rows, '부서', '매출', 'sum')).toEqual({
      labels: ['영업', '인사'],
      values: [400, 250]
    });
  });

  it('범주별 개수를 낸다 (measure 없음)', () => {
    expect(aggregate(rows, '부서', undefined, 'count')).toEqual({
      labels: ['영업', '인사'],
      values: [2, 2]
    });
  });

  it('평균·최소·최대를 낸다', () => {
    expect(aggregate(rows, '부서', '매출', 'avg').values).toEqual([200, 125]);
    expect(aggregate(rows, '부서', '매출', 'min').values).toEqual([100, 50]);
    expect(aggregate(rows, '부서', '매출', 'max').values).toEqual([300, 200]);
  });

  it('날짜 차원은 시간순으로 정렬한다', () => {
    const r: Row[] = [
      { 날짜: '2026-03-01', 값: '3' },
      { 날짜: '2026-01-01', 값: '1' },
      { 날짜: '2026-02-01', 값: '2' }
    ];
    expect(aggregate(r, '날짜', '값', 'sum').labels).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01'
    ]);
  });

  it('범주가 12개를 넘으면 상위 12 + 기타로 묶는다', () => {
    const r: Row[] = Array.from({ length: 14 }, (_, i) => ({
      cat: `C${String(i).padStart(2, '0')}`,
      v: String(14 - i) // C00=14 … C13=1
    }));
    const result = aggregate(r, 'cat', 'v', 'sum');
    expect(result.labels).toHaveLength(13);
    expect(result.labels[12]).toBe('기타');
    expect(result.values[12]).toBe(3); // 상위12 제외 나머지 C12(2)+C13(1)=3
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/dashboard/aggregate.test.ts`
Expected: FAIL — `Cannot find module './aggregate'`

- [ ] **Step 3: 구현**

`src/lib/dashboard/aggregate.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/dashboard/aggregate.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/dashboard/aggregate.ts src/lib/dashboard/aggregate.test.ts
git commit -m "feat: aggregate — 범주/날짜별 집계 (TDD)"
```

---

### Task 5: 자동 차트 추천 `suggestCharts` (TDD)

**Files:**
- Create: `src/lib/dashboard/suggest.ts`
- Test: `src/lib/dashboard/suggest.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/dashboard/suggest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { suggestCharts } from './suggest';
import type { Column } from './types';

const cols = (defs: [string, Column['type']][]): Column[] =>
  defs.map(([name, type]) => ({ name, type }));

describe('suggestCharts', () => {
  it('범주+숫자가 있으면 KPI·막대·원형을 만든다', () => {
    const specs = suggestCharts(cols([['부서', 'category'], ['매출', 'number']]), []);
    const kinds = specs.map((s) => s.kind);
    expect(kinds).toContain('kpi');
    expect(kinds).toContain('bar');
    expect(kinds).toContain('pie');
  });

  it('항상 총 행 수 KPI를 포함한다', () => {
    const specs = suggestCharts(cols([['부서', 'category']]), []);
    expect(specs.some((s) => s.kind === 'kpi' && s.agg === 'count' && !s.measure)).toBe(true);
  });

  it('날짜+숫자가 있으면 선 차트를 만든다', () => {
    const specs = suggestCharts(cols([['날짜', 'date'], ['값', 'number']]), []);
    expect(specs.some((s) => s.kind === 'line' && s.dimension === '날짜')).toBe(true);
  });

  it('숫자 열이 없으면 막대는 개수(count)로 폴백한다', () => {
    const specs = suggestCharts(cols([['부서', 'category']]), []);
    const bar = specs.find((s) => s.kind === 'bar');
    expect(bar?.agg).toBe('count');
    expect(bar?.measure).toBeUndefined();
  });

  it('범주 열이 없으면 막대·원형을 만들지 않고, 총 개수는 6 이하다', () => {
    const specs = suggestCharts(cols([['값1', 'number'], ['값2', 'number'], ['메모', 'text']]), []);
    expect(specs.some((s) => s.kind === 'bar')).toBe(false);
    expect(specs.some((s) => s.kind === 'pie')).toBe(false);
    expect(specs.length).toBeLessThanOrEqual(6);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/dashboard/suggest.test.ts`
Expected: FAIL — `Cannot find module './suggest'`

- [ ] **Step 3: 구현**

`src/lib/dashboard/suggest.ts`:

```ts
import type { Row } from '../excel/types';
import type { Column, ChartSpec } from './types';

/** 감지된 열로 기본 대시보드(KPI·막대·선·원형, 최대 6개)를 구성한다. */
export function suggestCharts(columns: Column[], _rows: Row[]): ChartSpec[] {
  const nums = columns.filter((c) => c.type === 'number');
  const cats = columns.filter((c) => c.type === 'category');
  const dates = columns.filter((c) => c.type === 'date');
  const specs: ChartSpec[] = [];

  // KPI: 총 행 수
  specs.push({ id: 'kpi-rows', kind: 'kpi', agg: 'count', title: '총 행 수' });
  // KPI: 숫자 열 상위 2개 합
  nums.slice(0, 2).forEach((c, i) =>
    specs.push({ id: `kpi-sum-${i}`, kind: 'kpi', measure: c.name, agg: 'sum', title: `${c.name} 합계` })
  );

  // 막대: 첫 범주 × 첫 숫자(없으면 개수)
  if (cats.length) {
    const measure = nums[0]?.name;
    specs.push({
      id: 'bar-0',
      kind: 'bar',
      dimension: cats[0].name,
      measure,
      agg: measure ? 'sum' : 'count',
      title: measure ? `${cats[0].name}별 ${measure} 합계` : `${cats[0].name}별 개수`
    });
  }

  // 선: 날짜 × 첫 숫자
  if (dates.length && nums.length) {
    specs.push({
      id: 'line-0',
      kind: 'line',
      dimension: dates[0].name,
      measure: nums[0].name,
      agg: 'sum',
      title: `${dates[0].name}별 ${nums[0].name} 추이`
    });
  }

  // 원형: 첫 범주 구성비
  if (cats.length) {
    specs.push({ id: 'pie-0', kind: 'pie', dimension: cats[0].name, agg: 'count', title: `${cats[0].name} 구성비` });
  }

  return specs;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/dashboard/suggest.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/dashboard/suggest.ts src/lib/dashboard/suggest.test.ts
git commit -m "feat: suggestCharts — 자동 차트 추천 (TDD)"
```

---

### Task 6: 파이프라인 통합 테스트

**Files:**
- Create: `src/lib/dashboard/dashboard-integration.test.ts`

- [ ] **Step 1: 통합 테스트 작성**

`src/lib/dashboard/dashboard-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectColumns } from './detect';
import { suggestCharts } from './suggest';
import { aggregate } from './aggregate';
import type { Row } from '../excel/types';

const columns = ['부서', '매출', '입사일'];
const rows: Row[] = [
  { 부서: '영업', 매출: '100', 입사일: '2026-01-01' },
  { 부서: '인사', 매출: '200', 입사일: '2026-02-01' },
  { 부서: '영업', 매출: '300', 입사일: '2026-03-01' }
];

describe('detect→suggest→aggregate 파이프라인', () => {
  it('감지된 타입으로 막대 차트가 추천되고 집계가 맞는다', () => {
    const cols = detectColumns(columns, rows);
    const specs = suggestCharts(cols, rows);
    const bar = specs.find((s) => s.kind === 'bar');
    expect(bar).toBeDefined();
    expect(bar!.dimension).toBe('부서');
    const data = aggregate(rows, bar!.dimension!, bar!.measure, bar!.agg);
    expect(data).toEqual({ labels: ['영업', '인사'], values: [400, 200] });
  });

  it('날짜 열이 감지되면 선 차트가 추천된다', () => {
    const cols = detectColumns(columns, rows);
    const specs = suggestCharts(cols, rows);
    expect(specs.some((s) => s.kind === 'line' && s.dimension === '입사일')).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 통과 확인 + 전체**

Run: `npx vitest run src/lib/dashboard/dashboard-integration.test.ts`
Expected: PASS (2 tests)

Run: `npm test`
Expected: PASS — 기존 42 + number 4 + detect 5 + aggregate 5 + suggest 5 + integration 2 = 63 tests

- [ ] **Step 3: 커밋**

```bash
git add src/lib/dashboard/dashboard-integration.test.ts
git commit -m "test: dashboard detect→suggest→aggregate 파이프라인 통합"
```

---

### Task 7: `/excel-dashboard` 페이지 (Chart.js + 수정 + PNG)

**Files:**
- Create: `src/routes/excel-dashboard/+page.svelte`

- [ ] **Step 1: 페이지 작성**

`src/routes/excel-dashboard/+page.svelte`:

```svelte
<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { detectColumns } from '$lib/dashboard/detect';
  import { suggestCharts } from '$lib/dashboard/suggest';
  import { aggregate } from '$lib/dashboard/aggregate';
  import type { Column, ChartSpec, Agg, ChartKind } from '$lib/dashboard/types';

  let parsed = $state<ParsedFile | null>(null);
  let fileName = $state('');
  let columns = $state<Column[]>([]);
  let charts = $state<ChartSpec[]>([]);
  let busy = $state(false);
  let error = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ChartLib = $state<any>(null);
  let boardEl: HTMLDivElement;

  // 차트 추가 폼 상태
  let addKind = $state<ChartKind>('bar');
  let addDim = $state('');
  let addMeasure = $state('');
  let addAgg = $state<Agg>('sum');

  const PALETTE = [
    '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#24c1e0',
    '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72', '#71c287', '#fcd04f', '#9e9e9e'
  ];
  const summary = $derived(
    columns.length
      ? `${parsed?.rows.length ?? 0}행 · ${columns.length}열 (숫자 ${columns.filter((c) => c.type === 'number').length} · 날짜 ${columns.filter((c) => c.type === 'date').length} · 범주 ${columns.filter((c) => c.type === 'category').length})`
      : ''
  );
  const dimOptions = $derived(columns.filter((c) => c.type === 'category' || c.type === 'date'));
  const measureOptions = $derived(columns.filter((c) => c.type === 'number'));

  async function onUpload(e: Event) {
    error = '';
    parsed = null;
    charts = [];
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    fileName = f.name.replace(/\.[^.]+$/, '');
    busy = true;
    try {
      const p = await parseFile(f);
      if (p.rows.length === 0) {
        error = '데이터 행이 없습니다.';
        return;
      }
      if (!ChartLib) ChartLib = (await import('chart.js/auto')).default;
      columns = detectColumns(p.columns, p.rows);
      charts = suggestCharts(columns, p.rows);
      parsed = p;
    } catch {
      error = '파일을 읽지 못했습니다. xlsx/xls/csv인지 확인해 주세요.';
    } finally {
      busy = false;
    }
  }

  function configFor(spec: ChartSpec, labels: string[], values: number[]) {
    if (spec.kind === 'line') {
      return {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: spec.title, data: values, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,.12)', fill: true, tension: 0.25 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      };
    }
    if (spec.kind === 'pie') {
      return {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: PALETTE }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      };
    }
    return {
      type: 'bar',
      data: { labels, datasets: [{ label: spec.title, data: values, backgroundColor: '#1a73e8' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    };
  }

  // canvas 액션: 차트 생성/갱신/파괴
  function chart(node: HTMLCanvasElement, spec: ChartSpec) {
    let instance: { destroy: () => void } | null = null;
    const render = (s: ChartSpec) => {
      instance?.destroy();
      if (!ChartLib || !parsed || !s.dimension) return;
      const { labels, values } = aggregate(parsed.rows, s.dimension, s.measure, s.agg);
      instance = new ChartLib(node, configFor(s, labels, values));
    };
    render(spec);
    return { update: render, destroy: () => instance?.destroy() };
  }

  function kpiValue(spec: ChartSpec): string {
    if (!parsed) return '';
    if (spec.agg === 'count' && !spec.measure) return String(parsed.rows.length);
    const total = parsed.rows.reduce((sum, row) => {
      const raw = (row[spec.measure!] ?? '').replace(/[\s,₩$%]/g, '');
      const n = Number(raw);
      return Number.isFinite(n) && raw !== '' ? sum + n : sum;
    }, 0);
    return total.toLocaleString('ko-KR');
  }

  function removeChart(id: string) {
    charts = charts.filter((c) => c.id !== id);
  }

  function addChart() {
    if (!addDim) return;
    const measure = addKind === 'pie' ? undefined : addMeasure || undefined;
    const agg: Agg = addKind === 'pie' ? 'count' : measure ? addAgg : 'count';
    const title =
      addKind === 'pie'
        ? `${addDim} 구성비`
        : measure
          ? `${addDim}별 ${measure} ${agg === 'avg' ? '평균' : agg === 'count' ? '개수' : agg === 'min' ? '최소' : agg === 'max' ? '최대' : '합계'}`
          : `${addDim}별 개수`;
    charts = [...charts, { id: `manual-${charts.length}-${addDim}-${addKind}`, kind: addKind, dimension: addDim, measure, agg, title }];
  }

  async function savePng() {
    if (!boardEl) return;
    const h2c = (await import('html2canvas')).default;
    const canvas = await h2c(boardEl, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_대시보드.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
</script>

<svelte:head>
  <title>엑셀 자동 대시보드 — 엑셀을 올리면 차트 자동 생성 | 엑셀왕</title>
  <meta
    name="description"
    content="엑셀을 올리면 KPI·막대·선·원형 차트 대시보드를 자동으로 만들어 드립니다. 이미지로 저장해 공유하세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>엑셀 자동 대시보드</h1>
<p class="lead">엑셀을 올리면 열을 분석해 차트 대시보드를 자동으로 만들어 드립니다. 차트를 더하거나 빼고, 이미지로 저장하세요.</p>

<div class="uploads">
  <label class="drop">
    <span>엑셀 파일 {fileName ? `· ${fileName}` : ''}</span>
    <input type="file" accept=".xlsx,.xls,.csv" onchange={onUpload} />
  </label>
</div>

{#if busy}<p class="busy">분석하는 중입니다…</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

{#if parsed}
  <p class="summary-line">{summary}</p>

  <div class="toolbar">
    <div class="addform">
      <select bind:value={addKind}>
        <option value="bar">막대</option>
        <option value="line">선</option>
        <option value="pie">원형</option>
      </select>
      <select bind:value={addDim}>
        <option value="" disabled selected>기준 열</option>
        {#each dimOptions as c}<option value={c.name}>{c.name}</option>{/each}
      </select>
      {#if addKind !== 'pie'}
        <select bind:value={addMeasure}>
          <option value="">값 열(개수)</option>
          {#each measureOptions as c}<option value={c.name}>{c.name}</option>{/each}
        </select>
        <select bind:value={addAgg}>
          <option value="sum">합계</option>
          <option value="avg">평균</option>
          <option value="count">개수</option>
          <option value="min">최소</option>
          <option value="max">최대</option>
        </select>
      {/if}
      <button onclick={addChart}>+ 차트 추가</button>
    </div>
    <button class="primary" onclick={savePng}>📷 PNG로 저장</button>
  </div>

  <div class="board" bind:this={boardEl}>
    <div class="kpis">
      {#each charts.filter((c) => c.kind === 'kpi') as spec (spec.id)}
        <div class="kpi"><span>{spec.title}</span><strong>{kpiValue(spec)}</strong></div>
      {/each}
    </div>

    <div class="charts">
      {#each charts.filter((c) => c.kind !== 'kpi') as spec (spec.id)}
        <div class="chartcard">
          <div class="chead"><span>{spec.title}</span><button class="x" onclick={() => removeChart(spec.id)} aria-label="차트 제거">×</button></div>
          <div class="cbody"><canvas use:chart={spec}></canvas></div>
        </div>
      {/each}
    </div>

    {#if charts.filter((c) => c.kind !== 'kpi').length === 0}
      <p class="muted">차트를 추가해 보세요.</p>
    {/if}
  </div>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>표 형태의 엑셀 파일을 올립니다. (.xlsx, .xls, .csv — 첫 행이 머리글, 첫 시트 기준)</li>
    <li>열을 분석해 KPI·막대·선·원형 차트를 자동으로 만들어 보여줍니다.</li>
    <li>[+ 차트 추가]로 원하는 차트를 더하거나, 각 차트의 ×로 제거합니다.</li>
    <li>[📷 PNG로 저장]으로 대시보드를 이미지로 받아 보고서·메신저에 붙여 넣으세요.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>월별 매출·실적 표를 한눈에 보는 차트로</li>
    <li>부서별·지역별 집계를 막대/원형으로 빠르게</li>
    <li>보고서에 넣을 차트 이미지를 클릭 몇 번에</li>
    <li>피벗·차트 만들기가 번거로울 때</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. 분석과 차트 생성 모두 브라우저 안에서만 이뤄지고, 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>어떤 차트가 자동으로 생기나요?</h3>
  <p>총 행 수와 숫자 열 합계 KPI, 범주 열 기준 막대·원형 차트, 날짜 열이 있으면 추이 선 차트를 만들어 드립니다. 마음에 안 들면 추가·제거할 수 있습니다.</p>
  <h3>차트를 바꿀 수 있나요?</h3>
  <p>네. 기준 열·값 열·집계 방식(합계/평균/개수 등)을 골라 차트를 추가하거나, 각 차트를 제거할 수 있습니다.</p>
  <h3>결과를 저장할 수 있나요?</h3>
  <p>대시보드 전체를 PNG 이미지로 저장해 보고서나 메신저에 바로 붙여 넣을 수 있습니다.</p>

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
  .summary-line { color: #555; margin: 20px 0 8px; font-size: 14px; }
  .toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 12px 0 20px; }
  .addform { display: flex; gap: 8px; flex-wrap: wrap; }
  select { padding: 8px 10px; border-radius: 8px; border: 1px solid #ccc; font-size: 13px; }
  button {
    padding: 9px 16px; border: none; border-radius: 8px;
    background: #eef2f7; color: #1a1a1a; font-weight: 600; cursor: pointer; font-size: 13px;
  }
  button.primary { background: #1a73e8; color: #fff; }
  .board { background: #fff; }
  .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .kpi {
    flex: 1; min-width: 120px; border: 1px solid #eee; border-radius: 12px; padding: 16px;
  }
  .kpi span { display: block; font-size: 13px; color: #777; margin-bottom: 6px; }
  .kpi strong { font-size: 24px; }
  .charts { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .chartcard { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px 14px; }
  .chead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .chead span { font-size: 14px; font-weight: 600; }
  .x { background: none; padding: 0 6px; font-size: 18px; color: #999; line-height: 1; }
  .cbody { height: 260px; position: relative; }
  .muted { color: #999; font-size: 14px; }
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
Expected: 빌드 성공 (chart.js·html2canvas 번들)

- [ ] **Step 3: dev 서버 수동 QA (Chart.js·html2canvas 검증의 핵심)**

Run: `npm run dev` → `http://localhost:5173/excel-dashboard` (점유 시 5174)
- 범주·숫자·날짜가 섞인 엑셀(예: 부서·매출·입사일) 업로드 → KPI 카드 + 막대·선·원형 차트 자동 렌더 확인
- [+ 차트 추가]로 차트 추가, ×로 제거 동작 확인
- [📷 PNG로 저장] → 이미지 다운로드되고 KPI+차트가 한 장에 담기는지 확인
- 콘솔 에러 0. browse skill 사용 가능하면 활용.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/excel-dashboard/+page.svelte
git commit -m "feat: /excel-dashboard 페이지 — 자동 대시보드·수정·PNG 내보내기"
```

---

### Task 8: 허브 카드 활성화 + 전체 검증 + 배포

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: 허브 카드 live 전환**

`src/routes/+page.svelte`에서 대시보드 카드 줄을 찾는다:

```ts
    { href: '#', title: '엑셀 자동 대시보드', desc: '준비 중', live: false }
```

다음으로 교체:

```ts
    {
      href: '/excel-dashboard',
      title: '엑셀 자동 대시보드',
      desc: '엑셀을 올리면 KPI·차트 대시보드를 자동 생성, 이미지로 저장합니다.',
      live: true
    }
```

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: PASS (63 tests)

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 허브에 excel-dashboard 카드 활성화"
```

- [ ] **Step 4: 배포 (사용자 확인 후)**

`main` push = Cloudflare Pages 자동배포. push 전 사용자에게 배포 여부 확인.

```bash
git push origin main
```

배포 후: https://excelking.pages.dev/excel-dashboard HTTP 200 + 렌더 확인. (CF Git 연동 끊김 이력 있음 — 안 뜨면 메모리 `project_excelking` 참고)
