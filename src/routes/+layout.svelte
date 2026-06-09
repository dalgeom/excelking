<script lang="ts">
  let { children } = $props();
</script>

<header class="site-header">
  <a href="/" class="logo">엑셀왕 <span>excelking</span></a>
</header>

<main>
  {@render children()}
</main>

<footer class="site-footer">
  <p>모든 처리는 브라우저 안에서 이뤄집니다. 파일은 서버로 전송되지 않습니다.</p>
  <p>© excelking</p>
</footer>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Pretendard', system-ui, sans-serif;
    color: #1a1a1a;
    word-break: keep-all;
  }
  .site-header {
    padding: 16px 24px;
    border-bottom: 1px solid #eee;
  }
  .logo {
    font-size: 20px;
    font-weight: 800;
    text-decoration: none;
    color: #1a1a1a;
  }
  .logo span {
    font-size: 13px;
    color: #888;
    font-weight: 500;
  }
  main {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .site-footer {
    border-top: 1px solid #eee;
    padding: 24px;
    text-align: center;
    color: #999;
    font-size: 13px;
  }
</style>
