# excel-theme (엑셀 외형 테마) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트 전체를 "엑셀처럼 보이는" 기능형 풀 엑셀 스킨으로 개편한다 — 공유 엑셀 크롬(제목표시줄·시트탭·수식줄·상태표시줄) + 허브 셀 그리드 + 5개 도구 페이지의 리본 동작 바. 가짜 장식 없이 눌리는 건 전부 진짜 동작.

**Architecture:** 표현 계층만 변경(기능 로직 무수정). 공유 컴포넌트(`SheetTabs`/`Ribbon`/`FormulaBar`) + 전역 테마 CSS + `tools.ts`(시트탭·허브 공통 소스) + `saveBlob` 유틸을 만들고, `+layout.svelte`에 엑셀 윈도우 크롬을 두고, 허브와 5개 페이지에 엑셀 틀을 입힌다.

**Tech Stack:** SvelteKit(Svelte 5 runes, `$app/state`) + 기존 도구 로직(무변경) + vitest(기존 70개 유지)

**컨벤션:** 한글 word-break:keep-all 유지, 엑셀 그린 `#217346`, 고정 height 금지(min-height), 커밋 `feat:`/`refactor:` prefix·한 작업 한 커밋. 각 페이지의 `<script>` 로직은 보존하고 마크업·스타일만 재구성.

**상위 문서:** 스펙 `docs/superpowers/specs/2026-06-11-excel-theme-design.md` (요소 매핑 §1, 비주얼 §5, 페이지별 §6, QA §8).

**검증 원칙:** 로직 무변경이라 새 단위 테스트 없음. 각 태스크 후 `npm run check`(0 errors) + 필요시 `npm run build`. 페이지 태스크는 browse 수동 QA(렌더+핵심동작+콘솔에러0). 마지막에 `npm test`(70 유지)·전체 QA·배포.

---

## File Structure

| 파일 | 책임 |
|------|------|
| Create `src/lib/theme/tools.ts` | 도구 목록(href·tab·title) — 시트탭·허브 공통 소스 |
| Create `src/lib/theme/excel.css` | 전역 엑셀 토큰·base·`.rbtn` 버튼·공통 클래스 |
| Create `src/lib/excel/download.ts` | `saveBlob(bytes, filename, mime)` + `XLSX_MIME` |
| Create `src/lib/components/SheetTabs.svelte` | 하단 시트 탭(허브+5도구), 현재 경로 active, 진짜 링크 |
| Create `src/lib/components/Ribbon.svelte` | 도구 동작 바 컨테이너(children 스니펫) |
| Create `src/lib/components/FormulaBar.svelte` | 이름상자(cell)+수식줄(value) 상태 표시 |
| Modify `src/routes/+layout.svelte` | 엑셀 윈도우: 제목표시줄 + main + 고정 하단바(시트탭+상태) |
| Modify `src/routes/+page.svelte` | 허브 = 셀 그리드(도구=셀, 클릭 이동) |
| Modify `src/routes/excel-compare/+page.svelte` | 리본+수식줄+엑셀 틀, saveBlob |
| Modify `src/routes/excel-split/+page.svelte` | 〃 |
| Modify `src/routes/pdf-to-excel/+page.svelte` | 〃 |
| Modify `src/routes/excel-merge/+page.svelte` | 〃 |
| Modify `src/routes/excel-dashboard/+page.svelte` | 〃 |

---

### Task 1: 공유 인프라 (tools·CSS·유틸·컴포넌트)

**Files:** Create `src/lib/theme/tools.ts`, `src/lib/theme/excel.css`, `src/lib/excel/download.ts`, `src/lib/components/SheetTabs.svelte`, `src/lib/components/Ribbon.svelte`, `src/lib/components/FormulaBar.svelte`

- [ ] **Step 1: 도구 목록 `tools.ts`**

