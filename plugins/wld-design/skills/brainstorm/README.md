# 微粒贷设计 Brainstorm

这是一个可独立使用的微粒贷设计 Skill 目录。根目录的 `SKILL.md` 是入口，目录内已经包含运行所需的设计资产、产品知识快照、预览服务、细节校验工具、小程序 Demo 模板和爆旋陀螺战斗。

## 目录内容

- `SKILL.md`：主流程说明，覆盖三方案头脑风暴、精简、细节校验、反馈迭代、推送 Figma、小程序 Demo 和爆旋陀螺战斗。
- `assets/`：WLD 设计规范、CSS tokens、组件样式、微信预览 chrome、生产页面模板和产品知识快照。
- `references/`：方案发散方法、嵌入分支流程、Figma MCP 使用说明。
- `tools/fix-details/`：借款金额、利息、还款额等细节校验工具。
- `tools/prototype/`：微信小程序 Demo 模板、校验脚本和视觉对齐工具。
- `tools/beyblade/`：爆旋陀螺战斗所需的前端资源。
- `server.cjs`、`helper.js`：本地热更新预览服务。
- `qa-gate.mjs`：生成页面的机械质量检查。
- `quality-benchmark/`：`brainstorm` 输出质量基准，包含固定 prompt、qa-gate fixture 和报告脚本。
- `package.json`、`scripts/`：可独立运行的维护命令，包括 QA gate、质量基准报告和自测。

## 使用 Skill

使用时先读取 `SKILL.md`，并按其中步骤执行。所有引用路径都相对本目录，不依赖同级其他 Skill 目录。

Skill 执行时由 agent 启动并管理热更新预览服务。生成的页面应写入服务返回的 `screenDir`，浏览器会自动热更新。

## 更新 Skill

### 修改后

`quality-benchmark/` 用来评估 `brainstorm` 的真实产出质量，不是日常使用流程的一部分。适合在修改 `SKILL.md`、生产模板、设计资产、嵌入流程或 `qa-gate.mjs` 后运行，用于比较改动前后的 gate 数字和截图表现；只改普通说明文档时通常不需要。

使用方式见 `quality-benchmark/README.md`。最小报告命令：

```bash
npm run benchmark:report -- quality-benchmark/runs/<version>
```

与 baseline 对比：

```bash
npm run benchmark:report -- quality-benchmark/runs/<new> --compare quality-benchmark/runs/baseline
```

本目录内的自测命令：

```bash
npm run test:qa-gate
npm run test:quality-benchmark
```

### 发布前

上传或分发本目录前，运行：

```bash
npm run validate
```

脚本会进行以下检查：

- 根目录存在 `SKILL.md`。
- 目录内没有 `.git/`、`node_modules/`、`.env`、`__pycache__/`、`.DS_Store`。
- `SKILL.md` 和 `references/` 中只引用本目录内文件。
- 目录体积小于 100MB。
