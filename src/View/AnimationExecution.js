import { defaultAnim } from './anim/DefaultAnimation';

export const AnimExecution = {
  appendStyle,
  removeStyle,
  toggleClass,
  executeDefaultAnim,
};

export const AnimName = {
  zoomOut: 1,
  zoomIn: 2,
  verticalSlide: 3
};

function executeDefaultAnim(el, animName, fromPos, toPos, duration) {
  if (
    animName !== undefined &&
    animName !== null &&
    el
  ) {
    switch (animName) {
      case AnimName.zoomOut: {
        defaultAnim.zoomOut(el);
        break;
      }

      case AnimName.zoomIn: {
        defaultAnim.zoomIn(el, duration);
        break;
      }

      case AnimName.verticalSlide: {
        defaultAnim.verticalSlide(el, fromPos, toPos, duration, 0, 1,'ease-in');
        break;
      }

      default: {
        break;
      }
    }
  }
}

function appendStyle(el, animationNames) {
  const arrAnim = hasWhiteSpace(animationNames) ?
    animationNames.split(' ') :
    animationNames;

  if (typeof arrAnim === 'string') {
    addClass(el, arrAnim);
  }
  else {
    for (let i = 0; i < arrAnim.length; i++) {
      addClass(el, arrAnim[i]);
    }
  }
}

function removeStyle(el, animationNames) {
  const arrAnim = hasWhiteSpace(animationNames) ?
    animationNames.split(' ') :
    animationNames;

  if (typeof arrAnim === 'string') {
    removeClass(el, arrAnim);
  }
  else {
    for (let i = 0; i < arrAnim.length; i++) {
      removeClass(el, arrAnim[i]);
    }
  }
}

function addClass(el, className) {
  if (el && el.classList) {
    if (
      typeof el.classList.add === 'function') {
      el.classList.add(className);
    }
    else if (!hasClass(el, className)) {
      if (typeof el.className === 'string') {
        el.className = `${el.className}${className}`;
      }
      else {
        if (typeof el.setAttribute === 'function') {
          // eslint-disable-next-line no-mixed-operators
          el.setAttribute('class', `${el.className && el.className.baseVal || ''}${className}`);
        }
      }
    }
  }
}

function hasClass(el, className) {
  let rValue = undefined;
  if (el && el.classList) {
    if (
      typeof el.classList.contains === 'function') {
      rValue = !!className && el.classList.contains(className);
    }
    else {
      rValue = `${el.className.baseVal || el.className}`.indexOf(`${className}`) !== -1;
    }
  }
  else {
    rValue = false;
  }
  return rValue;
}

function hasWhiteSpace(string) {
  return /\s/g.test(string);
}

function replaceClassName(oriClass, classToRemove) {
  return oriClass
    .replace(
      new RegExp(`(^|\\s)${classToRemove}(?:\\s|$)`, 'g'), '$1')
    .replace(/\s+/g, ' ')
    .replace(/^\s*|\s*$/g, '');
}

function removeClass(el, className) {
  if (el && el.className) {
    if (
      el.classList &&
      typeof el.classList.remove === 'function') {
      el.classList.remove(className);
    }
    else if (typeof el.className === 'string') {
      el.className = replaceClassName(el.className, className);
    }
    else {
      if (typeof el.setAttribute === 'function') {
        // eslint-disable-next-line no-mixed-operators
        el.setAttribute('class', replaceClassName(el.className && el.className.baseVal || '', className));
      }
    }
  }
}

function toggleClass(el, className) {
  if (
    el &&
    el.classList &&
    typeof el.classList.toggle === 'function'
  ) {
    el.classList.toggle(className);
  }
  else if (hasClass(el, className)) {
    removeClass(el, className);
  }
  else {
    addClass(el, className);
  }
}