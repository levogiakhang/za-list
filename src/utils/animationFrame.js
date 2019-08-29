/** @flow */

type Callback = (timestamp: number) => void;
type CancelAnimationFrame = (requestId: number) => void;
type RequestAnimationFrame = (callback: Callback) => number;


let win = {};
if (typeof window !== 'undefined') {
  win = window;
}


const request =
  win.requestAnimationFrame ||
  win.webkitRequestAnimationFrame ||
  win.mozRequestAnimationFrame ||
  win.oRequestAnimationFrame ||
  win.msRequestAnimationFrame ||
  function (callback: Callback): RequestAnimationFrame {
    return (win: any).setInterval(callback, 1000 / 60);
  };


const cancel =
  win.cancelAnimationFrame ||
  win.webkitCancelAnimationFrame ||
  win.mozCancelAnimationFrame ||
  win.oCancelAnimationFrame ||
  win.msCancelAnimationFrame ||
  function (id: number) {
    (win: any).clearTimeout(id);
  };


export const raf: RequestAnimationFrame = (request: any);
export const caf: CancelAnimationFrame = (cancel: any);