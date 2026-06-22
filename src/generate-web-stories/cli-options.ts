import type { GenerateStoriesOptions } from './generate-web-stories.js';
import { compileIncludeUrlPattern } from './source-filter.js';

export type GenerateCliOptions = Pick<
  GenerateStoriesOptions,
  'sitemapUrl' | 'outputDir' | 'publicBaseUrl' | 'limit' | 'concurrency' | 'publisher' | 'publisherLogoUrl'
  | 'networkTimeoutMs' | 'includeUrlPattern'
>;

export function parseGenerateCliArgs(args: string[]): GenerateCliOptions {
  const values = readFlags(args);
  const sitemapUrl = values.get('sitemap');
  const includeUrlPattern = values.get('include-url-pattern');
  if (!sitemapUrl) {
    throw new Error('Missing required --sitemap option');
  }

  if (includeUrlPattern) {
    compileIncludeUrlPattern(includeUrlPattern);
  }

  return {
    sitemapUrl,
    outputDir: values.get('out') ?? 'public',
    publicBaseUrl: values.get('base-url') ?? 'http://localhost:8080',
    limit: parseOptionalPositiveInt(values.get('limit'), 'limit'),
    concurrency: parseOptionalPositiveInt(values.get('concurrency'), 'concurrency') ?? 6,
    networkTimeoutMs: parseOptionalPositiveInt(values.get('network-timeout-ms'), 'network-timeout-ms'),
    includeUrlPattern,
    publisher: values.get('publisher'),
    publisherLogoUrl: values.get('publisher-logo')
  };
}

function readFlags(args: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    values.set(token.slice(2), next);
    index += 1;
  }
  return values;
}

function parseOptionalPositiveInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  return parsed;
}
