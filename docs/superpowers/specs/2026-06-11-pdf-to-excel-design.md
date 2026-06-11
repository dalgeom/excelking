# pdf-to-excel (PDF 표 → 엑셀 추출) — 설계 문서

작성일: 2026-06-11
상태: 설계 확정, 구현 계획 대기
도구 번호: ③ (유입 간판 — 검색 트래픽을 끌어오는 핵심 도구)
상위 설계: `docs/superpowers/specs/2026-06-09-excelking-design.md`

---

## 1. 문제와 목표

PDF 안의 표를 엑셀로 옮기는 작업은 복붙 시 표가 깨져 사무직의 대표적 단순노동이다. 엑셀 내장 기능이 없고 웹 검색의도가 강해, excelking의 **유입 간판**으로 배치된 도구다.

**목표:** 텍스트 레이어가 있는 디지털 PDF를 올리면, 페이지의 표를 격자로 복원해 **페이지별 시트 엑셀**로 내려받는다. 전 과정 브라우저 클라이언트 처리(파일 서버 전송 없음).

**정확도 전제:** PDF 표 추출은 100%가 불가능하다(병합 셀·셀 내 줄바꿈·정렬 오인식). 따라서 다운로드 전 **미리보기**로 결과를 보여주고, 틀린 부분은 사용자가 엑셀에서 직접 수정한다. 미리보기는 표시만 하고 화면 내 편집은 하지 않는다.

## 2. 범위

**대상:**
- 텍스트 레이어가 있는 디지털 PDF (선 있는 정형 표 + 선 없이 정렬만 된 표 **둘 다**)
- 여러 페이지 → 페이지별 시트

**범위 밖 (Out of Scope):**
- **스캔본/이미지 PDF (OCR)** — 텍스트 레이어 없음. 상위 설계 §11 원칙. "텍스트가 없는 스캔본은 지원 안 함" 안내로 처리.
- 화면 내 셀 편집 (미리보기는 읽기 전용)
- 페이지 범위 선택 (MVP는 전체 페이지 처리)
- 대용량 배치 제한·청크 처리 (변환 중 진행 표시로만 대응)

## 3. 핵심 결정 (브레인스토밍 결과)

| 결정 | 선택 | 근거 |
|------|------|------|
| 표 종류 | 선 있는 표 + 선 없는 표 둘 다 | 타겟 PDF가 혼합 |
| 알고리즘 | **C 하이브리드** (괘선 검출 + 좌표 군집화 + 선택기) | 품질 최고, 세 모듈이 같은 출력(`Grid`)을 내는 독립 순수 함수라 분리 가능 |
| 미리보기 | 미리보기만 (편집 없음) | 신뢰도↑, 구현 가볍게. 수정은 사용자가 엑셀에서 |
| 출력 구조 | 페이지별 시트 | 명확, 원본 대응 쉬움 |
| PDF 라이브러리 | `pdfjs-dist` (클라이언트 동적 import) | 텍스트+좌표+벡터(괘선) 추출 가능, 비용 0 |

## 4. 아키텍처

**핵심 타입:** `Grid = string[][]` (행 → 셀 값). 모든 재구성 알고리즘이 이걸 출력하고, 미리보기·엑셀 변환이 공통 소비한다.

```
PDF ─extract.ts(pdf.js)→ PageContent[] {width,height, items:TextItem[], hLines, vLines}
        │
        └─ 페이지마다 reconstruct.ts (선택기):
             괘선이 충분(가로·세로 각 2줄+ 격자 형성)?
               예    → ruled.ts   (선 교차 → 셀 정의 → 텍스트 좌표 배치, 병합 처리)
               아니오 → cluster.ts (Y로 행 묶기 → X 군집으로 열 경계 → 배치)
             → Grid
        │
        └─ toWorkbook.ts: 페이지별 Grid → 시트 → xlsx (AOA)
        └─ UI: Grid들을 HTML <table>로 미리보기 + [엑셀 다운로드]
```

**모듈 구조 (책임 분리):**

| 파일 | 책임 | 의존 | 테스트 |
|------|------|------|--------|
| `src/lib/pdf/types.ts` | `TextItem`, `Line`, `PageContent`, `Grid`, `PdfPage` 타입 | — | — |
| `src/lib/pdf/extract.ts` | pdf.js 어댑터(브라우저 전용). PDF → `PageContent[]`. operator list에서 가로/세로 괘선 추출 | pdfjs-dist | 픽스처 스모크 |
| `src/lib/pdf/cluster.ts` | A: `clusterGrid(items) → Grid` 좌표 군집화 | types | 순수 TDD |
| `src/lib/pdf/ruled.ts` | B: `ruledGrid(items, hLines, vLines) → Grid` 괘선 격자 | types | 순수 TDD |
| `src/lib/pdf/reconstruct.ts` | C 선택기: `reconstructPage(page) → Grid` | cluster, ruled | 순수 TDD |
| `src/lib/pdf/toWorkbook.ts` | `buildPdfWorkbook(pages: {name, grid}[]) → ArrayBuffer` 페이지별 시트 | xlsx, types | 통합 round-trip |
| `src/routes/pdf-to-excel/+page.svelte` | 업로드→변환→미리보기→다운로드 + SEO 콘텐츠 | 위 전부 + extract | dev 렌더·수동 QA |
| `src/routes/+page.svelte` | 허브 카드 live 전환 | — | — |

