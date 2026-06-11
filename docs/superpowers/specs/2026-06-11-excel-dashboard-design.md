# excel-dashboard (엑셀 자동 대시보드) — 설계 문서

작성일: 2026-06-11
상태: 설계 확정, 구현 계획 대기
도구 번호: ⑤ (차별화 간판 — 체류·입소문 유도)
상위 설계: `docs/superpowers/specs/2026-06-09-excelking-design.md`

---

## 1. 문제와 목표

사무직은 엑셀 데이터를 차트로 만들 때 피벗·차트를 수작업으로 만든다. 번거롭고 결과도 제각각이다. excelking의 **차별화 간판**으로, 다른 도구로 정리한 데이터를 "시각화해볼까?"로 잇는 내부 순환의 종착점이다.

**목표:** 엑셀을 올리면 열 타입을 자동 감지해 KPI·막대·선·원형 차트로 구성된 대시보드를 즉시 생성한다. 사용자가 차트를 추가/제거할 수 있고, 완성된 대시보드를 PNG 이미지로 저장해 공유한다. 전 과정 브라우저 클라이언트 처리, AI/서버 없음(알고리즘 통계만).

## 2. 범위

**대상:**
- 표 형태 엑셀(.xlsx/.xls/.csv) 업로드 → 열 타입 자동 감지(숫자/날짜/범주/텍스트)
- 자동 생성: KPI 카드, 막대(범주→값), 선(날짜→값), 원형(구성비)
- 수정: 차트 추가(종류·기준열·값열·집계 선택) / 제거
- PNG 내보내기(대시보드 전체 한 장)

**범위 밖 (Out of Scope):**
- AI 기반 인사이트/요약 (상위 설계 §11 — 알고리즘 통계만)
- 셀 단위 편집, 드래그 정렬, 차트 색/스타일 커스터마이즈
- 차트별 개별 이미지 저장(전체 한 장만)
- 여러 시트 동시(첫 시트 기준)
- 데이터 피벗·교차표(범주×범주 매트릭스)

## 3. 핵심 결정 (브레인스토밍 결과)

| 결정 | 선택 | 근거 |
|------|------|------|
| 자동화 수준 | 완전자동 + 수정 | "올리면 바로 보임"이 차별화 포인트, 수정으로 보정 |
| 내보내기 | PNG 이미지 다운로드 | 공유=입소문 루프, Chart.js canvas라 이미지화 쉬움 |
| 차트 종류 | KPI·막대·선·원형 4종 | 사무직 대시보드 전형 구성 |
| 렌더/내보내기 | Chart.js + html2canvas (둘 다 클라이언트 동적 import) | 품질 검증된 차트 + KPI(HTML)+차트(canvas) 한 장 캡처 |
| 정확도 | 결정론적 알고리즘(통계) | 비용 0, AI 0 |

## 4. 아키텍처

순수 로직(감지→집계→추천)을 `$lib/dashboard/`에 TDD로 격리하고, 렌더링(Chart.js)·내보내기(html2canvas)는 페이지 어댑터로 둔다. compare/pdf 도구와 동일한 분리 철학.

```
엑셀 ─parse.ts(기존)→ ParsedFile {columns, rows}
        │
        ├─ detect.ts:   detectColumns(columns, rows) → Column[] (타입 부착)
        ├─ suggest.ts:  suggestCharts(columns, rows) → ChartSpec[] (자동 구성)
        │
        └─ 페이지:
             각 ChartSpec ─aggregate.ts→ AggResult {labels, values}
               → KPI 카드(HTML) / Chart.js 캔버스(막대·선·원형)
             수정: ChartSpec 배열 push(추가) / filter(제거)
             내보내기: html2canvas(#board) → PNG
```

**핵심 타입 (`$lib/dashboard/types.ts`):**
```ts
export type ColumnType = 'number' | 'date' | 'category' | 'text';
export interface Column { name: string; type: ColumnType; }
export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type ChartKind = 'kpi' | 'bar' | 'line' | 'pie';
export interface ChartSpec {
  id: string;
  kind: ChartKind;
  dimension?: string; // 범주/날짜 열 (kpi는 없음)
  measure?: string;   // 숫자 열 (count·행수 KPI는 없음)
  agg: Agg;
  title: string;
}
export interface AggResult { labels: string[]; values: number[]; }
```

