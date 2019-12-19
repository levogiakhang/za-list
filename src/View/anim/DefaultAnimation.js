import isFunction from '../../vendors/isFunction';
import isNum from '../../utils/isNum';

export const defaultAnim = {
	zoomOut,
	zoomIn,
	verticalSlide,
	scrollTop,
};

function zoomOut({el, animationManager, duration = 300, singleAnim}) {
	const _duration = isNum(duration)
	  ? duration
	  : 0;

	if (
	  el &&
	  isFunction(el.animate)
	) {
		if (singleAnim) {
			if (animationManager) {
				animationManager.cancelAll(el);
			}
		}
		const animation = el.animate([
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

		if (animationManager) {
			animationManager.set(el, animation);
		}
	}
}

function zoomIn({el, animationManager, duration = 300, iterationCount = 1, singleAnim}) {
	if (
	  el &&
	  isFunction(el.animate)
	) {
		if (singleAnim) {
			if (animationManager) {
				animationManager.cancelAll(el);
			}
		}

		const _iterationCount = isNum(iterationCount)
		  ? iterationCount
		  : 0;

		const _duration = isNum(duration)
		  ? duration
		  : 0;

		const animation = el.animate([
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

		if (animationManager) {
			animationManager.set(el, animation);
		}
	}
}

function verticalSlide({el, animationManager, fromY, toY, duration = 300, delay = 0, iterationCount = 1, easing = 'linear', singleAnim}) {
	const _fromY = isNum(fromY)
	  ? fromY
	  : 0;

	const _toY = isNum(toY)
	  ? toY
	  : 0;

	const _delay = isNum(delay)
	  ? delay
	  : 0;

	const _iterationCount = isNum(iterationCount)
	  ? iterationCount
	  : 0;

	const _duration = isNum(duration)
	  ? duration
	  : 0;

	if (
	  el &&
	  isFunction(el.animate)
	) {
		if (singleAnim) {
			if (animationManager) {
				animationManager.cancelAll(el);
			}
		}

		const animation = el.animate([
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

		if (animationManager) {
			console.log(animationManager);
			animationManager.set(el, animation);
		}
	}
}

function scrollTop({el, animationManager, fromPos, toPos, duration = 500, delay = 0, easing = 'linear', singleAnim}) {
	const _fromY = isNum(fromPos)
	  ? fromPos
	  : 0;

	const _toY = isNum(toPos)
	  ? toPos
	  : 0;

	const _duration = isNum(duration)
	  ? duration
	  : 0;

	const _delay = isNum(delay)
	  ? delay
	  : 0;

	if (
	  el &&
	  isFunction(el.animate)
	) {
		if (singleAnim) {
			if (animationManager) {
				animationManager.cancelAll(el);
			}
		}
		const animation = el.animate([
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
			  easing: easing,
		  },
		);

		if (animationManager) {
			animationManager.set(el, animation);
		}
	}
}