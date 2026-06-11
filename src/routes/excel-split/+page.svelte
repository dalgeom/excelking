<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { splitByColumn, type SplitGroup } from '$lib/excel/split';
  import { buildSplitWorkbook, buildSplitZip } from '$lib/excel/export';
  import Ribbon from '$lib/components/Ribbon.svelte';
  import FormulaBar from '$lib/components/FormulaBar.svelte';
  import { saveBlob, XLSX_MIME } from '$lib/excel/download';

  let file = $state<ParsedFile | null>(null);
  let fileName = $state('');
  let splitColumn = $state('');
  let groups = $state<SplitGroup[] | null>(null);
  let mode = $state<'sheets' | 'files'>('sheets');
  let error = $state('');
  let fileInput = $state<HTMLInputElement>();

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

  function download() {
    if (!groups) return;
    if (mode === 'sheets') {
      saveBlob(buildSplitWorkbook(groups), `${fileName}_분리.xlsx`, XLSX_MIME);
    } else {
      saveBlob(buildSplitZip(groups), `${fileName}_분리.zip`, 'application/zip');
    }
  }
</script>

<svelte:head>
  <title>엑셀 조건별 시트/파일 분리 — 엑셀왕</title>
  <meta
    name="description"
    content="엑셀 파일을 부서·지역·담당자 등 열 값별로 나눠 시트 또는 개별 파일(ZIP)로 내려받으세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 파일 열기 {file ? `· ${file.rows.length}행` : ''}</button>
  <button class="rbtn primary" onclick={runSplit} disabled={!file || !splitColumn}>▶ 분리</button>
  <button class="rbtn" onclick={download} disabled={!groups}>⤓ {mode === 'sheets' ? '시트 다운로드' : 'ZIP 다운로드'}</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={onUpload} />

<FormulaBar cell="분리 기준" value={splitColumn || '파일을 올리고 기준 열을 고르세요'} />

<h1 class="ptitle">엑셀 조건별 시트/파일 분리</h1>

{#if file && file.columns.length > 0}
  <div class="keyrow">
    <label for="key">분리 기준 열</label>
    <select id="key" bind:value={splitColumn}>
      <option value="" disabled>열 선택</option>
      {#each file.columns as c}<option value={c}>{c}</option>{/each}
    </select>
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
  <p class="hint">상단 리본의 [⤓ 다운로드]로 받으세요.</p>
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
  .ptitle { font-size: 22px; margin: 0 0 12px; }
  .keyrow { display: flex; align-items: center; gap: 12px; margin: 8px 0 20px; flex-wrap: wrap; }
  .keyrow label { font-size: 14px; color: #555; }
  select { padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; }
  .hint { color: #888; font-size: 13px; margin: 12px 0 0; }
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
