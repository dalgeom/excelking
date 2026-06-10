/** 엑셀 시트명 규칙(금지문자 : \ / ? * [ ], 최대 31자)에 맞게 정리한다. */
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31).trim();
  return cleaned || '_';
}

/** Windows 파일명 금지문자(\ / : * ? " < > |)를 제거하고 80자로 자른다. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 80).trim();
  return cleaned || '_';
}

/**
 * 이름 배열의 중복에 ' (2)', ' (3)' 접미사를 붙여 유일하게 만든다.
 * 비교는 대소문자 무시(엑셀 시트명 규칙), 접미사 포함 maxLen을 넘지 않게 앞을 자른다.
 */
export function uniqueNames(names: string[], maxLen = 31): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
      const suffix = ` (${n++})`;
      candidate = name.slice(0, maxLen - suffix.length).trimEnd() + suffix;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