설계상 `extract.ts`(부정확·환경의존적인 pdf.js 어댑터)와 순수 재구성 로직을 분리하는 것이 핵심이다. 정확도의 본체인 `cluster/ruled/reconstruct`는 합성 데이터로 완전히 단위 테스트되고, pdf.js는 얇은 어댑터로 격리한다.

## 5. 알고리즘 세부

### 5.1 데이터 (pdf.js → 우리 타입)

- `TextItem = { str: string; x: number; y: number; width: number; height: number }`
  - pdf.js `getTextContent().items`의 `transform[4]`=x, `transform[5]`=y, `width`, `height`, `str`에서 매핑. 좌표계는 좌하단 원점(PDF 기본). y는 위로 갈수록 큼.
- `Line = { x1: number; y1: number; x2: number; y2: number }`
  - `getOperatorList()`의 path 구성 op(moveTo/lineTo)·rectangle에서 거의 수평(|y1−y2|<ε)인 선을 `hLines`, 거의 수직(|x1−x2|<ε)인 선을 `vLines`로 분류.
- `PageContent = { width, height, items: TextItem[], hLines: Line[], vLines: Line[] }`

### 5.2 A — `clusterGrid(items)` (cluster.ts)

1. **행 묶기:** items를 y 내림차순 정렬(위→아래). 인접 item의 y중심 차이가 `행임계`(해당 행 평균 height × 0.7)를 넘으면 새 행 시작. 같은 행 후보는 y가 겹치는 것끼리.
2. **열 경계:** 전체 페이지 item들의 x시작값을 모아 1차원 군집화(가까운 x끼리, 간격 `열임계`= 평균 글자폭 기준). 각 군집의 대표 x = 열 경계.
3. **배치:** 각 item을 x가 가장 가까운 열에 할당. 같은 (행,열)에 여러 item이면 x순 정렬 후 공백 결합.
4. **정규화:** 모든 행을 최대 열 수로 패딩(빈 셀 `''`). 출력 `Grid`.

### 5.3 B — `ruledGrid(items, hLines, vLines)` (ruled.ts)

1. **격자 좌표:** hLines의 y값을 정렬·중복제거 → 행 경계(R+1개 → R행). vLines의 x값을 정렬·중복제거 → 열 경계(C+1개 → C열).
2. **셀 정의:** (행 i, 열 j) 셀 = [yi+1, yi] × [xj, xj+1] 영역.
3. **배치:** 각 item의 중심좌표가 속한 셀에 할당. 같은 셀 다중 item은 공백 결합.
4. **병합 셀:** 어떤 셀 경계선이 없어 한 텍스트가 여러 열/행을 가로지르면 그 값은 시작 셀에 1개만 넣고 나머지는 `''`(엑셀에서 병합 안 하고 빈 칸으로). MVP는 값 중복 방지까지만, 실제 셀 병합은 안 함.
5. **정규화:** R×C 격자 출력 `Grid`.

### 5.4 C — `reconstructPage(page)` (reconstruct.ts)

```
괘선 격자 충분 판정:
  hLines에서 서로 다른 y ≥ 2  AND  vLines에서 서로 다른 x ≥ 2
  (즉 최소 2×2 격자를 만들 선이 있음)
  → ruledGrid(items, hLines, vLines)
아니면
  → clusterGrid(items)   // 폴백
```
페이지에 표가 없으면(텍스트 0) 빈 `Grid`(`[]`) 반환.

### 5.5 `buildPdfWorkbook(pages)` (toWorkbook.ts)

- 입력: `{ name: string; grid: Grid }[]` (name = 시트명, 예: "1페이지").
- 각 grid를 `XLSX.utils.aoa_to_sheet(grid.length ? grid : [[]])`로 시트화, `book_append_sheet`. 시트명은 `sanitizeSheetName`+`uniqueNames`(기존 `names.ts` 재사용).
- 빈 grid(표 없는 페이지)는 시트 생성 스킵.
- `XLSX.write(..., {type:'array', bookType:'xlsx'})` → ArrayBuffer.

## 6. UI / 데이터 흐름

compare/split 페이지 패턴 재사용 (업로드 → 옵션/결과 → summary → 다운로드 → privacy → 사용법/FAQ → ad-slot).

