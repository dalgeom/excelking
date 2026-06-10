import { describe, it, expect } from 'vitest';
import { sanitizeSheetName, sanitizeFileName, uniqueNames } from './names';

describe('sanitizeSheetName', () => {
  it('엑셀 시트명 금지문자를 공백으로 바꾼다', () => {
    expect(sanitizeSheetName('영업/마케팅[1]')).toBe('영업 마케팅 1');
  });

  it('31자를 넘으면 자른다', () => {
    expect(sanitizeSheetName('가'.repeat(40))).toHaveLength(31);
  });

  it('정리 후 빈 문자열이면 "_"를 돌려준다', () => {
    expect(sanitizeSheetName('***')).toBe('_');
  });
});

describe('sanitizeFileName', () => {
  it('Windows 파일명 금지문자를 공백으로 바꾼다', () => {
    expect(sanitizeFileName('보고서: 1분기 <최종>')).toBe('보고서  1분기  최종');
  });

  it('정리 후 빈 문자열이면 "_"를 돌려준다', () => {
    expect(sanitizeFileName('???')).toBe('_');
  });
});

describe('uniqueNames', () => {
  it('중복 이름에 (2), (3) 접미사를 붙인다', () => {
    expect(uniqueNames(['영업', '영업', '영업'])).toEqual(['영업', '영업 (2)', '영업 (3)']);
  });

  it('대소문자만 다른 이름도 중복으로 본다 (엑셀 시트명 규칙)', () => {
    expect(uniqueNames(['Sales', 'sales'])).toEqual(['Sales', 'sales (2)']);
  });

  it('접미사를 붙여도 maxLen을 넘지 않는다', () => {
    const long = '가'.repeat(31);
    const result = uniqueNames([long, long], 31);
    expect(result[1]).toHaveLength(31);
    expect(result[1].endsWith(' (2)')).toBe(true);
  });
});
