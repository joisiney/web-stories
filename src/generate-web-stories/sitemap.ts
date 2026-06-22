import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  imageUrls: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true
});

export function parseSitemapXml(xml: string): SitemapEntry[] {
  validateXml(xml);
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    throw new Error(`Invalid sitemap XML: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid sitemap: root document is not an object');
  }

  const urlset = getByLocalName(parsed, 'urlset');
  if (!isRecord(urlset)) {
    throw new Error('Invalid sitemap: expected urlset with url entries');
  }

  const urls = asArray(getByLocalName(urlset, 'url')).filter(isRecord);
  if (urls.length === 0) {
    throw new Error('Invalid sitemap: no url entries found');
  }

  return urls.map((urlNode) => {
    const loc = textValue(getByLocalName(urlNode, 'loc'));
    if (!loc) {
      throw new Error('Invalid sitemap: url entry without loc');
    }

    if (!isAbsoluteHttpUrl(loc)) {
      throw new Error('Invalid sitemap: url entry loc must be an absolute HTTP(S) URL');
    }

    const entry: SitemapEntry = {
      loc,
      imageUrls: extractImageUrls(urlNode)
    };
    const lastmod = optionalText(getByLocalName(urlNode, 'lastmod'));
    if (lastmod) {
      entry.lastmod = lastmod;
    }
    return entry;
  });
}

function validateXml(xml: string): void {
  const result = XMLValidator.validate(xml);
  if (result === true) {
    return;
  }

  throw new Error(`Invalid sitemap XML: ${result.err.msg}`);
}

function extractImageUrls(urlNode: Record<string, unknown>): string[] {
  return Object.entries(urlNode)
    .filter(([key]) => localName(key) === 'image')
    .flatMap(([, value]) => asArray(value))
    .filter(isRecord)
    .map((imageNode) => textValue(getByLocalName(imageNode, 'loc')))
    .filter(isAbsoluteHttpUrl);
}

function getByLocalName(record: Record<string, unknown>, expectedLocalName: string): unknown {
  return Object.entries(record).find(([key]) => localName(key) === expectedLocalName)?.[1];
}

function localName(key: string): string {
  return key.includes(':') ? key.split(':').at(-1) ?? key : key;
}

function optionalText(value: unknown): string | undefined {
  const text = textValue(value);
  return text || undefined;
}

function textValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return isRecord(value) && typeof value['#text'] === 'string' ? value['#text'].trim() : '';
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
