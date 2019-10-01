import isFunction from '../../vendors/isFunction';
import isNum from '../../utils/isNum';

export const defaultAnim = {
  zoomOut,
  zoomIn,
  verticalSlide,
  scrollTop,
};

function zoomOut(el, duration: number = 300) {
  const _duration = isNum(duration) ?
    duration :
    0;

  if (
    el &&
    isFunction(el.animate)
  ) {
    el.animate([
      {
        transform: 'scale(1)',
        opacity: 1,
      },
      {
        transform: 'scale(.5)',
        opacity: 0,
      },
    ], {
      duration: _duration, //milliseconds
      easing: 'ease-in-out', //'linear', a bezier curve, etc.
      iterations: 1, //or a number
      direction: 'alternate', //'normal', 'reverse', etc.
      fill: 'forwards', //'backwards', 'both', 'none', 'auto'
    });
  }
}

function zoomIn(el, duration: number = 300, iterationCount: number = 1) {
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

function scrollTop(el, currentScrollTop: number, duration: number = 500, delay: number = 0, easing: string = 'linear') {
  const _currentScrollTop = isNum(currentScrollTop) ?
    currentScrollTop :
    0;

  const _duration = isNum(duration) ?
    duration :
    0;

  const _delay = isNum(delay) ?
    delay :
    0;

  if (
    el &&
    isFunction(el.animate)
  ) {

    el.animate([
        {
          scrollTop: _currentScrollTop,
        },
        {
          scrollTop: 0,
        },
      ],
      {
        duration: _duration,
        delay: _delay,
        easing: easing,
      },
    );
  }
}