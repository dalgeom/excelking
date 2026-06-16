# 엑셀 꿀팁(Excel Tips) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직장인이 엑셀 작업 중 함수·단축키·상황별 해결법을 엑셀왕 안에서 검색·열람할 수 있는 꿀팁 기능(`/tips` 목록 + `/tips/[slug]` 상세)을 추가한다.

**Architecture:** 꿀팁은 프로젝트 내 정적 데이터(`src/lib/tips/tips.ts`)로 둔다(DB·서버 없음). 검색은 클라이언트 순수함수, 시각자료는 사이트 엑셀 테마로 그리는 `<ExcelExample>` HTML 표. 상세 페이지는 prerender + `entries()`로 빌드 시 정적 생성해 CF Pages CDN이 서빙한다.

**Tech Stack:** SvelteKit(Svelte 5 runes) + adapter-cloudflare, vitest. 신규 의존성 없음.

---

## 파일 구조

신규:
- `src/lib/tips/types.ts` — `Tip`/`ExcelExample`/`Category` 타입 + `CATEGORIES` 상수
- `src/lib/tips/tips.ts` — 꿀팁 데이터(시드 6개 + 이후 확장)
- `src/lib/tips/search.ts` — `searchTips` 순수 필터 함수
- `src/lib/tips/search.test.ts` — vitest 테스트
- `src/lib/components/ExcelExample.svelte` — 엑셀풍 예제 표 컴포넌트
- `src/routes/tips/+layout.ts` — `prerender = true`
- `src/routes/tips/+page.svelte` — 목록(검색 + 칩 + 카드)
- `src/routes/tips/[slug]/+page.ts` — `entries()` + `load()`
- `src/routes/tips/[slug]/+page.svelte` — 상세

수정:
- `src/lib/components/SheetTabs.svelte` — "꿀팁" 탭 추가 + `/tips/*` 활성 처리
- `src/lib/components/Footer.svelte` — 사이트맵에 꿀팁 링크

변경 없음: `src/lib/theme/tools.ts`, 도구 5종 라우트.

---

## Task 1: 데이터 모델 + 카테고리 상수 + 시드 데이터

**Files:**
- Create: `src/lib/tips/types.ts`
- Create: `src/lib/tips/tips.ts`

- [ ] **Step 1: 타입·카테고리 상수 작성**

`src/lib/tips/types.ts`:

```ts
export const CATEGORIES = [
  '함수·수식',
  '단축키',
  '데이터 정리',
  '서식',
  '피벗·집계',
  '자주 겪는 문제'
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ExcelExample {
  /** 수식줄에 표시할 텍스트 (선택) */
  formulaBar?: string;
  /** 열 헤더 라벨 (예: ['사번','이름']) */
  headers: string[];
  /** 셀 값 행렬 */
  rows: string[][];
  /** 노란 강조 셀 좌표 [row, col] (rows 기준 0-base) */
  highlight?: [number, number][];
}

export interface Tip {
  /** URL용 식별자 (예: 'vlookup') */
  slug: string;
  title: string;
  category: Category;
  /** 검색용 키워드 (한글/영문) */
  keywords: string[];
  /** 카드·검색결과 한 줄 설명 */
  summary: string;
  /** 언제 쓰나 */
  when: string;
  /** 따라하기 단계 */
  steps: string[];
  /** 복사용 수식 (선택) */
  formula?: string;
  /** 단축키 (선택) */
  shortcut?: string;
  /** 엑셀풍 예제 표 (선택) */
  example?: ExcelExample;
  /** 관련 꿀팁 slug 목록 (선택) */
  related?: string[];
}
```

- [ ] **Step 2: 시드 데이터 작성 (6개, 카테고리당 1개 이상)**

`src/lib/tips/tips.ts`:

