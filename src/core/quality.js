// Rendering tier from device hints. ?q=high|mid|low overrides. Only genuinely old GPUs start at 'low' (Mali-T/G3x–G5x,
// Adreno 3xx–5xx, PowerVR, old Intel); current phone GPUs (Mali-G6x/G7x/G7xx, Adreno 6xx+, Apple) stay at 'mid'.
// A cheap first answer: creating a throwaway context costs half a second on some GPUs. The real test is the
// renderer's own context (see bootScene), which is created once and reused.
export function hasWebGL() { return !!window.WebGL2RenderingContext; }
export const GL_ATTRS = { antialias: true, alpha: false, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };

export function detectTier(gl) {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'high' || q === 'mid' || q === 'low') return q;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let gpu = '';
  try {
    const g = gl || document.createElement('canvas').getContext('webgl2');
    const ext = g && g.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* ignore */ }
  const weakGpu = /Mali-(T\d|4\d\d|G[0-5]\d)|Adreno \(TM\) [3-5]\d\d|PowerVR|Intel\(R\) (HD|Iris\(TM\) Graphics [56])|SwiftShader|llvmpipe/i.test(gpu);
  if (mem <= 2 || cores <= 2 || weakGpu) return 'low';
  if (coarse || mem <= 4) return 'mid';
  return 'high';
}
