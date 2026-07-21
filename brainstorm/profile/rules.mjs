/**
 * WLD (微粒贷) product QA rules.
 *
 * Loaded by scripts/run-qa-gate.mjs because this file exists at profile/rules.mjs. Everything
 * here is a WLD law, not a universal one — which is exactly why it lives in the
 * profile rather than the gate. A forking team deletes this file and still
 * passes the core checks on day one, then adds their own laws as they discover
 * them. See ADR 0005.
 *
 * A rule is { id, scope, run }:
 *   scope 'document' -> run({ text, screens, contexts }, api)
 *   scope 'screen'   -> run(screen, api)   — once per page-class element
 *   scope 'css'      -> run(ctx, api)      — once per CSS rule / style="" attr
 *
 * `api` provides: add(id, message, index), profile, platform, tokenMap,
 * pageClass, contexts, screens, text, utils.
 *
 * Rules are plain JavaScript rather than declarative config on purpose: the
 * borrow-tab background rule below is procedural and could not be expressed as
 * regex-plus-severity without inventing a language nobody else would use.
 */

const URGENCY_RE = /立即领取|秒杀|限时抢|马上抢|仅剩|手慢无|倒计时|抢购/g;
const THOUSANDS_RE = /¥\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
const WHITE_VALUE_RE = /#fff\b|#ffffff\b|(?<![-\w])white(?![-\w])|rgba?\(\s*255\s*,\s*255\s*,\s*255/i;
const GOLD_BG_RE = /background[^;:]*:\s*[^;]*(#ffd143|var\(--wld-theme-500\)|var\(--wld-btn-primary-bg\))/i;
const WHITE_BG_RE = /background[^;:]*:\s*[^;]*(var\(--wld-surface\)|#fff\b|#ffffff\b|(?<![-\w])white(?![-\w])|rgba?\(\s*255\s*,\s*255\s*,\s*255)/i;
const PILL_RADIUS_RE = /^(999px|50%|var\(--wld-radius-pill\))$/;

// The borrow (借钱) tab identifies a home screen, which must be white. This is
// the rule that made the old gate impossible to reuse: it greps the page for a
// Chinese product term.
function findBorrowTab(segmentText) {
  const itemRe = /<(button|div)\b[^>]*class\s*=\s*"([^"]*\bwld-tabbar-item\b[^"]*)"[^>]*>/g;
  const items = [];
  let match;
  while ((match = itemRe.exec(segmentText)) !== null) {
    items.push({ cls: match[2], start: match.index });
  }
  for (let i = 0; i < items.length; i += 1) {
    const end = i + 1 < items.length ? items[i + 1].start : Math.min(items[i].start + 400, segmentText.length);
    if (segmentText.slice(items[i].start, end).includes('借钱')) return items[i];
  }
  return null;
}

export default {
  severity: {
    'bg-mismatch': 'error', // home/inner background rules violated
    'urgency-copy': 'error', // pressure language is banned in WLD
    'white-on-gold': 'error', // text on gold is always rgba(0,0,0,0.9)
    'square-button': 'error', // WLD buttons are always pill-shaped
    'multi-gold-cta': 'warning', // >1 gold CTA outside the production dual-offer exception
    'thick-border': 'warning', // borders >= 2px are off-system
    'amount-weight': 'warning', // 44px amounts use weight 500, not 600
    'thousands-separator': 'warning', // production writes ¥60000, never ¥60,000
  },

  rules: [
    {
      id: 'urgency-copy',
      scope: 'document',
      run({ text }, { add }) {
        URGENCY_RE.lastIndex = 0;
        let match;
        while ((match = URGENCY_RE.exec(text)) !== null) {
          add('urgency-copy', `banned urgency copy "${match[0]}" — WLD never pressures borrowing`, match.index);
        }
      },
    },

    {
      id: 'thousands-separator',
      scope: 'document',
      run({ text }, { add }) {
        THOUSANDS_RE.lastIndex = 0;
        let match;
        while ((match = THOUSANDS_RE.exec(text)) !== null) {
          add('thousands-separator', `"${match[0]}" — production amounts never use thousands separators (write ${match[0].replace(/,/g, '')})`, match.index);
        }
      },
    },

    {
      id: 'multi-gold-cta',
      scope: 'screen',
      run(screen, { add, utils }) {
        const goldCtas = utils.elementsWithClass(screen.text, 'wld-btn-primary').length
          + utils.elementsWithClass(screen.text, 'wld-btn-circle').length;
        const isDualOffer = /id\s*=\s*["']screen-dual-offer(?:-[^"']*)?["']/i.test(screen.openTag);
        if (goldCtas > 1 && !isDualOffer) {
          add('multi-gold-cta', `screen ${screen.index}: ${goldCtas} gold CTAs — one primary gold action per screen`, screen.start);
        }
      },
    },

    {
      id: 'bg-mismatch',
      scope: 'screen',
      run(screen, { add, contexts, pageClass }) {
        const chromeMatch = screen.text.match(/<preview-chrome\b[^>]*>/i);
        if (!chromeMatch) return;
        const variant = /(?:variant|type)\s*=\s*"home"/i.test(chromeMatch[0]) ? 'home' : 'inner';
        const pageSelectorRe = new RegExp(`(^|[\\s,])[.#][\\w-]*${pageClass}`);
        const pageForcedWhite = WHITE_BG_RE.test(screen.openTag)
          || contexts.some((ctx) => ctx.selector && pageSelectorRe.test(ctx.selector) && WHITE_BG_RE.test(ctx.body));
        const borrowTab = findBorrowTab(screen.text);
        if (variant === 'home' && borrowTab && !borrowTab.cls.includes('--inactive')) {
          if (!pageForcedWhite && !WHITE_BG_RE.test(screen.text)) {
            add('bg-mismatch', `screen ${screen.index}: borrow-tab home screen without a white background — home screens use #FFFFFF (var(--wld-surface))`, screen.start);
          }
        } else if (variant === 'inner' && pageForcedWhite) {
          add('bg-mismatch', `screen ${screen.index}: inner screen forces white on .${pageClass} — inner pages keep the default #F5F5F5`, screen.start);
        }
      },
    },

    {
      id: 'thick-border',
      scope: 'css',
      run(ctx, { add }) {
        const borderRe = /(?:^|[;{\s])border(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*(\d+(?:\.\d+)?)px/gi;
        let match;
        while ((match = borderRe.exec(ctx.body)) !== null) {
          if (parseFloat(match[1]) >= 2) {
            add('thick-border', `${match[1]}px border — WLD avoids borders >= 2px`, ctx.start + match.index);
          }
        }
      },
    },

    {
      id: 'amount-weight',
      scope: 'css',
      run(ctx, { add }) {
        if (/(font-size\s*:\s*44px|var\(--wld-text-numbers\))/.test(ctx.body) && /font-weight\s*:\s*600/.test(ctx.body)) {
          add('amount-weight', '44px amount at font-weight 600 — large amounts use weight 500', ctx.start);
        }
      },
    },

    {
      id: 'white-on-gold',
      scope: 'css',
      run(ctx, { add }) {
        const isGoldElement = ctx.element && /\bwld-btn-(primary|circle)\b/.test(ctx.element.cls);
        const colorMatch = ctx.body.match(/(?:^|[;{\s])color\s*:\s*([^;}]+)/i);
        const hasWhiteText = colorMatch && WHITE_VALUE_RE.test(colorMatch[1]);
        if (hasWhiteText && (isGoldElement || GOLD_BG_RE.test(ctx.body))) {
          add('white-on-gold', 'white text on a gold surface — text on gold is always rgba(0,0,0,0.9)', ctx.start);
        }
      },
    },

    {
      id: 'square-button',
      scope: 'css',
      run(ctx, { add }) {
        const isButtonCtx = (ctx.element && /\bwld-btn\b/.test(ctx.element.cls))
          || (ctx.selector && /wld-btn/.test(ctx.selector));
        if (!isButtonCtx) return;
        const radiusMatch = ctx.body.match(/border-radius\s*:\s*([^;}]+)/i);
        if (radiusMatch && !PILL_RADIUS_RE.test(radiusMatch[1].trim())) {
          add('square-button', `button border-radius ${radiusMatch[1].trim()} — WLD buttons are always pill-shaped (999px)`, ctx.start);
        }
      },
    },
  ],
};
