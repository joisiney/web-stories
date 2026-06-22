import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderIndexHtml } from './output-index.js';
import { renderSitemapXsl, renderStoriesSitemap } from './output-sitemap.js';
import type { GeneratedStory, GenerationFailure, GenerationReport } from './types.js';

export interface WriteGenerationOutputInput {
  outputDir: string;
  publicBaseUrl: string;
  sitemapUrls: number;
  processed: number;
  limit?: number;
  limitApplied: boolean;
  includeUrlPattern?: string;
  filteredOut?: number;
  stories: GeneratedStory[];
  failures: GenerationFailure[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export async function writeGenerationOutput(input: WriteGenerationOutputInput): Promise<GenerationReport> {
  const report = createReport(input);
  await writeFile(join(input.outputDir, 'index.html'), renderIndexHtml(report), 'utf8');
  await writeFile(join(input.outputDir, 'sitemap.xml'), renderStoriesSitemap(input.stories), 'utf8');
  await writeFile(join(input.outputDir, 'sitemap.xsl'), renderSitemapXsl(), 'utf8');
  await writeFile(join(input.outputDir, 'robots.txt'), renderRobots(input.publicBaseUrl), 'utf8');
  await writeReports(input.outputDir, report);
  return report;
}

function createReport(input: WriteGenerationOutputInput): GenerationReport {
  return {
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: input.durationMs,
    sitemapUrls: input.sitemapUrls,
    processed: input.processed,
    limit: input.limit,
    limitApplied: input.limitApplied,
    includeUrlPattern: input.includeUrlPattern,
    filteredOut: input.filteredOut ?? 0,
    total: input.processed,
    succeeded: input.stories.length,
    failed: input.failures.length,
    outputDir: input.outputDir,
    stories: input.stories,
    failures: input.failures
  };
}

async function writeReports(outputDir: string, report: GenerationReport): Promise<void> {
  const reportsDir = join(outputDir, 'reports');
  await mkdir(reportsDir, { recursive: true });
  await writeFile(join(reportsDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(join(reportsDir, 'failures.csv'), renderFailuresCsv(report.failures), 'utf8');
}

function renderRobots(publicBaseUrl: string): string {
  return `User-agent: *
Allow: /
Sitemap: ${publicBaseUrl.replace(/\/+$/, '')}/sitemap.xml
`;
}

function renderFailuresCsv(failures: GenerationFailure[]): string {
  const rows = failures.map((failure) => `${csv(failure.url)},${csv(failure.code)},${csv(failure.stage)},${csv(failure.reason)}`);
  return ['url,code,stage,reason', ...rows].join('\n') + '\n';
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
