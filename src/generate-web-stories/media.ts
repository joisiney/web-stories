import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { DEFAULT_NETWORK_TIMEOUT_MS, fetchBinaryWithTimeout } from './network.js';
import { escapeHtml, sanitizeSlug, toPublicUrl } from './text.js';
import type { StoryQualityIssue } from './types.js';

export interface PreparedAssets {
  logoSrc: string;
  posterPortraitSrc: string;
  storyImageSrc: string;
  videoPosterSrc?: string;
  storyImageSrcs?: string[];
  warnings?: StoryQualityIssue[];
}

export interface PrepareAssetInput {
  slug: string;
  imageUrl: string;
  imageUrls?: string[];
  videoPosterUrl?: string;
  publisher: string;
  publisherLogoUrl?: string;
}

export interface AssetPreparerOptions {
  outputDir: string;
  publicBaseUrl: string;
  fetchBinary?: (url: string) => Promise<Buffer>;
  networkTimeoutMs?: number;
}

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 853;
const STORY_IMAGE_WIDTH = 720;
const STORY_IMAGE_HEIGHT = 1280;
const LOGO_SIZE = 96;
const JPEG_QUALITY = 84;

export class AssetPreparer {
  private readonly fetchBinary: (url: string) => Promise<Buffer>;
  private logoPromise?: Promise<string>;

  constructor(private readonly options: AssetPreparerOptions) {
    const timeoutMs = options.networkTimeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS;
    this.fetchBinary = options.fetchBinary ?? ((url) => fetchBinary(url, timeoutMs));
  }

  async prepare(input: PrepareAssetInput): Promise<PreparedAssets> {
    const safeSlug = sanitizeSlug(input.slug);
    const posterRelativePath = `assets/${safeSlug}/poster-portrait.jpg`;
    const storyImageRelativePath = `assets/${safeSlug}/story-image.jpg`;
    await mkdir(join(this.options.outputDir, 'assets', safeSlug), { recursive: true });
    const imageUrls = unique([input.imageUrl, ...(input.imageUrls ?? [])]);
    const imageBuffer = await this.fetchBinary(input.imageUrl);

    await Promise.all([
      sharp(imageBuffer)
        .resize(POSTER_WIDTH, POSTER_HEIGHT, { fit: 'cover', position: 'center' })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(join(this.options.outputDir, posterRelativePath)),
      sharp(imageBuffer)
        .resize(STORY_IMAGE_WIDTH, STORY_IMAGE_HEIGHT, { fit: 'cover', position: 'center' })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(join(this.options.outputDir, storyImageRelativePath))
    ]);

    const primaryStoryImageSrc = toPublicUrl(this.options.publicBaseUrl, storyImageRelativePath);
    const secondary = await this.writeSecondaryImages(safeSlug, imageUrls.slice(1), primaryStoryImageSrc);
    const videoPosterSrc = input.videoPosterUrl ? await this.writeVideoPoster(safeSlug, input.videoPosterUrl) : undefined;

    return {
      posterPortraitSrc: toPublicUrl(this.options.publicBaseUrl, posterRelativePath),
      storyImageSrc: primaryStoryImageSrc,
      videoPosterSrc,
      storyImageSrcs: [primaryStoryImageSrc, ...secondary.srcs],
      warnings: secondary.warnings,
      logoSrc: await this.ensureLogo(input.publisher, input.publisherLogoUrl)
    };
  }

  private async writeSecondaryImages(safeSlug: string, imageUrls: string[], fallbackSrc: string): Promise<{ srcs: string[]; warnings: StoryQualityIssue[] }> {
    const srcs: string[] = [];
    const warnings: StoryQualityIssue[] = [];

    for (const [index, imageUrl] of imageUrls.entries()) {
      const position = index + 2;
      const relativePath = `assets/${safeSlug}/story-image-${position}.jpg`;
      try {
        await sharp(await this.fetchBinary(imageUrl))
          .resize(STORY_IMAGE_WIDTH, STORY_IMAGE_HEIGHT, { fit: 'cover', position: 'center' })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toFile(join(this.options.outputDir, relativePath));
        srcs.push(toPublicUrl(this.options.publicBaseUrl, relativePath));
      } catch {
        srcs.push(fallbackSrc);
        warnings.push({
          code: 'secondary-image-failed',
          message: 'Imagem secundária ignorada porque não pôde ser baixada ou rasterizada.'
        });
      }
    }

    return { srcs, warnings };
  }

  private async writeVideoPoster(safeSlug: string, videoPosterUrl: string): Promise<string> {
    const relativePath = `assets/${safeSlug}/video-poster.jpg`;
    await sharp(await this.fetchBinary(videoPosterUrl))
      .resize(POSTER_WIDTH, POSTER_HEIGHT, { fit: 'cover', position: 'center' })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(join(this.options.outputDir, relativePath));
    return toPublicUrl(this.options.publicBaseUrl, relativePath);
  }

  private ensureLogo(publisher: string, publisherLogoUrl?: string): Promise<string> {
    this.logoPromise ??= this.writeLogo(publisher, publisherLogoUrl);
    return this.logoPromise;
  }

  private async writeLogo(publisher: string, publisherLogoUrl?: string): Promise<string> {
    const logoRelativePath = 'assets/shared/publisher-logo.png';
    await mkdir(join(this.options.outputDir, 'assets', 'shared'), { recursive: true });

    await sharp(await this.readLogoBuffer(publisher, publisherLogoUrl))
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .png()
      .toFile(join(this.options.outputDir, logoRelativePath));

    return toPublicUrl(this.options.publicBaseUrl, logoRelativePath);
  }

  private async readLogoBuffer(publisher: string, publisherLogoUrl?: string): Promise<Buffer> {
    if (!publisherLogoUrl) {
      return fallbackLogo(publisher);
    }

    try {
      return await this.fetchBinary(publisherLogoUrl);
    } catch {
      return fallbackLogo(publisher);
    }
  }
}

async function fetchBinary(url: string, timeoutMs: number): Promise<Buffer> {
  return fetchBinaryWithTimeout(url, 'image/avif,image/webp,image/*,*/*', timeoutMs);
}

function fallbackLogo(publisher: string): Buffer {
  const initials = publisher.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'WS';
  return Buffer.from(`<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" fill="#ffffff"/>
    <circle cx="48" cy="48" r="34" fill="#111111"/>
    <text x="48" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeHtml(initials)}</text>
  </svg>`);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
