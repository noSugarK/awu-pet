// YierBubu-Pet promo — one component, laid out for 16:9 and 9:16.
// Designed by 黄小B · Powered by noSugarK
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from './theme';
import { Bear, BearId, Pose, headTop, mouthAnchor } from './Bear';
import { BgMesh, Burst, Cursor, FileIcon, Grade, Grain, Heart, Reveal, Twinkles, Vignette, ease, useBeat, useLayout } from './fx';

// scene lengths in beats (120 BPM); cuts land on the beat
const SCENES = [8, 10, 12, 14, 6, 10];
export const DURATION_BEATS = SCENES.reduce((a, b) => a + b, 0);
const C = theme.colors;

// ---------- motion helpers ----------
const breathe = (f: number, phase = 0): Pose => ({ sx: 1 + Math.sin(f / 13 + phase) * 0.012, sy: 1 - Math.sin(f / 13 + phase) * 0.018 });
// a little jump: up and down with squash on take-off and landing
const hop = (f: number, at: number, height = 110, len = 18): Pose => {
  const t = (f - at) / len;
  if (t < -0.2 || t > 1.25) return {};
  if (t < 0) return { sx: 1 - t * 0.6, sy: 1 + t * 0.6 };
  if (t > 1) { const s = Math.sin(((t - 1) / 0.25) * Math.PI) * 0.1; return { sx: 1 + s, sy: 1 - s }; }
  return { lift: Math.sin(t * Math.PI) * height, sx: 0.94, sy: 1.07 };
};
// falling in from above on a spring; overshoot past the floor becomes squash
const drop = (f: number, fps: number, at: number, from = 1000): Pose => {
  const p = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 110, mass: 0.9 } });
  const raw = (1 - p) * from;
  return raw >= 0 ? { lift: raw, sx: 1 - Math.min(raw, 200) / 2000, sy: 1 + Math.min(raw, 200) / 1200 } : { sx: 1 - raw / 500, sy: 1 + raw / 300 };
};
const look = (bx: number, by: number, tx: number, ty: number): Pose => {
  const dx = Math.max(-1, Math.min(1, (tx - bx) / 500)), dy = Math.max(-1, Math.min(1, (ty - by) / 500));
  return { fx: dx * 10, fy: dy * 6, tilt: dx * 5 };
};
const merge = (...ps: Pose[]): Pose => ps.reduce((a, p) => {
  const o: any = { ...a };
  for (const [k, v] of Object.entries(p)) o[k] = k === 'sx' || k === 'sy' ? (o[k] ?? 1) * (v as number) : (o[k] ?? 0) + (v as number);
  return o;
}, {});
// piecewise eased path through points
const along = (f: number, times: number[], pts: [number, number][]) => {
  let i = times.findIndex(t => f < t);
  if (i === -1) return pts[pts.length - 1];
  if (i === 0) return pts[0];
  const t = ease(f, [times[i - 1], times[i]], [0, 1], theme.ease.inOut);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t] as [number, number];
};

// ---------- building blocks ----------
const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={Math.max(0, at - 2)} layout="none"><Audio src={staticFile(`audio/${src}.wav`)} volume={volume} /></Sequence>
);

