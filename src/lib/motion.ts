import {
  animate,
  createTimeline,
  stagger,
  type AnimationParams,
  type JSAnimation,
  type TargetsParam,
} from "animejs";

export function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motion(targets: TargetsParam, params: AnimationParams): JSAnimation {
  if (!reduceMotion()) return animate(targets, params);
  return animate(targets, { ...params, duration: 0, delay: 0 });
}

export { animate, createTimeline, stagger };
