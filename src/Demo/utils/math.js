export function randomInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function repetition (curNumber: number, limitNumber: number) {
  return curNumber / limitNumber === 0 ? curNumber : curNumber % limitNumber;
}