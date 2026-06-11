import { describe, it, expect } from 'vitest';
import { mergeRows } from './merge';
import type { MergeInput } from './merge';

const fileA: MergeInput = {
  name: '1월.xlsx',
  rows: [
    { 이름: '김철수', 부서: '영업' },
    { 이름: '이영희', 부서: '인사' }
  ]
};
const fileB: MergeInput = {
  name: '2월.xlsx',
  rows: [{ 이름: '박민수', 부서: '개발' }]
};

describe('mergeRows', () => {
  it('같은 열 파일들을 한 시트로 쌓는다 (총 행수 = 합)', () => {
    const r = mergeRows([fileA, fileB], false);
    expect(r.columns).toEqual(['이름', '부서']);
    expect(r.rows).toEqual([
      { 이름: '김철수', 부서: '영업' },
      { 이름: '이영희', 부서: '인사' },
      { 이름: '박민수', 부서: '개발' }
    ]);
  });

  it('열이 다르면 합집합으로 묶고 없는 열은 빈 칸이다', () => {
    const a: MergeInput = { name: 'a', rows: [{ 이름: '김', 부서: '영업' }] };
    const b: MergeInput = { name: 'b', rows: [{ 이름: '박', 직급: '대리' }] };
    const r = mergeRows([a, b], false);
    expect(r.columns).toEqual(['이름', '부서', '직급']);
    expect(r.rows).toEqual([
      { 이름: '김', 부서: '영업', 직급: '' },
      { 이름: '박', 부서: '', 직급: '대리' }
    ]);
  });

  it('addSource면 출처 열을 맨 앞에 두고 파일명을 채운다', () => {
    const r = mergeRows([fileA, fileB], true);
    expect(r.columns).toEqual(['출처', '이름', '부서']);
    expect(r.rows[0]).toEqual({ 출처: '1월.xlsx', 이름: '김철수', 부서: '영업' });
    expect(r.rows[2]).toEqual({ 출처: '2월.xlsx', 이름: '박민수', 부서: '개발' });
  });

  it('addSource가 false면 출처 열이 없다', () => {
    const r = mergeRows([fileA], false);
    expect(r.columns).not.toContain('출처');
  });

  it('빈 파일은 행을 기여하지 않는다', () => {
    const empty: MergeInput = { name: 'empty', rows: [] };
    const r = mergeRows([fileA, empty], false);
    expect(r.rows).toHaveLength(2);
  });
});
