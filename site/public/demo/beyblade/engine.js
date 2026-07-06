"use strict";
/* =========================================================================
   beyblade-battle — screenshot rigid-body battle royale
   Each UI screen becomes a spinning top: the screenshot is the master canvas,
   the frame is tiled into a rigid body, and on collision the body fractures
   along its weakest content seams (the whitespace gutters between UI cards).
   Stats blend Figma structural features (from the agent) with pixel features
   computed here in the browser. Last intact top still spinning wins.

   Physics adapted from the reference name-battle sim.
   ========================================================================= */
(function () {

/* ---------- arena geometry ---------- */
const ARENA_R = 270, ARENA_CX = 290, ARENA_CY = 290, ARENA_INNER = ARENA_R - 4;
const CANVAS = 580;
const BOWL = 0.00012;        // harmonic-bowl centripetal pull (∝ distance → elliptical orbit)
const INWARD = 0.03;         // steady centripetal sink: tops cluster in the middle and brawl
const GRIND = 0.12, GRIND_MAX = 8; // spin-rub stress: fast spinners chew slower ones
const SUBSTEPS = 2;

/* ---------- tiling ---------- */
const GRID_LONG = 18;        // tiles along the screenshot's longest side
const TILE = 14;             // master-canvas px per tile

/* ---------- physics knobs (ported) ---------- */
const LINDAMP = 0.995, SPINFRIC = 0.9993, REST = 0.72, MU = 0.18;
const AV_MAX = 0.78, V_MAX = 15, AV_DEAD = 0.06;
const VN_HARD = 1.0;                       // impact threshold to register stress
// Seam strength = tough × bond × (base + thickness × k). Screens are near-uniform
// full rectangles, so necks only exist where content is sparse — keep tough low so
// whitespace gutters (thick≈1) snap while dense content (thick≈6) holds.
const TOUGH = 2.4, THK0 = 0.3, THKK = 1.4;
const K_WOBBLE = 0.46, K_IMBDRAIN = 0.016; // imbalance wobble + spin drain
const IBOOST = 3.4, GYRO_CURVE = 0.05;
const SETTLE_SPIN = 0.12, DEBRIS_DAMP = 0.88;
const CRIT_CHANCE = 0.18, CRIT_MULT = 2.3;
const VIEW_KY = 0.80, VIEW_KZ = 0.86;      // perspective: top-down squash + height
const THICK = 9, MAXLEAN = 1.45;
const KO_INTEGRITY = 0.5;                  // shattered below half mass

let SHX = 0, SHY = 0;                       // screen-shake offset
let SIM = null;                             // active battle (for shake / log access)
const DEBUG = (typeof location !== 'undefined' && location.hash.indexOf('debug') >= 0);

/* per-top accent palette (HUD, particles, extruded side tint) */
const PALETTE = ['#b5302a', '#2f6f8f', '#3f7d4f', '#c47d18', '#7a4fae', '#1c1a17', '#0f7a86'];

/* ---------- helpers ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function hexA(hex, a) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`; }
function sideColor(hex) {
  const h = hex.replace('#', ''); const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  if (lum < 70) return 'rgb(120,112,100)';
  return `rgb(${Math.round(r * 0.46)},${Math.round(g * 0.46)},${Math.round(b * 0.46)})`;
}
function projPt(x, y, z) { return [x + SHX, ARENA_CY + (y - ARENA_CY) * VIEW_KY - (z || 0) * VIEW_KZ + SHY]; }

/* =========================================================================
   1. Screenshot → master canvas + per-tile features
   ========================================================================= */
function buildMaster(img) {
  // Normalize the screenshot into a tile grid: longest side = GRID_LONG tiles.
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  let cols, rows;
  if (iw >= ih) { cols = GRID_LONG; rows = Math.max(3, Math.round(GRID_LONG * ih / iw)); }
  else { rows = GRID_LONG; cols = Math.max(3, Math.round(GRID_LONG * iw / ih)); }
  const masterW = cols * TILE, masterH = rows * TILE;
  const cv = document.createElement('canvas'); cv.width = masterW; cv.height = masterH;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, masterW, masterH);
  const data = x.getImageData(0, 0, masterW, masterH).data;

  // Per-tile mean color + texture detail.
  const meanR = [], meanG = [], meanB = [], detail = [], lum = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let yy = 1; yy < TILE; yy += 2) for (let xx = 1; xx < TILE; xx += 2) {
      const px = c * TILE + xx, py = r * TILE + yy, i = (py * masterW + px) * 4;
      sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
    }
    const mr = sr / n, mg = sg / n, mb = sb / n;
    let d = 0; for (let yy = 1; yy < TILE; yy += 2) for (let xx = 1; xx < TILE; xx += 2) {
      const px = c * TILE + xx, py = r * TILE + yy, i = (py * masterW + px) * 4;
      d += Math.abs(data[i] - mr) + Math.abs(data[i + 1] - mg) + Math.abs(data[i + 2] - mb);
    }
    const idx = r * cols + c;
    meanR[idx] = mr; meanG[idx] = mg; meanB[idx] = mb;
    detail[idx] = clamp(d / n / 90, 0, 1);
    lum[idx] = 0.3 * mr + 0.59 * mg + 0.11 * mb;
  }
  // Background ≈ average of the outer ring of tiles (usually the page background).
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) continue;
    const idx = r * cols + c; br += meanR[idx]; bg += meanG[idx]; bb += meanB[idx]; bn++;
  }
  br /= bn; bg /= bn; bb /= bn;
  // density per tile: how far this tile reads from background + how textured it is.
  const density = [];
  for (let i = 0; i < cols * rows; i++) {
    const colorDist = Math.hypot(meanR[i] - br, meanG[i] - bg, meanB[i] - bb) / 255;
    density[i] = clamp(colorDist * 1.25 + detail[i] * 1.3, 0, 1);
  }
  return { cv, cols, rows, masterW, masterH, density, meanR, meanG, meanB, lum };
}

