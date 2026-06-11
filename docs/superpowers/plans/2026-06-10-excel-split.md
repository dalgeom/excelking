# excel-split (조건별 시트/파일 분리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 한 파일을 올려 기준 열을 고르면, 열 값별로 행을 그룹화해 "한 파일·여러 시트" 또는 "여러 파일 ZIP"으로 내려받는 도구 `/excel-split`을 출시한다.

**Architecture:** 기존 excel-compare와 동일 패턴 — `$lib/excel/`의 순수 함수(분리 로직 `split.ts`, 이름 정리 `names.ts`, 내보내기는 기존 `export.ts`에 추가)를 TDD로 만들고, `/excel-split/+page.svelte`가 parse→split→export를 연결한다. 전 과정 브라우저 클라이언트 처리, 서버 전송 없음.

**Tech Stack:** SvelteKit(Svelte 5 runes) + SheetJS(xlsx) + fflate(ZIP 생성, 신규 의존성, 클라이언트 전용) + vitest

**컨벤션 (이 repo 기준):**
- 모든 셀 값은 문자열(`Row = Record<string, string>`), 키 비교 시 trim
- 테스트는 한국어 describe/it, 한국어 샘플 데이터
- UI는 compare 페이지의 구조·스타일 재사용 (lead → 업로드 → 옵션 → 결과 summary → 다운로드 → privacy 문구 → 사용법/FAQ 콘텐츠 → ad-slot)
- 한글 word-break: keep-all (레이아웃에 이미 전역 적용됨)
- 커밋 메시지: `feat:`/`test:` prefix, 한 작업 = 한 커밋

---

## File Structure

| 파일 | 책임 |
|------|------|
| Create `src/lib/excel/split.ts` | 순수 분리 로직: 열 값 기준 그룹화 |
| Create `src/lib/excel/split.test.ts` | 분리 로직 단위 테스트 |
| Create `src/lib/excel/names.ts` | 시트명/파일명 정리(금지문자·길이·중복) 순수 함수 |
| Create `src/lib/excel/names.test.ts` | 이름 정리 단위 테스트 |
| Modify `src/lib/excel/export.ts` | `buildSplitWorkbook`(시트 분리), `buildSplitZip`(파일 ZIP) 추가 |
| Create `src/lib/excel/split-integration.test.ts` | split→export→재파싱 round-trip 통합 테스트 |
| Create `src/routes/excel-split/+page.svelte` | 도구 UI + SEO 콘텐츠 |
| Modify `src/routes/+page.svelte:9` | 허브 카드 live 전환 |
| Modify `package.json` | fflate 의존성 추가 (Task 4에서 `npm install fflate`) |

---

### Task 1: 분리 로직 `splitByColumn` (TDD)

**Files:**
- Create: `src/lib/excel/split.ts`
- Test: `src/lib/excel/split.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/excel/split.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitByColumn } from './split';
import type { Row } from './types';

const ROWS: Row[] = [
  { 이름: '김철수', 부서: '영업', 직급: '대리' },
  { 이름: '이영희', 부서: '인사', 직급: '과장' },
  { 이름: '박민수', 부서: '영업', 직급: '사원' },
  { 이름: '최지우', 부서: ' 영업 ', 직급: '부장' },
  { 이름: '정하늘', 부서: '', 직급: '사원' }
];

describe('splitByColumn', () => {
  it('기준 열 값별로 행을 그룹화한다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const byValue = Object.fromEntries(groups.map((g) => [g.value, g.rows.length]));
    expect(byValue['영업']).toBe(3);
    expect(byValue['인사']).toBe(1);
  });

  it('그룹 순서는 값의 첫 등장 순서를 따른다', () => {
    const groups = splitByColumn(ROWS, '부서');
    expect(groups.map((g) => g.value)).toEqual(['영업', '인사', '(빈 값)']);
  });

  it('값의 앞뒤 공백은 무시하고 같은 그룹으로 묶는다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const sales = groups.find((g) => g.value === '영업')!;
    expect(sales.rows.map((r) => r.이름)).toEqual(['김철수', '박민수', '최지우']);
  });

  it('빈 값은 "(빈 값)" 그룹으로 묶는다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const empty = groups.find((g) => g.value === '(빈 값)')!;
    expect(empty.rows.map((r) => r.이름)).toEqual(['정하늘']);
  });

  it('그룹 안 행 순서는 원본 순서를 유지한다', () => {
    const groups = splitByColumn(ROWS, '직급');
    const staff = groups.find((g) => g.value === '사원')!;
    expect(staff.rows.map((r) => r.이름)).toEqual(['박민수', '정하늘']);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/split.test.ts`
