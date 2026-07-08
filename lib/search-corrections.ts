const WORD_PATTERN = /[a-z0-9]+/g;

export type SearchableText = Array<string | string[] | undefined>;

export type SearchCorrection = {
  rawQuery: string;
  normalizedQuery: string;
  correctedQuery: string;
  wasCorrected: boolean;
};

export function normalizeSearchText(parts: SearchableText) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : part ? [part] : []))
    .join(" ")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildSearchCorpus(entries: SearchableText[]) {
  const terms = new Set<string>();

  entries.forEach((entry) => {
    const normalized = normalizeSearchText(entry);
    if (!normalized) return;

    normalized.match(WORD_PATTERN)?.forEach((word) => {
      if (word.length >= 3) terms.add(word);
    });
  });

  return Array.from(terms).sort((a, b) => a.length - b.length || a.localeCompare(b));
}

export function getSearchCorrection(query: string, corpus: string[]): SearchCorrection {
  const normalizedQuery = normalizeSearchText([query]);
  if (!normalizedQuery || corpus.length === 0) {
    return { rawQuery: query, normalizedQuery, correctedQuery: normalizedQuery, wasCorrected: false };
  }

  const correctedQuery = normalizedQuery
    .split(" ")
    .map((word) => correctWord(word, corpus))
    .join(" ");

  return {
    rawQuery: query,
    normalizedQuery,
    correctedQuery,
    wasCorrected: correctedQuery !== normalizedQuery,
  };
}

export function matchesCorrectedQuery(parts: SearchableText, correction: SearchCorrection) {
  if (!correction.correctedQuery) return true;

  const text = normalizeSearchText(parts);
  return text.includes(correction.correctedQuery);
}

function correctWord(word: string, corpus: string[]) {
  if (word.length < 3 || corpus.includes(word)) return word;

  let bestWord = word;
  let bestDistance = Number.POSITIVE_INFINITY;

  corpus.forEach((candidate) => {
    if (Math.abs(candidate.length - word.length) > maxDistanceForWord(word)) return;

    const distance = levenshteinDistance(word, candidate);
    if (distance < bestDistance || (distance === bestDistance && candidate.length < bestWord.length)) {
      bestDistance = distance;
      bestWord = candidate;
    }
  });

  return bestDistance <= maxDistanceForWord(word) ? bestWord : word;
}

function maxDistanceForWord(word: string) {
  if (word.length <= 4) return 1;
  if (word.length <= 8) return 2;
  return 3;
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}
