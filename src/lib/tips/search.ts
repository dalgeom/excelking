import type { Tip, Category } from './types';

export interface TipFilter {
  query?: string;
  category?: Category | null;
}

export function searchTips(tips: Tip[], filter: TipFilter): Tip[] {
  let result = tips;

  if (filter.category) {
    result = result.filter((t) => t.category === filter.category);
  }

  const q = (filter.query ?? '').trim().toLowerCase();
  if (q) {
    const tokens = q.split(/\s+/);
    result = result.filter((t) => {
      const hay = [t.title, t.summary, t.category, ...t.keywords].join(' ').toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }

  return result;
}
