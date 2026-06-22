import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DEFAULT_NETWORK_TIMEOUT_MS, fetchTextWithTimeout } from './network.js';
import { writeGenerationOutput } from './output.js';
import { parseSitemapXml, type SitemapEntry } from './sitemap.js';
import { failureFromStoryError, generateOneStory, type StoryGeneratorFetchers } from './story-generator.js';
import type { GeneratedStory, GenerationFailure, GenerationReport } from './types.js';

export interface GenerateStoriesOptions {
  sitemapUrl?: string;
  sitemapXml?: string;
  outputDir: string;
  publicBaseUrl: string;
  limit?: number;
  concurrency?: number;
  networkTimeoutMs?: number;
  publisher?: string;
  publisherLogoUrl?: string;
  fetchers?: StoryGeneratorFetchers;
}

export async function generateStories(options: GenerateStoriesOptions): Promise<GenerationReport> {
  const started = Date.now();
  const outputDir = resolve(options.outputDir);
  const allEntries = await readEntries(options);
  const entries = applyLimit(allEntries, options.limit);
  const stories: GeneratedStory[] = [];
  const failures: GenerationFailure[] = [];

  await mkdir(outputDir, { recursive: true });
  await cleanGeneratedOutput(outputDir);

  await runWithConcurrency(entries, options.concurrency ?? 6, async (entry) => {
    try {
      stories.push(await generateOneStory(entry, { ...options, outputDir }));
    } catch (error) {
      failures.push(failureFromStoryError(entry.loc, error));
    }
  });

  stories.sort((left, right) => left.storyUrl.localeCompare(right.storyUrl));
  failures.sort((left, right) => left.url.localeCompare(right.url));
  const finished = Date.now();
  return writeGenerationOutput({
    outputDir,
    publicBaseUrl: options.publicBaseUrl,
    sitemapUrls: allEntries.length,
    processed: entries.length,
    limit: options.limit,
    limitApplied: options.limit !== undefined && entries.length < allEntries.length,
    stories,
    failures,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started
  });
}

async function cleanGeneratedOutput(outputDir: string): Promise<void> {
  await Promise.all([
    rm(join(outputDir, 'stories'), { recursive: true, force: true }),
    rm(join(outputDir, 'assets'), { recursive: true, force: true }),
    rm(join(outputDir, 'reports'), { recursive: true, force: true }),
    rm(join(outputDir, 'index.html'), { force: true }),
    rm(join(outputDir, 'sitemap.xml'), { force: true }),
    rm(join(outputDir, 'sitemap.xsl'), { force: true }),
    rm(join(outputDir, 'robots.txt'), { force: true })
  ]);
}

async function readEntries(options: GenerateStoriesOptions): Promise<SitemapEntry[]> {
  const sitemapXml = options.sitemapXml ?? await readRequiredSitemap(options.sitemapUrl, options.fetchers?.fetchText, options.networkTimeoutMs);
  return parseSitemapXml(sitemapXml);
}

async function readRequiredSitemap(
  sitemapUrl: string | undefined,
  fetchText: ((url: string) => Promise<string>) | undefined,
  networkTimeoutMs = DEFAULT_NETWORK_TIMEOUT_MS
): Promise<string> {
  if (!sitemapUrl) {
    throw new Error('A sitemap URL or sitemapXml must be provided');
  }
  return (fetchText ?? ((url: string) => defaultFetchText(url, networkTimeoutMs)))(sitemapUrl);
}

function applyLimit(entries: SitemapEntry[], limit: number | undefined): SitemapEntry[] {
  return limit === undefined ? entries : entries.slice(0, limit);
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(workers);
}

async function defaultFetchText(url: string, timeoutMs: number): Promise<string> {
  return fetchTextWithTimeout(url, 'application/xml,text/xml,text/plain,*/*', timeoutMs);
}
