# Rung-6 Design Conformance Loop

## 1. What it is

An iterative loop that screenshots the running Mini Program, compares each screen
to the approved design, and guides `.wxss` / `.wxml` fixes until they match. The
design is **ground truth**; the agent **reads the side-by-side composite image** and
reasons perceptually (VLM), exactly as a human reviewer would. This is **not** exact
pixel matching — `driftPct` is only a coarse convergence signal, never a pass/fail gate.

## 2. The `.conform/` workdir

Created inside the **user demo project**, not the plugin. Lives next to `app.json`.

```
<project>/.conform/ref/<screen>.png              design reference, screen-only (no phone chrome), 375 logical px wide
<project>/.conform/impl/<screen>.png             Mini Program screenshot, screen-only, from DevTools
<project>/.conform/out/<screen>.composite.png     generated: [ref | impl | diff] side-by-side, labeled
<project>/.conform/out/manifest.json              generated summary
```

**Pairing rule:** a ref and an impl PNG are paired **iff they share the same basename**
(e.g. `home.png` in `ref/` pairs with `home.png` in `impl/`). Unpaired files are
reported as `ref-missing` / `impl-missing`.

## 3. The three tools

All live in `platforms/wechat/prototype/`, are ESM `.mjs`, and are dependency-free
(except a lazy, optional `miniprogram-automator` used only for live capture).

**Capture the running screens** — `impl/*.png` via DevTools + `miniprogram-automator`:

```bash
node "platforms/wechat/prototype/capture-miniprogram.mjs" <projectDir> \
  [--out <dir, default <project>/.conform/impl>] \
  [--pages all|p1,p2,...] \
  [--cli <devtoolsCliPath>]
```

Reads `<project>/app.json` pages; the screen slug is the page path with `/` replaced
by `-` (e.g. `pages/home/index` → `pages-home-index.png`).

**Compare ref vs impl** — writes `out/*.composite.png` + `out/manifest.json`:

```bash
node "platforms/wechat/prototype/conform-to-design.mjs" <projectDir> \
  [--threshold <0-255, default 40>] \
  [--mask <x,y,w,h>]... \
  [--ref <dir>] [--impl <dir>]
```

Defaults: `ref=<project>/.conform/ref`, `impl=<project>/.conform/impl`,
`out=<project>/.conform/out`. `--mask` may be repeated to ignore regions (e.g. the
status bar). `manifest.json` shape:

```json
{
  "generatedFor": "...",
  "threshold": 40,
  "masks": [{ "x": 0, "y": 0, "w": 375, "h": 20 }],
  "pairs": [
    { "name": "home", "ref": "...", "impl": "...", "composite": "...",
      "refSize": [375, 812], "implSize": [375, 812],
      "driftPct": 3.1, "status": "ok" }
  ],
  "summary": { "pairs": 5, "compared": 4, "avgDriftPct": 2.7, "maxDriftPct": 6.0 }
}
```

`status` is `"ok" | "ref-missing" | "impl-missing"`.

**Render a brainstorm HTML screen to a ref PNG** (when there is no Figma export):

```bash
node "platforms/wechat/prototype/render-html-reference.mjs" <input.html> <out.png>
```

**Figma reference path:** alternatively save a Figma MCP `get_screenshot` result
directly to `<project>/.conform/ref/<screen>.png` (screen-only, 375 px wide).

## 4. The agent iterate loop

1. **Capture impl.** Run `capture-miniprogram.mjs` to populate `.conform/impl/`,
   **or** have the user drop DevTools screenshots into `.conform/impl/` (screen-only).
2. **Acquire refs.** Put one PNG per screen in `.conform/ref/`, by basename: either a
   Figma `get_screenshot` saved there, or `render-html-reference.mjs` run on the
   approved brainstorm HTML screen.
3. **Run conform.** Run `conform-to-design.mjs <projectDir>`; mask the status bar if it
   pollutes the diff.
4. **Read each composite.** Open every `out/*.composite.png` and produce a **prioritized,
   structured mismatch list** per screen, bucketed as: **color / size / weight / spacing /
   position**. Treat the design as ground truth; use `driftPct` only as a coarse signal of
   where to look, not as the verdict.
5. **Fix.** Edit the demo `.wxss` / `.wxml` for the **top** mismatches only (highest-impact
   first); avoid sweeping rewrites.
6. **Re-capture & re-run.** Repeat steps 1 and 3 to regenerate composites.
7. **Stop** when screens are visually aligned, `driftPct` is below the target, **or** a max
   iteration cap is hit (recommend **3–4**).
8. **Report.** List residual mismatches per screen and link the final composites.

## 5. Setup for live capture

- Install **WeChat DevTools** and log in.
- Enable **设置 → 安全设置 → CLI/HTTP 调用**.
- If the CLI is not at the default path, set `WX_DEVTOOLS_CLI` (or pass `--cli`).
- In the demo project run `npm i -D miniprogram-automator`.

## 6. Honest limits

- **Needs DevTools.** Capture drives a real DevTools compile; it does not run on headless
  cloud CI.
- **Simulator ≠ phone.** The DevTools simulator is not pixel-identical to a real device
  (fonts, DPR, safe-area). Use perceptual tolerance and **mask the status bar**; confirm
  the final look on a real phone.
- **Reference quality bounds the result.** A Figma export is authoritative; a brainstorm
  HTML render is only approximate — alignment can be no better than the ref.
- **Cap iterations.** Stop at 3–4 rounds to avoid over-fitting the simulator or oscillating
  between fixes.
