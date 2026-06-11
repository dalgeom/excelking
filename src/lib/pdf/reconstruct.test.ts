import { describe, it, expect } from 'vitest';
import { reconstructPage } from './reconstruct';
import type { Line, PageContent, TextItem } from './types';

const T = (str: string, x: number, y: number, width = 8, height = 10): TextItem => ({
  str,
  x,
  y,
  width,
  height
});
const H = (y: number): Line => ({ x1: 0, y1: y, x2: 20, y2: y });
const V = (x: number): Line => ({ x1: x, y1: 0, x2: x, y2: 30 });

const page = (over: Partial<PageContent>): PageContent => ({
  width: 100,
  height: 100,
  items: [],
  hLines: [],
  vLines: [],
  ...over
});

describe('reconstructPage', () => {
  it('괘선이 충분하면 괘선 격자(ruled)를 쓴다', () => {
    const p = page({
      items: [T('A', 3, 25), T('B', 13, 25), T('C', 3, 15), T('D', 13, 15)],
      hLines: [H(30), H(20), H(10)],
      vLines: [V(0), V(10), V(20)]
    });
    expect(reconstructPage(p)).toEqual([
      ['A', 'B'],
      ['C', 'D']
    ]);
  });

  it('괘선이 없으면 좌표 군집화(cluster)로 폴백한다', () => {
    const p = page({
      items: [T('이름', 0, 100, 40), T('부서', 100, 100, 40), T('김', 0, 80, 40), T('영업', 100, 80, 40)]
    });
    expect(reconstructPage(p)).toEqual([
      ['이름', '부서'],
      ['김', '영업']
    ]);
  });

  it('가로선 1줄만 있으면(불충분) 군집화로 폴백한다', () => {
    const p = page({
      items: [T('이름', 0, 100, 40), T('부서', 100, 100, 40)],
      hLines: [H(30)],
      vLines: [V(0), V(10), V(20)]
    });
    expect(reconstructPage(p)).toEqual([['이름', '부서']]);
  });

  it('텍스트가 없으면 빈 격자를 돌려준다', () => {
    expect(reconstructPage(page({}))).toEqual([]);
  });
});
