# excel-merge (엑셀 합치기) — 설계 문서

작성일: 2026-06-11
상태: 설계 확정, 구현 계획 대기
도구 번호: ④ (수요 보조 — 여러 엑셀을 하나로)
상위 설계: `docs/superpowers/specs/2026-06-09-excelking-design.md`

---

## 1. 문제와 목표

여러 엑셀 파일(월별·지점별·부서별)을 하나로 합치는 작업은 복붙 노가다이거나 파워쿼리를 알아야 한다. excelking의 보조 도구로, 같은 양식의 여러 파일을 한 시트로 빠르게 이어붙인다.

**목표:** 엑셀 여러 개를 올리면 열을 이름으로 맞춰 한 시트로 행을 쌓아 합치고, 각 행의 출처 파일을 선택적으로 표시해 다운로드한다. 전 과정 브라우저 클라이언트 처리, AI/서버 없음.

## 2. 범위

**대상:**
- 엑셀 여러 개(.xlsx/.xls/.csv) 업로드 → 첫 시트 기준
- 열(헤더) 이름으로 맞춰 **합집합**, 없는 열은 빈 칸
- 한 시트로 행 쌓기(헤더 1번)
- 선택: "출처 파일명" 열 추가(기본 켜짐)
- 단일 시트 .xlsx 다운로드

**범위 밖 (Out of Scope):**
- 파일당 시트로 묶기(②분리의 역방향 — 별도 도구)
- 키 기준 병합/조인(=①비교 영역), 중복 행 제거
- 여러 시트 동시(각 파일 첫 시트만)
- 열 수동 매핑 UI(이름 자동 매칭만)

## 3. 핵심 결정 (브레인스토밍 결과)

| 결정 | 선택 | 근거 |
|------|------|------|
| 합치기 방식 | 한 시트로 행 쌓기 | 가장 흔한 '합치기' 수요(월별·지점별 합산) |
| 열 정렬 | 모든 열 합집합(이름 매칭, 없으면 빈 칸) | 양식이 조금 달라도 안전 |
| 출처 열 | 체크박스 선택(기본 켜짐) | 출처 추적 유용, 원하면 끄기 |

## 4. 아키텍처

기존 도구와 동일: 순수 로직 `merge.ts` TDD + 내보내기 `export.ts`에 추가. 신규 의존성 없음.

```
엑셀들 ─parse.ts(기존, 파일마다)→ {name, rows: Row[]}[]
        └─ merge.ts: mergeRows(files, addSource) → MergeResult {columns, rows}
        └─ export.ts: buildMergeWorkbook(result) → ArrayBuffer (단일 시트)
        └─ UI: 다중 업로드 → 합치기 → 다운로드
```

**모듈 구조:**

| 파일 | 책임 | 의존 | 테스트 |
|------|------|------|--------|
| `src/lib/excel/merge.ts` | `mergeRows(files, addSource)` 열 합집합 + 행 쌓기 + 출처 열 | excel/types | 순수 TDD |
| `src/lib/excel/export.ts` | `buildMergeWorkbook(result)` 단일 시트 내보내기 추가 | xlsx | 통합 round-trip |
| `src/routes/excel-merge/+page.svelte` | 다중 파일 업로드→합치기→다운로드 + 콘텐츠 | parse, merge, export | dev·수동 QA |
| `src/routes/+page.svelte` | 허브 카드(④) live 전환 | — | — |

## 5. 핵심 로직 세부

### 5.1 타입

```ts
export interface MergeInput { name: string; rows: Row[]; }
export interface MergeResult { columns: string[]; rows: Row[]; }
```
(`Row = Record<string,string>`는 `$lib/excel/types`에서 재사용)

### 5.2 `mergeRows(files: MergeInput[], addSource: boolean): MergeResult`

1. **열 합집합(순서 보존):** 파일들을 순서대로 보며 각 행의 키(열 이름)를 첫 등장 순으로 모은다. 결과 열 = `addSource ? ['출처', ...union] : union`.
2. **행 쌓기:** 각 파일의 모든 행을 합집합 열에 맞춰 재구성. 없는 열은 `''`. `addSource`면 `출처` = 파일명(확장자 포함 원본명).
3. 반환 `{ columns, rows }`.

