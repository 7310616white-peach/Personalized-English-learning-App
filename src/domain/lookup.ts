import { normalizeAnswer } from './grading';
import type { Pack, Word } from './models';

export function normalizeQuery(text: string) {
  return normalizeAnswer(text)
    .replace(/^[\s.,;:!?"“”()[\]{}]+|[\s.,;:!?"“”()[\]{}]+$/g, '')
    .slice(0, 100);
}
export function dictionaryWords(packs: Pack[], base: Word[]) {
  // Imported learning cards provide richer personal context than the basic glossary.
  const unique = new Map<string, Word>();
  for (const word of [
    ...packs.flatMap((p) => [...p.words, ...(p.schemaVersion === 2 ? (p.glossary ?? []) : [])]),
    ...base,
  ]) {
    const key = normalizeQuery(word.term);
    if (!unique.has(key)) unique.set(key, word);
  }
  return [...unique.values()];
}
export function findWords(words: Word[], query: string) {
  const key = normalizeQuery(query);
  if (!key) return { exact: undefined, suggestions: [] as Word[] };
  const exact = words.find((w) => normalizeQuery(w.term) === key);
  const candidates = new Set([
    key.replace(/ies$/, 'y'),
    key.replace(/s$/, ''),
    key.replace(/es$/, ''),
    key.replace(/ed$/, ''),
    key.replace(/d$/, ''),
    key.replace(/ing$/, ''),
    key.replace(/ing$/, 'e'),
    key.replace(/(.)\1ing$/, '$1'),
  ]);
  const suggestions = exact
    ? []
    : words
        .filter(
          (w) => normalizeQuery(w.term).startsWith(key) || candidates.has(normalizeQuery(w.term)),
        )
        .slice(0, 8);
  return { exact, suggestions };
}
