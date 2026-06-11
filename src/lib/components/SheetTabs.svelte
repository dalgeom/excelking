<script lang="ts">
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  const tabs = [{ href: '/', tab: '허브' }, ...TOOLS.map((t) => ({ href: t.href, tab: t.tab }))];
</script>

<nav class="sheettabs" aria-label="도구">
  {#each tabs as t}
    <a href={t.href} class="tab" class:active={page.url.pathname === t.href}>{t.tab}</a>
  {/each}
</nav>

<style>
  .sheettabs { display: flex; gap: 2px; overflow-x: auto; padding: 0 8px; }
  .tab {
    flex: 0 0 auto; padding: 6px 16px; font-size: 13px; text-decoration: none;
    color: #555; background: #e9e7e3; border: 1px solid #cfcdc8; border-bottom: none;
    border-radius: 4px 4px 0 0; white-space: nowrap;
  }
  .tab:hover { background: #f1efec; }
  .tab.active { background: #fff; color: var(--xl-green); font-weight: 700; border-bottom: 2px solid var(--xl-green); }
</style>
