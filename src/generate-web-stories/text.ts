import * as cheerio from 'cheerio';

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function htmlToText(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  const $ = cheerio.load(`<body>${value}</body>`);
  return normalizeWhitespace($('body').text());
}

export function truncateText(value: string, maxLength: number): string {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) {
    return text;
  }

  const hardLimit = Math.max(0, maxLength - 3);
  const candidate = text.slice(0, hardLimit);
  const lastSpace = candidate.lastIndexOf(' ');
  const cut = lastSpace > hardLimit * 0.6 ? candidate.slice(0, lastSpace) : candidate;
  return `${cut.trimEnd()}...`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(value: unknown): string {
  return escapeHtml(value);
}

export function ensureTrailingSlash(value: string): string {
  return `${value.replace(/\/+$/, '')}/`;
}

export function sanitizeSlug(value: string): string {
  const ascii = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'story';
}

export function slugFromUrl(url: string): string {
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname).replace(/\/+$/, '');
  return sanitizeSlug(pathname.split('/').filter(Boolean).at(-1) || parsed.hostname);
}

export function humanizeSlug(slug: string): string {
  return normalizeWhitespace(slug.replace(/[-_]+/g, ' ')).replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toAbsoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

export function toPublicUrl(publicBaseUrl: string, path: string): string {
  return `${publicBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
