function replaceClassName(oriClass, classToRemove) {
  return oriClass
    .replace(
      new RegExp(`(^|\\s)${classToRemove}(?:\\s|$)`, 'g'), '$1')
    .replace(/\s+/g, ' ')
    .replace(/^\s*|\s*$/g, '');
}

function removeClass(el, className) {
  if (
    el &&
    el.classList &&
    typeof el.classList.remove === "function") {
    el.classList.remove(className);
  } else if (typeof el.className === 'string') {
    el.className = replaceClassName(el.className, className);
  } else {
    // eslint-disable-next-line no-mixed-operators
    el.setAttribute('class', replaceClassName(el.className && el.className.baseVal || '', className));
  }
}

export default removeClass;