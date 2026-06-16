import { describe, it, expect } from 'vitest';
import { searchTips } from './search';
import type { Tip } from './types';

const TIPS: Tip[] = [
  { slug: 'a', title: 'VLOOKUP 찾기', category: '함수·수식', keywords: ['vlookup', '브이룩업'], summary: '값 조회', when: '', steps: [] },
  { slug: 'b', title: '필터 단축키', category: '단축키', keywords: ['필터', 'filter'], summary: '필터 토글', when: '', steps: [] },
  { slug: 'c', title: '중복 제거', category: '데이터 정리', keywords: ['중복'], summary: '중복 행 정리', when: '', steps: [] }
];

describe('searchTips', () => {
  it('빈 검색어·카테고리 없으면 전체를 반환한다', () => {
    expect(searchTips(TIPS, {}).map((t) => t.slug)).toEqual(['a', 'b', 'c']);
  });

  it('카테고리로 필터링한다', () => {
    expect(searchTips(TIPS, { category: '단축키' }).map((t) => t.slug)).toEqual(['b']);
  });

  it('제목으로 검색한다 (대소문자 무시)', () => {
    expect(searchTips(TIPS, { query: 'vlookup' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('키워드로 검색한다', () => {
    expect(searchTips(TIPS, { query: '브이룩업' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('공백으로 나뉜 여러 토큰을 AND로 매칭한다', () => {
    expect(searchTips(TIPS, { query: '필터 단축' }).map((t) => t.slug)).toEqual(['b']);
    expect(searchTips(TIPS, { query: '필터 없는단어' })).toEqual([]);
  });

  it('카테고리와 검색어를 함께 적용한다', () => {
    expect(searchTips(TIPS, { category: '함수·수식', query: '필터' })).toEqual([]);
    expect(searchTips(TIPS, { category: '함수·수식', query: '찾기' }).map((t) => t.slug)).toEqual(['a']);
  });

  it('검색어 앞뒤 공백을 무시한다', () => {
    expect(searchTips(TIPS, { query: '  중복  ' }).map((t) => t.slug)).toEqual(['c']);
  });
});
