<script lang="ts">
  let { children } = $props();
</script>

<div class="ribbon">{@render children()}</div>

<style>
  .ribbon {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: var(--xl-chrome); border: 1px solid var(--xl-border);
    border-radius: 8px; padding: 10px 12px; margin: 0 0 12px;
  }
</style>
