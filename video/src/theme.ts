// Single source of truth for the promo: colours, easings, springs, fonts, timing.
// Designed by 黄小B · Powered by noSugarK
import { Easing } from 'remotion';
import { staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';

// subset to the characters in src/ by scripts/fonts.mjs
const SANS = 'Noto Sans SC';
for (const weight of ['500', '900']) loadFont({ family: SANS, url: staticFile(`fonts/noto-sans-sc-${weight}.woff2`), weight });

export const theme = {
  colors: {
    bg: '#fbf6f0',        // warm Apple-ish white
    night: '#0b0a12',
    ink: '#1d1d1f',
    dim: '#6e6e73',
    bear: '#3a2317',      // the site's ink
    hero: '#ff6b8a',      // 一二's heart pink — one element per frame
    gold: '#f5b400',      // 布布's star gold
    blobs: ['#ffd3dc', '#e4ddff', '#ffe4c4'],
    glass: 'rgba(255,255,255,0.72)',
  },
  gradient: 'linear-gradient(100deg, #ff6b8a 0%, #ff9a76 45%, #f5b400 100%)',
  fonts: { sans: SANS },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 9, stiffness: 160, mass: 0.7 },
  },
  bpm: 120, // music bed in scripts/audio.mjs; scenes are measured in beats
} as const;
