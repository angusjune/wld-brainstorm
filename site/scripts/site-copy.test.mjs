import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const page = fs.readFileSync(path.join(SITE, 'src/pages/index.astro'), 'utf8')
const layout = fs.readFileSync(path.join(SITE, 'src/layouts/Base.astro'), 'utf8')

test('site presents the current plugin and all three skills', () => {
  assert.match(page, /WLD Design 插件/)
  assert.match(page, /\$setup-profile/)
  assert.match(page, /\$brainstorm/)
  assert.match(page, /\$wtf/)
  assert.match(page, /import packageJson from '\.\.\/\.\.\/\.\.\/package\.json'/)
  assert.equal(page.match(/v\{packageJson\.version\}/g)?.length, 3)
  assert.match(layout, /WLD Design 插件/)
})

test('site documents current marketplace installation flows', () => {
  assert.match(page, /codex plugin marketplace add angusjune\/wld-brainstorm/)
  assert.match(page, /\/plugin marketplace add angusjune\/wld-brainstorm/)
  assert.match(page, /\/reload-plugins/)
})

test('site no longer advertises removed paths or fixed profile branches', () => {
  assert.doesNotMatch(page, /<code>brainstorm\/<\/code>/)
  assert.doesNotMatch(page, /command="\/brainstorm/)
  assert.doesNotMatch(page, /四个分支|小程序 Demo/)
  assert.doesNotMatch(page, /assets\/screens\//)
})

test('visible section labels follow the repository Chinese-copy rule', () => {
  for (const label of ['Skills', 'Three Skills', 'Proof', 'Workflow', 'Product Knowledge', 'Get Started', 'Easter Egg']) {
    assert.doesNotMatch(page, new RegExp(`>${label}<`))
  }
})
