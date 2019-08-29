/** @flow */

import {
  caf,
  raf,
} from './animationFrame';

export type AnimationIntervalId = {
  id: number,
};

export const cancelAnimationInterval = (frameId: number) =>
  clearInterval(frameId);

export const requestAnimationInterval = (
  callback: Function,
  ms: number,
): AnimationIntervalId => {
  callback.call();

  const frame: AnimationIntervalId = {
    id: raf(callback),
  };

  return frame.id;
};