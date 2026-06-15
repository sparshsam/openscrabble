/**
 * WordDefinitions — looks up word definitions via the Free Dictionary API.
 * Lightweight: only fetches when explicitly requested (tap-hold / click).
 */

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definition: string;
    example?: string;
  }[];
  source: 'api' | 'offline' | 'none';
}

/**
 * Fetch a word definition from the free Dictionary API.
 * Returns null if the word is not found or the API is unreachable.
 */
export async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  const normalized = word.toLowerCase().trim();
  if (normalized.length < 2) return null;

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0]!;
    const meanings: WordDefinition['meanings'] = [];

    for (const m of entry.meanings ?? []) {
      for (const def of m.definitions ?? []) {
        meanings.push({
          partOfSpeech: m.partOfSpeech ?? 'unknown',
          definition: def.definition ?? '',
          example: def.example,
        });
        // Limit to 3 definitions to keep display compact
        if (meanings.length >= 3) break;
      }
      if (meanings.length >= 3) break;
    }

    return {
      word: entry.word ?? normalized,
      phonetic: entry.phonetic,
      meanings,
      source: 'api',
    };
  } catch {
    return null;
  }
}
