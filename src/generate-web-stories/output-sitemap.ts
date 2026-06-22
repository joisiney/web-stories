import { escapeXml } from './text.js';
import type { GeneratedStory } from './types.js';

export function renderStoriesSitemap(stories: GeneratedStory[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${stories.map(renderSitemapUrl).join('\n')}
</urlset>
`;
}

export function renderSitemapXsl(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="icon" href="/assets/shared/publisher-logo.png"/>
        <title>Web Stories Sitemap</title>
        <style>
          :root{--surface:#f5fbf7;--paper:#ffffff;--ink:#17211b;--muted:#68756d;--line:#dce8df;--accent:#00e676;--accent-dark:#08783d;--radius:8px}
          *{box-sizing:border-box}
          body{margin:0;background:var(--surface);color:var(--ink);font-family:"Helvetica Neue","Aptos",sans-serif;letter-spacing:0}
          main{width:min(1280px,calc(100% - 48px));margin:0 auto;padding:36px 0 56px}
          header{padding:36px 32px;border-radius:var(--radius);background:linear-gradient(135deg,var(--accent),#02c96d);box-shadow:0 20px 60px rgba(10,64,35,.14)}
          h1,p{margin:0}
          h1{font-size:42px;line-height:1;font-weight:850}
          header p{margin-top:12px;font-size:18px}
          .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:28px 0}
          .metric{padding:22px;border:1px solid var(--line);border-radius:var(--radius);background:var(--paper)}
          .metric span{display:block;color:var(--muted);font-weight:750}
          .metric strong{display:block;margin-top:8px;color:var(--accent-dark);font-size:34px}
          h2{margin:0 0 12px;font-size:28px}
          .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--paper)}
          table{width:100%;border-collapse:collapse;min-width:820px}
          th,td{padding:16px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
          th{background:var(--accent);color:var(--ink);font-size:14px}
          td{font-size:15px}
          a{color:var(--ink);font-weight:760;text-decoration:none}
          a:hover{text-decoration:underline}
          a:focus-visible{outline:3px solid rgba(0,230,118,.45);outline-offset:3px}
          .muted{color:var(--muted)}
          @media(max-width:720px){main{width:min(100% - 24px,640px);padding-top:20px}header{padding:28px 20px}h1{font-size:32px}.metrics{grid-template-columns:1fr}}
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>Web Stories Sitemap</h1>
            <p>Sitemap XML das Web Stories geradas a partir do sitemap WordPress.</p>
          </header>
          <section class="metrics" aria-label="Resumo">
            <div class="metric"><span>URLs encontradas</span><strong><xsl:value-of select="count(sm:urlset/sm:url)"/></strong></div>
            <div class="metric"><span>Formato</span><strong>XML</strong></div>
            <div class="metric"><span>Tipo</span><strong>Stories</strong></div>
          </section>
          <section>
            <h2>Sitemap URLs</h2>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>URL</th><th>Last Modified</th></tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sm:urlset/sm:url">
                    <tr>
                      <td><a><xsl:attribute name="href"><xsl:value-of select="sm:loc"/></xsl:attribute><xsl:value-of select="sm:loc"/></a></td>
                      <td class="muted"><xsl:value-of select="sm:lastmod"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`;
}

function renderSitemapUrl(story: GeneratedStory): string {
  const lastmod = story.modifiedAt ? `\n    <lastmod>${escapeXml(story.modifiedAt)}</lastmod>` : '';
  return `  <url>
    <loc>${escapeXml(story.storyUrl)}</loc>${lastmod}
  </url>`;
}
