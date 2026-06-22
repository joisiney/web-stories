import { escapeHtml } from './text.js';
import { ampStoryCss } from './amp-css.js';
import { renderAmpAttributes, storyMotionForIntent, type AmpMotionAttributes } from './motion.js';
import type { StoryMedia, StoryModel, StoryPage, StoryPageLayout } from './types.js';

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
  <style amp-custom>${ampStoryCss()}</style>
</head>
<body>
  <amp-story standalone
    title="${escapeHtml(story.title)}"
    publisher="${escapeHtml(story.publisher)}"
    publisher-logo-src="${escapeHtml(story.logoSrc)}"
    poster-portrait-src="${escapeHtml(story.posterPortraitSrc)}">
${story.pages.map((page, index) => renderPage(story, page, index)).join('\n')}
  </amp-story>
</body>
</html>
`;
}

function renderPage(story: StoryModel, page: StoryPage, index: number): string {
  const titleTag = index === 0 ? 'h1' : 'h2';
  const motion = storyMotionForIntent(page.motion);
  const pageAttributes = [
    `id="${escapeHtml(page.id)}"`,
    page.autoAdvanceAfter ? `auto-advance-after="${escapeHtml(page.autoAdvanceAfter)}"` : ''
  ].filter(Boolean).join(' ');
  const layout = pageLayout(page);
  const trailingElements = [
    renderDecisionAnimation(page),
    renderPageOutlink(story, page, index)
  ].filter(Boolean).join('\n');

  return `    <amp-story-page ${pageAttributes}>
      <amp-story-grid-layer template="fill">
${renderMedia(story, page, motion.media)}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill"><div class="shade"></div></amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="brand">
        <amp-img class="logo" src="${escapeHtml(story.logoSrc)}" width="48" height="48" layout="fixed" alt="${escapeHtml(story.publisher)}"></amp-img>
      </amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="content content--${escapeHtml(layout)}">
        <${titleTag} ${renderAmpAttributes(motion.heading)}>${escapeHtml(page.heading)}</${titleTag}>
        ${renderPageText(page, motion.text)}
      </amp-story-grid-layer>
${trailingElements}
    </amp-story-page>`;
}

function renderPageText(page: StoryPage, motion: AmpMotionAttributes): string {
  if (pageLayout(page) !== 'decision') {
    return `<p ${renderAmpAttributes(motion)}>${escapeHtml(page.text)}</p>`;
  }

  return `<div class="decision-callout" ${renderAmpAttributes(motion)}>
          <span class="decision-chip">Ponto de decisão</span>
          <span id="${escapeHtml(decisionLineId(page))}" class="decision-callout-line"></span>
          <p>${escapeHtml(page.text)}</p>
        </div>`;
}

function renderDecisionAnimation(page: StoryPage): string {
  if (pageLayout(page) !== 'decision') {
    return '';
  }

  const config = JSON.stringify({
    selector: `#${decisionLineId(page)}`,
    duration: '650ms',
    delay: '180ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: 'both',
    keyframes: [
      { transform: 'scaleX(0)', opacity: 0 },
      { transform: 'scaleX(1)', opacity: 1 }
    ]
  }).replace(/</g, '\\u003c');

  return `      <amp-story-animation layout="nodisplay" trigger="visibility">
        <script type="application/json">${config}</script>
      </amp-story-animation>`;
}

function renderPageOutlink(story: StoryModel, page: StoryPage, index: number): string {
  if (index !== story.pages.length - 1 || pageLayout(page) !== 'cta') {
    return '';
  }

  return `      <amp-story-page-outlink layout="nodisplay" theme="custom" cta-accent-element="background" cta-accent-color="#f8f3ea">
        <a href="${escapeHtml(story.sourceUrl)}">Ler artigo</a>
      </amp-story-page-outlink>`;
}

function pageLayout(page: StoryPage): StoryPageLayout {
  return page.layout ?? (page.id === 'video' ? 'cover' : page.id as StoryPageLayout);
}

function decisionLineId(page: StoryPage): string {
  return `decision-callout-line-${page.id.replace(/[^a-z0-9_-]/gi, '-')}`;
}

function renderMedia(story: StoryModel, page: StoryPage, motion: AmpMotionAttributes): string {
  const media = page.media;
  const animationAttrs = renderAmpAttributes(motion);
  if (media.kind === 'video') {
    return `        <amp-video id="${escapeHtml(videoElementId(page))}" autoplay layout="fill" poster="${escapeHtml(media.posterSrc)}" ${animationAttrs}>
          <source src="${escapeHtml(media.src)}" type="${escapeHtml(media.mimeType)}">
        </amp-video>`;
  }

  return `        <amp-img class="hero-image" src="${escapeHtml(media.src)}" layout="fill" alt="${escapeHtml(story.title)}" ${animationAttrs}></amp-img>`;
}

function videoElementId(page: StoryPage): string {
  return page.autoAdvanceAfter && !page.autoAdvanceAfter.endsWith('s') ? page.autoAdvanceAfter : `${page.id}-media`;
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
