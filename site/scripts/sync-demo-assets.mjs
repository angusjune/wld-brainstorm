/*
 * Composes the plugin's canonical demo assets into site/public/demo/.
 * READ-ONLY toward plugins/wld-design — mirrors what the brainstorm
 * server (skills/brainstorm/server.cjs) does at request time.
 * public/demo is gitignored; this runs as predev/prebuild.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const ASSETS = path.join(REPO, 'plugins/wld-design/assets')
const BEYBLADE_SRC = path.join(REPO, 'plugins/wld-design/skills/beyblade-battle/assets')
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

export function expandWechatChrome(html, snippets) {
  return html.replace(
    /<wld-wechat-chrome\b([^>]*)\/?>\s*(?:<\/wld-wechat-chrome>)?/gi,
    (_, rawAttrs) => {
      const attrs = parseTagAttrs(rawAttrs)
      const variant = attrs.variant === 'home' || attrs.type === 'home' ? 'home' : 'inner'
      const snippet = snippets[variant]
      if (!snippet) return ''
      return snippet.replaceAll('{{title}}', escapeHtml(attrs.title || ''))
    },
  )
}

export function composeScreenDocument(fragment, title, snippets) {
  const body = expandWechatChrome(fragment, snippets).replace(
    /src="\/assets\//g,
    'src="assets/',
  )
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/components.css">
<link rel="stylesheet" href="assets/mockup-chrome.css">
<style>body { margin: 0; background: #fff; }</style>
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
  const snippets = {
    home: fs.readFileSync(mustExist(path.join(ASSETS, 'snippets/wechat-chrome-home.html')), 'utf8'),
    inner: fs.readFileSync(mustExist(path.join(ASSETS, 'snippets/wechat-chrome-inner.html')), 'utf8'),
  }

  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })

  for (const css of ['tokens.css', 'components.css', 'mockup-chrome.css']) {
    fs.copyFileSync(mustExist(path.join(ASSETS, css)), path.join(OUT, 'assets', css))
  }
  fs.cpSync(mustExist(path.join(ASSETS, 'icons')), path.join(OUT, 'assets/icons'), { recursive: true })

  const screensDir = mustExist(path.join(ASSETS, 'screens'))
  const screenFiles = fs.readdirSync(screensDir).filter((f) => f.endsWith('.html'))
  if (screenFiles.length === 0) {
    throw new Error(`sync-demo-assets: no screens found in ${screensDir}`)
  }
  for (const file of screenFiles) {
    const fragment = fs.readFileSync(path.join(screensDir, file), 'utf8')
    const title = path.basename(file, '.html')
    fs.writeFileSync(path.join(OUT, file), composeScreenDocument(fragment, title, snippets))
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
