# Benchmark Run Notes — 逾期还款提醒与处理流程

Task: "设计一个逾期还款的提醒和处理流程，大概两三个屏幕"
Mode: headless benchmark — Step 1 questions skipped, defaults recorded here.

## Step 1 defaults (in place of clarifying questions)

1. **Core user action** — Default: a user whose auto-deduct repayment failed sees an
   overdue reminder and repays the full overdue amount (发现逾期 → 核对逾期账单 → 还款).
2. **Number of screens** — PM said 两三个屏幕. Default: 3-screen flow —
   ① 逾期账单 (reminder + amount + penalty breakdown + 还款 CTA),
   ② 收银台 (repayment method, existing production pattern),
   ③ 还款结果 (success state).
   Benchmark stops after Step 5 for screen ①, so only 逾期账单 is built in full.
3. **Data shown** — total overdue amount, days overdue, penalty interest (罚息),
   per-loan (借据) breakdown, failed auto-deduct bank card, credit-report risk note.
4. **Diversity mode** — UX Strategy (the request is a new flow: "设计一个…流程"),
   so the 3 options differ by journey/hierarchy, not surface styling.
5. **Chosen direction** (no user available to pick) — Default: 方案 A 账单优先
   (bill-first), the most direct reading of "提醒和处理".
6. **Data values** (internally consistent across all screens):
   - 原应还日 7月3日 → 已逾期 3 天
   - 两笔借款 ¥500.00 each（2025/11/16、2025/12/16）
   - 本期应还本息 ¥500.50 × 2 = ¥1001.00
   - 罚息 ¥1.20 × 2 = ¥2.40
   - 逾期应还合计 ¥1003.40（¥501.70 per loan）
7. **Copy tone** — factual and calm per WLD brand + QA gate (no artificial urgency):
   CTA is 「还款」 (production term), not 「立即还款」; overdue status stated as fact
   (「已逾期 3 天」), penalty explained (「罚息按日计收」), no countdowns or pressure.
8. **Overdue accent color** — `var(--wld-text-error)` (#FF5A4F) used only for the
   overdue status text; amounts stay `--wld-text-primary` to keep the calm hierarchy.
9. **Default selection in 方案 C** — all overdue loans pre-checked (clearing all
   overdue debt is the sensible default action). No bundled rule exists for this
   screen; flagging as a designer default.

## Product memory

`product-memory.md` maps no COMP_ID for 本期应还 / 提前还清 / 个人中心-有借款 / 收银台
(only 输入金额 has `COMP_WLD_LOAN_AMOUNT`), so per the bridge filter rule the
pm-memory-cache load was skipped — nothing to load for these screens.

## Template traceability

| Output | Based on production template(s) |
|---|---|
| `solutions.html` 方案 A (账单优先) | `本期应还.html` (summary + receipt rows) + `收银台.html` (centered bottom CTA) |
| `solutions.html` 方案 B (首页提醒) | `个人中心-有借款.html` (home, loan card row → overdue row) |
| `solutions.html` 方案 C (逐笔核对) | `提前还清.html` (checkbox receipt list + action bar) |
| `overdue-bill.html` (chosen A, screen ①) | `本期应还.html` + `收银台.html` (CTA placement) |

## Simplify pass decisions (wld-design:simplify applied manually)

- 方案 A rows: dropped per-row 「含罚息¥1.20」 (redundant with the summary breakdown
  「含本期应还 ¥1001.00，罚息 ¥2.40」); 方案 C keeps per-row penalty because per-loan
  verification is that option's hypothesis.
- 方案 B: removed 「总额度 ¥60000」 line (simplify reference example; not needed for
  the overdue task). Kept rate bar and footer disclaimer — interest-rate disclosure
  and approval disclaimer are legal/compliance text (simplify Boundaries: never remove).
- No 温馨提示 boilerplate, no decorations, one gold CTA per screen, no emojis, no JS.
- Credit-report line on `overdue-bill.html` kept as risk disclosure
  (「逾期信息将按规定报送征信，还清后更新」), 12px caption — factual, required-risk text.

## Benchmark deviations honored

- No clarifying questions (defaults above).
- Step 2 (server) skipped; no screenshot verification (headless).
- `wld-design:simplify` read and applied manually to both HTML files.
- Output written to `evals/ui-quality/runs/guidance-pass/overdue-flow/` instead of screenDir.
- Stopped after Step 5 screen ① of 方案 A; no feedback loop.
