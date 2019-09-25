import isFunction from '../../vendors/isFunction';
import isNum from '../../utils/isNum';

export const defaultAnim = {
  zoomOut,
  zoomIn,
  verticalSlide
};

function zoomOut(el) {
  if (
    el &&
    isFunction(el.animate)
  ) {
    el.animate([
      {
        transform: 'scale(1)',
        opacity: 1,
        offset: 0,
      },
      {
        transform: 'scale(.5)',
        opacity: .5,
        offset: .3,
      },
      {
        transform: 'scale(.667)',
        opacity: .667,
        offset: .7875,
      },
      {
        transform: 'scale(.6)',
        opacity: .6,
        offset: 1,
      },
    ], {
      duration: 700, //milliseconds
      easing: 'ease-in-out', //'linear', a bezier curve, etc.
      delay: 10, //milliseconds
      iterations: 1, //or a number
      direction: 'alternate', //'normal', 'reverse', etc.
      fill: 'forwards', //'backwards', 'both', 'none', 'auto'
    });
  }
}

function zoomIn(el,  duration: number = 300, iterationCount: number = 1) {
  if (
    el &&
    isFunction(el.animate)
  ) {
    const _iterationCount = isNum(iterationCount) ?
      iterationCount :
      0;

    const _duration = isNum(duration) ?
      duration :
      0;

    el.animate([
        {
          opacity: 0.5,
          transform: 'scale(0.9, 0.9)',
        },
        {
          opacity: 1,
          transform: 'scale(1, 1)',
        },
      ],
      {
        duration: _duration,
        iterations: _iterationCount,
        easing: 'linear',
      },
    );
  }
}

function verticalSlide(el, fromY: number, toY: number, duration: number = 300, delay: number = 0, iterationCount: number = 1, easing: string = 'linear') {
  const _fromY = isNum(fromY) ?
    fromY :
    0;

  const _toY = isNum(toY) ?
    toY :
    0;

  const _delay = isNum(delay) ?
    delay :
    0;

  const _iterationCount = isNum(iterationCount) ?
    iterationCount :
    0;

  const _duration = isNum(duration) ?
    duration :
    0;

  if (
    el &&
    isFunction(el.animate)
  ) {
    el.animate([
        {
          transform: `translatey(${_fromY}px)`,
        },
        {
          transform: `translatey(${_toY}px)`,
        },
      ],
      {
        duration: _duration,
        delay: _delay,
        iterations: _iterationCount,
        easing: easing,
      },
    );
  }
}