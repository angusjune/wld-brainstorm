# The product profile owns its design system

The selected product profile holds everything specific to one product — tokens, component styles, the screen corpus, product rules, workflow contracts, passes, and deterministic product tools. Switching product means replacing the profile as a unit.

The non-obvious part is that **`profile/design-system/components.css` belongs to the profile**, despite looking shared. Its 48 class names are generic (`btn`, `card`, `page`, `tabbar`), which invites a future maintainer to hoist it into shared machinery. Do not. The names are generic; the design decisions are not:

- `.wld-tabbar` hardcodes `height: 51px` and `background: rgba(251, 251, 251, 0.85)` — WLD production truth, copied from the real app, not tokens.
- `.wld-btn` sets `border-radius: var(--wld-radius-pill)`, and the token name asserts the rule. "Buttons: border-radius 999px — always" is a documented WLD law that `qa-gate` raises `square-button` as an *error* on. A product with 8px buttons does not retheme this; it contradicts it.
- `.wld-btn-circle` exists because WLD has an 84px gold circle CTA. Most products have no such component.

Rethemed by tokens alone, these primitives would carry WLD's design language into a product that does not share it — which is worse than not shipping them, because it looks correct.

Exactly one thing in `profile/design-system/components.css` was genuinely shared: a `* { }` reset. It moved to the shared layer, which also fixed a real defect — it hardcoded `font-family: system-ui, -apple-system, sans-serif`, contradicting `--wld-font-family` (PingFang SC).

## Consequences

Each profile owns its own class prefix. `wld-` is not a global convention to be renamed away; it is WLD's profile-local prefix, and a forking team picks their own. Nothing shared refers to it, so there is no rename to perform.

The HTML design system has one token source: `profile/design-system/tokens.css`. Components and templates consume those variables instead of maintaining parallel palettes.
