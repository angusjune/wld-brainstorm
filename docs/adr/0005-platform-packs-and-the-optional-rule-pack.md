# Platform packs, and why an unused iOS pack ships

A platform pack (`skills/brainstorm/platforms/<name>/`) owns the preview furniture that belongs to a surface rather than to a product: one `chrome.html` and its variant vocabulary. It is a third layer between shared method and the product profile.

Platform packs do not contribute product code, passes, or workflow branches. Step 6 branches are shared or declared by the selected product profile.

**`platforms/ios/` ships even though we expect almost every forker to delete it unread.** It is not there for adopters — it is the fixture that forces the WeChat assumptions out of shared code. Without a second pack, `scripts/serve-preview.cjs` keeps its hardcoded `<wld-wechat-chrome>` tag regex and two-value `home | inner` variant vocabulary, and `scripts/run-qa-gate.mjs` keeps requiring chrome to be present — and the next non-WeChat forker hits exactly the wall this refactor exists to remove. A seam exercised by one implementation is not a seam. Do not delete `platforms/ios/` as dead code.

## The rule pack is optional on purpose

`scripts/run-qa-gate.mjs` runs only universal checks by default (emoji, off-token colours, required stylesheets). Product rules live in an optional `profile/quality/rules.mjs`, written in JavaScript, and a profile without one still passes.

This lets a replacement profile remove its product rule pack without modifying shared QA machinery. Universal checks remain active; product policy is loaded only from the selected profile.

Rules are JavaScript rather than a YAML DSL because the interesting ones are procedural — the borrow-tab/background interaction cannot be expressed as regex plus severity — and because a DSL invented for one product would grow into a language we maintain for no one.
