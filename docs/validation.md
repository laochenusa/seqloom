# Local validation record

Date: 2026-09-18. Platform: Windows x64. Scope: source alpha with the single-final-soundtrack contract. These are author-run technical checks, not independent acceptance.

| Check | Observed result |
| --- | --- |
| Contract and package tests | 13 passed, 0 failed (`node --test test/contract.test.mjs test/package.test.mjs`) |
| 15-second complete pipeline | Passed: 1920x1080, 30fps, 450 frames, H.264/AAC, full output decode |
| Captions and dissolve timing | Passed: decoded frame checks around caption start/end and both dissolve boundaries |
| Final soundtrack alignment | Passed: measured tone starts 1.000041667, 5.000041667, 10.000041667 seconds; max observed offset about 0.042 ms |
| Cancel during rendering | Passed: no final/incomplete MP4 remained; original input ZIP remained |
| 42-second portrait complete pipeline | Passed: 1080x1920, 1,260 frames, full decode, decoded caption boundaries and audio markers; [evidence](evidence/shorts-42s-check.json) |
| 265-second landscape complete pipeline | Passed: 1920x1080, 7,951 frames (265.033 seconds), full decode, caption boundaries, opening/closing scene classification and soundtrack markers; [evidence](evidence/landscape-265s-check.json) |
| Portable build and isolated runtime | Passed locally and on GitHub Windows: packaged Electron, system-only PATH, independent temporary directory, cancel/retry and 450-frame render. Native GUI and actual network isolation were not tested |
| English UI and Copy Requirements | Inspected in the development app; copy success indicator observed; full Windows flow not accepted |

[Machine-readable selected evidence](evidence/local-validation.json) includes input/output hashes, frame/color checks, audio marker measurements, cancellation assertions, and timings without personal paths. The full output video, supplied Windows font and source media are excluded from the repository.

The 15-second render took about 198 seconds plus about 39 seconds for input checks during this run. This is a measured observation on the test machine under concurrent activity, not a speed guarantee or an optimized benchmark.

The current-contract 42-second render took 133.358 seconds plus 3.904 seconds for input checks. The 265.033-second render took 1,026.872 seconds plus 11.207 seconds for input checks. Other work ran concurrently. The long-form pixel classifier identifies scenes, not exact color fidelity; raw values and the initial tolerance mismatch are documented in [acceptance progress](acceptance-progress.md).

The final soundtrack's three tone onsets measured approximately 1.000041667, 5.000041667 and 10.000041667 seconds in both longer outputs. No unexpected audio samples above the test threshold were found, including the opening/closing intervals whose source clips contain their own tones.

## Not yet established

- Full native Windows pick/drop/render/play workflow and current clipboard contents independently verified end to end.
- A clean-user-machine offline run and native desktop end-to-end interaction. A packaged-runtime check on a hosted Windows runner is narrower than this acceptance gate.
- Real editorial packages, maximum size/duration stress, all cancellation stages and disk exhaustion.
- Visual/editorial/audio listening approval by a human; render timing tests do not establish narrative quality.
- Third-party binary redistribution readiness, installer signing, final release readiness.

The original commit `ffa4705ed79bded4355cc0e7a4a972945ec9fb29` passed [GitHub Actions run 35387731717](https://github.com/laochenusa/seqloom/actions/runs/35387731717), completed 2026-09-18 19:46:38 UTC. That run covered source contract tests and generated requirements, not package/media tests. Expanded jobs are tracked in [acceptance progress](acceptance-progress.md); their configuration alone is not evidence of success.

Expanded validation passed for code commit `de7d8e5de0fb18b036307e7907ed3027ed836826`: [run 35389602056](https://github.com/laochenusa/seqloom/actions/runs/35389602056), all three jobs successful. The downloaded [remote portable result](evidence/portable-github-de7d8e5.json) and [local portable result](evidence/portable-local.json) explicitly record `nativeDesktopUiTested=false` and `networkIsolationTested=false`.
