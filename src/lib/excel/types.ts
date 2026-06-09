export type Row = Record<string, string>;

export interface CompareResult {
  /** A에만 존재하는 행 (키 기준) */
  onlyA: Row[];
  /** B에만 존재하는 행 (키 기준) */
  onlyB: Row[];
  /** 양쪽에 키가 존재하는 행 (A 기준 행) */
  both: Row[];
  /** both 중 키 외 다른 열 값이 서로 다른 행 */
  changed: { key: string; a: Row; b: Row; diffColumns: string[] }[];
}
