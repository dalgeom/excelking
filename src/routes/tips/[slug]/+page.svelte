<script lang="ts">
  import ExcelExample from '$lib/components/ExcelExample.svelte';
  let { data } = $props();
  const tip = $derived(data.tip);

  let copied = $state(false);
  async function copyFormula() {
    if (!tip.formula) return;
    await navigator.clipboard.writeText(tip.formula);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<svelte:head>
  <title>{tip.title} — 엑셀 꿀팁 | 엑셀왕</title>
  <meta name="description" content={tip.summary} />
</svelte:head>

<a class="back" href="/tips">← 꿀팁 목록</a>

<span class="cat">{tip.category}</span>
<h1>{tip.title}</h1>
<p class="summary">{tip.summary}</p>

<section>
  <h2>언제 쓰나요?</h2>
  <p>{tip.when}</p>
</section>

{#if tip.shortcut}
  <section>
    <h2>단축키</h2>
    <kbd class="kbd">{tip.shortcut}</kbd>
  </section>
{/if}

<section>
  <h2>따라하기</h2>
  <ol>
    {#each tip.steps as step}<li>{step}</li>{/each}
  </ol>
</section>

{#if tip.formula}
  <section>
    <h2>수식</h2>
    <div class="formula">
      <code>{tip.formula}</code>
      <button class="rbtn" onclick={copyFormula}>{copied ? '복사됨 ✓' : '복사'}</button>
    </div>
  </section>
{/if}

{#if tip.example}
  <section>
    <h2>예시</h2>
    <ExcelExample data={tip.example} />
  </section>
{/if}

{#if data.related.length > 0}
  <section>
    <h2>관련 꿀팁</h2>
    <ul class="related">
      {#each data.related as r}<li><a href={`/tips/${r.slug}`}>{r.title}</a></li>{/each}
    </ul>
  </section>
{/if}

<style>
  .back { display: inline-block; margin: 0 0 14px; color: var(--xl-green); text-decoration: none; font-size: 13px; }
  .back:hover { text-decoration: underline; }
  .cat { font-size: 12px; color: var(--xl-green); font-weight: 700; }
  h1 { font-size: 24px; margin: 4px 0 8px; }
  .summary { color: #555; font-size: 15px; margin: 0 0 8px; }
  section { margin: 22px 0; }
  h2 { font-size: 15px; color: #333; margin: 0 0 8px; border-left: 3px solid var(--xl-green); padding-left: 8px; }
  ol { padding-left: 22px; color: #444; line-height: 1.8; margin: 0; }
  ol li { font-size: 14px; }
  p { color: #444; line-height: 1.7; font-size: 14px; margin: 0; }
  .kbd {
    display: inline-block; padding: 5px 12px; font-size: 14px; font-family: inherit;
    border: 1px solid #c4c4c4; border-bottom-width: 3px; border-radius: 6px; background: #fafafa; color: #333;
  }
  .formula { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .formula code {
    padding: 8px 12px; background: #f6f8fa; border: 1px solid var(--xl-border); border-radius: 5px;
    font-family: 'Consolas', monospace; font-size: 14px; color: #1a5c38;
  }
  .related { padding-left: 18px; margin: 0; line-height: 1.9; }
  .related a { color: var(--xl-green); text-decoration: none; font-size: 14px; }
  .related a:hover { text-decoration: underline; }
</style>
