# Acceptance follow-up progress

This page records completed work and remaining gates after the first source review. It is not a release approval. See [GitHub Actions](https://github.com/laochenusa/seqloom/actions) for live remote checks.

| Review item | Status | Evidence / next step |
| --- | --- | --- |
| Original commit CI evidence | Verified success | [Run 35387731717](https://github.com/laochenusa/seqloom/actions/runs/35387731717), commit `ffa4705ed79bded4355cc0e7a4a972945ec9fb29`, completed 2026-09-18 19:46:38 UTC |
| Exact Electron version | Implemented | `package.json` and lockfile use `40.10.6`; packager reads that same version |
| English backend diagnostics/reports | Implemented | Application-defined errors, stages and report names/text are English; package content retains its language |
| Package negative tests in CI | Implemented, awaiting remote result | Windows `package-tests` job prepares pinned FFmpeg and checksum-verified open-source CJK font, then runs `npm test` |
| 42-second portrait pipeline | Passed locally | [Decoded evidence](evidence/shorts-42s-check.json): 1,260 frames, complete decode, caption boundaries, three audio markers, no unexpected audio |
| 265-second landscape pipeline | Running locally | Full render in progress; not counted as passed |
| Portable build and bundled-runtime check | Implemented, awaiting execution | `portable-core` job builds the EXE and tests cancel/retry/render from a separate temporary directory with a system-only PATH |
| Native desktop interaction on a clean Windows machine | Pending | Native picker, real drag/drop, copy, cancel/retry, play and open-folder need desktop evidence |
| Actual offline clean-machine test | Pending | A hosted runner or a system-only PATH does not establish offline, clean-user-machine acceptance |

The original run did execute GitHub Actions checks successfully. GitHub's legacy combined-status endpoint can be empty when results are published as check runs; the workflow run URL and matching commit SHA are the evidence used here.

The current follow-up has passed the eight source contract tests locally. Full new remote-job outcomes will be recorded once they complete. No binary release or signed installer is being claimed.
