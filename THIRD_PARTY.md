# Third-party components

The Seqloom license covers project-authored code and documentation only. It does not relicense dependencies, runtime binaries, fonts, media, or generated input packages.

Direct dependencies and exact resolutions are recorded in `package.json` and `package-lock.json`. They include Remotion and its renderer/bundler/compositor, React, Electron, Electron Packager, Ajv, fontkit, yauzl/yazl, and sharp. Read each installed package's license and preserve its applicable notices when distributing it.

Remotion has its own licensing terms. A Seqloom license or separate resale permission does not provide a Remotion license or certify eligibility under its terms. Browser runtimes, Electron/Chromium, and the selected FFmpeg build have their own terms and potentially build-specific redistribution requirements.

This source repository excludes runtime binaries, node_modules, rendered exports, QA input media, and Windows fonts. Public binary distribution has not been cleared by this source-only release. Users supply their own properly licensed package assets and fonts.
