import hasClass from "./hasClass";
import removeClass from "./removeClass";
import addClass from "./addClass";

function toggleClass(el, className) {
  if (
    el &&
    el.classList &&
    typeof el.classList.toggle === "function"
  ) {
    el.classList.toggle(className);
  } else if (hasClass(el, className)) {
    removeClass(el, className);
  } else {
    addClass(el, className);
  }
}

export default toggleClass;