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
        <rect x="1.5" y="1.5" width="25" height="25" rx="5.5" fill="#fff" stroke="#1a5c38" stroke-width="1" />
        <path d="M9.5 9 L18.5 19 M18.5 9 L9.5 19" stroke="#217346" stroke-width="2.6" stroke-linecap="round" />
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
