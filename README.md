# excelking (엑셀왕)

사무직 엑셀·문서 도구 허브. 전부 브라우저 클라이언트 처리(비용 0).

## 개발
- `npm run dev` — 개발 서버
- `npm test` — 단위 테스트
- `npm run build` — 프로덕션 빌드

## 배포 (Cloudflare Pages)
1. 이 저장소를 GitHub에 푸시
2. Cloudflare Pages에서 저장소 연결
3. 빌드 명령: `npm run build` / 출력 디렉토리: `.svelte-kit/cloudflare`
4. git push 시 자동 재배포 → `excelking.pages.dev`

추후 `excelking.com` 도메인 구매 후 Pages 커스텀 도메인 연결.

설계 문서: `docs/superpowers/specs/2026-06-09-excelking-design.md`
구현 계획: `docs/superpowers/plans/2026-06-09-excelking-mvp.md`
