# excel-merge (엑셀 합치기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 여러 개를 올리면 열을 이름으로 맞춰 한 시트로 행을 쌓아 합치고, 출처 파일명 열(선택)을 붙여 다운로드하는 도구 `/excel-merge`를 출시한다 (전 과정 브라우저 클라이언트 처리).

**Architecture:** 순수 로직 `mergeRows`(열 합집합 + 행 쌓기 + 출처 열)를 `$lib/excel/merge.ts`에 TDD로, 내보내기 `buildMergeWorkbook`는 기존 `export.ts`에 추가. `/excel-merge` 페이지가 다중 업로드→merge→다운로드를 연결. 신규 의존성 없음(SheetJS·기존 parse.ts 재사용).

**Tech Stack:** SvelteKit(Svelte 5 runes) + SheetJS(xlsx, 기존) + vitest

**컨벤션 (이 repo):** 셀 값은 문자열(`Row = Record<string,string>`, `$lib/excel/types`), 한국어 describe/it·샘플 데이터, UI는 compare/split 페이지 구조·스타일 재사용, 한글 word-break:keep-all(전역), 커밋 `feat:`/`test:` prefix·한 작업 한 커밋.

**상위 문서:** 스펙 `docs/superpowers/specs/2026-06-11-excel-merge-design.md` (로직 §5, 흐름 §6, 에러 §7, 테스트 §8).

---

## File Structure

| 파일 | 책임 |
|------|------|
| Create `src/lib/excel/merge.ts` + `.test.ts` | `mergeRows(files, addSource)` 열 합집합 + 행 쌓기 + 출처 열 (순수, TDD) |
| Modify `src/lib/excel/export.ts` | `buildMergeWorkbook(result)` 단일 시트 내보내기 추가 |
| Create `src/lib/excel/merge-integration.test.ts` | merge→export→재파싱 round-trip |
| Create `src/routes/excel-merge/+page.svelte` | 다중 업로드→합치기→다운로드 + SEO 콘텐츠 |
| Modify `src/routes/+page.svelte` | 허브 카드(④) live 전환 |

---

### Task 1: 합치기 로직 `mergeRows` (TDD)

**Files:**
- Create: `src/lib/excel/merge.ts`
- Test: `src/lib/excel/merge.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/excel/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeRows } from './merge';
import type { MergeInput } from './merge';

const fileA: MergeInput = {
  name: '1월.xlsx',
  rows: [
    { 이름: '김철수', 부서: '영업' },
    { 이름: '이영희', 부서: '인사' }
  ]
};
const fileB: MergeInput = {
  name: '2월.xlsx',
  rows: [{ 이름: '박민수', 부서: '개발' }]
};

describe('mergeRows', () => {
  it('같은 열 파일들을 한 시트로 쌓는다 (총 행수 = 합)', () => {
    const r = mergeRows([fileA, fileB], false);
    expect(r.columns).toEqual(['이름', '부서']);
    expect(r.rows).toEqual([
      { 이름: '김철수', 부서: '영업' },
      { 이름: '이영희', 부서: '인사' },
      { 이름: '박민수', 부서: '개발' }
    ]);
  });

  it('열이 다르면 합집합으로 묶고 없는 열은 빈 칸이다', () => {
    const a: MergeInput = { name: 'a', rows: [{ 이름: '김', 부서: '영업' }] };
    const b: MergeInput = { name: 'b', rows: [{ 이름: '박', 직급: '대리' }] };
    const r = mergeRows([a, b], false);
    expect(r.columns).toEqual(['이름', '부서', '직급']);
    expect(r.rows).toEqual([
      { 이름: '김', 부서: '영업', 직급: '' },
      { 이름: '박', 부서: '', 직급: '대리' }
    ]);
  });

  it('addSource면 출처 열을 맨 앞에 두고 파일명을 채운다', () => {
    const r = mergeRows([fileA, fileB], true);
    expect(r.columns).toEqual(['출처', '이름', '부서']);
    expect(r.rows[0]).toEqual({ 출처: '1월.xlsx', 이름: '김철수', 부서: '영업' });
    expect(r.rows[2]).toEqual({ 출처: '2월.xlsx', 이름: '박민수', 부서: '개발' });
  });

  it('addSource가 false면 출처 열이 없다', () => {
    const r = mergeRows([fileA], false);
    expect(r.columns).not.toContain('출처');
  });

  it('빈 파일은 행을 기여하지 않는다', () => {
    const empty: MergeInput = { name: 'empty', rows: [] };
    const r = mergeRows([fileA, empty], false);
    expect(r.rows).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/merge.test.ts`
