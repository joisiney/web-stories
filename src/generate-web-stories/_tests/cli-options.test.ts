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
      '3',
      '--network-timeout-ms',
      '9000',
      '--include-url-pattern',
      '/stories/'
    ])).toEqual({
      sitemapUrl: 'https://blog.example.com/post-sitemap.xml',
      outputDir: 'public',
      publicBaseUrl: 'http://localhost:8080',
      limit: 5,
      concurrency: 3,
      networkTimeoutMs: 9000,
      includeUrlPattern: '/stories/',
      publisher: undefined,
      publisherLogoUrl: undefined
    });
  });

  it('recusa números inválidos em flags que controlam lote', () => {
    expect(() => parseGenerateCliArgs(['--sitemap', 'https://example.com/sitemap.xml', '--limit', '0'])).toThrow(/limit/i);
    expect(() => parseGenerateCliArgs(['--sitemap', 'https://example.com/sitemap.xml', '--network-timeout-ms', '0'])).toThrow(/network-timeout-ms/i);
  });

  it('recusa regex inválida no filtro de URLs', () => {
    expect(() => parseGenerateCliArgs([
      '--sitemap',
      'https://example.com/sitemap.xml',
      '--include-url-pattern',
      '['
    ])).toThrow(/include-url-pattern/i);
  });
});
