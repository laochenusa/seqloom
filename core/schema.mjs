import Ajv from 'ajv';

const integer = {type: 'integer', minimum: 0};
const positive = {type: 'integer', minimum: 1};
const number = {type: 'number'};
const text = {type: 'string', minLength: 1, maxLength: 500};
const color = {type: 'string', pattern: '^#[0-9a-fA-F]{6}$'};
const gain = {type: 'number', minimum: 0, maximum: 1};
const pair = {type: 'array', items: number, minItems: 2, maxItems: 2};
const object = (properties, required = Object.keys(properties)) => ({type: 'object', properties, required, additionalProperties: false});
const version = {const: '1.0'};
const disabled = object({enabled: {const: false}});
const watermark = object({enabled: {const: true}, path: text, startFrame: integer, endFrame: positive, x: integer, y: integer, widthPx: positive, opacity: gain});
export const manifestSchema = object({
  schemaVersion: version, projectId: text, title: text,
  video: object({width: {enum: [1080, 1920]}, height: {enum: [1080, 1920]}, fps: {const: 30}, durationFrames: {...positive, maximum: 108000}}),
  timelinePath: text, captionsPath: text,
  audio: object({path: text}),
  subtitles: object({fontPath: text, fontSizePx: {...positive, maximum: 200}, color, outlineColor: color, outlineWidthPx: {type: 'number', minimum: 0, maximum: 12}, lineHeightPx: positive,
    box: object({x: integer, y: integer, width: positive, height: positive}), horizontalAlign: {const: 'center'}, verticalAlign: {const: 'center'}, maxLines: {const: 2}}),
  branding: object({watermark: {oneOf: [disabled, watermark]}}),
  output: object({fileName: text, burnSubtitles: {const: true}, encodingPreset: {const: 'h264-aac-1080p-v1'}})
});
const common = {id: text, path: text, startFrame: integer, endFrame: positive,
  fit: {enum: ['contain', 'cover']}, backgroundColor: color,
  transitionIn: {oneOf: [object({type: {const: 'cut'}, durationFrames: {const: 0}}), object({type: {const: 'dissolve'}, durationFrames: {type: 'integer', minimum: 6, maximum: 10}})]}};
const imageScene = object({...common, type: {const: 'image'}, motion: object({scaleStart: {type: 'number', exclusiveMinimum: 0, maximum: 4}, scaleEnd: {type: 'number', exclusiveMinimum: 0, maximum: 4}, offsetStartPx: pair, offsetEndPx: pair, easing: {const: 'linear'}})});
const videoScene = object({...common, type: {const: 'video'}, sourceStartFrame: integer, sourceEndFrame: positive});
export const timelineSchema = object({schemaVersion: version, scenes: {type: 'array', minItems: 1, maxItems: 1000, items: {oneOf: [imageScene, videoScene]}}});
export const captionsSchema = object({schemaVersion: version, cues: {type: 'array', minItems: 1, maxItems: 10000, items: object({id: text, startFrame: integer, endFrame: positive, text: {type: 'string', minLength: 1, maxLength: 300}})}});
const ajv = new Ajv({allErrors: true, strict: true});
const validators = {manifest: ajv.compile(manifestSchema), timeline: ajv.compile(timelineSchema), captions: ajv.compile(captionsSchema)};
export class PackageError extends Error {
  constructor(code, message, field = '') { super(message); this.code = code; this.field = field; }
}
export function assert(condition, code, message, field) {
  if (!condition) throw new PackageError(code, message, field);
}
export function validateShape(kind, data) {
  const valid = validators[kind];
  if (!valid(data)) {
    const details = valid.errors.slice(0, 6).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
    throw new PackageError('SCHEMA_INVALID', `配置不符合 v1 格式：${details}`, kind);
  }
}
