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
