// Shared layers and little graphics: background mesh, grade, grain, vignette, particles, cursor, file, text reveal.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from './theme';

export const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = (f: number, input: [number, number], output: [number, number], easing: (t: number) => number = theme.ease.out) =>
  interpolate(f, input, output, { easing, ...clampOpts });

// beats → frames at the current fps (the music is theme.bpm)
export const useBeat = () => {
  const { fps } = useVideoConfig();
  return (beats: number) => Math.round((beats * 60 * fps) / theme.bpm);
};
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  return { W: width, H: height, portrait: height > width };
};

export const BgMesh: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const f = useCurrentFrame();
  const { W, H } = useLayout();
  const c = dark ? ['#ff6b8a', '#7b5cff', '#f5b400'] : theme.colors.blobs;
  const blob = (i: number, x: number, y: number, r: number) => (
    <div key={i} style={{
      position: 'absolute', width: r, height: r, borderRadius: '50%', filter: 'blur(60px)',
      left: x - r / 2 + Math.sin(f / (50 + i * 13) + i) * 70, top: y - r / 2 + Math.cos(f / (60 + i * 9) + i * 2) * 60,
      background: `radial-gradient(circle, ${c[i]}${dark ? '50' : 'ff'}, transparent 65%)`,
    }} />
  );
  const R = Math.max(W, H);
  return (
    <AbsoluteFill style={{ background: dark ? theme.colors.night : theme.colors.bg, overflow: 'hidden' }}>
      {blob(0, W * 0.15, H * 0.18, R * 0.75)}
      {blob(1, W * 0.88, H * 0.38, R * 0.62)}
      {blob(2, W * 0.45, H * 0.98, R * 0.7)}
    </AbsoluteFill>
  );
};

export const Grade: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <AbsoluteFill style={{ backgroundColor: theme.colors.hero, mixBlendMode: 'soft-light', opacity: dark ? 0.2 : 0.1 }} />
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05), transparent 28%, transparent 72%, rgba(0,0,0,0.08))' }} />
  </AbsoluteFill>
);

const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: noise, backgroundSize: '220px',
    backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`, opacity: 0.05, mixBlendMode: 'multiply' }} />;
};
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 58%, rgba(40,20,10,0.16) 100%)' }} />
);

// --- glyphs drawn in theme colours (no emoji) ---
export const Heart: React.FC<{ size: number; color?: string }> = ({ size, color = theme.colors.hero }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill={color} d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
);
export const Star: React.FC<{ size: number; color?: string }> = ({ size, color = theme.colors.gold }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill={color} d="M12 1.5l2.6 6.8 7.3.4-5.7 4.6 1.9 7.1L12 16.4l-6.1 4 1.9-7.1L2.1 8.7l7.3-.4z" /></svg>
);
export const Sparkle: React.FC<{ size: number; color?: string }> = ({ size, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill={color} d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z" /></svg>
);

export const rnd = (i: number, k: number) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// a burst of hearts / stars / sparkles flying up and out from (x, y), starting at frame `at`
export const Burst: React.FC<{ x: number; y: number; at: number; kind?: 'heart' | 'star' | 'sparkle'; n?: number; spread?: number; size?: number }> =
({ x, y, at, kind = 'heart', n = 9, spread = 1.3, size = 44 }) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 45) return null;
  const G = { heart: Heart, star: Star, sparkle: Sparkle }[kind];
  return <>{Array.from({ length: n }).map((_, i) => {
    const a = -Math.PI / 2 + (rnd(i, 1) - 0.5) * Math.PI * spread, d = 160 + rnd(i, 2) * 200;
    const t = ease(f, [0, 40], [0, 1]);
    const s = (0.6 + rnd(i, 3) * 0.7) * ease(f, [0, 8], [0.2, 1]) * ease(f, [28, 45], [1, 0.3], theme.ease.in);
    return <div key={i} style={{
      position: 'absolute', left: x + Math.cos(a) * d * t - size / 2, top: y + Math.sin(a) * d * t + 120 * t * t - size / 2,
      transform: `scale(${s}) rotate(${(rnd(i, 4) - 0.5) * 80 * t}deg)`, opacity: ease(f, [30, 45], [1, 0], theme.ease.in),
    }}><G size={size} color={kind === 'sparkle' ? (i % 2 ? theme.colors.gold : '#fff') : undefined} /></div>;
  })}</>;
};

// twinkling sparkles scattered over the frame
export const Twinkles: React.FC<{ n?: number; color?: string; seed?: number }> = ({ n = 14, color = '#fff', seed = 1 }) => {
  const f = useCurrentFrame();
  const { W, H } = useLayout();
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{Array.from({ length: n }).map((_, i) => {
    const tw = (Math.sin(f / (8 + rnd(i, seed) * 10) + i * 2) + 1) / 2;
    const s = 10 + rnd(i, seed + 2) * 26;
    return <div key={i} style={{ position: 'absolute', left: rnd(i, seed + 3) * W, top: rnd(i, seed + 4) * H,
      opacity: 0.25 + tw * 0.75, transform: `scale(${0.5 + tw * 0.6}) rotate(${f * 0.6}deg)` }}><Sparkle size={s} color={color} /></div>;
  })}</AbsoluteFill>;
};

export const Cursor: React.FC<{ x: number; y: number; press?: number }> = ({ x, y, press = 0 }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${1 - press * 0.15})`, transformOrigin: '0 0',
    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.25))' }}>
    <svg width="54" height="68" viewBox="0 0 18 23"><path d="M1 1 L1 18 L5.2 14 L8 21 L11 19.8 L8.3 13 L14 13 Z" fill="#fff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  </div>
);