Expected: FAIL — `Cannot find module './split'`

- [ ] **Step 3: 최소 구현**

`src/lib/excel/split.ts`:

```ts
import type { Row } from './types';

export interface SplitGroup {
  /** 기준 열의 값(트림됨). 빈 값은 '(빈 값)' */
  value: string;
  rows: Row[];
}

const norm = (v: unknown): string => String(v ?? '').trim();

/**
 * 행 배열을 column 값 기준으로 그룹화한다.
 * 값은 앞뒤 공백을 무시하고, 빈 값은 '(빈 값)' 그룹으로 묶는다.
 * 그룹 순서는 값의 첫 등장 순서, 그룹 내 행 순서는 원본 순서를 유지한다.
 */
export function splitByColumn(rows: Row[], column: string): SplitGroup[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const key = norm(row[column]) || '(빈 값)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()].map(([value, rows]) => ({ value, rows }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/excel/split.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excel/split.ts src/lib/excel/split.test.ts
git commit -m "feat: splitByColumn — 열 값 기준 행 그룹화 (TDD)"
```

---

### Task 2: 시트명/파일명 정리 `names.ts` (TDD)

엑셀 시트명 규칙: 금지문자 `: \ / ? * [ ]`, 최대 31자, 빈 이름 불가, 중복 불가(대소문자 무시).
Windows 파일명 규칙: 금지문자 `\ / : * ? " < > |`.

**Files:**
- Create: `src/lib/excel/names.ts`
- Test: `src/lib/excel/names.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/excel/names.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sanitizeSheetName, sanitizeFileName, uniqueNames } from './names';

describe('sanitizeSheetName', () => {
  it('엑셀 시트명 금지문자를 공백으로 바꾼다', () => {
    expect(sanitizeSheetName('영업/마케팅[1]')).toBe('영업 마케팅 1');
  });

  it('31자를 넘으면 자른다', () => {
    expect(sanitizeSheetName('가'.repeat(40))).toHaveLength(31);
  });

  it('정리 후 빈 문자열이면 "_"를 돌려준다', () => {
    expect(sanitizeSheetName('***')).toBe('_');
  });
});

describe('sanitizeFileName', () => {
  it('Windows 파일명 금지문자를 공백으로 바꾼다', () => {
    expect(sanitizeFileName('보고서: 1분기 <최종>')).toBe('보고서  1분기  최종');
  });

  it('정리 후 빈 문자열이면 "_"를 돌려준다', () => {
    expect(sanitizeFileName('???')).toBe('_');
  });
});

describe('uniqueNames', () => {
  it('중복 이름에 (2), (3) 접미사를 붙인다', () => {
    expect(uniqueNames(['영업', '영업', '영업'])).toEqual(['영업', '영업 (2)', '영업 (3)']);
  });

  it('대소문자만 다른 이름도 중복으로 본다 (엑셀 시트명 규칙)', () => {
    expect(uniqueNames(['Sales', 'sales'])).toEqual(['Sales', 'sales (2)']);
  });

  it('접미사를 붙여도 maxLen을 넘지 않는다', () => {
    const long = '가'.repeat(31);
    const result = uniqueNames([long, long], 31);
    expect(result[1]).toHaveLength(31);
    expect(result[1].endsWith(' (2)')).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/names.test.ts`
Expected: FAIL — `Cannot find module './names'`

- [ ] **Step 3: 최소 구현**

