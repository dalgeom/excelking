# excelking MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SvelteKit 사이트 골격 + 1번 도구(두 엑셀 명단 비교·대조)를 만들어 Cloudflare Pages에 배포 가능한 상태로 완성한다.

**Architecture:** 전부 클라이언트(브라우저) 처리. 비교 알고리즘은 SheetJS 의존에서 분리된 순수 TS 함수(`compare.ts`)로 만들어 Vitest로 테스트한다. 파일 파싱/내보내기(`parse.ts`/`export.ts`)만 SheetJS를 래핑한다. UI는 파싱→비교→내보내기를 연결하고, 각 도구 페이지엔 애드센스 승인용 사용법/FAQ 콘텐츠를 포함한다.

**Tech Stack:** SvelteKit, adapter-cloudflare, TypeScript, Vitest, SheetJS(xlsx)

---

## File Structure

```
excelking/
├ src/
│  ├ lib/
│  │  └ excel/
│  │     ├ types.ts        # Row, CompareResult 타입
│  │     ├ compare.ts      # compareByKey() — 순수 함수, 비교 알고리즘 (TDD 핵심)
│  │     ├ compare.test.ts # compare 단위 테스트
│  │     ├ parse.ts        # parseFile() — SheetJS로 File→{columns,rows}
│  │     └ export.ts       # buildResultWorkbook() — CompareResult→xlsx Uint8Array
│  ├ routes/
│  │  ├ +layout.svelte     # 공통 헤더/푸터
│  │  ├ +page.svelte       # 허브(도구 카드 그리드)
│  │  └ excel-compare/
│  │     └ +page.svelte    # 비교·대조 도구 UI + 사용법/FAQ 콘텐츠
│  └ app.html
├ svelte.config.js         # adapter-cloudflare
├ package.json
└ docs/...
```

각 파일 책임:
- `compare.ts`: SheetJS·DOM 무관. 입력 배열 → 결과 객체. 정확도의 핵심이라 단독 테스트
- `parse.ts` / `export.ts`: SheetJS 경계. 얇게 유지
- `+page.svelte`(excel-compare): 위 셋을 연결하는 UI. 로직은 안 넣음

---

## Task 1: 프로젝트 초기화 (SvelteKit + Cloudflare adapter + Vitest + SheetJS)

기존 폴더에 `.git`과 `docs/`가 이미 있다. scaffold가 비어있지 않은 디렉토리를 거부할 수 있으므로 fallback 포함.

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `src/app.html`, `tsconfig.json` 등 (scaffold 산출물)
- Modify: `svelte.config.js` (adapter 교체)

- [ ] **Step 1: 현재 폴더에 SvelteKit scaffold**

작업 디렉토리: `D:\OneDrive\DEV_WORK\excelking`

Run:
```bash
npx sv create . --template minimal --types ts --no-install
```

대화형 프롬프트가 뜨면: template=minimal, type checking=TypeScript, add-ons=none 선택.

**Fallback** (비어있지 않은 디렉토리라 거부될 경우): 임시 폴더에 scaffold 후 내용만 이동.
```bash
npx sv create ../excelking-tmp --template minimal --types ts --no-install
# ../excelking-tmp 의 파일들(.git/docs 제외)을 현재 폴더로 이동(robocopy/move)
```

- [ ] **Step 2: 의존성 설치 + Cloudflare adapter + SheetJS + Vitest**

Run:
```bash
npm install
npm install -D @sveltejs/adapter-cloudflare vitest
npm install xlsx
```

- [ ] **Step 3: adapter를 cloudflare로 교체**

`svelte.config.js` 의 adapter import/사용을 교체:
```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

- [ ] **Step 4: package.json 에 test 스크립트 추가**

`package.json` 의 `"scripts"` 에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 빌드가 통과하는지 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 완료 (`.svelte-kit/cloudflare` 또는 빌드 출력 생성)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit + cloudflare adapter + vitest + sheetjs"
```

---

## Task 2: 비교 알고리즘 (compare.ts) — TDD

**Files:**
- Create: `src/lib/excel/types.ts`
- Create: `src/lib/excel/compare.ts`
- Test: `src/lib/excel/compare.test.ts`

