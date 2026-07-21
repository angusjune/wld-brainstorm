# json-render 对方案生成速度与质量的适用性评估

日期：2026-07-20

> 本文记录当前产品档案的实验数据；其中的产品名、生产模板与结果不属于共享方法。

## 结论

**不建议在当前架构中直接用 json-render 替换 `solutions.html` 生成。**

它有机会明显缩短「用户第一次看到部分界面」的时间（TTFP），但没有官方证据表明它会缩短「3 个方案全部生成、通过 pass、QA 与截图检查」的总时间。对当前仓库而言，总时长的主要收益还取决于生成输出是否真的变短；json-render 的 JSONL patch 本身较冗长，catalog prompt 也会增加输入 token，因此收益不能仅凭“JSON 比 HTML 短”来假定。

“不降低质量”也不是框架自动提供的保证。json-render 能约束组件名和 prop 形状，却不能自动保证本仓库最重要的质量维度：生产模板可追溯、三方案的 UX 多样性、CTA/法律文案不变、产品规律、跨屏数据一致性、无溢出和视觉还原。若 catalog 只暴露低层组件，质量回归风险高；若暴露整块生产页面 archetype，质量更稳，但设计空间会收窄，而且前置建设成本很高。

推荐先优化当前 HTML 路径中可独立改进的环节，并把 json-render 只作为受控实验：选 1 个 benchmark case，使用产品级高阶组件 catalog，保持现有 HTML 为最终制品，并以完成时间、TTFP、输出 token、重试次数及现有质量基准作 A/B 判定。未通过这些门槛前不应迁移主路径。

## 当前架构基线

这是对仓库的直接观察，不是 json-render 官方结论：

- `brainstorm/SKILL.md` 要求模型先读 `PROFILE.md` 和最接近的生产模板，再直接写完整静态 `solutions.html`；随后执行 Simplify、产品 pass、`scripts/run-qa-gate.mjs` 和截图人工检查。[当前工作流](../../SKILL.md)
- 下游分支把批准后的 HTML 当成正式中间制品：Push to Figma 会读取 HTML、CSS 和生产模板，Beyblade 会从本地 HTML 截图和提取视觉特征。[嵌入工作流](../../references/embedded-workflows.md)
- 当前 6 个 `merged-profile` benchmark 的 `solutions.html` 共 141,746 bytes，平均约 23.6 KB；单文件约 16.3–39.5 KB。现有报告只记录 gate 质量（12 个页面为 0 error / 0 warning），没有记录生成耗时或 token，因此目前不能量化瓶颈究竟来自输出解码、读模板、passes、工具往返还是截图循环。[质量基准说明](../../quality-benchmark/README.md) · [当前报告](../quality-benchmark/runs/merged-profile/report.md)

## 官方文档确认的能力

以下是 json-render 明确提供的能力：

