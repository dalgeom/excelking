import { describe, it, expect } from 'vitest';
import { TIPS } from './tips';
import { CATEGORIES } from './types';

describe('TIPS 데이터 무결성', () => {
  it('slug가 중복되지 않는다', () => {
    const slugs = TIPS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('모든 category가 정의된 6종에 속한다', () => {
    for (const t of TIPS) {
      expect(CATEGORIES).toContain(t.category);
    }
  });

  it('related는 실재하는 slug만 가리킨다', () => {
    const slugs = new Set(TIPS.map((t) => t.slug));
    for (const t of TIPS) {
      for (const r of t.related ?? []) {
        expect(slugs).toContain(r);
      }
    }
  });

  it('필수 필드(title·summary·steps)가 비어 있지 않다', () => {
    for (const t of TIPS) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.summary.length).toBeGreaterThan(0);
      expect(t.steps.length).toBeGreaterThan(0);
    }
  });
});
