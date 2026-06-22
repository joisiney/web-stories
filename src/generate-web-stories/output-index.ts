import { escapeHtml } from './text.js';
import type { GeneratedStory, GenerationFailure, GenerationReport } from './types.js';

export function renderIndexHtml(report: GenerationReport): string {
  const runLabel = report.limit !== undefined ? 'Amostra de validação' : 'Lote completo';
  const processedLabel = `${report.processed} processadas de ${report.sitemapUrls} URLs lidas`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/assets/shared/publisher-logo.png">
  <title>Web Stories geradas</title>
  <style>${indexCss()}</style>
</head>
<body>
  <main>
    <header class="masthead">
      <div class="masthead-copy">
        <p class="eyebrow">WordPress Sitemap para Web Stories AMP</p>
        <h1>Galeria técnica de Web Stories geradas</h1>
        <p class="lead">${escapeHtml(processedLabel)} em ${escapeHtml(formatDuration(report.durationMs))}. Saída atualizada em ${escapeHtml(formatDate(report.finishedAt))}.</p>
      </div>
      <div class="run-state">
        <span>${escapeHtml(runLabel)}</span>
        <strong>${escapeHtml(plural(report.succeeded, 'sucesso', 'sucessos'))}</strong>
      </div>
    </header>
    <section class="metric-strip" aria-label="Resumo do lote">
      ${renderMetric('URLs lidas', report.sitemapUrls)}
      ${renderMetric('Processadas', report.processed)}
      ${renderMetric('Sucessos', report.succeeded)}
      ${renderMetric('Falhas', report.failed)}
    </section>
    <nav class="artifact-nav" aria-label="Artefatos gerados">
      <a href="/sitemap.xml">sitemap.xml</a>
      <a href="/sitemap.xsl">sitemap.xsl</a>
      <a href="/robots.txt">robots.txt</a>
      <a href="/reports/report.json">report.json</a>
      <a href="/reports/failures.csv">failures.csv</a>
    </nav>
    <section class="section-heading" aria-labelledby="stories-title">
      <div>
        <p class="eyebrow">AMP válido, assets locais e canonical por story</p>
        <h2 id="stories-title">Stories publicáveis</h2>
      </div>
      <p>${escapeHtml(plural(report.succeeded, 'story gerada', 'stories geradas'))}</p>
    </section>
    ${renderStoryGallery(report.stories)}
    <section class="failures" aria-labelledby="failures-title">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Resiliência de lote</p>
          <h2 id="failures-title">Falhas registradas</h2>
        </div>
        <p>${escapeHtml(plural(report.failed, 'falha', 'falhas'))}</p>
      </div>
      ${renderFailures(report.failures)}
    </section>
  </main>
</body>
</html>
`;
}

function renderMetric(label: string, value: number): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
}

function renderStoryGallery(stories: GeneratedStory[]): string {
  if (stories.length === 0) {
    return '<p class="empty">Nenhuma story gerada neste lote.</p>';
  }
  return `<section class="story-grid" aria-label="Stories geradas">${stories.map(renderStoryCard).join('')}</section>`;
}

function renderStoryCard(story: GeneratedStory): string {
  const path = new URL(story.storyUrl).pathname;
  const warnings = story.warnings.map((warning) => warning.code).join(', ') || 'Sem warnings';
  const modified = story.modifiedAt ? formatDate(story.modifiedAt) : 'Sem lastmod';
  return `<article class="story-card">
    <a class="story-link" href="${escapeHtml(path)}" aria-label="Abrir story: ${escapeHtml(story.title)}">
      <img src="${escapeHtml(story.posterPortraitSrc)}" width="640" height="853" loading="lazy" alt="">
      <span class="story-overlay">
        <span class="story-kicker">${escapeHtml(story.variant)}</span>
        <strong>${escapeHtml(story.title)}</strong>
        <span class="story-meta">${escapeHtml(modified)} · ${escapeHtml(warnings)}</span>
      </span>
    </a>
    <a class="source-link" href="${escapeHtml(story.sourceUrl)}">Post original</a>
  </article>`;
}

function renderFailures(failures: GenerationFailure[]): string {
  if (failures.length === 0) {
    return '<p class="empty">Nenhuma falha registrada neste lote.</p>';
  }
  return `<div class="failure-list">${failures.map((failure) => `<article>
    <a href="${escapeHtml(failure.url)}">${escapeHtml(failure.url)}</a>
    <p><strong>${escapeHtml(failure.code)}</strong> · ${escapeHtml(failure.stage)} · ${escapeHtml(failure.reason)}</p>
  </article>`).join('')}</div>`;
}

function formatDuration(durationMs: number): string {
  return durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1).replace(/\.0$/, '')}s`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function plural(count: number, singular: string, pluralValue: string): string {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function indexCss(): string {
  return `:root{--surface:oklch(98% .006 155);--paper:oklch(100% .004 155);--ink:oklch(20% .018 155);--muted:oklch(48% .025 155);--line:oklch(88% .018 155);--accent:oklch(70% .19 152);--accent-ink:oklch(26% .08 152);--danger:oklch(48% .15 28);--shadow:0 18px 50px rgba(18,38,29,.08);--radius:8px;--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-6:24px;--space-8:32px;--space-12:48px;--font-display:"Helvetica Neue","Aptos",sans-serif;--font-body:"Aptos","Helvetica Neue",sans-serif}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,oklch(97% .014 155),var(--surface) 280px);color:var(--ink);font-family:var(--font-body);letter-spacing:0}a{color:var(--accent-ink);text-decoration:none}a:hover{text-decoration:underline}a:focus-visible{outline:3px solid color-mix(in oklch,var(--accent) 55%,white);outline-offset:4px}main{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:40px 0 56px}.masthead{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:var(--space-8);align-items:end;margin-bottom:var(--space-8)}.masthead-copy{max-width:760px}.eyebrow{margin:0 0 var(--space-2);color:var(--accent-ink);font-size:.78rem;font-weight:800;text-transform:uppercase}h1,h2,p{margin:0}h1{font-family:var(--font-display);font-size:clamp(2.2rem,5vw,4.8rem);line-height:.96;font-weight:800;max-width:12ch}h2{font-family:var(--font-display);font-size:1.55rem;line-height:1.1}.lead{max-width:66ch;margin-top:var(--space-6);color:var(--muted);font-size:1.02rem;line-height:1.6}.run-state{display:grid;gap:var(--space-2);justify-items:start;padding:var(--space-4);border:1px solid var(--line);border-radius:var(--radius);background:color-mix(in oklch,var(--paper) 86%,var(--accent) 14%);box-shadow:var(--shadow)}.run-state span,.metric span,.story-kicker,.story-meta,.source-link{color:var(--muted);font-size:.82rem;font-weight:750}.run-state strong{font-size:1.45rem}.metric-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:var(--radius);background:var(--paper);box-shadow:var(--shadow);overflow:hidden}.metric{padding:var(--space-6);border-right:1px solid var(--line)}.metric:last-child{border-right:0}.metric strong{display:block;margin-top:var(--space-2);font-size:2.35rem;line-height:1}.artifact-nav{display:flex;flex-wrap:wrap;gap:var(--space-3);margin:var(--space-6) 0 var(--space-12)}.artifact-nav a{min-height:44px;display:inline-flex;align-items:center;padding:0 var(--space-4);border:1px solid var(--line);border-radius:999px;background:var(--paper);font-weight:800}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-4)}.section-heading>p{color:var(--muted);font-weight:750}.section-heading.compact{margin-top:var(--space-12)}.story-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:var(--space-4)}.story-card{display:grid;gap:var(--space-3)}.story-link{position:relative;display:block;aspect-ratio:9/16;overflow:hidden;border:1px solid color-mix(in oklch,var(--line),black 5%);border-radius:var(--radius);background:oklch(22% .018 155);box-shadow:var(--shadow);text-decoration:none}.story-link:hover{text-decoration:none}.story-link img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.01);transition:transform .45s cubic-bezier(.16,1,.3,1),filter .45s cubic-bezier(.16,1,.3,1)}.story-link:hover img{transform:scale(1.05);filter:saturate(1.05)}.story-overlay{position:absolute;inset:auto 0 0;display:grid;gap:var(--space-2);padding:46% var(--space-4) var(--space-4);background:linear-gradient(180deg,rgba(0,0,0,0),rgba(2,12,8,.84));color:oklch(98% .006 155)}.story-overlay strong{font-family:var(--font-display);font-size:1.14rem;line-height:1.12}.story-kicker,.story-meta{color:oklch(87% .034 155)}.source-link{width:max-content}.empty{padding:var(--space-6);border:1px solid var(--line);border-radius:var(--radius);background:var(--paper);color:var(--muted)}.failure-list{display:grid;gap:var(--space-3)}.failure-list article{padding:var(--space-4);border:1px solid color-mix(in oklch,var(--danger) 34%,white);border-radius:var(--radius);background:color-mix(in oklch,var(--danger) 8%,white)}.failure-list p{margin-top:var(--space-2);color:var(--danger);line-height:1.45}@media(max-width:820px){main{width:min(100% - 24px,680px);padding-top:28px}.masthead{grid-template-columns:1fr}.metric-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.metric:nth-child(2){border-right:0}.metric:nth-child(-n+2){border-bottom:1px solid var(--line)}h1{max-width:14ch}}@media(max-width:420px){.metric-strip{grid-template-columns:1fr}.metric{border-right:0;border-bottom:1px solid var(--line)}.metric:last-child{border-bottom:0}.artifact-nav a{width:100%;justify-content:center}.section-heading{display:block}.section-heading>p{margin-top:var(--space-2)}}@media(prefers-reduced-motion:reduce){.story-link img{transition:none}.story-link:hover img{transform:none}}`;
}