/* =========================================================================
   2. master → rigid-body top (nodes / joints / necks)  — ported & re-skinned
   ========================================================================= */
const TOP_TARGET_BASE = 88;
function topTarget(n) { return clamp(TOP_TARGET_BASE - (n - 2) * 4.5, 60, 88); }

function buildTop(img, structure, color, count) {
  const m = buildMaster(img);
  const cols = m.cols, rows = m.rows;
  const solid = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols; // full frame: every tile solid

  // nodes (all tiles), mass biased toward content-dense tiles → natural imbalance.
  const nodes = [], nodeAt = {};
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    nodeAt[r + '_' + c] = nodes.length;
    nodes.push({ tr: r, tc: c, mass: 0.45 + m.density[idx], lx: 0, ly: 0,
      thick: clamp(1 + m.density[idx] * 5, 1, 6) });
  }
  // mass center + scale to top diameter.
  let M = 0, cx = 0, cy = 0, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const n of nodes) { const px = n.tc * TILE + TILE / 2, py = n.tr * TILE + TILE / 2; M += n.mass; cx += px * n.mass; cy += py * n.mass;
    mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py); }
  cx /= M; cy /= M;
  const sc = topTarget(count) / Math.max(mxx - mnx, mxy - mny, 1);
  for (const n of nodes) { n.lx = ((n.tc * TILE + TILE / 2) - cx) * sc; n.ly = ((n.tr * TILE + TILE / 2) - cy) * sc; }
  const tileDisp = TILE * sc;

  // joints between orthogonally/diagonally adjacent tiles.
  const joints = [], jk = new Set();
  const addJ = (i, j) => { const a = Math.min(i, j), b = Math.max(i, j), key = a + '_' + b; if (jk.has(key)) return; jk.add(key); joints.push({ a, b, kind: 'stroke', broken: false }); };
  for (const n of nodes) { const i = nodeAt[n.tr + '_' + n.tc];
    [[0, 1], [1, 0], [1, 1], [1, -1]].forEach(([dr, dc]) => { const j = nodeAt[(n.tr + dr) + '_' + (n.tc + dc)]; if (j != null) addJ(i, j); }); }

  // adjacency (stress diffusion).
  const adj = {}; for (let i = 0; i < nodes.length; i++) adj[i] = [];
  for (const j of joints) { adj[j.a].push(j.b); adj[j.b].push(j.a); }

  // geometric-center node.
  let bmnx = 1e9, bmxx = -1e9, bmny = 1e9, bmxy = -1e9;
  for (const n of nodes) { bmnx = Math.min(bmnx, n.lx); bmxx = Math.max(bmxx, n.lx); bmny = Math.min(bmny, n.ly); bmxy = Math.max(bmxy, n.ly); }
  const gcx = (bmnx + bmxx) / 2, gcy = (bmny + bmxy) / 2; let centerNode = 0, cb = 1e18;
  for (let i = 0; i < nodes.length; i++) { const d = (nodes[i].lx - gcx) ** 2 + (nodes[i].ly - gcy) ** 2; if (d < cb) { cb = d; centerNode = i; } }

  // BFS from center: depth + parent tree.
  const depth = new Array(nodes.length).fill(-1), neckOf = new Array(nodes.length).fill(centerNode), parent = new Array(nodes.length).fill(-1);
  depth[centerNode] = 0; const bq = [centerNode]; let bh = 0;
  while (bh < bq.length) { const u = bq[bh++]; for (const v of adj[u]) if (depth[v] === -1) { depth[v] = depth[u] + 1; parent[v] = u; bq.push(v); } }
  // nearest weakest seam toward center (thinnest tile within NECK_HOPS) → fracture site.
  const NECK_HOPS = 4;
  for (let i = 0; i < nodes.length; i++) { if (depth[i] < 0) { neckOf[i] = i; continue; }
    let best = i, bt = nodes[i].thick, u = i;
    for (let h = 0; h < NECK_HOPS && parent[u] >= 0; h++) { u = parent[u]; if (nodes[u].thick < bt) { bt = nodes[u].thick; best = u; } }
    neckOf[i] = best; }

  const stats = computeStats(m, nodes, structure);
  return { color, master: m.cv, nodes, joints, adj, tileDisp, sc, centerNode, depth, neckOf, mcx: cx, mcy: cy, origMass: M, stats, cols, rows };
}

/* =========================================================================
   3. stats — blend pixel features (here) with Figma structure (from agent)
   ========================================================================= */
