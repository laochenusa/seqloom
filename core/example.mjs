export function exampleManifest({portrait = false, frames = 450, title = '15-second precision test'} = {}) {
  return {
    schemaVersion: '1.0', projectId: 'test-001', title,
    video: {width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080, fps: 30, durationFrames: frames},
    timelinePath: 'scene-timing.json', captionsPath: 'captions.json',
    audio: {path: 'audio/final.wav'},
    subtitles: {fontPath: 'fonts/subtitle.ttf', fontSizePx: 52, color: '#FFFFFF', outlineColor: '#000000', outlineWidthPx: 2, lineHeightPx: 72,
      box: portrait ? {x: 80, y: 1380, width: 800, height: 180} : {x: 160, y: 800, width: 1600, height: 180}, horizontalAlign: 'center', verticalAlign: 'center', maxLines: 2},
    branding: {watermark: {enabled: false}},
    output: {fileName: 'video.mp4', burnSubtitles: true, encodingPreset: 'h264-aac-1080p-v1'}
  };
}
export function imageScene(id, startFrame, endFrame, asset) {
  return {id, path: asset, type: 'image', startFrame, endFrame, fit: 'contain', backgroundColor: '#091426',
    motion: {scaleStart: 1, scaleEnd: 1, offsetStartPx: [0, 0], offsetEndPx: [0, 0], easing: 'linear'}, transitionIn: {type: 'cut', durationFrames: 0}};
}
