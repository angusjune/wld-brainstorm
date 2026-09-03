/*
 * Composes the brainstorm skill's canonical demo assets into site/public/demo/.
 * READ-ONLY toward skills/brainstorm/ — mirrors what the brainstorm
 * server (skills/brainstorm/scripts/serve-preview.cjs) does at request time.
 * public/demo is gitignored; this runs as predev/prebuild.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import chromeModule from '../../skills/brainstorm/scripts/lib/chrome.cjs'
import profileModule from '../../skills/brainstorm/scripts/lib/profile-selection.cjs'

const { escapeHtml, expandChrome, loadChrome } = chromeModule
const { readProfileConfig } = profileModule

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const SKILL = path.join(REPO, 'skills', 'brainstorm')
const PROFILE = path.join(SKILL, 'profile')
const DESIGN_SYSTEM = path.join(PROFILE, 'design-system')
const PROFILE_CONFIG = readProfileConfig(PROFILE)
if (!PROFILE_CONFIG.platform) {
  throw new Error('sync-demo-assets: no `platform:` in profile/PROFILE.md frontmatter')
}
const PLATFORM = path.join(SKILL, 'platforms', PROFILE_CONFIG.platform)
// The beyblade arena is site-owned: the skill's copy was removed with the tool
// itself, so its source lives here alongside the canned battle data.
const BEYBLADE_SRC = path.join(HERE, '../src/beyblade-demo')
const OUT = path.join(HERE, '../public/demo')

function mustExist(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`sync-demo-assets: missing required asset: ${p}`)
  }
  return p
}

export function composeScreenDocument(fragment, title, chromeMarkup) {
  const body = expandChrome(fragment, chromeMarkup)
    .replace(/src="\/assets\//g, 'src="assets/')
    // The profile's icons live in design-system/assets/; the static site keeps
    // them under assets/icons/ so they stay separate from the stylesheets that
    // share the flattened assets/ dir. Must precede the general rule below.
    .replace(/src="\/profile\/design-system\/assets\//g, 'src="assets/icons/')
    .replace(/url\((["']?)\/profile\/design-system\/assets\//g, 'url($1assets/icons/')
    .replace(/src="\/profile\/design-system\//g, 'src="assets/')
    .replace(/src="\/profile\//g, 'src="assets/')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/components.css">
<link rel="stylesheet" href="assets/chrome.css">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
body { margin: 0; background: #fff; }
</style>
</head>
<body>
${body}
</body>
</html>
`
}

export function rewriteArenaHtml(html) {
  const out = html
    .replace('href="/arena.css"', 'href="./arena.css"')
    .replace('src="/engine.js"', 'src="./engine.js"')
    .replace("fetch('/battle-config.json'", "fetch('./battle-config.json'")

  const leftover = out.match(/(?:href|src)="\/[^"]*"|fetch\('\/[^']*'/)
  if (leftover) {
    throw new Error(`rewriteArenaHtml: root-absolute ref survived rewrite: ${leftover[0]}`)
  }

  return out
}

function sync() {
  // Chrome comes from the active platform pack's chrome.html, as at runtime.
  mustExist(path.join(PLATFORM, 'chrome.html'))
  const chrome = loadChrome(PLATFORM)

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })

  // Flattened into one assets/ dir for the static site; the three layers stay
  // distinct in the skill itself.
  for (const css of ['tokens.css', 'components.css']) {
    fs.copyFileSync(mustExist(path.join(DESIGN_SYSTEM, css)), path.join(OUT, 'assets', css))
  }
  fs.writeFileSync(path.join(OUT, 'assets/chrome.css'), chrome.css)
  fs.cpSync(mustExist(path.join(DESIGN_SYSTEM, 'assets')), path.join(OUT, 'assets/icons'), { recursive: true })

  const screensDir = mustExist(path.join(PROFILE, 'screens'))
  const screenFiles = fs.readdirSync(screensDir).filter((f) => f.endsWith('.html'))
  if (screenFiles.length === 0) {
    throw new Error(`sync-demo-assets: no screens found in ${screensDir}`)
  }
  for (const file of screenFiles) {
    const fragment = fs.readFileSync(path.join(screensDir, file), 'utf8')
    const title = path.basename(file, '.html')
    fs.writeFileSync(path.join(OUT, file), composeScreenDocument(fragment, title, chrome.markup))
  }

  // Arena sources and canned battle data ship together in one directory.
  fs.mkdirSync(path.join(OUT, 'beyblade'), { recursive: true })
  fs.cpSync(mustExist(BEYBLADE_SRC), path.join(OUT, 'beyblade'), { recursive: true })
  const arenaOut = mustExist(path.join(OUT, 'beyblade/arena.html'))
  fs.writeFileSync(arenaOut, rewriteArenaHtml(fs.readFileSync(arenaOut, 'utf8')))

  console.log(`sync-demo-assets: composed ${screenFiles.length} screens → ${OUT}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  sync()
}
