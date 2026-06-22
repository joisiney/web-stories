import type { SitemapEntry } from './sitemap.js';

export interface FilteredEntries {
  entries: SitemapEntry[];
  filteredOut: number;
}

export function filterEntriesByUrlPattern(entries: SitemapEntry[], pattern?: string): FilteredEntries {
  if (!pattern) {
    return { entries, filteredOut: 0 };
  }

  const regex = compileIncludeUrlPattern(pattern);
  const filtered = entries.filter((entry) => regex.test(entry.loc));
  return { entries: filtered, filteredOut: entries.length - filtered.length };
}

export function compileIncludeUrlPattern(pattern: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch (error) {
    throw new Error(`Invalid include-url-pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
}
