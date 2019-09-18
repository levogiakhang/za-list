import isFunction from '../../vendors/isFunction';

export const defaultAnim = {
  zoomOut,
  zoomIn,
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

function zoomIn(el) {
  if (
    el &&
    isFunction(el.animate)
  ) {
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
        duration: 150,
        easing: 'linear',
      },
    );
  }
}