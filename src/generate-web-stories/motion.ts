import type { StoryMotionIntent } from './types.js';

export interface AmpMotionAttributes {
  animateIn: 'fade-in' | 'fly-in-bottom' | 'pan-left' | 'zoom-in';
  duration: string;
  delay?: string;
  timingFunction: string;
  scaleStart?: string;
  scaleEnd?: string;
  panScalingFactor?: string;
}

export interface StoryMotionPreset {
  media: AmpMotionAttributes;
  heading: AmpMotionAttributes;
  text: AmpMotionAttributes;
  cta: AmpMotionAttributes;
}

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)';
const EASE_OUT_QUINT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const EDITORIAL_COPY_MOTION = {
  heading: {
    animateIn: 'fly-in-bottom',
    duration: '.55s',
    delay: '.1s',
    timingFunction: EASE_OUT_EXPO
  },
  text: {
    animateIn: 'fade-in',
    duration: '.45s',
    delay: '.25s',
    timingFunction: EASE_OUT_QUART
  },
  cta: {
    animateIn: 'fly-in-bottom',
    duration: '.45s',
    delay: '.35s',
    timingFunction: EASE_OUT_EXPO
  }
} satisfies Pick<StoryMotionPreset, 'heading' | 'text' | 'cta'>;

const STORY_MOTION_PRESETS = {
  cover: {
    media: {
      animateIn: 'zoom-in',
      duration: '7s',
      timingFunction: EASE_OUT_QUINT,
      scaleStart: '1',
      scaleEnd: '1.08'
    },
    ...EDITORIAL_COPY_MOTION
  },
  context: {
    media: {
      animateIn: 'pan-left',
      duration: '7s',
      timingFunction: EASE_OUT_QUART,
      panScalingFactor: '1.08'
    },
    ...EDITORIAL_COPY_MOTION
  },
  cta: {
    media: {
      animateIn: 'fade-in',
      duration: '1s',
      timingFunction: EASE_OUT_EXPO
    },
    ...EDITORIAL_COPY_MOTION
  },
  video: {
    media: {
      animateIn: 'fade-in',
      duration: '.8s',
      timingFunction: EASE_OUT_EXPO
    },
    ...EDITORIAL_COPY_MOTION
  }
} satisfies Record<StoryMotionIntent, StoryMotionPreset>;

export function storyMotionForIntent(intent: StoryMotionIntent): StoryMotionPreset {
  return STORY_MOTION_PRESETS[intent];
}

export function renderAmpAttributes(attributes: AmpMotionAttributes): string {
  const parts = [
    attr('animate-in', attributes.animateIn),
    attr('animate-in-duration', attributes.duration),
    attributes.delay ? attr('animate-in-delay', attributes.delay) : '',
    attr('animate-in-timing-function', attributes.timingFunction),
    attributes.scaleStart ? attr('scale-start', attributes.scaleStart) : '',
    attributes.scaleEnd ? attr('scale-end', attributes.scaleEnd) : '',
    attributes.panScalingFactor ? attr('pan-scaling-factor', attributes.panScalingFactor) : ''
  ];
  return parts.filter(Boolean).join(' ');
}

function attr(name: string, value: string): string {
  return `${name}="${value}"`;
}
