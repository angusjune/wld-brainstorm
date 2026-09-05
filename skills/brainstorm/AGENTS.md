# Brainstorm Skill 维护指南

本目录是可单独复制、上传和运行的 publishable skill directory。`profile/` 是内置默认档案；运行时只允许通过固定 seam 选择项目根目录的 `wld-design-profile/`。工作区档案存在时即选中并尽力使用，完整性问题作为任务级诊断。生成结果按 `<YYYYMMDD-HHmmss>-<run-label>` 保存到项目根目录的 `wld-design-brainstorms/`。这不是多产品配置系统：一次运行始终只有一个选中的产品档案。

## 先守住三层边界

- `profile/` 是内置默认产品档案：产品名、设计 token、组件、生产模板、业务规则和产品工具只能放在产品档案内。项目自定义内容由同级 `setup-profile` Skill 写入工作区 `wld-design-profile/`。
- `platforms/` 是平台包：每个平台只放一个共有的预览外壳 `chrome.html`，不得写死产品名、产品 class 或 token 前缀。
- 其余目录是通用机制：不得出现产品名，也不得假设微信、iOS 等具体平台。

额外约束：

- 不要引入外部 git、submodule 或需要同步的上游仓库；本目录必须自包含。
- 用户会看到的说明和文案使用中文。
- 不要增加任意路径、命名档案、配置注册表或生成 `SKILL.md` 的模板系统。唯一允许的选择 seam 是：存在的 `<projectDir>/wld-design-profile` 优先，否则使用内置 `profile/`。不完整的工作区档案要返回诊断并尽力运行；只有当前任务确实不可完成时才让用户选择 `--use-bundled-profile` 或先修复工作区，不能静默混用两份档案。
- 移动或重命名文件时，同时更新 `SKILL.md`、仓库根使用说明、`package.json`、测试、ADR 和站点脚本中的路径引用。

## 目录地图

```text
brainstorm/
├── SKILL.md                 # Agent 执行的主方法；保持产品、平台中立
├── AGENTS.md                # 本维护指南
├── package.json             # 维护命令入口
├── assets/                  # 通用展示资源；预览服务自动注入
├── references/              # 按需读取的通用方法与档案维护说明
├── scripts/                 # 通用运行、检查、遥测和自测脚本
├── profile/                 # 内置默认产品档案
├── platforms/               # 平台包；由 PROFILE.md 的 platform 选择
```

关键子目录：

- `assets/page-template.html`：所有生成页面共用的规范 HTML 壳；只由确定性 workflow assembler 读取和填充。
- `assets/frame.css`：展示框架、手机 mockup、gallery 和 reset；由预览服务自动链接，不要复制进生成页面。
- `assets/live-reload.js`：浏览器端 SSE 热更新客户端；由预览服务注入。
- `assets/annotate.js`：浏览器端点选批注客户端；由预览服务注入。
- `references/solution-archetypes.md`：三方案发散策略。
- `references/setup-profile.md`：维护者完整新建或替换内置产品档案时使用的逐步交互向导；用户工作区的复制与增量模板由同级 `setup-profile` Skill 负责。
- `profile/PROFILE.md`：产品档案入口；frontmatter 给脚本读，正文给 Agent 读。
- `profile/branches/`：可选的产品专属 Step 5 分支；必须在 `PROFILE.md` 的 Branches 表中声明。
- `profile/screens/`：生产页面模板语料，是生成质量的主要来源；authoring worker 将其作为完整、只读的应用级设计参考语料。
- `profile/design-system/`：token、组件样式和图标。
- `profile/quality/`：产品生成契约、规则、passes 和确定性工具。
- `profile/quality/workflow-contracts.json`：每个模板逐屏必须保留的文本/资源不变量与设计锚点；模板清单必须一一对应。
- `platforms/<platform>/chrome.html`：该平台的预览外壳。

## 脚本职责

### 通用脚本

