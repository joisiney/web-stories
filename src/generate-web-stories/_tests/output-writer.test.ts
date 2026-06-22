import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeGenerationOutput } from '../output.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('writeGenerationOutput', () => {
  it('grava índice, sitemap, robots e relatórios com sucessos, warnings e falhas', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'web-stories-output-'));
    tempDirs.push(outputDir);

    await writeGenerationOutput({
      outputDir,
      publicBaseUrl: 'https://stories.example.com',
      sitemapUrls: 3,
      processed: 2,
      limit: 2,
      limitApplied: true,
      stories: [
        {
          sourceUrl: 'https://blog.example.com/ok/',
          storyUrl: 'https://stories.example.com/stories/ok/',
          outputPath: join(outputDir, 'stories', 'ok', 'index.html'),
          title: 'Post OK',
          posterPortraitSrc: 'https://stories.example.com/assets/ok/poster.jpg',
          modifiedAt: '2026-06-20T00:00:00.000Z',
          variant: 'image-summary',
          warnings: [{ code: 'unsupported-video', message: 'Vídeo ignorado porque não é direto.' }]
        }
      ],
      failures: [{
        url: 'https://blog.example.com/falha/',
        code: 'missing-supported-media',
        stage: 'media',
        reason: 'Missing featured image for source URL'
      }],
      startedAt: '2026-06-20T00:00:00.000Z',
      finishedAt: '2026-06-20T00:00:01.000Z',
      durationMs: 1000
    });

    const indexHtml = await readFile(join(outputDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('Amostra de validação');
    expect(indexHtml).toContain('2 processadas de 3 URLs lidas');
    expect(indexHtml).toContain('1 sucesso');
    expect(indexHtml).toContain('1 falha');
    expect(indexHtml).toContain('<link rel="icon" href="/assets/shared/publisher-logo.png">');
    expect(indexHtml).toContain('story-card');
    expect(indexHtml).toContain('https://stories.example.com/assets/ok/poster.jpg');
    expect(indexHtml).toContain('unsupported-video');
    expect(indexHtml).toContain('Missing featured image for source URL');
    expect(indexHtml).toContain('href="/sitemap.xml"');
    expect(indexHtml).toContain('href="/sitemap.xsl"');
    expect(indexHtml).toContain('href="/robots.txt"');
    expect(indexHtml).toContain('href="/reports/report.json"');
    expect(indexHtml).toContain('href="/reports/failures.csv"');
    const sitemapXml = await readFile(join(outputDir, 'sitemap.xml'), 'utf8');
    expect(sitemapXml).toContain('<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>');
    expect(sitemapXml).toContain('<loc>https://stories.example.com/stories/ok/</loc>');
    expect(sitemapXml).toContain('<lastmod>2026-06-20T00:00:00.000Z</lastmod>');
    const sitemapXsl = await readFile(join(outputDir, 'sitemap.xsl'), 'utf8');
    expect(sitemapXsl).toContain('Web Stories Sitemap');
    expect(sitemapXsl).toContain('<link rel="icon" href="/assets/shared/publisher-logo.png"/>');
    expect(sitemapXsl).toContain('Sitemap URLs');
    expect(await readFile(join(outputDir, 'robots.txt'), 'utf8')).toContain('Sitemap: https://stories.example.com/sitemap.xml');
    const failuresCsv = await readFile(join(outputDir, 'reports', 'failures.csv'), 'utf8');
    expect(failuresCsv).toContain('url,code,stage,reason');
    expect(failuresCsv).toContain('missing-supported-media');
    expect(failuresCsv).toContain('media');
    expect(failuresCsv).toContain('Missing featured image');
    const reportJson = await readFile(join(outputDir, 'reports', 'report.json'), 'utf8');
    expect(reportJson).toContain('"variant": "image-summary"');
    expect(reportJson).toContain('"sitemapUrls": 3');
    expect(reportJson).toContain('"limitApplied": true');
    expect(reportJson).toContain('"code": "missing-supported-media"');
    expect(reportJson).toContain('"stage": "media"');
  });
});
