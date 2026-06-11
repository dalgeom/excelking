import { describe, it, expect } from 'vitest';
import { clusterGrid } from './cluster';
import type { TextItem } from './types';

/** 간단 생성기: 높이 10, 너비 40 기본 */
const T = (str: string, x: number, y: number, width = 40, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});

describe('clusterGrid', () => {
  it('y 간격으로 행을, x 군집으로 열을 잡아 격자를 만든다', () => {
    const items = [
      T('이름', 0, 100), T('부서', 100, 100), T('금액', 200, 100),
      T('김철수', 0, 80), T('영업', 100, 80), T('1000', 200, 80)
    ];
    expect(clusterGrid(items)).toEqual([
      ['이름', '부서', '금액'],
      ['김철수', '영업', '1000']
    ]);
  });

  it('같은 셀의 여러 조각은 x순으로 공백 결합한다', () => {
    // 열 임계 = 중앙 width(20)의 0.5배 = 10. '김'(x0)·'철수'(x8)는 gap 8 ≤ 10 → 한 열.
    const items = [
      T('김', 0, 100, 10), T('철수', 8, 100, 20), T('영업', 100, 100, 40)
    ];
    expect(clusterGrid(items)).toEqual([['김 철수', '영업']]);
  });

  it('같은 열의 x가 임계 내에서 흔들려도 한 열로 유지한다', () => {
    const items = [
      T('머리', 0, 100), T('값', 100, 100),
      T('머리2', 2, 80), T('값2', 103, 80)
    ];
    expect(clusterGrid(items)).toEqual([
      ['머리', '값'],
      ['머리2', '값2']
    ]);
  });

  it('한 열짜리(문단형)도 처리한다', () => {
    const items = [T('첫 줄', 0, 100), T('둘째 줄', 0, 80)];
    expect(clusterGrid(items)).toEqual([['첫 줄'], ['둘째 줄']]);
  });

  it('빈 입력은 빈 격자를 돌려준다', () => {
    expect(clusterGrid([])).toEqual([]);
  });
});
