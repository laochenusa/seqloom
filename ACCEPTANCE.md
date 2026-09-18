# Seqloom 1.0 alpha acceptance brief

## Purpose

Review this exact repository revision as a Windows desktop application that converts a compliant ZIP into one MP4 with burned-in captions. Review source, executable behavior, and package requirements separately. Report findings with severity, file/line, trigger, impact, and a reproduction or proposed verification. Do not infer a test pass from code inspection or the author's report.

## Agreed scope

- English application interface, progress, and package requirements; preserve content languages.
- Import or drop one ZIP, validate it, choose an output folder, render, cancel/retry, open output/play.
- Package Requirements dialog with one-click copying of the actual contract and schemas.
- Landscape 1920x1080 or portrait 1080x1920, constant 30fps, H.264/AAC MP4, hard captions.
- Deterministic scene timing, image movement, cuts/dissolves, and optional PNG watermark.
- One already-complete PCM WAV soundtrack, starting at frame zero and matching the full timeline.
- Opening/closing segments and their joins are supplied upstream in the timeline. No special intro/outro imports, references, audio stitching, or mixing. Embedded source video audio stays muted.
- Local processing without AI, credentials, asset downloads, or inferred repairs.

Out of scope: timeline editor, preview editor/player, soft subtitles, second caption-free export, batch processing, cloud rendering, publishing, AI normalization, and standalone intro/outro import. Source redistribution is allowed subject to LICENSE; business video production is allowed, but software resale requires permission.

## Acceptance checklist

1. A compliant ZIP with real media renders; missing files, invalid hashes, unsafe paths, invalid schemas, timeline gaps, bad media, and caption overflow fail with an actionable message.
2. Final MP4 has the exact requested video frame count, dimensions and rate. Caption boundaries and scene transitions match the supplied frames. Audio markers stay synchronized.
3. A shorter or longer final soundtrack is rejected; the application does not pad, trim, delay, mix or infer audio. Embedded clip audio is not heard.
4. Opening/closing scenes already in the package play once at their supplied positions. No extra clip is inserted and there is no separate intro/outro import control.
5. Cancellation does not publish a final or incomplete MP4 as success; retry produces a fresh output directory. Source ZIP and existing outputs are preserved.
6. Copy Requirements returns current English requirements and machine schemas. Generated docs agree with runtime validation.
7. Review Windows paths, ZIP extraction limits, IPC boundaries, font loading, process termination, temporary file lifecycle, memory/disk pressure, and errors during render or output verification.
8. Build a portable app, run it on a clean Windows machine offline, import via native picker and drag/drop, render both aspect ratios, and exercise cancel/retry/open/play.

## Review entry points

| Concern | Files |
| --- | --- |
| Package contract | `core/schema.mjs`, `core/validate.mjs`, `docs/package-requirements.txt` |
| Archive and process handling | `core/io.mjs` |
| Rendering and sound | `composition/index.jsx`, `core/engine.mjs` |
| Desktop and IPC | `desktop/main.cjs`, `desktop/preload.cjs`, `desktop/ui.js`, `core/worker.mjs` |
| Reproducible checks | `test/`, `scripts/fixtures.mjs`, `scripts/check-precision.mjs`, `scripts/check-cancel.mjs` |

## Commands

Source-level contract checks need installed Node dependencies but no media runtime:

```text
npm ci
node --test test/contract.test.mjs
npm run build:requirements
git diff --exit-code -- docs
```

For media and desktop checks, first follow `docs/runtime-setup.md`:

```text
npm run build:composition
npm run fixtures
npm test
node scripts/verify-run.mjs precision-15s
node scripts/check-precision.mjs
node scripts/check-cancel.mjs
npm start
```

Use `node scripts/verify-run.mjs shorts-42s landscape-265s` for longer coverage. Synthetic fixtures demonstrate technical behavior, not editorial correctness. Do not approve a Windows user flow solely because headless core tests pass.

## Current limitations

Read `docs/validation.md` and `docs/acceptance-progress.md` for actual evidence. Portable packaging, a clean-machine run, full native desktop import/export coverage, maximum-size input stress testing, and final-version long-form validation require independent acceptance. Application-defined diagnostics and report names are English; package content and OS-supplied messages can retain their original language. Task caches currently require manual housekeeping. Protocol v1 is an alpha contract and legacy draft packages may be incompatible.

No promise is made that source review alone establishes distribution readiness, factual correctness of video content, or third-party redistribution permissions.
