/**
 * Brainstorm — Browser click-to-annotate client
 * Injected into every screen served by the brainstorm server.
 *
 * Feature: Point at a rendered element and persist a short feedback note.
 */

(function () {
  'use strict';

  function escapeCssIdentifier(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => (
      `\\${character.codePointAt(0).toString(16)} `
    ));
  }

  function selectorSegment(element) {
    const tag = String(element?.tagName || '').toLowerCase();
    if (!tag) return '';
    if (element.id) return `${tag}#${escapeCssIdentifier(element.id)}`;

    const siblings = Array.from(element.parentElement?.children || [])
      .filter((candidate) => candidate.tagName === element.tagName);
    const position = siblings.indexOf(element);
    return siblings.length > 1 && position >= 0
      ? `${tag}:nth-of-type(${position + 1})`
      : tag;
  }

  function selectorFor(element) {
    if (!element || typeof element !== 'object') return '';
    const boundary = element.ownerDocument?.querySelector?.('#frame-content')
      || element.ownerDocument?.body
      || null;
    const segments = [];
    let current = element;
    while (current) {
      const segment = selectorSegment(current);
      if (segment) segments.unshift(segment);
      if (current === boundary) break;
      current = current.parentElement;
    }
    return segments.join(' > ');
  }

  // The browser loads this as a classic script. The CommonJS-shaped branch is
  // only for the dependency-free DOM-path regression test.
  if (typeof module === 'object' && module.exports) {
    module.exports = { selectorFor };
    return;
  }

  const screenFile = window.__BRAINSTORM_SCREEN_FILE;
  if (!screenFile) return;

  // These hardcoded colours belong to preview-harness chrome, not the design.
  // The QA gate reads screen files from disk and never sees this injected asset,
  // so its off-token-colour rule correctly does not apply here.
  const style = document.createElement('style');
  style.textContent = `
    .bs-annotate-launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483644;
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 50%;
      background: #171717;
      color: #ffffff;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
      cursor: pointer;
      font: 600 15px/1 system-ui, sans-serif;
    }
    .bs-annotate-launcher[aria-pressed="true"] { background: #2563eb; }
    .bs-annotate-highlight {
      position: absolute;
      z-index: 2147483640;
      display: none;
      box-sizing: border-box;
      border: 2px solid #2563eb;
      background: rgba(37, 99, 235, 0.12);
      pointer-events: none;
    }
    .bs-annotate-composer {
      position: fixed;
      z-index: 2147483646;
      width: 260px;
      box-sizing: border-box;
      padding: 10px;
      border: 1px solid #d4d4d4;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.22);
    }
    .bs-annotate-textarea {
      display: block;
      width: 100%;
      min-height: 76px;
      box-sizing: border-box;
      resize: vertical;
      border: 1px solid #a3a3a3;
      border-radius: 6px;
      padding: 8px;
      color: #171717;
      background: #ffffff;
      font: 14px/1.45 system-ui, sans-serif;
    }
    .bs-annotate-help {
      margin-top: 6px;
      color: #737373;
      font: 12px/1.4 system-ui, sans-serif;
    }
    .bs-annotate-error {
      min-height: 17px;
      margin-top: 4px;
      color: #b91c1c;
      font: 12px/1.4 system-ui, sans-serif;
    }
    .bs-annotate-pin {
      position: absolute;
      z-index: 2147483642;
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
      pointer-events: none;
      font: 700 11px/1 system-ui, sans-serif;
    }
    .bs-annotate-hint {
      position: fixed;
      left: 50%;
      bottom: 28px;
      z-index: 2147483647;
      transform: translateX(-50%);
      max-width: min(420px, calc(100vw - 32px));
      padding: 9px 13px;
      border-radius: 8px;
      background: #171717;
      color: #ffffff;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
      font: 13px/1.45 system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'bs-annotate-launcher';
  launcher.textContent = '批';
  launcher.title = '批注页面元素';
  launcher.setAttribute('aria-label', '开启批注模式');
  launcher.setAttribute('aria-pressed', 'false');

  const highlight = document.createElement('div');
  highlight.className = 'bs-annotate-highlight';
  document.body.append(highlight, launcher);

  let active = false;
  let hovered = null;
  let composer = null;
  let hintTimer = null;

  function annotatable(element) {
    return element instanceof Element
      && Boolean(element.closest('.phone-screen'))
      && !element.closest('[data-bs-chrome]');
  }

  function hideHighlight() {
    hovered = null;
    highlight.style.display = 'none';
  }

  function showHighlight(element) {
    const rect = element.getBoundingClientRect();
    hovered = element;
    highlight.style.display = 'block';
    highlight.style.left = `${rect.left + window.scrollX}px`;
    highlight.style.top = `${rect.top + window.scrollY}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
  }

  function closeComposer() {
    if (!composer) return;
    composer.root.remove();
    composer = null;
  }

  function setActive(next) {
    active = next;
    launcher.setAttribute('aria-pressed', String(active));
    launcher.setAttribute('aria-label', active ? '退出批注模式' : '开启批注模式');
    launcher.title = active ? '退出批注模式' : '批注页面元素';
    if (!active) {
      hideHighlight();
      closeComposer();
    }
  }

  function showHint(message) {
    document.querySelector('.bs-annotate-hint')?.remove();
    clearTimeout(hintTimer);
    const hint = document.createElement('div');
    hint.className = 'bs-annotate-hint';
    hint.textContent = message;
    document.body.appendChild(hint);
    hintTimer = setTimeout(() => hint.remove(), 2600);
  }

  function collapsedText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function slideFor(element) {
    const caption = element.closest('.phone-slide')?.querySelector('.phone-caption');
    return collapsedText(caption?.textContent);
  }

  function dropPin(element, id) {
    const rect = element.getBoundingClientRect();
    const pin = document.createElement('div');
    pin.className = 'bs-annotate-pin';
    pin.textContent = id.replace(/^a/, '');
    pin.title = `批注 ${id}`;
    pin.style.left = `${rect.left + window.scrollX - 10}px`;
    pin.style.top = `${rect.top + window.scrollY - 10}px`;
    document.body.appendChild(pin);
  }

  function openComposer(element) {
    closeComposer();
    const root = document.createElement('div');
    root.className = 'bs-annotate-composer';
    const textarea = document.createElement('textarea');
    textarea.className = 'bs-annotate-textarea';
    textarea.placeholder = '写下要修改的地方…';
    textarea.setAttribute('aria-label', '批注内容');
    const help = document.createElement('div');
    help.className = 'bs-annotate-help';
    help.textContent = 'Enter 提交 · Shift+Enter 换行 · Esc 取消';
    const error = document.createElement('div');
    error.className = 'bs-annotate-error';
    error.setAttribute('role', 'alert');
    root.append(textarea, help, error);
    document.body.appendChild(root);

    const rect = element.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const left = Math.min(Math.max(12, rect.right + 10), window.innerWidth - rootRect.width - 12);
    const top = Math.min(Math.max(12, rect.top), window.innerHeight - rootRect.height - 12);
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    composer = { root, textarea, error, element, saving: false };
    textarea.focus();

    textarea.addEventListener('keydown', async (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeComposer();
        return;
      }
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      const current = composer;
      if (!current || current.saving) return;
      const note = current.textarea.value.trim();
      if (!note) {
        current.error.textContent = '请输入批注内容';
        return;
      }

      current.saving = true;
      current.error.textContent = '正在保存…';
      try {
        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: screenFile,
            note,
            outerHTML: element.outerHTML,
            text: collapsedText(element.textContent).slice(0, 4000),
            selector: selectorFor(element),
            slide: slideFor(element),
          }),
        });
        let result = {};
        try { result = await response.json(); } catch {}
        if (!response.ok || !result.ok) {
          throw new Error(result.error || `服务器返回 ${response.status}`);
        }
        dropPin(element, result.id);
        closeComposer();
      } catch (requestError) {
        if (composer === current) {
          current.saving = false;
          current.error.textContent = `保存失败：${requestError.message}`;
          current.textarea.focus();
        }
      }
    });
  }

  launcher.addEventListener('click', () => setActive(!active));

  document.addEventListener('mousemove', (event) => {
    if (!active) return;
    if (annotatable(event.target)) showHighlight(event.target);
    else hideHighlight();
  }, true);

  document.addEventListener('click', (event) => {
    if (!active || !(event.target instanceof Element)) return;
    if (event.target.closest('[data-bs-chrome]')) {
      event.preventDefault();
      event.stopPropagation();
      hideHighlight();
      showHint('这是平台外壳，如需修改请在终端里说明。');
      return;
    }
    if (!annotatable(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    openComposer(event.target);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active && !composer) setActive(false);
  });
})();
