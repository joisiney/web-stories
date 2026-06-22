import { ensureTrailingSlash, truncateText } from './text.js';
import type { StoryMedia, StoryModel, StoryQualityIssue, StoryVariant } from './types.js';

export interface ResolveStoryMediaInput {
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  videoPosterUrl?: string;
}

export interface ComposeStoryInput {
  sourceUrl: string;
  slug: string;
  title: string;
  description: string;
  publisher: string;
  logoSrc: string;
  posterPortraitSrc: string;
  publicBaseUrl: string;
  media: StoryMedia[];
  modifiedAt?: string;
}

const TITLE_LIMIT = 90;
const DESCRIPTION_LIMIT = 180;
const PAGE_TEXT_LIMIT = 170;
const TEXT_HEAVY_LIMIT = 1600;
const IMAGE_AUTO_ADVANCE = '7s';
const VIDEO_AUTO_ADVANCE_ID = 'video-media';

export function resolveStoryMedia(input: ResolveStoryMediaInput): { media: StoryMedia[]; warnings: StoryQualityIssue[] } {
  const media: StoryMedia[] = [];
  const warnings: StoryQualityIssue[] = [];
  const video = directVideo(input.videoUrl, input.videoPosterUrl);

  if (video) {
    media.push(video);
  } else if (input.videoUrl) {
    warnings.push({
      code: 'unsupported-video',
      message: 'Vídeo ignorado porque não é uma URL direta suportada por amp-video.'
    });
  }

  for (const imageUrl of unique([...(input.imageUrls ?? []), input.imageUrl])) {
    media.push({ kind: 'image', src: imageUrl });
  }

  return { media, warnings };
}

export function composeStory(input: ComposeStoryInput): StoryModel {
  if (input.description.length > TEXT_HEAVY_LIMIT) {
    throw new Error('Text-heavy Web Story rejected before rendering');
  }

  const title = truncateText(input.title, TITLE_LIMIT);
  const description = truncateText(input.description || input.title, DESCRIPTION_LIMIT);
  const heroImage = input.media.find((media) => media.kind === 'image')?.src ?? input.posterPortraitSrc;
  const variant = selectVariant(input.media);

  return {
    slug: input.slug,
    sourceUrl: input.sourceUrl,
    canonicalUrl: ensureTrailingSlash(`${input.publicBaseUrl.replace(/\/+$/, '')}/stories/${input.slug}`),
    title,
    description,
    publisher: input.publisher,
    logoSrc: input.logoSrc,
    posterPortraitSrc: input.posterPortraitSrc,
    heroImageSrc: heroImage,
    variant,
    modifiedAt: input.modifiedAt,
    pages: createPages(title, description, input.media, heroImage)
  };
}

function createPages(title: string, description: string, media: StoryMedia[], heroImage: string): StoryModel['pages'] {
  const imageMedia = media.filter((item) => item.kind === 'image');
  const fallbackImage = imageMedia[0] ?? { kind: 'image' as const, src: heroImage };
  const videoMedia = media.find((item) => item.kind === 'video');
  const copy = storyCopy(title, description);
  const narrativePages = [
    { id: 'cover', layout: 'cover' as const, heading: title, text: copy.coverText, motion: 'cover' as const, media: imageForPage(imageMedia, 0, fallbackImage) },
    { id: 'point', layout: 'point' as const, heading: 'Ponto central', text: copy.pointText, motion: 'point' as const, media: imageForPage(imageMedia, 1, fallbackImage) },
    { id: 'context', layout: 'context' as const, heading: 'Contexto', text: copy.contextText, motion: 'context' as const, media: imageForPage(imageMedia, 2, fallbackImage) },
    { id: 'detail', layout: 'detail' as const, heading: 'Na prática', text: copy.detailText, motion: 'detail' as const, media: imageForPage(imageMedia, 3, fallbackImage) },
    { id: 'decision', layout: 'decision' as const, heading: 'Antes de decidir', text: copy.decisionText, motion: 'decision' as const, media: imageForPage(imageMedia, 4, fallbackImage) }
  ].map((page) => ({ ...page, autoAdvanceAfter: IMAGE_AUTO_ADVANCE }));

  if (videoMedia) {
    return [
      { id: 'video', layout: 'cover' as const, heading: title, text: copy.coverText, autoAdvanceAfter: VIDEO_AUTO_ADVANCE_ID, motion: 'video' as const, media: videoMedia },
      ...narrativePages.slice(1),
      { id: 'cta', layout: 'cta' as const, heading: 'Continue lendo', text: copy.ctaText, motion: 'cta' as const, media: fallbackImage }
    ];
  }

  return [
    ...narrativePages,
    { id: 'cta', layout: 'cta' as const, heading: 'Continue lendo', text: copy.ctaText, motion: 'cta' as const, media: fallbackImage }
  ];
}

function storyCopy(title: string, description: string): {
  coverText: string;
  pointText: string;
  contextText: string;
  detailText: string;
  decisionText: string;
  ctaText: string;
} {
  const sentences = description.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const fallback = description || title;
  const sentence = (index: number, fallbackText: string): string => truncateText(sentences[index] ?? fallbackText, PAGE_TEXT_LIMIT);

  return {
    coverText: sentence(0, fallback),
    pointText: sentence(1, `O ponto principal é entender como ${title} se aplica ao contexto do artigo.`),
    contextText: sentence(2, `A leitura organiza os critérios essenciais antes de seguir para a decisão.`),
    detailText: sentence(3, `Use os detalhes do post original para comparar requisitos, custos e próximos passos.`),
    decisionText: sentence(4, `Confira o contexto completo antes de escolher o melhor caminho para o seu caso.`),
    ctaText: 'Abra o artigo original para conferir detalhes, fontes e contexto completo.'
  };
}

function selectVariant(media: StoryMedia[]): StoryVariant {
  const imageCount = media.filter((item) => item.kind === 'image').length;
  const hasImage = imageCount > 0;
  const hasVideo = media.some((item) => item.kind === 'video');
  if (hasImage && hasVideo) {
    return 'mixed-media';
  }
  if (hasVideo) {
    return 'video-first';
  }
  if (imageCount > 1) {
    return 'multi-image-summary';
  }
  return hasImage ? 'image-summary' : 'fallback-summary';
}

function imageForPage(images: StoryMedia[], index: number, fallback: StoryMedia): StoryMedia {
  return images[index % Math.max(images.length, 1)] ?? fallback;
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function directVideo(videoUrl?: string, posterUrl?: string): StoryMedia | undefined {
  if (!videoUrl || !posterUrl) {
    return undefined;
  }

  const pathname = urlPathname(videoUrl);
  if (pathname.endsWith('.mp4')) {
    return { kind: 'video', src: videoUrl, posterSrc: posterUrl, mimeType: 'video/mp4' };
  }

  if (pathname.endsWith('.webm')) {
    return { kind: 'video', src: videoUrl, posterSrc: posterUrl, mimeType: 'video/webm' };
  }

  return undefined;
}

function urlPathname(value: string): string {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}