```ts
export interface ToolDef {
  href: string;
  tab: string;
  title: string;
  desc: string;
}

export const TOOLS: ToolDef[] = [
  { href: '/excel-compare', tab: '비교', title: '두 엑셀 명단 비교·대조', desc: '두 파일을 키 열 기준으로 대조해 일치/불일치/변경을 찾아줍니다.' },
  { href: '/excel-split', tab: '분리', title: '엑셀 조건별 시트/파일 분리', desc: '열 값별로 행을 나눠 시트 또는 개별 파일(ZIP)로 내려받습니다.' },
  { href: '/pdf-to-excel', tab: 'PDF', title: 'PDF 표 → 엑셀 추출', desc: 'PDF 속 표를 찾아 페이지별 시트 엑셀로 추출합니다.' },
  { href: '/excel-merge', tab: '합치기', title: '엑셀 합치기', desc: '여러 엑셀 파일을 열에 맞춰 한 시트로 합쳐 드립니다.' },
  { href: '/excel-dashboard', tab: '대시보드', title: '엑셀 자동 대시보드', desc: '엑셀을 올리면 KPI·차트 대시보드를 자동 생성, 이미지로 저장합니다.' }
];
```

- [ ] **Step 2: 전역 테마 `excel.css`**

```css
:root {
  --xl-green: #217346;
  --xl-green-d: #1a5c38;
  --xl-chrome: #f3f2f1;
  --xl-border: #e0e0e0;
  --xl-sel: #e8f5ec;
  --xl-ink: #1a1a1a;
  --xl-bar-h: 64px;
}
body {
  margin: 0;
  font-family: 'Segoe UI', 'Pretendard', system-ui, sans-serif;
  color: var(--xl-ink);
  word-break: keep-all;
  background: #dfe3e8;
}
/* 리본 버튼 (도구 동작) */
.rbtn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border: 1px solid #c4c4c4; border-radius: 5px;
  background: #fff; color: var(--xl-ink); font-weight: 600; font-size: 13px;
  cursor: pointer; white-space: nowrap;
}
.rbtn:hover { background: #f5f5f5; }
.rbtn.primary { background: var(--xl-green); border-color: var(--xl-green); color: #fff; }
.rbtn.primary:hover { background: var(--xl-green-d); }
.rbtn:disabled { opacity: .45; cursor: default; }
```

- [ ] **Step 3: 다운로드 유틸 `download.ts`**

```ts
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** 바이트를 파일로 내려받게 한다. */
export function saveBlob(bytes: ArrayBuffer | Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: `SheetTabs.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  const tabs = [{ href: '/', tab: '허브' }, ...TOOLS.map((t) => ({ href: t.href, tab: t.tab }))];
</script>

