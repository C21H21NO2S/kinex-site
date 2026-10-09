// The opening sketch off the main thread: the page keeps loading and building while the pencil draws.
import { runSketch } from './sketch-draw.js';

// The drawing waits for the page's 'go': a worker's canvas reaches the screen only once the page has taken in its
// first frame, and a drawing started before that would appear all at once, half done.
let go;
const gate = new Promise(r => (go = r));
self.onmessage = e => {
  if (e.data === 'go') return go();
  runSketch(e.data.canvas, { ...e.data, gate, onFirst: () => self.postMessage('first'), onNearlyDone: () => self.postMessage('drawn') });
};
