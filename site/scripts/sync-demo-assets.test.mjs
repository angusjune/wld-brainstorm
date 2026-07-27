import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  splitChrome,
  expandChrome,
  composeScreenDocument,
  rewriteArenaHtml,
} from './sync-demo-assets.mjs'

const chromeMarkup = '<nav class="chrome-navbar {{variant_class}}">{{title}}</nav>'

test('splitChrome separates the style block from the nav markup', () => {
  const chrome = splitChrome(`<style data-platform-chrome>.chrome-navbar { height: 88px; }</style>\n${chromeMarkup}`)
  assert.equal(chrome.css, '.chrome-navbar { height: 88px; }')
  assert.equal(chrome.markup, chromeMarkup)
})

test('expandChrome stamps the variant class and title into the markup', () => {
  const html = '<div><preview-chrome variant="home" title="微粒贷"></preview-chrome></div>'
  assert.equal(expandChrome(html, chromeMarkup), '<div><nav class="chrome-navbar chrome-navbar--home">微粒贷</nav></div>')
})

test('expandChrome leaves the variant class empty by default and handles self-closing tag', () => {
  const html = '<preview-chrome title="借款详情"/>'
  assert.equal(expandChrome(html, chromeMarkup), '<nav class="chrome-navbar ">借款详情</nav>')
})

test('composeScreenDocument wraps fragment in full doc with relative CSS links', () => {
  const doc = composeScreenDocument('<div class="wld-page">hi</div>', '欢迎页', chromeMarkup)
  assert.match(doc, /^<!DOCTYPE html>/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/tokens\.css">/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/components\.css">/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/chrome\.css">/)
  assert.match(doc, /<title>欢迎页<\/title>/)
  assert.match(doc, /<div class="wld-page">hi<\/div>/)
})

test('composeScreenDocument rewrites root-absolute icon paths to relative', () => {
  const doc = composeScreenDocument('<img src="/profile/design-system/assets/logo-boc.svg">', 'x', chromeMarkup)
  assert.match(doc, /src="assets\/icons\/logo-boc\.svg"/)
  assert.doesNotMatch(doc, /src="\/profile\//)
})

test('rewriteArenaHtml makes all three root-absolute refs relative', () => {
  const html = `<link rel="stylesheet" href="/arena.css"><script src="/engine.js"></script>
    fetch('/battle-config.json', { cache: 'no-store' })`
  const out = rewriteArenaHtml(html)
  assert.match(out, /href="\.\/arena\.css"/)
  assert.match(out, /src="\.\/engine\.js"/)
  assert.match(out, /fetch\('\.\/battle-config\.json'/)
})

test('rewriteArenaHtml throws if a root-absolute ref survives', () => {
  assert.throws(() => rewriteArenaHtml('<link href="/arena.css"><script src="/engine.js"></script><img src="/new-asset.png">'), /root-absolute/)
})
