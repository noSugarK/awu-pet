// One bear, drawn by the site's renderer (scripts/bears.mjs → bears.generated.json) and posed per frame.
import '../../docs/css/pet.css';
import './bear.css';
import data from './bears.generated.json';

export type BearId = 'yier' | 'bubu';
// arms: degrees outward from hanging; legs: px lifted; tilt: head degrees; fx/fy: face shift;
// lift: whole bear px up; sx/sy: squash; rot: lean; gape/chomp: mouth scales; blush: cheek scale
export type Pose = Partial<Record<'al' | 'ar' | 'll' | 'lr' | 'tilt' | 'fx' | 'fy' | 'lift' | 'sx' | 'sy' | 'rot' | 'gape' | 'chomp' | 'blush', number>>;

const bears = data as unknown as Record<BearId, { svg: string; model: any }>;

// a point of the model (viewBox units) in px relative to the bear's bottom-centre
export const anchor = (id: BearId, size: number, [ux, uy]: [number, number]) => {
  const [W, H] = bears[id].model.viewBox;
  return { x: ((ux - W / 2) / W) * size, y: -((H - uy) / W) * size };
};
export const mouthAnchor = (id: BearId, size: number) => {
  const m = bears[id].model;
  return anchor(id, size, [m.face.mouth[0], m.face.mouth[1] + m.face.eyeR * 3.1]);
};
export const headTop = (id: BearId, size: number) => anchor(id, size, [100, 0]);

export const Bear: React.FC<{
  id: BearId; x: number; y: number; size: number; state?: string; outfit?: string[]; pose?: Pose; shadow?: boolean;
}> = ({ id, x, y, size, state = 'normal', outfit = [], pose = {}, shadow = true }) => {
  const { svg, model: m } = bears[id];
  const h = (size * m.viewBox[1]) / m.viewBox[0];
  const p = { al: m.arm.rest, ar: m.arm.rest, ll: 0, lr: 0, tilt: 0, fx: 0, fy: 0, lift: 0, sx: 1, sy: 1, rot: 0, gape: 1, chomp: 1, blush: 1, ...pose };
  const sleepArm = `translate(${m.arm.sleep.shift[0]}px, ${m.arm.sleep.shift[1]}px) rotate(${m.arm.sleep.rotate}deg)`;
  const arm = (a: number) => (state === 'sleep' ? sleepArm : `rotate(${a}deg)`);
  const vars = {
    '--al': arm(p.al), '--ar': arm(p.ar), '--ll': `${-p.ll}px`, '--lr': `${-p.lr}px`, '--tilt': `${p.tilt}deg`,
    '--fx': `${p.fx}px`, '--fy': `${p.fy}px`, '--gape': p.gape, '--chomp': p.chomp, '--blush': p.blush,
    '--sleep-drop': `${m.ground - m.neck.y}px`,
  } as React.CSSProperties;
  const away = Math.min(1, p.lift / h);
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - h, width: size, height: h }}>
      {shadow && (
        <div style={{
          position: 'absolute', left: '22%', right: '22%', bottom: '-2.5%', height: '7%', borderRadius: '50%',
          background: 'rgba(74,44,32,.18)', transform: `scale(${1 - away * 0.5})`, opacity: 1 - away * 0.6,
        }} />
      )}
      <div
        className={`vb s-${state} ${outfit.map(o => 'o-' + o).join(' ')}`}
        style={{ ...vars, width: '100%', height: '100%', transformOrigin: '50% 98%',
          transform: `translateY(${-p.lift}px) rotate(${p.rot}deg) scale(${p.sx}, ${p.sy})` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};
