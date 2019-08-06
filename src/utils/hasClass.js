function hasClass(el, className) {
  let rValue = undefined;
  if (el && el.classList) {
    if (
      typeof el.classList.contains === "function") {
      rValue = !!className && el.classList.contains(className);
    } else {
      rValue = `${el.className.baseVal || el.className}`.indexOf(`${className}`) !== -1;
    }
  } else {
    rValue = false;
  }

  return rValue;
}

export default hasClass;