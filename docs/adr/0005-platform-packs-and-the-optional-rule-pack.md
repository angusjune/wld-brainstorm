# Platform packs, and why an unused iOS pack ships

A platform pack (`brainstorm/platforms/<name>/`) owns the furniture that belongs to a surface rather than to a product: preview chrome, its variant vocabulary, and any branch that only makes sense there. It is a third layer between shared method and the product profile, and it earns its place because the reuse is real — a sibling WeBank team forking this skill keeps `platforms/wechat/` untouched and rewrites only `profile/`.

The layer is load-bearing, not decorative: the Step 6 **Prototype** branch builds a *WeChat Mini Program*, so it belongs to `platforms/wechat/`, not to the core method. An iOS fork has no such branch. Platform packs and profiles can therefore both contribute passes (inline, Steps 4–5) and branches (Step 6); Simplify stays core.

**`platforms/ios/` ships even though we expect almost every forker to delete it unread.** It is not there for adopters — it is the fixture that forces the WeChat assumptions out of shared code. Without a second pack, `server.cjs` keeps its hardcoded `<wld-wechat-chrome>` tag regex and two-value `home | inner` variant vocabulary, and `qa-gate.mjs` keeps requiring chrome to be present — and the next non-WeChat forker hits exactly the wall this refactor exists to remove. A seam exercised by one implementation is not a seam. Do not delete `platforms/ios/` as dead code.

## The rule pack is optional on purpose

`qa-gate.mjs` runs only universal checks by default (emoji, off-token colours, required stylesheets). Product rules live in an optional `profile/rules.mjs`, written in JavaScript, and a profile without one still passes.

This is deliberate even though it weakens what "passed QA" means for a new profile. Today the gate encodes WLD policy as control flow — a Chinese urgency-copy blocklist, a literal `#ffd143`, a `findBorrowTab()` that greps the page for the characters `借钱`, and a background rule that branches on it. That is why the README currently has to warn that `qa-gate.mjs` 「必须同步删除或修改…否则会自动拦截生成的正常界面」: a forking team's first experience is their own screens being rejected for not looking like a loan app. A gate that blocks every newcomer on day one is worse than one that starts permissive and is opted into.

Rules are JavaScript rather than a YAML DSL because the interesting ones are procedural — the borrow-tab/background interaction cannot be expressed as regex plus severity — and because a DSL invented for one product would grow into a language we maintain for no one.
