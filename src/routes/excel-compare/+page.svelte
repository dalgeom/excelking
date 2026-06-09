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
