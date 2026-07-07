// Build-time voxel illustrations via heerich (voxel → inline SVG).
// Every function returns an SVG string emitted into the page at build time.
// Aesthetic: hidden-line voxels — faces filled with the page background so
// nearer strokes occlude farther ones — thin off-white strokes on near-black,
// with WLD gold (#FFD143) as a single sparse accent per scene.
import { Heerich } from 'heerich'

const STROKE = '#9c988c'
const GOLD = '#FFD143'
const HIDDEN = '#0d1014' // page --bg: fills faces so hidden lines are occluded

// Oblique depth offset ≈ `distance` px per z-unit; keep it around half the
// tile (cabinet projection) so faces stay legible in front of the extrusion.
const CAMERA = { type: 'oblique', angle: 30, distance: 7 }

const solid = (stroke, strokeWidth) => ({
  fill: HIDDEN,
  stroke,
  strokeWidth,
  strokeLinejoin: 'round',
})

const base = solid(STROKE, 1)
const goldLine = solid(GOLD, 1.3)

function engine() {
  return new Heerich({ tile: 14, camera: CAMERA })
}

// ---------------------------------------------------------------------------
// Hero: a 5×7 voxel letter grid that morphs through B-R-A-I-N-S-T-O-R-M.
// The full grid is rendered once at build time; cells not in the first
// letter start at opacity 0. A small client script (HeroMorph.astro)
// toggles per-cell opacity to morph between letters.
// ---------------------------------------------------------------------------

// 5×7 bitmap font — rows top→bottom (heerich's Y axis grows downward).
const LETTER_ROWS = {
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
  N: ['X...X', 'XX..X', 'XX..X', 'X.X.X', 'X..XX', 'X..XX', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
}

const GRID_W = 5
const GRID_H = 7

export const HERO_SEQUENCE = [...'BRAINSTORM']

function letterCells(letter) {
  const cells = []
  LETTER_ROWS[letter].forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch === 'X') cells.push(`${x}-${y}`)
    })
  })
  return cells
}

export const HERO_LETTER_CELLS = Object.fromEntries(
  Object.keys(LETTER_ROWS).map((letter) => [letter, letterCells(letter)]),
)

export function heroMorphScene() {
  const h = engine()
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      // opaque: false keeps every cell's full face set, so any subset of
      // visible cells still draws complete cubes.
      h.applyGeometry({
        type: 'box',
        position: [x, y, 0],
        size: [1, 1, 1],
        opaque: false,
        gap: 0.07,
        style: { default: base },
        meta: { cell: `${x}-${y}` },
      })
    }
  }
  const first = new Set(HERO_LETTER_CELLS[HERO_SEQUENCE[0]])
  return h.toSVG({
    padding: 12,
    faceAttributes: (f) => ({
      opacity: first.has(`${f.voxel.x}-${f.voxel.y}`) ? 1 : 0,
    }),
  })
}

// ---------------------------------------------------------------------------
// Section-marker glyphs — one distinct sculptural motif per workflow step.
// `accent` renders the whole glyph in gold (used once per page).
// ---------------------------------------------------------------------------

// Each glyph is off-white with one gold accent sub-element — the part that
// carries the step's meaning (the distilled result, the piece slotting in,
// the chosen option, the finished crown, the fork point).
const glyphs = {
  // 澄清 — a funnel: wide → narrow stacked plates; the distilled result
  // (bottom tip) is gold
  clarify(h, s) {
    h.applyGeometry({ type: 'box', position: [0, 0, 0], size: [5, 1, 5], style: { default: s } })
    h.applyGeometry({ type: 'box', position: [1, 1, 1], size: [3, 1, 3], style: { default: s } })
    h.applyGeometry({ type: 'box', position: [2, 2, 2], size: [1, 1, 1], style: { default: goldLine } })
  },
  // 模板对齐 — a slab with a carved notch; the matching piece hovering
  // above it (gold) is about to slot in
  align(h, s) {
    h.applyGeometry({ type: 'box', position: [0, 0, 0], size: [4, 2, 3], style: { default: s } })
    h.removeGeometry({ type: 'box', position: [0, 0, 0], size: [1, 1, 1] })
    h.applyGeometry({ type: 'box', position: [0, -2, 0], size: [1, 1, 1], style: { default: goldLine } })
  },
  // 3 方案 — three columns of different heights; the tallest (the pick) is gold
  three(h, s) {
    h.applyGeometry({ type: 'box', position: [0, 1, 0], size: [1, 2, 1], style: { default: s } })
    h.applyGeometry({ type: 'box', position: [2, 0, 0], size: [1, 3, 1], style: { default: goldLine } })
    h.applyGeometry({ type: 'box', position: [4, 1, 0], size: [1, 2, 1], style: { default: s } })
  },
  // 定稿 — a voxel sphere: the finished, polished artifact; the front-top
  // edge (its visible crown) is gold
  finalize(h, s) {
    h.applyGeometry({ type: 'sphere', center: [0, 0, 0], radius: 2.5, style: { default: s } })
    h.applyStyle({ type: 'box', position: [-1, -2, -1], size: [3, 1, 1], style: { default: goldLine } })
  },
  // 分支 — two bars crossing at a hub (gold): one path forks into four
  branch(h, s) {
    h.applyGeometry({ type: 'box', position: [0, 0, 2], size: [5, 1, 1], style: { default: s } })
    h.applyGeometry({ type: 'box', position: [2, 0, 0], size: [1, 1, 5], style: { default: s } })
    h.applyGeometry({ type: 'box', position: [2, -1, 2], size: [1, 1, 1], style: { default: goldLine } })
  },
}

export function glyphScene(kind, { accent = false } = {}) {
  const build = glyphs[kind]
  if (!build) throw new Error(`glyphScene: unknown glyph "${kind}"`)
  const h = engine()
  build(h, accent ? goldLine : base)
  return h.toSVG({ padding: 8 })
}
