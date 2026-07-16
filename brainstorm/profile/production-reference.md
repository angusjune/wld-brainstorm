# WLD Production Reference

Current app state and terminology. The app is called **微粒贷 (Weilidai / WeBank Micro-Loan)** and runs as a WeChat mini-program. Demos should match this look and feel.

**Figma reference:** `figma.com/design/uVpLmK5WAQCUdV5pY0FK82` → node `6:1502` (Reference)

---

## App Structure

2-tab bottom navigation: 借钱 (Borrow) and 我的 (My Account). Tab bar: 51px, frosted white bg (`rgba(251,251,251,0.85)`), 0.5px top border.

Top of every HTML mockup screen: **presentation-only WeChat mini-program chrome** — status bar (44px) + title bar (44px) = 88px. Title centered ("微粒贷"), capsule button (···⊙) right. Inner pages: back arrow left. In brainstorm HTML, use `<preview-chrome>` so the server expands the shared snippet; do not hand-write this chrome as production UI.

---

## Screen 1: Home — New User (个人中心)

```
┌─────────────────────────────────┐
│ [Status Bar]        [···] [⊙]  │  88px navbar
│           微粒贷                │
├─────────────────────────────────┤
│ 年利率(单利)10.8%，1千元用1天只需0.3元 │  Rate bar (30px, 12px)
│                                 │
│           预估可借               │  14px Semibold
│          ¥ 60000               │  44px WeChat Sans SS
│           (●借钱●)              │  84px gold circle
│                                 │
│           借钱须知               │  14px link
│     实际可借以当次借款审批为准      │  14px, 55% opacity
├─────────────────────────────────┤
│  [借钱]            [我的]       │  Tab bar, 51px
└─────────────────────────────────┘
```

## Screen 2: Home — Active Loan (个人中心-有借款)

Same as Screen 1, plus:
- **日利率 0.045%** subtitle below amount (14px secondary)
- **Loan details card** below circle button: white card (345px), rows with right arrows
  - "9月16日应还 ¥537.20 >" and "提前还清借款 1笔 >"
  - Row ~50px, 0.5px divider between rows

## Screen 3: Home — Dual Offer (个人中心-双offer)

Same top (预估可借 ¥60000), replaces circle button with:
- **"新用户优惠 2 选 1"** label (orange/emphasis)
- **Two side-by-side offer cards** (~155px each):
  - Card 1: "前30天" → "0 利息" (large) → gold pill "借钱"
  - Card 2: "优惠年利率" → "7.2%" (large) → gold pill "借钱"

## Screen 4: Home — Single Offer (个人中心-单offer)

Same as Screen 1 + promotional banner below circle button:
- Orange tag "限1笔" (gradient bg) + "前30天0利息"
- Light yellow (#FFF4D9) pill container with triangle pointer up

## Screen 5: Loan Amount Input (输入金额)

```
┌─────────────────────────────────┐
│ ← 微粒贷          [···] [⊙]   │
├─────────────────────────────────┤
│ ¥ 10000                    (x) │  44px WeChat Sans + clear btn
│ [借1万] [借2万] [借全部]         │  Quick amount pills (outlined)
├─────────────────────────────────┤
│ 🎁 前30天0利息    省利息¥150.00> │  Promotion (gold highlight)
├─────────────────────────────────┤
│ 借款期数         24 个月 >      │  Cell/Select rows
│ 还款计划    首次6月16日，应还¥683>│
│ 收款账户    🏦 工商银行(2004) >  │
│ 借款用途       个人日常消费 >    │
│ 协议相关    年利率(单利)10.8% >  │
├─────────────────────────────────┤
│  [        下一步        ]      │  Full-width gold pill (M)
│  按日计息，次日起可提前还，免违约金 │  12px disclaimer
└─────────────────────────────────┘
```

## Screen 6: Early Repayment (提前还清)

```
┌─────────────────────────────────┐
│ ← 提前还清借款     [···] [⊙]   │
├─────────────────────────────────┤
│ 借款                            │  Section title
│ ○ 借款 ¥500       明日起可还 ⓘ  │  Receipt row (greyed)
│   2020/05/21                    │
│─────────────────────────────────│
│ ○ 借款 ¥500.00    应还¥500.50 ⓘ │  Receipt row
│   2020/05/20                    │
│─────────────────────────────────│
│ ● 借款 ¥500.00    应还¥504.00 ⓘ │  Checked (gold)
│   2020/05/01                    │
├─────────────────────────────────┤
│ ○ 全选   总计 ¥504.00  (还款)   │  Action bar + gold pill
└─────────────────────────────────┘
```

## Screen 7: Current Period Due (本期应还)

```
┌─────────────────────────────────┐
│ ←  本期应还         [···] [⊙]  │
├─────────────────────────────────┤
│ 9月16日应还                     │  14px secondary label
│ ¥ 1001.00                      │  44px WeChat Sans SS
│ 优先从招商银行(5397)自动还款 ⓘ   │  12px secondary + info icon
├─────────────────────────────────┤
│ 借款 ¥500         本期应还¥500.50>│ Receipt row with arrow
│ 2020/05/20                      │
│─────────────────────────────────│
│ 借款 ¥500         本期应还¥500.50>│
│ 2020/05/20                      │
└─────────────────────────────────┘
```

## Additional production templates

`收银台` (cashier), `借款详情` (loan details), `欢迎页` (welcome), `更换还款卡` (change repayment card), and `我的Tab` (account tab) also exist in `profile/screens/` — each file's header comment describes its purpose, layout, and background.

---

## Shared Components

| Component | Usage | Details |
|-----------|-------|---------|
| **Preview Chrome** | Every HTML mockup screen | `<preview-chrome>` expands to 88px WeChat chrome; presentation-only |
| **Tab Bar** | Home screens only | 2 tabs: 借钱 (active) + 我的 (inactive), 51px |
| **Interest Rate Bar** | Home screens | 30px, centered, 12px secondary, optional orange tag |
| **Circle Button** | Home screens (借钱) | 84px gold circle, 18px Semibold text; Amount input uses a full-width gold pill 下一步 instead |
| **Receipt Row** | Repayment screens | Checkbox + loan info left + amount right + info icon |
| **Footer** | Home screens | Links (14px) + disclaimer (14px, 55% opacity) above tab bar |
| **Quick Amount Pills** | Amount input | Outlined pill buttons for preset amounts |
| **Promotion Banner** | Home + Amount | Light yellow (#FFF4D9) bg, orange tag, rate text |

---

## Terminology

| Chinese | English | Context |
|---------|---------|---------|
| 微粒贷 | Weilidai | App name (WeBank micro-loan) |
| 借钱 | Borrow | Main tab, circle CTA |
| 我的 | My Account | Second tab |
| 预估可借 | Estimated available | Label above amount on home |
| 总额度 | Total credit limit | Shown when partially used |
| 日利率 | Daily interest rate | Shown on active loan home |
| 年利率(单利) | Annual rate (simple) | Interest rate bar |
| 借款期数 | Loan term | In months |
| 还款计划 | Repayment plan | First payment date + amount |
| 收款账户 | Receiving account | Bank card selector |
| 借款用途 | Loan purpose | Dropdown selector |
| 提前还清 | Early repayment | Repay before due date |
| 本期应还 | Current period due | Amount due this period |
| 借据 | Receipt/IOU | Individual loan record |
| 下一步 | Next step | Continue button |
| 还款 | Repay | Repayment action |
