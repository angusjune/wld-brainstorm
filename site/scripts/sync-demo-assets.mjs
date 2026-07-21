/*
 * Composes the brainstorm skill's canonical demo assets into site/public/demo/.
 * READ-ONLY toward brainstorm/ — mirrors what the brainstorm
 * server (brainstorm/scripts/serve-preview.cjs) does at request time.
 * public/demo is gitignored; this runs as predev/prebuild.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const SKILL = path.join(REPO, 'brainstorm')
const PROFILE = path.join(SKILL, 'profile')
const DESIGN_SYSTEM = path.join(PROFILE, 'design-system')
// Resolve the platform pack the way scripts/serve-preview.cjs does, from the frontmatter of
// profile/PROFILE.md (flat `key: value` lines), rather than hardcoding wechat.
function readFrontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)
  const config = {}
  for (const line of (block ? block[1] : '').split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (m) config[m[1]] = m[2].trim()
  }
  return config
}
const PROFILE_CONFIG = readFrontmatter(fs.readFileSync(path.join(PROFILE, 'PROFILE.md'), 'utf8'))
if (!PROFILE_CONFIG.platform) {
  throw new Error('sync-demo-assets: no `platform:` in profile/PROFILE.md frontmatter')
}
const PLATFORM = path.join(SKILL, 'platforms', PROFILE_CONFIG.platform)
const BEYBLADE_SRC = path.join(SKILL, 'tools/beyblade/assets')
const CANNED = path.join(HERE, '../src/beyblade-demo')
const OUT = path.join(HERE, '../public/demo')

function mustExist(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`sync-demo-assets: missing required asset: ${p}`)
  }
  return p
}

function parseTagAttrs(rawAttrs) {
  const attrs = {}
  const attrRe = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match
  while ((match = attrRe.exec(rawAttrs)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return attrs
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// A platform pack is a single chrome.html: one <style> block plus the nav
// markup stamped into each <preview-chrome> tag (same split scripts/serve-preview.cjs does).
export function splitChrome(chromeHtml) {
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/i
  const styleMatch = chromeHtml.match(styleRe)
  return {
    css: styleMatch ? styleMatch[1] : '',
    markup: chromeHtml.replace(styleRe, '').trim(),
  }
}

export function expandChrome(html, chromeMarkup) {
  return html.replace(
    /<preview-chrome\b([^>]*)\/?>\s*(?:<\/preview-chrome>)?/gi,
    (_, rawAttrs) => {
      if (!chromeMarkup) return ''
      const attrs = parseTagAttrs(rawAttrs)
      const variant = attrs.variant || attrs.type
      const variantClass = variant ? `chrome-navbar--${variant}` : ''
      return chromeMarkup
        .replaceAll('{{variant_class}}', escapeHtml(variantClass))
        .replaceAll('{{title}}', escapeHtml(attrs.title || ''))
    },
  )
}

export function composeScreenDocument(fragment, title, chromeMarkup) {
  const body = expandChrome(fragment, chromeMarkup)
    .replace(/src="\/assets\//g, 'src="assets/')
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
  const chrome = splitChrome(fs.readFileSync(mustExist(path.join(PLATFORM, 'chrome.html')), 'utf8'))

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })

  // Flattened into one assets/ dir for the static site; the three layers stay
  // distinct in the skill itself.
  for (const css of ['tokens.css', 'components.css']) {
    fs.copyFileSync(mustExist(path.join(DESIGN_SYSTEM, css)), path.join(OUT, 'assets', css))
  }
  fs.writeFileSync(path.join(OUT, 'assets/chrome.css'), chrome.css)
  fs.cpSync(mustExist(path.join(DESIGN_SYSTEM, 'icons')), path.join(OUT, 'assets/icons'), { recursive: true })

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

  fs.mkdirSync(path.join(OUT, 'beyblade'), { recursive: true })
  const arenaHtml = fs.readFileSync(mustExist(path.join(BEYBLADE_SRC, 'arena.html')), 'utf8')
  fs.writeFileSync(path.join(OUT, 'beyblade/arena.html'), rewriteArenaHtml(arenaHtml))
  for (const file of ['arena.css', 'engine.js']) {
    fs.copyFileSync(mustExist(path.join(BEYBLADE_SRC, file)), path.join(OUT, 'beyblade', file))
  }

  // Canned battle data is added in a later task; copy when present.
  if (fs.existsSync(CANNED)) {
    fs.cpSync(CANNED, path.join(OUT, 'beyblade'), { recursive: true })
  }

  console.log(`sync-demo-assets: composed ${screenFiles.length} screens → ${OUT}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  sync()
}
