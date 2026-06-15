<script lang="ts">
  let { cell = '', value = '' }: { cell?: string; value?: string } = $props();
</script>

<div class="formulabar">
  <span class="namebox">{cell || ' '}<span class="caret" aria-hidden="true">▾</span></span>
  <span class="actions" aria-hidden="true">
    <span class="act cancel">✕</span>
    <span class="act ok">✓</span>
    <span class="act fx"><i>fx</i><span class="caret">▾</span></span>
  </span>
  <span class="finput">
    <span class="val">{value}</span>
    <span class="expand" aria-hidden="true">⌄</span>
  </span>
</div>

<style>
  .formulabar { display: flex; align-items: center; gap: 6px; margin: 0 0 16px; font-size: 13px; }
  .namebox {
    display: inline-flex; align-items: center; gap: 6px; min-width: 84px;
    padding: 5px 8px; border: 1px solid #c4c4c4; border-radius: 3px;
    background: #fafafa; color: #333; white-space: nowrap;
  }
  .namebox .caret { margin-left: auto; color: #999; font-size: 9px; }
  .actions { display: inline-flex; align-items: center; gap: 9px; padding: 0 4px; }
  .act { font-size: 13px; line-height: 1; }
  .act.cancel { color: #c0392b; }
  .act.ok { color: #1e7e34; }
  .act.fx { display: inline-flex; align-items: center; gap: 2px; color: #666; }
  .act.fx i { font-style: italic; }
  .act.fx .caret { font-size: 9px; color: #999; }
  .finput {
    flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 5px 10px; border: 1px solid #c4c4c4; border-radius: 4px; background: #fff; color: #444;
  }
  .finput .val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .finput .expand { flex: none; color: #aaa; font-size: 11px; }
</style>
