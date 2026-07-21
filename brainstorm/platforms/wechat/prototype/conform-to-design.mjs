#!/usr/bin/env node

/**
 * Mini Program design-conformance comparator (Rung 6).
 *
 * Pairs design reference PNGs against Mini Program screenshot PNGs (by
 * basename), computes a per-pixel drift, and renders a [ref | impl | diff]
 * composite per screen plus a manifest. The agent then READS each composite
 * (perceptual / VLM comparison), edits the demo .wxss/.wxml, re-captures, and
 * re-runs — see conform-design.md.
 *
 * Usage:
 *   node conform-to-design.mjs <projectDir> [--threshold 40] [--mask x,y,w,h]... [--ref <dir>] [--impl <dir>]
 *
 * Defaults: ref=<project>/.conform/ref, impl=<project>/.conform/impl, out=<project>/.conform/out
 * Needs a headless Chrome/Chromium (set CHROME_PATH, or default macOS path).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function parseArgs(argv) {
  const out = { _: [], threshold: 40, masks: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--threshold') out.threshold = Number(argv[++i]);
    else if (a === '--ref') out.ref = argv[++i];
    else if (a === '--impl') out.impl = argv[++i];
    else if (a === '--mask') {
      const [x, y, w, h] = String(argv[++i]).split(',').map(Number);
      out.masks.push({ x, y, w, h });
    } else out._.push(a);
  }
  return out;
}

function pngBasenames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).map((f) => f.replace(/\.png$/i, ''));
}

function dataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

// Build the per-pair harness HTML. Images live in JS (Image objects), NOT in the
// DOM, so --dump-dom stays small. The result is written into hidden spans.
function harnessHtml({ name, threshold, masks, refData, implData }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#222;}
    #c{display:block;}
    .meta{position:absolute;left:-9999px;}
  </style></head><body>
  <canvas id="c" width="100" height="100"></canvas>
  <div class="meta"><span id="driftpct"></span><span id="refsize"></span><span id="implsize"></span></div>
  <script>
  const NAME=${JSON.stringify(name)}, THRESHOLD=${threshold}, MASKS=${JSON.stringify(masks)};
  const load=(src)=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});
  Promise.all([load(${JSON.stringify(refData)}),load(${JSON.stringify(implData)})]).then(([ref,impl])=>{
    const rW=ref.naturalWidth,rH=ref.naturalHeight,iW=impl.naturalWidth,iH=impl.naturalHeight;
    const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const rc=mk(rW,rH); rc.getContext('2d').drawImage(ref,0,0);
    const ic=mk(rW,rH); ic.getContext('2d').drawImage(impl,0,0,iW,iH,0,0,rW,rH);
    const rd=rc.getContext('2d').getImageData(0,0,rW,rH).data;
    const idd=ic.getContext('2d').getImageData(0,0,rW,rH).data;
    const dc=mk(rW,rH); const dctx=dc.getContext('2d'); const dimg=dctx.createImageData(rW,rH); const dd=dimg.data;
    const masked=(x,y)=>MASKS.some(m=>x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h);
    let changed=0,counted=0;
    for(let y=0;y<rH;y++)for(let x=0;x<rW;x++){
      const p=(y*rW+x)*4;
      if(masked(x,y)){dd[p]=120;dd[p+1]=120;dd[p+2]=160;dd[p+3]=255;continue;}
      counted++;
      const df=Math.max(Math.abs(rd[p]-idd[p]),Math.abs(rd[p+1]-idd[p+1]),Math.abs(rd[p+2]-idd[p+2]));
      if(df>THRESHOLD){changed++;dd[p]=255;dd[p+1]=45;dd[p+2]=45;dd[p+3]=255;}
      else{const g=rd[p]*0.3+rd[p+1]*0.59+rd[p+2]*0.11;const v=205+g*0.16;dd[p]=v;dd[p+1]=v;dd[p+2]=v;dd[p+3]=255;}
    }
    dctx.putImageData(dimg,0,0);
    const drift=counted?changed/counted*100:0;
    let DH=700, sW=Math.round(rW*DH/rH); const MAXW=440;
    if(sW>MAXW){sW=MAXW;DH=Math.round(sW*rH/rW);}
    const gap=24,pad=20,labelH=64;
    const comp=document.getElementById('c');
    comp.width=pad*2+sW*3+gap*2; comp.height=pad+labelH+DH+pad;
    const cx=comp.getContext('2d');
    cx.fillStyle='#222';cx.fillRect(0,0,comp.width,comp.height);
    cx.fillStyle='#fff';cx.font='bold 22px -apple-system,Arial,sans-serif';
    cx.fillText(NAME+'    drift '+drift.toFixed(2)+'%    (threshold '+THRESHOLD+', red = mismatch, blue = masked)',pad,pad+26);
    const y0=pad+labelH;
    cx.fillStyle='#bbb';cx.font='14px -apple-system,Arial,sans-serif';
    cx.fillText('design (ref)',pad,y0-8);
    cx.fillText('mini program (impl)',pad+sW+gap,y0-8);
    cx.fillText('diff',pad+2*(sW+gap),y0-8);
    cx.drawImage(rc,pad,y0,sW,DH);
    cx.drawImage(ic,pad+sW+gap,y0,sW,DH);
    cx.drawImage(dc,pad+2*(sW+gap),y0,sW,DH);
    document.getElementById('driftpct').textContent=drift.toFixed(2);
    document.getElementById('refsize').textContent=rW+'x'+rH;
    document.getElementById('implsize').textContent=iW+'x'+iH;
    document.body.setAttribute('data-done','1');
  }).catch(e=>{document.getElementById('driftpct').textContent='ERR:'+e;});
  </script></body></html>`;
}

function runChromeScreenshot(chrome, htmlPath, outPng) {
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1500,900',
    '--virtual-time-budget=6000', `--screenshot=${outPng}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' });
}

function runChromeDumpDom(chrome, htmlPath) {
  return execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--virtual-time-budget=6000',
    '--dump-dom', `file://${htmlPath}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
}

function extractSpan(dom, id) {
  const m = dom.match(new RegExp(`<span id="${id}">([^<]*)</span>`));
  return m ? m[1] : null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = args._[0];
  if (!projectDir) {
    console.error('Usage: node conform-to-design.mjs <projectDir> [--threshold 40] [--mask x,y,w,h]... [--ref <dir>] [--impl <dir>]');
    process.exitCode = 2;
    return;
  }
  const chrome = findChrome();
  if (!chrome) {
    console.error('No Chrome/Chromium found. Set CHROME_PATH to a Chrome binary.');
    process.exitCode = 2;
    return;
  }
  const root = path.resolve(projectDir);
  const refDir = path.resolve(args.ref || path.join(root, '.conform', 'ref'));
  const implDir = path.resolve(args.impl || path.join(root, '.conform', 'impl'));
  const outDir = path.join(root, '.conform', 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const names = [...new Set([...pngBasenames(refDir), ...pngBasenames(implDir)])].sort();
  if (names.length === 0) {
    console.error(`No PNGs found in ${refDir} or ${implDir}. Capture impl screenshots and acquire design refs first (see conform-design.md).`);
    process.exitCode = 1;
    return;
  }

  const pairs = [];
  for (const name of names) {
    const refPng = path.join(refDir, `${name}.png`);
    const implPng = path.join(implDir, `${name}.png`);
    const hasRef = fs.existsSync(refPng);
    const hasImpl = fs.existsSync(implPng);
    if (!hasRef || !hasImpl) {
      pairs.push({ name, ref: hasRef ? path.relative(root, refPng) : null, impl: hasImpl ? path.relative(root, implPng) : null, composite: null, refSize: null, implSize: null, driftPct: null, status: hasRef ? 'impl-missing' : 'ref-missing' });
      continue;
    }
    const html = harnessHtml({ name, threshold: args.threshold, masks: args.masks, refData: dataUri(refPng), implData: dataUri(implPng) });
    const tmp = path.join(os.tmpdir(), `brainstorm-conform-${name}.html`);
    fs.writeFileSync(tmp, html);
    const composite = path.join(outDir, `${name}.composite.png`);
    let driftPct = null; let refSize = null; let implSize = null;
    try {
      runChromeScreenshot(chrome, tmp, composite);
      const dom = runChromeDumpDom(chrome, tmp);
      const d = extractSpan(dom, 'driftpct');
      driftPct = d && !d.startsWith('ERR') ? Number(d) : null;
      refSize = (extractSpan(dom, 'refsize') || '').split('x').map(Number);
      implSize = (extractSpan(dom, 'implsize') || '').split('x').map(Number);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
    pairs.push({
      name,
      ref: path.relative(root, refPng),
      impl: path.relative(root, implPng),
      composite: path.relative(root, composite),
      refSize: refSize && refSize.length === 2 ? refSize : null,
      implSize: implSize && implSize.length === 2 ? implSize : null,
      driftPct,
      status: 'ok',
    });
  }

  const compared = pairs.filter((p) => p.status === 'ok' && p.driftPct != null);
  const drifts = compared.map((p) => p.driftPct);
  const manifest = {
    generatedFor: root,
    threshold: args.threshold,
    masks: args.masks,
    pairs,
    summary: {
      pairs: pairs.length,
      compared: compared.length,
      avgDriftPct: drifts.length ? Number((drifts.reduce((a, b) => a + b, 0) / drifts.length).toFixed(2)) : null,
      maxDriftPct: drifts.length ? Math.max(...drifts) : null,
    },
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('='.repeat(72));
  console.log('Mini Program design-conformance report');
  console.log('='.repeat(72));
  for (const p of pairs) {
    if (p.status === 'ok') console.log(`  ${p.name}: drift ${p.driftPct == null ? '?' : `${p.driftPct}%`}  →  ${p.composite}`);
    else console.log(`  ${p.name}: ${p.status} (skipped)`);
  }
  console.log('');
  console.log(`Compared ${compared.length}/${pairs.length} screens. ` + (manifest.summary.maxDriftPct != null ? `avg ${manifest.summary.avgDriftPct}%, max ${manifest.summary.maxDriftPct}%.` : ''));
  console.log(`Read each composite in ${path.relative(root, outDir)}/ and fix the demo .wxss/.wxml, then re-capture and re-run.`);
}

main();