function computeStats(m, nodes, structure) {
  const cols = m.cols, rows = m.rows, N = cols * rows;
  let M = 0, gx = 0, gy = 0, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const n of nodes) { M += n.mass; gx += n.lx * n.mass; gy += n.ly * n.mass;
    mnx = Math.min(mnx, n.lx); mxx = Math.max(mxx, n.lx); mny = Math.min(mny, n.ly); mxy = Math.max(mxy, n.ly); }
  gx /= M; gy /= M;
  const bw = Math.max(1, mxx - mnx), bh = Math.max(1, mxy - mny);
  // content-mass offset from geometric center → (in)stability.
  const offset = Math.hypot(gx, gy) / Math.max(bw, bh);
  // average density (fill / busy-ness).
  let densSum = 0; for (let i = 0; i < N; i++) densSum += m.density[i]; const densFill = densSum / N;
  // edge density: mean luminance gradient between orthogonal neighbors.
  let edgeSum = 0, edgeN = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c;
    if (c + 1 < cols) { edgeSum += Math.abs(m.lum[i] - m.lum[i + 1]); edgeN++; }
    if (r + 1 < rows) { edgeSum += Math.abs(m.lum[i] - m.lum[i + cols]); edgeN++; } }
  const edge = clamp((edgeSum / Math.max(1, edgeN)) / 90, 0, 1);
  // color variance across tiles.
  let mr = 0, mg = 0, mb = 0; for (let i = 0; i < N; i++) { mr += m.meanR[i]; mg += m.meanG[i]; mb += m.meanB[i]; }
  mr /= N; mg /= N; mb /= N;
  let cvar = 0; for (let i = 0; i < N; i++) cvar += Math.hypot(m.meanR[i] - mr, m.meanG[i] - mg, m.meanB[i] - mb);
  const colorVar = clamp((cvar / N) / 120, 0, 1);

  // structural features (optional) → 0..1 norms.
  const s = structure || {};
  const sNodes = clamp((s.nodes || 0) / 220, 0, 1);
  const sText = clamp((s.textNodes || 0) / 40, 0, 1);
  const sFills = clamp((s.fills || 0) / 24, 0, 1);
  const hasStruct = !!structure;

  const blend = (pixel, struct, w) => hasStruct ? clamp(pixel * (1 - w) + struct * w, 0, 1) : pixel;

  const weight = Math.round(blend(densFill, sNodes, 0.45) * 100);
  const attack = Math.round(blend(0.55 * edge + 0.45 * colorVar, 0.5 * colorVar + 0.5 * sText, 0.35) * 100);
  const defense = Math.round(clamp(blend((1 - edge) * 0.7 + (1 - offset) * 0.3, (1 - edge) * 0.6 + (1 - sFills * 0.5) * 0.4, 0.3), 0, 1) * 100);
  const stability = Math.round(clamp(1 - offset * 1.7, 0, 1) * 100);
  const durability = Math.round(blend(densFill * 0.6 + (1 - edge) * 0.4, sNodes * 0.6 + sFills * 0.4, 0.45) * 100);

  return {
    weight, attack, defense, stability, durability,
    atkMul: lerp(0.7, 1.7, attack / 100),
    restMul: lerp(0.8, 1.25, defense / 100),
    bondStrength: lerp(0.9, 1.6, durability / 100),
    spin0: lerp(0.30, 0.42, (weight * 0.4 + stability * 0.6) / 100),
  };
}

/* =========================================================================
   4. rigid bodies  — ported
   ========================================================================= */
function makeBody(top, nodeIdxs, angle, isCentral, owner) {
  let m = 0, cmx = 0, cmy = 0, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const i of nodeIdxs) { const n = top.nodes[i]; m += n.mass; cmx += n.lx * n.mass; cmy += n.ly * n.mass;
    mnx = Math.min(mnx, n.lx); mxx = Math.max(mxx, n.lx); mny = Math.min(mny, n.ly); mxy = Math.max(mxy, n.ly); }
  cmx /= m; cmy /= m; const axleX = (mnx + mxx) / 2, axleY = (mny + mxy) / 2;
  const offX = cmx - axleX, offY = cmy - axleY, imb = Math.hypot(offX, offY);
  let Icom = 0; for (const i of nodeIdxs) { const n = top.nodes[i]; const rx = n.lx - cmx, ry = n.ly - cmy; Icom += n.mass * (rx * rx + ry * ry); }
  const I = Math.max(1, (Icom + m * imb * imb) * IBOOST);
  const circles = []; let boundR = 0;
  for (const i of nodeIdxs) { const n = top.nodes[i]; const rx = n.lx - axleX, ry = n.ly - axleY, cr = top.tileDisp * 0.6;
    circles.push({ rx, ry, r: cr, node: i }); boundR = Math.max(boundR, Math.hypot(rx, ry) + cr); }
  const b = { top, nodeIdxs, axleLX: axleX, axleLY: axleY, offX, offY, imb, m, invM: 1 / m, I, invI: 1 / I,
    central: !!isCentral, owner, circles, boundR, x: 0, y: 0, vx: 0, vy: 0, angle: angle || 0, av: 0, tilt: 0, canvas: null, cvcx: 0, cvcy: 0 };
  buildBodyCanvas(b); return b;
}
function buildBodyCanvas(b) {
  const top = b.top, half = top.tileDisp / 2; let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const i of b.nodeIdxs) { const n = top.nodes[i]; const rx = n.lx - b.axleLX, ry = n.ly - b.axleLY;
    mnx = Math.min(mnx, rx - half); mxx = Math.max(mxx, rx + half); mny = Math.min(mny, ry - half); mxy = Math.max(mxy, ry + half); }
  const pad = 2, w = Math.max(1, Math.ceil(mxx - mnx) + pad * 2), h = Math.max(1, Math.ceil(mxy - mny) + pad * 2);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; b.cvcx = -mnx + pad; b.cvcy = -mny + pad;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.save(); g.translate(b.cvcx - b.axleLX, b.cvcy - b.axleLY); paintScreen(g, top, b.nodeIdxs); g.restore();
  b.canvas = cv;
  // dark extruded side silhouette.
  const scv = document.createElement('canvas'); scv.width = cv.width; scv.height = cv.height; const sg = scv.getContext('2d');
  sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = sideColor(top.color); sg.fillRect(0, 0, cv.width, cv.height);
  b.sideCanvas = scv;
}
function paintScreen(ctx, top, nodeIdxs) {
  ctx.save(); ctx.scale(top.sc, top.sc); ctx.translate(-top.mcx, -top.mcy);
  ctx.beginPath(); for (const i of nodeIdxs) { const n = top.nodes[i]; ctx.rect(n.tc * TILE - 0.5, n.tr * TILE - 0.5, TILE + 1, TILE + 1); }
  ctx.clip(); try { ctx.drawImage(top.master, 0, 0); } catch (e) {} ctx.restore();
}
function worldCircles(b) { const cos = Math.cos(b.angle), sin = Math.sin(b.angle), out = [];
  for (const c of b.circles) out.push({ x: b.x + cos * c.rx - sin * c.ry, y: b.y + sin * c.rx + cos * c.ry, r: c.r, node: c.node }); return out; }

