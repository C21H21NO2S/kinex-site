// The opening sketch off the main thread: the page keeps loading and building while the pencil draws.
import { runSketch } from './sketch-draw.js';

self.onmessage = e => runSketch(e.data.canvas, { ...e.data, onFirst: () => self.postMessage('first') }).then(() => self.postMessage('drawn'));