**모듈 구조:**

| 파일 | 책임 | 의존 | 테스트 |
|------|------|------|--------|
| `src/lib/dashboard/types.ts` | 위 타입 | — | — |
| `src/lib/dashboard/number.ts` | `parseNumber(s)`·`parseDate(s)` 헬퍼 | — | 순수 TDD |
| `src/lib/dashboard/detect.ts` | `detectColumns(columns, rows)` 열 타입 감지 | number, types | 순수 TDD |
| `src/lib/dashboard/aggregate.ts` | `aggregate(rows, dimension, measure, agg)` 집계 | number, types | 순수 TDD |
| `src/lib/dashboard/suggest.ts` | `suggestCharts(columns, rows)` 자동 차트 선정 | types | 순수 TDD |
| `src/routes/excel-dashboard/+page.svelte` | 업로드→자동생성→Chart.js 렌더→수정→PNG + 콘텐츠 | 위 전부 + parse | dev·수동 QA |
| `src/routes/+page.svelte` | 허브 카드(⑤) live 전환 | — | — |

## 5. 순수 로직 세부

### 5.1 `number.ts`

- `parseNumber(s: string): number | null` — 앞뒤 공백·콤마·통화기호(₩, $)·`%` 제거 후 `Number()`. 빈 문자열/비숫자 → `null`. (`%`는 숫자만 취함, 예 `12%`→12)
- `parseDate(s: string): Date | null` — 정규식으로 `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`, `YYYY년 MM월 [DD일]` 매칭 → `Date`. 매칭 실패 → `null`.

### 5.2 `detect.ts` — `detectColumns(columns: string[], rows: Row[]): Column[]`

열마다 비어있지 않은 값을 모아:
1. **number**: 비어있지 않은 값의 80% 이상이 `parseNumber` 성공 → `number`
2. **date**: 80% 이상이 `parseDate` 성공 → `date`
3. **category**: 위 둘 아니고 `고유값 수 ≤ 행수×0.5 AND 고유값 수 ≤ 30` → `category`
4. **text**: 그 외 → `text`

빈 셀만 있는 열은 `text`.

### 5.3 `aggregate.ts` — `aggregate(rows, dimension, measure, agg): AggResult`

1. dimension 값(trim)으로 그룹화. measure 값은 `parseNumber`(실패 시 0 또는 제외 — `sum/avg`는 유효 숫자만, `count`는 행 수).
2. agg 적용: `sum`·`avg`·`count`·`min`·`max`.
3. 정렬·제한:
   - dimension이 날짜형으로 전부 파싱되면 시간순 정렬, 전체 유지.
   - 아니면 값 내림차순 정렬, **상위 12개 + "기타"(나머지 합산)**.
4. `{ labels, values }` 반환.

### 5.4 `suggest.ts` — `suggestCharts(columns: Column[], rows: Row[]): ChartSpec[]`

감지된 열로 기본 대시보드를 구성(총 4~6개 제한):
- **KPI**: 항상 `총 행 수`(kind=kpi, agg=count). + 숫자 열 상위 2개의 `합`(kind=kpi, measure=열, agg=sum).
- **막대**: 첫 범주 열(고유값 ≤ 30) × 첫 숫자 열, agg=sum. (숫자 열 없으면 agg=count)
- **선**: 날짜 열이 있으면 × 첫 숫자 열, agg=sum.
- **원형**: 첫 범주 열(고유값 ≤ 30) 구성비, agg=count.
- 범주 열이 없으면 막대·원형 생략. 숫자 열이 없으면 measure 없는 count 기반으로 폴백.
- `id`는 `kind`+index 등 결정론적 문자열(랜덤 금지 — 테스트·재현 위해).

## 6. UI / 데이터 흐름

compare/split/pdf 페이지 패턴 재사용.

```
[엑셀 업로드(.xlsx/.xls/.csv)]
  → busy: parse → detectColumns → suggestCharts
  → 요약: "N행 · M열 (숫자 X · 날짜 Y · 범주 Z)"
  → #board 컨테이너:
       KPI 카드 줄 (총 행수 + 숫자열 합)
       차트 그리드 (Chart.js 막대·선·원형, 2열 반응형, 각 카드 우상단 × 제거)
  → [+ 차트 추가] 폼: 종류(막대/선/원형) + 기준열 + 값열 + 집계 → [추가]
  → [📷 PNG로 저장] (html2canvas(#board) → {원본명}_대시보드.png)
  → 🔒 "업로드한 파일은 서버로 전송되지 않습니다"
  → 사용법 / 이럴 때 / FAQ / ad-slot
```

