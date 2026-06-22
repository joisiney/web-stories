import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { escapeHtml, sanitizeSlug, toPublicUrl } from './text.js';

export interface PreparedAssets {
  logoSrc: string;
  posterPortraitSrc: string;
  storyImageSrc: string;
}

export interface PrepareAssetInput {
  slug: string;
  imageUrl: string;
  publisher: string;
  publisherLogoUrl?: string;
}

export interface AssetPreparerOptions {
  outputDir: string;
  publicBaseUrl: string;
  fetchBinary?: (url: string) => Promise<Buffer>;
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
    this.fetchBinary = options.fetchBinary ?? fetchBinary;
  }

  async prepare(input: PrepareAssetInput): Promise<PreparedAssets> {
    const safeSlug = sanitizeSlug(input.slug);
    const posterRelativePath = `assets/${safeSlug}/poster-portrait.jpg`;
    const storyImageRelativePath = `assets/${safeSlug}/story-image.jpg`;
    await mkdir(join(this.options.outputDir, 'assets', safeSlug), { recursive: true });
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

    return {
      posterPortraitSrc: toPublicUrl(this.options.publicBaseUrl, posterRelativePath),
      storyImageSrc: toPublicUrl(this.options.publicBaseUrl, storyImageRelativePath),
      logoSrc: await this.ensureLogo(input.publisher, input.publisherLogoUrl)
    };
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

async function fetchBinary(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { accept: 'image/avif,image/webp,image/*,*/*' } });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function fallbackLogo(publisher: string): Buffer {
  const initials = publisher.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'WS';
  return Buffer.from(`<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" fill="#ffffff"/>
    <circle cx="48" cy="48" r="34" fill="#111111"/>
    <text x="48" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeHtml(initials)}</text>
  </svg>`);
}
