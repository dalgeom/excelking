<script lang="ts">
  import type { ExcelExample } from '$lib/tips/types';
  import FormulaBar from './FormulaBar.svelte';
  let { data }: { data: ExcelExample } = $props();

  const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function isHi(r: number, c: number): boolean {
    return (data.highlight ?? []).some(([hr, hc]) => hr === r && hc === c);
  }
</script>

{#if data.formulaBar}
  <FormulaBar value={data.formulaBar} />
{/if}

<div class="ex" style="--cols:{data.headers.length}">
  <div class="corner"></div>
  {#each data.headers as h, c}
    <div class="colhead"><span class="letter">{COL_LETTERS[c]}</span>{h}</div>
  {/each}
  {#each data.rows as row, r}
    <div class="rowhead">{r + 1}</div>
    {#each data.headers as _, c}
      <div class="cell" class:hi={isHi(r, c)}>{row[c] ?? ''}</div>
    {/each}
  {/each}
</div>

<style>
  .ex {
    display: grid;
    grid-template-columns: 32px repeat(var(--cols), minmax(80px, 1fr));
    border: 1px solid var(--xl-border);
    border-width: 1px 0 0 1px;
    margin: 4px 0 8px;
    max-width: 420px;
    font-size: 13px;
  }
  .corner, .colhead, .rowhead {
    background: var(--xl-chrome);
    border: 1px solid var(--xl-border);
    border-width: 0 1px 1px 0;
    color: #555;
  }
  .colhead { padding: 5px 8px; text-align: center; font-weight: 600; }
  .colhead .letter { display: block; font-size: 10px; color: #999; font-weight: 400; }
  .rowhead { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999; }
  .cell {
    border: 1px solid var(--xl-border);
    border-width: 0 1px 1px 0;
    padding: 6px 8px;
    background: #fff;
    color: var(--xl-ink);
  }
  .cell.hi { background: #fff3bf; outline: 2px solid #f0c000; outline-offset: -2px; }
</style>
