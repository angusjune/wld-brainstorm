---
name: beyblade-battle
description: 一个把 Figma 界面变成战斗陀螺的趣味技能。Use when the user wants to watch 2–7 of their Figma screens battle each other as spinning beyblades in a local arena.
---

# beyblade-battle

A playful skill: turn 2–7 of the user's Figma screens into spinning **beyblades** that fight in a local browser arena. Each screen is skinned with its own screenshot, gets battle stats derived from its design, collides with the others, **fractures along its weakest content seams** (the whitespace gutters between UI cards), and the **last intact screen still spinning wins**.

This is for fun and demos, not production design work. For real UI work use `wld-design:brainstorm`, `wld-design:prototype`, or `wld-design:push-to-figma`.

## How it works (division of labor)

- **You (the agent)** read each frame from Figma and produce: structural features + a screenshot PNG per screen.
- **The browser** computes pixel features from each screenshot, blends them with your structural features into final stats, runs the rigid-body physics, fracture, and rendering.

So you never decode images yourself — you only gather Figma data, save screenshots, write one JSON file, and start the server.

**Files in this skill:**
- `server.cjs` — static server hosting the arena
- `assets/arena.html`, `assets/arena.css`, `assets/engine.js` — the battle page + simulation

**Figma MCP reference:** before using any Figma MCP tool, read `<plugin-root>/plugins/wld-design/assets/figma-mcp.md`.

## Workflow

### Step 1 — Get the screens

Ask the user which screens battle if not already clear. Accept **2–7 screens** (more than 7 → ask them to pick 7). They can provide a Figma selection or frame links.

For each frame, using Figma MCP (per `<plugin-root>/plugins/wld-design/assets/figma-mcp.md`):

1. `get_metadata` on the frame → record **structural features**:
   - `nodes` — total descendant node count
   - `textNodes` — number of TEXT nodes
   - `depth` — max nesting depth
   - `fills` — number of distinct fill colors (use `get_variable_defs` / `get_design_context` if it helps; otherwise estimate)
2. `get_screenshot` (or `download_assets`) → save the rendered frame as a PNG.

If Figma MCP is unavailable, fall back to user-attached images and skip `structure` (the browser will derive all stats from pixels). State the source mode (`Figma MCP` vs `screenshot only`) in your summary.

### Step 2 — Start the server

```bash
node "<plugin-root>/plugins/wld-design/skills/beyblade-battle/server.cjs" \
  --project-dir /path/to/project \
  --port 4321
```

Read the JSON response and save `battleDir`, `screensDir`, `configPath`, and `url`. (If the port is in use, retry with the suggested port.)

### Step 3 — Save screenshots + write the config

1. Save each screenshot into `screensDir` (e.g. `screensDir/screen-1.png`). Keep them reasonably sized (long side ≤ ~1200px is plenty).
2. Write `battle-config.json` to `configPath`:

```json
{
  "screens": [
    { "name": "个人中心",     "image": "screens/screen-1.png", "structure": { "nodes": 142, "textNodes": 23, "depth": 8, "fills": 11 } },
    { "name": "输入金额",     "image": "screens/screen-2.png", "structure": { "nodes": 96,  "textNodes": 14, "depth": 6, "fills": 7  } },
    { "name": "本期应还",     "image": "screens/screen-3.png", "structure": { "nodes": 120, "textNodes": 19, "depth": 7, "fills": 9  } }
  ]
}
```

- Only `screens` is read. The engine ignores any other top-level key, so don't bother with an `arena`/`title` field — the arena heading is fixed.
- `image` is a path **relative to the battle dir** and is served at `/screens/...`. Save each PNG so this path resolves: a file written to `screensDir/screen-1.png` must appear in the config as `"screens/screen-1.png"`.
- `name` is shown on the HUD card and in the battle log; omit it and the screen is labelled `Screen N`.
- `structure` is optional per screen — omit it for screenshot-only mode.
- Order sets the starting ring position (it's deterministic, not random); 2–7 entries.

### Step 4 — Verify the assets resolve, then tell the user to watch

Before handing off, confirm the server can serve what the browser will fetch — a wrong relative path or a PNG saved to the wrong dir is the common failure, and it surfaces only as a silent "failed to load" once the user opens the page. Hit the same URLs the browser will:

```bash
curl -fsS "<url>/battle-config.json" >/dev/null && echo "config OK"
# repeat for every "image" path in the config:
curl -fsS -o /dev/null -w "%{http_code}  /screens/screen-1.png\n" "<url>/screens/screen-1.png"
```

Every image must return `200`. A `404` means the PNG isn't where the config's `image` path points — fix the file or the path, don't hand off broken.

Then tell the user to open `url` in a browser. The arena loads the config + screenshots, computes stats, and runs the battle automatically. They can hit **重新开战 / restart** to re-run; starting positions are fixed by entry order, but spin directions and crit rolls are re-rolled, so the outcome varies.

If the user wants to swap screens or change the lineup, update `battle-config.json` (and screenshots), then have them reload the page.

**Optional debug aid (needs a browser):** opening `<url>#debug&ff2000` runs ~2000 sim ticks synchronously and jumps straight to the winner with an on-canvas stats line — handy if you have a headless-browser tool and want to confirm a battle actually resolves. It does **not** run under plain `node`; without a browser, rely on the `curl` checks above.

## Stat model (for explaining results)

Each screen gets six 0–100 stats, blended from Figma structure + screenshot pixels:

| Stat | Higher when the screen… | Effect in battle |
|------|--------------------------|------------------|
| 重量 Weight | is busy / has many layers | more momentum, harder to shove |
| 攻击 Attack | is high-contrast, colorful, edgy | hits harder |
| 防御 Defense | is clean, smooth, calm | absorbs hits |
| 稳定 Stability | has centered, balanced content | resists wobble + spin-out |
| 耐久 Durability | is structurally dense | tougher seams, more starting integrity |
| (Spin) | derived from weight + stability | initial spin speed |

A top is knocked out when its integrity drops below 50% (shattered) or its spin runs out. Because fracture follows content density, screens snap apart along the gaps between their cards/sections — a section flies off as a spinning screenshot shard.

## Notes

- The server auto-shuts down after 30 minutes idle.
- This skill never writes back to Figma.
- Battle output is generated under `.wld-beyblade/` in the project dir (or the explicit `--battle-dir`); it is throwaway.
