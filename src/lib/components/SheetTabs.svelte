<script lang="ts">
  import { page } from '$app/state';
  import { TOOLS } from '$lib/theme/tools';
  const tabs = [{ href: '/', tab: '홈' }, ...TOOLS.map((t) => ({ href: t.href, tab: t.tab }))];
</script>

<nav class="menutabs" aria-label="도구">
  {#each tabs as t}
    <a href={t.href} class="tab" class:active={page.url.pathname === t.href}>{t.tab}</a>
  {/each}
</nav>

<style>
  .menutabs {
    display: flex; gap: 2px; overflow-x: auto;
    background: #fff; border-bottom: 1px solid var(--xl-border); padding: 0 12px;
  }
  .tab {
    flex: 0 0 auto; padding: 9px 14px; font-size: 13px; text-decoration: none;
    color: #444; border-bottom: 2px solid transparent; white-space: nowrap;
  }
  .tab:hover { color: var(--xl-green); background: #f7f7f7; }
  .tab.active { color: var(--xl-green); font-weight: 700; border-bottom-color: var(--xl-green); }
</style>