function stepBody(b) {
  const rx0 = b.x - ARENA_CX, ry0 = b.y - ARENA_CY, spd = Math.abs(b.av);
  if (b.central) {
    b.vx += -rx0 * BOWL; b.vy += -ry0 * BOWL;
    const dist = Math.hypot(rx0, ry0);
    if (dist > 2) { const inv = INWARD / dist; b.vx += -rx0 * inv; b.vy += -ry0 * inv; }
  }
  if (b.central && b.imb > 0.3) {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
    const owx = cos * b.offX - sin * b.offY, owy = sin * b.offX + cos * b.offY;
    b.vx += b.av * b.av * owx * K_WOBBLE; b.vy += b.av * b.av * owy * K_WOBBLE;
  }
  if (spd > 0.012) { const a = GYRO_CURVE * b.av, ca = Math.cos(a), sa = Math.sin(a);
    const nvx = ca * b.vx - sa * b.vy, nvy = sa * b.vx + ca * b.vy; b.vx = nvx; b.vy = nvy; }
  let damp;
  if (!b.central) damp = DEBRIS_DAMP;
  else if (spd < SETTLE_SPIN) damp = lerp(0.9, LINDAMP, spd / SETTLE_SPIN);
  else damp = LINDAMP;
  b.vx *= damp; b.vy *= damp; b.vx = clamp(b.vx, -V_MAX, V_MAX); b.vy = clamp(b.vy, -V_MAX, V_MAX);
  b.x += b.vx; b.y += b.vy; b.angle += b.av;
  b.av *= SPINFRIC;
  if (b.central && b.imb > 0.3) b.av *= (1 - K_IMBDRAIN * clamp(b.imb / topTarget(2), 0, 0.5));
  if (b.central && spd < SETTLE_SPIN) b.av *= 0.99;
  b.av = clamp(b.av, -AV_MAX, AV_MAX); b.tilt = 0;
  const dx = b.x - ARENA_CX, dy = b.y - ARENA_CY, dist = Math.hypot(dx, dy) || 1e-6, lim = ARENA_INNER - b.boundR * 0.55;
  if (dist > lim) { const nx = dx / dist, ny = dy / dist; b.x = ARENA_CX + nx * lim; b.y = ARENA_CY + ny * lim;
    const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; } }
}

/* ---------- collisions (rigid impulse + imbalance crits) ---------- */
function collidePair(A, B, fx, stressA, stressB) {
  const dx = B.x - A.x, dy = B.y - A.y, rr = A.boundR + B.boundR;
  if (dx * dx + dy * dy > rr * rr) return 0;
  const dl = Math.hypot(dx, dy) || 1, ux0 = dx / dl, uy0 = dy / dl;
  const power = (body, sx, sy) => {
    if (body.imb < 0.3) return { p: 1, crit: false };
    const cos = Math.cos(body.angle), sin = Math.sin(body.angle);
    let ox = cos * body.offX - sin * body.offY, oy = sin * body.offX + cos * body.offY; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
    const lead = Math.max(0, ox * sx + oy * sy), imbN = clamp(body.imb / topTarget(2), 0, 0.6);
    let p = 1 + lead * imbN * 2.0, crit = false;
    if (lead > 0.45 && imbN > 0.12 && Math.random() < CRIT_CHANCE) { p *= CRIT_MULT; crit = true; }
    return { p, crit };
  };
  const pa = power(A, ux0, uy0), pb = power(B, -ux0, -uy0);
  const ca = worldCircles(A), cb = worldCircles(B);
  const gs = A.top.tileDisp * 1.4, grid = {}, key = (gx, gy) => gx + '#' + gy;
  for (let i = 0; i < cb.length; i++) { const p = cb[i]; const gx = Math.floor(p.x / gs), gy = Math.floor(p.y / gs); (grid[key(gx, gy)] || (grid[key(gx, gy)] = [])).push(i); }
  let totalJ = 0, hx = 0, hy = 0, hits = 0;
  for (const a of ca) { const gx = Math.floor(a.x / gs), gy = Math.floor(a.y / gs);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const cell = grid[key(gx + ox, gy + oy)]; if (!cell) continue;
      for (const bi of cell) { const b = cb[bi];
        let nx = b.x - a.x, ny = b.y - a.y, d = Math.hypot(nx, ny), minD = a.r + b.r;
        if (d >= minD || d < 1e-6) continue;
        const ux = nx / d, uy = ny / d, pen = minD - d, totInv = A.invM + B.invM, corr = pen * 0.6;
        A.x -= ux * corr * (A.invM / totInv); A.y -= uy * corr * (A.invM / totInv);
        B.x += ux * corr * (B.invM / totInv); B.y += uy * corr * (B.invM / totInv);
        const rAx = a.x - A.x, rAy = a.y - A.y, rBx = b.x - B.x, rBy = b.y - B.y;
        const vAx = A.vx - A.av * rAy, vAy = A.vy + A.av * rAx, vBx = B.vx - B.av * rBy, vBy = B.vy + B.av * rBx;
        const rvx = vBx - vAx, rvy = vBy - vAy, vn = rvx * ux + rvy * uy;
        if (vn < 0) {
          const rAcn = rAx * uy - rAy * ux, rBcn = rBx * uy - rBy * ux;
          const invSum = A.invM + B.invM + rAcn * rAcn * A.invI + rBcn * rBcn * B.invI;
          const e = REST * 0.5 * (A.top.stats.restMul + B.top.stats.restMul);
          let jn = -(1 + e) * vn / invSum; jn *= 0.65;
          A.vx -= jn * A.invM * ux; A.vy -= jn * A.invM * uy; A.av -= rAcn * jn * A.invI;
          B.vx += jn * B.invM * ux; B.vy += jn * B.invM * uy; B.av += rBcn * jn * B.invI;
          const tx = -uy, ty = ux, vt = rvx * tx + rvy * ty, rAct = rAx * ty - rAy * tx, rBct = rBx * ty - rBy * tx;
          const invSumT = A.invM + B.invM + rAct * rAct * A.invI + rBct * rBct * B.invI;
          let jt = -vt / invSumT; jt *= 0.5; const lim = MU * Math.abs(jn * 2); jt = clamp(jt, -lim, lim);
          A.vx -= jt * A.invM * tx; A.vy -= jt * A.invM * ty; A.av -= rAct * jt * A.invI;
          B.vx += jt * B.invM * tx; B.vy += jt * B.invM * ty; B.av += rBct * jt * B.invI;
          // strike = head-on slam + spin grind (rim rub chews weak seams even at rest).
          const grind = Math.min(GRIND_MAX, Math.abs(vt) * GRIND);
          const strike = -vn + grind;
          if (DEBUG && SIM) { SIM.dbgHits = (SIM.dbgHits || 0) + 1; if (strike > (SIM.dbgMaxStrike || 0)) SIM.dbgMaxStrike = strike; }
          if (strike > VN_HARD) {
            const dA = strike * B.top.stats.atkMul * pb.p, dB = strike * A.top.stats.atkMul * pa.p;
            if (dA > (stressA[a.node] || 0)) stressA[a.node] = dA;
            if (dB > (stressB[b.node] || 0)) stressB[b.node] = dB;
          }
          totalJ += Math.abs(jn) + Math.abs(jt); hx += (a.x + b.x) / 2; hy += (a.y + b.y) / 2; hits++;
        }
      } } }
  if (hits > 0) {
    hx /= hits; hy /= hits;
    const crit = pa.crit || pb.crit;
    if (crit) {
      const atk = pa.crit ? A : B, def = pa.crit ? B : A, sgn = pa.crit ? 1 : -1;
      def.vx += ux0 * sgn * 3.2; def.vy += uy0 * sgn * 3.2; atk.av *= 0.93;
      addImpact(fx, hx, hy, 8, '#ffce3a', true);
      if (SIM) { SIM.shake = Math.max(SIM.shake, 9); logHit(atk.owner, def.owner, true); }
    } else if (totalJ > 1.0) {
      addImpact(fx, hx, hy, totalJ, A.top.color, false);
      if (SIM) SIM.shake = Math.max(SIM.shake, Math.min(4, 1 + totalJ * 0.3));
    }
  }
  return totalJ;
}

