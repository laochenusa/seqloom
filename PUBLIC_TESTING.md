# Seqloom Public Source Testing Guide

Seqloom is currently provided as a **public source repository** for independent testing, technical validation, and source review.

At this stage, the project **does not distribute prebuilt Windows installers, portable application binaries, or third-party runtime binaries**. Testers build and run Seqloom in their own Windows environment and obtain the required third-party runtimes separately.

## 1. Test Environment

Recommended environment:

- Windows x64
- Node.js 22 or later
- Git
- npm dependencies locked by this repository
- Chrome Headless Shell
- FFmpeg

Clone the repository and install the locked dependencies:

```text
git clone https://github.com/laochenusa/seqloom.git
cd seqloom
npm ci
```

## 2. Prepare Chrome Headless Shell

Run:

```text
node scripts/setup-browser.mjs
```

This prepares the Chrome Headless Shell version selected by the locked Remotion renderer.

The browser runtime must be located under:

```text
runtime/chrome/
```

including:

```text
runtime/chrome/chrome-headless-shell.exe
```

and its required companion files.

Alternatively, testers may obtain a compatible Windows x64 Chrome Headless Shell themselves and place the complete runtime directory at the location above.

## 3. Prepare FFmpeg

Testers must obtain a compatible Windows x64 FFmpeg build separately.

Place the executable at:

```text
runtime/ffmpeg.exe
```

The current Seqloom alpha has been tested with FFmpeg 7.1.

Testers are responsible for verifying the source, license, redistribution terms, and other applicable conditions of the FFmpeg build they choose to use.

## 4. Build Local Resources

Run:

```text
npm run build:composition
npm run build:requirements
```

Then run the project tests:

```text
npm test
```

For the complete acceptance procedure, follow `ACCEPTANCE.md`.

Some media and end-to-end checks require additional local test resources as described in the acceptance and runtime setup documentation.

## 5. Start Seqloom

After preparing the required environment, run:

```text
npm start
```

Seqloom will start as a Windows desktop application.

A compliant production package follows the basic workflow:

```text
Import ZIP
→ Validate
→ Render
→ Output MP4
```

Testers may also review cancellation and retry behavior, output verification, opening and playing generated files, drag-and-drop import, and the Package Requirements interface.

## 6. Third-Party Components

The Seqloom license applies only to project-authored code and documentation covered by that license.

Node.js, Electron, Chromium / Chrome Headless Shell, FFmpeg, Remotion, React, and other dependencies remain subject to their respective licenses and terms.

**This source repository does not distribute FFmpeg, Chrome Headless Shell, Windows fonts, or other external runtime binaries.**

Testers must obtain required third-party components from their respective projects or other authorized sources and are responsible for complying with the applicable licenses and terms.

For additional information, see `THIRD_PARTY.md` and `docs/runtime-setup.md`.

Installing project dependencies with `npm ci` may download third-party packages required to build and run Seqloom. Those packages remain governed by their own licenses and terms.

## 7. Current Release Model

Seqloom is currently distributed as:

**Source Alpha / Public Testing**

The public repository is intended to allow developers and testers to:

- inspect and review the source code;
- independently reproduce the development environment;
- verify the package protocol and validation rules;
- test frame-based scene, caption, transition, and audio synchronization;
- evaluate the Windows desktop workflow;
- reproduce documented technical checks; and
- report defects and independent test results.

Seqloom currently **does not provide an official prebuilt installer or portable binary distribution**.

The availability of source code does not imply that third-party runtime binaries have been cleared for redistribution as part of a Seqloom binary release.

## 8. Test Media and Generated Output

Testers are responsible for ensuring that they have the necessary rights to use any fonts, audio, images, video clips, logos, or other media included in their test or production packages.

Seqloom does not claim ownership of user-supplied input assets or generated video output.

Technical validation performed by Seqloom does not establish copyright ownership, factual accuracy, editorial accuracy, transcript accuracy, or other rights associated with the supplied content.

## 9. Alpha Status

Seqloom 1.0 is currently an alpha release intended for testing and independent review.

Successful source-level or local testing should not be interpreted as certification of production readiness, binary redistribution compliance, or compatibility with every Windows environment.

Please report reproducible issues with the relevant environment information, test package characteristics, error details, and steps required to reproduce the problem.