- catalog 定义 AI 可使用的组件、action 和 function；组件 prop 由 Zod schema 描述。registry 再把 catalog 类型映射为实际 React 等平台组件。[Catalog](https://json-render.dev/docs/catalog) · [Quick Start](https://json-render.dev/docs/quick-start)
- spec 是 JSON 文档；React 内置 schema 使用 `root` 加扁平 `elements` map，官方称该格式为 AI 生成与 streaming 优化。[Specs](https://json-render.dev/docs/specs)
- SpecStream 是 JSONL，每行是一条 RFC 6902 JSON Patch；compiler 收到 patch 后增量构建 spec，renderer 随 spec 更新而更新。[Streaming](https://json-render.dev/docs/streaming)
- standalone 模式要求模型只输出 JSONL patch；inline 模式允许文字与 patch 混合。两者底层 wire format 相同。[Generation Modes](https://json-render.dev/docs/generation-modes)
- `catalog.prompt()` 会把组件描述、prop schema、action 等写入模型 system prompt；官方源码的 fresh-generation prompt 还要求先输出 `/root`，随后交错输出 element/state patch 以实现渐进显示。[官方 README](https://github.com/vercel-labs/json-render#ai-prompt-generation) · [prompt.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/prompt.ts)
- `catalog.validate()` 以 Zod `safeParse` 校验最终 spec；另有 `validateSpec()` 检查 root、缺失 child、错误 visibility/repeat 等结构问题，并有 `autoFixSpec()` 处理一部分常见问题。[Core API](https://json-render.dev/docs/api/core) · [schema.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/schema.ts) · [spec-validator.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/spec-validator.ts)

## 1. 是否会加快方案生成

### 有把握的收益：更快的感知速度

json-render 可以在完整响应结束前渲染已经到达的 patch，所以用户可以更早看到第一个容器或第一个方案。这是 TTFP / perceived latency 的改善，不等同于整个任务更早完成。[Streaming](https://json-render.dev/docs/streaming)

### 没有证据的收益：更快的完成时间

官方文档没有提供 json-render 与直接生成 HTML 的端到端 latency、输出 token 或失败重试 benchmark。因此，以下只能作为推断：

- **可能更快：** 若 renderer 把大量重复 HTML/CSS 固化为少数高阶产品组件，模型只需输出组件类型、有限 props、children 和文案，输出 token 可以下降。
- **也可能不快甚至更慢：** 扁平 spec 每个元素都要输出 key、`type`、`props`、`children`；SpecStream 又为每个变更增加 `op`、`path`、`value`。若 catalog 仍是 `Text`、`Stack`、`Card` 这类低阶积木，JSONL 未必比当前 HTML 更短。
- **输入 token 会增加：** `catalog.prompt()` 会携带所有组件及 prop schema。catalog 越完整，守护越强，但模型每次请求要读的上下文越多。
- **总任务链不自动缩短：** 当前流程中的模板读取、三方案策略推理、Simplify、产品 pass、QA gate 和截图检查仍然需要执行。json-render 只替换表示与渲染层，不消除这些步骤。
- **streaming 可能让三个方案出现得更早，但不能安全地提前“批准”：** 后续 patch 可以替换或移除已有节点；只有最终 spec 和质量检查完成后，才能视为稳定结果。

因此，对问题 1 的回答是：**会改善首个可见结果的速度；是否提高完整 solutions 的生成速度未知，且在没有高阶组件压缩的情况下不应预期有明显收益。**

## 2. 是否能保证质量不回归

### json-render 能守住的质量

- AI 只能从 catalog 词汇中选择组件；catalog 的 Zod schema 可以拒绝未知或错误类型的 props。[Catalog](https://json-render.dev/docs/catalog) · [Core API](https://json-render.dev/docs/api/core)
- renderer 复用经过实现和测试的组件，可机械保证 token、圆角、基础布局和交互实现一致，而无需模型每次重写这些底层代码。
- 结构校验能发现 missing root、dangling child 等一类 HTML gate 不易直接表达的问题。[spec-validator.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/spec-validator.ts)

### json-render 不能自动守住的质量

以下是基于当前仓库要求的推断：

- **生产模板忠实度：** schema 只知道“允许什么”，不知道某个业务页面必须复制哪份生产模板，也不知道 canonical CTA、tab bar、法律文案和数值哪些必须原样保留。
- **方案质量与多样性：** catalog 能限制合法组件，但不能判断 A/B/C 是否形成真正不同的 UX hypothesis，或是否只是换皮。
- **产品语义与计算一致性：** schema 类型正确不代表金额、日期、还款关系、跨屏数据和文案语义正确；现有 profile passes 仍需保留。
- **像素和内容适配：** type-safe spec 仍可能渲染出溢出、截断、错误密度或视觉层级；截图检查仍然必要。
- **下游制品兼容：** 当前 Figma、prototype 和 Beyblade 分支依赖批准后的本地 HTML。改为运行时 React/spec 后，要么重写下游读取逻辑，要么再导出 HTML；后者增加一层可能失真的转换。

catalog 的粒度存在一个核心取舍：

| catalog 设计 | 速度潜力 | 模板忠实度 | 方案自由度 | 建设成本 |
|---|---:|---:|---:|---:|
| 低阶组件（Text/Card/Stack） | 低到中 | 低 | 高 | 中 |
| 产品组件（金额区、还款卡、canonical CTA） | 中到高 | 高 | 中 | 高 |
| 整页 production archetype | 高 | 很高 | 低 | 很高 |

因此，对问题 2 的回答是：**不能保证。只有以产品级 catalog、保留现有 passes/QA/截图、维持 HTML 下游契约，并通过现有 benchmark 做 A/B，才有机会证明无回归。**

## Validation、修复与重试风险

官方 API 提供“校验”和“修复提示材料”，但不等于自动完成可靠生成：

- `catalog.validate()` 返回 success/data 或 Zod error；源码没有在这个方法内执行模型重试。[schema.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/schema.ts)
- `validateSpec()` 返回 issues，`formatSpecIssues()` 把错误格式化为适合回传模型的文本；这意味着 repair loop 需要调用方自己编排。[spec-validator.ts](https://github.com/vercel-labs/json-render/blob/main/packages/core/src/spec-validator.ts)
- `autoFixSpec()` 只覆盖特定机械错误。它不能修复错误业务规则、差的 UX、错误文案或视觉回归。
- streaming 中间态天然可能暂时缺 child 或不完整，不应对每个 patch 运行最终完整性 gate；应区分增量可渲染检查与流结束后的最终校验。
- 每次 repair retry 都增加一次模型调用、输入/输出 token 和尾部延迟；若追求“无回归”而增加多轮修复，可能抵消首次生成的速度收益。

## 架构与维护风险

- 当前 publishable skill directory 是静态 HTML/CSS 加本地 Node server；json-render Quick Start 的主路径需要 core、React、Zod、AI SDK、API route 和 renderer registry，会引入构建、依赖与运行时层。[Quick Start](https://json-render.dev/docs/quick-start)
- 可用 custom schema/renderer 避开 React，但这并不会省掉 catalog、stream compiler、renderer 和验证链的实现工作。[Schemas](https://json-render.dev/docs/schemas)
- catalog 会成为第二套设计系统描述。若 `profile/components.css`、生产 screen corpus 与 catalog/registry 不由同一来源生成，三者容易漂移。
- json-render 的跨平台能力对本仓库当前目标不是直接收益：本仓库需要的是高保真 brainstorm HTML，再由单独分支实现 Figma 和 Mini Program，而不是一个通用运行时 UI app。
- 官方仓库仍在快速演进；本次调研时 README 显示大量 packages 和频繁版本发布。若采用，应锁版本并为 spec schema 与 renderer 建兼容测试。[官方仓库](https://github.com/vercel-labs/json-render)

## 建议的最小验证实验

不要先做全量迁移。实验应同时证明速度和质量：

1. 选 `quality-benchmark` 中一个结构复杂 case，例如 `me-tab-service`。
2. catalog 只定义 8–15 个从生产模板提取的高阶产品组件；不要从通用 shadcn catalog 起步。
3. renderer 仍输出与现有页面 shell、class names 和 `<preview-chrome>` 契约兼容的 HTML/DOM，确保 Figma/Prototype/Beyblade 不需先重写。
4. 保留 Simplify、profile passes、`scripts/run-qa-gate.mjs` 和 screenshot QA；新增 spec schema 与业务 invariant gate，但不要用它们替代现有 gate。
5. 固定同一模型、同一 prompt、同一 case，至少重复多次记录：TTFP、流结束时间、首次通过所有 gate 的时间、输入/输出 token、repair 次数、gate findings、人工多样性/模板忠实度评分。
6. 只有在“首次通过质量门槛的时间”稳定更短、现有 benchmark 无回归、下游 HTML 契约不变时，才扩展到更多 case。

## json-render 最终判断

| 问题 | 判断 | 置信度 |
|---|---|---|
| 提升首次可见速度 | 是，SpecStream 的直接能力 | 高 |
| 提升完整 3 方案生成速度 | 未知；取决于高阶组件能否显著减少输出 token | 中 |
| 自动保证无质量回归 | 否 | 高 |
| 值得直接迁移当前主路径 | 否 | 高 |
| 值得做一个受控 benchmark POC | 是 | 中高 |

## 后续实验：HTML 模板脚手架

在拒绝 json-render 主路径后，我们进一步测试了一个更轻的方案：确定性脚本先把选中的生产模板复制成三方案 HTML 骨架，模型再原地编辑。该实验保持最终制品为静态 HTML，并用 pending 标记防止未完成骨架通过 QA。

同一个 Figma 双 offer 节点的结果如下：

| 路径 | 首次可见 | 首版完成 | 首次 QA 通过 | QA 结果 |
|---|---:|---:|---:|---|
| 原直接生成基线 | 160.6s | 160.6s | 187.3s | 0 error / 2 warning |
| 脚手架实验 1 | 54.4s | 219.1s | 251.9s | 0 / 0 |
| 清理热点模板后的脚手架实验 2 | 75.1s | 370.5s | 444.3s | 0 / 0（第二次 QA） |
| 清理模板后的直接生成 | 294.3s | 294.3s | 317.5s | 0 / 0 |

表中的「首次 QA 通过」只表示自动 `scripts/run-qa-gate.mjs` 首次零错误；会话遥测无法自动观察 Simplify、产品 pass 或截图人工确认，因此不能把这一列当作完整质量流程的结束时间。

脚手架稳定改善了「先看到生产模板」的时间，但两次都没有改善首个可评审方案的完成时间。第一版还迫使模型把三份 inline-style DOM 重构为 class；把热点模板 class 化后，三方案骨架从 19,427 B 降到 14,085 B，仍未带来端到端提速。这说明当前瓶颈主要不在重复输出页面壳，而在方案推理、模板适配和检查循环。脚手架因此没有进入默认工作流；保留的改进是生产模板 class/SVG/CSS 清理、直接生成时复用模板 class 与单份局部 CSS，以及会话遥测。

随后又用普通子代理测试了清理后的直接生成路径。为排除 Figma 和浏览器变量，该测试不读取外部设计、不继承对话历史，只使用本地 `个人中心-双offer.html`。首版在 294.3 秒写入，317.5 秒首次通过 QA；最终 11,925 B，0 error / 0 warning。它没有复现原直接生成基线的速度，因此模板清理目前只能证明可维护性和输出体积收益，不能声称已经带来端到端提速。单次代理运行的方差较大，也不能据此断言清理本身导致变慢。

生成实验中的截图工具不可用或冲突，因此脚手架数据只能证明 gate 质量，没有证明生成方案的视觉质量等价。生产模板清理曾在本地用 12 个模板做逐像素截图对比，当次结果全部一致；仓库没有跨浏览器稳定的像素基线，所以这项结果是实验记录，不是持续回归保证。后续任何新生成路径仍需执行截图检查。
