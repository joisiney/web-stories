import * as cheerio from 'cheerio';
import { DEFAULT_NETWORK_TIMEOUT_MS, fetchJsonWithTimeout, fetchTextWithTimeout } from './network.js';
import { extractHtmlMetadata, type HtmlMetadata } from './metadata-html.js';
import { htmlToText, humanizeSlug, slugFromUrl, truncateText } from './text.js';
import type { SitemapEntry } from './sitemap.js';

export interface PostMetadata {
  sourceUrl: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoPosterUrl?: string;
  publisher: string;
  publisherLogoUrl?: string;
  modifiedAt?: string;
}

export interface PostMetadataResolverDependencies {
  fetchJson?: (url: string) => Promise<unknown>;
  fetchText?: (url: string) => Promise<string>;
  networkTimeoutMs?: number;
  publisher?: string;
  publisherLogoUrl?: string;
}

export class PostMetadataResolver {
  private readonly fetchJson: (url: string) => Promise<unknown>;
  private readonly fetchText: (url: string) => Promise<string>;

  constructor(private readonly dependencies: PostMetadataResolverDependencies = {}) {
    const timeoutMs = dependencies.networkTimeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS;
    this.fetchJson = dependencies.fetchJson ?? ((url) => fetchJson(url, timeoutMs));
    this.fetchText = dependencies.fetchText ?? ((url) => fetchText(url, timeoutMs));
  }

  async resolve(entry: SitemapEntry): Promise<PostMetadata> {
    const pageUrl = new URL(entry.loc);
    const slug = slugFromUrl(entry.loc);
    const [siteMetadata, post] = await Promise.all([
      this.readSiteMetadata(pageUrl.origin),
      this.readWordPressPost(pageUrl.origin, slug)
    ]);
    const htmlMetadata = await this.readHtmlWhenNeeded(entry.loc, siteMetadata, post);
    const title = post?.title || htmlMetadata.title || humanizeSlug(slug);
    const description = post?.description || htmlMetadata.description || siteMetadata.description || title;
    const imageUrls = unique([
      ...entry.imageUrls,
      ...(post?.imageUrls ?? []),
      ...htmlMetadata.imageUrls,
      post?.imageUrl,
      htmlMetadata.imageUrl
    ]);

    return {
      sourceUrl: entry.loc,
      slug,
      title,
      description: truncateText(description, 280),
      imageUrl: imageUrls[0],
      imageUrls,
      videoUrl: post?.videoUrl || htmlMetadata.videoUrl,
      videoPosterUrl: post?.videoPosterUrl || htmlMetadata.videoPosterUrl,
      publisher: this.dependencies.publisher || siteMetadata.name || htmlMetadata.siteName || pageUrl.hostname,
      publisherLogoUrl: this.dependencies.publisherLogoUrl || htmlMetadata.iconUrl,
      modifiedAt: entry.lastmod
    };
  }

  private async readHtmlWhenNeeded(url: string, site: { name?: string }, post?: HtmlMetadata): Promise<HtmlMetadata> {
    if (!isProbablyWebStoryUrl(url) && post?.title && post.description && post.imageUrl && site.name) {
      return { imageUrls: [] };
    }
    return this.readHtmlMetadata(url);
  }

  private async readSiteMetadata(origin: string): Promise<{ name?: string; description?: string }> {
    const data = await safe(() => this.fetchJson(`${origin}/wp-json`));
    return isRecord(data) ? { name: text(data.name), description: text(data.description) } : {};
  }

  private async readWordPressPost(origin: string, slug: string): Promise<HtmlMetadata | undefined> {
    const data = await safe(() => this.fetchJson(`${origin}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`));
    const post = Array.isArray(data) && isRecord(data[0]) ? data[0] : undefined;
    if (!post) {
      return undefined;
    }

    const content = readRendered(post.content);
    return {
      title: htmlToText(readRendered(post.title)) || undefined,
      description: htmlToText(readRendered(post.excerpt)) || truncateText(htmlToText(content), 240) || undefined,
      imageUrl: readEmbeddedImage(post),
      imageUrls: unique([readEmbeddedImage(post)]),
      videoUrl: readFirstVideoFromHtml(content)
    };
  }

  private async readHtmlMetadata(url: string): Promise<HtmlMetadata> {
    const html = await safe(() => this.fetchText(url));
    if (!html) {
      return { imageUrls: [] };
    }

    return extractHtmlMetadata(html, url);
  }
}

function readRendered(value: unknown): string {
  return isRecord(value) && typeof value.rendered === 'string' ? value.rendered : '';
}

function readEmbeddedImage(post: Record<string, unknown>): string | undefined {
  const embedded = post._embedded;
  const media = isRecord(embedded) ? embedded['wp:featuredmedia'] : undefined;
  const first = Array.isArray(media) && isRecord(media[0]) ? media[0] : undefined;
  return text(first?.source_url);
}

function readFirstVideoFromHtml(html: string): string | undefined {
  const $ = cheerio.load(html);
  return $('video source, video').first().attr('src');
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  return fetchJsonWithTimeout(url, 'application/json', timeoutMs);
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  return fetchTextWithTimeout(url, 'text/html,application/xhtml+xml', timeoutMs);
}

async function safe<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try {
    return await operation();
  } catch {
    return undefined;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function isProbablyWebStoryUrl(url: string): boolean {
  try {
    return /\/(stories|web-stories|webstories)\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
