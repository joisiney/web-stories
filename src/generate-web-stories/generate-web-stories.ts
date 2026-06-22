import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { renderAmpStoryHtml } from './amp.js';
import { AssetPreparer, type PreparedAssets, type PrepareAssetInput } from './media.js';
import { PostMetadataResolver, type PostMetadata } from './metadata.js';
import { DEFAULT_NETWORK_TIMEOUT_MS, fetchTextWithTimeout } from './network.js';
import { writeGenerationOutput } from './output.js';
import { parseSitemapXml, type SitemapEntry } from './sitemap.js';
import { composeStory, resolveStoryMedia } from './story.js';
import type { GeneratedStory, GenerationFailure, GenerationReport, StoryMedia } from './types.js';

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
  fetchers?: GenerateStoriesFetchers;
}

interface GenerateStoriesFetchers {
  resolveMetadata?: (entry: SitemapEntry) => Promise<PostMetadata>;
  prepareAssets?: (input: PrepareAssetInput) => Promise<PreparedAssets>;
  fetchText?: (url: string) => Promise<string>;
  fetchJson?: (url: string) => Promise<unknown>;
  fetchBinary?: (url: string) => Promise<Buffer>;
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
      stories.push(await generateOneStory(outputDir, entry, options));
    } catch (error) {
      failures.push({ url: entry.loc, reason: error instanceof Error ? error.message : String(error) });
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

async function generateOneStory(outputDir: string, entry: SitemapEntry, options: GenerateStoriesOptions): Promise<GeneratedStory> {
  const metadata = await resolveMetadata(entry, options);
  const media = resolveStoryMedia(metadata);
  const posterSource = metadata.imageUrl ?? metadata.videoPosterUrl;
  if (!posterSource || media.media.length === 0) {
    throw new Error('Missing supported image or video poster for source URL');
  }

  const preparedAssets = await prepareAssets(outputDir, options, metadata, posterSource);
  const localMedia = usePreparedAssets(media.media, preparedAssets);
  const story = composeStory({
    sourceUrl: metadata.sourceUrl,
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.description,
    publisher: metadata.publisher,
    logoSrc: preparedAssets.logoSrc,
    posterPortraitSrc: preparedAssets.posterPortraitSrc,
    publicBaseUrl: options.publicBaseUrl,
    media: localMedia,
    modifiedAt: metadata.modifiedAt
  });

  const outputPath = join(outputDir, 'stories', story.slug, 'index.html');
  await mkdir(join(outputDir, 'stories', story.slug), { recursive: true });
  await writeFile(outputPath, renderAmpStoryHtml(story), 'utf8');
  return { sourceUrl: story.sourceUrl, storyUrl: story.canonicalUrl, outputPath, title: story.title, variant: story.variant, warnings: media.warnings };
}

async function cleanGeneratedOutput(outputDir: string): Promise<void> {
  await Promise.all([
    rm(join(outputDir, 'stories'), { recursive: true, force: true }),
    rm(join(outputDir, 'assets'), { recursive: true, force: true }),
    rm(join(outputDir, 'reports'), { recursive: true, force: true }),
    rm(join(outputDir, 'index.html'), { force: true }),
    rm(join(outputDir, 'sitemap.xml'), { force: true }),
    rm(join(outputDir, 'robots.txt'), { force: true })
  ]);
}

function usePreparedAssets(media: StoryMedia[], assets: PreparedAssets): StoryMedia[] {
  return media.map((item) => {
    if (item.kind === 'image') {
      return { ...item, src: assets.storyImageSrc };
    }
    return { ...item, posterSrc: assets.posterPortraitSrc };
  });
}

async function readEntries(options: GenerateStoriesOptions): Promise<SitemapEntry[]> {
  const sitemapXml = options.sitemapXml ?? await readRequiredSitemap(options.sitemapUrl, options.fetchers?.fetchText, options.networkTimeoutMs);
  return parseSitemapXml(sitemapXml);
}

async function resolveMetadata(entry: SitemapEntry, options: GenerateStoriesOptions): Promise<PostMetadata> {
  if (options.fetchers?.resolveMetadata) {
    return options.fetchers.resolveMetadata(entry);
  }
  return new PostMetadataResolver({
    fetchJson: options.fetchers?.fetchJson,
    fetchText: options.fetchers?.fetchText,
    networkTimeoutMs: options.networkTimeoutMs,
    publisher: options.publisher,
    publisherLogoUrl: options.publisherLogoUrl
  }).resolve(entry);
}

async function prepareAssets(outputDir: string, options: GenerateStoriesOptions, metadata: PostMetadata, imageUrl: string): Promise<PreparedAssets> {
  const input = { slug: metadata.slug, imageUrl, publisher: metadata.publisher, publisherLogoUrl: metadata.publisherLogoUrl };
  if (options.fetchers?.prepareAssets) {
    return options.fetchers.prepareAssets(input);
  }
  return new AssetPreparer({
    outputDir,
    publicBaseUrl: options.publicBaseUrl,
    fetchBinary: options.fetchers?.fetchBinary,
    networkTimeoutMs: options.networkTimeoutMs
  }).prepare(input);
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