/* ---------- fracture: stress → weak seam, thickness sets strength ---------- */
function applyFracture(top, bodies, stress, fx) {
  const neckStress = {};
  for (const k in stress) { const i = +k, s = stress[k]; if (s <= 0) continue;
    const nk = (top.neckOf && top.neckOf[i] != null) ? top.neckOf[i] : i;
    if (s > (neckStress[nk] || 0)) neckStress[nk] = s; }
  const result = [], bs = top.stats.bondStrength; let anyBreak = false;
  for (const b of bodies) {
    const nodeSet = new Set(b.nodeIdxs); let broke = false;
    for (const k in neckStress) { const nk = +k; if (!nodeSet.has(nk)) continue;
      const strength = TOUGH * bs * (THK0 + top.nodes[nk].thick * THKK);
      if (neckStress[k] <= strength) continue;
      const nThick = top.nodes[nk].thick, dnk0 = top.depth[nk], seen = new Set([nk]), stk = [nk];
      while (stk.length) { const u = stk.pop(), du = top.depth[u];
        for (const j of top.joints) {
          if (j.broken || !nodeSet.has(j.a) || !nodeSet.has(j.b)) continue;
          const other = j.a === u ? j.b : (j.b === u ? j.a : -1); if (other < 0) continue;
          if (top.depth[other] >= 0 && top.depth[other] < du) { j.broken = true; broke = true; }
        }
        for (const v of top.adj[u]) { if (seen.has(v) || !nodeSet.has(v)) continue;
          if (top.depth[v] >= 0 && top.nodes[v].thick <= nThick + 1 && Math.abs(top.depth[v] - dnk0) <= 1) { seen.add(v); stk.push(v); } }
      }
    }
    if (!broke) { result.push(b); continue; }
    anyBreak = true;
    const idxArr = b.nodeIdxs, pos = {}; idxArr.forEach((v, k) => pos[v] = k);
    const parent = idxArr.map((_, k) => k);
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const uni = (a, c) => { a = find(a); c = find(c); if (a !== c) parent[a] = c; };
    for (const j of top.joints) if (!j.broken && nodeSet.has(j.a) && nodeSet.has(j.b)) uni(pos[j.a], pos[j.b]);
    const groups = {}; for (let k = 0; k < idxArr.length; k++) { const r = find(k); (groups[r] || (groups[r] = [])).push(idxArr[k]); }
    const gkeys = Object.keys(groups);
    if (gkeys.length <= 1) { result.push(b); continue; }
    for (const gk of gkeys) {
      const gn = groups[gk], isC = gn.indexOf(top.centerNode) >= 0, nb = makeBody(top, gn, b.angle, isC, b.owner);
      const cos = Math.cos(b.angle), sin = Math.sin(b.angle), dlx = nb.axleLX - b.axleLX, dly = nb.axleLY - b.axleLY;
      nb.x = b.x + (cos * dlx - sin * dly); nb.y = b.y + (sin * dlx + cos * dly); nb.angle = b.angle;
      const rx = nb.x - b.x, ry = nb.y - b.y; nb.vx = b.vx - b.av * ry; nb.vy = b.vy + b.av * rx;
      if (isC) { nb.av = b.av; }
      else { nb.av = (Math.random() - 0.5) * 0.05; const dd = Math.hypot(rx, ry) || 1; nb.vx += rx / dd * 2.2; nb.vy += ry / dd * 2.2;
        if (fx) addImpact(fx, nb.x, nb.y, 4, top.color, false); }
      result.push(nb);
    }
  }
  return result;
}

