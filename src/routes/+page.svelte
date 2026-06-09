<script lang="ts">
  const tools = [
    {
      href: '/excel-compare',
      title: '두 엑셀 명단 비교·대조',
      desc: '두 파일을 키 열 기준으로 대조해 일치/불일치/변경을 찾아줍니다.',
      live: true
    },
    { href: '#', title: '조건별 시트/파일 분리', desc: '준비 중', live: false },
    { href: '#', title: 'PDF 표 → 엑셀 추출', desc: '준비 중', live: false },
    { href: '#', title: '엑셀 합치기', desc: '준비 중', live: false },
    { href: '#', title: '엑셀 자동 대시보드', desc: '준비 중', live: false }
  ];
</script>

<svelte:head>
  <title>엑셀왕 — 사무직 엑셀·문서 도구 모음 (무료, 설치 없이)</title>
  <meta
    name="description"
    content="두 엑셀 비교, PDF 표 추출, 시트 분리 등 사무직 엑셀 작업을 브라우저에서 무료로. 파일은 서버로 전송되지 않습니다." />
</svelte:head>

<h1>엑셀왕</h1>
<p class="lead">사무직의 반복 엑셀 작업을 브라우저에서 무료로. 설치도, 업로드도 없습니다.</p>

<div class="grid">
  {#each tools as t}
    <a class="card" class:disabled={!t.live} href={t.href}>
      <h2>{t.title}</h2>
      <p>{t.desc}</p>
      {#if !t.live}<span class="badge">준비 중</span>{/if}
    </a>
  {/each}
</div>

<style>
  h1 { font-size: 32px; margin: 0 0 8px; }
  .lead { color: #555; font-size: 17px; margin: 0 0 32px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  .card {
    display: block;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: border-color .15s, transform .15s;
    position: relative;
  }
  .card:hover { border-color: #1a73e8; transform: translateY(-2px); }
  .card.disabled { opacity: .5; pointer-events: none; }
  .card h2 { font-size: 17px; margin: 0 0 6px; }
  .card p { font-size: 14px; color: #666; margin: 0; }
  .badge {
    position: absolute; top: 14px; right: 14px;
    font-size: 11px; color: #999; background: #f3f3f3;
    padding: 2px 8px; border-radius: 999px;
  }
</style>
