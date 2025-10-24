// Utility functions for accessing keyword data from keywords.json

export interface KeywordEntry {
  id: string;
  name: string;
  description: string;
  relatedKeywords: string[];
}

// Cache for loaded keywords
let keywordsCache: KeywordEntry[] | null = null;

/**
 * Load keywords data from the JSON file
 */
async function loadKeywords(): Promise<KeywordEntry[]> {
  if (keywordsCache) {
    return keywordsCache;
  }

  try {
    const response = await fetch('/src/features/characterCreation/data/keywords.json');
    keywordsCache = await response.json();
    return keywordsCache;
  } catch (error) {
    console.error('Failed to load keywords:', error);
    return [];
  }
}

/**
 * Get a keyword entry by ID
 */
export async function getKeyword(id: string): Promise<KeywordEntry | null> {
  const keywords = await loadKeywords();
  return keywords.find(k => k.id === id) || null;
}

/**
 * Get keyword description by ID
 */
export async function getKeywordDescription(id: string): Promise<string> {
  const keyword = await getKeyword(id);
  return keyword?.description || `No description available for ${id}`;
}

/**
 * Get multiple keywords by IDs
 */
export async function getKeywords(ids: string[]): Promise<KeywordEntry[]> {
  const keywords = await loadKeywords();
  return keywords.filter(k => ids.includes(k.id));
}

/**
 * Search for keywords containing a term in name or description
 */
export async function searchKeywords(term: string): Promise<KeywordEntry[]> {
  const keywords = await loadKeywords();
  const lowercaseTerm = term.toLowerCase();
  return keywords.filter(k =>
    k.name.toLowerCase().includes(lowercaseTerm) ||
    k.description.toLowerCase().includes(lowercaseTerm)
  );
}

/**
 * Get all keywords (for debugging/testing)
 */
export async function getAllKeywords(): Promise<KeywordEntry[]> {
  return await loadKeywords();
}
