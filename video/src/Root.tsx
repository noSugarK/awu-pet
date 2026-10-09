import { Composition } from 'remotion';
import { Promo, DURATION_BEATS } from './Promo';

const fps = 30;
const frames = Math.round((DURATION_BEATS * 60 * fps) / 120);

export const Root: React.FC = () => (
  <>
    <Composition id="Landscape" component={Promo} durationInFrames={frames} fps={fps} width={1920} height={1080} />
    <Composition id="Portrait" component={Promo} durationInFrames={frames} fps={fps} width={1080} height={1920} />
  </>
);
