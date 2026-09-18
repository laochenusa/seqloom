# Windows development runtime setup

The repository contains application source, not browser/encoder binaries or third-party fonts.

1. Install Node.js 22 or newer on Windows x64, then run `npm ci`.
2. Obtain the Chrome Headless Shell version compatible with the locked Remotion renderer using Remotion's browser installation tooling. Copy the complete Windows x64 browser directory into `runtime/chrome/`; `runtime/chrome/chrome-headless-shell.exe` must exist. Consult the installed renderer documentation or `npx remotion browser --help` after separately installing the matching Remotion CLI; that CLI is not a project dependency.
3. Obtain a full Windows x64 FFmpeg build and place its executable at `runtime/ffmpeg.exe`. The local alpha was tested with FFmpeg 7.1. The stripped Remotion compositor FFmpeg is not a substitute: fixture generation and decoding checks need full filters/encoders.
4. Run `npm run build:composition` and `npm run build:requirements`.
5. Local fixture generation defaults to `C:/Windows/Fonts/simhei.ttf`. Alternatively set `SEQLOOM_TEST_FONT` to a TTF or OTF with the Chinese and Latin glyphs used in the tests. Use a font you are authorized to use. Fixture fonts are not included in the repository or distribution.
6. Run the checks in `ACCEPTANCE.md`, then `npm start`.

`npm run package:win` uses Electron Packager and may download Electron. Keep the entire output directory together. Check included runtime/dependency notices and applicable distribution terms before distributing binaries. Clean-machine testing remains required.

The runtime directories are intentionally ignored by Git. No API key is required. The application itself does not fetch assets or run AI calls while rendering; developer dependency/browser installation requires network access.
