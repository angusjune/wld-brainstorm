# Fix Details Pass (WLD)

A pass contributed by the WLD product profile. `SKILL.md` runs it in Steps 4 and 5, after the shared Simplify Pass, because `profile/PROFILE.md` lists it in the Passes table.

This pass is lending-specific: it verifies loan arithmetic. A profile for a product without loan math would not ship it.

Completion criterion: every visible amount, rate, term, selection state, CTA label, and regulated copy in the current generated file is either consistent, corrected in the HTML, or explicitly listed as blocked on a missing input.

1. Extract every displayed fact from the generated HTML:
   - Amounts: 可借额度, 输入金额, 省利息, 首次还, 每月还, 总利息, 还款总额.
   - Rates: 年利率（单利）, 优惠年利率, daily-rate copy such as `1千元用1天只需 X 元`.
   - Terms: 期数, 还款方式, 收款账户, 用途.
   - Copy: CTA labels, coupon chips, headings, dialog buttons, agreement and footnote text.
   - Selection state: selected coupon, selected term, selected card, selected repayment method.
2. Run four checks:
   - **Calculation correctness:** use `node profile/quality/tools/calc.mjs '<params-json>'` for loan math (run `node profile/quality/tools/calc.mjs --help` for the full field list). Minimum params: `{"annualRate":0.144,"principal":60000,"term":12,"loanDate":"2026-06-08"}` — `annualRate` is a decimal (0.144 = 14.4%), `principal` in 元, `term` in months, `loanDate` as `YYYY-MM-DD`; optional `coupons`, `repaymentType`, `earlyRepaymentDate`. Never hand-compute interest or repayment amounts. Treat differences over ¥1 as real mismatches. If the screen has no loan numbers to check (e.g. a pure restyle), skip this check.
   - **Intra-screen consistency:** values on the same screen must agree, such as amount not exceeding quota and selected coupon matching the shown rate path.
   - **Inter-screen consistency:** shared values across the flow, dialogs, sheets, and backdrops must stay equal.
   - **UX copy:** units, decimal places, rate口径, terminology, CTA action, and regulated language must be consistent with production templates.
3. Coupon rules:
   - `INTEREST_REDUCTION` / `前N天0利息` does not change the headline annual rate; it only reduces interest for N days.
   - `DESIGNATED_RATE` / `优惠年利率 X%` and `DISCOUNT` / `利率打X折` change the rate path and all derived repayment values.
4. If required inputs such as 借款日期 are missing, do not guess. Either ask the user or mark the exact value as blocked. When needed, sweep a plausible date band with `calc.mjs` and flag only values impossible across the whole band.
5. Correct provable mistakes directly in the HTML. Keep a short note of what changed so Step 4/5 can tell the user before opening the preview.
