import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    expect(report.failures[0]?.code).toBe('missing-supported-media');
    expect(report.failures[0]?.stage).toBe('media');
    expect(report.failures[0]?.reason).toMatch(/image or video poster/i);
    expect(await readFile(join(outDir, 'stories', 'ok', 'index.html'), 'utf8')).toContain('Post OK');
    expect(await readFile(join(outDir, 'reports', 'report.json'), 'utf8')).toContain('sem-midia');
  });

  it('classifica falha de preparação de asset sem interromper o lote', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-asset-failure-'));
    tempDirs.push(outDir);

    const report = await generateStories({
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://blog.example.com/quebra-asset/</loc></url>
          <url><loc>https://blog.example.com/ok/</loc></url>
        </urlset>`,
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async (entry) => {
          const slug = entry.loc.includes('ok') ? 'ok' : 'quebra-asset';
          return {
            sourceUrl: entry.loc,
            slug,
            title: `Post ${slug}`,
            description: 'Primeira frase. Segunda frase.',
            imageUrl: `https://cdn.example.com/${slug}.webp`,
            publisher: 'Example'
          };
        },
        prepareAssets: async ({ slug }) => {
          if (slug === 'quebra-asset') {
            throw new Error('GET https://cdn.example.com/quebra-asset.webp failed with HTTP 500');
          }
          return preparedAssets(slug);
        }
      }
    });

    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.failures[0]).toMatchObject({
      url: 'https://blog.example.com/quebra-asset/',
      code: 'asset-failed',
      stage: 'assets'
    });
    expect(report.failures[0]?.reason).toMatch(/HTTP 500/i);
  });

  it('processa todas as URLs do sitemap quando nenhum limite é informado', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-all-'));
    tempDirs.push(outDir);
    const resolvedUrls: string[] = [];

    const report = await generateStories({
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://blog.example.com/post-a/</loc></url>
          <url><loc>https://blog.example.com/post-b/</loc></url>
          <url><loc>https://blog.example.com/post-c/</loc></url>
        </urlset>`,
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async (entry) => {
          resolvedUrls.push(entry.loc);
          const slug = entry.loc.split('/').filter(Boolean).at(-1) ?? 'post';
          return {
            sourceUrl: entry.loc,
            slug,
            title: `Post ${slug}`,
            description: 'Primeira frase. Segunda frase.',
            imageUrl: `https://cdn.example.com/${slug}.webp`,
            publisher: 'Example'
          };
        },
        prepareAssets: async ({ slug }) => preparedAssets(slug)
      }
    });

    expect(resolvedUrls).toHaveLength(3);
    expect(report.sitemapUrls).toBe(3);
    expect(report.processed).toBe(3);
    expect(report.total).toBe(3);
    expect(report.limitApplied).toBe(false);
  });

  it('registra limite aplicado no relatório e no índice gerado', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-limited-'));
    tempDirs.push(outDir);

    const report = await generateStories({
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://blog.example.com/post-a/</loc></url>
          <url><loc>https://blog.example.com/post-b/</loc></url>
          <url><loc>https://blog.example.com/post-c/</loc></url>
        </urlset>`,
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      limit: 2,
      fetchers: {
        resolveMetadata: async (entry) => {
          const slug = entry.loc.split('/').filter(Boolean).at(-1) ?? 'post';
          return {
            sourceUrl: entry.loc,
            slug,
            title: `Post ${slug}`,
            description: 'Primeira frase. Segunda frase.',
            imageUrl: `https://cdn.example.com/${slug}.webp`,
            publisher: 'Example'
          };
        },
        prepareAssets: async ({ slug }) => preparedAssets(slug)
      }
    });

    const indexHtml = await readFile(join(outDir, 'index.html'), 'utf8');
    expect(report.sitemapUrls).toBe(3);
    expect(report.processed).toBe(2);
    expect(report.limit).toBe(2);
    expect(report.limitApplied).toBe(true);
    expect(indexHtml).toContain('Amostra de validação');
    expect(indexHtml).toContain('2 processadas de 3 URLs lidas');
  });

  it('filtra URLs por regex antes de aplicar limite e registra URLs descartadas', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-filtered-'));
    tempDirs.push(outDir);
    const resolvedUrls: string[] = [];

    const report = await generateStories({
      sitemapXml: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://blog.example.com/noticia-a/</loc></url>
          <url><loc>https://blog.example.com/saude/stories/post-a/</loc></url>
          <url><loc>https://blog.example.com/saude/stories/post-b/</loc></url>
        </urlset>`,
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      limit: 1,
      includeUrlPattern: '/stories/',
      fetchers: {
        resolveMetadata: async (entry) => {
          resolvedUrls.push(entry.loc);
          const slug = entry.loc.split('/').filter(Boolean).at(-1) ?? 'post';
          return {
            sourceUrl: entry.loc,
            slug,
            title: `Post ${slug}`,
            description: 'Primeira frase. Segunda frase.',
            imageUrl: `https://cdn.example.com/${slug}.webp`,
            publisher: 'Example'
          };
        },
        prepareAssets: async ({ slug }) => preparedAssets(slug)
      }
    } as Parameters<typeof generateStories>[0] & { includeUrlPattern: string });

    expect(resolvedUrls).toEqual(['https://blog.example.com/saude/stories/post-a/']);
    const filteredReport = report as typeof report & { filteredOut?: number; includeUrlPattern?: string };
    expect(filteredReport.sitemapUrls).toBe(3);
    expect(filteredReport.filteredOut).toBe(1);
    expect(filteredReport.processed).toBe(1);
    expect(filteredReport.limitApplied).toBe(true);
    expect(filteredReport.includeUrlPattern).toBe('/stories/');
    expect(await readFile(join(outDir, 'reports', 'report.json'), 'utf8')).toContain('"filteredOut": 1');
    expect(await readFile(join(outDir, 'index.html'), 'utf8')).toContain('1 filtrada por URL');
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
    const html = await readFile(join(outDir, 'stories', 'video', 'index.html'), 'utf8');
    expect(html).toContain('<amp-video id="video-media" autoplay');
    expect(html).toContain('auto-advance-after="video-media"');
    expect(html).not.toContain('<amp-video autoplay loop');
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

  it('não apaga a última saída válida quando o sitemap é inválido', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-preserve-'));
    tempDirs.push(outDir);
    await mkdir(join(outDir, 'stories', 'antigo'), { recursive: true });
    await writeFile(join(outDir, 'stories', 'antigo', 'index.html'), 'story antiga', 'utf8');
    await writeFile(join(outDir, 'index.html'), 'índice antigo', 'utf8');

    await expect(generateStories({
      sitemapXml: '<urlset><url><loc>https://blog.example.com/quebrado/</url></urlset>',
      outputDir: outDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchers: {
        resolveMetadata: async () => {
          throw new Error('should not resolve metadata');
        },
        prepareAssets: async () => preparedAssets('quebrado')
      }
    })).rejects.toThrow(/Invalid sitemap XML/i);

    expect(await readFile(join(outDir, 'stories', 'antigo', 'index.html'), 'utf8')).toBe('story antiga');
    expect(await readFile(join(outDir, 'index.html'), 'utf8')).toBe('índice antigo');
  });

  it('aplica timeout ao download do sitemap', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'stories-timeout-'));
    tempDirs.push(outDir);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error(`GET ${String(url)} called without AbortSignal`));
        return;
      }
      signal.addEventListener('abort', () => {
        reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason)));
      }, { once: true });
    })) as typeof fetch;

    try {
      await expect(generateStories({
        sitemapUrl: 'https://blog.example.com/post-sitemap.xml',
        outputDir: outDir,
        publicBaseUrl: 'https://stories.example.com',
        networkTimeoutMs: 1,
        fetchers: {
          prepareAssets: async () => preparedAssets('post')
        }
      })).rejects.toThrow(/GET https:\/\/blog\.example\.com\/post-sitemap\.xml timed out after 1ms/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
