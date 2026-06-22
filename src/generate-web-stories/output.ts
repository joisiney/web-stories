import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { escapeHtml, escapeXml } from './text.js';
import type { GeneratedStory, GenerationFailure, GenerationReport } from './types.js';

export interface WriteGenerationOutputInput {
  outputDir: string;
  publicBaseUrl: string;
  stories: GeneratedStory[];
  failures: GenerationFailure[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export async function writeGenerationOutput(input: WriteGenerationOutputInput): Promise<GenerationReport> {
  const report = createReport(input);
  await writeFile(join(input.outputDir, 'index.html'), renderIndexHtml(input.stories, input.failures), 'utf8');
  await writeFile(join(input.outputDir, 'sitemap.xml'), renderStoriesSitemap(input.stories), 'utf8');
  await writeFile(join(input.outputDir, 'robots.txt'), renderRobots(input.publicBaseUrl), 'utf8');
  await writeReports(input.outputDir, report);
  return report;
}

function createReport(input: WriteGenerationOutputInput): GenerationReport {
  return {
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: input.durationMs,
    total: input.stories.length + input.failures.length,
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

function renderIndexHtml(stories: GeneratedStory[], failures: GenerationFailure[]): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Web Stories geradas</title>
  <style>${indexCss()}</style>
</head>
<body>
  <main>
    <h1>Web Stories geradas</h1>
    <p>Índice local da automação de sitemap WordPress para Web Stories AMP.</p>
    <div class="status">${stories.length} story(s) gerada(s), ${failures.length} falha(s).</div>
    <table>
      <thead><tr><th>Story</th><th>Origem</th><th>Variante</th><th>Warnings</th></tr></thead>
      <tbody>${stories.map(renderStoryRow).join('')}</tbody>
    </table>
  </main>
</body>
</html>
`;
}

function renderStoryRow(story: GeneratedStory): string {
  const path = new URL(story.storyUrl).pathname;
  const warnings = story.warnings.map((warning) => warning.code).join(', ') || '-';
  return `<tr><td><a href="${escapeHtml(path)}">${escapeHtml(story.title)}</a></td><td><a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceUrl)}</a></td><td>${escapeHtml(story.variant)}</td><td>${escapeHtml(warnings)}</td></tr>`;
}

function renderStoriesSitemap(stories: GeneratedStory[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${stories.map((story) => `  <url>
    <loc>${escapeXml(story.storyUrl)}</loc>
  </url>`).join('\n')}
</urlset>
`;
}

function renderRobots(publicBaseUrl: string): string {
  return `User-agent: *
Allow: /
Sitemap: ${publicBaseUrl.replace(/\/+$/, '')}/sitemap.xml
`;
}

function renderFailuresCsv(failures: GenerationFailure[]): string {
  const rows = failures.map((failure) => `${csv(failure.url)},${csv(failure.reason)}`);
  return ['url,reason', ...rows].join('\n') + '\n';
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function indexCss(): string {
  return 'body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#17202a;background:#f6f8fb}main{max-width:1120px;margin:0 auto;padding:32px 20px}h1{margin:0 0 8px;font-size:32px}p{margin:0 0 24px;color:#4b5563}.status{margin-bottom:18px;font-weight:700}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d7dde8}th,td{padding:12px;border-bottom:1px solid #e5eaf2;text-align:left;vertical-align:top}th{background:#edf2f7;font-size:13px;text-transform:uppercase}a{color:#0b57d0;font-weight:700}';
}

