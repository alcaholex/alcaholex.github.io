# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — static export to `out/` (`output: 'export'` in next.config.mjs)
- `npm run lint` — ESLint (eslint-config-next)

There are no tests. Deployment is automatic: pushing to `main` runs `.github/workflows/nextjs.yml`, which builds and publishes `out/` to GitHub Pages. Do not add a `static_site_generator` input to the configure-pages action in that workflow — it generates a competing `next.config.js` that shadows ours and breaks the export (see the comment in the workflow).

## What this is

A single-page portfolio site: Next.js 15 App Router, plain JavaScript (no TypeScript), Tailwind CSS v4 (configured in CSS via `@theme` in `src/app/globals.css`, no tailwind.config file). Everything is a client component; the only page is `src/app/page.js`, composed of full-screen sections (`section-1` hero … `section-4` art) that the navbar scrolls between.

## Architecture

Several cross-cutting systems interact — most components touch more than one of them:

**Loading gate → audio unlock.** `LoadingGate.js` covers the viewport until all three 3D scenes report in. Each scene calls `useAssetReady(id)` with one of the ids in `ASSETS` (`'name'`, `'projects'`, `'art'`) — adding a new gated asset means adding its id there. The progress bar morphs into a CONTINUE button; that click is the site's first guaranteed user gesture and calls `sfx.unlock()` to enable audio. A 15s timeout opens the site anyway if a scene never reports. While gating, `html.is-loading` blocks native scroll *and* Lenis is explicitly stopped (Lenis moves scrollTop programmatically, so CSS overflow alone isn't enough).

**Smooth scrolling.** `SmoothScroll.js` owns a single Lenis instance exposed via the `useLenis()` context hook. Components that scroll programmatically must go through Lenis, not `window.scrollTo`. Navbar-initiated scrolls are tagged `userData: { nav: true }` so `SlideInSection` can tell a passing navigation from a user swipe when deciding whether to snap/commit a section.

**3D scenes.** Three R3F canvases (`ThreeDName.js` hero, `ProjectsTitle.js`, `ArtTitle.js`) each load a GLB from `public/models/` (Blender sources in `blender/`). Shared performance pattern: `frameloop` is toggled `'always'`/`'never'` by visibility so off-screen canvases don't render, and `Warmup.js` precompiles shaders (`gl.compileAsync`) before calling the scene's ready callback so the loading gate doesn't lift onto a first-frame jank.

**Adaptive render quality.** `GlassMaterial.js` owns a module-level "degraded" store shared by all three canvases: true up front for software WebGL (renderer-string probe), or triggered at runtime by `GlassPerfGuard` (drei `PerformanceMonitor`, armed only after the loading gate closes so load jank can't vote) when a real GPU sustains low FPS. Degraded scenes swap the transmission material for a flat unlit `meshBasicMaterial` wearing `public/baked/{model}-{theme}.png` — captures of the real glass material rendered onto each title model by `node scripts/bake-surface.mjs` (re-run after changing the glass recipe, env colours, page backgrounds, or GLBs), mapped via orthographic projection UVs that must stay in lockstep between `applyBakeUVs` and the bake rig — and render no lights or environment at all (`GlassSceneLight` in `ThemedEnvLight.js` returns null; the per-frame `<Environment frames={Infinity}>` bake is the main thing being avoided). Software WebGL additionally halves canvas `dpr`. The decision is sticky per tab via `sessionStorage.glass-degraded` (`--force-degraded` in the perf script pre-arms it). A metal-with-env-bake fallback was tried and rejected: the one-shot bake + shader recompile cost ~1.3s per canvas under software WebGL. Anything added to these scenes should stay cheap in the degraded path.

**Perf testing.** `/perf-test` (`.claude/skills/perf-test/`) builds the site and drives a real browser through the visitor flow under CPU/network/GPU throttling profiles, reporting load times, FPS, and whether adaptive degradation fired.

**Sound.** `src/components/sound.js` synthesizes every effect with Web Audio at call time — there are no audio files. The AudioContext is created/resumed only from gesture-bound calls; a looping silent `<audio>` element ("keeper") keeps iOS from muting Web Audio via the ringer switch and is re-armed per gesture. UI components call `sfx.chord(...)`, `sfx.spin(...)`, etc. fire-and-forget.

**Theming.** Dark mode is a `dark` class on `<html>` (Tailwind v4 `@custom-variant` in globals.css), toggled in `Navbar.js`, persisted to `localStorage.theme`, and restored before first paint by an inline script in `layout.js`. Theme switches add a transient `.theme-fading` class that cross-fades colors site-wide. Semantic CSS vars (`--ink`, `--paper`) exist for the metro-map SVG in `FlowTimeline.js`. Sections declare `data-navbar-theme` for the navbar's color handling.

**Cursor.** `GlassCursor.js` replaces the native cursor; `html.glass-cursor` forces `cursor: none` universally, so any element needing a visible native cursor is fighting that rule on purpose.

**Fonts.** Body text is local-first Helvetica Neue/Arial with Arimo as a metric-compatible webfont backstop (line breaks must not move if the fallback loads); Montserrat is navbar-only (`--font-nav`); Fascinate (local TTF) is only for the loading-screen button.

## Conventions

- Comments in this codebase explain non-obvious constraints and the *why* behind unusual decisions (compositor vs rAF animation, iOS audio quirks, hydration-safe theming). Match that style — don't narrate what code does.
- UI copy is lowercase by design ("i'm a high school student…", nav labels).
