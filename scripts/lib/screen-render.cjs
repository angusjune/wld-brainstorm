'use strict';

/**
 * Screen corpus rendering
 *
 * The production templates in `profile/screens/` are fragments: markup plus an
 * optional trailing <style> block. They carry no document shell, so previewing
 * one means wrapping it the way the skill's page scaffold does — product design
 * system links, the active platform pack's chrome, and a 375x812 viewport.
 *
 * Chrome expansion and profile config come from the skill's own
 * `scripts/lib/chrome.cjs`, so a screen previewed here renders exactly as it
 * does in `scripts/serve-preview.cjs`.
 */

const path = require('path');
const { escapeHtml, expandChrome } = require('../../brainstorm/scripts/lib/chrome.cjs');

const LIVE_RELOAD_TAGS = `
<script>window.__BRAINSTORM_SSE_URL = '/api/events';</script>
<script src="/assets/live-reload.js"></script>`;

/**
 * The phone viewport, reproduced without the mockup around it. The page class
 * is pinned to the screen height because profiles size their root element in
 * `vh`, which resolves to the window — right inside a 375x812 iframe, wrong in
 * a full browser tab, where it would push the footer out of the screen.
 */
function screenReset(pageClass) {
  const pageRule = pageClass
    ? `\n    .${pageClass} { height: 812px; min-height: 812px; }`
    : '';
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    html, body { width: 375px; height: 812px; overflow: hidden auto; background: #f5f5f5; }
    body::-webkit-scrollbar { display: none; }${pageRule}`;
}

/**
 * One screen fragment as a standalone 375x812 document. Doubles as the source
 * of the gallery's iframes; embedded copies omit live reload so a dozen screens
 * cannot exhaust the browser's per-origin connection budget — the gallery holds
 * the single SSE connection and reloads its iframes with itself.
 */
function renderScreenDocument({ fragment, chrome, title, pageClass, liveReload = true }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/profile/design-system/tokens.css">
  <link rel="stylesheet" href="/profile/design-system/components.css">
${chrome.style}
  <style>${screenReset(pageClass)}
  </style>
</head>
<body>
${expandChrome(fragment, chrome.markup)}
${liveReload ? LIVE_RELOAD_TAGS : ''}
</body>
</html>
`;
}

function renderSlide(screen) {
  const name = escapeHtml(screen.name);
  const href = `/screen/${encodeURIComponent(screen.file)}`;
  return `      <div class="phone-slide">
        <div class="phone-mockup">
          <div class="phone-screen">
            <iframe src="${href}?embed=1" title="${name}" loading="lazy"></iframe>
          </div>
        </div>
        <a class="phone-caption" href="${href}" target="_blank" rel="noopener">${name}</a>
      </div>`;
}

/**
 * The gallery: every screen in the corpus, live, in its own iframe so one
 * screen's local <style> block cannot leak into the next.
 */
function renderGalleryDocument({ screens, screenDir }) {
  const body = screens.length
    ? `    <div class="phone-gallery">
${screens.map(renderSlide).join('\n')}
    </div>`
    : `    <p class="dev-empty">${escapeHtml(screenDir)} 里还没有 .html 页面。</p>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>页面样例 · ${screens.length}</title>
  <link rel="stylesheet" href="/profile/design-system/tokens.css">
  <link rel="stylesheet" href="/assets/frame.css">
  <style>
    /* frame.css locks the page for its own scroll container; this page scrolls itself. */
    html, body { height: auto; overflow: visible; }
    .phone-screen iframe { display: block; width: 375px; height: 812px; border: 0; }
    .phone-caption { text-decoration: none; }
    .phone-caption:hover { color: var(--frame-text-primary); text-decoration: underline; }
    .dev-bar {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: baseline; gap: 12px;
      padding: 14px 24px;
      background: var(--frame-bg-secondary);
      border-bottom: 1px solid var(--frame-border);
      font: 600 14px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
      color: var(--frame-text-primary);
    }
    .dev-bar span { font-weight: 400; font-size: 12px; color: var(--frame-text-secondary); }
    .dev-empty { padding: 80px 24px; text-align: center; color: var(--frame-text-secondary); }
  </style>
</head>
<body>
  <div class="dev-bar">
    页面样例 <span>${screens.length} 个页面 · 保存文件后自动刷新 · 点击页面名单独打开</span>
  </div>
${body}
${LIVE_RELOAD_TAGS}
</body>
</html>
`;
}

module.exports = {
  renderScreenDocument,
  renderGalleryDocument,
};
