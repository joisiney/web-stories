import { describe, expect, it } from 'vitest';
import amphtmlValidator from 'amphtml-validator';
import { renderAmpStoryHtml } from '../amp.js';

describe('renderAmpStoryHtml', () => {
  it('renderiza HTML AMP com metadados obrigatórios, canonical e JSON-LD', () => {
    const html = renderAmpStoryHtml({
      slug: 'post-a',
      sourceUrl: 'https://blog.example.com/post-a/',
      canonicalUrl: 'https://stories.example.com/stories/post-a/',
      title: 'Post A',
      description: 'Resumo curto do post A.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://cdn.example.com/a.webp',
      variant: 'image-summary',
      modifiedAt: '2026-06-19T05:13:04-03:00',
      pages: [{
        id: 'cover',
        heading: 'Post A',
        text: 'Resumo curto.',
        autoAdvanceAfter: '7s',
        motion: 'cover',
        media: { kind: 'image', src: 'https://cdn.example.com/a.webp' }
      }]
    });

    expect(html).toContain('<html amp lang="pt-BR">');
    expect(html).toContain('<amp-story');
    expect(html).toContain('publisher-logo-src="https://stories.example.com/assets/logo.png"');
    expect(html).toContain('poster-portrait-src="https://stories.example.com/assets/poster.jpg"');
    expect(html).toContain('<link rel="icon" href="https://stories.example.com/assets/logo.png">');
    expect(html).toContain('<link rel="canonical" href="https://stories.example.com/stories/post-a/">');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('animate-in="zoom-in"');
    expect(html).toContain('<amp-story-page id="cover" auto-advance-after="7s">');
    expect(html).toContain('animate-in-timing-function="cubic-bezier(0.22, 1, 0.36, 1)"');
    expect(html).toContain('animate-in-delay=".55s"');
    expect(html).not.toContain('<img ');
  });

  it('escapa conteúdo dinâmico antes de renderizar', () => {
    const html = renderAmpStoryHtml({
      slug: 'post-x',
      sourceUrl: 'https://blog.example.com/post-x/',
      canonicalUrl: 'https://stories.example.com/stories/post-x/',
      title: '<script>alert(1)</script>',
      description: 'Resumo & detalhes',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://cdn.example.com/x.webp',
      variant: 'image-summary',
      pages: [{
        id: 'cover',
        heading: '<b>Oi</b>',
        text: 'Texto & valor',
        autoAdvanceAfter: '7s',
        motion: 'cover',
        media: { kind: 'image', src: 'https://cdn.example.com/x.webp' }
      }]
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Texto &amp; valor');
  });

  it('mantém CSS AMP enxuto sem animação de layout', () => {
    const html = renderAmpStoryHtml({
      slug: 'post-a',
      sourceUrl: 'https://blog.example.com/post-a/',
      canonicalUrl: 'https://stories.example.com/stories/post-a/',
      title: 'Post A',
      description: 'Resumo curto do post A.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://cdn.example.com/a.webp',
      variant: 'image-summary',
      pages: [{
        id: 'cover',
        heading: 'Post A',
        text: 'Resumo curto.',
        autoAdvanceAfter: '7s',
        motion: 'cover',
        media: { kind: 'image', src: 'https://cdn.example.com/a.webp' }
      }]
    });
    const css = html.match(/<style amp-custom>(?<css>.*?)<\/style>/s)?.groups?.css ?? '';

    expect(css.length).toBeLessThan(75000);
    expect(css).not.toMatch(/@keyframes[\s\S]*\b(width|height|padding|margin|top|left|right|bottom)\b/);
    expect(css).not.toContain('!important');
  });

  it('inclui CSS defensivo para títulos e textos longos', () => {
    const html = renderAmpStoryHtml({
      slug: 'post-longo',
      sourceUrl: 'https://blog.example.com/post-longo/',
      canonicalUrl: 'https://stories.example.com/stories/post-longo/',
      title: 'Superpalavraeditorialsemquebranaturalparaavaliarrobustezvisual',
      description: 'Resumo curto do post longo.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://cdn.example.com/longo.webp',
      variant: 'image-summary',
      pages: [{
        id: 'cover',
        heading: 'Superpalavraeditorialsemquebranaturalparaavaliarrobustezvisual',
        text: 'Texto com outra palavraextremamentelongaqueprecisaquebrardentrodocontainer.',
        autoAdvanceAfter: '7s',
        motion: 'cover',
        media: { kind: 'image', src: 'https://cdn.example.com/longo.webp' }
      }]
    });
    const css = html.match(/<style amp-custom>(?<css>.*?)<\/style>/s)?.groups?.css ?? '';

    expect(css).toContain('overflow-wrap:anywhere');
    expect(css).toContain('word-break:break-word');
    expect(css).toContain('max-width:100%');
    expect(html).toContain('Superpalavraeditorialsemquebranaturalparaavaliarrobustezvisual');
  });

  it('renderiza story multi-imagem com layouts editoriais e callout AMP animado', async () => {
    const html = renderAmpStoryHtml({
      slug: 'post-editorial',
      sourceUrl: 'https://blog.example.com/stories/post-editorial/',
      canonicalUrl: 'https://stories.example.com/stories/post-editorial/',
      title: 'Post editorial',
      description: 'Resumo curto.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://stories.example.com/assets/post/story-image.jpg',
      variant: 'multi-image-summary',
      pages: [
        {
          id: 'cover',
          heading: 'Post editorial',
          text: 'Abertura.',
          autoAdvanceAfter: '7s',
          motion: 'cover',
          layout: 'cover',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image.jpg' }
        },
        {
          id: 'point',
          heading: 'Ponto central',
          text: 'Ponto principal.',
          autoAdvanceAfter: '7s',
          motion: 'point',
          layout: 'point',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image-2.jpg' }
        },
        {
          id: 'context',
          heading: 'Contexto',
          text: 'Contexto curto.',
          autoAdvanceAfter: '7s',
          motion: 'context',
          layout: 'context',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image-3.jpg' }
        },
        {
          id: 'detail',
          heading: 'Na prática',
          text: 'Detalhe prático.',
          autoAdvanceAfter: '7s',
          motion: 'detail',
          layout: 'detail',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image.jpg' }
        },
        {
          id: 'decision',
          heading: 'Antes de decidir',
          text: 'Decisão com contexto.',
          autoAdvanceAfter: '7s',
          motion: 'decision',
          layout: 'decision',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image-2.jpg' }
        },
        {
          id: 'cta',
          heading: 'Continue lendo',
          text: 'Abra o artigo original.',
          motion: 'cta',
          layout: 'cta',
          media: { kind: 'image', src: 'https://stories.example.com/assets/post/story-image.jpg' }
        }
      ]
    } as Parameters<typeof renderAmpStoryHtml>[0]);

    expect(html).toContain('class="content content--point"');
    expect(html).toContain('https://stories.example.com/assets/post/story-image-2.jpg');
    expect(html).toContain('animate-in="pan-right"');
    expect(html).toContain('<amp-story-animation layout="nodisplay" trigger="visibility">');
    expect(html).toContain('decision-callout-line');
    expect(html).toContain('<amp-story-page id="cta">');
    expect(html).not.toContain('<amp-story-page id="cta" auto-advance-after');

    const validator = await amphtmlValidator.getInstance();
    expect(validator.validateString(html).status).toBe('PASS');
  }, 10000);
});
