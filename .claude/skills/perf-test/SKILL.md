---
name: perf-test
description: Test the current change under throttled CPU/network profiles using subagents. Measures loading times (FCP, LoadingGate ready) and FPS (hero scene, scroll-through) against the production build. Use after a change that could affect performance, or when the user asks to perf-test, benchmark, or check FPS/loading impact.
---

# Throttled performance test

Measures how the site behaves for real visitors on weaker hardware/connections. Drives a real Chrome/Edge through the actual visitor flow — page load → LoadingGate arms → CONTINUE click → hero 3D scene → scroll through all sections — under CDP CPU and network throttling, via `scripts/measure.mjs` (uses the repo's existing `puppeteer-core`).

## Procedure

1. **Build the production bundle** (the dev server's unminified, on-demand-compiled output would corrupt every number):
   ```
   npm run build
   ```
   If the build fails, stop and report the error — there is nothing to measure. If `npm`/`node` aren't on PATH, run `node_modules\next\dist\bin\next build` with the runner resolved in step 2 (resolve it first in that case).

2. **Resolve a Node runtime.** Use `node` if it is on PATH. On this machine it may not be — the verified fallback is VS Code's Electron in Node mode, which must be launched with `Start-Process -Wait` (it's a GUI-subsystem exe, so plain invocation returns immediately without capturing output):

   ```powershell
   $env:ELECTRON_RUN_AS_NODE = '1'
   $p = Start-Process -FilePath "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" `
     -ArgumentList '.claude\skills\perf-test\scripts\measure.mjs','--label','<label>',<profile flags as separate quoted args>,'--port','<port>' `
     -WorkingDirectory '<repo root>' -Wait -PassThru -NoNewWindow `
     -RedirectStandardOutput "$env:TEMP\perf-<label>-out.json" -RedirectStandardError "$env:TEMP\perf-<label>-err.txt"
   Get-Content "$env:TEMP\perf-<label>-out.json"
   ```

3. **Run one subagent per profile, STRICTLY SEQUENTIALLY** (`run_in_background: false`, one at a time). Never run profiles in parallel: concurrent browsers contend for the same CPU and corrupt each other's FPS and throttling numbers.

   | Profile | Script args (from repo root) |
   |---|---|
   | baseline | `--label baseline --port 4173` |
   | mid-tier | `--label mid-tier --cpu 4 --latency 150 --down 1600 --up 750 --port 4174` |
   | low-end | `--label low-end --cpu 6 --latency 400 --down 500 --up 400 --port 4175` |
   | gpu-stress | `--label gpu-stress --software-gpu --port 4176` |

   The gpu-stress profile is opt-in: run it when the change touches the 3D scenes, materials, or shaders; skip it for changes that only affect loading or 2D UI. There is no real GPU throttle in the DevTools protocol — `--software-gpu` forces ANGLE onto SwiftShader (CPU rasterization), a worst-case-GPU stand-in. Its FPS numbers are only comparable to other gpu-stress runs, never to hardware profiles.

   Subagent prompt template (fill in runner + args):

   > From `<repo root>`, run `.claude/skills/perf-test/scripts/measure.mjs` with args: `<args>`, using this runner: `<node | the Electron fallback command above>`. The script serves the prebuilt `out/` directory itself — do not start any other server, and do not rebuild. It prints one JSON object to stdout (narration goes to stderr). If it errors with "No Chrome/Edge found", locate a Chrome or Edge executable on this machine and re-run with the `PERF_BROWSER` env var set to its path. If it errors with EADDRINUSE, re-run with a different `--port`. Return ONLY the final JSON object (plus, if a retry was needed, one line on what you fixed).

4. **Aggregate** the three JSON payloads into one comparison table:

   | Profile | FCP | Gate ready | Transferred | Hero FPS | Scroll FPS | p95 frame | Long frames |
   |---|---|---|---|---|---|---|---|

   Then interpret, briefly and concretely:
   - `gateTimedOut: true` means assets never reported in and the LoadingGate's 15s escape hatch opened the site — call this out loudly, it means visitors on that connection see a 15s loader.
   - Hero/scroll FPS ≥ ~55 is clean; 30–55 is visible jank on that profile; < 30 is bad.
   - `longFrames` counts frames over 26ms (missed at least one 60Hz frame) during a 5s window.
   - Relate findings to the change just made where you can (e.g. a heavier model → gate-ready regression; a new effect → hero FPS drop under CPU throttle).

## Judgment calls

- **Suspiciously low baseline FPS (< ~20 with no throttling)** usually means headless rendering fell back to software WebGL on this machine. Re-run the affected profiles with `--headed` appended (a visible browser window opens briefly) and say you did so.
- **Before/after comparison**: if the user wants numbers versus the pre-change state, run the same three profiles on the base commit in a separate worktree (`git worktree add` + `npm ci` + `npm run build` there), then present both runs side by side with deltas. Only do this when asked — it doubles the runtime.
- **Custom profiles**: the flags compose freely (`--cpu N`, `--latency ms`, `--down kbps`, `--up kbps`, `--fps-window ms`) if the user asks for a specific device/network target.
- **Visual check by the user**: `--inspect` opens a visible browser with the chosen throttles applied and takes no measurements — the user explores the site themselves and the script exits when they close the window. Combine with `--software-gpu` (or any throttle flags) to let them experience that profile first-hand.

## Caveats to include in the report

- Numbers are machine-relative: valid for comparing runs on this machine, not absolute predictions of a phone's FPS.
- CPU throttling multiplies main-thread cost only; GPU-bound cost is not throttled on the baseline/mid/low profiles. The gpu-stress profile covers the GPU axis, but as a software-rendering worst case, not a graduated throttle.
- The test server gzips text assets like GitHub Pages does, so transfer sizes approximate production; binary assets (GLB, images, fonts) are served as-is, also like Pages.
