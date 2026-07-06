---
name: fix-details
description: 用于检查微粒贷界面或流程细节错误。校验计算逻辑、页面内及页面间的数据一致性与文案规范，并纠正数值及文案错漏。Use when checking WLD screen or flow detail errors.
---

# WLD Fix Details

A designer hands you a finished-looking WLD screen (or a short flow) and a Figma link. The screen *looks* right, but the details are wrong: a计算出来的利息对不上、同屏两个数字打架、弹窗背景和它盖住的那屏数字变了、文案写错了单位。This skill reads the design, finds those detail bugs, and proposes the corrected value for each.

**Core principle:** A detail bug is a *contradiction* — between a displayed number and the authoritative calculation, between two elements on the same screen, between two screens in one flow, or between copy and product fact. Every finding must name the two things that disagree and which one is wrong (or, when inputs are unknown, that they *cannot both* be right).

**Authoritative math:** Never compute loan numbers (利息/还款额/省利息) by hand. Run `<plugin-root>/plugins/wld-design/skills/fix-details/calc.mjs` — a runnable, dependency-free calculator that is the single source of truth for WLD loan math.

---

## When to Use

- "帮我看下这个借款页有没有细节错误 / fix the details on this screen"
- "这两屏的数字对得上吗 / 撤销弹窗的背景和前面那屏不一致吧"
- "省利息 / 首次还 这些数字算得对吗"
- "文案有没有写错（单位、利率口径、术语不一致）"
- After a screen looks visually done and the designer wants a correctness pass before review

## When NOT to Use

- **Brand-new screen, still exploring layout** → `wld-design:brainstorm`
- **Too cluttered, needs trimming** → `wld-design:simplify`
- **"Which states did I forget to draw?"** → `wld-design:find-missing-states`
- **Pure visual polish** (spacing, alignment, color) — this skill checks *semantic* correctness (values + copy), not pixel geometry

---

## Inputs (collect before starting)

1. **The design** — a Figma link (file key + node-id, ideally the whole flow) and/or the image the user attached. **Required.** Without the design there is nothing to check — do not proceed on a description alone.
2. **Known loan parameters** *(for the calculation checks)* — whatever the user knows: 借款本金, 期数, 年利率（单利，按 360 天年化）, 借款日期, 还款方式, 优惠券（免息天数 / 折扣 / 指定利率）. Most screens show some of these; ask only for the ones that are missing **and** needed to verify a number.

If only one of {design, params} is given, ask for the rest in a single message. It is fine to start the copy + consistency checks with the design alone — calculation checks need params.

---

## Workflow

```
1. Read the design (every frame in the flow)
2. Extract every displayed fact per screen (numbers, labels, copy)
3. Run four checks:
   A. Calculation correctness   → verify against calc.mjs
   B. Intra-screen consistency  → numbers/labels on ONE screen must agree
   C. Inter-screen consistency  → shared values across the flow must stay equal
   D. UX copy                   → typos, units, rate口径, term consistency
4. Output a standalone HTML findings report with the relevant screen image(s) attached for clarity
5. Offer to apply ONLY the 🔴 必改 fixes back to Figma — visible text nodes only, on confirmation
```

### Step 1: Read the Design

Reading the design is load-bearing. A failure here must be loud, never silent.

Before using Figma MCP, read `<plugin-root>/plugins/wld-design/assets/figma-mcp.md` for provider-neutral tool discovery, URL parsing, metadata/context/screenshot usage, node-id capture, and write-back limits.

1. **Figma MCP available** (any tool whose name contains `figma`) — preferred:
   - Parse file key + node-id from the URL (`figma.com/design/{fileKey}/...?node-id={nodeId}` — convert `-` to `:` in the nodeId).
   - Use the metadata tool to enumerate every frame in the flow, then the design-context tool per frame for text content + structure. Grab the screenshot when a value is visual-only (e.g. which coupon chip is selected).
   - Save or reference a screenshot/image for every screen that appears in a finding. These images must be included in the final HTML report so the PM can see the exact screen being corrected.
   - **Long flow (many frames)?** You may delegate frame inspection to a subagent — have it read each frame's context + screenshot and return a compact per-screen fact table (including visual-only states like the selected chip), keeping image tokens out of the main context.
   - **Read the whole flow, not one frame.** Check C (inter-screen) needs every screen that shares a value, including modal/弹窗 frames and the screen each one overlays.
