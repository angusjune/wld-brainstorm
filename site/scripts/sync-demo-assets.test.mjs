import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  expandWechatChrome,
  composeScreenDocument,
  rewriteArenaHtml,
} from './sync-demo-assets.mjs'

const snippets = {
  home: '<nav class="home">{{title}}</nav>',
  inner: '<nav class="inner">{{title}}</nav>',
}

test('expandWechatChrome replaces element with variant snippet and title', () => {
  const html = '<div><wld-wechat-chrome variant="home" title="微粒贷"></wld-wechat-chrome></div>'
  assert.equal(expandWechatChrome(html, snippets), '<div><nav class="home">微粒贷</nav></div>')
})

test('expandWechatChrome defaults to inner variant and handles self-closing tag', () => {
  const html = '<wld-wechat-chrome title="借款详情"/>'
  assert.equal(expandWechatChrome(html, snippets), '<nav class="inner">借款详情</nav>')
})

test('composeScreenDocument wraps fragment in full doc with relative CSS links', () => {
  const doc = composeScreenDocument('<div class="wld-page">hi</div>', '欢迎页', snippets)
  assert.match(doc, /^<!DOCTYPE html>/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/tokens\.css">/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/components\.css">/)
  assert.match(doc, /<link rel="stylesheet" href="assets\/mockup-chrome\.css">/)
  assert.match(doc, /<title>欢迎页<\/title>/)
  assert.match(doc, /<div class="wld-page">hi<\/div>/)
})

test('composeScreenDocument rewrites root-absolute icon paths to relative', () => {
  const doc = composeScreenDocument('<img src="/assets/icons/logo-boc.svg">', 'x', snippets)
  assert.match(doc, /src="assets\/icons\/logo-boc\.svg"/)
  assert.doesNotMatch(doc, /src="\/assets\//)
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
