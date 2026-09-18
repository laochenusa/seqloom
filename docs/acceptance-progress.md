# Acceptance follow-up progress

This page records completed work and remaining gates after the first source review. It is not a release approval. See [GitHub Actions](https://github.com/laochenusa/seqloom/actions) for live remote checks.

| Review item | Status | Evidence / next step |
| --- | --- | --- |
| Original commit CI evidence | Verified success | [Run 35387731717](https://github.com/laochenusa/seqloom/actions/runs/35387731717), commit `ffa4705ed79bded4355cc0e7a4a972945ec9fb29`, completed 2026-09-18 19:46:38 UTC |
| Exact Electron version | Implemented | `package.json` and lockfile use `40.10.6`; packager reads that same version |
| English backend diagnostics/reports | Implemented | Application-defined errors, stages and report names/text are English; package content retains its language |
| Package negative tests in CI | Passed | [Run 35389602056](https://github.com/laochenusa/seqloom/actions/runs/35389602056), `package-tests` runs all 13 tests; also passed locally with the same open-source test font |
| 42-second portrait pipeline | Passed locally | [Decoded evidence](evidence/shorts-42s-check.json): 1,260 frames, complete decode, caption boundaries, three audio markers, no unexpected audio |
| 265-second landscape pipeline | Passed locally | [Decoded evidence](evidence/landscape-265s-check.json): 7,951 frames (265.033 seconds), complete decode, caption boundaries, opening/closing scene positions, soundtrack markers and no embedded clip-audio leakage |
| Portable build and bundled-runtime check | Passed locally and on GitHub Windows | [Remote evidence](evidence/portable-github-de7d8e5.json), [local evidence](evidence/portable-local.json); EXE rendered, cancelled and retried from a separate temporary directory with a system-only PATH |
| Native desktop interaction on a clean Windows machine | Pending | Native picker, real drag/drop, copy, cancel/retry, play and open-folder need desktop evidence. Local UI automation could not proceed because application-control approval timed out |
| Actual offline clean-machine test | Pending | A hosted runner or a system-only PATH does not establish offline, clean-user-machine acceptance |

The original run did execute GitHub Actions checks successfully. GitHub's legacy combined-status endpoint can be empty when results are published as check runs; the workflow run URL and matching commit SHA are the evidence used here.

All three jobs (contract, package-tests, portable-core) passed for code commit `de7d8e5de0fb18b036307e7907ed3027ed836826` in [run 35389602056](https://github.com/laochenusa/seqloom/actions/runs/35389602056), completed 2026-09-18 20:09:06 UTC. A locally generated portable folder exists, but no public binary release or signed installer is being claimed.

## Issues found while filling the evidence gap

- Packaging initially stalled because an async function was supplied to a callback-based `afterCopy` hook. The script now writes the README after `packager()` resolves. The failed run remains visible at [35389312845](https://github.com/laochenusa/seqloom/actions/runs/35389312845); the fix is commit `de7d8e5`.
- The first long-form pixel check used a per-channel RGB tolerance of 12. The closing clip differed by 13 in one channel after the untagged H.264/YUV input passed through output color conversion. Scene identity was correct. The check now explicitly classifies the nearest known fixture color, with a distance bound, and publishes raw RGB samples. It does not certify color fidelity; that remains outside the result being claimed.

The executable and runtime code were not changed to obtain the final long-form scene-classification result. Full clean-machine desktop and actual offline acceptance remain open gates.
