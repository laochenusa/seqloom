import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Freeze, Img, OffthreadVideo, continueRender, delayRender, registerRoot, useCurrentFrame} from 'remotion';

const url = (base, p) => base + p.split('/').map(encodeURIComponent).join('/');
function Scene({scene: s, frame, base}) {
  const local = Math.max(0, Math.min(s.endFrame - s.startFrame - 1, frame - s.startFrame));
  const p = s.endFrame - s.startFrame === 1 ? 0 : local / (s.endFrame - s.startFrame - 1);
  let transform;
  if (s.type === 'image') {
    const m = s.motion, lerp = (a, b) => a + (b - a) * p;
    transform = `translate(${lerp(m.offsetStartPx[0], m.offsetEndPx[0])}px, ${lerp(m.offsetStartPx[1], m.offsetEndPx[1])}px) scale(${lerp(m.scaleStart, m.scaleEnd)})`;
  }
  return <AbsoluteFill style={{backgroundColor: s.backgroundColor, overflow: 'hidden'}}>
    {s.type === 'image' ? <Img src={url(base, s.path)} style={{width: '100%', height: '100%', objectFit: s.fit, transform}} />
      : <Freeze frame={local}><OffthreadVideo src={url(base, s.path)} startFrom={s.sourceStartFrame} muted style={{width: '100%', height: '100%', objectFit: s.fit}} /></Freeze>}
  </AbsoluteFill>;
}
function Video({plan, assetBase}) {
  const frame = useCurrentFrame(), {manifest: m, scenes, cues} = plan;
  const [handle] = useState(() => delayRender('读取字幕字体'));
  useEffect(() => {
    const font = new FontFace('PackageSubtitle', `url("${url(assetBase, m.subtitles.fontPath)}")`);
    font.load().then(f => {document.fonts.add(f); continueRender(handle);}).catch(e => {console.error(e);});
  }, [handle, assetBase, m.subtitles.fontPath]);
  const index = scenes.findIndex(s => frame >= s.startFrame && frame < s.endFrame);
  const scene = scenes[index], previous = scenes[index - 1];
  const incoming = scene?.transitionIn.type === 'dissolve' && frame - scene.startFrame < scene.transitionIn.durationFrames;
  const cue = cues.find(c => c.startFrame <= frame && frame < c.endFrame), st = m.subtitles, wm = m.branding.watermark;
  return <AbsoluteFill style={{backgroundColor: '#000'}}>
    {incoming && previous && <Scene scene={previous} frame={previous.endFrame - 1} base={assetBase} />}
    {scene && <AbsoluteFill style={{opacity: incoming ? (frame - scene.startFrame + 1) / scene.transitionIn.durationFrames : 1}}><Scene scene={scene} frame={frame} base={assetBase} /></AbsoluteFill>}
    {wm.enabled && frame >= wm.startFrame && frame < wm.endFrame && <Img src={url(assetBase, wm.path)} style={{position: 'absolute', left: wm.x, top: wm.y, width: wm.widthPx, opacity: wm.opacity}} />}
    {cue && <div style={{position: 'absolute', left: st.box.x, top: st.box.y, width: st.box.width, height: st.box.height, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: 'PackageSubtitle', fontWeight: 400, fontSize: st.fontSizePx, lineHeight: `${st.lineHeightPx}px`, color: st.color, WebkitTextStroke: `${st.outlineWidthPx}px ${st.outlineColor}`, paintOrder: 'stroke fill', whiteSpace: 'pre', textAlign: 'center'}}>{cue.text}</div>
    </div>}
  </AbsoluteFill>;
}
registerRoot(() => <Composition id="PackageVideo" component={Video} width={1920} height={1080} fps={30} durationInFrames={450} calculateMetadata={({props}) => ({width: props.plan.manifest.video.width, height: props.plan.manifest.video.height, fps: 30, durationInFrames: props.plan.manifest.video.durationFrames})} />);
