export default function measureExecutionTiming(callback, ...restParams) {
  const t0 = performance.now();
  callback(...restParams);
  const t1 = performance.now();
  console.log(t1 - t0);
}