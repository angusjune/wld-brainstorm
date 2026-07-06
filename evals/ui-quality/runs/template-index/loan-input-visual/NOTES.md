# Benchmark Run Notes — loan-input-visual

Task: "输入金额页流程已经定了，帮我出三个视觉方向，想要更高级、更平静的感觉"
Mode: headless benchmark (no clarifying questions, no server, no screenshots).

## Step 1 snapshot (defaults chosen in place of clarifying questions)

- **Core user action:** Review/adjust loan amount and terms, then tap 下一步.
- **Diversity mode:** Visual Exploration — the user says the flow is fixed (流程已经定了) and asks for 视觉方向. All 3 options keep the identical structure/content and vary only visual treatment.
- **Screens:** One screen — 输入金额, single state: amount filled (AUTOFILLED), keyboard collapsed. No sheets shown.
- **User path default: 非首借 (repeat borrower).** Chosen so the template's default term 24 个月 is consistent with PAT-WLD-003 (非首借 → 默认选中上一笔借款的期数). A 首借 default would force the term to 12 or 1 个月 per the rule (rule wins over template) and would require recomputing the repayment plan value.
- **Data:** Kept production-template values verbatim — ¥10000 amount; pills 借 1 万 / 借 2 万 / 借全部; promo 前30天0利息, 省利息 ¥150.00; 借款期数 24 个月; 还款计划 首次6月16日，应还 ¥683.00; 收款账户 工商银行 (2004); 借款用途 个人日常消费; 协议相关 年利率 (单利) 10.8%; CTA 下一步; disclaimer 按日计息，次日起可提前还，免违约金.
- **Chosen direction for Step 5 (user could not pick headless):** 方案 A 留白 (Premium / spacious) — the most direct match for 更高级、更平静.
- **Non-goals:** No keyboard states, no 期数/账户/用途 bottom sheets, no empty state, no feedback loop (benchmark stops after the first Step 5 screen).

## Product rules loaded (COMP_WLD_LOAN_AMOUNT via product-memory.md)

【Product rules — from bundled memory】PAT-WLD-001, PAT-WLD-002, PAT-WLD-003 (all confidence: high).
【Pitfalls to avoid — from bundled memory】PIT-001, PIT-002, PIT-003.

How they were honored:

- **PIT-001:** The shown state has an amount filled, so the bottom CTA is active gold. An empty state would need a disabled (浅黄) CTA as a separate screen — out of scope here.
- **PIT-002:** No overlays drawn; 期数/账户/用途 sheets are independent states and would each be separate screens in a full flow.
- **PIT-003 / PAT-WLD-001:** Keyboard is collapsed in all mockups, so the 确定/下一步 keyboard-CTA split is not visualized; the 非首借 default was recorded so a later keyboard state uses 「下一步」.
- **PAT-WLD-002:** Tenor sheet variants not in scope (no sheet drawn).
- **PAT-WLD-003:** Satisfied by choosing 非首借 with previous-loan term 24 个月 (see above).

## Simplify pass (wld-design:simplify applied inline, both files)

- Removed the gift icon from the promo row — duplicates the adjacent 前30天0利息 text (checklist: icons duplicating text).
- Replaced the amount hint 输入合法金额 with 最多可借 ¥60,000 — a validation prompt is stale in a filled/valid state; the cap is decision-critical info (value taken from the production home screen's 预估可借 ¥60,000) and supports the 借全部 pill.
- 方案 A additionally merges the promo row into the terms card as its first row (checklist: can two adjacent elements become one → fewer competing modules).
- Kept: legal/rate text (年利率, disclaimer), clear (x) button (user-entered data control), bank icon (identifies the bank), one gold CTA per screen, no emojis, no urgency copy.

## Benchmark deviations from SKILL.md (forced by headless mode)

- Step 1 questions skipped (defaults above), Step 2 server skipped, all browser screenshot verification skipped.
- Output written to `evals/ui-quality/runs/template-index/loan-input-visual/` instead of a server `screenDir`.
- `wld-design:simplify` applied by reading its SKILL.md directly rather than as a sub-skill invocation.
- Pre-user QA gate run as a static self-check (chrome placeholder, single gold CTA, backgrounds, copy rules, no custom JS) without rendered screenshots.
