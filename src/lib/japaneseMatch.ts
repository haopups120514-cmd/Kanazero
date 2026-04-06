/**
 * Japanese text normalization and matching utilities.
 * Handles hiragana/katakana equivalence, long vowel variants,
 * punctuation removal, and whitespace stripping.
 */

/** Normalize a Japanese string for comparison */
export function normalizeJa(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, "")                     // remove all whitespace
    .replace(/[・．。、,，]/g, "")            // remove middle dot and punctuation
    .replace(/[-－—ｰ\u2012\u2013\u2014\u2212]/g, "ー"); // all dashes → katakana long vowel
}

/** Convert hiragana → katakana */
export function hiraToKata(s: string): string {
  return s.replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}

/** Convert katakana → hiragana */
export function kataToHira(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/**
 * Match user Japanese input against an array of acceptable answer strings.
 * Checks exact match after normalization, and cross-script (hira↔kata) match.
 */
export function matchJapanese(input: string, targets: string[]): boolean {
  const n = normalizeJa(input);
  if (!n) return false;
  const nKata = hiraToKata(n);
  const nHira = kataToHira(n);
  return targets.some((t) => {
    const nt = normalizeJa(t);
    return nt === n || hiraToKata(nt) === nKata || kataToHira(nt) === nHira;
  });
}

/** Normalize Chinese text for comparison — strip spaces and punctuation */
export function normalizeChinese(s: string): string {
  return s.trim().replace(/[\s　，。、！？…·／/\\（）()【】「」『』～~]/g, "");
}

/**
 * Match user Chinese input against an array of accepted meaning strings.
 * Uses exact match and inclusion match (handles partial/abbreviated answers).
 */
export function matchChinese(input: string, meanings: string[]): boolean {
  const n = normalizeChinese(input);
  if (!n) return false;
  return meanings.some((m) => {
    const nm = normalizeChinese(m);
    return nm === n || nm.includes(n) || n.includes(nm);
  });
}
