import { describe, expect, it } from 'vitest';
import { parseSitemapXml } from '../sitemap.js';

describe('parseSitemapXml', () => {
  it('extrai URLs, datas e imagens de um sitemap WordPress com namespace image', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc>https://blog.example.com/post-a/</loc>
          <lastmod>2026-06-19T05:13:04-03:00</lastmod>
          <image:image><image:loc>https://cdn.example.com/a.webp</image:loc></image:image>
          <image:image><image:loc>notaurl</image:loc></image:image>
        </url>
        <url><loc>https://blog.example.com/post-b/</loc></url>
      </urlset>`;

    expect(parseSitemapXml(xml)).toEqual([
      {
        loc: 'https://blog.example.com/post-a/',
        lastmod: '2026-06-19T05:13:04-03:00',
        imageUrls: ['https://cdn.example.com/a.webp']
      },
      { loc: 'https://blog.example.com/post-b/', imageUrls: [] }
    ]);
  });

  it('recusa XML que não representa um sitemap de URLs', () => {
    expect(() => parseSitemapXml('<rss></rss>')).toThrow(/sitemap/i);
  });

  it('recusa XML malformado antes de extrair URLs', () => {
    expect(() => parseSitemapXml('<urlset><url><loc>https://blog.example.com/post-a/</url></urlset>'))
      .toThrow(/Invalid sitemap XML/i);
  });

  it('recusa sitemap com loc que não é URL absoluta HTTP ou HTTPS', () => {
    expect(() => parseSitemapXml('<urlset><url><loc>notaurl</loc></url></urlset>'))
      .toThrow(/Invalid sitemap: url entry loc must be an absolute HTTP\(S\) URL/i);
  });
});