Expected: FAIL — `Cannot find module './merge'`

- [ ] **Step 3: 구현**

`src/lib/excel/merge.ts`:

```ts
import type { Row } from './types';

export interface MergeInput {
  name: string;
  rows: Row[];
}

export interface MergeResult {
  columns: string[];
  rows: Row[];
}

/**
 * 여러 파일의 행을 한 시트로 쌓아 합친다.
 * 열은 이름 기준 합집합(첫 등장 순), 없는 열은 빈 칸.
 * addSource면 '출처' 열을 맨 앞에 두고 파일명을 채운다.
 */
export function mergeRows(files: MergeInput[], addSource: boolean): MergeResult {
  const union: string[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    for (const row of f.rows) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          union.push(k);
        }
      }
    }
  }

  const columns = addSource ? ['출처', ...union] : [...union];
  const rows: Row[] = [];
  for (const f of files) {
    for (const row of f.rows) {
      const out: Row = {};
      if (addSource) out['출처'] = f.name;
      for (const col of union) out[col] = row[col] ?? '';
      rows.push(out);
    }
  }

  return { columns, rows };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/excel/merge.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excel/merge.ts src/lib/excel/merge.test.ts
git commit -m "feat: mergeRows — 열 합집합 + 행 쌓기 + 출처 열 (TDD)"
```

---

### Task 2: 내보내기 `buildMergeWorkbook` (통합 round-trip)

**Files:**
- Modify: `src/lib/excel/export.ts`
- Test: `src/lib/excel/merge-integration.test.ts`

- [ ] **Step 1: 실패하는 round-trip 테스트 작성**

`src/lib/excel/merge-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { mergeRows } from './merge';
import { buildMergeWorkbook } from './export';
import type { MergeInput } from './merge';
import type { Row } from './types';

const files: MergeInput[] = [
  { name: '1월.xlsx', rows: [{ 이름: '김철수', 부서: '영업' }] },
  { name: '2월.xlsx', rows: [{ 이름: '박민수', 직급: '대리' }] }
];

function readBack(buf: ArrayBuffer): { sheet: string; rows: Row[]; header: string[] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.SheetNames[0];
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { raw: false, defval: '' });
  const header = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []) as string[];
  return { sheet, rows, header };
}

describe('merge→buildMergeWorkbook 통합', () => {
  it('단일 시트 "합치기"로 만들어진다', () => {
    const { sheet } = readBack(buildMergeWorkbook(mergeRows(files, true)));
    expect(sheet).toBe('합치기');
  });

  it('열 순서(출처·합집합)와 출처·빈 칸이 보존된다', () => {
    const { rows, header } = readBack(buildMergeWorkbook(mergeRows(files, true)));
    expect(header).toEqual(['출처', '이름', '부서', '직급']);
    expect(rows[0]).toEqual({ 출처: '1월.xlsx', 이름: '김철수', 부서: '영업', 직급: '' });
    expect(rows[1]).toEqual({ 출처: '2월.xlsx', 이름: '박민수', 부서: '', 직급: '대리' });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/merge-integration.test.ts`
Expected: FAIL — `buildMergeWorkbook is not a function` (또는 import 에러)

- [ ] **Step 3: `export.ts`에 구현 추가**

`src/lib/excel/export.ts`의 import 줄에 추가:

```ts
import type { MergeResult } from './merge';
```

파일 끝에 추가:

```ts
/** MergeResult를 단일 시트('합치기') xlsx로 만든다. 열 순서는 result.columns로 강제. */
export function buildMergeWorkbook(result: MergeResult): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(result.rows.length ? result.rows : [{}], {
    header: result.columns
  });
  XLSX.utils.book_append_sheet(wb, ws, '합치기');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
```

