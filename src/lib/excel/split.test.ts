import { describe, it, expect } from 'vitest';
import { splitByColumn } from './split';
import type { Row } from './types';

const ROWS: Row[] = [
  { 이름: '김철수', 부서: '영업', 직급: '대리' },
  { 이름: '이영희', 부서: '인사', 직급: '과장' },
  { 이름: '박민수', 부서: '영업', 직급: '사원' },
  { 이름: '최지우', 부서: ' 영업 ', 직급: '부장' },
  { 이름: '정하늘', 부서: '', 직급: '사원' }
];

describe('splitByColumn', () => {
  it('기준 열 값별로 행을 그룹화한다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const byValue = Object.fromEntries(groups.map((g) => [g.value, g.rows.length]));
    expect(byValue['영업']).toBe(3);
    expect(byValue['인사']).toBe(1);
  });

  it('그룹 순서는 값의 첫 등장 순서를 따른다', () => {
    const groups = splitByColumn(ROWS, '부서');
    expect(groups.map((g) => g.value)).toEqual(['영업', '인사', '(빈 값)']);
  });

  it('값의 앞뒤 공백은 무시하고 같은 그룹으로 묶는다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const sales = groups.find((g) => g.value === '영업')!;
    expect(sales.rows.map((r) => r.이름)).toEqual(['김철수', '박민수', '최지우']);
  });

  it('빈 값은 "(빈 값)" 그룹으로 묶는다', () => {
    const groups = splitByColumn(ROWS, '부서');
    const empty = groups.find((g) => g.value === '(빈 값)')!;
    expect(empty.rows.map((r) => r.이름)).toEqual(['정하늘']);
  });

  it('그룹 안 행 순서는 원본 순서를 유지한다', () => {
    const groups = splitByColumn(ROWS, '직급');
    const staff = groups.find((g) => g.value === '사원')!;
    expect(staff.rows.map((r) => r.이름)).toEqual(['박민수', '정하늘']);
  });
});