- [ ] **Step 1: 타입 정의**

`src/lib/excel/types.ts`:
```ts
export type Row = Record<string, string>;

export interface CompareResult {
  /** A에만 존재하는 행 (키 기준) */
  onlyA: Row[];
  /** B에만 존재하는 행 (키 기준) */
  onlyB: Row[];
  /** 양쪽에 키가 존재하는 행 (A 기준 행) */
  both: Row[];
  /** both 중 키 외 다른 열 값이 서로 다른 행 */
  changed: { key: string; a: Row; b: Row; diffColumns: string[] }[];
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/excel/compare.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { compareByKey } from './compare';
import type { Row } from './types';

const A: Row[] = [
  { 사번: '1', 이름: '김철수', 부서: '영업' },
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '개발' }
];
const B: Row[] = [
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '기획' }, // 부서 변경됨
  { 사번: '4', 이름: '최지우', 부서: '영업' }
];

describe('compareByKey', () => {
  it('A에만 있는 행을 onlyA로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.onlyA.map((x) => x.사번)).toEqual(['1']);
  });

  it('B에만 있는 행을 onlyB로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.onlyB.map((x) => x.사번)).toEqual(['4']);
  });

  it('양쪽에 키가 있는 행을 both로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.both.map((x) => x.사번).sort()).toEqual(['2', '3']);
  });

  it('키는 같지만 다른 열 값이 다르면 changed에 넣고 diffColumns를 채운다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.changed).toHaveLength(1);
    expect(r.changed[0].key).toBe('3');
    expect(r.changed[0].diffColumns).toEqual(['부서']);
  });

  it('키 값의 앞뒤 공백은 무시하고 매칭한다', () => {
    const a: Row[] = [{ id: ' 10 ', v: 'x' }];
    const b: Row[] = [{ id: '10', v: 'x' }];
    const r = compareByKey(a, b, 'id');
    expect(r.both).toHaveLength(1);
    expect(r.onlyA).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/lib/excel/compare.test.ts`
Expected: FAIL — `compareByKey` 가 정의되지 않음

- [ ] **Step 4: 최소 구현**

`src/lib/excel/compare.ts`:
```ts
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/lib/excel/compare.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/excel/types.ts src/lib/excel/compare.ts src/lib/excel/compare.test.ts
git commit -m "feat: add compareByKey pure comparison logic with tests"
```

---

## Task 3: 엑셀 파싱 (parse.ts)

SheetJS로 업로드 File을 `{ columns, rows }` 로 변환. 모든 셀 값은 문자열화한다(비교 일관성).

**Files:**
- Create: `src/lib/excel/parse.ts`

- [ ] **Step 1: 구현**

`src/lib/excel/parse.ts`:
```ts
import * as XLSX from 'xlsx';
import type { Row } from './types';

export interface ParsedFile {
  columns: string[];
  rows: Row[];
}

/** 업로드된 File(.xlsx/.xls/.csv)의 첫 시트를 파싱한다. 모든 값은 문자열. */
export async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // raw:false → 날짜/숫자도 표시 문자열로. defval로 빈 셀은 ''.
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: ''
  });
  const rows: Row[] = json.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[k] = String(r[k] ?? '');
    return out;
  });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { columns, rows };
}
```

- [ ] **Step 2: 빌드로 타입 확인**

Run: `npm run build`
Expected: 타입 에러 없이 통과

- [ ] **Step 3: 커밋**

```bash
git add src/lib/excel/parse.ts
git commit -m "feat: add parseFile (SheetJS) for xlsx/csv upload"
```

---

## Task 4: 결과 내보내기 (export.ts)

CompareResult를 시트 3개(A에만/B에만/공통)로 묶은 xlsx 바이너리로 만든다. 공통 시트엔 변경 여부 열을 추가한다.

**Files:**
- Create: `src/lib/excel/export.ts`

- [ ] **Step 1: 구현**