```ts
import type { Tip } from './types';

export const TIPS: Tip[] = [
  {
    slug: 'vlookup',
    title: 'VLOOKUP으로 다른 표에서 값 가져오기',
    category: '함수·수식',
    keywords: ['vlookup', '브이룩업', '찾기', '참조', '조회', '매칭', '다른시트'],
    summary: '기준 값으로 다른 표에서 원하는 값을 자동으로 끌어옵니다.',
    when: '사번·코드·이름 같은 기준 값으로 단가표·명단 등 다른 표에서 해당 값을 찾아 채울 때.',
    steps: [
      '값을 채울 빈 셀을 클릭합니다.',
      '=VLOOKUP( 을 입력하고, 찾을 기준 값이 든 셀을 클릭합니다. (예: E2)',
      '쉼표 뒤에 찾을 표 범위를 드래그합니다. 기준 열이 범위의 맨 왼쪽이어야 합니다. (예: A:B)',
      '몇 번째 열 값을 가져올지 숫자로 적습니다. (예: 2 → 범위의 2번째 열)',
      '마지막에 0(또는 FALSE)을 넣어 정확히 일치하는 값만 찾게 합니다.',
      'Enter를 누르고 셀 오른쪽 아래를 더블클릭해 아래로 채웁니다.'
    ],
    formula: '=VLOOKUP(E2,A:B,2,0)',
    example: {
      formulaBar: '=VLOOKUP(E2,A:B,2,0)',
      headers: ['사번', '이름'],
      rows: [
        ['1001', '김철수'],
        ['1002', '이영희'],
        ['1003', '박민수']
      ],
      highlight: [[1, 1]]
    },
    related: ['number-stored-as-text']
  },
  {
    slug: 'filter-shortcut',
    title: '필터를 단축키로 켜고 끄기',
    category: '단축키',
    keywords: ['필터', 'filter', '단축키', '자동필터', 'ctrl shift l'],
    summary: '마우스 없이 한 번에 자동 필터를 켜고 끕니다.',
    when: '표에서 특정 값만 골라 보거나 정렬할 때 자동 필터를 빠르게 토글하고 싶을 때.',
    steps: [
      '표 안의 아무 셀이나 클릭합니다.',
      'Ctrl + Shift + L 을 누르면 머리글에 필터 화살표가 생깁니다.',
      '다시 같은 키를 누르면 필터가 사라집니다.'
    ],
    shortcut: 'Ctrl + Shift + L'
  },
  {
    slug: 'remove-duplicates',
    title: '중복된 행 한 번에 지우기',
    category: '데이터 정리',
    keywords: ['중복', '중복제거', 'duplicate', '데이터정리', '유일값'],
    summary: '같은 값이 반복되는 행을 한 번에 정리합니다.',
    when: '명단·거래처 목록 등에서 똑같이 중복 입력된 행을 없애고 싶을 때.',
    steps: [
      '정리할 표 안의 셀을 하나 클릭합니다.',
      '상단 메뉴에서 [데이터] 탭 → [중복된 항목 제거]를 누릅니다.',
      '어떤 열을 기준으로 중복을 판단할지 체크박스로 고릅니다.',
      '[확인]을 누르면 중복 행이 제거되고 몇 개가 지워졌는지 알려줍니다.'
    ],
    related: ['highlight-duplicates']
  },
  {
    slug: 'highlight-duplicates',
    title: '조건부 서식으로 중복 값 색칠하기',
    category: '서식',
    keywords: ['조건부서식', '중복', '강조', '색칠', 'conditional formatting'],
    summary: '중복된 값을 지우지 않고 색으로 먼저 눈에 띄게 표시합니다.',
    when: '지우기 전에 어떤 값이 중복인지 눈으로 확인하고 싶을 때.',
    steps: [
      '검사할 범위를 드래그해 선택합니다.',
      '[홈] 탭 → [조건부 서식] → [셀 강조 규칙] → [중복 값]을 누릅니다.',
      '강조 색을 고르고 [확인]을 누르면 중복 값이 색칠됩니다.'
    ],
    related: ['remove-duplicates']
  },
  {
    slug: 'pivot-basics',
    title: '피벗 테이블로 항목별 합계 내기',
    category: '피벗·집계',
    keywords: ['피벗', 'pivot', '집계', '합계', '요약', '부서별'],
    summary: '많은 행을 부서별·항목별 합계 표로 자동 요약합니다.',
    when: '수백 줄의 거래·실적 데이터를 부서별·월별 등으로 한눈에 합쳐 보고 싶을 때.',
    steps: [
      '데이터 표 안의 셀을 하나 클릭합니다.',
      '[삽입] 탭 → [피벗 테이블] → [확인]을 누릅니다.',
      '오른쪽 필드 목록에서 묶을 기준(예: 부서)을 [행]으로 끌어다 놓습니다.',
      '합칠 값(예: 금액)을 [값]으로 끌어다 놓으면 항목별 합계가 만들어집니다.'
    ]
  },
  {
    slug: 'number-stored-as-text',
    title: '숫자가 자동으로 안 더해질 때 (텍스트로 저장된 숫자)',
    category: '자주 겪는 문제',
    keywords: ['합계안됨', '텍스트숫자', '초록세모', '오류', 'sum', '안더해짐'],
    summary: '셀 왼쪽 위 초록 삼각형 — 숫자가 텍스트로 저장돼 계산이 안 되는 경우입니다.',
    when: 'SUM이 0이 되거나 더해지지 않고, 셀 왼쪽 위에 초록 삼각형 표시가 보일 때.',
    steps: [
      '문제가 되는 셀들을 드래그해 선택합니다.',
      '선택 영역 왼쪽 위에 나타나는 느낌표(⚠) 버튼을 클릭합니다.',
      '[숫자로 변환]을 누르면 텍스트가 진짜 숫자로 바뀌어 계산됩니다.'
    ],
    related: ['vlookup']
  }
];
```