```
[PDF 업로드(.pdf)]
  → busy="처리 중…"  (await import('pdfjs-dist') → extract → 페이지마다 reconstruct)
  → 요약: "N페이지 · 표 추출됨"
  → 페이지별 미리보기 (HTML <table>, 세로 나열)
       · 페이지 많으면 상위 N페이지 + 각 표 상위 ~50행만 렌더, "전체는 다운로드로 확인" 안내
       · 표 없는 페이지: "표를 찾지 못함" 표시
  → [엑셀 다운로드]  (buildPdfWorkbook → Blob → a.download = "{원본명}_표.xlsx")
  → 🔒 "업로드한 파일은 서버로 전송되지 않습니다"
  → 사용법 / 이럴 때 쓰면 좋아요 / FAQ / ad-slot
```

**상태 (Svelte 5 runes):** `file: File|null`, `fileName`, `pages: {name, grid}[]|null`, `busy: boolean`, `error: string`.

**pdf.js 클라이언트 제약:** pdf.js는 Worker/DOM 사용 → SSR 불가. 업로드 핸들러에서 `await import('pdfjs-dist')` 동적 로드. worker는 Vite `?url` import로 번들해 `GlobalWorkerOptions.workerSrc` 설정. 페이지 자체는 정적 셸만 SSR.

## 7. 에러 / 엣지 케이스

| 상황 | 처리 |
|------|------|
| 스캔본(텍스트 레이어 없음) | 전 페이지 텍스트 0 → "텍스트가 없는 스캔본(이미지) PDF는 지원하지 않습니다. OCR이 필요합니다." |
| 표 아닌 일반 문단 | 군집화가 1~2열 → 그대로 추출하되 "표가 아닐 수 있습니다" 가벼운 안내 |
| 암호 걸린 PDF | pdf.js throw(PasswordException) → "암호가 걸린 PDF는 열 수 없습니다" |
| 깨진/비PDF | try/catch → "PDF를 읽지 못했습니다. 올바른 PDF인지 확인해 주세요." |
| 셀 내 줄바꿈 | 같은 셀 좌표 다중 조각을 공백 결합(한계 명시) |
| 대용량(수백 페이지) | 변환 중 busy 표시, 비동기 완료까지. 배치 제한은 범위 밖 |

## 8. 테스트 전략

이 repo 컨벤션: 순수 함수 TDD + 통합 round-trip(vitest), 한국어 describe/it·샘플 데이터.

**1. 순수 로직 단위 테스트 (TDD, 합성 데이터 — pdf.js 불필요):**

| 대상 | 케이스 |
|------|--------|
| `clusterGrid` | Y간격 행 분리 · X군집 열 정렬 · 같은 셀 다중조각 공백결합 · 들쭉날쭉 정렬도 열 유지 · 1열(문단) |
| `ruledGrid` | 2×2 격자 배치 · 텍스트 좌표→셀 · 병합(가로지르는 선) 1값 · 셀 밖 텍스트 무시 |
| `reconstructPage` | 괘선 충분→ruled · 괘선 없음→cluster 폴백 · 선 1줄(불충분)→cluster · 텍스트0→빈 Grid |

합성 `TextItem`/`Line` 입력 → 기대 `Grid` 비교. 한국어 표(이름·부서·금액).

**2. 통합 round-trip:** `buildPdfWorkbook` 결과 xlsx를 다시 읽어 페이지별 시트·셀 값 일치 (split-integration.test.ts 패턴).

**3. pdf.js 어댑터(`extract.ts`) 스모크:** 작은 샘플 PDF(선 있는 표 / 선 없는 표)를 `src/lib/pdf/__fixtures__/`에 두고 `extractPages`가 텍스트 조각 수·괘선 유무를 뽑는지 1~2개 테스트. *vitest(node)에서 pdf.js worker 비활성으로 실행 가능해야 함 — 안 되면 이 레이어는 수동 QA로 대체하고 1·2에 집중(억지로 통과시키지 않음).*

**4. 수동 브라우저 QA:** 실제 PDF(거래명세서류 1 + 선 없는 보고서 1) 업로드 → 미리보기 정확도 확인 → 다운로드 → 엑셀 검증. browse skill 가능 시 활용.

**커버리지 우선순위:** 1번(순수 로직)이 정확도 본체 — 가장 두텁게. 3번은 환경 제약 시 수동 QA 대체.

## 9. SEO / 애드센스 콘텐츠

도구 페이지 하단 필수(상위 설계 §9): "사용법 / 이럴 때 쓰면 좋아요 / FAQ". 타이틀·메타는 "PDF 표 엑셀 변환/추출" 검색의도 겨냥.
- FAQ 후보: 서버 전송 여부 / 스캔본 지원 여부 / 표가 깨지면 / 여러 페이지 처리 / 비용·설치.

## 10. 신규 의존성

- `pdfjs-dist` — PDF 텍스트·좌표·벡터(괘선) 추출. 클라이언트 전용 동적 import. CF Pages 빌드(`.svelte-kit/cloudflare`)에 번들.

## 11. 향후 (범위 밖, 점진 개선)

- 실제 셀 병합 출력(현재는 빈 칸)
- 페이지 범위 선택 UI
- 군집화 임계 자동 튜닝·열 정렬 개선
- OCR(스캔본) — 별도 검토
