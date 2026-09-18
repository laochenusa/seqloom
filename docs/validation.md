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
| English UI and Copy Requirements | Inspected in the development app; copy success indicator observed; full Windows flow not accepted |

[Machine-readable selected evidence](evidence/local-validation.json) includes input/output hashes, frame/color checks, audio marker measurements, cancellation assertions, and timings without personal paths. The full output video, supplied Windows font and source media are excluded from the repository.

The 15-second render took about 198 seconds plus about 39 seconds for input checks during this run. This is a measured observation on the test machine under concurrent activity, not a speed guarantee or an optimized benchmark.

## Not yet established

- Full native Windows pick/drop/render/play workflow and current clipboard contents independently verified end to end.
- Portable package installation or a clean-machine offline run.
- Current-contract 265-second landscape complete output validation is in progress; it is not counted as passed yet.
- Real editorial packages, maximum size/duration stress, all cancellation stages and disk exhaustion.
- Visual/editorial/audio listening approval by a human; render timing tests do not establish narrative quality.
- Third-party binary redistribution readiness, installer signing, final release readiness.

The original commit `ffa4705ed79bded4355cc0e7a4a972945ec9fb29` passed [GitHub Actions run 35387731717](https://github.com/laochenusa/seqloom/actions/runs/35387731717), completed 2026-09-18 19:46:38 UTC. That run covered source contract tests and generated requirements, not package/media tests. Expanded jobs are tracked in [acceptance progress](acceptance-progress.md); their configuration alone is not evidence of success.