- [ ] **Step 3: 타입 체크 통과 확인**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx svelte-check --threshold error 2>&1 | tail -5`
Expected: 새 파일에서 에러 없음 (기존 경고는 무관).

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/tips/types.ts src/lib/tips/tips.ts
git commit -m "feat(tips): 꿀팁 데이터 모델·카테고리 상수·시드 6개

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 검색 순수함수 (TDD)

**Files:**
- Create: `src/lib/tips/search.test.ts`
- Create: `src/lib/tips/search.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/tips/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { searchTips } from './search';
import type { Tip } from './types';

const TIPS: Tip[] = [
  { slug: 'a', title: 'VLOOKUP 찾기', category: '함수·수식', keywords: ['vlookup', '브이룩업'], summary: '값 조회', when: '', steps: [] },
  { slug: 'b', title: '필터 단축키', category: '단축키', keywords: ['필터', 'filter'], summary: '필터 토글', when: '', steps: [] },
  { slug: 'c', title: '중복 제거', category: '데이터 정리', keywords: ['중복'], summary: '중복 행 정리', when: '', steps: [] }
];

describe('searchTips', () => {
  it('빈 검색어·카테고리 없으면 전체를 반환한다', () => {
    expect(searchTips(TIPS, {}).map((t) => t.slug)).toEqual(['a', 'b', 'c']);
  });

  it('카테고리로 필터링한다', () => {
    expect(searchTips(TIPS, { category: '단축키' }).map((t) => t.slug)).toEqual(['b']);
  });

  it('제목으로 검색한다 (대소문자 무시)', () => {
    expect(searchTips(TIPS, { query: 'vlookup' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('키워드로 검색한다', () => {
    expect(searchTips(TIPS, { query: '브이룩업' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('공백으로 나뉜 여러 토큰을 AND로 매칭한다', () => {
    expect(searchTips(TIPS, { query: '필터 단축' }).map((t) => t.slug)).toEqual(['b']);
    expect(searchTips(TIPS, { query: '필터 없는단어' })).toEqual([]);
  });

  it('카테고리와 검색어를 함께 적용한다', () => {
    expect(searchTips(TIPS, { category: '함수·수식', query: '필터' })).toEqual([]);
    expect(searchTips(TIPS, { category: '함수·수식', query: '찾기' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('검색어 앞뒤 공백을 무시한다', () => {
    expect(searchTips(TIPS, { query: '  중복  ' }).map((t) => t.slug)).toEqual(['c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx vitest run src/lib/tips/search.test.ts`
Expected: FAIL — "Failed to resolve import './search'" 또는 `searchTips is not a function`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/tips/search.ts`:

```ts
import type { Tip, Category } from './types';

export interface TipFilter {
  query?: string;
  category?: Category | null;
}

export function searchTips(tips: Tip[], filter: TipFilter): Tip[] {
  let result = tips;

  if (filter.category) {
    result = result.filter((t) => t.category === filter.category);
  }

  const q = (filter.query ?? '').trim().toLowerCase();
  if (q) {
    const tokens = q.split(/\s+/);
    result = result.filter((t) => {
      const hay = [t.title, t.summary, t.category, ...t.keywords].join(' ').toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx vitest run src/lib/tips/search.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/tips/search.ts src/lib/tips/search.test.ts
git commit -m "feat(tips): 클라이언트 검색·필터 순수함수 + 테스트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 데이터 무결성 테스트 (TDD)

slug 중복·카테고리 유효성·related 실재 여부를 가볍게 검증한다.

**Files:**
- Create: `src/lib/tips/tips.test.ts`

- [ ] **Step 1: Write the test**

`src/lib/tips/tips.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TIPS } from './tips';
import { CATEGORIES } from './types';

describe('TIPS 데이터 무결성', () => {
  it('slug가 중복되지 않는다', () => {
    const slugs = TIPS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('모든 category가 정의된 6종에 속한다', () => {
    for (const t of TIPS) {
      expect(CATEGORIES).toContain(t.category);
    }
  });

  it('related는 실재하는 slug만 가리킨다', () => {
    const slugs = new Set(TIPS.map((t) => t.slug));
    for (const t of TIPS) {
      for (const r of t.related ?? []) {
        expect(slugs).toContain(r);
      }
    }
  });

  it('필수 필드(title·summary·steps)가 비어 있지 않다', () => {
    for (const t of TIPS) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.summary.length).toBeGreaterThan(0);
      expect(t.steps.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx vitest run src/lib/tips/tips.test.ts`
Expected: PASS (4 tests). 실패 시 Task 1 시드 데이터의 slug/related를 바로잡는다.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/tips/tips.test.ts
git commit -m "test(tips): 꿀팁 데이터 무결성 검증

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: ExcelExample 시각 컴포넌트

홈 `.sheet` 그리드와 같은 엑셀풍 표로 예제를 렌더한다. (컴포넌트 단위 테스트는 프로젝트에 없음 — Task 8 빌드+시각검증으로 확인.)

**Files:**
- Create: `src/lib/components/ExcelExample.svelte`

- [ ] **Step 1: 컴포넌트 작성**

`src/lib/components/ExcelExample.svelte`:

```svelte
<script lang="ts">
  import type { ExcelExample } from '$lib/tips/types';
  import FormulaBar from './FormulaBar.svelte';
  let { data }: { data: ExcelExample } = $props();

  const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function isHi(r: number, c: number): boolean {
    return (data.highlight ?? []).some(([hr, hc]) => hr === r && hc === c);
  }
</script>

{#if data.formulaBar}
  <FormulaBar value={data.formulaBar} />
{/if}

<div class="ex" style="--cols:{data.headers.length}">
  <div class="corner"></div>
  {#each data.headers as h, c}
    <div class="colhead"><span class="letter">{COL_LETTERS[c]}</span>{h}</div>
  {/each}
  {#each data.rows as row, r}
    <div class="rowhead">{r + 1}</div>
    {#each data.headers as _, c}
      <div class="cell" class:hi={isHi(r, c)}>{row[c] ?? ''}</div>
    {/each}
  {/each}
</div>

<style>
  .ex {
    display: grid;
    grid-template-columns: 32px repeat(var(--cols), minmax(80px, 1fr));
    border: 1px solid var(--xl-border);
    border-width: 1px 0 0 1px;
    margin: 4px 0 8px;
    max-width: 420px;
    font-size: 13px;
  }
  .corner, .colhead, .rowhead {
    background: var(--xl-chrome);
    border: 1px solid var(--xl-border);
    border-width: 0 1px 1px 0;
    color: #555;
  }
  .colhead { padding: 5px 8px; text-align: center; font-weight: 600; }
  .colhead .letter { display: block; font-size: 10px; color: #999; font-weight: 400; }
  .rowhead { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999; }
  .cell {
    border: 1px solid var(--xl-border);
    border-width: 0 1px 1px 0;
    padding: 6px 8px;
    background: #fff;
    color: var(--xl-ink);
  }
  .cell.hi { background: #fff3bf; outline: 2px solid #f0c000; outline-offset: -2px; }
</style>
```

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx svelte-check --threshold error 2>&1 | tail -5`
Expected: 새 컴포넌트 에러 없음.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/components/ExcelExample.svelte
git commit -m "feat(tips): 엑셀풍 예제 표 ExcelExample 컴포넌트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 목록 페이지 `/tips`

검색창 + 카테고리 칩 + 카드 그리드. prerender 적용.

**Files:**
- Create: `src/routes/tips/+layout.ts`
- Create: `src/routes/tips/+page.svelte`

- [ ] **Step 1: prerender 레이아웃**

`src/routes/tips/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 2: 목록 페이지 작성**

`src/routes/tips/+page.svelte`:

```svelte
<script lang="ts">
  import { TIPS } from '$lib/tips/tips';
  import { CATEGORIES, type Category } from '$lib/tips/types';
  import { searchTips } from '$lib/tips/search';
  import FormulaBar from '$lib/components/FormulaBar.svelte';

  let query = $state('');
  let category = $state<Category | null>(null);
  const results = $derived(searchTips(TIPS, { query, category }));

  function pick(c: Category) {
    category = category === c ? null : c;
  }
</script>

<svelte:head>
  <title>엑셀 꿀팁 — 함수·단축키·문제해결 모음 | 엑셀왕</title>
  <meta
    name="description"
    content="직장인이 자주 찾는 엑셀 함수·단축키·데이터 정리·피벗·자주 겪는 문제 해결법을 검색해 바로 찾아보세요. 무료, 설치 없이." />
</svelte:head>

<p class="lead">엑셀 작업 중 막힐 때, 검색해서 바로 찾아보세요.</p>

<FormulaBar cell="찾기" value={query || '검색어를 입력하세요'} />

<input
  class="search"
  type="search"
  placeholder="예: VLOOKUP, 중복 제거, 단축키…"
  bind:value={query} />

<div class="chips">
  <button class="chip" class:on={category === null} onclick={() => (category = null)}>전체</button>
  {#each CATEGORIES as c}
    <button class="chip" class:on={category === c} onclick={() => pick(c)}>{c}</button>
  {/each}
</div>

{#if results.length === 0}
  <p class="empty">검색 결과가 없습니다. 다른 단어로 찾아보세요.</p>
{:else}
  <div class="cards">
    {#each results as tip}
      <a class="card" href={`/tips/${tip.slug}`}>
        <span class="cat">{tip.category}</span>
        <b>{tip.title}</b>
        <span class="sum">{tip.summary}</span>
      </a>
    {/each}
  </div>
{/if}

<style>
  .lead { color: #555; font-size: 16px; margin: 0 0 16px; }
  .search {
    width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px;
    border: 1px solid #c4c4c4; border-radius: 6px; margin: 0 0 14px;
  }
  .search:focus { outline: 2px solid var(--xl-green); outline-offset: -1px; border-color: var(--xl-green); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
  .chip {
    padding: 6px 13px; font-size: 13px; border: 1px solid #c4c4c4; border-radius: 999px;
    background: #fff; color: #444; cursor: pointer; white-space: nowrap;
  }
  .chip:hover { background: #f5f5f5; }
  .chip.on { background: var(--xl-green); border-color: var(--xl-green); color: #fff; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card {
    display: flex; flex-direction: column; gap: 6px; padding: 16px;
    border: 1px solid var(--xl-border); border-radius: 8px; background: #fff;
    text-decoration: none; color: inherit;
  }
  .card:hover { background: var(--xl-sel); outline: 2px solid var(--xl-green); outline-offset: -2px; }
  .card .cat { font-size: 11px; color: var(--xl-green); font-weight: 700; }
  .card b { font-size: 15px; }
  .card .sum { font-size: 13px; color: #666; }
  .empty { color: #888; padding: 20px 0; }
  @media (max-width: 620px) {
    .cards { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 3: dev 서버로 동작 확인**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npm run dev -- --port 5191` (백그라운드)
브라우저 또는 browse 스킬로 `http://localhost:5191/tips` 열기 → 검색창 타이핑 시 카드가 즉시 줄어드는지, 칩 클릭 시 필터되는지 확인.
Expected: 6개 카드 표시, "vlookup" 입력 시 1개로 줄고, 칩 "단축키" 클릭 시 필터 단축키 카드만.

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/routes/tips/+layout.ts src/routes/tips/+page.svelte
git commit -m "feat(tips): 꿀팁 목록 페이지(검색+카테고리 칩+카드)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 상세 페이지 `/tips/[slug]`

**Files:**
- Create: `src/routes/tips/[slug]/+page.ts`
- Create: `src/routes/tips/[slug]/+page.svelte`

- [ ] **Step 1: load + entries (prerender 대상 생성)**

`src/routes/tips/[slug]/+page.ts`:

```ts
import { error } from '@sveltejs/kit';
import { TIPS } from '$lib/tips/tips';

export function entries() {
  return TIPS.map((t) => ({ slug: t.slug }));
}

export function load({ params }: { params: { slug: string } }) {
  const tip = TIPS.find((t) => t.slug === params.slug);
  if (!tip) throw error(404, '꿀팁을 찾을 수 없습니다');
  const related = (tip.related ?? [])
    .map((s) => TIPS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({ slug: t.slug, title: t.title }));
  return { tip, related };
}
```

- [ ] **Step 2: 상세 페이지 작성**

`src/routes/tips/[slug]/+page.svelte`:

```svelte
<script lang="ts">
  import ExcelExample from '$lib/components/ExcelExample.svelte';
  let { data } = $props();
  const tip = $derived(data.tip);

  let copied = $state(false);
  async function copyFormula() {
    if (!tip.formula) return;
    await navigator.clipboard.writeText(tip.formula);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<svelte:head>
  <title>{tip.title} — 엑셀 꿀팁 | 엑셀왕</title>
  <meta name="description" content={tip.summary} />
</svelte:head>

<a class="back" href="/tips">← 꿀팁 목록</a>

<span class="cat">{tip.category}</span>
<h1>{tip.title}</h1>
<p class="summary">{tip.summary}</p>

<section>
  <h2>언제 쓰나요?</h2>
  <p>{tip.when}</p>
</section>

{#if tip.shortcut}
  <section>
    <h2>단축키</h2>
    <kbd class="kbd">{tip.shortcut}</kbd>
  </section>
{/if}

<section>
  <h2>따라하기</h2>
  <ol>
    {#each tip.steps as step}<li>{step}</li>{/each}
  </ol>
</section>

{#if tip.formula}
  <section>
    <h2>수식</h2>
    <div class="formula">
      <code>{tip.formula}</code>
      <button class="rbtn" onclick={copyFormula}>{copied ? '복사됨 ✓' : '복사'}</button>
    </div>
  </section>
{/if}

{#if tip.example}
  <section>
    <h2>예시</h2>
    <ExcelExample data={tip.example} />
  </section>
{/if}

{#if data.related.length > 0}
  <section>
    <h2>관련 꿀팁</h2>
    <ul class="related">
      {#each data.related as r}<li><a href={`/tips/${r.slug}`}>{r.title}</a></li>{/each}
    </ul>
  </section>
{/if}

<style>
  .back { display: inline-block; margin: 0 0 14px; color: var(--xl-green); text-decoration: none; font-size: 13px; }
  .back:hover { text-decoration: underline; }
  .cat { font-size: 12px; color: var(--xl-green); font-weight: 700; }
  h1 { font-size: 24px; margin: 4px 0 8px; }
  .summary { color: #555; font-size: 15px; margin: 0 0 8px; }
  section { margin: 22px 0; }
  h2 { font-size: 15px; color: #333; margin: 0 0 8px; border-left: 3px solid var(--xl-green); padding-left: 8px; }
  ol { padding-left: 22px; color: #444; line-height: 1.8; margin: 0; }
  ol li { font-size: 14px; }
  p { color: #444; line-height: 1.7; font-size: 14px; margin: 0; }
  .kbd {
    display: inline-block; padding: 5px 12px; font-size: 14px; font-family: inherit;
    border: 1px solid #c4c4c4; border-bottom-width: 3px; border-radius: 6px; background: #fafafa; color: #333;
  }
  .formula { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .formula code {
    padding: 8px 12px; background: #f6f8fa; border: 1px solid var(--xl-border); border-radius: 5px;
    font-family: 'Consolas', monospace; font-size: 14px; color: #1a5c38;
  }
  .related { padding-left: 18px; margin: 0; line-height: 1.9; }
  .related a { color: var(--xl-green); text-decoration: none; font-size: 14px; }
  .related a:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 3: dev 서버로 확인**

dev 서버(Task 5 Step 3에서 실행 중)에서 `http://localhost:5191/tips/vlookup` 열기.
Expected: 제목·언제쓰나·따라하기·수식(복사 버튼)·엑셀풍 예제 표(노란 강조 셀)·관련 꿀팁 표시. 복사 버튼 클릭 시 "복사됨 ✓". 존재하지 않는 slug(`/tips/없는것`)는 404.

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/routes/tips/\[slug\]/+page.ts src/routes/tips/\[slug\]/+page.svelte
git commit -m "feat(tips): 꿀팁 상세 페이지(prerender, 수식복사, 예제표)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 탭·푸터 통합

**Files:**
- Modify: `src/lib/components/SheetTabs.svelte`
- Modify: `src/lib/components/Footer.svelte`

- [ ] **Step 1: SheetTabs에 꿀팁 탭 추가 + /tips 하위 활성 처리**

`src/lib/components/SheetTabs.svelte`의 `<script>` 안 `tabs` 정의를 교체:

기존:
```ts
  const tabs = [{ href: '/', tab: '홈' }, ...TOOLS.map((t) => ({ href: t.href, tab: t.tab }))];
```
교체:
```ts
  const tabs = [
    { href: '/', tab: '홈' },
    ...TOOLS.map((t) => ({ href: t.href, tab: t.tab })),
    { href: '/tips', tab: '꿀팁' }
  ];
  function active(href: string): boolean {
    const path = page.url.pathname;
    return path === href || (href !== '/' && path.startsWith(href + '/'));
  }
```

그리고 마크업의 활성 클래스를 교체:

기존:
```svelte
    <a href={t.href} class="tab" class:active={page.url.pathname === t.href}>{t.tab}</a>
```
교체:
```svelte
    <a href={t.href} class="tab" class:active={active(t.href)}>{t.tab}</a>
```

- [ ] **Step 2: Footer 사이트맵에 꿀팁 링크 추가**

`src/lib/components/Footer.svelte`의 "안내" 열에 꿀팁 링크 추가:

기존:
```svelte
    <div class="foot-col">
      <h4>안내</h4>
      <a href="/guide">사용법</a>
      <a href="mailto:devcom21c@gmail.com">문의 이메일</a>
    </div>
```
교체:
```svelte
    <div class="foot-col">
      <h4>안내</h4>
      <a href="/tips">엑셀 꿀팁</a>
      <a href="/guide">사용법</a>
      <a href="mailto:devcom21c@gmail.com">문의 이메일</a>
    </div>
```

- [ ] **Step 3: dev 서버로 확인**

dev 서버에서 아무 페이지나 열어 상단 탭에 "꿀팁"이 보이고, `/tips` 또는 `/tips/vlookup`에서 꿀팁 탭이 활성(초록 밑줄)인지, 푸터에 "엑셀 꿀팁" 링크가 있는지 확인.

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/components/SheetTabs.svelte src/lib/components/Footer.svelte
git commit -m "feat(tips): 상단 탭·푸터에 꿀팁 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 전체 검증 + 시각 점검 + 배포

**Files:** (변경 없음 — 검증·배포)

- [ ] **Step 1: 전체 테스트**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npx vitest run`
Expected: 기존 70개 + 신규(search 7 + tips 4) = 81개 통과.

- [ ] **Step 2: 프로덕션 빌드 (prerender 포함)**

Run: `cd /d/OneDrive/DEV_WORK/excelking && npm run build 2>&1 | tail -20`
Expected: 성공. prerender 로그에 `/tips`, `/tips/vlookup` … 시드 6개 slug 페이지가 생성됨. 에러·경고 없이 `.svelte-kit/cloudflare` 출력.

- [ ] **Step 3: 시각 검증 (browse 스킬)**

browse 바이너리: `$HOME/.claude/skills/gstack/browse/dist/browse`. dev 서버(`npm run dev -- --port 5191`) 기준:
- `/tips` 스크린샷 — 검색창·칩·카드 2열 그리드, 엑셀 테마 일치 확인.
- `/tips/vlookup` 스크린샷 — 예제 표의 노란 강조 셀·수식 복사 버튼·관련 꿀팁 확인.
- `--scale 3` + `--selector .ex`로 예제 표 확대해 셀 정렬·강조 깨짐 점검.
- 모바일 `viewport 390x800` — 카드 1열, 가로 스크롤 없음 확인.
한글 줄바꿈(`word-break: keep-all`)으로 한 글자만 넘어가는 어색함 없는지 점검.

- [ ] **Step 4: 커밋·푸시·배포**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git push origin main
```
CF Pages 자동배포 대기 후 라이브 마커 폴링:
Run: `sleep 40 && curl -s https://excelking.pages.dev/tips/ | grep -o '엑셀 꿀팁' | head -1`
Expected: `엑셀 꿀팁` 출력 (배포 반영). 안 나오면 30초 더 대기 후 재시도. CF Git 끊김 의심 시 메모리 `project_excelking.md`의 복구 절차 참조.

- [ ] **Step 5: 라이브 상세 페이지 확인**

Run: `curl -s https://excelking.pages.dev/tips/vlookup | grep -o 'VLOOKUP으로 다른 표' | head -1`
Expected: 매칭 출력 (prerender된 상세 페이지가 정적 서빙됨).

---

## Task 9: 콘텐츠 확장 — 꿀팁 14개 추가 (목표 ~20개)

시드 6개에 더해 아래 14개를 `src/lib/tips/tips.ts`에 같은 `Tip` 형태로 작성한다. 각 항목은 원본 작성(저작권 안전), 가능하면 `formula`/`shortcut`/`example` 포함. 작성 후 Task 3 무결성 테스트와 Task 8 검증·배포를 다시 돌린다.

작성 대상(제목 — 카테고리 — 핵심 수식/단축키):

1. IF 함수로 조건 나누기 — 함수·수식 — `=IF(B2>=60,"합격","불합격")`
2. SUMIF로 조건에 맞는 값만 더하기 — 함수·수식 — `=SUMIF(A:A,"영업",B:B)`
3. COUNTIF로 조건 개수 세기 — 함수·수식 — `=COUNTIF(A:A,"완료")`
4. INDEX/MATCH로 왼쪽 값도 찾기 — 함수·수식 — `=INDEX(A:A,MATCH(E2,B:B,0))`
5. TEXT 함수로 날짜·숫자 표시형식 바꾸기 — 함수·수식 — `=TEXT(A2,"yyyy-mm-dd")`
6. 셀 안에서 줄바꿈하기 — 단축키 — `Alt + Enter`
7. 현재 날짜·시간 빠르게 입력 — 단축키 — `Ctrl + ;` / `Ctrl + Shift + ;`
8. 위 셀 값 그대로 채우기 — 단축키 — `Ctrl + D`
9. 텍스트 나누기로 한 칸을 여러 열로 — 데이터 정리 — (데이터 > 텍스트 나누기)
10. 빈 셀에 위 값 한 번에 채우기 — 데이터 정리 — (이동 옵션 > 빈 셀 > `=위셀` + `Ctrl+Enter`)
11. 셀 병합 대신 "선택 영역 가운데로" — 서식 — (셀 서식 > 맞춤)
12. 0을 화면에서 숨기기 — 서식 — 표시형식 `0;-0;;`
13. 피벗 값을 합계 대신 개수로 바꾸기 — 피벗·집계 — (값 필드 설정 > 개수)
14. #DIV/0! 오류를 깔끔하게 숨기기 — 자주 겪는 문제 — `=IFERROR(A2/B2,"")`

- [ ] **Step 1: 14개 작성** — 위 목록을 `Tip` 객체로 `TIPS` 배열에 추가. `slug`는 영문 kebab-case, `keywords`에 한글·영문 검색어 포함, `related`는 실재 slug만.
- [ ] **Step 2: 무결성·검색 테스트** — `npx vitest run src/lib/tips/` 통과 확인.
- [ ] **Step 3: 빌드·시각·배포** — Task 8 반복(prerender slug가 20개로 늘어남 확인).
- [ ] **Step 4: Commit & push**

```bash
cd /d/OneDrive/DEV_WORK/excelking
git add src/lib/tips/tips.ts
git commit -m "content(tips): 꿀팁 14개 추가 (총 20개)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review 결과

- **스펙 커버리지:** 화면구조(T5·T6)·카테고리6종(T1)·꿀팁구성/예제표(T1·T4·T6)·검색(T2)·데이터모델(T1)·콘텐츠20개(T1+T9)·SEO head(T5·T6)·테스트(T2·T3)·탭/푸터(T7)·배포(T8) 모두 태스크 존재. 갭 없음.
- **Placeholder 스캔:** 없음. T9는 14개를 제목+카테고리+수식으로 명시한 작성 체크리스트(모호한 placeholder 아님).
- **타입 일관성:** `searchTips(tips, {query, category})`·`TipFilter`·`Tip`·`ExcelExample`·`CATEGORIES`·`Category`가 T1~T6에서 동일 시그니처로 사용됨. `entries()`/`load()`는 SvelteKit 규약. `active(href)` 헬퍼 T7 일관.
