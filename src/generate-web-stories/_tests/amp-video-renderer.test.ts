import { describe, expect, it } from 'vitest';
import amphtmlValidator from 'amphtml-validator';
import { renderAmpStoryHtml } from '../amp.js';

describe('renderAmpStoryHtml video support', () => {
  it('renderiza página de vídeo com amp-video, poster e source direto', () => {
    const html = renderAmpStoryHtml({
      slug: 'post-video',
      sourceUrl: 'https://blog.example.com/post-video/',
      canonicalUrl: 'https://stories.example.com/stories/post-video/',
      title: 'Post com vídeo',
      description: 'Resumo curto.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://cdn.example.com/cover.webp',
      variant: 'video-first',
      pages: [
        {
          id: 'video',
          heading: 'Post com vídeo',
          text: 'Resumo curto.',
          motion: 'video',
          media: {
            kind: 'video',
            src: 'https://cdn.example.com/highlight.mp4',
            posterSrc: 'https://stories.example.com/assets/poster.jpg',
            mimeType: 'video/mp4'
          }
        }
      ]
    });

    expect(html).toContain('custom-element="amp-video"');
    expect(html).toContain('<amp-video autoplay loop');
    expect(html).toContain('poster="https://stories.example.com/assets/poster.jpg"');
    expect(html).toContain('<source src="https://cdn.example.com/highlight.mp4" type="video/mp4">');
    expect(html).toContain('animate-in-timing-function="cubic-bezier(0.16, 1, 0.3, 1)"');
  });

  it('gera AMP válido para story de vídeo direto', async () => {
    const html = renderAmpStoryHtml({
      slug: 'post-video',
      sourceUrl: 'https://blog.example.com/post-video/',
      canonicalUrl: 'https://stories.example.com/stories/post-video/',
      title: 'Post com vídeo',
      description: 'Resumo curto.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      heroImageSrc: 'https://stories.example.com/assets/poster.jpg',
      variant: 'video-first',
      pages: [
        {
          id: 'video',
          heading: 'Post com vídeo',
          text: 'Resumo curto.',
          motion: 'video',
          media: {
            kind: 'video',
            src: 'https://cdn.example.com/highlight.mp4',
            posterSrc: 'https://stories.example.com/assets/poster.jpg',
            mimeType: 'video/mp4'
          }
        },
        {
          id: 'cta',
          heading: 'Continue lendo',
          text: 'Acesse o artigo completo.',
          motion: 'cta',
          media: { kind: 'image', src: 'https://stories.example.com/assets/poster.jpg' }
        }
      ]
    });

    const validator = await amphtmlValidator.getInstance();
    expect(validator.validateString(html).status).toBe('PASS');
  }, 10000);
});