/* ---------- particles ---------- */
function addImpact(fx, x, y, power, color, crit) {
  if (!fx) return;
  fx.push({ t: 'r', x, y, life: 1, decay: crit ? 0.045 : 0.08, c: crit ? '#ffce3a' : color, r0: crit ? 12 : 5, r1: crit ? 54 : 24 });
  const n = crit ? 16 : Math.min(11, 3 + (power | 0));
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = rnd(crit ? 2.4 : 1, crit ? 7 : 3.6);
    fx.push({ t: 'd', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: rnd(0.03, 0.07), c: Math.random() < 0.5 ? color : '#fff0c0', r: rnd(1.2, crit ? 3.6 : 2.4) }); }
  if (crit) fx.push({ t: 'r', x, y, life: 1, decay: 0.035, c: '#ffce3a', r0: 4, r1: 78 });
}

/* ---------- 3D render (extruded silhouette stack + perspective) ---------- */
function drawBody3D(ctx, b, alpha) {
  if (!b.canvas) return;
  const a = b.angle, beta = (b.tilt || 0) * MAXLEAN, psi = b.wobblePhase || 0;
  const ux = Math.sin(beta) * Math.cos(psi), uy = Math.sin(beta) * Math.sin(psi), uz = Math.cos(beta);
  let hx = Math.cos(a), hy = Math.sin(a); const hd = hx * ux + hy * uy;
  let e1x = hx - hd * ux, e1y = hy - hd * uy, e1z = -hd * uz; const el = Math.hypot(e1x, e1y, e1z) || 1; e1x /= el; e1y /= el; e1z /= el;
  const e2x = uy * e1z - uz * e1y, e2y = uz * e1x - ux * e1z, e2z = ux * e1y - uy * e1x;
  const s1x = e1x, s1y = e1y * VIEW_KY - e1z * VIEW_KZ, s2x = e2x, s2y = e2y * VIEW_KY - e2z * VIEW_KZ;
  const uSx = ux * THICK, uSy = (uy * VIEW_KY - uz * VIEW_KZ) * THICK;
  const base = projPt(b.x, b.y, 0);
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save();
  ctx.translate(base[0], base[1] + 3); ctx.scale(1, VIEW_KY * 0.55);
  ctx.fillStyle = `rgba(8,10,18,${0.30 * (alpha == null ? 1 : alpha)})`; ctx.beginPath(); ctx.arc(0, 0, b.boundR * 0.95, 0, 7); ctx.fill(); ctx.restore();
  const layers = Math.max(4, Math.round(THICK * 0.8));
  for (let k = 0; k <= layers; k++) { const t = k / layers;
    ctx.setTransform(s1x, s1y, s2x, s2y, base[0] + uSx * t, base[1] + uSy * t); ctx.drawImage(b.sideCanvas, -b.cvcx, -b.cvcy); }
  ctx.setTransform(s1x, s1y, s2x, s2y, base[0] + uSx, base[1] + uSy); ctx.drawImage(b.canvas, -b.cvcx, -b.cvcy);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}
function drawBowl(ctx) {
  ctx.save(); ctx.translate(ARENA_CX + SHX, ARENA_CY + SHY); ctx.scale(1, VIEW_KY);
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, ARENA_R);
  g.addColorStop(0, 'rgba(40,46,66,0.9)'); g.addColorStop(0.7, 'rgba(22,26,40,0.95)'); g.addColorStop(1, 'rgba(10,12,22,1)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ARENA_R, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,210,.12)'; ctx.lineWidth = 1;
  for (let rr = 66; rr < ARENA_R; rr += 66) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.stroke(); }
  ctx.setLineDash([5, 8]); ctx.beginPath();
  ctx.moveTo(0, -ARENA_R); ctx.lineTo(0, ARENA_R); ctx.moveTo(-ARENA_R, 0); ctx.lineTo(ARENA_R, 0);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(150,180,240,.32)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, ARENA_R, 0, 7); ctx.stroke();
  ctx.restore();
}

/* =========================================================================
   5. battle orchestration (N-way royale)
   ========================================================================= */
function centralBody(list, cn) { for (const b of list) if (b.nodeIdxs.indexOf(cn) >= 0) return b; let x = list[0]; for (const b of list) if (b && b.m > x.m) x = b; return x; }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('failed to load ' + src));
    img.src = src;
  });
}

let HUD = {};   // owner -> { card, bar, spin, statEls }
let LOG_EL = null, LOG_LINES = [];

function logLine(msg) {
  LOG_LINES.push(msg); if (LOG_LINES.length > 40) LOG_LINES.shift();
  if (LOG_EL) { LOG_EL.innerHTML = LOG_LINES.map(l => '<div>• ' + l + '</div>').join(''); LOG_EL.scrollTop = LOG_EL.scrollHeight; }
}
function nameOf(owner) { return (SIM && SIM.tops[owner]) ? SIM.tops[owner].name : ('#' + owner); }
function logHit(atk, def, crit) {
  if (crit) logLine(`<b style="color:#e8b020">${nameOf(atk)}</b> 蓄力暴击命中 <b>${nameOf(def)}</b>！`);
}

