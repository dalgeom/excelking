<script lang="ts">
  import { TOOLS } from '$lib/theme/tools';
  const year = new Date().getFullYear();
</script>

<footer class="site-footer">
  <div class="foot-inner">
    <div class="foot-col brand-col">
      <div class="foot-brand">엑셀왕 <span>excelking</span></div>
      <p>사무직의 반복 엑셀 작업을 브라우저에서 무료로. 파일은 서버로 전송되지 않습니다.</p>
    </div>
    <div class="foot-col">
      <h4>도구</h4>
      <a href="/">허브</a>
      {#each TOOLS as t}<a href={t.href}>{t.title}</a>{/each}
    </div>
    <div class="foot-col">
      <h4>안내</h4>
      <a href="/guide">사용법</a>
      <a href="mailto:devcom21c@gmail.com">문의 이메일</a>
      <span class="priv">🔒 모든 처리는 브라우저 안에서 이뤄집니다</span>
    </div>
  </div>
  <div class="foot-bottom">© {year} 엑셀왕 · excelking</div>
</footer>

<style>
  .site-footer { max-width: 1040px; margin: 16px auto 40px; color: #555; font-size: 13px; }
  .foot-inner {
    display: flex; gap: 40px; flex-wrap: wrap;
    padding: 24px 4px; border-top: 1px solid #cfcdc8;
  }
  .foot-col { display: flex; flex-direction: column; gap: 8px; }
  .brand-col { flex: 1 1 240px; max-width: 320px; }
  .foot-brand { font-size: 16px; font-weight: 800; color: var(--xl-green); }
  .foot-brand span { font-size: 11px; font-weight: 500; color: #999; }
  .brand-col p { margin: 0; color: #777; line-height: 1.6; }
  .foot-col h4 { margin: 0 0 4px; font-size: 12px; color: #999; font-weight: 700; }
  .foot-col a { color: #555; text-decoration: none; }
  .foot-col a:hover { color: var(--xl-green); text-decoration: underline; }
  .priv { color: #888; margin-top: 4px; }
  .foot-bottom { padding: 14px 4px; border-top: 1px solid #e8e6e2; color: #999; font-size: 12px; }
</style>