// scene shell: background mesh → content (scale-through in, faster out) → grade → grain → vignette
const Scene: React.FC<{ dur: number; dark?: boolean; last?: boolean; children: React.ReactNode }> = ({ dur, dark, last, children }) => {
  const f = useCurrentFrame();
  const inP = ease(f, [0, 14], [0, 1]);
  const outP = last ? 0 : ease(f, [dur - 9, dur], [0, 1], theme.ease.in);
  return (
    <AbsoluteFill>
      <BgMesh dark={dark} />
      <AbsoluteFill style={{
        opacity: Math.min(inP * 1.5, 1 - outP),
        transform: `scale(${interpolate(inP, [0, 1], [1.05, 1]) * interpolate(outP, [0, 1], [1, 0.94])})`,
        filter: `blur(${(1 - inP) * 10 + outP * 8}px)`,
      }}>{children}</AbsoluteFill>
      <Grade dark={dark} />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

const Headline: React.FC<{ eyebrow?: string; parts: [string, boolean?][]; delay?: number; dark?: boolean; size?: number; align?: 'center' | 'left';
  style?: React.CSSProperties }> = ({ eyebrow, parts, delay = 4, dark, size = 120, align = 'center', style }) => {
  let n = 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', gap: 18, ...style }}>
      {eyebrow && <Reveal text={eyebrow} delay={delay} per={1} style={{ fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: size * 0.3,
        letterSpacing: '0.08em', color: dark ? 'rgba(255,255,255,.62)' : C.dim }} />}
      <div style={{ display: 'flex', fontFamily: theme.fonts.sans, fontWeight: 900, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.1,
        color: dark ? '#fff' : C.ink }}>
        {parts.map(([t, g], i) => { const d = delay + 6 + n * 2; n += [...t].length; return <Reveal key={i} text={t} delay={d} gradient={g} />; })}
      </div>
    </div>
  );
};

const Pill: React.FC<{ children: React.ReactNode; at: number; dark?: boolean; size?: number; style?: React.CSSProperties }> =
({ children, at, dark, size = 34, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: theme.spring.bouncy });
  return <div style={{
    fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: size, padding: `${size * 0.36}px ${size * 0.8}px`, borderRadius: 999,
    background: dark ? C.ink : C.glass, color: dark ? '#fff' : C.ink, border: dark ? 'none' : '1.5px solid rgba(58,35,23,.1)',
    boxShadow: '0 10px 30px -12px rgba(58,35,23,.25)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: size * 0.4,
    opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 30}px) scale(${interpolate(p, [0, 1], [0.7, 1])})`, ...style,
  }}>{children}</div>;
};
const Dot: React.FC<{ color: string }> = ({ color }) => <span style={{ width: 14, height: 14, borderRadius: 7, background: color, display: 'inline-block' }} />;

// ---------- 1 · hook: they drop in ----------
const Hook: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { W, H, portrait } = useLayout();
  const size = portrait ? 380 : 290, gy = portrait ? H * 0.8 : H * 0.94, gap = size * 0.68;
  const land = [6, 12];
  const bears: [BearId, number, Pose][] = [
    ['bubu', W / 2 + gap, merge(drop(f, fps, land[0]), breathe(f, 1), f > 34 ? { ar: 140 + Math.sin(f / 2.5) * 18 } : {})],
    ['yier', W / 2 - gap, merge(drop(f, fps, land[1]), breathe(f), hop(f, 52, 70))],
  ];
  return (
    <Scene dur={dur} dark>
      <Twinkles n={18} seed={3} />
      <AbsoluteFill style={{ alignItems: 'center', top: portrait ? H * 0.2 : H * 0.07 }}>
        <Headline dark eyebrow="YierBubu-Pet · 一二布布桌宠" parts={[['一二 & 布布', true]]} delay={20} size={portrait ? 150 : 170} />
        <div style={{ marginTop: 28, fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: portrait ? 50 : 54, color: 'rgba(255,255,255,.86)' }}>
          <Reveal text="住进了你的桌面。" delay={44} per={2} />
        </div>
      </AbsoluteFill>
      {bears.map(([id, x, pose]) => <Bear key={id} id={id} x={x} y={gy} size={size} state={f > 30 ? 'happy' : 'normal'} pose={pose} />)}
      <Burst x={W / 2 + gap} y={gy - size * 0.2} at={land[0] + 14} kind="star" n={7} spread={1.8} />
      <Burst x={W / 2 - gap} y={gy - size * 0.2} at={land[1] + 14} kind="heart" n={7} spread={1.8} />
      <Burst x={W / 2} y={portrait ? H * 0.3 : H * 0.24} at={34} kind="sparkle" n={12} spread={2} size={36} />
      <Sfx at={land[0] + 14} src="pop" /><Sfx at={land[1] + 14} src="pop" /><Sfx at={30} src="chime" volume={0.4} />
    </Scene>
  );
};

// ---------- 2 · they watch your cursor ----------
const Watch: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const size = portrait ? 400 : 340, gy = portrait ? H * 0.8 : H * 0.92, gap = size * 0.72;
  const yx = W / 2 - gap, bx = W / 2 + gap;
  const top = headTop('yier', size);
  const click = 108;
  const [cx, cy] = along(f, [0, 28, 56, 84, 104], [[W * 0.92, H * 0.9], [W * 0.12, H * 0.5], [W * 0.88, H * 0.42], [W * 0.5, gy - size * 0.25], [yx + 40, gy + top.y + size * 0.55]]);
  const press = ease(f, [click - 4, click], [0, 1]) - ease(f, [click + 2, click + 8], [0, 1]);
  const eyeY = gy - size * 0.75;
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', top: portrait ? H * 0.2 : H * 0.1 }}>
        <Headline eyebrow="眼睛跟着鼠标转" parts={[['它们，'], ['一直看着你', true], ['。']]} size={portrait ? 110 : 130} />
      </AbsoluteFill>
      <Bear id="yier" x={yx} y={gy} size={size} state={f > click ? 'happy' : 'normal'}
        pose={merge(look(yx, eyeY, cx, cy), breathe(f), hop(f, click + 2, 120), f > click ? { blush: 1.3, al: 150, ar: 150 } : {})} />
      <Bear id="bubu" x={bx} y={gy} size={size} state={f > click + 10 ? 'happy' : 'normal'}
        pose={merge(look(bx, eyeY, cx, cy), breathe(f, 2), hop(f, click + 12, 90))} />
      <Burst x={yx} y={gy - size * 0.9} at={click + 2} kind="heart" n={10} />
      <Burst x={bx} y={gy - size * 0.9} at={click + 12} kind="star" n={7} />
      <Cursor x={cx} y={cy} press={press} />
      <Sfx at={0} src="whoosh" volume={0.35} /><Sfx at={click} src="pop" /><Sfx at={click + 12} src="pop" volume={0.4} />
    </Scene>
  );
};

// ---------- 3 · bento: playing on their own ----------
const Tile: React.FC<{ i: number; w: number; h: number; label: string; note: string; children: (f: number) => React.ReactNode }> =
({ i, w, h, label, note, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = 16 + i * 5;
  const p = spring({ frame: f - at, fps, config: theme.spring.smooth });
  return (
    <div style={{
      position: 'relative', width: w, height: h, borderRadius: 48, overflow: 'hidden', background: C.glass,
      border: '1.5px solid rgba(255,255,255,.9)', boxShadow: '0 40px 80px -30px rgba(58,35,23,.28)',
      opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 90}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
    }}>
      {children(f - at)}
      <div style={{ position: 'absolute', left: 36, top: 30, fontFamily: theme.fonts.sans }}>
        <div style={{ fontWeight: 900, fontSize: 46, color: C.ink }}>{label}</div>
        <div style={{ fontWeight: 500, fontSize: 26, color: C.dim, marginTop: 4 }}>{note}</div>
      </div>
    </div>
  );
};
const Play: React.FC<{ dur: number }> = ({ dur }) => {
  const { W, H, portrait } = useLayout();
  const tw = portrait ? 460 : 400, th = portrait ? 520 : 560, s = portrait ? 260 : 250;
  const hold = -48; // paws in front, holding a prop
  const tiles: [string, string, (f: number) => React.ReactNode][] = [
    ['吃面', '嗦一口', f => <Bear id="yier" x={tw / 2} y={th - 40} size={s} state="noodle" pose={merge(breathe(f), { al: hold, ar: hold, lift: Math.abs(Math.sin(f / 6)) * 6 })} />],
    ['喝奶茶', '珍珠要嚼', f => <Bear id="bubu" x={tw / 2} y={th - 40} size={s} state="boba" pose={merge(breathe(f, 1), { al: hold, ar: hold, tilt: Math.sin(f / 10) * 4 })} />],
    ['跳舞', '手拉手', f => {
      const sway = Math.sin(f / 4.8), b = Math.abs(Math.cos(f / 4.8)) * 22;
      return <>{(['yier', 'bubu'] as BearId[]).map((id, k) => <Bear key={id} id={id} x={tw / 2 + (k ? 1 : -1) * s * 0.36} y={th - 40} size={s * 0.78} state="dance"
        pose={{ rot: sway * 7, lift: b, ll: k ? 0 : b * 0.4, lr: k ? b * 0.4 : 0, al: k ? 85 : 15 + sway * 30, ar: k ? 15 - sway * 30 : 85 }} />)}</>;
    }],
    ['戴墨镜', '酷一下', f => <Bear id="bubu" x={tw / 2} y={th - 40} size={s} state="normal" outfit={['glasses', 'scarf']}
      pose={merge(breathe(f, 2), { rot: -4 + Math.sin(f / 12) * 2, ar: 30 + Math.sin(f / 9) * 6 })} />],
  ];
  const gap = 32;
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', top: portrait ? H * 0.11 : H * 0.07 }}>
        <Headline eyebrow="散步 · 吃面 · 喝奶茶 · 跳舞 · 抱抱" parts={[['没人理，'], ['就自己玩', true], ['。']]} size={portrait ? 104 : 110} delay={2} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', top: portrait ? H * 0.12 : H * 0.15 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap, width: portrait ? tw * 2 + gap : W, justifyContent: 'center' }}>
          {tiles.map(([l, n, c], i) => <Tile key={l} i={i} w={tw} h={th} label={l} note={n}>{c}</Tile>)}
        </div>
      </AbsoluteFill>
      <Sfx at={0} src="whoosh" volume={0.3} />
      {tiles.map((_, i) => <Sfx key={i} at={16 + i * 5} src="pop" volume={0.35} />)}
    </Scene>
  );
};

// ---------- 4 · feeding: a file goes in the big mouth ----------
const Feed: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { W, H, portrait } = useLayout();
  const size = portrait ? 360 : 330, gy = portrait ? H * 0.78 : H * 0.9;
  const yx = portrait ? W * 0.33 : W * 0.64, bx = portrait ? W * 0.72 : W * 0.85;
  const T = { appear: 16, fly: 46, eat: 80, happy: 116, toast: 116, chips: 134 };
  const mouth = mouthAnchor('yier', size);
  const start: [number, number] = portrait ? [W * 0.78, H * 0.45] : [W * 0.84, H * 0.22];
  const end: [number, number] = [yx + mouth.x, gy + mouth.y];
  const t = ease(f, [T.fly, T.eat], [0, 1], theme.ease.inOut);
  const ctrl: [number, number] = [(start[0] + end[0]) / 2 + (portrait ? 160 : 80), Math.min(start[1], end[1]) - 220];
  const fx = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * ctrl[0] + t * t * end[0];
  const fy = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * ctrl[1] + t * t * end[1] + (t === 0 ? Math.sin(f / 8) * 10 : 0);
  const pop = spring({ frame: f - T.appear, fps, config: theme.spring.bouncy });
  const fileScale = pop * interpolate(t, [0, 0.7, 1], [1, 0.8, 0.15]);
  const state = f < T.fly - 6 ? 'normal' : f < T.eat ? 'hungry' : f < T.happy ? 'eat' : 'happy';
  const yPose: Pose = state === 'hungry' ? { al: 80, ar: 80, gape: 0.95 + Math.abs(Math.sin(f / 3.5)) * 0.12, sx: 1.04, sy: 1.07, rot: Math.sin(f / 3.5) * 2 }
    : state === 'eat' ? { al: -48, ar: -48, chomp: 0.3 + Math.abs(Math.sin(f / 2.6)) * 0.8, sy: 1 - Math.abs(Math.sin(f / 2.6)) * 0.03 }
    : state === 'happy' ? merge(hop(f, T.happy, 100), { al: 140, ar: 140, blush: 1.3 }) : {};
  const toastP = spring({ frame: f - T.toast, fps, config: theme.spring.smooth });
  const chips: [string, string][] = [['图片', C.hero], ['音乐', '#7b5cff'], ['视频', '#36b3ff'], ['压缩包', C.gold], ['文档', '#4f9a4a'], ['文件夹', '#c9895a']];
  const textW = portrait ? W - 120 : 880;
  return (
    <Scene dur={dur}>
      <div style={{ position: 'absolute', left: portrait ? 60 : 130, top: portrait ? H * 0.13 : H * 0.2, width: textW,
        display: 'flex', flexDirection: 'column', alignItems: portrait ? 'center' : 'flex-start', gap: 30 }}>
        <Headline eyebrow="会吃文件的回收站" parts={[['把文件，'], ['喂给它', true], ['。']]} size={portrait ? 112 : 124} align={portrait ? 'center' : 'left'} delay={2} />
        <div style={{ fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: portrait ? 38 : 38, lineHeight: 1.5, color: C.dim,
          textAlign: portrait ? 'center' : 'left', opacity: ease(f, [24, 40], [0, 1]), transform: `translateY(${ease(f, [24, 40], [20, 0])}px)` }}>
          拖到熊身上，或右键「请一二删除」。<br />文件进系统回收站，随时可以找回。
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: portrait ? 'center' : 'flex-start', marginTop: 10 }}>
          {chips.map(([c, col], i) => <Pill key={c} at={T.chips + i * 4} size={30}><Dot color={col} />{c}</Pill>)}
        </div>
      </div>
      <Bear id="bubu" x={bx} y={gy} size={size * 0.9} state={f > T.happy + 6 ? 'happy' : f > T.eat - 10 ? 'surprised' : 'normal'}
        pose={merge(look(bx, gy - size, f < T.eat ? fx : yx, f < T.eat ? fy : gy - size), breathe(f, 2), hop(f, T.happy + 8, 70))} />
      <Bear id="yier" x={yx} y={gy} size={size} state={state} pose={merge(f < T.fly ? look(yx, gy - size, fx, fy) : {}, breathe(f), yPose)} />
      {f >= T.appear && f < T.eat + 2 && (
        <div style={{ position: 'absolute', left: fx - 70, top: fy - 87, transform: `scale(${fileScale}) rotate(${t * 200}deg)` }}>
          <FileIcon size={140} />
          <div style={{ position: 'absolute', top: 186, left: '50%', transform: 'translateX(-50%)', opacity: 1 - ease(f, [T.fly, T.fly + 8], [0, 1]),
            fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: 28, color: C.ink, background: C.glass, padding: '4px 16px', borderRadius: 10, whiteSpace: 'nowrap' }}>旧照片.jpg</div>
        </div>
      )}
      <Burst x={yx} y={gy - size * 1.05} at={T.happy} kind="heart" n={11} />
      {/* macOS-style notification */}
      <div style={{
        position: 'absolute', width: 600, ...(portrait ? { left: (W - 600) / 2, top: H * 0.39 } : { right: 60, top: 56 }),
        display: 'flex', gap: 22, alignItems: 'center', padding: '22px 26px', borderRadius: 30, background: 'rgba(255,255,255,.82)',
        border: '1.5px solid rgba(255,255,255,.95)', boxShadow: '0 30px 60px -20px rgba(58,35,23,.35)', fontFamily: theme.fonts.sans,
        opacity: Math.min(1, toastP * 1.4), transform: portrait ? `translateY(${(1 - toastP) * -60}px) scale(${interpolate(toastP, [0, 1], [0.9, 1])})` : `translateX(${(1 - toastP) * 680}px)`,
      }}>
        <Img src={staticFile('icon.png')} style={{ width: 76, height: 76, borderRadius: 18, background: '#fff' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 28, color: C.ink }}>
            <span>一二吃掉了「旧照片.jpg」</span><span style={{ fontWeight: 500, fontSize: 22, color: C.dim }}>现在</span>
          </div>
          <div style={{ fontWeight: 500, fontSize: 24, color: C.dim, marginTop: 6 }}>已移入回收站 · 随时可以找回</div>
        </div>
      </div>
      <Sfx at={T.appear} src="pop" volume={0.4} /><Sfx at={T.fly} src="whoosh" volume={0.45} />
      <Sfx at={T.eat} src="chomp" volume={0.8} /><Sfx at={T.toast + 4} src="ding" volume={0.5} />
    </Scene>
  );
};

// ---------- 5 · you leave, they sleep ----------
const Sleep: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { W, H, portrait } = useLayout();
  const size = portrait ? 380 : 330, gy = portrait ? H * 0.72 : H * 0.86, gap = size * 0.62;
  const moon = portrait ? { x: W * 0.78, y: H * 0.36, r: 90 } : { x: W * 0.84, y: H * 0.22, r: 90 };
  return (
    <Scene dur={dur} dark>
      <Twinkles n={26} seed={9} />
      <div style={{ position: 'absolute', left: moon.x - moon.r, top: moon.y - moon.r + Math.sin(f / 20) * 6, width: moon.r * 2, height: moon.r * 2, borderRadius: '50%',
        boxShadow: `inset -36px -10px 0 0 #ffe7a8`, filter: 'drop-shadow(0 0 40px rgba(255,220,140,.55))', transform: 'rotate(-20deg)' }} />
      <AbsoluteFill style={{ alignItems: 'center', top: portrait ? H * 0.17 : H * 0.12 }}>
        <Headline dark eyebrow="离开电脑一会儿" parts={[['你走开，'], ['它们就睡', true], ['。']]} size={portrait ? 110 : 130} delay={2} />
      </AbsoluteFill>
      {(['yier', 'bubu'] as BearId[]).map((id, k) => {
        const x = W / 2 + (k ? 1 : -1) * gap;
        return <div key={id}>
          <Bear id={id} x={x} y={gy} size={size} state="sleep" pose={{ sx: 1 + Math.sin(f / 16 + k) * 0.02, sy: 1 - Math.sin(f / 16 + k) * 0.03 }} />
          {[0, 1, 2].map(z => {
            const t = ((f + z * 14 + k * 7) % 42) / 42;
            return <div key={z} style={{ position: 'absolute', left: x + size * 0.36 + t * 70, top: gy - size * 0.75 - t * 140, opacity: Math.sin(t * Math.PI),
              fontFamily: theme.fonts.sans, fontWeight: 900, fontSize: 40 + z * 10, color: 'rgba(255,255,255,.9)', transform: `rotate(${-10 + t * 20}deg)` }}>z</div>;
          })}
        </div>;
      })}
      <Sfx at={0} src="whoosh" volume={0.3} />
    </Scene>
  );
};