`src/lib/excel/names.ts`:

```ts
/** 엑셀 시트명 규칙(금지문자 : \ / ? * [ ], 최대 31자)에 맞게 정리한다. */
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31).trim();
  return cleaned || '_';
}

/** Windows 파일명 금지문자(\ / : * ? " < > |)를 제거하고 80자로 자른다. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 80).trim();
  return cleaned || '_';
}

/**
 * 이름 배열의 중복에 ' (2)', ' (3)' 접미사를 붙여 유일하게 만든다.
 * 비교는 대소문자 무시(엑셀 시트명 규칙), 접미사 포함 maxLen을 넘지 않게 앞을 자른다.
 */
export function uniqueNames(names: string[], maxLen = 31): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      const suffix = ` (${n++})`;
      candidate = name.slice(0, maxLen - suffix.length).trimEnd() + suffix;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/excel/names.test.ts`
Expected: PASS (8 tests)

주의: `uniqueNames`의 maxLen 테스트는 `trimEnd()` 때문에 길이가 31보다 짧아질 수 있다. 실패하면 기대값을 `result[1].length <= 31`로 보고 `endsWith(' (2)')`만 고정해도 무방 — 단 구현과 테스트가 일치해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excel/names.ts src/lib/excel/names.test.ts
git commit -m "feat: 시트명/파일명 정리 함수 — 금지문자·길이·중복 처리 (TDD)"
```

---

### Task 3: 시트 분리 내보내기 `buildSplitWorkbook` (통합 테스트)

**Files:**
- Modify: `src/lib/excel/export.ts` (함수 추가)
- Test: `src/lib/excel/split-integration.test.ts` (신규)

- [ ] **Step 1: 실패하는 round-trip 테스트 작성**

`src/lib/excel/split-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { splitByColumn } from './split';
import { buildSplitWorkbook } from './export';
import type { Row } from './types';

const ROWS: Row[] = [
  { 이름: '김철수', 부서: '영업' },
  { 이름: '이영희', 부서: '인사' },
  { 이름: '박민수', 부서: '영업' }
];

function readBack(buf: ArrayBuffer): Record<string, Row[]> {
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, Row[]> = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { raw: false, defval: '' });
  }
  return out;
}

