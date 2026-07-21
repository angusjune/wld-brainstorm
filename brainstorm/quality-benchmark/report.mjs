#!/usr/bin/env node

/**
 * UI-quality benchmark report for brainstorm outputs.
 *
 * Scores every case in a benchmark run with the brainstorm QA gate and
 * renders each screen through the REAL brainstorm server (so the
 * <preview-chrome> expansion and frame styles match what users see),
 * then writes report.json + report.md into the run directory.
 *
 * Usage from the brainstorm skill directory:
 *   node quality-benchmark/report.mjs profile/quality/benchmark/runs/<version> \
 *     [--compare profile/quality/benchmark/runs/<other-version>] [--port 3999]
 *
 * Run layout: <runDir>/<case-id>/*.html
 * (see quality-benchmark/README.md).
 * With --compare, both runs are rendered and a side-by-side composite
 * [this-run | other-run] is written per shared case file into
 * <runDir>/compare-<other-version>/.
 *
 * Rendering needs headless Chrome (CHROME_PATH or a default install);
 * without it the report still carries gate numbers, renders are skipped.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, execFileSync } from 'node:child_process';

const BENCHMARK_DIR = path.dirname(fileURLToPath(import.meta.url));
const BRAINSTORM_DIR = path.resolve(BENCHMARK_DIR, '..');
const GATE = path.join(BRAINSTORM_DIR, 'scripts/run-qa-gate.mjs');
const SERVER = path.join(BRAINSTORM_DIR, 'scripts/serve-preview.cjs');

function findChrome() {
  return [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean).find((p) => fs.existsSync(p)) || null;
}

function parseArgs(argv) {
  const out = { _: [], port: 3999 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--compare') out.compare = path.resolve(argv[++i]);
    else if (argv[i] === '--port') out.port = Number(argv[++i]);
    else out._.push(argv[i]);
  }
  return out;
}

function listCases(runDir) {
  return fs.readdirSync(runDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('compare-') && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((id) => fs.readdirSync(path.join(runDir, id)).some((f) => f.endsWith('.html')))
    .sort();
}

function htmlFiles(runDir, caseId) {
  return fs.readdirSync(path.join(runDir, caseId)).filter((f) => f.endsWith('.html')).sort();
}

function gateCase(runDir, caseId) {
  const result = spawnSync(process.execPath, [GATE, '--json', path.join(runDir, caseId)], { encoding: 'utf8' });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`qa-gate failed on ${caseId}: ${result.stderr || result.stdout}`);
  }
  return {
    id: caseId,
    files: parsed.files.map((f) => ({
      name: path.basename(f.file),
      errors: f.errors,
      warnings: f.warnings,
      findings: f.findings,
    })),
    errors: parsed.errors,
    warnings: parsed.warnings,
  };
}

// ---- Rendering through the real brainstorm server ----

async function startServer(basePort) {
  for (let port = basePort; port < basePort + 10; port += 1) {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-uiq-render-'));
    const child = spawn(process.execPath, [SERVER, '--project-dir', projectDir, '--port', String(port)], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const line = await new Promise((resolve) => {
      let buffer = '';
      child.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const newline = buffer.indexOf('\n');
        if (newline >= 0) resolve(buffer.slice(0, newline));
      });
      child.on('exit', () => resolve(buffer));
      setTimeout(() => resolve(buffer), 5000);
    });
    let info;
    try {
      info = JSON.parse(line);
    } catch {
      child.kill();
      fs.rmSync(projectDir, { recursive: true, force: true });
      continue;
    }
    if (info.error === 'EADDRINUSE') {
      fs.rmSync(projectDir, { recursive: true, force: true });
      continue;
    }
    return { child, projectDir, ...info };
  }
  throw new Error(`no free port found starting at ${basePort}`);
}

function renderWindowSize(html) {
  const phones = (html.match(/class\s*=\s*"[^"]*phone-mockup/g) || []).length || 1;
  const width = Math.min(1680, 260 + phones * 440);
  return `${width},1300`;
}

function renderRun(chrome, server, runDir, cases) {
  const rendered = [];
  for (const caseId of cases) {
    for (const file of htmlFiles(runDir, caseId)) {
      const source = path.join(runDir, caseId, file);
      const served = `${caseId.replace(/[^\w-]/g, '_')}__${file}`;
      fs.copyFileSync(source, path.join(server.screenDir, served));
      const outPng = path.join(runDir, caseId, `${file}.png`);
      try {
        // No --virtual-time-budget here: the injected live-reload client keeps an SSE
        // connection open, which pauses virtual time forever. The load event
        // (which EventSource does not block) is the right capture point.
        execFileSync(chrome, [
          '--headless=new', '--disable-gpu', '--hide-scrollbars',
          `--window-size=${renderWindowSize(fs.readFileSync(source, 'utf8'))}`,
          `--screenshot=${outPng}`,
          `${server.url}/${served}`,
        ], { stdio: 'ignore', timeout: 30000 });
        if (fs.existsSync(outPng)) rendered.push({ caseId, file, png: outPng });
      } catch {
        console.error(`render failed: ${caseId}/${file}`);
      }
    }
  }
  return rendered;
}

// ---- Side-by-side composites ----

function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function composite(chrome, leftPng, leftLabel, rightPng, rightLabel, outPng) {
  const left = pngSize(leftPng);
  const right = pngSize(rightPng);
  const pad = 24;
  const labelBand = 48;
  const width = left.width + right.width + pad * 3;
  const height = Math.max(left.height, right.height) + pad * 2 + labelBand;
  const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#15171b;display:flex;gap:${pad}px;padding:${pad}px;align-items:flex-start;font-family:system-ui}
    figure{margin:0}
    figcaption{color:#e8e8e8;font-size:20px;padding-bottom:12px;font-weight:600}
    img{display:block;outline:1px solid #333}
  </style></head><body>
    <figure><figcaption>${leftLabel}</figcaption><img src="file://${leftPng}" width="${left.width}"></figure>
    <figure><figcaption>${rightLabel}</figcaption><img src="file://${rightPng}" width="${right.width}"></figure>
  </body></html>`;
  const tmp = path.join(os.tmpdir(), `brainstorm-uiq-composite-${path.basename(outPng)}.html`);
  fs.writeFileSync(tmp, page);
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${outPng}`, `file://${tmp}`,
    ], { stdio: 'ignore', timeout: 30000 });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return fs.existsSync(outPng);
}

// ---- Report writing ----

function writeReports(runDir, cases, rendered, compareInfo) {
  const totals = {
    errors: cases.reduce((n, c) => n + c.errors, 0),
    warnings: cases.reduce((n, c) => n + c.warnings, 0),
    files: cases.reduce((n, c) => n + c.files.length, 0),
  };
  const report = {
    run: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    totals,
    cases: cases.map((c) => ({
      ...c,
      renders: rendered.filter((r) => r.caseId === c.id).map((r) => path.basename(r.png)),
    })),
    compare: compareInfo,
  };
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));

  const lines = [
    `# UI-quality report — ${report.run}`,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `**Totals: ${totals.errors} error(s), ${totals.warnings} warning(s) across ${totals.files} screen file(s) in ${cases.length} case(s).**`,
    '',
    '| Case | Files | Errors | Warnings | Error codes |',
    '|------|-------|--------|----------|-------------|',
  ];
  for (const c of report.cases) {
    const codes = [...new Set(c.files.flatMap((f) => f.findings.filter((x) => x.severity === 'error').map((x) => x.code)))];
    lines.push(`| ${c.id} | ${c.files.length} | ${c.errors} | ${c.warnings} | ${codes.join(', ') || '—'} |`);
  }
  lines.push('');
  for (const c of report.cases) {
    if (c.files.every((f) => f.findings.length === 0)) continue;
    lines.push(`## ${c.id}`, '');
    for (const f of c.files) {
      for (const finding of f.findings) {
        lines.push(`- \`${f.name}\` [${finding.severity}] **${finding.code}** L${finding.line}: ${finding.message}`);
      }
    }
    lines.push('');
  }
  if (compareInfo && compareInfo.composites.length > 0) {
    lines.push(`## Side-by-side vs ${compareInfo.against}`, '');
    for (const composite of compareInfo.composites) lines.push(`- ${composite}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(runDir, 'report.md'), lines.join('\n'));
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runDir = args._[0] && path.resolve(args._[0]);
  if (!runDir || !fs.existsSync(runDir)) {
    console.error('Usage: node quality-benchmark/report.mjs <runDir> [--compare <otherRunDir>] [--port N]');
    process.exitCode = 2;
    return;
  }

  const cases = listCases(runDir).map((id) => gateCase(runDir, id));
  console.log(`Gated ${cases.length} case(s): ${cases.reduce((n, c) => n + c.errors, 0)} error(s), ${cases.reduce((n, c) => n + c.warnings, 0)} warning(s)`);

  const chrome = findChrome();
  let rendered = [];
  let compareInfo = null;

  if (!chrome) {
    console.error('No Chrome/Chromium found (set CHROME_PATH) — skipping renders and composites.');
  } else {
    const server = await startServer(args.port);
    try {
      rendered = renderRun(chrome, server, runDir, cases.map((c) => c.id));
      console.log(`Rendered ${rendered.length} screen(s) via ${server.url}`);
      if (args.compare) {
        const otherCases = listCases(args.compare);
        const otherRendered = renderRun(chrome, server, args.compare, otherCases);
        const against = path.basename(args.compare);
        const compareDir = path.join(runDir, `compare-${against}`);
        fs.mkdirSync(compareDir, { recursive: true });
        const composites = [];
        for (const mine of rendered) {
          const theirs = otherRendered.find((r) => r.caseId === mine.caseId && r.file === mine.file);
          if (!theirs) continue;
          const out = path.join(compareDir, `${mine.caseId.replace(/[^\w-]/g, '_')}__${mine.file}.png`);
          if (composite(chrome, mine.png, path.basename(runDir), theirs.png, against, out)) {
            composites.push(path.relative(runDir, out));
          }
        }
        compareInfo = { against, composites };
        console.log(`Composited ${composites.length} side-by-side comparison(s) into ${compareDir}`);
      }
    } finally {
      // Wait for the server to actually exit before removing its project dir:
      // its shutdown handler writes a state file, which races rmSync (ENOTEMPTY).
      const exited = new Promise((resolve) => {
        server.child.on('exit', resolve);
        setTimeout(resolve, 4000);
      });
      server.child.kill('SIGTERM');
      await exited;
      try {
        fs.rmSync(server.projectDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch (err) {
        console.error(`cleanup warning: could not remove ${server.projectDir}: ${err.message}`);
      }
    }
  }

  writeReports(runDir, cases, rendered, compareInfo);
  console.log(`Report written: ${path.join(runDir, 'report.md')}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