async function start(config) {
  const screens = (config.screens || []).slice(0, 7);
  if (screens.length < 2) { document.getElementById('bb-arena')?.replaceWith(Object.assign(document.createElement('div'), { className: 'bb-error', textContent: 'Need at least 2 screens to battle.' })); return; }
  const count = screens.length;

  // load images + build tops.
  const tops = [];
  for (let i = 0; i < screens.length; i++) {
    const sc = screens[i]; let img;
    try { img = await loadImage(sc.image); } catch (e) { logLine('⚠ ' + (sc.name || sc.image) + ' failed to load'); continue; }
    const color = PALETTE[i % PALETTE.length];
    const top = buildTop(img, sc.structure, color, count);
    tops.push({ owner: tops.length, name: sc.name || ('Screen ' + (i + 1)), color, top, img,
      bodies: [], alive: true, integrity: 1, origMass: top.origMass });
  }
  if (tops.length < 2) return;
  tops.forEach((t, i) => t.owner = i);

  buildHUD(tops, config);
  SIM = { tops, fx: [], shake: 0, finished: false, winner: null, raf: 0, wreck: [] };
  setupRound();
  // debug fast-forward: #ff<N> runs N sim ticks synchronously before rendering (for headless testing).
  const ffm = DEBUG && (location.hash.match(/ff(\d+)/) || [])[1];
  if (ffm) { const steps = Math.min(20000, +ffm); for (let i = 0; i < steps && !SIM.finished; i++) tick(); render(); updateHUD(); if (SIM.finished) showVictory(); return; }
  loop();
}

function setupRound() {
  const tops = SIM.tops, n = tops.length;
  SIM.fx = []; SIM.shake = 0; SIM.finished = false; SIM.winner = null; SIM.wreck = []; LOG_LINES = [];
  const ring = ARENA_INNER * 0.6;
  for (let i = 0; i < n; i++) {
    const t = tops[i];
    // reset broken joints from a prior round.
    for (const j of t.top.joints) j.broken = false;
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    const cx = ARENA_CX + Math.cos(ang) * ring, cy = ARENA_CY + Math.sin(ang) * ring;
    const body = makeBody(t.top, t.top.nodes.map((_, k) => k), 0, true, i);
    body.x = cx; body.y = cy;
    // strong inward rush + a little swirl → everyone brawls in the middle.
    const toCx = ARENA_CX - cx, toCy = ARENA_CY - cy, tl = Math.hypot(toCx, toCy) || 1;
    const inward = 2.0, tang = (i % 2 === 0 ? 1 : -1) * 0.45;
    body.vx = (toCx / tl) * inward + (-Math.sin(ang)) * tang;
    body.vy = (toCy / tl) * inward + (Math.cos(ang)) * tang;
    body.av = t.top.stats.spin0 * 1.8 * (Math.random() < 0.5 ? 1 : -1);
    t.bodies = [body]; t.alive = true; t.integrity = 1; t.lastMass = t.origMass;
  }
  logLine(`${n} 个界面入场，开始混战！`);
  updateHUD();
}

function tick() {
  const alive = SIM.tops.filter(t => t.alive);
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const t of alive) for (const b of t.bodies) stepBody(b);
    for (const w of SIM.wreck) stepBody(w);
    const stress = {}; for (const t of alive) stress[t.owner] = {};
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const A = alive[i], B = alive[j];
      for (const ba of A.bodies) for (const bb of B.bodies) collidePair(ba, bb, SIM.fx, stress[A.owner], stress[B.owner]);
    }
    for (const t of alive) t.bodies = applyFracture(t.top, t.bodies, stress[t.owner], SIM.fx);
  }
  if (DEBUG) { SIM.dbgFrame = (SIM.dbgFrame || 0) + 1;
    const minStr = alive.map(t => { let mn = 1e9; for (const n of t.top.nodes) mn = Math.min(mn, TOUGH * t.top.stats.bondStrength * (THK0 + n.thick * THKK)); return mn.toFixed(1); });
    const dist = (() => { const c = alive.map(t => centralBody(t.bodies, t.top.centerNode)); return c.length === 2 && c[0] && c[1] ? Math.round(Math.hypot(c[0].x - c[1].x, c[0].y - c[1].y)) : '?'; })();
    SIM.dbgLine = `f${SIM.dbgFrame} hits=${SIM.dbgHits || 0} maxStrike=${(SIM.dbgMaxStrike || 0).toFixed(1)} integ=${alive.map(t => Math.round(t.integrity * 100)).join(',')} minSeam=${minStr.join(',')} dist=${dist} frag=${alive.map(t => t.bodies.length).join(',')}`;
  }
  // integrity + KO checks.
  for (const t of alive) {
    const c = centralBody(t.bodies, t.top.centerNode);
    t.integrity = c ? c.m / t.origMass : 0;
    if (c && c.m < t.lastMass - 0.6) logLine(`<b style="color:${t.color}">${t.name}</b> 被撞裂，碎片飞出！`);
    t.lastMass = c ? c.m : 0;
    const spun = !c || Math.abs(c.av) < AV_DEAD;
    const shattered = t.integrity < KO_INTEGRITY;
    if (spun || shattered) {
      t.alive = false;
      logLine(`<b style="color:${t.color}">${t.name}</b> ${shattered ? '碎裂出局' : '停转出局'}。`);
      // turn its remaining bodies into fading wreckage, kicked outward.
      for (const b of t.bodies) { b.central = false; const dx = b.x - ARENA_CX, dy = b.y - ARENA_CY, dd = Math.hypot(dx, dy) || 1;
        b.vx += dx / dd * 2.5; b.vy += dy / dd * 2.5; b.fade = 1; SIM.wreck.push(b); }
      t.bodies = [];
    }
  }
  // fade wreckage.
  for (let i = SIM.wreck.length - 1; i >= 0; i--) { const w = SIM.wreck[i]; w.fade -= 0.012; if (w.fade <= 0) SIM.wreck.splice(i, 1); }

  const stillAlive = SIM.tops.filter(t => t.alive);
  if (!SIM.finished && stillAlive.length <= 1) {
    SIM.finished = true;
    SIM.winner = stillAlive[0] || SIM.tops.slice().sort((a, b) => b.integrity - a.integrity)[0];
    logLine(`🏆 <b style="color:${SIM.winner.color}">${SIM.winner.name}</b> 获胜！`);
  }
}

