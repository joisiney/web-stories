import * as cheerio from 'cheerio';
import { htmlToText, toAbsoluteUrl } from './text.js';

export interface HtmlMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageUrls: string[];
  videoUrl?: string;
  videoPosterUrl?: string;
  siteName?: string;
  iconUrl?: string;
}

export function extractHtmlMetadata(html: string, url: string): HtmlMetadata {
  const $ = cheerio.load(html);
  const ogImage = toAbsoluteUrl(firstAttr($, ['meta[property="og:image"]'], 'content'), url);
  const imageUrls = unique([...readAmpStoryImages($, url), ogImage].filter(isString));

  return {
    title: htmlToText($('title').first().text()) || undefined,
    description: firstAttr($, ['meta[name="description"]', 'meta[property="og:description"]'], 'content') || undefined,
    imageUrl: imageUrls[0],
    imageUrls,
    videoUrl: toAbsoluteUrl(firstAttr($, ['meta[property="og:video"]', 'meta[property="og:video:url"]'], 'content'), url),
    videoPosterUrl: toAbsoluteUrl(firstAttr($, ['meta[property="og:video:image"]'], 'content'), url),
    siteName: firstAttr($, ['meta[property="og:site_name"]'], 'content') || undefined,
    iconUrl: toAbsoluteUrl(firstAttr($, ['link[rel="apple-touch-icon"]', 'link[rel="icon"]', 'link[rel="shortcut icon"]'], 'href'), url)
  };
}

function readAmpStoryImages($: cheerio.CheerioAPI, url: string): string[] {
  if ($('amp-story').length === 0) {
    return [];
  }

  return $('amp-story-page amp-img').toArray()
    .map((node) => toAbsoluteUrl($(node).attr('src'), url))
    .filter(isString);
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