| 路径 | 职责 | 何时修改 |
|---|---|---|
| `scripts/serve-preview.cjs` | 启动本地预览服务；选择固定工作区 seam 或内置档案，创建可追溯的 run 目录、挂载 `/assets/`、`/profile/`、`/platform/`，展开 `<preview-chrome>`，注入展示样式、热更新和点选批注客户端，并记录会话事件。 | 修改档案选择、预览协议、挂载点、平台外壳展开或会话生命周期时。 |
| `scripts/workflow.mjs` | 按 stage 生成隔离 worker brief、分角色权威来源和只读页面语料，记录选定方向的紧凑 handoff、组装规范页面、执行终端/浏览器契约，并写 usage report。 | 修改生成上下文、scaffold、handoff、硬性不变量或计量协议时。 |
| `scripts/acknowledge-annotations.cjs` | 在 Agent 应用批注后显式确认本轮实际读取到的最后一个 ID；文件写入本身不会消费批注。 | 修改批注 pending/consumed 协议时。 |
| `scripts/run-qa-gate.mjs` | 对生成 HTML 跑确定性通用检查，并按约定加载可选的 `profile/quality/rules.mjs`。 | 新增所有产品都成立的机械规则时；产品规则不要写进这里。 |
| `scripts/report-session-telemetry.mjs` | 汇总某次会话的 `session-events.jsonl`，输出生成、QA、预览等阶段耗时。 | 遥测 schema 或分析指标变化时。 |
| `scripts/validate-skill.mjs` | 检查 skill 自包含性、禁带文件、文档路径、目录体积、模板清单和静态资源引用。 | 增加新的结构约定或发布门禁时。 |
| `scripts/lib/session-telemetry.cjs` | 共享事件名、JSONL 写入和会话目录发现逻辑；不是独立 CLI。 | 预览、QA、报告器共同需要新的事件字段时。 |
| `scripts/lib/annotations.cjs` | 共享批注校验、JSONL 读写、显式确认和 pending 推导逻辑；不是独立 CLI。 | 修改批注 schema、长度限制或确认协议时。 |
| `scripts/lib/run-directory.cjs` | 校验人类可读的 run label，以本地时间生成唯一 run 目录，并声明工作区输出目录名。 | 修改 run 路径、命名或碰撞规则时。 |
| `scripts/lib/profile-selection.cjs` | 实现唯一的产品档案选择 seam：存在的工作区 `wld-design-profile/` 优先并返回完整性诊断；支持用户明确选择内置 `profile/`。 | 修改固定 seam 的诊断、内置覆盖或服务集成时。 |
| `scripts/lib/workflow-contract.cjs` | 共享 workflow 路径、context manifest、fragment assembly、静态契约和 Codex JSONL usage 解析。 | 修改 workflow schema 或确定性检查时。 |
| `scripts/lib/browser-contract.cjs` | 用本地 Chrome DevTools 协议检查真实渲染、溢出、chrome 展开、异常和截图。 | 修改浏览器终端契约时。 |
| `scripts/tests/qa-gate.mjs` | 校准 QA fixtures，并要求所有生产模板零 error。 | 修改 QA gate、产品规则或模板时。 |
| `scripts/tests/session-telemetry.mjs` | 用真实预览服务、文件监听、HTTP 和 QA CLI 做遥测集成测试。 | 修改预览或遥测链路时。 |
| `scripts/tests/annotations.mjs` | 用真实预览服务、HTTP、文件监听和确认 CLI 校验点选批注链路。 | 修改批注客户端、接口或 pending/consumed 协议时。 |
| `scripts/tests/run-directory.mjs` | 校验 run label、时间戳、输出 seam 和同秒碰撞规则。 | 修改 run 路径或命名规则时。 |
| `scripts/tests/workflow.mjs` | 用真实预览服务和 Chrome 校验 prepare → fragment edit → assemble → drift/legal/browser validate → report 的端到端契约。 | 修改生产 workflow 时。 |

### 产品工具

- `profile/quality/tools/` 只放当前产品的确定性工具。例如计算器可被产品 pass 调用；随产品一起替换。第三方源码要保留许可证头。

## 如何换成另一个产品

不要在旧档案上做零散替换。先备份需要保留的内容，再完整审计 `profile/`，确保没有旧产品事实残留。

1. 重写 `profile/PROFILE.md`。
   - frontmatter 必须维护 `product`、`productName`、`platform`、`pageClass`、`tokenPrefix`。
   - `platform` 必须对应 `platforms/<platform>/`。
   - `pageClass` 必须是每个屏幕根容器真实使用的 class。
   - `tokenPrefix` 不含前导 `--`，并与 `profile/design-system/tokens.css` 一致。
   - 重写模板清单、路由、设计语言、产品铁律、canonical CTA、passes 和速查表。
2. 替换 `profile/screens/`。
   - 使用来自真实产品或 Figma Dev Mode 的生产模板，不要放随手拼的示例页。
   - 每个 HTML 文件都必须在 `PROFILE.md` 的模板表中出现，表里的每个文件也必须真实存在。
   - 模板使用 `/profile/`、`/platform/`、`/assets/` 挂载路径，不要写本机绝对路径。
3. 重写 `profile/design-system/tokens.css`、`profile/design-system/components.css` 和 `profile/design-system/assets/`。
   - `profile/design-system/tokens.css` 是唯一 token 来源；组件和模板优先引用 token。
   - class 与 token 前缀属于产品档案，可整体更换；通用脚本不应依赖具体前缀。
4. 重写产品 passes、规则和工具。
   - `profile/quality/passes/` 定义生成前的产品校验步骤。
   - `profile/quality/rules.mjs` 是可选 QA rule pack；不需要时直接删除，不要修改通用 QA gate 来绕过旧规则。
   - `profile/quality/tools/` 与 pass 一起替换，删除不再使用的计算器或数据文件。
5. 处理产品分支。
   - 产品专属 Step 5 分支文档放进 `profile/branches/`，并按展示顺序写入 `PROFILE.md` 的 Branches 表。
   - 没有产品分支时删除整个目录并让 Branches 表保持空白；用户仍可继续反馈迭代。
   - 新增或删除产品分支不应修改 `SKILL.md`。
6. 不要为换产品修改 `SKILL.md`、`scripts/`、`assets/` 或 `references/`。如果新产品暴露的是通用缺陷，单独修通用机制，并确认没有加入产品事实。

## 修改后的验证

在 `skills/brainstorm/` 目录运行：

```bash
bun run validate
bun run test
```

按改动范围补充验证：

- 只改说明：至少跑 `bun run validate`。
- 改模板、tokens、components、rules 或 QA：跑 `bun run validate && bun run test`。
- 改生成方法、模板语料或 passes：跑完整测试与真实预览，检查 workflow 生成的浏览器截图。
- 改预览服务：启动 `bun run preview -- --project-dir <临时目录> --run-label smoke-test`，确认返回 JSON、页面可访问、热更新和退出都正常。

提交前再搜索一次旧路径和越界知识：

```bash
rg -n "serve-preview|run-qa-gate|profile/|platforms/" SKILL.md package.json scripts
rg -n "旧产品名|旧前缀" . --glob '!profile/**'
```

第二条命令里的占位词必须换成实际旧产品名和旧 class/token 前缀。
