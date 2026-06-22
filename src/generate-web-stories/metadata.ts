import * as cheerio from 'cheerio';
import { DEFAULT_NETWORK_TIMEOUT_MS, fetchJsonWithTimeout, fetchTextWithTimeout } from './network.js';
import { htmlToText, humanizeSlug, slugFromUrl, toAbsoluteUrl, truncateText } from './text.js';
import type { SitemapEntry } from './sitemap.js';

export interface PostMetadata {
  sourceUrl: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
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

interface HtmlMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  siteName?: string;
  iconUrl?: string;
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

    return {
      sourceUrl: entry.loc,
      slug,
      title,
      description: truncateText(description, 280),
      imageUrl: entry.imageUrls[0] || post?.imageUrl || htmlMetadata.imageUrl,
      videoUrl: post?.videoUrl || htmlMetadata.videoUrl,
      videoPosterUrl: post?.videoPosterUrl || htmlMetadata.videoPosterUrl,
      publisher: this.dependencies.publisher || siteMetadata.name || htmlMetadata.siteName || pageUrl.hostname,
      publisherLogoUrl: this.dependencies.publisherLogoUrl || htmlMetadata.iconUrl,
      modifiedAt: entry.lastmod
    };
  }

  private async readHtmlWhenNeeded(url: string, site: { name?: string }, post?: HtmlMetadata): Promise<HtmlMetadata> {
    if (post?.title && post.description && post.imageUrl && site.name) {
      return {};
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
      videoUrl: readFirstVideoFromHtml(content)
    };
  }

  private async readHtmlMetadata(url: string): Promise<HtmlMetadata> {
    const html = await safe(() => this.fetchText(url));
    if (!html) {
      return {};
    }

    const $ = cheerio.load(html);
    return {
      title: htmlToText($('title').first().text()) || undefined,
      description: firstAttr($, ['meta[name="description"]', 'meta[property="og:description"]'], 'content') || undefined,
      imageUrl: toAbsoluteUrl(firstAttr($, ['meta[property="og:image"]'], 'content'), url),
      videoUrl: toAbsoluteUrl(firstAttr($, ['meta[property="og:video"]', 'meta[property="og:video:url"]'], 'content'), url),
      videoPosterUrl: toAbsoluteUrl(firstAttr($, ['meta[property="og:video:image"]'], 'content'), url),
      siteName: firstAttr($, ['meta[property="og:site_name"]'], 'content') || undefined,
      iconUrl: toAbsoluteUrl(firstAttr($, ['link[rel="apple-touch-icon"]', 'link[rel="icon"]', 'link[rel="shortcut icon"]'], 'href'), url)
    };
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

function firstAttr($: cheerio.CheerioAPI, selectors: string[], attr: string): string {
  for (const selector of selectors) {
    const value = $(selector).first().attr(attr);
    if (value) {
      return value;
    }
  }
  return '';
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