// a picture file, like a Finder / Explorer icon
export const FileIcon: React.FC<{ size: number; label?: string }> = ({ size, label }) => (
  <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size * 1.25} viewBox="0 0 80 100" style={{ filter: 'drop-shadow(0 14px 22px rgba(58,35,23,.25))' }}>
      <path d="M8 4 H54 L76 26 V92 a4 4 0 0 1 -4 4 H8 a4 4 0 0 1 -4 -4 V8 a4 4 0 0 1 4 -4z" fill="#fff" />
      <path d="M54 4 V22 a4 4 0 0 0 4 4 H76" fill="#efe8e2" />
      <rect x="14" y="38" width="52" height="40" rx="6" fill="#ffd3dc" />
      <circle cx="50" cy="50" r="6" fill="#f5b400" />
      <path d="M14 72 L30 54 L42 66 L50 59 L66 74 V72 a6 6 0 0 1 -6 6 H20 a6 6 0 0 1 -6 -6z" fill="#ff6b8a" />
    </svg>
    {label && <div style={{ fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: size * 0.2, color: theme.colors.ink,
      background: theme.colors.glass, padding: '4px 14px', borderRadius: 10, whiteSpace: 'nowrap' }}>{label}</div>}
  </div>
);

// per-character blur-rise reveal (Chinese has no spaces, so stagger by character)
export const Reveal: React.FC<{ text: string; delay?: number; per?: number; style?: React.CSSProperties; gradient?: boolean }> =
({ text, delay = 0, per = 2, style, gradient }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <span style={{ display: 'inline-flex', whiteSpace: 'pre', ...style }}>{[...text].map((ch, i) => {
    const p = spring({ frame: f - delay - i * per, fps, config: theme.spring.snappy });
    return <span key={i} style={{
      display: 'inline-block', opacity: Math.min(1, p * 1.4), filter: `blur(${Math.max(0, 1 - p) * 12}px)`,
      transform: `translateY(${interpolate(p, [0, 1], [0.45, 0])}em) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      ...(gradient ? { backgroundImage: theme.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: '0.08em' } : {}),
    }}>{ch}</span>;
  })}</span>;
};
