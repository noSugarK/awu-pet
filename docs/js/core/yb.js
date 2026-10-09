// YierBubu runtime namespace + a tiny event bus. Loaded first; everything else attaches to YB.
// Designed by 黄小B · Powered by noSugarK
const YB = {
  models: {},      // geometry (models/*.js)
  characters: {},  // a model + palette + personality (characters/*.js)
  model(m) { this.models[m.id] = m; },
  character(c) { this.characters[c.id] = c; },
  bus: new EventTarget(),
  on(type, fn) { this.bus.addEventListener(type, e => fn(e.detail)); },
  emit(type, detail) { this.bus.dispatchEvent(new CustomEvent(type, { detail })); },
};
