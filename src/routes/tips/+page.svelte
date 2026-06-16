<script lang="ts">
  import { TIPS } from '$lib/tips/tips';
  import { CATEGORIES, type Category } from '$lib/tips/types';
  import { searchTips } from '$lib/tips/search';
  import FormulaBar from '$lib/components/FormulaBar.svelte';

  let query = $state('');
  let category = $state<Category | null>(null);
  const results = $derived(searchTips(TIPS, { query, category }));

  function pick(c: Category) {
    category = category === c ? null : c;
  }
</script>

<svelte:head>
  <title>엑셀 꿀팁 — 함수·단축키·문제해결 모음 | 엑셀왕</title>
  <meta
    name="description"
    content="직장인이 자주 찾는 엑셀 함수·단축키·데이터 정리·피벗·자주 겪는 문제 해결법을 검색해 바로 찾아보세요. 무료, 설치 없이." />
</svelte:head>

<p class="lead">엑셀 작업 중 막힐 때, 검색해서 바로 찾아보세요.</p>

<FormulaBar cell="찾기" value={query || '검색어를 입력하세요'} />

<input
  class="search"
  type="search"
  placeholder="예: VLOOKUP, 중복 제거, 단축키…"
  bind:value={query} />

<div class="chips">
  <button class="chip" class:on={category === null} onclick={() => (category = null)}>전체</button>
  {#each CATEGORIES as c}
    <button class="chip" class:on={category === c} onclick={() => pick(c)}>{c}</button>
  {/each}
</div>

{#if results.length === 0}
  <p class="empty">검색 결과가 없습니다. 다른 단어로 찾아보세요.</p>
{:else}
  <div class="cards">
    {#each results as tip}
      <a class="card" href={`/tips/${tip.slug}`}>
        <span class="cat">{tip.category}</span>
        <b>{tip.title}</b>
        <span class="sum">{tip.summary}</span>
      </a>
    {/each}
  </div>
{/if}

<style>
  .lead { color: #555; font-size: 16px; margin: 0 0 16px; }
  .search {
    width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 15px;
    border: 1px solid #c4c4c4; border-radius: 6px; margin: 0 0 14px;
  }
  .search:focus { outline: 2px solid var(--xl-green); outline-offset: -1px; border-color: var(--xl-green); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
  .chip {
    padding: 6px 13px; font-size: 13px; border: 1px solid #c4c4c4; border-radius: 999px;
    background: #fff; color: #444; cursor: pointer; white-space: nowrap;
  }
  .chip:hover { background: #f5f5f5; }
  .chip.on { background: var(--xl-green); border-color: var(--xl-green); color: #fff; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card {
    display: flex; flex-direction: column; gap: 6px; padding: 16px;
    border: 1px solid var(--xl-border); border-radius: 8px; background: #fff;
    text-decoration: none; color: inherit;
  }
  .card:hover { background: var(--xl-sel); outline: 2px solid var(--xl-green); outline-offset: -2px; }
  .card .cat { font-size: 11px; color: var(--xl-green); font-weight: 700; }
  .card b { font-size: 15px; }
  .card .sum { font-size: 13px; color: #666; }
  .empty { color: #888; padding: 20px 0; }
  @media (max-width: 620px) {
    .cards { grid-template-columns: 1fr; }
  }
</style>
