import { describe, expect, it } from 'vitest';
import { parseGenerateCliArgs } from '../cli-options.js';

describe('parseGenerateCliArgs', () => {
  it('normaliza opções do comando generate com defaults operacionais', () => {
    expect(parseGenerateCliArgs([
      '--sitemap',
      'https://blog.example.com/post-sitemap.xml',
      '--out',
      'public',
      '--base-url',
      'http://localhost:8080',
      '--limit',
      '5',
      '--concurrency',
      '3'
    ])).toEqual({
      sitemapUrl: 'https://blog.example.com/post-sitemap.xml',
      outputDir: 'public',
      publicBaseUrl: 'http://localhost:8080',
      limit: 5,
      concurrency: 3,
      publisher: undefined,
      publisherLogoUrl: undefined
    });
  });

  it('recusa números inválidos em flags que controlam lote', () => {
    expect(() => parseGenerateCliArgs(['--sitemap', 'https://example.com/sitemap.xml', '--limit', '0'])).toThrow(/limit/i);
  });
});

