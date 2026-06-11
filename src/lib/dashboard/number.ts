/** 콤마·통화기호(₩,$)·%·공백을 제거하고 숫자로 만든다. 실패 시 null. */
export function parseNumber(s: string): number | null {
  if (typeof s !== 'string') return null;
  const cleaned = s.replace(/[\s,₩$%]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY년 MM월 [DD일] 을 Date로. 실패 시 null. */
export function parseDate(s: string): Date | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = t.match(/^(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1);
  return null;
}
