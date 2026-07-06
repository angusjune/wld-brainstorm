# Benchmark Run Notes — loan-input-visual (baseline)

Design task: 「输入金额页流程已经定了，帮我出三个视觉方向，想要更高级、更平静的感觉」

Executed per `plugins/wld-design/skills/brainstorm/SKILL.md` in headless benchmark mode
(no clarifying questions, no server, no browser screenshot verification;
`wld-design:simplify` applied manually per its SKILL.md).

## Defaults chosen (in place of Step 1 questions)

| Question the skill would ask | Default chosen | Rationale |
|---|---|---|
| Core user action | 输入借款金额并点击「下一步」提交 | Stated screen is 输入金额; flow fixed by PM |
| How many screens | One screen (输入金额), 3 visual directions | "流程已经定了" + "三个视觉方向" = Visual Exploration mode |
| Diversity mode | Visual Exploration | Flow is fixed and user asks for visual directions — per Step 4 mode table |
| Screen state shown | Filled amount ¥10,000 (AUTOFILLED, keyboard collapsed) | Matches production template `输入金额.html`; PIT-001 allows an enabled gold CTA only when amount is filled |
| Bottom CTA state | Enabled (bright gold) | Amount is filled → enabled is correct per PIT-001 |
| Keyboard / 首借 vs 非首借 | Keyboard not shown; 首借/非首借 keyboard CTA split (PAT-WLD-001 / PIT-003) out of scope | Static visual exploration of the collapsed-keyboard state; noted so the split is not silently merged |
| Bottom sheets (期数浮层) | Not shown | PIT-002 says sheets are independent screens; benchmark stops after the first screen |
| Data values | Verbatim from production template: ¥10,000 / 24 个月 / 首次6月16日 应还 ¥683.00 / 工商银行 (2004) / 个人日常消费 / 年利率 (单利) 10.8% / 前30天0利息 省利息¥150.00 | Every value traceable to `assets/screens/输入金额.html`; fix-details is out of scope |
| Amount hint text | 「最高可借 ¥60,000」 replaces 「输入合法金额」 | Simplify Q2: validation-placeholder hint says nothing useful in a filled state; max borrowable (consistent with home screen 预估可借 ¥60,000) is decision-relevant |
| Chosen direction for Step 5 | 方案 B 高级留白 (Premium / spacious) | Most direct match for 「更高级、更平静」 in the Visual Exploration archetypes |

## Three visual directions (all same flow/structure)

- **方案 A 平静原生 (Calmer / native)** — WeChat-native quiet hierarchy: regular-weight row labels, grey values, production promo row kept but toned.
- **方案 B 高级留白 (Premium / spacious)** — more whitespace around the amount, promo reduced to one quiet text line, roomier option rows (52px), larger (L) single gold CTA.
- **方案 C 数据为主 (Data-forward)** — 每月应还 promoted to the options-card header (还款计划 row merged into it, still tappable); remaining rows unchanged.

## Product rules loaded (COMP_WLD_LOAN_AMOUNT via product-memory.md filter)

- PAT-WLD-001 (patterns; kb_generation/req_doc/test_case) — 首借/非首借 are independent paths; keyboard CTA 「确定」 vs 「下一步」 differ. Respected by not rendering a keyboard state at all.
- PAT-WLD-002 / PAT-WLD-003 — 期数浮层 variants and default-selection branches; no sheet rendered, default 24 个月 kept verbatim from the production template.
- PIT-001 — empty state must have disabled CTA; avoided by showing the filled state with enabled CTA.
- PIT-002 — sheets are independent states; none rendered.
- PIT-003 — keyboard CTA split; keyboard not rendered.
- PIT-004 — req_doc impact-analysis rule; not applicable to this screen render.

## Simplify pass applied (per simplify/SKILL.md)

- Replaced 「输入合法金额」 with informative 「最高可借 ¥60,000」 (Q2).
- Dropped decorative gift icon from promo in directions B/C (Q4); kept in A whose hypothesis is production-native parity. Bank icon kept (functional, per simplify keep-table).
- Directions B/C merge promo card into a single text line; direction C merges 还款计划 row into the card header (Q5).
- Kept: all five loan-option data points, 协议相关/年利率 legal text, bottom disclaimer 「按日计息，次日起可提前还，免违约金」, clear (x) button, back-navigation chrome, single gold CTA.
- No emojis, no urgency copy, no custom JS, one gold CTA per screen.

## Deviations forced by benchmark mode

- `<wld-wechat-chrome>` placeholders are left unexpanded (the brainstorm server normally expands them from `assets/snippets/`); frame styles normally injected by the server are likewise absent when the files are opened directly.
- No screenshot QA loop; the Pre-user QA gate checklist was run manually against the markup.
