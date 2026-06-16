export const CATEGORIES = [
  '함수·수식',
  '단축키',
  '데이터 정리',
  '서식',
  '피벗·집계',
  '자주 겪는 문제'
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ExcelExample {
  /** 수식줄에 표시할 텍스트 (선택) */
  formulaBar?: string;
  /** 열 헤더 라벨 (예: ['사번','이름']) */
  headers: string[];
  /** 셀 값 행렬 */
  rows: string[][];
  /** 노란 강조 셀 좌표 [row, col] (rows 기준 0-base) */
  highlight?: [number, number][];
}

export interface Tip {
  /** URL용 식별자 (예: 'vlookup') */
  slug: string;
  title: string;
  category: Category;
  /** 검색용 키워드 (한글/영문) */
  keywords: string[];
  /** 카드·검색결과 한 줄 설명 */
  summary: string;
  /** 언제 쓰나 */
  when: string;
  /** 따라하기 단계 */
  steps: string[];
  /** 복사용 수식 (선택) */
  formula?: string;
  /** 단축키 (선택) */
  shortcut?: string;
  /** 엑셀풍 예제 표 (선택) */
  example?: ExcelExample;
  /** 관련 꿀팁 slug 목록 (선택) */
  related?: string[];
}
