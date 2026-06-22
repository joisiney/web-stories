import { describe, expect, it } from 'vitest';
import { PostMetadataResolver } from '../metadata.js';

describe('PostMetadataResolver', () => {
  it('prioriza imagem do sitemap e enriquece título, descrição e publisher via WordPress REST', async () => {
    const requested: string[] = [];
    const resolver = new PostMetadataResolver({
      fetchJson: async (url) => {
        requested.push(url);
        if (url.endsWith('/wp-json')) {
          return { name: 'Blog Example', description: 'Blog de exemplo' };
        }
        return [{
          title: { rendered: 'Título <strong>renderizado</strong>' },
          excerpt: { rendered: '<p>Resumo renderizado do WordPress.</p>' },
          _embedded: { 'wp:featuredmedia': [{ source_url: 'https://cdn.example.com/rest.webp' }] }
        }];
      },
      fetchText: async () => ''
    });

    const metadata = await resolver.resolve({
      loc: 'https://blog.example.com/post-a/',
      imageUrls: ['https://cdn.example.com/sitemap.webp']
    });

    expect(metadata).toMatchObject({
      sourceUrl: 'https://blog.example.com/post-a/',
      slug: 'post-a',
      title: 'Título renderizado',
      description: 'Resumo renderizado do WordPress.',
      imageUrl: 'https://cdn.example.com/sitemap.webp',
      publisher: 'Blog Example'
    });
    expect(requested).toContain('https://blog.example.com/wp-json');
  });

  it('usa metadados HTML e vídeo direto quando o REST não entrega o conteúdo necessário', async () => {
    const resolver = new PostMetadataResolver({
      fetchJson: async (url) => (url.endsWith('/wp-json') ? { name: 'Blog Example' } : []),
      fetchText: async () => `
        <html>
          <head>
            <title>Título HTML</title>
            <meta name="description" content="Descrição HTML">
            <meta property="og:image" content="https://cdn.example.com/html.webp">
            <meta property="og:video" content="/video/highlight.mp4">
            <meta property="og:video:image" content="/video/poster.jpg">
            <meta property="og:site_name" content="Site HTML">
            <link rel="icon" href="/favicon.png">
          </head>
        </html>`
    });

    const metadata = await resolver.resolve({ loc: 'https://blog.example.com/post-b/', imageUrls: [] });

    expect(metadata.title).toBe('Título HTML');
    expect(metadata.description).toBe('Descrição HTML');
    expect(metadata.imageUrl).toBe('https://cdn.example.com/html.webp');
    expect(metadata.videoUrl).toBe('https://blog.example.com/video/highlight.mp4');
    expect(metadata.videoPosterUrl).toBe('https://blog.example.com/video/poster.jpg');
    expect(metadata.publisherLogoUrl).toBe('https://blog.example.com/favicon.png');
  });

  it('extrai imagens em ordem narrativa quando a origem já é uma Web Story AMP', async () => {
    const resolver = new PostMetadataResolver({
      fetchJson: async (url) => (url.endsWith('/wp-json') ? { name: 'G1' } : []),
      fetchText: async () => `
        <html amp>
          <head>
            <title>Story AMP</title>
            <meta property="og:image" content="https://cdn.example.com/og.webp">
          </head>
          <body>
            <amp-story standalone>
              <amp-story-page id="story-page-1">
                <amp-img src="https://cdn.example.com/page-1.webp" width="1200" height="1600" layout="responsive"></amp-img>
              </amp-story-page>
              <amp-story-page id="story-page-2">
                <amp-img src="/page-2.webp" width="1200" height="1600" layout="responsive"></amp-img>
              </amp-story-page>
              <amp-story-page id="story-page-3">
                <amp-img src="https://cdn.example.com/page-1.webp" width="1200" height="1600" layout="responsive"></amp-img>
              </amp-story-page>
            </amp-story>
          </body>
        </html>`
    });

    const metadata = await resolver.resolve({ loc: 'https://g1.globo.com/saude/stories/post-a.ghtml', imageUrls: [] });
    const imageUrls = (metadata as typeof metadata & { imageUrls?: string[] }).imageUrls;

    expect(metadata.imageUrl).toBe('https://cdn.example.com/page-1.webp');
    expect(imageUrls).toEqual([
      'https://cdn.example.com/page-1.webp',
      'https://g1.globo.com/page-2.webp',
      'https://cdn.example.com/og.webp'
    ]);
  });
});
