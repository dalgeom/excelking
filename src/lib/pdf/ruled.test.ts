import { describe, it, expect } from 'vitest';
import { ruledGrid } from './ruled';
import type { Line, TextItem } from './types';

const T = (str: string, x: number, y: number, width = 8, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});
const H = (y: number): Line => ({ x1: 0, y1: y, x2: 20, y2: y });
const V = (x: number): Line => ({ x1: x, y1: 0, x2: x, y2: 30 });

// 가로선 y=30,20,10 → 2행 / 세로선 x=0,10,20 → 2열
const h = [H(30), H(20), H(10)];
const v = [V(0), V(10), V(20)];

describe('ruledGrid', () => {
  it('괘선 격자에 텍스트를 중심좌표 기준으로 배치한다', () => {
    const items = [
      T('A', 3, 25), T('B', 13, 25),
      T('C', 3, 15), T('D', 13, 15)
    ];
    expect(ruledGrid(items, h, v)).toEqual([
      ['A', 'B'],
      ['C', 'D']
    ]);
  });

  it('값이 한 셀에만 들어가면 나머지 셀은 빈 문자열이다 (병합 흉내)', () => {
    const items = [T('제목', 3, 25)];
    expect(ruledGrid(items, h, v)).toEqual([
      ['제목', ''],
      ['', '']
    ]);
  });

  it('격자 밖(선 바깥) 텍스트는 무시한다', () => {
    const items = [T('밖', 3, 100), T('안', 3, 15)];
    expect(ruledGrid(items, h, v)).toEqual([
      ['', ''],
      ['안', '']
    ]);
  });

  it('가로선이나 세로선이 부족하면 빈 격자를 돌려준다', () => {
    expect(ruledGrid([T('x', 3, 25)], [H(30)], v)).toEqual([]);
  });
});
