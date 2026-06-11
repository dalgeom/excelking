import type { Row } from './types';

export interface MergeInput {
  name: string;
  rows: Row[];
}

export interface MergeResult {
  columns: string[];
  rows: Row[];
}

/**
 * 여러 파일의 행을 한 시트로 쌓아 합친다.
 * 열은 이름 기준 합집합(첫 등장 순), 없는 열은 빈 칸.
 * addSource면 '출처' 열을 맨 앞에 두고 파일명을 채운다.
 */
export function mergeRows(files: MergeInput[], addSource: boolean): MergeResult {
  const union: string[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    for (const row of f.rows) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          union.push(k);
        }
      }
    }
  }

  const columns = addSource ? ['출처', ...union] : [...union];
  const rows: Row[] = [];
  for (const f of files) {
    for (const row of f.rows) {
      const out: Row = {};
      if (addSource) out['출처'] = f.name;
      for (const col of union) out[col] = row[col] ?? '';
      rows.push(out);
    }
  }

  return { columns, rows };
}
