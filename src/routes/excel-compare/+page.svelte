<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { compareByKey } from '$lib/excel/compare';
  import { buildResultWorkbook } from '$lib/excel/export';
  import type { CompareResult } from '$lib/excel/types';
  import Ribbon from '$lib/components/Ribbon.svelte';
  import FormulaBar from '$lib/components/FormulaBar.svelte';
  import { saveBlob, XLSX_MIME } from '$lib/excel/download';

  let fileA = $state<ParsedFile | null>(null);
  let fileB = $state<ParsedFile | null>(null);
  let keyColumn = $state('');
  let result = $state<CompareResult | null>(null);
  let error = $state('');
  let aInput = $state<HTMLInputElement>();
  let bInput = $state<HTMLInputElement>();

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
    saveBlob(buildResultWorkbook(result, keyColumn), '비교결과.xlsx', XLSX_MIME);
  }
</script>

<svelte:head>
  <title>두 엑셀 명단 비교·대조 — 엑셀왕</title>
  <meta
    name="description"
    content="두 엑셀 파일을 키 열 기준으로 대조해 한쪽에만 있는 행과 값이 바뀐 행을 찾아 엑셀로 내려받으세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

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

{#if commonColumns.length > 0}
  <div class="keyrow">
    <label for="key">비교 기준 열</label>
    <select id="key" bind:value={keyColumn}>
      <option value="" disabled>열 선택</option>
      {#each commonColumns as c}<option value={c}>{c}</option>{/each}
    </select>
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
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

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

<style>
  .ptitle { font-size: 22px; margin: 0 0 12px; }
  .keyrow { display: flex; align-items: center; gap: 12px; margin: 8px 0 20px; flex-wrap: wrap; }
  .keyrow label { font-size: 14px; color: #555; }
  select { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; }
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
