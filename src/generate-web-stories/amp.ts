import { escapeHtml } from './text.js';
import { renderAmpAttributes, storyMotionForIntent, type AmpMotionAttributes } from './motion.js';
import type { StoryMedia, StoryModel, StoryPage } from './types.js';

export function renderAmpStoryHtml(story: StoryModel): string {
  const jsonLd = JSON.stringify(createStructuredData(story)).replace(/</g, '\\u003c');
  const videoScript = hasVideo(story)
    ? '<script async custom-element="amp-video" src="https://cdn.ampproject.org/v0/amp-video-0.1.js"></script>'
    : '';

  return `<!doctype html>
<html amp lang="pt-BR">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
  ${videoScript}
  <title>${escapeHtml(story.title)}</title>
  <link rel="icon" href="${escapeHtml(story.logoSrc)}">
  <link rel="canonical" href="${escapeHtml(story.canonicalUrl)}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="${escapeHtml(story.description)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(story.title)}">
  <meta property="og:description" content="${escapeHtml(story.description)}">
  <meta property="og:url" content="${escapeHtml(story.canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(story.posterPortraitSrc)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(story.title)}">
  <meta name="twitter:description" content="${escapeHtml(story.description)}">
  <meta name="twitter:image" content="${escapeHtml(story.posterPortraitSrc)}">
  <meta name="amp-story-generator-name" content="Sitemap Web Stories Generator">
  <meta name="amp-story-generator-version" content="0.1.0">
  <script type="application/ld+json">${jsonLd}</script>
  ${ampBoilerplate()}
  <style amp-custom>${css()}</style>
</head>
<body>
  <amp-story standalone
    title="${escapeHtml(story.title)}"
    publisher="${escapeHtml(story.publisher)}"
    publisher-logo-src="${escapeHtml(story.logoSrc)}"
    poster-portrait-src="${escapeHtml(story.posterPortraitSrc)}"
    supports-landscape>
${story.pages.map((page, index) => renderPage(story, page, index)).join('\n')}
  </amp-story>
</body>
</html>
`;
}

function renderPage(story: StoryModel, page: StoryPage, index: number): string {
  const titleTag = index === 0 ? 'h1' : 'h2';
  const motion = storyMotionForIntent(page.motion);
  const cta = index === story.pages.length - 1
    ? `<a class="cta" href="${escapeHtml(story.sourceUrl)}" target="_blank" rel="noopener" ${renderAmpAttributes(motion.cta)}>Ler artigo</a>`
    : '';

  return `    <amp-story-page id="${escapeHtml(page.id)}">
      <amp-story-grid-layer template="fill">
${renderMedia(story, page.media, motion.media)}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill"><div class="shade"></div></amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="brand">
        <amp-img class="logo" src="${escapeHtml(story.logoSrc)}" width="48" height="48" layout="fixed" alt="${escapeHtml(story.publisher)}"></amp-img>
      </amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="content">
        <${titleTag} ${renderAmpAttributes(motion.heading)}>${escapeHtml(page.heading)}</${titleTag}>
        <p ${renderAmpAttributes(motion.text)}>${escapeHtml(page.text)}</p>
        ${cta}
      </amp-story-grid-layer>
    </amp-story-page>`;
}

function renderMedia(story: StoryModel, media: StoryMedia, motion: AmpMotionAttributes): string {
  const animationAttrs = renderAmpAttributes(motion);
  if (media.kind === 'video') {
    return `        <amp-video autoplay loop layout="fill" poster="${escapeHtml(media.posterSrc)}" ${animationAttrs}>
          <source src="${escapeHtml(media.src)}" type="${escapeHtml(media.mimeType)}">
        </amp-video>`;
  }

  return `        <amp-img class="hero-image" src="${escapeHtml(media.src)}" layout="fill" alt="${escapeHtml(story.title)}" ${animationAttrs}></amp-img>`;
}

function createStructuredData(story: StoryModel): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: story.title,
    description: story.description,
    image: [story.posterPortraitSrc],
    mainEntityOfPage: { '@type': 'WebPage', '@id': story.canonicalUrl },
    publisher: { '@type': 'Organization', name: story.publisher, logo: { '@type': 'ImageObject', url: story.logoSrc } },
    dateModified: story.modifiedAt
  };
}

function hasVideo(story: StoryModel): boolean {
  return story.pages.some((page) => page.media.kind === 'video');
}

function ampBoilerplate(): string {
  return '<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>';
}

function css(): string {
  return `amp-story{font-family:"Avenir Next","Segoe UI",sans-serif;color:#f7f1e8}amp-story-page{background:#101214}.hero-image img{object-fit:cover}.shade{background:linear-gradient(180deg,rgba(16,18,20,.06),rgba(16,18,20,.42) 42%,rgba(16,18,20,.92))}.content{align-content:end;padding:32px 28px 42px}.brand{align-content:start;padding:24px}.logo{border-radius:50%;background:#f7f1e8}h1,h2,p{margin:0;text-shadow:0 2px 18px rgba(0,0,0,.5)}h1,h2{font-family:Georgia,Cambria,serif;font-weight:700}h1{font-size:36px;line-height:1.06}h2{font-size:31px;line-height:1.1}p{max-width:15em;margin-top:16px;font-size:18px;line-height:1.38;font-weight:650}.cta{display:inline-block;margin-top:24px;padding:12px 18px;border-radius:5px;background:#f7f1e8;color:#101214;font-size:16px;font-weight:800;text-decoration:none;text-shadow:none}`;
}
