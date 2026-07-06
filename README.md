# WLD Design 插件

面向微众银行「微粒贷」设计师和产品经理的 AI agent 技能包。这个目录是自包含本地版本，包含 Skill、共享设计资产、产品知识快照和各 provider 的生成配置。

## 插件概述

| Skill | 用途 | 适用场景 |
|---|---|---|
| `wld-design:brainstorm` | 交互式头脑风暴：澄清需求 → 生成多个方案 → 选择方案细化 | 从零设计微粒贷界面，或探索已有设计的其他可能性 |
| `wld-design:prototype` | 把设计稿转成高保真的微信小程序 demo | 已有设计稿，想在手机微信里点一点、看一看 |
| `wld-design:push-to-figma` | 把已确认的 brainstorm 设计画到 Figma，优先使用 WLD 组件库 | brainstorm 方案确认后，需要可编辑 Figma 稿 |
| `wld-design:simplify` | 精简设计，去掉冗余视觉、文案、装饰 | 每次生成后自动运行，或主动清理已有设计 |
| `wld-design:find-missing-states` | 缺失状态分析：把 Figma frame 与内置状态机对齐，列出未覆盖状态 | 改版交付前确认空态、加载、错误、浮层等状态有没有漏画 |
| `wld-design:fix-details` | 细节检查：借款数字、文案、同屏数值、跨屏一致性 | 汇报或评审前核对数字、文案与一致性 |
| `wld-design:beyblade-battle` | 把 Figma 界面变成爆旋陀螺进行混战 | 展示彩蛋，比较方案“战斗力” |

## 如何安装

### Claude

使用根目录生成好的 `.claude-plugin/`。在支持本地插件的环境中选择该目录作为插件包，安装后重新加载插件。

### Codex

使用 `plugins/wld-design/` 作为本地插件目录：

```bash
codex plugin add ./plugins/wld-design
```

### Antigravity

```bash
agy plugin install ./plugins/wld-design
```

### Cursor

把 `plugins/wld-design/` 复制到目标项目：

| 从这里复制 | 复制到这里 |
|---|---|
| `plugins/wld-design/` | `你的项目/.cursor/plugins/wld-design/` |

### opencode

把 `.opencode/` 合并到目标项目根目录。目标项目已经有 `.opencode/` 时，只合并本插件新增内容，不要整目录覆盖。

### 手动安装

复制 `plugins/wld-design/skills/` 到目标项目的技能目录，并确保 `plugins/wld-design/assets/` 一起可用。

## 如何使用 Skill

可在对话中通过自然语言或斜杠命令触发 Skill。

### `/brainstorm`

适合脑中有一个想法，或已有设计稿想看看有没有更多可能性。

Prompt 示例：

```text
/brainstorm 帮我设计一个微粒贷的新用户引导页，首次打开时推荐借款额度
```

Agent 会澄清意图、读取最匹配的生产模板、生成多个 HTML 方案、自动调用 `/simplify` 清理，并告诉你如何在浏览器预览。

### `/prototype`

适合已有 Figma 页面 / 流程，或已经用 `/brainstorm` 做出了满意方案，想生成可在微信开发者工具和手机微信里预览的小程序 demo。

必要依赖：微信开发者工具。

Prompt 示例：

```text
/prototype 这是输入金额页的新流程 Figma：[URL]，帮我做成微信小程序 demo
```

Agent 会基于内置小程序模板新建独立 demo 项目，生成真实 `.wxml` / `.wxss` / `.js` / `.json` 文件，并用内置校验器检查页面、组件引用和小程序标签。

### `/push-to-figma`

适合已经确认 brainstorm 方案，想转成可编辑 Figma 页面。

Prompt 示例：

```text
/push-to-figma 把刚才 brainstorm 选中的方案 B 画到这个 Figma 页面：[URL]
```

Agent 会优先连接本地 Figma desktop MCP，读取 WLD 组件库，创建可编辑 frame，并对比源稿修正明显的层级、间距、字体和按钮状态问题。

### `/simplify`

适合某个页面「太满」「太乱」或文案太长。

Prompt 示例：

```text
/simplify 这个借款确认页太乱了
```

Agent 会删除非必要元素、缩短样板文案、降低抢焦点装饰，并保留产品正确性约束。

### `/find-missing-states`

适合改版交付前确认有没有漏画状态。

Prompt 示例：

```text
/find-missing-states 我在改输入金额页，这是我的 Figma：[URL] 我还漏了哪些状态？
```

Agent 会从内置 spec-cache 读取状态机，用 Figma MCP 读取 frame，并输出 Matched / Divergent / Missing / New 四桶报告和易错点检查结果。没有 Figma MCP 时会降级为 Spec-Only Walkthrough，不会伪造视觉 diff。

### `/fix-details`

适合评审前核对数字、文案和跨屏一致性。

Prompt 示例：

```text
/fix-details [Figma 链接或截图]
```

Agent 会读取屏幕上的金额、利率、期数和文案，使用内置 `calc.mjs` 复算省利息、首次还、每月还、总利息，并输出按严重度分级的修正建议。

计算口径：年利率换算日利率固定按 360 天年化。

## 产品规则

本插件读取内置产品知识快照，运行时不需要额外下载：

| 缓存目录 | 内容 | 消费者 |
|---|---|---|
| `plugins/wld-design/assets/pm-memory-cache/` | 产品规律和易错点 | brainstorm / simplify / find-missing-states |
| `plugins/wld-design/assets/pm-spec-cache/` | 结构化 Spec：`index.yaml` + `components/COMP_WLD_*.yaml` | find-missing-states |

快照随本地包一起分发。普通使用者无需维护这些文件；维护者也应把它们视为只读，除非正在准备新的本地包。

## 质量基准

`brainstorm` 的产出质量基准随 Skill 一起放在 `plugins/wld-design/skills/brainstorm/quality-benchmark/`。维护者在修改 `brainstorm` 流程说明、生产模板、设计资产、嵌入分支或 `qa-gate.mjs` 后使用它；只改安装说明或普通文档时通常不需要。

运行报告示例：

```bash
npm --prefix plugins/wld-design/skills/brainstorm run benchmark:report -- quality-benchmark/runs/<version>
```

与 baseline 对比：

```bash
npm --prefix plugins/wld-design/skills/brainstorm run benchmark:report -- quality-benchmark/runs/<new> --compare quality-benchmark/runs/baseline
```

## 该插件不适用的场景

- 非微粒贷业务界面：颜色、组件、模板都是 WLD 专属
- 生产级上线工程：`/prototype` 产出可预览 demo，不负责接真实后端或发布上线
- 纯 Figma 操作：无需原型或产品检查时，直接使用 Figma 工具即可