describe('split→buildSplitWorkbook 통합', () => {
  it('그룹별 시트가 첫 등장 순서로 만들어진다', () => {
    const wb = readBack(buildSplitWorkbook(splitByColumn(ROWS, '부서')));
    expect(Object.keys(wb)).toEqual(['영업', '인사']);
  });

  it('각 시트의 행이 그룹과 일치한다', () => {
    const wb = readBack(buildSplitWorkbook(splitByColumn(ROWS, '부서')));
    expect(wb['영업'].map((r) => r.이름)).toEqual(['김철수', '박민수']);
    expect(wb['인사'].map((r) => r.이름)).toEqual(['이영희']);
  });

  it('시트명 금지문자가 들어간 값도 안전하게 시트가 된다', () => {
    const rows: Row[] = [
      { 이름: 'a', 팀: '영업/마케팅' },
      { 이름: 'b', 팀: '영업?마케팅' }
    ];
    const wb = readBack(buildSplitWorkbook(splitByColumn(rows, '팀')));
    expect(Object.keys(wb)).toEqual(['영업 마케팅', '영업 마케팅 (2)']);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/split-integration.test.ts`
Expected: FAIL — `buildSplitWorkbook is not a function` (또는 import 에러)

- [ ] **Step 3: `export.ts`에 구현 추가**

`src/lib/excel/export.ts`의 import에 추가:

```ts
import type { SplitGroup } from './split';
import { sanitizeSheetName, uniqueNames } from './names';
```

파일 끝에 추가:

```ts
/** SplitGroup 배열을 한 워크북(그룹=시트)으로 만든다. 시트명은 정리·중복 해소. */
export function buildSplitWorkbook(groups: SplitGroup[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const names = uniqueNames(groups.map((g) => sanitizeSheetName(g.value)), 31);
  groups.forEach((g, i) => {
    const ws = XLSX.utils.json_to_sheet(g.rows.length ? g.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, names[i]);
  });
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/excel/split-integration.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excel/export.ts src/lib/excel/split-integration.test.ts
git commit -m "feat: buildSplitWorkbook — 그룹별 시트 분리 내보내기"
```

---

### Task 4: 파일 ZIP 내보내기 `buildSplitZip` (fflate)

**Files:**
- Modify: `package.json` (fflate 설치)
- Modify: `src/lib/excel/export.ts` (함수 추가)
- Modify: `src/lib/excel/split-integration.test.ts` (테스트 추가)

- [ ] **Step 1: fflate 설치**

Run: `npm install fflate`
Expected: package.json dependencies에 `"fflate"` 추가됨 (클라이언트 전용 ~8KB zip 라이브러리)

- [ ] **Step 2: 실패하는 round-trip 테스트 추가**

`src/lib/excel/split-integration.test.ts` 상단 import에 추가:

```ts
import { unzipSync } from 'fflate';
import { buildSplitZip } from './export';
```

파일 끝에 describe 추가:

```ts
describe('split→buildSplitZip 통합', () => {
  it('그룹별 xlsx 파일이 ZIP에 들어간다', () => {
    const zip = unzipSync(buildSplitZip(splitByColumn(ROWS, '부서')));
    expect(Object.keys(zip).sort()).toEqual(['영업.xlsx', '인사.xlsx']);
  });

  it('ZIP 안 xlsx를 다시 읽으면 그룹 행과 일치한다', () => {
    const zip = unzipSync(buildSplitZip(splitByColumn(ROWS, '부서')));
    const wb = XLSX.read(zip['영업.xlsx'], { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], {
      raw: false,
      defval: ''
    });
    expect(rows.map((r) => r.이름)).toEqual(['김철수', '박민수']);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/excel/split-integration.test.ts`
Expected: FAIL — `buildSplitZip is not a function` (또는 import 에러)

- [ ] **Step 4: `export.ts`에 구현 추가**

import에 추가:

```ts
import { zipSync } from 'fflate';
import { sanitizeFileName } from './names'; // 기존 names import 줄에 합치기
```

파일 끝에 추가:

```ts
/** SplitGroup 배열을 그룹별 xlsx 파일로 만들어 ZIP(Uint8Array)으로 묶는다. */
export function buildSplitZip(groups: SplitGroup[]): Uint8Array {
  const names = uniqueNames(groups.map((g) => sanitizeFileName(g.value)), 80);
  const files: Record<string, Uint8Array> = {};
  groups.forEach((g, i) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(g.rows.length ? g.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    files[`${names[i]}.xlsx`] = new Uint8Array(buf);
  });
  // xlsx는 이미 압축돼 있어 재압축 이득이 없다
  return zipSync(files, { level: 0 });
}
```

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 기존 8 + Task1 5 + Task2 8 + Task3 3 + Task4 2 = 26 tests

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json src/lib/excel/export.ts src/lib/excel/split-integration.test.ts
git commit -m "feat: buildSplitZip — 그룹별 파일 ZIP 내보내기 (fflate)"
```

---

### Task 5: `/excel-split` 페이지 UI + SEO 콘텐츠

**Files:**
- Create: `src/routes/excel-split/+page.svelte`

- [ ] **Step 1: 페이지 작성**

`src/routes/excel-split/+page.svelte` (compare 페이지 구조·스타일 재사용):

```svelte
<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { splitByColumn, type SplitGroup } from '$lib/excel/split';
  import { buildSplitWorkbook, buildSplitZip } from '$lib/excel/export';

  let file = $state<ParsedFile | null>(null);
  let fileName = $state('');
  let splitColumn = $state('');
  let groups = $state<SplitGroup[] | null>(null);
  let mode = $state<'sheets' | 'files'>('sheets');
  let error = $state('');

  async function onUpload(e: Event) {
    error = '';
    groups = null;
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      file = await parseFile(f);
      fileName = f.name.replace(/\.[^.]+$/, '');
      splitColumn = '';
    } catch {
      error = '파일을 읽지 못했습니다. xlsx/xls/csv 형식인지 확인해 주세요.';
    }
  }

  function runSplit() {
    error = '';
    if (!file) { error = '파일을 올려 주세요.'; return; }
    if (!splitColumn) { error = '분리 기준이 될 열을 선택해 주세요.'; return; }
    groups = splitByColumn(file.rows, splitColumn);
  }

  function saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function download() {
    if (!groups) return;
    if (mode === 'sheets') {
      const bytes = buildSplitWorkbook(groups);
      saveBlob(
        new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        `${fileName}_분리.xlsx`
      );
    } else {
      const bytes = buildSplitZip(groups);
      saveBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), `${fileName}_분리.zip`);
    }
  }
</script>

<svelte:head>
  <title>엑셀 조건별 시트/파일 분리 — 엑셀왕</title>
  <meta
    name="description"
    content="엑셀 파일을 부서·지역·담당자 등 열 값별로 나눠 시트 또는 개별 파일(ZIP)로 내려받으세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>엑셀 조건별 시트/파일 분리</h1>
<p class="lead">파일을 올리고 기준 열을 고르면, 열 값별로 나눠 시트 또는 개별 파일로 만들어 드립니다.</p>

<div class="uploads">
  <label class="drop">
    <span>엑셀 파일 {file ? `· ${file.rows.length}행` : ''}</span>
    <input type="file" accept=".xlsx,.xls,.csv" onchange={onUpload} />
  </label>
</div>

{#if file && file.columns.length > 0}
  <div class="keyrow">
    <label for="key">분리 기준 열</label>
    <select id="key" bind:value={splitColumn}>
      <option value="" disabled>열 선택</option>
      {#each file.columns as c}<option value={c}>{c}</option>{/each}
    </select>
    <button onclick={runSplit}>분리하기</button>
  </div>
{:else if file}
  <p class="error">열 이름(첫 행)을 찾지 못했습니다. 첫 행이 머리글인지 확인해 주세요.</p>
{/if}

{#if error}<p class="error">{error}</p>{/if}

{#if groups}
  <div class="summary">
    <div class="stat"><strong>{groups.length}</strong><span>그룹</span></div>
    <div class="stat"><strong>{groups.reduce((n, g) => n + g.rows.length, 0)}</strong><span>전체 행</span></div>
  </div>

  <ul class="grouplist">
    {#each groups as g}
      <li><b>{g.value}</b><span>{g.rows.length}행</span></li>
    {/each}
  </ul>

  <div class="moderow" role="radiogroup" aria-label="결과 형태">
    <label><input type="radio" bind:group={mode} value="sheets" /> 한 파일, 시트로 분리 (.xlsx)</label>
    <label><input type="radio" bind:group={mode} value="files" /> 여러 파일로 분리 (.zip)</label>
  </div>

  <button class="primary" onclick={download}>
    {mode === 'sheets' ? '분리된 엑셀 다운로드' : 'ZIP 다운로드'}
  </button>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>분리할 엑셀 파일을 올립니다. (.xlsx, .xls, .csv — 첫 시트 기준)</li>
    <li><b>분리 기준이 될 열</b>(예: 부서, 지역, 담당자)을 고릅니다.</li>
    <li>[분리하기]를 누르면 열 값별 그룹과 행 수를 미리 보여줍니다.</li>
    <li>결과 형태를 고릅니다 — 한 파일 안에 <b>시트로 분리</b>하거나, 그룹마다 <b>개별 파일(ZIP)</b>로 받습니다.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>전체 직원 명단을 부서별 시트로 나눠 부서장에게 공유</li>
    <li>거래처 목록을 담당자별 파일로 쪼개서 각자에게 전달</li>
    <li>주문 내역을 지역별로 분리해 지점별 보고서 작성</li>
    <li>필터 걸고 복사·붙여넣기를 반복하던 작업을 클릭 한 번에</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. 모든 처리는 브라우저 안에서만 이뤄지고, 업로드한 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>기준 열에 빈 칸이 있으면 어떻게 되나요?</h3>
  <p>빈 값인 행들은 "(빈 값)" 그룹으로 따로 모아 드립니다. 누락 없이 전체 행이 보존됩니다.</p>
  <h3>시트 이름에 쓸 수 없는 문자가 값에 들어 있으면요?</h3>
  <p>엑셀 시트명에 허용되지 않는 문자(/, ?, * 등)는 공백으로 바꾸고, 31자가 넘으면 자릅니다. 이름이 겹치면 (2), (3)을 붙여 구분합니다.</p>
  <h3>그룹이 아주 많으면(수백 개) 괜찮나요?</h3>
  <p>분리 전에 그룹 수를 먼저 보여 드리니 확인 후 내려받으세요. 그룹이 수백 개면 파일 생성에 수 초가 걸릴 수 있습니다.</p>

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
  .grouplist {
    list-style: none; padding: 0; margin: 8px 0 16px;
    max-height: 240px; overflow-y: auto;
    border: 1px solid #eee; border-radius: 12px;
  }
  .grouplist li {
    display: flex; justify-content: space-between;
    padding: 10px 16px; border-bottom: 1px solid #f3f3f3; font-size: 14px;
  }
  .grouplist li:last-child { border-bottom: none; }
  .grouplist span { color: #777; }
  .moderow { display: flex; gap: 20px; margin: 8px 0; flex-wrap: wrap; }
  .moderow label { font-size: 14px; display: flex; align-items: center; gap: 6px; }
  .moderow input { accent-color: #1a73e8; }
  .error { color: #d33; }
  .privacy { margin-top: 32px; color: #888; font-size: 13px; }
  .content { margin-top: 48px; border-top: 1px solid #eee; padding-top: 32px; }
  .content h2 { font-size: 20px; margin: 28px 0 12px; }
  .content h3 { font-size: 16px; margin: 18px 0 6px; }
  .content p, .content li { color: #444; line-height: 1.7; }
  .ad-slot { min-height: 90px; margin-top: 32px; }
</style>
```

- [ ] **Step 2: 타입 체크 + SSR 빌드 확인**

Run: `npm run check`
Expected: 0 errors

Run: `npm run build`
Expected: 빌드 성공 (`.svelte-kit/cloudflare` 생성)

- [ ] **Step 3: dev 서버로 렌더 확인**

Run: `npm run dev` 후 `http://localhost:5173/excel-split` (5173 점유 시 5174) 접속 — h1 "엑셀 조건별 시트/파일 분리" 렌더 확인.
브라우저 QA(browse skill 가능 시): 파일 업로드 → 열 선택 → 분리하기 → 그룹 목록 → 두 모드 각각 다운로드.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/excel-split/+page.svelte
git commit -m "feat: /excel-split 페이지 — UI + 사용법/FAQ 콘텐츠"
```

---

### Task 6: 허브 카드 활성화 + 마무리 검증

**Files:**
- Modify: `src/routes/+page.svelte:9`

- [ ] **Step 1: 허브 카드 live 전환**

`src/routes/+page.svelte` 9행을:

```ts
    { href: '#', title: '조건별 시트/파일 분리', desc: '준비 중', live: false },
```

다음으로 교체:

```ts
    {
      href: '/excel-split',
      title: '엑셀 조건별 시트/파일 분리',
      desc: '열 값별로 행을 나눠 시트 또는 개별 파일(ZIP)로 내려받습니다.',
      live: true
    },
```

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: PASS (26 tests)

Run: `npm run check`
Expected: 0 errors

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/routes/+page.svelte
git commit -m "feat: 허브에 excel-split 카드 활성화"
```

- [ ] **Step 4: 배포 (사용자 확인 후)**

`main` push = Cloudflare Pages 자동배포. push 전 사용자에게 배포 여부 확인.

```bash
git push origin main
```

배포 후: https://excelking.pages.dev/excel-split HTTP 200 + 렌더 확인.