<nav class="sheettabs" aria-label="도구">
  {#each tabs as t}
    <a href={t.href} class="tab" class:active={page.url.pathname === t.href}>{t.tab}</a>
  {/each}
</nav>

<style>
  .sheettabs { display: flex; gap: 2px; overflow-x: auto; padding: 0 8px; }
  .tab {
    flex: 0 0 auto; padding: 6px 16px; font-size: 13px; text-decoration: none;
    color: #555; background: #e9e7e3; border: 1px solid #cfcdc8; border-bottom: none;
    border-radius: 4px 4px 0 0; white-space: nowrap;
  }
  .tab:hover { background: #f1efec; }
  .tab.active { background: #fff; color: var(--xl-green); font-weight: 700; border-bottom: 2px solid var(--xl-green); }
</style>
```

- [ ] **Step 5: `Ribbon.svelte`**

```svelte
<script lang="ts">
  let { children } = $props();
</script>

<div class="ribbon">{@render children()}</div>

<style>
  .ribbon {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: var(--xl-chrome); border: 1px solid var(--xl-border);
    border-radius: 8px; padding: 10px 12px; margin: 0 0 12px;
  }
</style>
```

- [ ] **Step 6: `FormulaBar.svelte`**

```svelte
<script lang="ts">
  let { cell = '', value = '' }: { cell?: string; value?: string } = $props();
</script>

<div class="formulabar">
  <span class="namebox">{cell || ' '}</span>
  <span class="fx">fx</span>
  <span class="fval">{value}</span>
</div>

<style>
  .formulabar { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 13px; }
  .namebox { min-width: 80px; padding: 4px 10px; border: 1px solid #c4c4c4; border-radius: 4px; background: #fafafa; color: #555; }
  .fx { color: #999; font-style: italic; }
  .fval { color: #555; }
</style>
```

- [ ] **Step 7: 타입 체크**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만). 컴포넌트는 아직 미사용이라 unused 경고 가능 — 다음 태스크에서 사용됨.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/theme/tools.ts src/lib/theme/excel.css src/lib/excel/download.ts src/lib/components/SheetTabs.svelte src/lib/components/Ribbon.svelte src/lib/components/FormulaBar.svelte
git commit -m "feat: 엑셀 테마 공유 인프라 — tools·excel.css·saveBlob·SheetTabs·Ribbon·FormulaBar"
```

---

### Task 2: 레이아웃 = 엑셀 윈도우 크롬

**Files:** Modify `src/routes/+layout.svelte` (전체 교체)

- [ ] **Step 1: `+layout.svelte` 교체**

```svelte
<script lang="ts">
  import '$lib/theme/excel.css';
  import SheetTabs from '$lib/components/SheetTabs.svelte';
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  let { children } = $props();
  const current = $derived(TOOLS.find((t) => t.href === page.url.pathname));
</script>

<div class="xl-window">
  <header class="titlebar">
    <a href="/" class="brand">엑셀왕 <span>excelking</span></a>
    {#if current}<span class="doctitle">{current.title}</span>{/if}
  </header>

  <main>{@render children()}</main>
</div>

<div class="bottombar">
  <div class="bottombar-inner">
    <SheetTabs />
    <span class="status">🔒 모든 처리는 브라우저 안에서 · 파일은 서버로 전송되지 않습니다</span>
  </div>
</div>

<style>
  .xl-window {
    max-width: 1040px; margin: 16px auto; background: #fff;
    border: 1px solid #b8b8b8; border-radius: 8px; overflow: hidden;
    min-height: 70vh; padding-bottom: 8px;
  }
  .titlebar {
    background: var(--xl-green); color: #fff; padding: 10px 18px;
    display: flex; align-items: baseline; gap: 14px;
  }
  .brand { font-size: 18px; font-weight: 800; text-decoration: none; color: #fff; }
  .brand span { font-size: 12px; font-weight: 500; opacity: .75; }
  .doctitle { font-size: 13px; opacity: .9; }
  main { padding: 24px; }
  .bottombar {
    position: sticky; bottom: 0; z-index: 10;
    background: var(--xl-chrome); border-top: 1px solid #cfcdc8;
  }
  .bottombar-inner {
    max-width: 1040px; margin: 0 auto; padding: 6px 12px 4px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .status { font-size: 12px; color: #777; white-space: nowrap; }
  @media (max-width: 620px) { .status { display: none; } }
</style>
```

- [ ] **Step 2: 타입 체크 + 빌드**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: +layout 엑셀 윈도우 크롬 — 제목표시줄·시트탭·상태바"
```

---

### Task 3: 허브 = 셀 그리드

**Files:** Modify `src/routes/+page.svelte` (전체 교체)

- [ ] **Step 1: `+page.svelte` 교체**

```svelte
<script lang="ts">
  import { TOOLS } from '$lib/theme/tools';
  // 허브 셀 배치: 3열 그리드
  const COLS = ['A', 'B', 'C'];
  let selected = $state(TOOLS[0]);
</script>

<svelte:head>
  <title>엑셀왕 — 사무직 엑셀·문서 도구 모음 (무료, 설치 없이)</title>
  <meta
    name="description"
    content="두 엑셀 비교, PDF 표 추출, 시트 분리, 합치기, 자동 대시보드 등 사무직 엑셀 작업을 브라우저에서 무료로. 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<p class="lead">사무직의 반복 엑셀 작업을 브라우저에서 무료로. 셀을 눌러 도구를 여세요.</p>

<div class="formulabar">
  <span class="namebox">{selected.tab}</span>
  <span class="fx">fx</span>
  <span class="fval">{selected.title} — {selected.desc}</span>
</div>

<div class="sheet">
  <div class="corner"></div>
  {#each COLS as c}<div class="colhead">{c}</div>{/each}
  {#each Array(2) as _, r}
    <div class="rowhead">{r + 1}</div>
    {#each COLS as _, ci}
      {@const tool = TOOLS[r * 3 + ci]}
      {#if tool}
        <a
          class="cell"
          class:sel={selected === tool}
          href={tool.href}
          onmouseenter={() => (selected = tool)}>
          <b>{tool.title}</b>
          <span>{tool.desc}</span>
        </a>
      {:else}
        <div class="cell empty"></div>
      {/if}
    {/each}
  {/each}
</div>

<style>
  .lead { color: #555; font-size: 16px; margin: 0 0 16px; }
  .formulabar { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 13px; }
  .namebox { min-width: 70px; padding: 4px 10px; border: 1px solid #c4c4c4; border-radius: 4px; background: #fafafa; color: #555; text-align: center; }
  .fx { color: #999; font-style: italic; }
  .fval { color: #555; }
  .sheet {
    display: grid; grid-template-columns: 36px repeat(3, 1fr);
    border: 1px solid var(--xl-border); border-width: 1px 0 0 1px;
  }
  .corner, .colhead, .rowhead { background: var(--xl-chrome); border: 1px solid var(--xl-border); border-width: 0 1px 1px 0; }
  .colhead { text-align: center; padding: 6px; color: #777; font-size: 12px; }
  .rowhead { display: flex; align-items: center; justify-content: center; color: #777; font-size: 12px; }
  .cell {
    border: 1px solid var(--xl-border); border-width: 0 1px 1px 0;
    padding: 18px 16px; min-height: 88px; text-decoration: none; color: inherit;
    display: flex; flex-direction: column; gap: 6px; background: #fff;
  }
  .cell b { font-size: 15px; }
  .cell span { font-size: 13px; color: #666; }
  .cell:hover, .cell.sel { background: var(--xl-sel); outline: 2px solid var(--xl-green); outline-offset: -2px; }
  .cell.empty { background: #fbfbfb; pointer-events: none; }
  @media (max-width: 620px) {
    .sheet { grid-template-columns: 28px 1fr; }
    .colhead:nth-child(n+3), .cell:nth-child(3n+1) { display: none; }
  }
</style>
```

주의: 모바일 셀 숨김 규칙이 어색하면(그리드 깨짐) Step 3 QA에서 단순 1열 스택으로 조정. 데스크톱 3열이 기준.

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

- [ ] **Step 3: dev 서버 + browse QA**

Run: `npm run dev` → 허브(`/`) 접속
- 셀 그리드 렌더, 셀 호버 시 수식줄에 도구 설명, 셀 클릭 시 해당 도구로 이동, 하단 시트탭 동작 확인. 콘솔 에러 0. 스크린샷 확인.
- 모바일 폭(375)에서 깨지면 1열 스택으로 조정 후 재확인.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 허브를 엑셀 셀 그리드로 — 도구=셀, 클릭 이동"
```

---

### Task 4: 비교 페이지 엑셀 틀 (템플릿)

이 태스크가 도구 페이지 변환의 **기준 템플릿**이다. Task 5~8은 이 구조를 따른다.

**Files:** Modify `src/routes/excel-compare/+page.svelte`

**변환 규칙(공통):**
1. import 추가: `import Ribbon from '$lib/components/Ribbon.svelte';`, `import FormulaBar from '$lib/components/FormulaBar.svelte';`, `import { saveBlob, XLSX_MIME } from '$lib/excel/download';`
2. 기존 `download()` 내부의 Blob/a.click 배관을 `saveBlob(bytes, '비교결과.xlsx', XLSX_MIME)`로 교체.
3. 본문 상단에 `<Ribbon>`(주요 동작 버튼들, `.rbtn`/`.rbtn primary`)과 `<FormulaBar>`(상태) 추가. 기존 업로드/결과 마크업은 유지.
4. 파일 업로드는 숨긴 `<input type="file">`를 라벨/버튼이 트리거하도록(리본 버튼이 진짜 업로드). 패턴: `<button class="rbtn" onclick={() => aInput.click()}>📁 파일 A</button><input bind:this={aInput} type="file" hidden ... />`
5. 스코프 `<style>`의 파랑 `#1a73e8` → `var(--xl-green)`. 기존 `.drop` 업로드 카드는 제거(리본으로 대체) 또는 보조로 유지 — 리본 우선.
6. `<svelte:head>`·하단 `.content`(사용법/FAQ)·`.privacy`는 유지.

- [ ] **Step 1: 페이지 변환**

`src/routes/excel-compare/+page.svelte` `<script>`에 추가/수정:

```ts
  import Ribbon from '$lib/components/Ribbon.svelte';
  import FormulaBar from '$lib/components/FormulaBar.svelte';
  import { saveBlob, XLSX_MIME } from '$lib/excel/download';

  let aInput = $state<HTMLInputElement>();
  let bInput = $state<HTMLInputElement>();
```

기존 `download()` 함수 본문을 다음으로 교체:

```ts
  function download() {
    if (!result) return;
    saveBlob(buildResultWorkbook(result, keyColumn), '비교결과.xlsx', XLSX_MIME);
  }
```

본문(템플릿 상단, `<h1>` 자리)을 리본+수식줄 구조로 교체:

```svelte
<Ribbon>
  <button class="rbtn" onclick={() => aInput?.click()}>📁 파일 A {fileA ? `· ${fileA.rows.length}행` : ''}</button>
  <button class="rbtn" onclick={() => bInput?.click()}>📁 파일 B {fileB ? `· ${fileB.rows.length}행` : ''}</button>
  <button class="rbtn primary" onclick={runCompare} disabled={!fileA || !fileB || !keyColumn}>▶ 비교 실행</button>
  <button class="rbtn" onclick={download} disabled={!result}>⤓ 결과 다운로드</button>
</Ribbon>
<input bind:this={aInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={(e) => onUpload(e, 'A')} />
<input bind:this={bInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={(e) => onUpload(e, 'B')} />

<FormulaBar cell="기준열" value={keyColumn || '두 파일을 올리고 기준 열을 고르세요'} />

<h1 class="ptitle">두 엑셀 명단 비교·대조</h1>
```

기존 키 선택(`.keyrow`)·요약(`.summary`)·결과·`.privacy`·`.content`는 그대로 둔다. 기존 `.uploads`/`.drop` 블록은 삭제(리본이 대체). 스타일에서 `#1a73e8`을 `var(--xl-green)`로 일괄 치환, `.ptitle { font-size:22px; margin:0 0 12px; }` 추가.

- [ ] **Step 2: 타입 체크 + 빌드**

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: browse QA**

dev 서버 → `/excel-compare`
- 리본 `📁 파일 A`·`📁 파일 B` 클릭 → 파일 선택 동작, 행수 표시
- 공통 열 자동 인식 → 기준 열 선택 → `▶ 비교 실행` → 요약 표시
- `⤓ 결과 다운로드` → xlsx 받아짐, 콘솔 에러 0. 스크린샷.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/excel-compare/+page.svelte
git commit -m "refactor: 비교 페이지 엑셀 틀 — 리본 동작 바·수식줄·saveBlob"
```

---

### Task 5: 분리 페이지 엑셀 틀

**Files:** Modify `src/routes/excel-split/+page.svelte`

Task 4의 변환 규칙을 따른다. 리본/수식줄 사양(스펙 §6):

- [ ] **Step 1: 페이지 변환**

import 3종 추가(Ribbon·FormulaBar·{saveBlob, XLSX_MIME}). `let fileInput = $state<HTMLInputElement>();` 추가.

`download()`의 Blob 배관을 교체:
```ts
  function download() {
    if (!groups) return;
    if (mode === 'sheets') {
      saveBlob(buildSplitWorkbook(groups), `${fileName}_분리.xlsx`, XLSX_MIME);
    } else {
      saveBlob(buildSplitZip(groups), `${fileName}_분리.zip`, 'application/zip');
    }
  }
```

본문 상단(`<h1>` 자리)을 교체:
```svelte
<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 파일 열기 {file ? `· ${file.rows.length}행` : ''}</button>
  <button class="rbtn primary" onclick={runSplit} disabled={!file || !splitColumn}>▶ 분리</button>
  <button class="rbtn" onclick={download} disabled={!groups}>⤓ {mode === 'sheets' ? '시트 다운로드' : 'ZIP 다운로드'}</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={onUpload} />
<FormulaBar cell="분리 기준" value={splitColumn || '파일을 올리고 기준 열을 고르세요'} />
<h1 class="ptitle">엑셀 조건별 시트/파일 분리</h1>
```

기존 `.uploads`/`.drop` 삭제, 기존 기준열 선택·그룹목록·모드 라디오·요약·콘텐츠 유지. 스타일 `#1a73e8`→`var(--xl-green)`, `.ptitle` 추가.

- [ ] **Step 2: 검증** — `npm run check`(0 errors) + browse QA(`/excel-split`: 파일 열기→기준열→분리→그룹목록→두 모드 다운로드, 콘솔 0).

- [ ] **Step 3: 커밋**

```bash
git add src/routes/excel-split/+page.svelte
git commit -m "refactor: 분리 페이지 엑셀 틀 — 리본·수식줄·saveBlob"
```

---

### Task 6: PDF→엑셀 페이지 엑셀 틀

**Files:** Modify `src/routes/pdf-to-excel/+page.svelte`

- [ ] **Step 1: 페이지 변환**

import 3종 추가. `let fileInput = $state<HTMLInputElement>();` 추가.

`download()`의 Blob 배관 교체:
```ts
  function download() {
    if (!pages) return;
    saveBlob(buildPdfWorkbook(pages), `${fileName}_표.xlsx`, XLSX_MIME);
  }
```

본문 상단 교체:
```svelte
<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 PDF 열기 {fileName ? `· ${fileName}` : ''}</button>
  <button class="rbtn primary" onclick={download} disabled={!pages}>⤓ 엑셀 다운로드</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept="application/pdf,.pdf" hidden onchange={onUpload} />
<FormulaBar cell="추출" value={pages ? `${pages.length}페이지 · 표 ${pages.filter((p) => p.grid.length > 0).length}개` : (busy ? '처리 중…' : 'PDF를 올려 주세요')} />
<h1 class="ptitle">PDF 표 → 엑셀 추출</h1>
```

기존 `.uploads`/`.drop` 삭제, busy/error·요약·미리보기·콘텐츠 유지. 기존 `[엑셀 다운로드]` 버튼은 리본으로 이동했으니 본문 중복 버튼 제거. 스타일 `#1a73e8`→`var(--xl-green)`, `.ptitle` 추가.

- [ ] **Step 2: 검증** — `npm run check`(0) + `npm run build`(pdf.js 번들 확인) + browse QA(`/pdf-to-excel`: PDF 열기→미리보기 렌더→다운로드, 콘솔 0).

- [ ] **Step 3: 커밋**

```bash
git add src/routes/pdf-to-excel/+page.svelte
git commit -m "refactor: PDF→엑셀 페이지 엑셀 틀 — 리본·수식줄·saveBlob"
```

---

### Task 7: 합치기 페이지 엑셀 틀

**Files:** Modify `src/routes/excel-merge/+page.svelte`

- [ ] **Step 1: 페이지 변환**

import 3종 추가. `let fileInput = $state<HTMLInputElement>();` 추가.

`download()`의 Blob 배관 교체:
```ts
  function download() {
    if (!result) return;
    saveBlob(buildMergeWorkbook(result), '합쳐진_엑셀.xlsx', XLSX_MIME);
  }
```

본문 상단 교체:
```svelte
<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 파일 추가</button>
  <button class="rbtn primary" onclick={runMerge} disabled={!inputs.length}>▶ 합치기</button>
  <button class="rbtn" onclick={download} disabled={!result}>⤓ 다운로드</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept=".xlsx,.xls,.csv" multiple hidden onchange={onUpload} />
<FormulaBar cell="파일" value={inputs.length ? `${inputs.length}개 · ${inputs.reduce((n, f) => n + f.rows.length, 0)}행` : '엑셀 파일을 추가하세요'} />
<h1 class="ptitle">엑셀 합치기</h1>
```

기존 `.uploads`/`.drop` 삭제, 파일목록·출처 체크박스·요약·콘텐츠 유지. 기존 `.keyrow`의 합치기 버튼은 리본으로 이동(중복 제거). 스타일 `#1a73e8`→`var(--xl-green)`, `.ptitle` 추가.

- [ ] **Step 2: 검증** — `npm run check`(0) + browse QA(`/excel-merge`: 파일 추가(여러개)→합치기→요약→다운로드, 콘솔 0).

- [ ] **Step 3: 커밋**

```bash
git add src/routes/excel-merge/+page.svelte
git commit -m "refactor: 합치기 페이지 엑셀 틀 — 리본·수식줄·saveBlob"
```

---

### Task 8: 대시보드 페이지 엑셀 틀

**Files:** Modify `src/routes/excel-dashboard/+page.svelte`

- [ ] **Step 1: 페이지 변환**

import 추가: `import Ribbon from '$lib/components/Ribbon.svelte';`, `import FormulaBar from '$lib/components/FormulaBar.svelte';` (대시보드는 PNG 저장이라 saveBlob 미사용 — 기존 canvas.toBlob 유지). `let fileInput = $state<HTMLInputElement>();` 추가.

본문 상단(요약/툴바 위)을 교체. 기존 `.toolbar`의 [+ 차트 추가] 폼은 유지하되, 업로드·PNG 저장은 리본으로:
```svelte
<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 엑셀 열기 {fileName ? `· ${fileName}` : ''}</button>
  <button class="rbtn primary" onclick={savePng} disabled={!parsed}>📷 PNG 저장</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={onUpload} />
<FormulaBar cell="분석" value={parsed ? summary : (busy ? '분석 중…' : '엑셀을 올려 주세요')} />
<h1 class="ptitle">엑셀 자동 대시보드</h1>
```

기존 상단 `.uploads`/`.drop` 삭제, 기존 `.toolbar` 안의 [📷 PNG로 저장] 버튼은 리본으로 옮겼으니 제거(차트 추가 폼은 유지). KPI·차트·콘텐츠 유지. 스타일 `#1a73e8`→`var(--xl-green)`(차트 색 `#1a73e8`도 그린으로? 차트 데이터 색은 유지 가능 — 버튼/액센트만 그린), `.ptitle` 추가.

주의: 차트 데이터셋 색(`#1a73e8`, PALETTE)은 그대로 둬도 무방(가독성). 버튼·테두리 액센트만 그린으로.

- [ ] **Step 2: 검증** — `npm run check`(0) + `npm run build` + browse QA(`/excel-dashboard`: 엑셀 열기→자동 차트 렌더→차트 추가/제거→PNG 저장, 콘솔 0).

- [ ] **Step 3: 커밋**

```bash
git add src/routes/excel-dashboard/+page.svelte
git commit -m "refactor: 대시보드 페이지 엑셀 틀 — 리본·수식줄"
```

---

### Task 9: 전체 회귀 검증 + 배포

**Files:** 없음(검증·배포만)

- [ ] **Step 1: 전체 테스트·체크·빌드**

Run: `npm test`
Expected: PASS (70 — 로직 무변경)

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 2: 전체 browse 회귀 QA**

dev 서버에서 6개 화면 각각 확인:
- 허브: 셀 그리드, 셀 클릭 이동
- 5개 도구: 시트탭 네비게이션 + 각 도구 핵심 동작(업로드→실행/처리→다운로드)이 리본에서 정상 작동
- 모든 페이지 콘솔 에러 0, 외형 일관(녹색 크롬·시트탭). 각 화면 스크린샷.

- [ ] **Step 3: 배포 (사용자 사전 승인됨 — "작업 전부 진행해")**

```bash
git push origin main
```

배포 후: https://excelking.pages.dev 허브 + 각 도구 URL HTTP 200 + 엑셀 테마 렌더 확인. (CF Git 연동 끊김 이력 — 안 뜨면 메모리 `project_excelking` 참고)

- [ ] **Step 4: 라이브 회귀 QA**

라이브에서 허브→각 도구 시트탭 이동 + 1개 도구 실제 파일 처리 1회 확인.
