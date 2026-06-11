<script lang="ts">
  import { reconstructPage } from '$lib/pdf/reconstruct';
  import { buildPdfWorkbook } from '$lib/pdf/toWorkbook';
  import type { PdfSheet } from '$lib/pdf/types';

  let fileName = $state('');
  let pages = $state<PdfSheet[] | null>(null);
  let busy = $state(false);
  let error = $state('');

  const PREVIEW_ROWS = 50;

  async function onUpload(e: Event) {
    error = '';
    pages = null;
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    fileName = f.name.replace(/\.[^.]+$/, '');
    busy = true;
    try {
      const { extractPages } = await import('$lib/pdf/extract');
      const contents = await extractPages(await f.arrayBuffer());
      const result: PdfSheet[] = contents.map((p, i) => ({
        name: `${i + 1}페이지`,
        grid: reconstructPage(p)
      }));
      if (result.every((p) => p.grid.length === 0)) {
        error =
          '표를 찾지 못했습니다. 텍스트가 없는 스캔본(이미지) PDF는 지원하지 않습니다(OCR 필요).';
        return;
      }
      pages = result;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (/password/i.test(msg)) error = '암호가 걸린 PDF는 열 수 없습니다.';
      else error = 'PDF를 읽지 못했습니다. 올바른 PDF인지 확인해 주세요.';
    } finally {
      busy = false;
    }
  }

  function download() {
    if (!pages) return;
    const bytes = buildPdfWorkbook(pages);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_표.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>PDF 표 엑셀 변환 — PDF 표를 엑셀로 추출 | 엑셀왕</title>
  <meta
    name="description"
    content="PDF 안의 표를 엑셀(.xlsx)로 추출하세요. 페이지별 시트로 변환, 미리보기 제공. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>PDF 표 → 엑셀 추출</h1>
<p class="lead">PDF를 올리면 표를 찾아 페이지별 시트 엑셀로 만들어 드립니다. 다운로드 전 미리보기로 확인하세요.</p>

<div class="uploads">
  <label class="drop">
    <span>PDF 파일 {fileName ? `· ${fileName}` : ''}</span>
    <input type="file" accept="application/pdf,.pdf" onchange={onUpload} />
  </label>
</div>

{#if busy}<p class="busy">PDF를 처리하는 중입니다…</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

{#if pages}
  <div class="summary">
    <div class="stat"><strong>{pages.length}</strong><span>페이지</span></div>
    <div class="stat">
      <strong>{pages.filter((p) => p.grid.length > 0).length}</strong><span>표 추출됨</span>
    </div>
  </div>

  <button class="primary" onclick={download}>엑셀 다운로드</button>

  <div class="previews">
    {#each pages as p, i}
      <div class="preview">
        <h3>{i + 1}페이지</h3>
        {#if p.grid.length === 0}
          <p class="muted">표를 찾지 못했습니다.</p>
        {:else}
          <div class="tablewrap">
            <table>
              <tbody>
                {#each p.grid.slice(0, PREVIEW_ROWS) as row}
                  <tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if p.grid.length > PREVIEW_ROWS}
            <p class="muted">…상위 {PREVIEW_ROWS}행만 미리보기. 전체는 다운로드해서 확인하세요.</p>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>표가 들어 있는 PDF 파일을 올립니다. (텍스트로 된 디지털 PDF)</li>
    <li>잠시 기다리면 페이지별로 추출된 표를 미리보기로 보여줍니다.</li>
    <li>[엑셀 다운로드]로 페이지마다 시트가 나뉜 .xlsx 파일을 받습니다.</li>
    <li>표가 일부 어긋났다면 받은 엑셀에서 바로 수정하세요.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>거래명세서·세금계산서 PDF의 품목 표를 엑셀로 옮길 때</li>
    <li>은행 거래내역 PDF를 정리·합계 내고 싶을 때</li>
    <li>보고서·논문 속 표를 복붙하면 깨져서 곤란할 때</li>
    <li>여러 페이지에 걸친 표를 한 번에 엑셀로</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. PDF 분석과 엑셀 생성 모두 브라우저 안에서만 이뤄지고, 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>스캔한 PDF(이미지)도 되나요?</h3>
  <p>아니요. 글자를 선택·복사할 수 있는 텍스트 PDF만 지원합니다. 스캔본(이미지)은 글자 정보가 없어 추출되지 않으며, 이 경우 OCR이 필요합니다.</p>
  <h3>표가 어긋나게 추출되면요?</h3>
  <p>PDF 구조에 따라 셀이 합쳐지거나 어긋날 수 있습니다. 미리보기로 확인한 뒤, 받은 엑셀에서 직접 수정하시면 됩니다. 점차 정확도를 개선하고 있습니다.</p>
  <h3>여러 페이지 PDF는 어떻게 되나요?</h3>
  <p>각 페이지가 엑셀의 별도 시트로 만들어집니다. 표가 없는 페이지는 시트를 만들지 않습니다.</p>

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
  button {
    padding: 9px 18px; border: none; border-radius: 8px;
    background: #1a73e8; color: #fff; font-weight: 600; cursor: pointer;
  }
  button.primary { margin: 16px 0; }
  .summary { display: flex; gap: 12px; margin: 24px 0 8px; flex-wrap: wrap; }
  .stat {
    flex: 1; min-width: 90px; border: 1px solid #eee; border-radius: 12px;
    padding: 16px; text-align: center;
  }
  .stat strong { display: block; font-size: 24px; }
  .stat span { font-size: 13px; color: #777; }
  .previews { display: flex; flex-direction: column; gap: 24px; margin-top: 16px; }
  .preview h3 { font-size: 15px; margin: 0 0 8px; color: #555; }
  .tablewrap { overflow-x: auto; border: 1px solid #eee; border-radius: 10px; }
  table { border-collapse: collapse; font-size: 13px; }
  td { border: 1px solid #eee; padding: 6px 10px; white-space: nowrap; }
  .muted { color: #999; font-size: 13px; margin: 8px 0 0; }
  .error { color: #d33; }
  .privacy { margin-top: 32px; color: #888; font-size: 13px; }
  .content { margin-top: 48px; border-top: 1px solid #eee; padding-top: 32px; }
  .content h2 { font-size: 20px; margin: 28px 0 12px; }
  .content h3 { font-size: 16px; margin: 18px 0 6px; }
  .content p, .content li { color: #444; line-height: 1.7; }
  .ad-slot { min-height: 90px; margin-top: 32px; }
</style>
