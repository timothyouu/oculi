import { normalizeSearchText, type SearchableText } from "./search-corrections";

type SearchField<T> = {
  weight: number;
  getValue: (item: T) => SearchableText;
};

type RankedResult<T> = {
  item: T;
  score: number;
};

type RankSearchOptions<T> = {
  items: T[];
  query: string;
  fields: Array<SearchField<T>>;
  limit?: number;
};

const WORD_PATTERN = /[a-z0-9]+/g;

export function rankSearchResults<T>({ items, query, fields, limit }: RankSearchOptions<T>): T[] {
  const normalizedQuery = normalizeSearchText([query]);
  if (!normalizedQuery) return items.slice(0, limit);

  const queryTokens = tokenize(normalizedQuery);
  if (!queryTokens.length) return items.slice(0, limit);

  const ranked = items
    .map((item, index) => {
      const result = scoreItem(item, fields, normalizedQuery, queryTokens);
      return result ? { ...result, index } : null;
    })
    .filter((result): result is RankedResult<T> & { index: number } => Boolean(result))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return ranked.slice(0, limit).map((result) => result.item);
}

function scoreItem<T>(
  item: T,
  fields: Array<SearchField<T>>,
  normalizedQuery: string,
  queryTokens: string[],
): RankedResult<T> | null {
  let score = 0;
  const matchedTokens = new Set<string>();
  let hasPrimaryShortMatch = false;

  fields.forEach((field) => {
    const text = normalizeSearchText(field.getValue(item));
    if (!text) return;

    const fieldScore = scoreField(text, field.weight, normalizedQuery, queryTokens);
    score += fieldScore.score;
    fieldScore.matchedTokens.forEach((token) => matchedTokens.add(token));

    if (field.weight >= 4 && fieldScore.hasPrefixMatch) {
      hasPrimaryShortMatch = true;
    }
  });

  if (matchedTokens.size < queryTokens.length) return null;
  if (queryTokens.some((token) => token.length < 3) && !hasPrimaryShortMatch) return null;
  if (score < queryTokens.length * 12) return null;

  return { item, score };
}

function scoreField(text: string, weight: number, normalizedQuery: string, queryTokens: string[]) {
  const fieldTokens = tokenize(text);
  const matchedTokens = new Set<string>();
  let score = 0;
  let hasPrefixMatch = false;

  if (text === normalizedQuery) score += weight * 120;
  else if (text.startsWith(normalizedQuery)) {
    score += weight * 85;
    hasPrefixMatch = true;
  } else if (startsAtWordBoundary(text, normalizedQuery)) {
    score += weight * 60;
    hasPrefixMatch = true;
  } else if (normalizedQuery.length >= 3 && text.includes(normalizedQuery)) {
    score += weight * 28;
  }

  queryTokens.forEach((queryToken) => {
    let bestTokenScore = 0;
    let tokenPrefixMatch = false;

    fieldTokens.forEach((fieldToken) => {
      const tokenScore = scoreToken(queryToken, fieldToken, weight);
      if (fieldToken.startsWith(queryToken)) tokenPrefixMatch = true;
      bestTokenScore = Math.max(bestTokenScore, tokenScore);
    });

    if (bestTokenScore > 0) {
      matchedTokens.add(queryToken);
      score += bestTokenScore;
      hasPrefixMatch = hasPrefixMatch || tokenPrefixMatch;
    }
  });

  return { score, matchedTokens, hasPrefixMatch };
}

function scoreToken(queryToken: string, fieldToken: string, weight: number) {
  if (fieldToken === queryToken) return weight * 34;
  if (fieldToken.startsWith(queryToken)) return weight * 24;
  if (queryToken.length >= 3 && fieldToken.includes(queryToken)) return weight * 9;

  const maxDistance = maxTypoDistance(queryToken);
  if (maxDistance > 0 && Math.abs(fieldToken.length - queryToken.length) <= maxDistance) {
    const distance = levenshteinDistance(queryToken, fieldToken);
    if (distance <= maxDistance) return weight * (maxDistance === 1 ? 12 : 9);
  }

  return 0;
}

function startsAtWordBoundary(text: string, query: string) {
  return text.split(" ").some((part) => part.startsWith(query));
}

function tokenize(text: string) {
  return text.match(WORD_PATTERN) ?? [];
}

function maxTypoDistance(word: string) {
  if (word.length < 4) return 0;
  if (word.length <= 7) return 1;
  return 2;
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