- [ ] **Step 4: 테스트 통과 확인 + 전체**

Run: `npx vitest run src/lib/excel/merge-integration.test.ts`
Expected: PASS (2 tests)

Run: `npm test`
Expected: PASS — 기존 63 + merge 5 + merge-integration 2 = 70 tests

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excel/export.ts src/lib/excel/merge-integration.test.ts
git commit -m "feat: buildMergeWorkbook — 합친 결과 단일 시트 내보내기"
```

---

### Task 3: `/excel-merge` 페이지 UI + SEO 콘텐츠

**Files:**
- Create: `src/routes/excel-merge/+page.svelte`

- [ ] **Step 1: 페이지 작성**

`src/routes/excel-merge/+page.svelte`:

```svelte
<script lang="ts">
  import { parseFile } from '$lib/excel/parse';
  import { mergeRows, type MergeInput, type MergeResult } from '$lib/excel/merge';
  import { buildMergeWorkbook } from '$lib/excel/export';

  let inputs = $state<MergeInput[]>([]);
  let addSource = $state(true);
  let result = $state<MergeResult | null>(null);
  let busy = $state(false);
  let error = $state('');

  async function onUpload(e: Event) {
    error = '';
    result = null;
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    if (!files.length) return;
    busy = true;
    let failed = 0;
    for (const f of files) {
      try {
        const p = await parseFile(f);
        inputs = [...inputs, { name: f.name, rows: p.rows }];
      } catch {
        failed++;
      }
    }
    if (failed) error = `${failed}개 파일을 읽지 못했습니다. xlsx/xls/csv인지 확인해 주세요.`;
    busy = false;
    input.value = ''; // 같은 파일 다시 선택 가능하도록
  }

  function removeInput(i: number) {
    inputs = inputs.filter((_, idx) => idx !== i);
    result = null;
  }

  function runMerge() {
    error = '';
    if (!inputs.length) {
      error = '엑셀 파일을 1개 이상 올려 주세요.';
      return;
    }
    result = mergeRows(inputs, addSource);
  }

  function download() {
    if (!result) return;
    const bytes = buildMergeWorkbook(result);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '합쳐진_엑셀.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>엑셀 합치기 — 여러 엑셀을 하나로 | 엑셀왕</title>
  <meta
    name="description"
    content="여러 엑셀 파일을 한 시트로 합쳐 드립니다. 열 이름으로 자동 정렬, 출처 파일 표시. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>엑셀 합치기</h1>
<p class="lead">여러 엑셀 파일을 올리면 열을 맞춰 한 시트로 합쳐 드립니다.</p>

<div class="uploads">
  <label class="drop">
    <span>엑셀 파일 여러 개 선택</span>
    <input type="file" accept=".xlsx,.xls,.csv" multiple onchange={onUpload} />
  </label>
</div>

{#if busy}<p class="busy">파일을 읽는 중입니다…</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

{#if inputs.length}
  <ul class="filelist">
    {#each inputs as f, i}
      <li><b>{f.name}</b><span>{f.rows.length}행</span><button class="x" onclick={() => removeInput(i)} aria-label="파일 제거">×</button></li>
    {/each}
  </ul>

  <label class="opt"><input type="checkbox" bind:checked={addSource} /> 출처 파일명 열 추가</label>

  <div class="keyrow">
    <button onclick={runMerge}>합치기</button>
  </div>
{/if}

{#if result}
  <div class="summary">
    <div class="stat"><strong>{inputs.length}</strong><span>파일</span></div>
    <div class="stat"><strong>{result.rows.length}</strong><span>총 행</span></div>
    <div class="stat"><strong>{result.columns.length}</strong><span>열</span></div>
  </div>
  <button class="primary" onclick={download}>합친 엑셀 다운로드</button>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>합칠 엑셀 파일들을 한 번에(또는 여러 번 나눠) 올립니다. (.xlsx, .xls, .csv — 첫 시트 기준)</li>
    <li>필요하면 <b>출처 파일명 열 추가</b>를 켜서 각 행이 어느 파일에서 왔는지 표시합니다.</li>
    <li>[합치기]를 누르면 열을 이름으로 맞춰 한 시트로 쌓습니다.</li>
    <li>[합친 엑셀 다운로드]로 하나가 된 .xlsx 파일을 받습니다.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>월별·분기별로 나뉜 매출 파일을 한 표로 합산</li>
    <li>지점·부서별로 받은 명단을 하나로 모을 때</li>
    <li>같은 양식의 설문·접수 파일 여러 개를 한 번에</li>
    <li>복사·붙여넣기로 파일을 이어붙이던 작업을 클릭 한 번에</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. 합치기는 브라우저 안에서만 이뤄지고, 업로드한 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>파일마다 열이 조금 다른데 되나요?</h3>
  <p>됩니다. 열 이름을 기준으로 맞춰 합치고, 어떤 파일에 없는 열은 빈 칸으로 둡니다. 모든 열이 빠짐없이 들어갑니다.</p>
  <h3>각 행이 어느 파일에서 왔는지 알 수 있나요?</h3>
  <p>[출처 파일명 열 추가]를 켜면 맨 앞에 출처 열이 생겨 파일명을 표시합니다. 필요 없으면 꺼서 순수하게 행만 합칠 수 있습니다.</p>
  <h3>몇 개까지 합칠 수 있나요?</h3>
  <p>수십 개 파일, 수만 행도 무리 없이 합쳐집니다. 파일이 아주 많고 크면 브라우저 사양에 따라 느려질 수 있습니다.</p>

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
  .filelist {
    list-style: none; padding: 0; margin: 16px 0;
    border: 1px solid #eee; border-radius: 12px;
  }
  .filelist li {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; border-bottom: 1px solid #f3f3f3; font-size: 14px;
  }
  .filelist li:last-child { border-bottom: none; }
  .filelist b { flex: 1; font-weight: 600; }
  .filelist span { color: #777; }
  .filelist .x { background: none; border: none; padding: 0 6px; font-size: 18px; color: #999; cursor: pointer; }
  .opt { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; margin: 4px 0 16px; cursor: pointer; }
  .opt input { accent-color: #1a73e8; }
  .keyrow { display: flex; gap: 12px; margin: 0 0 8px; }
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
Expected: 빌드 성공

- [ ] **Step 3: dev 서버 수동 QA**

Run: `npm run dev` → `http://localhost:5173/excel-merge` (점유 시 다음 포트)
- 같은 양식 엑셀 2개 업로드 → 파일 목록·행수 표시 → [합치기] → 요약(파일/행/열) → 다운로드 → 엑셀 열어 행이 쌓이고 출처 열 확인
- 열이 다른 파일 2개 → 합집합·빈 칸 확인
- 출처 체크박스 끄고 합치기 → 출처 열 없음 확인
- 콘솔 에러 0. browse skill 사용 가능하면 활용.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/excel-merge/+page.svelte
git commit -m "feat: /excel-merge 페이지 — 다중 업로드·합치기·다운로드 + 콘텐츠"
```

---

### Task 4: 허브 카드 활성화 + 전체 검증 + 배포

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: 허브 카드 live 전환**

`src/routes/+page.svelte`에서 합치기 카드 줄을 찾는다:

```ts
    { href: '#', title: '엑셀 합치기', desc: '준비 중', live: false },
```

다음으로 교체:

```ts
    {
      href: '/excel-merge',
      title: '엑셀 합치기',
      desc: '여러 엑셀 파일을 열에 맞춰 한 시트로 합쳐 드립니다.',
      live: true
    },
```

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: PASS (70 tests)

Run: `npm run check`
Expected: 0 errors (기존 `node` 경고만)

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 허브에 excel-merge 카드 활성화 — 도구 5종 완성"
```

- [ ] **Step 4: 배포**

`main` push = Cloudflare Pages 자동배포. (이번 작업은 사용자가 push·배포까지 사전 승인함)

```bash
git push origin main
```

배포 후: https://excelking.pages.dev/excel-merge HTTP 200 + 렌더 확인. (CF Git 연동 끊김 이력 있음 — 안 뜨면 메모리 `project_excelking` 참고)