**상태 (Svelte 5 runes):** `parsed: ParsedFile|null`, `columns: Column[]`, `charts: ChartSpec[]`, `busy`, `error`. 각 ChartSpec의 데이터는 렌더 시 `aggregate(parsed.rows, spec...)`.

**Chart.js 렌더링:** Chart.js는 클라이언트 전용 → 업로드 시 `await import('chart.js/auto')`. `{#each charts}` + `<canvas>`, `$effect`로 Chart 인스턴스 생성·갱신·파괴(스펙/데이터 변경 시 재생성). KPI는 순수 HTML 카드.

**PNG 내보내기:** `await import('html2canvas')` → `html2canvas(boardEl)` → canvas.toBlob → 다운로드.

## 7. 에러 / 엣지 케이스

| 상황 | 처리 |
|------|------|
| 깨진/비엑셀 | try/catch → "파일을 읽지 못했습니다. xlsx/xls/csv인지 확인해 주세요." |
| 빈 파일·헤더만 | "데이터 행이 없습니다." 안내, 대시보드 미생성 |
| 숫자 열 0개 | KPI=행수만, 값 필요한 차트는 count 폴백 |
| 범주 열 0개 | 막대·원형 자동추천 생략 |
| 고유값 과다 범주(>30) | 자동추천 제외, 수동 선택 시 상위 12+기타 |
| 차트 전부 제거 | "차트를 추가해 보세요" 빈 상태 |

## 8. 테스트 전략

순수 함수 TDD + 통합(vitest), 한국어 describe/it·샘플 데이터.

**1. 순수 로직 단위 테스트:**

| 대상 | 케이스 |
|------|--------|
| `parseNumber` | `1,000`·`₩5000`·`12%`·공백 → 숫자, 비숫자/빈값 → null |
| `parseDate` | `2026-06-11`·`2026/6/1`·`2026.06.11`·`2026년 6월` → Date, 비날짜 → null |
| `detectColumns` | 숫자열·날짜열·범주열(반복)·텍스트열(고유多) 분류, 80% 임계, 빈셀 무시 |
| `aggregate` | 범주 합/평균/개수/최소/최대 · 상위12+기타 · 날짜 시간순 |
| `suggestCharts` | 범주+숫자→막대·원형·KPI · 날짜+숫자→선 · 숫자0개 폴백 · 개수 제한 |

**2. 통합 테스트:** ParsedFile 입력 → detect→suggest→각 spec aggregate가 일관된 차트 데이터를 내는지.

**3. Chart.js/html2canvas 어댑터:** 환경의존 → dev 렌더 + browse 수동 QA(실제 엑셀 업로드→대시보드 렌더→PNG 다운로드, 콘솔 에러 0). 억지 단위테스트 안 함.

**커버리지 우선순위:** 감지·집계·추천이 정확도 본체 → 두텁게. 렌더/내보내기는 수동 QA.

## 9. SEO / 애드센스 콘텐츠

도구 페이지 하단 필수(상위 설계 §9): 사용법 / 이럴 때 쓰면 좋아요 / FAQ. 타이틀·메타는 "엑셀 대시보드 만들기/자동 차트" 검색의도. (검색의도 약하므로 차별화·체류 위주)
- FAQ 후보: 서버 전송 여부 / 어떤 차트가 생기나 / 차트 수정·추가 / 이미지 저장 / 비용·설치.

## 10. 신규 의존성

- `chart.js` — 차트 렌더(클라이언트 동적 import, `chart.js/auto`).
- `html2canvas` — 대시보드 DOM → PNG(클라이언트 동적 import).
둘 다 CF Pages 빌드(`.svelte-kit/cloudflare`)에 번들.

## 11. 향후 (범위 밖, 점진 개선)

- 차트 색/제목 커스터마이즈, 드래그 정렬
- 범주×범주 교차표·피벗
- 차트별 개별 저장, PDF 내보내기
- 감지 휴리스틱 정교화(통화/단위 인식)
