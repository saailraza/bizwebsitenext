// Loads the calculator / CFO Desk scripts once and returns a promise.
const cache = {};
function load(src) {
  if (cache[src]) return cache[src];
  cache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => {
      delete cache[src];
      reject(new Error('failed ' + src));
    };
    document.head.appendChild(s);
  });
  return cache[src];
}
export function ensureLegacy(needCfo) {
  return (needCfo ? load('/legacy/cfo.js') : Promise.resolve()).then(() => load('/legacy/site.js'));
}