행 순서 = 파일 입력 순서 → 파일 내 행 순서.

### 5.3 `buildMergeWorkbook(result: MergeResult): ArrayBuffer`

- `XLSX.utils.json_to_sheet(result.rows.length ? result.rows : [{}], { header: result.columns })`로 열 순서를 강제(빈 열 포함).
- 시트명 `합치기`, `XLSX.write({type:'array', bookType:'xlsx'})`.

## 6. UI / 데이터 흐름

compare/split 페이지 패턴 재사용.

```
[엑셀 여러 개 업로드(multiple, .xlsx/.xls/.csv)]
  → 올린 파일 목록(파일명 · 행수)
  → ☑ 출처 파일명 열 추가  (기본 체크)
  → [합치기]
  → 요약: "N개 파일 · 총 M행 · K열"
  → [엑셀 다운로드]  (합쳐진_엑셀.xlsx)
  → 🔒 "업로드한 파일은 서버로 전송되지 않습니다"
  → 사용법 / 이럴 때 / FAQ / ad-slot
```

**상태 (Svelte 5 runes):** `inputs: MergeInput[]`, `addSource: boolean(기본 true)`, `result: MergeResult|null`, `busy`, `error`.

업로드는 누적(여러 번 골라 추가 가능)하거나 한 번에 multiple 선택. 목록에서 개별 제거 가능.

## 7. 에러 / 엣지 케이스

| 상황 | 처리 |
|------|------|
| 일부 파일 파싱 실패 | 해당 파일 건너뛰고 "N개 파일 중 일부를 읽지 못했습니다" 안내, 나머지로 진행 |
| 파일 0개에서 합치기 | "엑셀 파일을 1개 이상 올려 주세요" |
| 공통 열 0개(전부 다른 헤더) | 합집합으로 모두 포함(빈 칸 많아짐) — 정상 동작 |
| 파일 1개 | 그대로 출력(출처 열만 추가 가능) |
| 빈 파일(행 0) | 열만 합집합에 반영, 행 기여 없음 |

## 8. 테스트 전략

순수 함수 TDD + 통합 round-trip(vitest), 한국어 describe/it·샘플 데이터.

**1. 순수 로직 단위 테스트 (`mergeRows`):**
- 같은 열 파일들 → 행 쌓기, 총 행수 = 합
- 다른 열 파일들 → 합집합, 없는 열은 빈 칸
- 열 순서 = 첫 등장 순(첫 파일 열 먼저, 새 열 뒤에)
- `addSource` true → `출처` 열 맨 앞 + 파일명, false → 출처 열 없음
- 빈 파일은 행 기여 없음

**2. 통합 round-trip (`buildMergeWorkbook`):** 결과를 다시 읽어 열 순서·셀 값·출처 일치 (split-integration 패턴).

**3. UI:** dev 렌더 + browse 수동 QA(여러 엑셀 업로드→합치기→다운로드, 콘솔 에러 0).

**커버리지 우선순위:** `mergeRows`가 정확도 본체 → 두텁게. UI는 수동 QA.

## 9. SEO / 애드센스 콘텐츠

도구 페이지 하단 필수: 사용법 / 이럴 때 쓰면 좋아요 / FAQ. 타이틀·메타는 "엑셀 합치기/여러 엑셀 하나로" 검색의도.
- FAQ 후보: 서버 전송 여부 / 양식이 다른 파일도 되나 / 출처 표시 / 몇 개까지 / 비용·설치.

## 10. 신규 의존성

없음 (SheetJS·기존 parse.ts 재사용).

## 11. 향후 (범위 밖, 점진 개선)

- 파일당 시트로 묶기 옵션
- 중복 행 제거, 키 기준 병합
- 열 수동 매핑(이름이 달라도 같은 열로)
- 여러 시트 동시 합치기
