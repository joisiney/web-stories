import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { escapeHtml, escapeXml } from './text.js';
import type { GeneratedStory, GenerationFailure, GenerationReport } from './types.js';

export interface WriteGenerationOutputInput {
  outputDir: string;
  publicBaseUrl: string;
  sitemapUrls: number;
  processed: number;
  limit?: number;
  limitApplied: boolean;
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

function renderIndexHtml(report: GenerationReport): string {
  const runLabel = report.limit !== undefined ? 'Amostra de validação' : 'Lote completo';
  const processedLabel = `${report.processed} processadas de ${report.sitemapUrls} URLs lidas`;
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
    <header class="hero">
      <div>
        <p class="eyebrow">Sitemap WordPress para Web Stories AMP</p>
        <h1>Relatório de geração</h1>
        <p class="lead">${escapeHtml(processedLabel)} em ${escapeHtml(formatDuration(report.durationMs))}. Gerado em ${escapeHtml(formatDate(report.finishedAt))}.</p>
      </div>
      <span class="badge ${report.limit !== undefined ? 'sample' : 'complete'}">${escapeHtml(runLabel)}</span>
    </header>
    <section class="metrics" aria-label="Resumo do lote">
      ${renderMetric('URLs lidas', report.sitemapUrls)}
      ${renderMetric('Processadas', report.processed)}
      ${renderMetric('Sucessos', report.succeeded, plural(report.succeeded, 'sucesso', 'sucessos'))}
      ${renderMetric('Falhas', report.failed, plural(report.failed, 'falha', 'falhas'))}
    </section>
    <nav class="artifacts" aria-label="Artefatos gerados">
      <a href="/sitemap.xml">sitemap.xml</a>
      <a href="/robots.txt">robots.txt</a>
      <a href="/reports/report.json">report.json</a>
      <a href="/reports/failures.csv">failures.csv</a>
    </nav>
    <section class="panel">
      <div class="section-heading"><h2>Stories geradas</h2><p>${escapeHtml(plural(report.succeeded, 'sucesso', 'sucessos'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Story</th><th>Origem</th><th>Variante</th><th>Warnings</th></tr></thead>
          <tbody>${report.stories.map(renderStoryRow).join('') || '<tr><td colspan="4">Nenhuma story gerada.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <div class="section-heading"><h2>Falhas</h2><p>${escapeHtml(plural(report.failed, 'falha', 'falhas'))}</p></div>
      ${renderFailures(report.failures)}
    </section>
  </main>
</body>
</html>
`;
}

function renderStoryRow(story: GeneratedStory): string {
  const path = new URL(story.storyUrl).pathname;
  const warnings = story.warnings.map((warning) => warning.code).join(', ') || 'Sem warnings';
  return `<tr><td><a href="${escapeHtml(path)}">${escapeHtml(story.title)}</a></td><td><a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceUrl)}</a></td><td><span class="pill">${escapeHtml(story.variant)}</span></td><td>${escapeHtml(warnings)}</td></tr>`;
}

function renderMetric(label: string, value: number, detail?: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</div>`;
}

function renderFailures(failures: GenerationFailure[]): string {
  if (failures.length === 0) {
    return '<p class="empty">Nenhuma falha registrada neste lote.</p>';
  }

  return `<div class="failure-list">${failures.map((failure) => `<article><a href="${escapeHtml(failure.url)}">${escapeHtml(failure.url)}</a><p>${escapeHtml(failure.reason)}</p></article>`).join('')}</div>`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1).replace(/\.0$/, '')}s`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function plural(count: number, singular: string, pluralValue: string): string {
  return `${count} ${count === 1 ? singular : pluralValue}`;
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
  const rows = failures.map((failure) => `${csv(failure.url)},${csv(failure.code)},${csv(failure.stage)},${csv(failure.reason)}`);
  return ['url,code,stage,reason', ...rows].join('\n') + '\n';
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function indexCss(): string {
  return 'body{margin:0;font-family:Inter,Arial,Helvetica,sans-serif;color:#19202a;background:#f4f6f8}main{max-width:1180px;margin:0 auto;padding:28px 18px 42px}.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:20px}.eyebrow{margin:0 0 8px;color:#526070;font-size:13px;font-weight:800;text-transform:uppercase}h1,h2,p{margin:0}h1{font-size:34px;line-height:1.12}h2{font-size:20px}.lead{max-width:760px;margin-top:10px;color:#526070;line-height:1.5}.badge,.pill{display:inline-flex;align-items:center;border-radius:6px;font-weight:800}.badge{padding:8px 10px;border:1px solid #cfd8e3;background:#fff}.badge.sample{color:#8a4b00;background:#fff7e8;border-color:#ffd493}.badge.complete{color:#17663a;background:#e9f8ef;border-color:#bfe6cb}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.metric{min-height:92px;padding:16px;background:#fff;border:1px solid #d9e0e8;border-radius:8px}.metric span,.metric small{display:block;color:#5b6675}.metric strong{display:block;margin-top:8px;font-size:30px;line-height:1}.metric small{margin-top:4px}.artifacts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}.artifacts a{padding:9px 11px;border:1px solid #cfd8e3;border-radius:6px;background:#fff;color:#0b57d0;font-weight:800;text-decoration:none}.panel{margin-top:16px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}.section-heading p{color:#526070}.table-wrap{overflow-x:auto;border:1px solid #d9e0e8;border-radius:8px;background:#fff}table{width:100%;border-collapse:collapse;min-width:760px}th,td{padding:13px 14px;border-bottom:1px solid #e7ecf2;text-align:left;vertical-align:top}th{background:#edf2f6;color:#526070;font-size:12px;text-transform:uppercase}a{color:#0b57d0;font-weight:800}.pill{padding:4px 7px;background:#eef4ff;color:#254f89;font-size:12px}.empty{padding:16px;border:1px solid #d9e0e8;border-radius:8px;background:#fff;color:#526070}.failure-list{display:grid;gap:10px}.failure-list article{padding:14px;border:1px solid #f0c6c6;border-radius:8px;background:#fff7f7}.failure-list p{margin-top:6px;color:#7a1f1f;line-height:1.45}@media(max-width:760px){main{padding:22px 14px 34px}.hero{display:block}.badge{margin-top:14px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:28px}.metric strong{font-size:26px}}';
}
