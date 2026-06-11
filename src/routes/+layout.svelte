<script lang="ts">
  import '$lib/theme/excel.css';
  import SheetTabs from '$lib/components/SheetTabs.svelte';
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  let { children } = $props();
  const current = $derived(TOOLS.find((t) => t.href === page.url.pathname));
</script>

<div class="xl-window">
  <header class="titlebar">
    <a href="/" class="brand">엑셀왕 <span>excelking</span></a>
    {#if current}<span class="doctitle">{current.title}</span>{/if}
  </header>

  <main>{@render children()}</main>
</div>

<div class="bottombar">
  <div class="bottombar-inner">
    <SheetTabs />
    <span class="status">🔒 모든 처리는 브라우저 안에서 · 파일은 서버로 전송되지 않습니다</span>
  </div>
</div>

<style>
  .xl-window {
    max-width: 1040px; margin: 16px auto; background: #fff;
    border: 1px solid #b8b8b8; border-radius: 8px; overflow: hidden;
    min-height: 70vh; padding-bottom: 8px;
  }
  .titlebar {
    background: var(--xl-green); color: #fff; padding: 10px 18px;
    display: flex; align-items: baseline; gap: 14px;
  }
  .brand { font-size: 18px; font-weight: 800; text-decoration: none; color: #fff; }
  .brand span { font-size: 12px; font-weight: 500; opacity: .75; }
  .doctitle { font-size: 13px; opacity: .9; }
  main { padding: 24px; }
  .bottombar {
    position: sticky; bottom: 0; z-index: 10;
    background: var(--xl-chrome); border-top: 1px solid #cfcdc8;
  }
  .bottombar-inner {
    max-width: 1040px; margin: 0 auto; padding: 6px 12px 4px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .status { font-size: 12px; color: #777; white-space: nowrap; }
  @media (max-width: 620px) { .status { display: none; } }
</style>
