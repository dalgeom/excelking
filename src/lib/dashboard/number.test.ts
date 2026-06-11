import { describe, it, expect } from 'vitest';
import { parseNumber, parseDate } from './number';

describe('parseNumber', () => {
  it('콤마·통화·% ·공백을 제거하고 숫자로 만든다', () => {
    expect(parseNumber('1,000')).toBe(1000);
    expect(parseNumber('₩5000')).toBe(5000);
    expect(parseNumber('12%')).toBe(12);
    expect(parseNumber(' 3.14 ')).toBe(3.14);
    expect(parseNumber('-5')).toBe(-5);
  });

  it('빈 문자열·비숫자는 null', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
    expect(parseNumber('영업')).toBeNull();
  });
});

describe('parseDate', () => {
  it('여러 날짜 형식을 파싱한다', () => {
    expect(parseDate('2026-06-11')?.getTime()).toBe(new Date(2026, 5, 11).getTime());
    expect(parseDate('2026/6/1')?.getTime()).toBe(new Date(2026, 5, 1).getTime());
    expect(parseDate('2026.06.11')?.getTime()).toBe(new Date(2026, 5, 11).getTime());
    expect(parseDate('2026년 6월')?.getTime()).toBe(new Date(2026, 5, 1).getTime());
    expect(parseDate('2026년 6월 5일')?.getTime()).toBe(new Date(2026, 5, 5).getTime());
  });

  it('비날짜는 null', () => {
    expect(parseDate('영업')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('1000')).toBeNull();
  });
});
