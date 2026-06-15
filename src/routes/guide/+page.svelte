<script lang="ts">
  import { TOOLS } from '$lib/theme/tools';

  const STEPS: Record<string, string[]> = {
    '/excel-compare': [
      '파일 A·B를 각각 올립니다. (xlsx/xls/csv)',
      '두 파일에 공통으로 있는 열 중 비교 기준이 될 키 열을 고릅니다.',
      '대조하기를 누르면 한쪽에만 있는 행과 값이 바뀐 행을 찾아줍니다.',
      '결과를 엑셀로 내려받습니다.'
    ],
    '/excel-split': [
      '엑셀 파일을 올립니다.',
      '기준이 될 열을 고르면 그 값별로 행이 나뉩니다.',
      '시트로 나눌지, 개별 파일(ZIP)로 나눌지 선택해 내려받습니다.'
    ],
    '/pdf-to-excel': [
      'PDF 파일을 올립니다.',
      '페이지별로 표를 찾아 인식합니다.',
      '페이지마다 시트로 묶인 엑셀로 추출해 내려받습니다.'
    ],
    '/excel-merge': [
      '합칠 엑셀 파일을 여러 개 올립니다.',
      '열 이름을 맞춰 한 시트로 이어 붙입니다.',
      '합쳐진 엑셀을 내려받습니다.'
    ],
    '/excel-dashboard': [
      '엑셀 파일을 올립니다.',
      'KPI와 차트를 자동으로 만들어 대시보드로 보여줍니다.',
      '대시보드를 이미지로 저장합니다.'
    ]
  };
</script>

<svelte:head>
  <title>사용법 — 엑셀왕</title>
  <meta name="description" content="엑셀왕 도구 5종(비교, 분리, PDF 추출, 합치기, 대시보드) 사용법을 단계별로 안내합니다." />
</svelte:head>

<p class="lead">도구별 사용법입니다. 모든 처리는 브라우저 안에서 이뤄지며 파일은 서버로 전송되지 않습니다.</p>

{#each TOOLS as tool}
  <section class="guide-block">
    <div class="formulabar">
      <span class="namebox">{tool.tab}</span>
      <span class="fx">fx</span>
      <span class="fval">{tool.title}</span>
    </div>
    <ol>
      {#each STEPS[tool.href] ?? [] as step}<li>{step}</li>{/each}
    </ol>
    <a class="rbtn" href={tool.href}>{tool.tab} 열기 →</a>
  </section>
{/each}

<style>
  .lead { color: #555; font-size: 16px; margin: 0 0 24px; }
  .guide-block { margin: 0 0 28px; }
  .formulabar { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 13px; }
  .namebox { min-width: 70px; padding: 4px 10px; border: 1px solid #c4c4c4; border-radius: 4px; background: #fafafa; color: #555; text-align: center; }
  .fx { color: #999; font-style: italic; }
  .fval { color: #1a1a1a; font-weight: 700; }
  ol { margin: 0 0 14px; padding-left: 22px; color: #444; line-height: 1.8; }
  ol li { font-size: 14px; }
</style>
