import { useState, useEffect, useRef } from 'react';
import { SLIDE_ANIMATION_FRAMES, SLIDE_ANIMATION_INTERVAL_MS } from '../constants.js';

/** Maps a linear progress value (0–1) to an eased progress value (0–1). */
type EasingFunction = (t: number) => number;

/** Built-in easing functions. */
export const easings = {
  linear: (t: number): number => t,
  easeOutCubic: (t: number): number => 1 - (1 - t) ** 3,
  easeInCubic: (t: number): number => t ** 3,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      const t2 = t - 1.5 / 2.75;
      return 7.5625 * t2 * t2 + 0.75;
    } else if (t < 2.5 / 2.75) {
      const t2 = t - 2.25 / 2.75;
      return 7.5625 * t2 * t2 + 0.9375;
    } else {
      const t2 = t - 2.625 / 2.75;
      return 7.5625 * t2 * t2 + 0.984375;
    }
  },
} as const satisfies Record<string, EasingFunction>;

interface SlideAnimationOptions {
  frames?: number;
  intervalMs?: number;
  easing?: EasingFunction;
}

interface SlideAnimationResult {
  currentWidth: number;
  isAnimating: boolean;
  isVisible: boolean;
}

/** Animates a width value between 0 and targetWidth over multiple frames with easing. */
export function useSlideAnimation(
  isOpen: boolean,
  targetWidth: number,
  options: SlideAnimationOptions = {},
): SlideAnimationResult {
  const { frames = SLIDE_ANIMATION_FRAMES, intervalMs = SLIDE_ANIMATION_INTERVAL_MS, easing = easings.easeInOutCubic } = options;

  const [currentFrame, setCurrentFrame] = useState(isOpen ? frames : 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const directionRef = useRef<'open' | 'close'>(isOpen ? 'open' : 'close');

  useEffect(() => {
    directionRef.current = isOpen ? 'open' : 'close';
    setIsAnimating(true);

    const timer = setInterval((): void => {
      setCurrentFrame((prev) => {
        const next = directionRef.current === 'open' ? prev + 1 : prev - 1;
        const clamped = Math.max(0, Math.min(frames, next));

        if (clamped === (directionRef.current === 'open' ? frames : 0)) {
          clearInterval(timer);
          setIsAnimating(false);
        }

        return clamped;
      });
    }, intervalMs);

    return (): void => {
      clearInterval(timer);
    };
  }, [isOpen, frames, intervalMs]);

  const linearProgress = currentFrame / frames;
  const easedProgress = easing(linearProgress);
  const currentWidth = Math.round(easedProgress * targetWidth);
  const isVisible = currentFrame > 0 || isAnimating;

  return { currentWidth, isAnimating, isVisible };
}
