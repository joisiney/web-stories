import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { AssetPreparer } from '../media.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('AssetPreparer', () => {
  it('gera poster 3:4, imagem vertical local e logo raster quadrada a partir de assets remotos', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'assets-'));
    tempDirs.push(outputDir);
    const hero = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#1a73e8' } }).webp().toBuffer();
    const svgLogo = Buffer.from('<svg width="120" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="80" fill="#fff"/><text x="15" y="50" font-size="32">EX</text></svg>');

    const assets = await new AssetPreparer({
      outputDir,
      publicBaseUrl: 'https://stories.example.com',
      fetchBinary: async (url) => (url.endsWith('logo.svg') ? svgLogo : hero)
    }).prepare({
      slug: 'post-a',
      imageUrl: 'https://cdn.example.com/hero.webp',
      publisher: 'Example',
      publisherLogoUrl: 'https://cdn.example.com/logo.svg'
    });

    expect(assets.posterPortraitSrc).toBe('https://stories.example.com/assets/post-a/poster-portrait.jpg');
    expect(assets.storyImageSrc).toBe('https://stories.example.com/assets/post-a/story-image.jpg');
    expect(assets.logoSrc).toBe('https://stories.example.com/assets/shared/publisher-logo.png');
    expect(await stat(join(outputDir, 'assets', 'post-a', 'poster-portrait.jpg'))).toBeTruthy();
    expect(await stat(join(outputDir, 'assets', 'post-a', 'story-image.jpg'))).toBeTruthy();
    expect(await stat(join(outputDir, 'assets', 'shared', 'publisher-logo.png'))).toBeTruthy();

    const poster = await sharp(await readFile(join(outputDir, 'assets', 'post-a', 'poster-portrait.jpg'))).metadata();
    const storyImage = await sharp(await readFile(join(outputDir, 'assets', 'post-a', 'story-image.jpg'))).metadata();
    const logo = await sharp(await readFile(join(outputDir, 'assets', 'shared', 'publisher-logo.png'))).metadata();
    expect([poster.width, poster.height]).toEqual([640, 853]);
    expect([storyImage.width, storyImage.height]).toEqual([720, 1280]);
    expect([logo.width, logo.height]).toEqual([96, 96]);
  });
});
