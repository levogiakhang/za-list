const getDataFromDataTotal = require('./CloneFunc');

test('get Data From DataTotal', () => {
  expect(getDataFromDataTotal(-1, -1, 10)).toStrictEqual([0]);
  expect(getDataFromDataTotal(-1, 7, 6)).toStrictEqual([0,1,2,3,4,6]);
});