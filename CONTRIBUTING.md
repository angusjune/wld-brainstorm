# 插件开发指南

本文面向维护本地版 `wld-design` 插件的人。这个目录是自包含本地包，维护目标是让使用者能直接看到并运行 Skill，而不依赖公开 marketplace 或额外源码来源。

## 开发原则

- **只改源码，不改生成物。** 手工编辑 `plugins/wld-design/skills/`、`plugins/wld-design/assets/`、`README.md`、`AGENTS.md`、`CONTRIBUTING.md`、`scripts/`。不要手改 `.claude-plugin/`、`plugins/wld-design/.codex-plugin/`、`plugins/wld-design/.cursor-plugin/`、`.opencode/`。
- **本地包自包含。** 安装说明、manifest、站点文案都应指向本地目录或本包内容，不写公开源码地址、远程 marketplace 注册命令或额外拉取步骤。
- **产品知识快照只读。** `plugins/wld-design/assets/pm-memory-cache/` 和 `plugins/wld-design/assets/pm-spec-cache/` 是随包分发的产品知识快照。除非正在准备新的本地包，否则不要手工修改。
- **Provider 包只放运行时需要的东西。** 生成目录包含 provider 必需的规则和 manifest；不会复制 `AGENTS.md`、`README.md`、`CONTRIBUTING.md`。

## 目录结构

| 路径 | 类型 | 说明 |
|---|---|---|
| `plugins/wld-design/skills/` | 手工维护 | 所有 Skill 定义 |
| `plugins/wld-design/assets/` | 手工维护 + 快照 | 设计系统、HTML 模板、产品知识快照 |
| `plugins/wld-design/assets/DESIGN.md` | 手工维护 | WLD 设计系统摘要 |
| `AGENTS.md` | 手工维护 | 本仓库的 agent 开发规则 |
| `.claude-plugin/` | 生成 | Claude 插件配置目录 |
| `plugins/wld-design/.codex-plugin/` | 生成 | Codex / Antigravity 插件配置目录 |
| `plugins/wld-design/.cursor-plugin/` | 生成 | Cursor 插件配置目录 |
| `.opencode/` | 生成 | opencode 插件配置目录 |
| `.agents/` | 生成 | Codex 本地插件市场配置 |

## 常用命令

```bash
npm run build
```

从 `plugins/wld-design/skills/` 和 `plugins/wld-design/assets/` 生成各 provider 包和本地 marketplace 文件。

```bash
npm run validate
```

验证 manifest、Skill frontmatter、设计文档结构、产品知识快照 header、provider 包内容和版本一致性。

```bash
npm test
```

等价于 `npm run build && npm run validate && npm run test:qa-gate`。提交或交付本地包前运行。

```bash
npm run eval
```

运行确定性的 Skill 触发路由检查。不调用 LLM、不联网、不构建。

## 修改 Skill

1. 编辑 `plugins/wld-design/skills/{skill-name}/SKILL.md`。
2. 如果技能依赖脚本或浏览器 helper，放在同一个 Skill 目录下。
3. 用 `<plugin-root>/...` 写运行时路径，不要硬编码个人安装路径。
4. Figma MCP、browser、Playwright 等工具名要写成 provider-neutral 描述，除非某个 provider 的 API 只能这样调用。
5. 运行 `npm test`，确认生成后的 provider 包符合预期。

Skill frontmatter 最少需要：

```markdown
---
name: skill-name
description: Use when ...
---
```

`name` 必须和目录名一致。`scripts/validate-plugin.mjs` 会检查这一点。

## 新增 Skill

1. 新建 `plugins/wld-design/skills/{new-skill}/SKILL.md`。
2. 在 `scripts/build-plugin.mjs` 的 `SKILLS` 数组中添加名称和 summary。
3. 在 `scripts/validate-plugin.mjs` 的 `SKILLS` 数组中添加同名 Skill。
4. 如果 README 需要面向用户解释这个 Skill，更新 `README.md`。
5. 运行 `npm test`。

如果新 Skill 需要共享资产，优先放进 `plugins/wld-design/assets/`，避免复制到单个 Skill 目录造成漂移。

## 修改共享设计资产

共享文件位于 `plugins/wld-design/assets/`：

- `tokens.css`：颜色、字体、尺寸等 token
- `components.css`：WLD 组件样式
- `mockup-chrome.css`：HTML preview 专用微信状态栏、导航栏、胶囊按钮样式
- `phone-mockup.css`：手机壳和多屏展示样式
- `frame-template.html`：preview server 自动注入的 frame 样式来源
- `snippets/`：preview server 展开的展示用微信 chrome HTML 片段
- `screens/`：生产准确 HTML 模板
- `product-memory.md`：Screen ↔ COMP_ID 映射和产品规则注入说明

修改共享资产后运行：

```bash
npm test
```

如果改了视觉规则，也同步更新 `plugins/wld-design/assets/DESIGN.md`。

## Provider 生成逻辑

`scripts/build-plugin.mjs` 会清理并重建：

- `.claude-plugin/`
- `plugins/wld-design/.codex-plugin/`
- `plugins/wld-design/.cursor-plugin/`
- `.cursor-plugin/`
- `.agents/`
- `.opencode/`

当前 provider 目录只存放各自配置文件，不包含 `plugins/wld-design/skills/`、`plugins/wld-design/assets/`、`AGENTS.md`、`README.md`、`CONTRIBUTING.md`。

## 验证规则

`scripts/validate-plugin.mjs` 会检查：

- `package.json` scripts 存在
- `package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json` 版本一致
- 本地 marketplace source 指向包内路径
- `plugins/wld-design/.codex-plugin/plugin.json` 指向 `../skills/`
- `plugins/wld-design/skills/*/SKILL.md` frontmatter 正确
- `plugins/wld-design/assets/DESIGN.md` 只包含约定 H2，并保持顺序
- 产品知识快照带 `# Bundled product knowledge snapshot @ ...` header
- provider 目录不包含 `skills/`、`assets/`、`rules/`、`AGENTS.md`、`README.md`、`CONTRIBUTING.md`

如果调整 provider 目录结构，要同步更新 build 和 validate 两个脚本。

## 产品知识快照

本插件包含两组随包分发的产品知识快照：

- `plugins/wld-design/assets/pm-memory-cache/`：行为规则和常见坑
- `plugins/wld-design/assets/pm-spec-cache/`：结构化 specs，只打包 `lifecycle_status: active | draft`

这些文件是本地包的一部分。除非有明确的快照刷新任务，否则不要改动；如果必须刷新，应在内部流程中生成新快照，然后只把最终快照提交到本包。

## 交付前检查

1. 确认工作区只包含本次交付相关变更。
2. 运行：
   ```bash
   npm test
   ```
3. Review diff：
   ```bash
   git diff
   ```
4. 确认文档、站点、manifest 中没有公开源码地址、远程 marketplace 注册命令或额外拉取步骤。
