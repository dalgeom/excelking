<script lang="ts">
  let { cell = '', value = '' }: { cell?: string; value?: string } = $props();
</script>

<div class="formulabar">
  <span class="namebox">{cell || ' '}</span>
  <span class="fx">fx</span>
  <span class="fval">{value}</span>
</div>

<style>
  .formulabar { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 13px; }
  .namebox { min-width: 80px; padding: 4px 10px; border: 1px solid #c4c4c4; border-radius: 4px; background: #fafafa; color: #555; }
  .fx { color: #999; font-style: italic; }
  .fval { color: #555; }
</style>
