import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateStories } from '../generate-web-stories.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('generateStories', () => {
  function preparedAssets(slug: string): { logoSrc: string; posterPortraitSrc: string; storyImageSrc: string } {
    return {
      logoSrc: `https://stories.example.com/assets/${slug}/logo.png`,
      posterPortraitSrc: `https://stories.example.com/assets/${slug}/poster.jpg`,
      storyImageSrc: `https://stories.example.com/assets/${slug}/story-image.jpg`
    };
  }

  it('continua o lote quando uma URL individual falha e registra relatório', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-'));
    tempDirs.push(outDir);

    const report = await generateStories({
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
          xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
          <url><loc>https://blog.example.com/ok/</loc><image:image><image:loc>https://cdn.example.com/ok.webp</image:loc></image:image></url>
          <url><loc>https://blog.example.com/sem-midia/</loc></url>
        </urlset>`,
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      concurrency: 2,
      fetchers: {
        resolveMetadata: async (entry) => ({
          sourceUrl: entry.loc,
          slug: entry.loc.includes('ok') ? 'ok' : 'sem-midia',
          title: entry.loc.includes('ok') ? 'Post OK' : 'Post sem mídia',
          description: 'Descrição curta.',
          imageUrl: entry.imageUrls[0],
          publisher: 'Example',
          modifiedAt: entry.lastmod
        }),
        prepareAssets: async ({ slug }) => preparedAssets(slug)
      }
    });

    expect(report.total).toBe(2);
    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.failures[0]?.reason).toMatch(/image or video poster/i);
    expect(await readFile(join(outDir, 'stories', 'ok', 'index.html'), 'utf8')).toContain('Post OK');
    expect(await readFile(join(outDir, 'reports', 'report.json'), 'utf8')).toContain('sem-midia');
  });

  it('gera story de vídeo direto quando existe poster mesmo sem imagem de capa', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-video-'));
    tempDirs.push(outDir);

    const report = await generateStories({
      sitemapXml: '<urlset><url><loc>https://blog.example.com/video/</loc></url></urlset>',
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async () => ({
          sourceUrl: 'https://blog.example.com/video/',
          slug: 'video',
          title: 'Post com vídeo',
          description: 'Resumo curto.',
          videoUrl: 'https://cdn.example.com/highlight.mp4',
          videoPosterUrl: 'https://cdn.example.com/poster.jpg',
          publisher: 'Example'
        }),
        prepareAssets: async () => preparedAssets('video')
      }
    });

    expect(report.stories[0]?.variant).toBe('video-first');
    expect(await readFile(join(outDir, 'stories', 'video', 'index.html'), 'utf8')).toContain('<amp-video autoplay loop');
  });

  it('aborta sitemap malformado antes de processar itens do lote', async () => {
    let resolvedItems = 0;
    const outDir = await mkdtemp(join(tmpdir(), 'stories-invalid-'));
    tempDirs.push(outDir);

    await expect(generateStories({
      sitemapXml: '<urlset><url><loc>https://blog.example.com/quebrado/</url></urlset>',
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async () => {
          resolvedItems += 1;
          throw new Error('should not resolve metadata');
        },
        prepareAssets: async () => preparedAssets('quebrado')
      }
    })).rejects.toThrow(/Invalid sitemap XML/i);

    expect(resolvedItems).toBe(0);
  });

  it('limpa stories antigas antes de uma nova execução no mesmo diretório', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-idempotent-'));
    tempDirs.push(outDir);

    async function run(slug: string): Promise<void> {
      await generateStories({
        sitemapXml: `<urlset><url><loc>https://blog.example.com/${slug}/</loc></url></urlset>`,
        outputDir: outDir,
        publicBaseUrl: 'https://stories.example.com',
        fetchers: {
          resolveMetadata: async (entry) => ({
            sourceUrl: entry.loc,
            slug,
            title: `Post ${slug}`,
            description: 'Primeira frase. Segunda frase.',
            imageUrl: `https://cdn.example.com/${slug}.webp`,
            publisher: 'Example'
          }),
          prepareAssets: async () => preparedAssets(slug)
        }
      });
    }

    await run('antigo');
    await run('novo');

    expect((await readdir(join(outDir, 'stories'))).sort()).toEqual(['novo']);
  });

  it('usa a imagem local otimizada na story gerada em vez da imagem remota original', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-local-image-'));
    tempDirs.push(outDir);

    await generateStories({
      sitemapXml: '<urlset><url><loc>https://blog.example.com/post-local/</loc></url></urlset>',
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async (entry) => ({
          sourceUrl: entry.loc,
          slug: 'post-local',
          title: 'Post Local',
          description: 'Primeira frase. Segunda frase.',
          imageUrl: 'https://cdn.example.com/original.webp',
          publisher: 'Example'
        }),
        prepareAssets: async () => preparedAssets('post-local')
      }
    });

    const html = await readFile(join(outDir, 'stories', 'post-local', 'index.html'), 'utf8');
    expect(html).toContain('https://stories.example.com/assets/post-local/story-image.jpg');
    expect(html).not.toContain('https://cdn.example.com/original.webp');
  });
});
