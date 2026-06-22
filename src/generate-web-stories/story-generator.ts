import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderAmpStoryHtml } from './amp.js';
import { AssetPreparer, type PreparedAssets, type PrepareAssetInput } from './media.js';
import { PostMetadataResolver, type PostMetadata } from './metadata.js';
import { composeStory, resolveStoryMedia } from './story.js';
import type { SitemapEntry } from './sitemap.js';
import type { GeneratedStory, GenerationFailure, StoryMedia } from './types.js';

export interface StoryGeneratorFetchers {
  resolveMetadata?: (entry: SitemapEntry) => Promise<PostMetadata>;
  prepareAssets?: (input: PrepareAssetInput) => Promise<PreparedAssets>;
  fetchText?: (url: string) => Promise<string>;
  fetchJson?: (url: string) => Promise<unknown>;
  fetchBinary?: (url: string) => Promise<Buffer>;
}

export interface GenerateOneStoryOptions {
  outputDir: string;
  publicBaseUrl: string;
  networkTimeoutMs?: number;
  publisher?: string;
  publisherLogoUrl?: string;
  fetchers?: StoryGeneratorFetchers;
}

export async function generateOneStory(entry: SitemapEntry, options: GenerateOneStoryOptions): Promise<GeneratedStory> {
  const metadata = await readMetadata(entry, options);
  const media = readMedia(metadata);
  const preparedAssets = await readAssets(options, metadata, metadata.imageUrl ?? metadata.videoPosterUrl ?? '');
  const localMedia = usePreparedAssets(media.media, preparedAssets);

  try {
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

    const outputPath = join(options.outputDir, 'stories', story.slug, 'index.html');
    await mkdir(join(options.outputDir, 'stories', story.slug), { recursive: true });
    await writeFile(outputPath, renderAmpStoryHtml(story), 'utf8');
    return {
      sourceUrl: story.sourceUrl,
      storyUrl: story.canonicalUrl,
      outputPath,
      title: story.title,
      posterPortraitSrc: story.posterPortraitSrc,
      modifiedAt: story.modifiedAt,
      variant: story.variant,
      mediaCount: countMedia(story.pages.map((page) => page.media)),
      warnings: [...media.warnings, ...(preparedAssets.warnings ?? [])]
    };
  } catch (error) {
    throw storyError(error, 'render-failed', 'render');
  }
}

export function failureFromStoryError(url: string, error: unknown): GenerationFailure {
  if (error instanceof StoryGenerationError) {
    return { url, code: error.code, stage: error.stage, reason: error.message };
  }
  return { url, code: 'unknown', stage: 'render', reason: error instanceof Error ? error.message : String(error) };
}

async function readMetadata(entry: SitemapEntry, options: GenerateOneStoryOptions): Promise<PostMetadata> {
  try {
    if (options.fetchers?.resolveMetadata) {
      return await options.fetchers.resolveMetadata(entry);
    }
    return await new PostMetadataResolver({
      fetchJson: options.fetchers?.fetchJson,
      fetchText: options.fetchers?.fetchText,
      networkTimeoutMs: options.networkTimeoutMs,
      publisher: options.publisher,
      publisherLogoUrl: options.publisherLogoUrl
    }).resolve(entry);
  } catch (error) {
    throw storyError(error, 'metadata-failed', 'metadata');
  }
}

function readMedia(metadata: PostMetadata): ReturnType<typeof resolveStoryMedia> {
  const media = resolveStoryMedia(metadata);
  if (!metadata.imageUrl && !metadata.videoPosterUrl || media.media.length === 0) {
    throw new StoryGenerationError('Missing supported image or video poster for source URL', 'missing-supported-media', 'media');
  }
  return media;
}

async function readAssets(options: GenerateOneStoryOptions, metadata: PostMetadata, imageUrl: string): Promise<PreparedAssets> {
  try {
    const input = { slug: metadata.slug, imageUrl, imageUrls: metadata.imageUrls ?? [], publisher: metadata.publisher, publisherLogoUrl: metadata.publisherLogoUrl };
    if (options.fetchers?.prepareAssets) {
      return await options.fetchers.prepareAssets(input);
    }
    return await new AssetPreparer({
      outputDir: options.outputDir,
      publicBaseUrl: options.publicBaseUrl,
      fetchBinary: options.fetchers?.fetchBinary,
      networkTimeoutMs: options.networkTimeoutMs
    }).prepare(input);
  } catch (error) {
    throw storyError(error, 'asset-failed', 'assets');
  }
}

function usePreparedAssets(media: StoryMedia[], assets: PreparedAssets): StoryMedia[] {
  let imageIndex = 0;
  const storyImageSrcs = assets.storyImageSrcs ?? [assets.storyImageSrc];
  return media.map((item) => {
    if (item.kind === 'image') {
      const src = storyImageSrcs[imageIndex] ?? assets.storyImageSrc;
      imageIndex += 1;
      return { ...item, src };
    }
    return { ...item, posterSrc: assets.posterPortraitSrc };
  });
}

function countMedia(media: StoryMedia[]): number {
  return new Set(media.map((item) => item.src)).size;
}

function storyError(error: unknown, code: GenerationFailure['code'], stage: GenerationFailure['stage']): StoryGenerationError {
  if (error instanceof StoryGenerationError) {
    return error;
  }
  return new StoryGenerationError(error instanceof Error ? error.message : String(error), code, stage);
}

class StoryGenerationError extends Error {
  constructor(message: string, readonly code: GenerationFailure['code'], readonly stage: GenerationFailure['stage']) {
    super(message);
  }
}
