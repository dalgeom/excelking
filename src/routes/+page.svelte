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
          class:sel={selected.href === tool.href}
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
    .sheet { grid-template-columns: 1fr; border-width: 1px 0 0 1px; }
    .corner, .colhead, .rowhead { display: none; }
    .cell { border-width: 0 1px 1px 0; }
  }
</style>
