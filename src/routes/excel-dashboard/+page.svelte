<script lang="ts">
  import { parseFile, type ParsedFile } from '$lib/excel/parse';
  import { detectColumns } from '$lib/dashboard/detect';
  import { suggestCharts } from '$lib/dashboard/suggest';
  import { aggregate } from '$lib/dashboard/aggregate';
  import type { Column, ChartSpec, Agg, ChartKind } from '$lib/dashboard/types';
  import Ribbon from '$lib/components/Ribbon.svelte';
  import FormulaBar from '$lib/components/FormulaBar.svelte';

  let fileInput = $state<HTMLInputElement>();
  let parsed = $state<ParsedFile | null>(null);
  let fileName = $state('');
  let columns = $state<Column[]>([]);
  let charts = $state<ChartSpec[]>([]);
  let busy = $state(false);
  let error = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ChartLib = $state<any>(null);
  let boardEl = $state<HTMLDivElement>();

  // 차트 추가 폼 상태
  let addKind = $state<ChartKind>('bar');
  let addDim = $state('');
  let addMeasure = $state('');
  let addAgg = $state<Agg>('sum');

  const PALETTE = [
    '#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#24c1e0',
    '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72', '#71c287', '#fcd04f', '#9e9e9e'
  ];
  const summary = $derived(
    columns.length
      ? `${parsed?.rows.length ?? 0}행 · ${columns.length}열 (숫자 ${columns.filter((c) => c.type === 'number').length} · 날짜 ${columns.filter((c) => c.type === 'date').length} · 범주 ${columns.filter((c) => c.type === 'category').length})`
      : ''
  );
  const dimOptions = $derived(columns.filter((c) => c.type === 'category' || c.type === 'date'));
  const measureOptions = $derived(columns.filter((c) => c.type === 'number'));

  async function onUpload(e: Event) {
    error = '';
    parsed = null;
    charts = [];
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    fileName = f.name.replace(/\.[^.]+$/, '');
    busy = true;
    try {
      const p = await parseFile(f);
      if (p.rows.length === 0) {
        error = '데이터 행이 없습니다.';
        return;
      }
      if (!ChartLib) ChartLib = (await import('chart.js/auto')).default;
      columns = detectColumns(p.columns, p.rows);
      charts = suggestCharts(columns, p.rows);
      parsed = p;
    } catch {
      error = '파일을 읽지 못했습니다. xlsx/xls/csv인지 확인해 주세요.';
    } finally {
      busy = false;
    }
  }

  function configFor(spec: ChartSpec, labels: string[], values: number[]) {
    if (spec.kind === 'line') {
      return {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: spec.title, data: values, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,.12)', fill: true, tension: 0.25 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      };
    }
    if (spec.kind === 'pie') {
      return {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: PALETTE }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      };
    }
    return {
      type: 'bar',
      data: { labels, datasets: [{ label: spec.title, data: values, backgroundColor: '#1a73e8' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    };
  }

  // canvas 액션: 차트 생성/갱신/파괴
  function chart(node: HTMLCanvasElement, spec: ChartSpec) {
    let instance: { destroy: () => void } | null = null;
    const render = (s: ChartSpec) => {
      instance?.destroy();
      if (!ChartLib || !parsed || !s.dimension) return;
      const { labels, values } = aggregate(parsed.rows, s.dimension, s.measure, s.agg);
      instance = new ChartLib(node, configFor(s, labels, values));
    };
    render(spec);
    return { update: render, destroy: () => instance?.destroy() };
  }

  function kpiValue(spec: ChartSpec): string {
    if (!parsed) return '';
    if (spec.agg === 'count' && !spec.measure) return String(parsed.rows.length);
    const total = parsed.rows.reduce((sum, row) => {
      const raw = (row[spec.measure!] ?? '').replace(/[\s,₩$%]/g, '');
      const n = Number(raw);
      return Number.isFinite(n) && raw !== '' ? sum + n : sum;
    }, 0);
    return total.toLocaleString('ko-KR');
  }

  function removeChart(id: string) {
    charts = charts.filter((c) => c.id !== id);
  }

  function addChart() {
    if (!addDim) return;
    const measure = addKind === 'pie' ? undefined : addMeasure || undefined;
    const agg: Agg = addKind === 'pie' ? 'count' : measure ? addAgg : 'count';
    const title =
      addKind === 'pie'
        ? `${addDim} 구성비`
        : measure
          ? `${addDim}별 ${measure} ${agg === 'avg' ? '평균' : agg === 'count' ? '개수' : agg === 'min' ? '최소' : agg === 'max' ? '최대' : '합계'}`
          : `${addDim}별 개수`;
    charts = [...charts, { id: `manual-${charts.length}-${addDim}-${addKind}`, kind: addKind, dimension: addDim, measure, agg, title }];
  }

  async function savePng() {
    if (!boardEl) return;
    const h2c = (await import('html2canvas')).default;
    const canvas = await h2c(boardEl, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_대시보드.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
</script>

<svelte:head>
  <title>엑셀 자동 대시보드 — 엑셀을 올리면 차트 자동 생성 | 엑셀왕</title>
  <meta
    name="description"
    content="엑셀을 올리면 KPI·막대·선·원형 차트 대시보드를 자동으로 만들어 드립니다. 이미지로 저장해 공유하세요. 무료, 설치 없이, 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<Ribbon>
  <button class="rbtn" onclick={() => fileInput?.click()}>📁 엑셀 열기 {fileName ? `· ${fileName}` : ''}</button>
  <button class="rbtn primary" onclick={savePng} disabled={!parsed}>📷 PNG 저장</button>
</Ribbon>
<input bind:this={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onchange={onUpload} />

<FormulaBar cell="분석" value={parsed ? summary : busy ? '분석 중…' : '엑셀을 올려 주세요'} />

<h1 class="ptitle">엑셀 자동 대시보드</h1>

{#if busy}<p class="busy">분석하는 중입니다…</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

{#if parsed}
  <div class="toolbar">
    <div class="addform">
      <select bind:value={addKind}>
        <option value="bar">막대</option>
        <option value="line">선</option>
        <option value="pie">원형</option>
      </select>
      <select bind:value={addDim}>
        <option value="" disabled selected>기준 열</option>
        {#each dimOptions as c}<option value={c.name}>{c.name}</option>{/each}
      </select>
      {#if addKind !== 'pie'}
        <select bind:value={addMeasure}>
          <option value="">값 열(개수)</option>
          {#each measureOptions as c}<option value={c.name}>{c.name}</option>{/each}
        </select>
        <select bind:value={addAgg}>
          <option value="sum">합계</option>
          <option value="avg">평균</option>
          <option value="count">개수</option>
          <option value="min">최소</option>
          <option value="max">최대</option>
        </select>
      {/if}
      <button class="rbtn" onclick={addChart}>➕ 차트 추가</button>
    </div>
  </div>

  <div class="board" bind:this={boardEl}>
    <div class="kpis">
      {#each charts.filter((c) => c.kind === 'kpi') as spec (spec.id)}
        <div class="kpi"><span>{spec.title}</span><strong>{kpiValue(spec)}</strong></div>
      {/each}
    </div>

    <div class="charts">
      {#each charts.filter((c) => c.kind !== 'kpi') as spec (spec.id)}
        <div class="chartcard">
          <div class="chead"><span>{spec.title}</span><button class="x" onclick={() => removeChart(spec.id)} aria-label="차트 제거">×</button></div>
          <div class="cbody"><canvas use:chart={spec}></canvas></div>
        </div>
      {/each}
    </div>

    {#if charts.filter((c) => c.kind !== 'kpi').length === 0}
      <p class="muted">차트를 추가해 보세요.</p>
    {/if}
  </div>
{/if}

<p class="privacy">🔒 업로드한 파일은 서버로 전송되지 않고, 브라우저 안에서만 처리됩니다.</p>

<section class="content">
  <h2>사용 방법</h2>
  <ol>
    <li>표 형태의 엑셀 파일을 올립니다. (.xlsx, .xls, .csv — 첫 행이 머리글, 첫 시트 기준)</li>
    <li>열을 분석해 KPI·막대·선·원형 차트를 자동으로 만들어 보여줍니다.</li>
    <li>[+ 차트 추가]로 원하는 차트를 더하거나, 각 차트의 ×로 제거합니다.</li>
    <li>[📷 PNG로 저장]으로 대시보드를 이미지로 받아 보고서·메신저에 붙여 넣으세요.</li>
  </ol>

  <h2>이럴 때 쓰면 좋아요</h2>
  <ul>
    <li>월별 매출·실적 표를 한눈에 보는 차트로</li>
    <li>부서별·지역별 집계를 막대/원형으로 빠르게</li>
    <li>보고서에 넣을 차트 이미지를 클릭 몇 번에</li>
    <li>피벗·차트 만들기가 번거로울 때</li>
  </ul>

  <h2>자주 묻는 질문</h2>
  <h3>파일이 서버로 올라가나요?</h3>
  <p>아니요. 분석과 차트 생성 모두 브라우저 안에서만 이뤄지고, 파일은 외부로 전송되지 않습니다. 회사 데이터도 안심하고 쓸 수 있습니다.</p>
  <h3>어떤 차트가 자동으로 생기나요?</h3>
  <p>총 행 수와 숫자 열 합계 KPI, 범주 열 기준 막대·원형 차트, 날짜 열이 있으면 추이 선 차트를 만들어 드립니다. 마음에 안 들면 추가·제거할 수 있습니다.</p>
  <h3>차트를 바꿀 수 있나요?</h3>
  <p>네. 기준 열·값 열·집계 방식(합계/평균/개수 등)을 골라 차트를 추가하거나, 각 차트를 제거할 수 있습니다.</p>
  <h3>결과를 저장할 수 있나요?</h3>
  <p>대시보드 전체를 PNG 이미지로 저장해 보고서나 메신저에 바로 붙여 넣을 수 있습니다.</p>

  <!-- AdSense 광고 슬롯 (승인 후 코드 삽입) -->
  <div class="ad-slot" aria-hidden="true"></div>
</section>

<style>
  .ptitle { font-size: 22px; margin: 0 0 12px; }
  .busy { color: var(--xl-green); margin: 16px 0; }
  .toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 20px; }
  .addform { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  select { padding: 8px 10px; border-radius: 8px; border: 1px solid #ccc; font-size: 13px; }
  .board { background: #fff; }
  .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .kpi {
    flex: 1; min-width: 120px; border: 1px solid #eee; border-radius: 12px; padding: 16px;
  }
  .kpi span { display: block; font-size: 13px; color: #777; margin-bottom: 6px; }
  .kpi strong { font-size: 24px; }
  .charts { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .chartcard { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px 14px; }
  .chead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .chead span { font-size: 14px; font-weight: 600; }
  .x { background: none; padding: 0 6px; font-size: 18px; color: #999; line-height: 1; }
  .cbody { height: 260px; position: relative; }
  .muted { color: #999; font-size: 14px; }
  .error { color: #d33; }
  .privacy { margin-top: 32px; color: #888; font-size: 13px; }
  .content { margin-top: 48px; border-top: 1px solid #eee; padding-top: 32px; }
  .content h2 { font-size: 20px; margin: 28px 0 12px; }
  .content h3 { font-size: 16px; margin: 18px 0 6px; }
  .content p, .content li { color: #444; line-height: 1.7; }
  .ad-slot { min-height: 90px; margin-top: 32px; }
</style>