// ---------- 6 · CTA ----------
const Outro: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { W, H, portrait } = useLayout();
  const size = portrait ? 340 : 340, gy = portrait ? H * 0.45 : H * 0.84;
  const cx = portrait ? W / 2 : W * 0.3, gap = size * 0.31;
  const come = spring({ frame: f - 4, fps, config: theme.spring.smooth });
  const icon = spring({ frame: f - 14, fps, config: theme.spring.bouncy });
  const glow = 0.5 + Math.sin(f / 10) * 0.25;
  const txt = (at: number): React.CSSProperties => ({ opacity: ease(f, [at, at + 14], [0, 1]), transform: `translateY(${ease(f, [at, at + 14], [24, 0])}px)` });
  return (
    <Scene dur={dur} last>
      {(['yier', 'bubu'] as BearId[]).map((id, k) => (
        <Bear key={id} id={id} x={cx + (k ? 1 : -1) * gap * (1 + (1 - come) * 2.5)} y={gy} size={size} state="hug"
          pose={merge(breathe(f, k), { al: k ? 15 : 75, ar: k ? 75 : 15, blush: 1.35, rot: (k ? -1 : 1) * 4 * come })} />
      ))}
      <div style={{ position: 'absolute', left: cx - 30, top: gy - size * 1.55 + Math.sin(f / 12) * 10, transform: `scale(${ease(f, [24, 36], [0, 1], theme.ease.out)})` }}>
        <Heart size={60} />
      </div>
      <Burst x={cx} y={gy - size * 1.1} at={22} kind="heart" n={10} />
      <div style={{
        position: 'absolute', ...(portrait ? { left: 0, right: 0, top: H * 0.49, alignItems: 'center' } : { left: W * 0.52, top: H * 0.16, alignItems: 'flex-start' }),
        display: 'flex', flexDirection: 'column', gap: 26, fontFamily: theme.fonts.sans, textAlign: portrait ? 'center' : 'left',
      }}>
        <Img src={staticFile('icon.png')} style={{ width: 150, height: 150, borderRadius: 36, background: '#fff', boxShadow: '0 24px 50px -16px rgba(58,35,23,.35)',
          transform: `scale(${icon}) rotate(${(1 - icon) * -30}deg)` }} />
        <div style={{ fontWeight: 900, fontSize: portrait ? 104 : 116, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          <Reveal text="YierBubu-Pet" delay={20} per={1} />
        </div>
        <div style={{ fontWeight: 500, fontSize: portrait ? 40 : 42, color: C.dim, ...txt(34) }}>会陪你玩，还会帮你“吃掉”文件。</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          {['Windows', 'macOS', 'Linux'].map((p, i) => <Pill key={p} at={46 + i * 4} size={30}>{p}</Pill>)}
        </div>
        <Pill at={64} dark size={38} style={{ boxShadow: `0 0 50px ${C.hero}${Math.round(glow * 255).toString(16).padStart(2, '0')}, 0 16px 40px -12px rgba(58,35,23,.5)` }}>
          免费下载 · GitHub Releases
        </Pill>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? H * 0.09 : 44, textAlign: 'center', fontFamily: theme.fonts.sans, ...txt(76) }}>
        <div style={{ fontWeight: 500, fontSize: 30, color: C.bear }}>Designed by 黄小B · Powered by noSugarK</div>
        <div style={{ fontWeight: 500, fontSize: 20, color: C.dim, marginTop: 8 }}>一二、布布形象版权归原作者黄小B所有 · 非商业粉丝作品</div>
      </div>
      <Sfx at={0} src="whoosh" volume={0.3} /><Sfx at={22} src="chime" volume={0.4} /><Sfx at={64} src="pop" volume={0.5} />
    </Scene>
  );
};

export const Promo: React.FC = () => {
  const beat = useBeat();
  const parts = [Hook, Watch, Play, Feed, Sleep, Outro];
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile('audio/music.wav')} volume={0.45} />
      {parts.map((S, i) => {
        const from = at, dur = beat(SCENES[i]);
        at += dur;
        return <Sequence key={i} from={from} durationInFrames={dur}><S dur={dur} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
