export type StoryVariant = 'image-summary' | 'video-first' | 'mixed-media' | 'fallback-summary';

export type StoryMotionIntent = 'cover' | 'context' | 'cta' | 'video';

export interface StoryQualityIssue {
  code: string;
  message: string;
}

export type StoryMedia =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string; posterSrc: string; mimeType: 'video/mp4' | 'video/webm' };

export interface StoryPage {
  id: string;
  heading: string;
  text: string;
  autoAdvanceAfter?: string;
  motion: StoryMotionIntent;
  media: StoryMedia;
}

export interface StoryModel {
  slug: string;
  sourceUrl: string;
  canonicalUrl: string;
  title: string;
  description: string;
  publisher: string;
  logoSrc: string;
  posterPortraitSrc: string;
  heroImageSrc: string;
  variant: StoryVariant;
  modifiedAt?: string;
  pages: StoryPage[];
}

export interface GeneratedStory {
  sourceUrl: string;
  storyUrl: string;
  outputPath: string;
  title: string;
  posterPortraitSrc: string;
  modifiedAt?: string;
  variant: StoryVariant;
  warnings: StoryQualityIssue[];
}

export interface GenerationFailure {
  url: string;
  code: 'missing-supported-media' | 'metadata-failed' | 'asset-failed' | 'render-failed' | 'unknown';
  stage: 'metadata' | 'media' | 'assets' | 'render';
  reason: string;
}

export interface GenerationReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  sitemapUrls: number;
  processed: number;
  limit?: number;
  limitApplied: boolean;
  total: number;
  succeeded: number;
  failed: number;
  outputDir: string;
  stories: GeneratedStory[];
  failures: GenerationFailure[];
}
