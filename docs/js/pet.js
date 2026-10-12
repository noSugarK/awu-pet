// Awu Pet public API for the platform shells (platform/web.js, platform/desktop.js).
// Load order: core/yb.js → characters/*.js → casts.js → packs.js → core/runtime.js
//             → behaviors/feeding.js → behaviors/actions.js → behaviors/brain.js → pet.js → platform/*.js
// Designed by 黄小B · Powered by noSugarK
const PET = (() => {
  const { rt, actions: A, brain, feeding } = YB;
  rt.start(); // lays out on the next frame, after the shell has adjusted rt.config
  return {
    config: rt.config,
    cast: rt.cast,
    casts: YB.casts,
    setCast: rt.setCast,
    setSprite: rt.setSprite,
    can: A.can,
    bears: rt.bears,
    run: A.run,
    playRow: A.playRow,
    show: A.show,
    setSize: A.setSize,
    say: rt.say,
    rect: rt.rect,
    dragging: rt.dragging,
    // desktop: detect fast cursor movement without counting it as activity
    lookAt: (x, y) => rt.trackMouse(x, y),
    // desktop: OS idle time decides when they fall asleep
    setIdle(seconds) {
      if (seconds < 2) rt.wake(false);
      else rt.activity.lastActive = Math.min(rt.activity.lastActive, Date.now() - seconds * 1000);
    },
    setFullscreen: brain.setFullscreen,
    // feeding
    bearAt: A.bearAt,
    hungry: A.hungry,
    eat: A.eat,
    errand: A.errand,
    helper: A.helper,
    diary: feeding.summary,
  };
})();
