# Seqloom 1.0 alpha

Local, deterministic video production from validated ZIP packages. The interface and package requirements default to English; project titles, media names and captions preserve their original language.

## Scope

Import ZIP → validate → render one hard-subtitled MP4 → inspect output. Includes progress, cancel/retry, open output folder, and **Package Requirements → Copy Requirements**. No editor, preview, AI integration, publishing or batch queue.

The package supplies one complete soundtrack and a complete timeline. Any intro/outro and its joins must be prepared upstream. All embedded clip audio is muted. Separate intro/outro import and assembly are deferred to a future version.

**Status: source alpha for independent acceptance review.** Start with [ACCEPTANCE.md](ACCEPTANCE.md), [package requirements](docs/package-requirements.txt), and [validation evidence](docs/validation.md). This repository does not include a signed installer or third-party runtime binaries.

## Run the Windows build

After preparing the runtimes and running `npm run package:win`, open `dist/Seqloom-win32-x64/Seqloom.exe`. Keep the entire directory together. A complete portable build includes its runtimes; Node.js and Python are not needed on the destination machine. Packaging and clean-machine verification remain acceptance tasks, not a claim that a downloadable release is available.

1. Open **Package Requirements** and copy the specification for your package creator.
2. Drop a compliant ZIP or click **Choose Package**.
3. Resolve validation errors upstream, then import the corrected package.
4. Choose an output folder and click **Render Video**.
5. After output checks pass, click **Play Video** or **Open Output Folder**.

Native Windows file pickers follow the Windows display language. The application itself uses English.

Legacy or arbitrary production ZIPs are **not** silently converted. Protocol v1 requires verified timed captions, a supplied font, a complete PCM soundtrack and the exact schema.

## Outputs

Each run creates a new directory containing an MP4, a technical report, a production record and media inspection details. Existing outputs and source ZIPs are never overwritten. A failure never creates a successful final MP4.

Technical checks do not judge news accuracy, asset semantics, transcript accuracy or listening quality. These remain upstream responsibilities.

## Development

The source project uses Node.js, Electron 40.10.6, Remotion 4.0.524 and FFmpeg 7.1. Exact dependency versions are recorded in package-lock.json.

```text
npm ci
node scripts/build-requirements-en.mjs
node scripts/build-composition.mjs
npm start
```

Use Node.js 22 or newer on Windows x64. The local rendering browser is under `runtime/chrome/` (including `chrome-headless-shell.exe` and its companion files); a full FFmpeg binary is `runtime/ffmpeg.exe`. These must be supplied separately from their respective distributors under their licenses. See [runtime setup](docs/runtime-setup.md). The Remotion compositor and ffprobe are production dependencies. A packaged app must contain these resources and `composition-bundle/` to run offline.

## Validation

```text
node scripts/fixtures.mjs
node --test test/*.test.mjs
node scripts/verify-run.mjs precision-15s shorts-42s landscape-265s
node scripts/check-precision.mjs
```

Fixtures are synthetic QA inputs, not completed real programs. Their audio uses known tone markers to measure alignment; local fixture fonts are copied from this Windows machine and excluded from the application distribution.

The 15-second test checks actual decoded MP4 frames around caption and dissolve boundaries, and known decoded audio markers. JSON in `qa/` records actual results. Timing numbers are observations on this machine; overlapping build activity can affect them.

## License

[Seqloom No-Resale License 1.0](LICENSE). Personal and business use, including monetized videos and paid client video work, is allowed. Selling the original or modified software, paid installers, or software bundles containing it requires separate written permission. Free redistribution must preserve the license. This is source-available software with a resale restriction.

For paid software distribution permission, contact the repository owner. Dependency and runtime licenses remain separate; see [THIRD_PARTY.md](THIRD_PARTY.md).

## Current limits

- Windows x64 only; no clean-machine installation test yet.
- 1080p landscape or portrait, 30fps, up to one hour as a protocol limit; this is not a tested one-hour performance guarantee.
- One task at a time. A retry renders from the beginning.
- No automatic recovery after application/process crashes; reimport and retry.
- Package snapshots are retained under the application data tasks directory in this alpha. Long-term cache cleanup is not yet implemented.
- Rendering memory measurements currently cover the Node engine process only, not the entire browser/encoder process tree.
- Component licenses are retained; this local evaluation build has not been prepared for public commercial redistribution.

The copied package requirements and JSON schemas are generated from the same schema module as validation. Edit `core/schema.mjs`, semantic validation and the requirements preamble together, then regenerate the documents.
