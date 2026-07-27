# Brainstorm 质量基准

这个目录用于衡量 `brainstorm` 产出的界面质量。路由 eval 只判断哪个 Skill 被触发；质量基准判断 `brainstorm` 实际生成的 HTML 是否稳定遵守模板、组件、文案和 QA gate 规则。

## 什么时候使用

- 修改 `SKILL.md`、`references/`、`profile/screens/`、设计 token、组件样式或产品知识注入方式后，用它做改动前后的质量对比。
- 修改 `scripts/run-qa-gate.mjs` 后，用它确认 gate 仍能抓到机械问题，同时不会误伤生产模板。
- 准备发布或上传 publishable skill directory 前，用它抽样检查典型 PM prompt 的真实产出。
- 只改安装说明、普通 README、provider manifest 文案时，通常不需要跑完整质量基准；跑 `npm run validate` 即可。

## 目录结构

报告程序属于通用机制；prompt、fixture 与历史结果属于当前产品，因此跟随 `profile/` 一起替换。

```text
quality-benchmark/
├─ README.md             # 本说明
└─ report.mjs            # 通用报告生成器

profile/quality/benchmark/
├─ prompts.json          # 当前产品的固定 PM prompt；不要改已有 id，只新增 case
├─ fixtures/             # 当前产品 qa-gate 自测用的已知好/坏 HTML
└─ runs/<version>/       # 当前产品每次基准运行的输出目录
   ├─ <case-id>/
   │  ├─ *.html          # agent 生成的页面，建议提交
   │  ├─ *.html.png      # 渲染截图，可重新生成
   │  └─ NOTES.md        # benchmark mode 下选择的默认值
   ├─ report.json
   ├─ report.md
   └─ compare-<other>/   # 与另一版本的并排截图
```

`<version>` 用来标记被测状态，例如 `baseline`、`template-index`、`qa-gate-wired`。

## 生成方式

每个 case 使用一个全新的 agent，避免上下文污染。给 agent 两段输入：

1. `profile/quality/benchmark/prompts.json` 中对应 case 的 `prompt` 原文。
2. 下面的 benchmark mode 指令块。

```text
Execute the design task by following SKILL.md exactly, with these benchmark-mode deviations:
- Do NOT ask clarifying questions. Choose sensible defaults for anything Step 1 would have asked, and record every default in NOTES.md.
- Skip Step 2 (server start) and all browser screenshot verification.
- Where the skill runs passes, apply the Shared Simplify Pass in SKILL.md and every pass the profile declares yourself.
- Write all output HTML files to profile/quality/benchmark/runs/<version>/<case-id>/ instead of screenDir. Copy `assets/page-template.html` for each file and follow the skill's file naming.
- Stop after Step 5 for the first screen of the chosen direction. Produce solutions.html plus at least one full screen; do not enter the feedback loop.
```

这些偏差只替代交互和浏览器验证部分；其他设计规则仍以 `SKILL.md` 为准。不要额外提示 agent 应该使用哪个模板或怎么修，质量基准衡量的是 Skill 自身说明是否足够清楚。

## 评分与对比

在 `brainstorm` 目录运行：

```bash
npm run benchmark:report -- profile/quality/benchmark/runs/<version>
```

与 baseline 对比：

```bash
npm run benchmark:report -- profile/quality/benchmark/runs/<new> --compare profile/quality/benchmark/runs/baseline
```

报告会输出：

- `report.json`：每个 case 的 error / warning 数量和 finding code。
- `report.md`：人读摘要。
- `*.html.png`：通过真实 `scripts/serve-preview.cjs` 渲染的页面截图。
- `compare-<other>/`：与另一版本的并排截图。

如果本机没有 Chrome / Chromium，报告仍会生成 gate 数字，但会跳过截图和并排图。可通过 `CHROME_PATH` 指定浏览器。

## 自测

在 `brainstorm` 目录内运行（这些脚本定义在 `brainstorm/package.json`）：

```bash
npm test
```

完整自测包含 QA gate 和质量基准报告。校准规则：生产模板必须是 0 个 error。若 gate 报生产模板错误，优先修 gate；只有确认模板本身有问题时才改模板。
