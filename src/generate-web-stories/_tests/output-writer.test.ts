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
      stories: [
        {
          sourceUrl: 'https://blog.example.com/ok/',
          storyUrl: 'https://stories.example.com/stories/ok/',
          outputPath: join(outputDir, 'stories', 'ok', 'index.html'),
          title: 'Post OK',
          variant: 'image-summary',
          warnings: []
        }
      ],
      failures: [{ url: 'https://blog.example.com/falha/', reason: 'Missing featured image for source URL' }],
      startedAt: '2026-06-20T00:00:00.000Z',
      finishedAt: '2026-06-20T00:00:01.000Z',
      durationMs: 1000
    });

    expect(await readFile(join(outputDir, 'index.html'), 'utf8')).toContain('1 story(s) gerada(s), 1 falha(s).');
    expect(await readFile(join(outputDir, 'sitemap.xml'), 'utf8')).toContain('<loc>https://stories.example.com/stories/ok/</loc>');
    expect(await readFile(join(outputDir, 'robots.txt'), 'utf8')).toContain('Sitemap: https://stories.example.com/sitemap.xml');
    expect(await readFile(join(outputDir, 'reports', 'failures.csv'), 'utf8')).toContain('Missing featured image');
    expect(await readFile(join(outputDir, 'reports', 'report.json'), 'utf8')).toContain('"variant": "image-summary"');
  });
});
