export default function isNum(value) {
  let rs = true;

  if (
    value === undefined ||
    value === null ||
    value === false ||
    value === true ||
    Array.isArray(value) ||
    value === Infinity ||
    isNaN(value)
  ) {
    rs = false;
  }

  return rs;
}