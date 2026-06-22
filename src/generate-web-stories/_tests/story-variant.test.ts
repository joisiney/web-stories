import { describe, expect, it } from 'vitest';
import { composeStory, resolveStoryMedia } from '../story.js';

describe('generate-web-stories story variants', () => {
  it('gera variante mista quando existem imagem e vídeo direto suportado', () => {
    const media = resolveStoryMedia({
      imageUrl: 'https://cdn.example.com/cover.webp',
      videoUrl: 'https://cdn.example.com/highlight.mp4',
      videoPosterUrl: 'https://cdn.example.com/highlight-poster.jpg'
    });

    const story = composeStory({
      sourceUrl: 'https://blog.example.com/post/',
      slug: 'post',
      title: 'Post com vídeo',
      description: 'Resumo curto com contexto suficiente para a história.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      publicBaseUrl: 'https://stories.example.com',
      media: media.media
    });

    expect(media.warnings).toEqual([]);
    expect(story.variant).toBe('mixed-media');
    expect(story.pages.some((page) => page.media.kind === 'video')).toBe(true);
    expect(story.pages.some((page) => page.media.kind === 'image')).toBe(true);
  });

  it('cai para imagem e registra warning quando o vídeo não é URL direta suportada', () => {
    const media = resolveStoryMedia({
      imageUrl: 'https://cdn.example.com/cover.webp',
      videoUrl: 'https://youtube.com/watch?v=abc',
      videoPosterUrl: 'https://cdn.example.com/poster.jpg'
    });

    expect(media.media).toEqual([{ kind: 'image', src: 'https://cdn.example.com/cover.webp' }]);
    expect(media.warnings).toEqual([
      {
        code: 'unsupported-video',
        message: 'Vídeo ignorado porque não é uma URL direta suportada por amp-video.'
      }
    ]);
  });

  it('rejeita conteúdo text-heavy antes de renderizar a Web Story', () => {
    const longDescription = Array.from({ length: 90 }, () => 'parágrafo explicativo extenso').join(' ');

    expect(() => composeStory({
      sourceUrl: 'https://blog.example.com/post/',
      slug: 'post',
      title: 'Post longo',
      description: longDescription,
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      publicBaseUrl: 'https://stories.example.com',
      media: [{ kind: 'image', src: 'https://cdn.example.com/cover.webp' }]
    })).toThrow(/text-heavy/i);
  });

  it('distribui descrição com duas frases entre capa e resumo sem repetir texto', () => {
    const story = composeStory({
      sourceUrl: 'https://blog.example.com/post/',
      slug: 'post',
      title: 'Post com resumo',
      description: 'Primeira frase curta. Segunda frase com contexto adicional.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      publicBaseUrl: 'https://stories.example.com',
      media: [{ kind: 'image', src: 'https://stories.example.com/assets/post/story-image.jpg' }]
    });

    expect(story.pages[0]?.text).toBe('Primeira frase curta.');
    expect(story.pages[1]?.text).toBe('Segunda frase com contexto adicional.');
    expect(story.pages[2]?.text).toBe('Veja o artigo completo para conferir detalhes e contexto.');
  });

  it('mantém texto de resumo válido quando a descrição tem uma única frase', () => {
    const story = composeStory({
      sourceUrl: 'https://blog.example.com/post/',
      slug: 'post',
      title: 'Post com frase única',
      description: 'Descrição única e curta.',
      publisher: 'Example',
      logoSrc: 'https://stories.example.com/assets/logo.png',
      posterPortraitSrc: 'https://stories.example.com/assets/poster.jpg',
      publicBaseUrl: 'https://stories.example.com',
      media: [{ kind: 'image', src: 'https://stories.example.com/assets/post/story-image.jpg' }]
    });

    expect(story.pages[0]?.text).toBe('Descrição única e curta.');
    expect(story.pages[1]?.text).toBe('Descrição única e curta.');
    expect(story.pages.every((page) => page.text.length > 0)).toBe(true);
  });
});