`src/lib/excel/export.ts`:
```ts
import * as XLSX from 'xlsx';
import type { CompareResult, Row } from './types';

/** CompareResult를 xlsx 바이너리(Uint8Array)로 만든다. 시트: A에만/B에만/공통 */
export function buildResultWorkbook(result: CompareResult, keyColumn: string): Uint8Array {
  const wb = XLSX.utils.book_new();

  const changedKeys = new Set(result.changed.map((c) => c.key));
  const norm = (v: unknown) => String(v ?? '').trim();
  const bothRows: Row[] = result.both.map((row) => ({
    ...row,
    변경여부: changedKeys.has(norm(row[keyColumn])) ? '변경됨' : '동일'
  }));

  const sheets: [string, Row[]][] = [
    ['A에만', result.onlyA],
    ['B에만', result.onlyB],
    ['공통', bothRows]
  ];
  for (const [name, rows] of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
```

- [ ] **Step 2: 빌드로 타입 확인**

Run: `npm run build`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add src/lib/excel/export.ts
git commit -m "feat: add buildResultWorkbook to export compare result as xlsx"
```

---

## Task 5: 공통 레이아웃 + 허브 페이지

**Files:**
- Create/Modify: `src/routes/+layout.svelte`
- Modify: `src/routes/+page.svelte`

도구 목록은 레이아웃과 허브가 공유한다. 한글 줄바꿈은 `word-break: keep-all`(사용자 선호).

- [ ] **Step 1: 레이아웃 작성**

`src/routes/+layout.svelte`:
```svelte
<script lang="ts">
  let { children } = $props();
</script>

<header class="site-header">
  <a href="/" class="logo">엑셀왕 <span>excelking</span></a>
</header>

<main>
  {@render children()}
</main>

<footer class="site-footer">
  <p>모든 처리는 브라우저 안에서 이뤄집니다. 파일은 서버로 전송되지 않습니다.</p>
  <p>© excelking</p>