function loop() {
  if (!SIM) return;
  tick();
  render(); updateHUD();
  if (SIM.finished && !SIM.victoryShown) { SIM.victoryShown = true; setTimeout(showVictory, 1200); }
  SIM.raf = requestAnimationFrame(loop);
}

function render() {
  const ctx = document.getElementById('bb-arena').getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, CANVAS, CANVAS);
  SHX = 0; SHY = 0;
  if (SIM.shake > 0.3) { SHX = (Math.random() - 0.5) * SIM.shake; SHY = (Math.random() - 0.5) * SIM.shake; SIM.shake *= 0.86; } else SIM.shake = 0;
  drawBowl(ctx);
  const all = [];
  for (const t of SIM.tops) if (t.alive) for (const b of t.bodies) all.push({ b, a: 1 });
  for (const w of SIM.wreck) all.push({ b: w, a: clamp(w.fade, 0, 1) });
  all.sort((p, q) => p.b.y - q.b.y);
  for (const o of all) drawBody3D(ctx, o.b, o.a);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = SIM.fx.length - 1; i >= 0; i--) { const e = SIM.fx[i]; e.life -= e.decay; if (e.life <= 0) { SIM.fx.splice(i, 1); continue; }
    if (e.t === 'r') { const rr = lerp(e.r0, e.r1, 1 - e.life), p = projPt(e.x, e.y, 0);
      ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(1, VIEW_KY); ctx.strokeStyle = hexA(e.c, e.life * 0.7); ctx.lineWidth = 2 * e.life + 0.4; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.stroke(); ctx.restore(); }
    else { e.x += e.vx; e.y += e.vy; e.vx *= 0.93; e.vy *= 0.93; const p = projPt(e.x, e.y, 0); ctx.fillStyle = hexA(e.c, e.life); ctx.beginPath(); ctx.arc(p[0], p[1], e.r * e.life + 0.4, 0, 7); ctx.fill(); } }
  if (DEBUG && SIM.dbgLine) { ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.fillText(SIM.dbgLine, 8, 18); }
}

/* ---------- HUD ---------- */
const STAT_DEFS = [['weight', '重量'], ['attack', '攻击'], ['defense', '防御'], ['stability', '稳定'], ['durability', '耐久']];
function buildHUD(tops, config) {
  const host = document.getElementById('bb-hud'); host.innerHTML = ''; HUD = {};
  for (const t of tops) {
    const card = document.createElement('div'); card.className = 'bb-card';
    const thumb = document.createElement('canvas'); thumb.className = 'bb-thumb'; thumb.width = 96; thumb.height = 96;
    drawThumb(thumb, t); card.appendChild(thumb);
    const body = document.createElement('div'); body.className = 'bb-cardbody';
    const head = document.createElement('div'); head.className = 'bb-cardhead';
    head.innerHTML = `<span class="bb-dot" style="background:${t.color}"></span><span class="bb-name">${escapeHtml(t.name)}</span>`;
    body.appendChild(head);
    const integ = document.createElement('div'); integ.className = 'bb-meter';
    integ.innerHTML = `<span class="bb-mlabel">完整度</span><span class="bb-bar"><i style="background:${t.color}"></i></span><span class="bb-mval">100%</span>`;
    body.appendChild(integ);
    const spin = document.createElement('div'); spin.className = 'bb-meter';
    spin.innerHTML = `<span class="bb-mlabel">转速</span><span class="bb-bar bb-spin"><i></i></span>`;
    body.appendChild(spin);
    const stats = document.createElement('div'); stats.className = 'bb-stats';
    for (const [k, l] of STAT_DEFS) { const v = t.top.stats[k];
      stats.innerHTML += `<div class="bb-stat"><span>${l}</span><span class="bb-sbar"><i style="width:${v}%;background:${t.color}"></i></span><span class="bb-sval">${v}</span></div>`; }
    body.appendChild(stats);
    card.appendChild(body); host.appendChild(card);
    HUD[t.owner] = { card, integBar: integ.querySelector('i'), integVal: integ.querySelector('.bb-mval'), spinBar: spin.querySelector('i') };
  }
  LOG_EL = document.getElementById('bb-log');
}
function drawThumb(canvas, t) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
  const iw = t.img.naturalWidth || t.img.width, ih = t.img.naturalHeight || t.img.height;
  const s = Math.min(W / iw, H / ih), dw = iw * s, dh = ih * s;
  ctx.drawImage(t.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function updateHUD() {
  for (const t of SIM.tops) { const h = HUD[t.owner]; if (!h) continue;
    const pct = Math.max(0, Math.round(t.integrity * 100));
    h.integBar.style.width = pct + '%'; h.integVal.textContent = pct + '%';
    let av = 0; if (t.alive) { const c = centralBody(t.bodies, t.top.centerNode); av = c ? Math.abs(c.av) : 0; }
    h.spinBar.style.width = Math.round(clamp(av / AV_MAX, 0, 1) * 100) + '%';
    h.card.classList.toggle('bb-ko', !t.alive);
    h.card.classList.toggle('bb-win', SIM.finished && SIM.winner === t);
  }
}
function showVictory() {
  const ov = document.getElementById('bb-overlay'); if (!ov || !SIM.winner) return;
  const t = SIM.winner;
  ov.innerHTML = `<div class="bb-vbox">
    <div class="bb-vlabel" style="color:${t.color}">最强界面</div>
    <canvas class="bb-vshot" width="160" height="160"></canvas>
    <div class="bb-vname">${escapeHtml(t.name)}</div>
    <button class="bb-btn" id="bb-again">再来一场</button></div>`;
  drawThumb(ov.querySelector('.bb-vshot'), t);
  ov.classList.add('show');
  ov.querySelector('#bb-again').onclick = () => { ov.classList.remove('show'); if (SIM.raf) cancelAnimationFrame(SIM.raf); setupRound(); loop(); };
}
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

window.BeybladeBattle = { start };
})();
