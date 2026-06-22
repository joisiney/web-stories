import { ensureTrailingSlash, truncateText } from './text.js';
import type { StoryMedia, StoryModel, StoryQualityIssue, StoryVariant } from './types.js';

export interface ResolveStoryMediaInput {
  imageUrl?: string;
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
const PAGE_TEXT_LIMIT = 180;
const TEXT_HEAVY_LIMIT = 1600;

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

  if (input.imageUrl) {
    media.push({ kind: 'image', src: input.imageUrl });
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
  const imageMedia = media.find((item) => item.kind === 'image') ?? { kind: 'image' as const, src: heroImage };
  const videoMedia = media.find((item) => item.kind === 'video');
  const copy = storyCopy(description);

  if (videoMedia) {
    return [
      { id: 'video', heading: title, text: copy.coverText, motion: 'video', media: videoMedia },
      { id: 'context', heading: 'Resumo', text: copy.summaryText, motion: 'context', media: imageMedia },
      { id: 'cta', heading: 'Continue lendo', text: copy.ctaText, motion: 'cta', media: imageMedia }
    ];
  }

  return [
    { id: 'cover', heading: title, text: copy.coverText, motion: 'cover', media: imageMedia },
    { id: 'summary', heading: 'Resumo', text: copy.summaryText, motion: 'context', media: imageMedia },
    { id: 'cta', heading: 'Continue lendo', text: copy.ctaText, motion: 'cta', media: imageMedia }
  ];
}

function storyCopy(description: string): { coverText: string; summaryText: string; ctaText: string } {
  const sentences = description.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const firstSentence = sentences[0] ?? description;
  const remainingText = sentences.slice(1).join(' ');
  return {
    coverText: truncateText(firstSentence, 160),
    summaryText: truncateText(remainingText || description, PAGE_TEXT_LIMIT),
    ctaText: 'Veja o artigo completo para conferir detalhes e contexto.'
  };
}

function selectVariant(media: StoryMedia[]): StoryVariant {
  const hasImage = media.some((item) => item.kind === 'image');
  const hasVideo = media.some((item) => item.kind === 'video');
  if (hasImage && hasVideo) {
    return 'mixed-media';
  }
  if (hasVideo) {
    return 'video-first';
  }
  return hasImage ? 'image-summary' : 'fallback-summary';
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
