/**
 * Romaji variant resolution.
 * Some kana can be typed in multiple ways (shi/si, chi/ti, tsu/tu, etc.)
 * The engine pre-computes all valid full-romaji strings for a target at
 * session start, then does prefix matching on each keystroke.
 */

// Maps canonical romaji segments to alternative spellings
const VARIANTS: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  ja: ["zya", "jya"],
  ju: ["zyu", "jyu"],
  jo: ["zyo", "jyo"],
  sha: ["sya"],
  shi_: ["shi"],  // placeholder key
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  dzi: ["di"],
  dzu: ["du"],
  // double consonants (っ) handled by doubling the next consonant
};

/**
 * Given a canonical romaji string, produce all valid typing sequences.
 * e.g., "shichi" → ["shichi", "shiti", "sichi", "siti"]
 */
export function expandRomaji(canonical: string): string[] {
  const results: string[] = [canonical];

  // Build substitution list: all consecutive canonical→variant swaps
  for (const [canon, alts] of Object.entries(VARIANTS)) {
    if (!canonical.includes(canon)) continue;
    const newResults: string[] = [];
    for (const existing of results) {
      newResults.push(existing); // keep original
      for (const alt of alts) {
        if (existing.includes(canon)) {
          newResults.push(existing.replaceAll(canon, alt));
        }
      }
    }
    // deduplicate
    results.length = 0;
    results.push(...new Set(newResults));
  }

  return [...new Set(results)];
}

/**
 * Check if the current partial input is a valid prefix of the target romaji
 * (considering all variant expansions).
 */
export function isValidPrefix(input: string, canonicalTarget: string): boolean {
  const expansions = expandRomaji(canonicalTarget);
  return expansions.some((e) => e.startsWith(input));
}

/**
 * Normalize romaji for comparison: lowercase, trim spaces.
 */
export function normalizeRomaji(r: string): string {
  return r.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Check if input matches any of the acceptable answers (for expressions).
 */
export function romajiMatch(
  input: string,
  canonical: string,
  acceptableAnswers: string[]
): boolean {
  const normalized = normalizeRomaji(input);
  const targets = [canonical, ...acceptableAnswers].map(normalizeRomaji);
  return targets.some(
    (t) =>
      normalized === t ||
      expandRomaji(t).some((e) => normalizeRomaji(e) === normalized)
  );
}
