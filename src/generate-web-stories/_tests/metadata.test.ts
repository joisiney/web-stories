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
});