2. **No Figma MCP** — fall back to the **image the user attached** (if any). Read every number and label off the image. Include the attached image in the final HTML report. Note in the report header: `来源：仅截图（无 Figma MCP），坐标/层级信息缺失`.
3. **Neither design source readable** — STOP. Tell the user you cannot run a detail check without the design, and ask for a Figma link or a clearer image. Do **not** invent findings.

### Step 2: Extract Every Displayed Fact

For each screen, list every value a user reads, with where it appears:

- **Amounts** — 预估可借, 输入金额, 省利息, 首次还/每月还, 总利息, 还款总额
- **Rates** — 年利率（单利）, 优惠年利率, 「1千元用1天只需 X 元」(daily-rate copy)
- **Terms** — 期数（分 N 个月）, 还款方式, 收款账户, 用途
- **Copy** — button labels, coupon chip text, headings, footnotes (实际可借以…为准), dialog title/buttons
- **Selection state** — which coupon chip is selected (it determines which rate/省利息 applies)

Keep this as a per-screen table — it is the evidence every finding cites. **When reading via Figma MCP, capture each value's `node id`** — Step 5 needs it to target a write-back, and recording it now avoids a second read.

### Step 3: Run the Four Checks

#### Check A — Calculation correctness (use `calc.mjs`)

For every computed number on the screen (省利息, 首次还 / 每月还, 总利息, 还款额):

1. Assemble the loan params from Step 2 + user-provided inputs. The selected coupon decides the rate path:
   - 「前30天0利息」→ `{ "type": "INTEREST_REDUCTION", "days": 30 }` — note calc.mjs spreads免息天数 across billing periods (e.g. 29天 in period 1 + 1天 in period 2), so `省利息` shifts within a small band as the loan date moves; compare against the band, not a single clean ×30 figure.
   - 「优惠年利率 7.2%」→ `{ "type": "DESIGNATED_RATE", "annualRate": 0.072, "terms": <期数> }`
   - 「利率打X折」→ `{ "type": "DISCOUNT", "discountRate": 0.X, "terms": <期数> }`
2. Run the calculator (params are friendly JSON; rates are decimals, `0.144` = 14.4%):

   ```bash
   node <plugin-root>/plugins/wld-design/skills/fix-details/calc.mjs \
     '{"annualRate":0.144,"principal":60000,"term":12,"loanDate":"2026-06-08",
       "coupons":[{"type":"INTEREST_REDUCTION","days":30}]}'
   ```

   - `annualRate` is converted to a daily rate on the fixed **360-day** basis WLD uses (年利率 ÷ 360 = 日利率). Pass `dailyRate` directly if known.
   - `loanDate` required; `firstBillingDate` defaults to loanDate + 1 month. `repaymentType` defaults to 等额本息 (`EQUAL_AMORTIZATION`); other values: `INTEREST_FIRST`, `EQUAL_PRINCIPAL`, `HYBRID_INTEREST_FIRST`, `STAGED_RATE`.
   - Output fields: `省利息`, `总利息`, `首期还款`, `每期还款[]`, plus a per-period `schedule`.
