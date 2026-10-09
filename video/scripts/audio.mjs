// Synthesizes the music bed and SFX as 16-bit WAVs into public/audio/ — no downloads, deterministic.
// Music: 120 BPM (one beat = 15 frames at 30 fps), C–G–Am–F, a marimba-ish pluck over a soft kick.
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const dir = new URL('../public/audio/', import.meta.url);
mkdirSync(dir, { recursive: true });

function wav(name, data) {
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data.length * 2, 40);
  const peak = data.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  data.forEach((v, i) => buf.writeInt16LE(Math.round((v / peak) * 0.89 * 32767), 44 + i * 2));
  writeFileSync(new URL(name, dir), buf);
}
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const hz = n => 440 * 2 ** ((n - 69) / 12);
const add = (out, t0, len, fn) => {
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < len * SR && s0 + i < out.length; i++) out[s0 + i] += fn(i / SR);
};
const pluck = (f, a = 1) => t => a * Math.exp(-t * 6) * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 20));

// --- music bed ---
const BEAT = 0.5, BARS = 15, LEN = 30;
const music = new Float32Array(LEN * SR);
const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // C G Am F
for (let bar = 0; bar < BARS; bar++) {
  const c = chords[bar % 4], t = bar * 4 * BEAT, last = bar === BARS - 1;
  // pad
  add(music, t, 4 * BEAT + .3, x => 0.05 * Math.min(1, x * 4) * Math.exp(-x * .6) *
    c.reduce((s, n) => s + Math.sin(2 * Math.PI * hz(n) * x) + Math.sin(2 * Math.PI * hz(n) * 1.003 * x), 0));
  if (last) { add(music, t, 3, pluck(hz(72), .5)); add(music, t, 3, pluck(hz(76), .4)); continue; }
  // arpeggio, 8th notes, from bar 1
  const arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 24, c[2] + 12, c[1] + 12, c[0] + 24, c[2] + 12];
  if (bar >= 1) arp.forEach((n, i) => add(music, t + i * BEAT / 2, .6, pluck(hz(n), .22)));
  for (let b = 0; b < 4; b++) {
    const tb = t + b * BEAT;
    if (bar >= 2) add(music, tb, .3, x => .6 * Math.exp(-x * 18) * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-x * 30)) * x)); // kick
    if (bar >= 2) add(music, tb + BEAT / 2, .05, x => .05 * Math.exp(-x * 90) * noise()); // hat
    if (b % 2 === 0) add(music, tb, .9, x => .18 * Math.exp(-x * 3) * Math.sin(2 * Math.PI * hz(c[0] - 24) * x)); // bass
  }
}
add(music, LEN - 1.5, 1.5, () => 0); // tail room
for (let i = 0; i < music.length; i++) music[i] *= Math.min(1, (music.length - i) / (SR * 1.2)); // fade out
wav('music.wav', music);

// --- sfx ---
const sfx = (name, len, fn) => { const o = new Float32Array(len * SR); add(o, 0, len, fn); wav(name, o); };
sfx('pop.wav', .18, t => Math.exp(-t * 30) * Math.sin(2 * Math.PI * (300 + 900 * Math.exp(-t * 40)) * t));
let lp = 0;
sfx('whoosh.wav', .45, t => { const env = Math.sin(Math.PI * t / .45) ** 2; lp += (noise() - lp) * (.05 + .4 * env); return env * lp; });
sfx('chomp.wav', .5, t => [0, .17, .34].reduce((s, o) => t < o ? s : s +
  Math.exp(-(t - o) * 35) * (noise() * .5 + Math.sin(2 * Math.PI * 110 * (t - o))), 0));
sfx('chime.wav', 1.2, t => [88, 92, 95, 100].reduce((s, n, i) => t < i * .06 ? s : s +
  Math.exp(-(t - i * .06) * 4) * Math.sin(2 * Math.PI * hz(n) * (t - i * .06)), 0));
sfx('ding.wav', .8, t => Math.exp(-t * 5) * (Math.sin(2 * Math.PI * hz(84) * t) + .5 * Math.sin(2 * Math.PI * hz(91) * t)));
console.log('audio: music.wav, pop, whoosh, chomp, chime, ding');
