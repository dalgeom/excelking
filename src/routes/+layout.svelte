<script lang="ts">
  import '$lib/theme/excel.css';
  import SheetTabs from '$lib/components/SheetTabs.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  let { children } = $props();
  const current = $derived(TOOLS.find((t) => t.href === page.url.pathname));
</script>

<div class="xl-window">
  <header class="titlebar">
    <a href="/" class="brand">
      <svg class="brand-ico" viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
        <rect x="9" y="3.5" width="15.5" height="21" rx="2" fill="#fff" />
        <g stroke="#21a366" stroke-width="1">
          <line x1="9" y1="9.5" x2="24.5" y2="9.5" />
          <line x1="9" y1="14" x2="24.5" y2="14" />
          <line x1="9" y1="18.5" x2="24.5" y2="18.5" />
          <line x1="16.7" y1="3.5" x2="16.7" y2="24.5" />
        </g>
        <rect x="2.5" y="8" width="13" height="12.5" rx="2" fill="#185c37" />
        <path d="M6 11.2 L12 17.3 M12 11.2 L6 17.3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      엑셀왕 <span>excelking</span>
    </a>
    {#if current}<span class="doctitle">{current.title}</span>{/if}
  </header>

  <SheetTabs />

  <main>{@render children()}</main>
</div>

<Footer />

<style>
  .xl-window {
    max-width: 1040px; margin: 16px auto; background: #fff;
    border: 1px solid #b8b8b8; border-radius: 8px; overflow: hidden;
    min-height: 70vh; padding-bottom: 8px;
  }
  .titlebar {
    background: var(--xl-green); color: #fff; padding: 10px 18px;
    display: flex; align-items: center; gap: 14px;
  }
  .brand { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; text-decoration: none; color: #fff; }
  .brand-ico { flex: none; display: block; }
  .brand span { font-size: 12px; font-weight: 500; opacity: .75; }
  .doctitle { font-size: 13px; opacity: .9; }
  main { padding: 24px; }
</style>
