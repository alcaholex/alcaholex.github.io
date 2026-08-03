# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — static export to `out/` (`output: 'export'` in next.config.mjs)
- `npm run lint` — ESLint (eslint-config-next)

There are no tests. Deployment is automatic: pushing to `main` runs `.github/workflows/nextjs.yml`, which builds and publishes `out/` to GitHub Pages. Do not add a `static_site_generator` input to the configure-pages action in that workflow — it generates a competing `next.config.js` that shadows ours and breaks the export (see the comment in the workflow). On Windows, `npm run build` fails with `EBUSY` if any shell's working directory is inside `out/` — the export starts by deleting it.

## What this is

A single-page portfolio site: Next.js 15 App Router, plain JavaScript (no TypeScript), Tailwind CSS v4 (configured in CSS via `@theme` in `src/app/globals.css`, no tailwind.config file). Everything is a client component; the only page is `src/app/page.js`, composed of full-screen sections (`section-1` hero … `section-4` art) that the navbar scrolls between.

## Architecture

Several cross-cutting systems interact — most components touch more than one of them:

**Loading gate → audio unlock.** `LoadingGate.js` covers the viewport until all three 3D scenes report in. Each scene calls `useAssetReady(id)` with one of the ids in `ASSETS` (`'name'`, `'projects'`, `'art'`) — adding a new gated asset means adding its id there. The progress bar morphs into a CONTINUE button; that click is the site's first guaranteed user gesture and calls `sfx.unlock()` to enable audio. A 15s timeout opens the site anyway if a scene never reports. While gating, `html.is-loading` blocks native scroll *and* Lenis is explicitly stopped (Lenis moves scrollTop programmatically, so CSS overflow alone isn't enough).

**Smooth scrolling.** `SmoothScroll.js` owns a single Lenis instance exposed via the `useLenis()` context hook. Components that scroll programmatically must go through Lenis, not `window.scrollTo`. Navbar-initiated scrolls are tagged `userData: { nav: true }` so `SlideInSection` can tell a passing navigation from a user swipe when deciding whether to snap/commit a section.

**3D scenes.** Three R3F canvases (`ThreeDName.js` hero, `ProjectsTitle.js`, `ArtTitle.js`) each load a GLB from `public/models/` (Blender sources in `blender/`). Shared performance pattern: `frameloop` is toggled `'always'`/`'never'` by visibility so off-screen canvases don't render, and `Warmup.js` precompiles shaders (`gl.compileAsync`) before calling the scene's ready callback so the loading gate doesn't lift onto a first-frame jank.

**Title materials.** All three titles wear `TitleMaterial.js`: one flat unlit `meshBasicMaterial` color per theme, `toneMapped` off so the colors keep their CSS values, and a baked AO map (`public/ao/{model}-ao.png`, strength via `aoMapIntensity`) multiplied over the flat color. There is deliberately no lighting, environment, or adaptive-quality tiering — a previous transmission-glass version with runtime degradation was removed for a single level of detail (see git history around `0d39a11` if it's ever wanted back). Texture gotchas that already bit once: textures hand-loaded onto glTF geometry need `flipY = false` set *before* the first GPU upload (drei's `useTexture` force-uploads before its onLoad callback runs, so it can't do this — hence the hand-rolled loader), and AO maps sample linear, never sRGB.

**Blender → site asset pipeline.** Each `blender/*.blend` keeps the editable FONT object *plus* a converted, Smart-UV-unwrapped mesh copy — the copy is what exports (text objects can't unwrap; convert first). A model's GLB and its AO PNG are a **matched pair**: changing the unwrap requires re-baking *and* re-exporting together, then syncing both into `public/` (`public/models/{model}.glb`, `public/ao/{model}-ao.png` — bakes saved in `blender/` don't reach the site until copied). A stale or mismatched pair renders as black patches/stripes (faces sampling the bake's background); alignment is provable by sampling the PNG at every GLB UV — zero vertices should land on background. Export gotchas: the glTF exporter includes objects by *viewport* visibility (hiding from render isn't enough — use Selected Objects), baking is Cycles-only (Eevee has no bake system), and bake Margin below ~32px at 1024² shows as lines along UV island seams. When verifying bakes via headless screenshots, render at `deviceScaleFactor: 2` — at small sizes mipmaps average misaligned texels into plausible-looking shading — and note Puppeteer `screenshot({clip})` coordinates are document-relative, not viewport-relative.

**Perf testing.** `/perf-test` (`.claude/skills/perf-test/`) builds the site and drives a real browser through the visitor flow under CPU/network/GPU throttling profiles, reporting load times and FPS.

**Sound.** `src/components/sound.js` synthesizes every effect with Web Audio at call time — there are no audio files. The AudioContext is created/resumed only from gesture-bound calls; a looping silent `<audio>` element ("keeper") keeps iOS from muting Web Audio via the ringer switch and is re-armed per gesture. UI components call `sfx.chord(...)`, `sfx.spin(...)`, etc. fire-and-forget.

**Theming.** Dark mode is a `dark` class on `<html>` (Tailwind v4 `@custom-variant` in globals.css), toggled in `Navbar.js`, persisted to `localStorage.theme`, and restored before first paint by an inline script in `layout.js`. Theme switches add a transient `.theme-fading` class that cross-fades colors site-wide. Semantic CSS vars (`--ink`, `--paper`) exist for the metro-map SVG in `FlowTimeline.js`. Sections declare `data-navbar-theme` for the navbar's color handling.

**Cursor.** `GlassCursor.js` replaces the native cursor; `html.glass-cursor` forces `cursor: none` universally, so any element needing a visible native cursor is fighting that rule on purpose.

**Fonts.** Body text is local-first Helvetica Neue/Arial with Arimo as a metric-compatible webfont backstop (line breaks must not move if the fallback loads); Montserrat is navbar-only (`--font-nav`); Fascinate (local TTF) is only for the loading-screen button.

## Conventions

- Comments in this codebase explain non-obvious constraints and the *why* behind unusual decisions (compositor vs rAF animation, iOS audio quirks, hydration-safe theming). Match that style — don't narrate what code does.
- UI copy is lowercase by design ("i'm a high school student…", nav labels).
