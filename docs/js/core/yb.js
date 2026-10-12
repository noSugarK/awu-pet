// Awu Pet runtime namespace + a tiny event bus. Loaded first; everything else attaches to YB.
// Designed by 黄小B · Powered by noSugarK
const YB = {
  characters: {},  // sprite sheet + personality (characters/*.js)
  casts: {},       // who appears together (casts.js); one cast is on screen at a time
  character(c) { this.characters[c.id] = c; },
  cast(c) { this.casts[c.id] = c; },
  bus: new EventTarget(),
  on(type, fn) { this.bus.addEventListener(type, e => fn(e.detail)); },
  emit(type, detail) { this.bus.dispatchEvent(new CustomEvent(type, { detail })); },
};
