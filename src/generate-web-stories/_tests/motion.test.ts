import { describe, expect, it } from 'vitest';
import { renderAmpAttributes, storyMotionForIntent } from '../motion.js';

describe('story motion presets', () => {
  it('gera atributos AMP editoriais para cada intenção narrativa', () => {
    expect(renderAmpAttributes(storyMotionForIntent('cover').media)).toBe(
      'animate-in="zoom-out" animate-in-duration="7s" animate-in-timing-function="cubic-bezier(0.22, 1, 0.36, 1)" scale-start="1.1" scale-end="1"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('point' as never).media)).toBe(
      'animate-in="pan-right" animate-in-duration="7s" animate-in-timing-function="cubic-bezier(0.25, 1, 0.5, 1)" pan-scaling-factor="1.12"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('context').media)).toBe(
      'animate-in="pan-up" animate-in-duration="7s" animate-in-timing-function="cubic-bezier(0.25, 1, 0.5, 1)" pan-scaling-factor="1.1"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('detail' as never).media)).toBe(
      'animate-in="pan-left" animate-in-duration="7s" animate-in-timing-function="cubic-bezier(0.25, 1, 0.5, 1)" pan-scaling-factor="1.1"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('decision' as never).media)).toBe(
      'animate-in="zoom-in" animate-in-duration="7s" animate-in-timing-function="cubic-bezier(0.22, 1, 0.36, 1)" scale-start="1" scale-end="1.06"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('cta').media)).toBe(
      'animate-in="fade-in" animate-in-duration="1s" animate-in-timing-function="cubic-bezier(0.16, 1, 0.3, 1)"'
    );
    expect(renderAmpAttributes(storyMotionForIntent('video').media)).toBe(
      'animate-in="fade-in" animate-in-duration=".8s" animate-in-timing-function="cubic-bezier(0.16, 1, 0.3, 1)"'
    );
  });

  it('orquestra título e texto sem repetir valores mágicos no renderer', () => {
    const cover = storyMotionForIntent('cover');

    expect(renderAmpAttributes(cover.heading)).toBe(
      'animate-in="fly-in-bottom" animate-in-duration=".55s" animate-in-delay=".35s" animate-in-timing-function="cubic-bezier(0.16, 1, 0.3, 1)"'
    );
    expect(renderAmpAttributes(cover.text)).toBe(
      'animate-in="fade-in" animate-in-duration=".45s" animate-in-delay=".55s" animate-in-timing-function="cubic-bezier(0.25, 1, 0.5, 1)"'
    );
  });
});
