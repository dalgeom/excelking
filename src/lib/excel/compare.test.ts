import { describe, it, expect } from 'vitest';
import { compareByKey } from './compare';
import type { Row } from './types';

const A: Row[] = [
  { 사번: '1', 이름: '김철수', 부서: '영업' },
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '개발' }
];
const B: Row[] = [
  { 사번: '2', 이름: '이영희', 부서: '인사' },
  { 사번: '3', 이름: '박민수', 부서: '기획' },
  { 사번: '4', 이름: '최지우', 부서: '영업' }
];

describe('compareByKey', () => {
  it('A에만 있는 행을 onlyA로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.onlyA.map((x) => x.사번)).toEqual(['1']);
  });

  it('B에만 있는 행을 onlyB로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.onlyB.map((x) => x.사번)).toEqual(['4']);
  });

  it('양쪽에 키가 있는 행을 both로 분류한다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.both.map((x) => x.사번).sort()).toEqual(['2', '3']);
  });

  it('키는 같지만 다른 열 값이 다르면 changed에 넣고 diffColumns를 채운다', () => {
    const r = compareByKey(A, B, '사번');
    expect(r.changed).toHaveLength(1);
    expect(r.changed[0].key).toBe('3');
    expect(r.changed[0].diffColumns).toEqual(['부서']);
  });

  it('키 값의 앞뒤 공백은 무시하고 매칭한다', () => {
    const a: Row[] = [{ id: ' 10 ', v: 'x' }];
    const b: Row[] = [{ id: '10', v: 'x' }];
    const r = compareByKey(a, b, 'id');
    expect(r.both).toHaveLength(1);
    expect(r.onlyA).toHaveLength(0);
  });
});