3. Compare displayed vs computed. Cite both numbers and the params used.
   - **calc.mjs 口径** (so you don't have to read its source): `省利息` = 基准总利息（无券）− 优惠后总利息; `首期还款` / `每期还款[i]` = that period's `totalPayment`. If the design clearly uses a *different* definition of 省利息, surface that mismatch as its own finding.
   - **Tolerance** — treat a difference **> ¥1** as a real mismatch; ≤ ¥1 is rounding, not a finding.
   - **Back-solve** — when a coupon-driven number is off, check whether it matches a *different* coupon parameter. E.g. 省利息 ¥540 corresponds to ~22 免息天, but the chip says 「前30天」 — that is both a wrong number *and* a number-vs-copy conflict. Back-solving makes the finding actionable.

**When a required input is unknown** (often 借款日期): `calc.mjs` **hard-requires `loanDate` — it throws rather than defaulting**, so you cannot "compute without a date." Do not guess silently. Either (a) ask the user, or (b) **sweep the band**: run the calculator once per candidate date across the plausible range, take the min/max of each output, and compare the displayed value against the band's *boundary* (not a single spot date) — that is what proves impossibility.

```bash
# Band sweep when 借款日期 is unknown — find the min/max 省利息 / 首期还款 over a year.
# Sample monthly for a quick band; loop all 365 days when you need hard bounds.
for d in 2026-0{1..9}-15 2026-1{0..2}-15; do
  node <plugin-root>/plugins/wld-design/skills/fix-details/calc.mjs \
    "{\"annualRate\":0.144,\"principal\":60000,\"term\":12,\"loanDate\":\"$d\",\"coupons\":[{\"type\":\"INTEREST_REDUCTION\",\"days\":30}]}" \
    | grep -E '省利息|首期还款'
done
```

Report the band — "省利息 在任何借款日下都落在 ¥714–720，屏上的 ¥540 不可能成立". Implausibility is a valid 🔴 finding even without an exact answer.

#### Check B — Intra-screen consistency (same screen, elements disagree)

Within one screen, two displayed values contradict each other:

- **Amount vs cap** — 顶部「预估可借 50000」but 输入框 shows ¥60000. The input cannot exceed the cap; one number is wrong.
- **Active rate vs selected coupon — depends on the coupon TYPE** (this trips people up):
  - **指定利率 / 折扣型券** (DESIGNATED_RATE / DISCOUNT, e.g. 「优惠年利率 7.2%」「利率打X折」) **change the rate** → the headline 年利率 must follow the券. Grey 「年利率 10.8%」 with a selected 7.2% 券 *is* a conflict.
  - **免息型券** (INTEREST_REDUCTION, e.g. 「前30天0利息」) does **NOT** change the年利率 — it only zeroes interest for N days. The headline keeps the **base** rate (e.g. 14.4%). **Do not flag the base rate as wrong when an 免息 coupon is selected** — that's a false positive.
- **Summary vs detail** — a 还款总额 that doesn't equal Σ(每期还款), a 分12个月 with a schedule of a different length.

For each: name the two elements, state which is authoritative, give the corrected value.

#### Check C — Inter-screen consistency (flow, shared value drifts)

When one screen is derived from another (a 弹窗 over a screen, a confirm page from an input page), values shared between them must stay equal:

- A 撤销借款 dialog's **backdrop** must match the screen it overlays — same 预估可借, same 年利率, same daily-rate copy. If the backdrop shows 14.4% / 50000 while the underlying screen shows 10.8% / 60000, the backdrop was copied from a different version.
- A confirm/result screen must carry the same 金额 / 利率 / 期数 the user picked on the prior screen.

For each: name the two screens, the shared value, and the two differing readings. **If the flow has only one screen, Check C is N/A — say so in the report** rather than omitting it silently.

#### Check D — UX copy

- **Units & format** — 元/万元 mixups, ¥ vs 元 inconsistency, decimal places (¥4760.78 vs ¥4760.8), 7.2% vs 7.2 折.
- **Rate口径** — 年利率 vs 日利率 vs 月利率, 单利 — must be stated and consistent with the daily-rate copy (「1千元用1天只需 0.3元」 ⇔ 日利率 0.0003 ⇔ 年化单利 10.8%，按 360 天).
- **Terminology drift** — same concept named differently across screens (借钱 / 借款 / 取现), button label that doesn't match the action.
- **Typos & truncation**, and footnotes that contradict the body.

### Step 4: Output the Report as HTML

Produce a standalone `.html` report. Save it under `docs/wld-fix-details-reports/` in the working directory with a sensible file name, then give the user the file path plus a concise summary. The HTML report is the primary deliverable.

**Start from the template** at `<plugin-root>/plugins/wld-design/skills/fix-details/report-template.html` — copy it and populate the cards. It already encodes the structure below (screen image left, findings right; the three severity badge styles 必改/建议改/待确认; the meta header; a ⚠️ 待确认 card). Keep its inline CSS; only fill in content.

**Required report content:**

- Header: report title, source (`Figma MCP` / `仅截图`), screen count, and a one-line summary of how many issues were found.
- Per-screen cards: one card per screen that has findings. Each card shows the screen screenshot on the left and its findings stacked on the right — side by side. Screens with no findings are omitted.
- Findings: keep the severity buckets `🔴 必改`, `🟡 建议改`, `❓ 不确定`. Each finding shows only **what's wrong** and **what it should be** — no internal calculation params or tool names. Use plain language: `现在显示` / `应该是` / `建议`.
- ❓ cards: for findings blocked on missing input, show the reasonable range and what needs to be confirmed — no calculation details.

Keep the report concise, no developer terms like js variabale names or Figma node IDs.

Keep the HTML simple and self-contained: inline CSS, readable on desktop, no external CDN, no build step. Do not use decorative design-system mockups that could be mistaken for the product UI; the attached screenshot is the source of truth.

**Severity:** 🔴 必改 = a provable contradiction or wrong number. 🟡 建议改 = copy / soft inconsistency. ❓ = blocked on an unknown input / uncertain.

---

## Key Principles

- **calc.mjs is the only loan calculator.** Never hand-compute 利息/还款额. Cite the exact params you fed it.
- **Every finding names two things that disagree** — displayed vs computed, element vs element, screen vs screen, copy vs fact. No vague "looks off".
- **Implausible beats unknown.** If you can't pin the exact value (unknown 借款日期), show that the displayed number is impossible across the whole plausible range — that's still a real finding.
- **Read the whole flow.** Inter-screen bugs are invisible one frame at a time.
- **Don't invent findings.** If the design can't be read, stop and ask — better no report than a fabricated one.
- **Propose the fix, don't just flag.** Each finding ends with the corrected value or a concrete choice.
- **Offer the write-back, never force it.** After the report, offer to apply 🔴 必改 fixes to Figma — visible text characters only, on explicit confirmation. 🟡/❓, band/⚠️ values, and non-text nodes are off-limits.

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Hand-calculating 利息 / 还款额 / 省利息 | Run `calc.mjs` and cite the params — 年利率 ÷ 360 = 日利率 is fixed; feed annualRate in |
| Guessing a missing input silently | Ask, or report the plausible band and mark ⚠️ |
| Checking one frame in isolation | Read the whole flow — C bugs need ≥2 screens |
| Reporting a conflict without saying which side is wrong | State the authoritative value and the fix |
| Treating the selected coupon as decoration | The selected chip drives the rate path and every number |
| Flagging the base 年利率 as wrong when an 免息 coupon is selected | 免息券不改利率; only 指定利率/折扣券 change the headline — else it's a false positive |
| Spot-checking one date to call a number "impossible" | Compare against the band's min/max (sweep dates); a single date can't prove impossibility |
| Applying Figma changes without offering / consent | Offer first; write only after explicit "apply" |
| Folding a 🟡 or ❓ into the Figma apply set | Write-back is 🔴 only; 🟡/❓ are never applied |
| Writing a ⚠️ band value or a pick-a-side conflict into the canvas | No single value yet — get the input/decision, then apply |
| Editing non-text nodes (color, layout, geometry) to "fix" a finding | Correct text characters only; never redesign |
| Flagging pixel alignment | Out of scope — this skill checks values + copy, not geometry |

---

## Quick Reference

```
Calculator (run):   node <plugin-root>/plugins/wld-design/skills/fix-details/calc.mjs '<params-json>'
                    (calc.mjs is the authoritative loan-math source; big.mjs is its vendored dep)
Params:             {annualRate|dailyRate, principal, term, loanDate, firstBillingDate?,
                     coupons[], repaymentType?, earlyRepaymentDate?, stagedRate?, stagedTerms?,
                     interestFirstTerms?}   ·  annualRate→dailyRate is fixed at ÷360
Coupon types:       INTEREST_REDUCTION {days} · DESIGNATED_RATE {annualRate|rate, terms}
                    · DISCOUNT {discountRate, terms}
Rate口径 identity:   日利率 0.0003  ⇔  1千元/天 0.3元  ⇔  年化单利 10.8%（÷360）
```
