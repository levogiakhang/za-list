function hasClass(el, className) {
  if (
    el &&
    el.classList &&
    typeof el.classList.contains === "function") {
    return !!className && el.classList.contains(className);
  }

  return `${el.className.baseVal || el.className}`.indexOf(`${className}`) !== -1;
}

export default hasClass;