</footer>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Pretendard', system-ui, sans-serif;
    color: #1a1a1a;
    word-break: keep-all;
  }
  .site-header {
    padding: 16px 24px;
    border-bottom: 1px solid #eee;
  }
  .logo {
    font-size: 20px;
    font-weight: 800;
    text-decoration: none;
    color: #1a1a1a;
  }
  .logo span {
    font-size: 13px;
    color: #888;
    font-weight: 500;
  }
  main {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .site-footer {
    border-top: 1px solid #eee;
    padding: 24px;
    text-align: center;
    color: #999;
    font-size: 13px;
  }
</style>
```

- [ ] **Step 2: 허브 페이지 작성**

`src/routes/+page.svelte`:
```svelte
<script lang="ts">
  const tools = [
    {
      href: '/excel-compare',
      title: '두 엑셀 명단 비교·대조',
      desc: '두 파일을 키 열 기준으로 대조해 일치/불일치/변경을 찾아줍니다.',
      live: true
    },
    { href: '#', title: '조건별 시트/파일 분리', desc: '준비 중', live: false },
    { href: '#', title: 'PDF 표 → 엑셀 추출', desc: '준비 중', live: false },
    { href: '#', title: '엑셀 합치기', desc: '준비 중', live: false },
    { href: '#', title: '엑셀 자동 대시보드', desc: '준비 중', live: false }
  ];
</script>

<svelte:head>
  <title>엑셀왕 — 사무직 엑셀·문서 도구 모음 (무료, 설치 없이)</title>
  <meta
    name="description"
    content="두 엑셀 비교, PDF 표 추출, 시트 분리 등 사무직 엑셀 작업을 브라우저에서 무료로. 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>엑셀왕</h1>
<p class="lead">사무직의 반복 엑셀 작업을 브라우저에서 무료로. 설치도, 업로드도 없습니다.</p>

<div class="grid">
  {#each tools as t}
    <a class="card" class:disabled={!t.live} href={t.href}>
      <h2>{t.title}</h2>
      <p>{t.desc}</p>
      {#if !t.live}<span class="badge">준비 중</span>{/if}
    </a>
  {/each}
</div>

<style>
  h1 { font-size: 32px; margin: 0 0 8px; }
  .lead { color: #555; font-size: 17px; margin: 0 0 32px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  .card {
    display: block;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: border-color .15s, transform .15s;
    position: relative;
  }
  .card:hover { border-color: #1a73e8; transform: translateY(-2px); }
  .card.disabled { opacity: .5; pointer-events: none; }
  .card h2 { font-size: 17px; margin: 0 0 6px; }
  .card p { font-size: 14px; color: #666; margin: 0; }
  .badge {
    position: absolute; top: 14px; right: 14px;
    font-size: 11px; color: #999; background: #f3f3f3;
    padding: 2px 8px; border-radius: 999px;
  }
</style>
```

- [ ] **Step 3: dev 서버로 시각 확인**

Run: `npm run dev` 후 브라우저에서 `http://localhost:5173` 열기
Expected: 헤더/허브 카드 5개/푸터 표시. 비교·대조 카드만 활성. (확인 후 dev 서버 종료)

- [ ] **Step 4: 커밋**

```bash
git add src/routes/+layout.svelte src/routes/+page.svelte
git commit -m "feat: add layout and hub page with tool grid"
```

---

## Task 6: 비교·대조 도구 UI (excel-compare)

parse → compare → export 를 연결. 흐름: 파일 A/B 업로드 → 공통 열에서 키 선택 → 비교 → 결과 요약 + 다운로드.

**Files:**
- Create: `src/routes/excel-compare/+page.svelte`

- [ ] **Step 1: UI 작성**

`src/routes/excel-compare/+page.svelte`:
```svelte
<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { compareByKey } from '$lib/excel/compare';
  import { buildResultWorkbook } from '$lib/excel/export';
  import type { CompareResult } from '$lib/excel/types';

  let fileA = $state<ParsedFile | null>(null);
  let fileB = $state<ParsedFile | null>(null);
  let keyColumn = $state('');
  let result = $state<CompareResult | null>(null);
  let error = $state('');

  const commonColumns = $derived(
    fileA && fileB ? fileA.columns.filter((c) => fileB!.columns.includes(c)) : []
  );

  async function onUpload(e: Event, which: 'A' | 'B') {
    error = '';
    result = null;
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      if (which === 'A') fileA = parsed;
      else fileB = parsed;
      keyColumn = '';
    } catch {
      error = '파일을 읽지 못했습니다. xlsx/xls/csv 형식인지 확인해 주세요.';
    }
  }

  function runCompare() {
    error = '';
    if (!fileA || !fileB) { error = '두 파일을 모두 올려 주세요.'; return; }
    if (!keyColumn) { error = '비교 기준이 될 열을 선택해 주세요.'; return; }
    result = compareByKey(fileA.rows, fileB.rows, keyColumn);
  }

  function download() {
    if (!result) return;
    const bytes = buildResultWorkbook(result, keyColumn);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '비교결과.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>두 엑셀 명단 비교·대조 — 엑셀왕</title>
  <meta
    name="description"
    content="두 엑셀 파일을 키 열 기준으로 대조해 한쪽에만 있는 행과 값이 바뀐 행을 찾아 엑셀로 내려받으세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>두 엑셀 명단 비교·대조</h1>
<p class="lead">두 파일을 올리고 기준 열을 고르면, 한쪽에만 있는 행과 값이 바뀐 행을 찾아 드립니다.</p>

<div class="uploads">
  <label class="drop">
    <span>파일 A {fileA ? `· ${fileA.rows.length}행` : ''}</span>
    <input type="file" accept=".xlsx,.xls,.csv" onchange={(e) => onUpload(e, 'A')} />
  </label>
  <label class="drop">
    <span>파일 B {fileB ? `· ${fileB.rows.length}행` : ''}</span>
    <input type="file" accept=".xlsx,.xls,.csv" onchange={(e) => onUpload(e, 'B')} />
  </label>
</div>

{#if commonColumns.length > 0}
  <div class="keyrow">
    <label for="key">비교 기준 열</label>
    <select id="key" bind:value={keyColumn}>
      <option value="" disabled>열 선택</option>
      {#each commonColumns as c}<option value={c}>{c}</option>{/each}
    </select>
    <button onclick={runCompare}>비교하기</button>
  </div>
{:else if fileA && fileB}
  <p class="error">두 파일에 공통된 열 이름이 없습니다. 헤더(첫 행)를 확인해 주세요.</p>
{/if}

{#if error}<p class="error">{error}</p>{/if}

{#if result}
  <div class="summary">
    <div class="stat"><strong>{result.onlyA.length}</strong><span>A에만</span></div>
    <div class="stat"><strong>{result.onlyB.length}</strong><span>B에만</span></div>
    <div class="stat"><strong>{result.both.length}</strong><span>공통</span></div>
    <div class="stat"><strong>{result.changed.length}</strong><span>값 변경</span></div>
  </div>
  <button class="primary" onclick={download}>결과 엑셀 다운로드</button>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<!-- 사용법/FAQ 콘텐츠는 Task 7에서 추가 -->

<style>
  h1 { font-size: 28px; margin: 0 0 8px; }
  .lead { color: #555; margin: 0 0 24px; }
  .uploads { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .drop {
    display: flex; flex-direction: column; gap: 8px;
    border: 1.5px dashed #ccc; border-radius: 12px; padding: 20px; cursor: pointer;
  }
  .drop span { font-weight: 600; font-size: 14px; }
  .keyrow { display: flex; align-items: center; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
  select { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; }
  button {
    padding: 9px 18px; border: none; border-radius: 8px;
    background: #1a73e8; color: #fff; font-weight: 600; cursor: pointer;
  }
  button.primary { margin-top: 16px; }
  .summary { display: flex; gap: 12px; margin: 24px 0 8px; flex-wrap: wrap; }
  .stat {
    flex: 1; min-width: 90px; border: 1px solid #eee; border-radius: 12px;
    padding: 16px; text-align: center;
  }
  .stat strong { display: block; font-size: 24px; }
  .stat span { font-size: 13px; color: #777; }
  .error { color: #d33; }
  .privacy { margin-top: 32px; color: #888; font-size: 13px; }
</style>
```

- [ ] **Step 2: 수동 동작 검증**

Run: `npm run dev`, `http://localhost:5173/excel-compare` 열기.
테스트용 파일 2개(공통 열 `이름`, 일부 행만 겹치게)를 만들어 업로드 → 키=`이름` 선택 → 비교 → 요약 숫자 확인 → 다운로드한 xlsx에 시트 3개(A에만/B에만/공통) 존재 확인. (확인 후 dev 종료)
Expected: 요약 숫자가 입력과 일치, 다운로드 정상

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 통과

- [ ] **Step 4: 커밋**

```bash
git add src/routes/excel-compare/+page.svelte
git commit -m "feat: add excel-compare tool UI wiring parse/compare/export"
```

---

## Task 7: 사용법/FAQ 콘텐츠 + 애드센스 자리

애드센스 승인을 위해 도구 페이지에 실질 텍스트 콘텐츠를 넣는다. `<!-- 사용법/FAQ 콘텐츠는 Task 7에서 추가 -->` 주석 자리에 삽입.

**Files:**
- Modify: `src/routes/excel-compare/+page.svelte`

- [ ] **Step 1: 콘텐츠 섹션 추가**

`src/routes/excel-compare/+page.svelte` 의 `<!-- 사용법/FAQ ... -->` 주석을 아래로 교체:
```svelte
<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>비교할 엑셀 파일 두 개(A, B)를 각각 올립니다. (.xlsx, .xls, .csv)</li>
    <li>두 파일에 공통으로 들어 있는 열 중 <b>기준이 될 열</b>(예: 사번, 이름, 이메일)을 고릅니다.</li>
    <li>[비교하기]를 누르면 A에만 있는 행, B에만 있는 행, 양쪽에 있는 행, 값이 바뀐 행을 분류해 보여줍니다.</li>
    <li>[결과 엑셀 다운로드]로 시트 3개(A에만·B에만·공통)로 정리된 파일을 받습니다.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>회원명부와 출석부를 대조해 빠진 사람 찾기</li>
    <li>지난달 명단과 이번 달 명단을 비교해 신규/이탈 인원 파악</li>
    <li>두 부서가 따로 관리하던 거래처 목록의 차이 확인</li>
    <li>VLOOKUP·조건부서식 없이 두 표의 일치/불일치를 한 번에</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. 모든 계산은 브라우저 안에서만 이뤄지고, 업로드한 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>기준 열 값이 중복되면 어떻게 되나요?</h3>
  <p>같은 키 값이 여러 행에 있으면 마지막 행을 기준으로 비교합니다. 키 열은 사번·이메일처럼 고유한 값으로 고르는 것을 권장합니다.</p>
  <h3>대소문자나 공백도 구분하나요?</h3>
  <p>키 값의 앞뒤 공백은 자동으로 무시합니다. 그 외 값은 입력된 그대로 비교합니다.</p>
  <h3>몇 개 행까지 처리되나요?</h3>
  <p>수천~수만 행은 무리 없이 처리됩니다. 파일이 아주 크면 브라우저 사양에 따라 느려질 수 있습니다.</p>

  <!-- AdSense 광고 슬롯 (승인 후 코드 삽입) -->
  <div class="ad-slot" aria-hidden="true"></div>
</section>
```

`<style>` 블록에 추가:
```css
.content { margin-top: 48px; border-top: 1px solid #eee; padding-top: 32px; }
.content h2 { font-size: 20px; margin: 28px 0 12px; }
.content h3 { font-size: 16px; margin: 18px 0 6px; }
.content p, .content li { color: #444; line-height: 1.7; }
.ad-slot { min-height: 90px; margin-top: 32px; }
```

- [ ] **Step 2: 빌드 + 시각 확인**

Run: `npm run build` (통과 확인), 이어 `npm run dev` 로 `/excel-compare` 하단 콘텐츠 렌더 확인.
Expected: 사용법/이럴 때/FAQ 섹션 표시, 레이아웃 깨짐 없음

- [ ] **Step 3: 커밋**

```bash
git add src/routes/excel-compare/+page.svelte
git commit -m "feat: add usage/FAQ content and adsense slot to excel-compare"
```

---

## Task 8: 전체 테스트 + 빌드 검증 + 배포 준비

**Files:**
- Create: `README.md` (배포 메모)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`
Expected: compare.test.ts 전체 PASS

- [ ] **Step 2: 프로덕션 빌드**

Run: `npm run build`
Expected: 에러 없이 통과

- [ ] **Step 3: README에 배포 절차 기록**

`README.md`:
```markdown
# excelking (엑셀왕)

사무직 엑셀·문서 도구 허브. 전부 브라우저 클라이언트 처리(비용 0).

## 개발
- `npm run dev` — 개발 서버
- `npm test` — 단위 테스트
- `npm run build` — 프로덕션 빌드

## 배포 (Cloudflare Pages)
1. 이 저장소를 GitHub에 푸시
2. Cloudflare Pages에서 저장소 연결
3. 빌드 명령: `npm run build` / 출력 디렉토리: `.svelte-kit/cloudflare`
4. git push 시 자동 재배포 → `excelking.pages.dev`

추후 `excelking.com` 도메인 구매 후 Pages 커스텀 도메인 연결.

설계 문서: `docs/superpowers/specs/2026-06-09-excelking-design.md`
구현 계획: `docs/superpowers/plans/2026-06-09-excelking-mvp.md`
```

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs: add README with deploy steps"
```

- [ ] **Step 5: (선택) GitHub 푸시 + Cloudflare Pages 연결**

사용자가 GitHub 저장소를 만들고 푸시한 뒤, Cloudflare Pages에서 연결한다(README 절차). 첫 배포 후 `excelking.pages.dev` 동작 확인.

---

## Self-Review 체크 결과

- **Spec coverage**: 사이트 골격(Task 5) · 비교·대조 도구(Task 2~6) · 클라이언트 처리/보안 문구(Task 5,6,7) · 애드센스 콘텐츠(Task 7) · CF Pages 배포(Task 1,8) 모두 태스크로 커버. 2~5번 도구는 MVP 범위 밖(허브에 "준비 중"으로만 표기, Task 5).
- **Placeholder scan**: 코드 스텝은 모두 실제 코드 포함. "AdSense 광고 슬롯"은 의도된 빈 슬롯(승인 후 발급 코드 삽입)이며 동작에 영향 없음.
- **Type consistency**: `Row`, `CompareResult`, `ParsedFile`, `compareByKey(rowsA, rowsB, keyColumn)`, `parseFile(file)`, `buildResultWorkbook(result, keyColumn)` 시그니처가 Task 2~6 전반에서 일치.
