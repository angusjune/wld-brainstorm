'use strict';

/**
 * Preview chrome, resolved from the active platform pack.
 *
 * Nothing here knows what WeChat is: the tag is always `<preview-chrome>`, and
 * what it renders comes from the single `chrome.html` of the pack the profile
 * selects. Swapping platform is a PROFILE.md frontmatter edit, not a code
 * change.
 *
 * Shared machinery: it names no product and assumes no platform. Both the
 * skill's `scripts/serve-preview.cjs` and the repo's screen-corpus dev server
 * expand chrome through this module, so a screen renders the same in either.
 */

const fs = require('fs');
const path = require('path');

const CHROME_TAG = 'preview-chrome';
const CHROME_STYLE_RE = /<style[^>]*>[\s\S]*?<\/style>/i;

// The attrs group must skip over quoted attribute values before it looks for
// the tag's real closing '>' — an attribute like trailing="<svg>...</svg>"
// can itself contain '>' characters (e.g. self-closing sub-tags), and a plain
// `[^>]*` would stop at the first one of those instead of the tag's own end.
const CHROME_TAG_RE = new RegExp(
  `<${CHROME_TAG}\\b((?:"[^"]*"|'[^']*'|[^>'"])*?)\\/?>\\s*(?:<\\/${CHROME_TAG}>)?`,
  'gi',
);

// The profile's machine-readable config is the frontmatter block at the top of
// the selected PROFILE.md: flat `key: value` lines between two `---` fences.
function readProfileConfig(profileDir) {
  let text = '';
  try { text = fs.readFileSync(path.join(profileDir, 'PROFILE.md'), 'utf8'); } catch {}
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  const config = {};
  if (block) {
    for (const line of block[1].split('\n')) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (m) config[m[1]] = m[2].trim();
    }
  }
  return config;
}

/**
 * The pack's chrome.html carries one <style> block (injected once into every
 * served page) and the nav markup stamped into each <preview-chrome> tag. A
 * pack without chrome.html — or no platform at all — is chrome-less: `markup`
 * is empty and the tag expands to nothing.
 *
 * Returns `{ style, markup }`, where `style` is the pack's raw <style> tag and
 * `markup` is the nav markup with every opening tag carrying `data-bs-chrome`.
 * That stamp is load-bearing: the annotation client uses it to keep chrome
 * un-annotatable, and the browser contract counts it to verify expansion.
 */
function loadChrome(platformDir) {
  let chromeHtml = '';
  if (platformDir) {
    try { chromeHtml = fs.readFileSync(path.join(platformDir, 'chrome.html'), 'utf8'); } catch {}
  }

  const styleMatch = chromeHtml.match(CHROME_STYLE_RE);
  const style = styleMatch ? styleMatch[0] : '';
  // The <style> block is stripped before stamping, so stamping every opening
  // tag cannot accidentally alter CSS text or the pack's layout.
  const markup = chromeHtml
    .replace(CHROME_STYLE_RE, '')
    .trim()
    .replace(/<([a-zA-Z][\w-]*)(?=[\s>/])/g, '<$1 data-bs-chrome');

  return { style, markup };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseTagAttrs(rawAttrs) {
  const attrs = {};
  const attrRe = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  while ((match = attrRe.exec(rawAttrs)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

// Which variants exist is the pack's business: a variant attribute becomes a
// chrome-navbar--<variant> modifier class, and the pack's own CSS decides what
// (if anything) that modifier changes. No attribute means the default shell.
function renderChrome(attrs, chromeMarkup) {
  if (!chromeMarkup) return '';
  const variant = attrs.variant || attrs.type;
  const variantClass = variant ? `chrome-navbar--${variant}` : '';
  return chromeMarkup
    .replaceAll('{{variant_class}}', escapeHtml(variantClass))
    .replaceAll('{{title}}', escapeHtml(attrs.title || ''))
    // Unlike title, trailing holds markup (an icon), not plain text — it must
    // not be escaped, the same way the pack's own markup isn't.
    .replaceAll('{{trailing}}', attrs.trailing || '');
}

// A pack with no variants (or no platform at all) expands the tag to nothing,
// which is what a chrome-less product wants.
function expandChrome(html, chromeMarkup) {
  return html.replace(CHROME_TAG_RE, (_, rawAttrs) => renderChrome(parseTagAttrs(rawAttrs), chromeMarkup));
}

module.exports = {
  CHROME_TAG,
  escapeHtml,
  expandChrome,
  loadChrome,
  parseTagAttrs,
  readProfileConfig,
  renderChrome,
};
