# 微粒贷设计 Brainstorm

这是一个可独立使用的微粒贷设计 Skill 目录。根目录的 `SKILL.md` 是入口，目录内已经包含运行所需的设计资产、产品知识快照、预览服务、细节校验工具、小程序 Demo 模板和界面陀螺演示工具。

## 目录内容

- `SKILL.md`：主流程说明，覆盖三方案头脑风暴、精简、细节校验、反馈迭代、推送 Figma、小程序 Demo 和界面陀螺演示。
- `assets/`：WLD 设计规范、CSS tokens、组件样式、微信预览 chrome、生产页面模板和产品知识快照。
- `references/`：方案发散方法、合并后的分支流程、Figma MCP 使用说明。
- `tools/fix-details/`：借款金额、利息、还款额等细节校验工具。
- `tools/prototype/`：微信小程序 Demo 模板、校验脚本和视觉对齐工具。
- `tools/beyblade/`：界面陀螺演示服务和前端资源。
- `server.cjs`、`helper.js`：本地热更新预览服务。
- `qa-gate.mjs`：生成页面的机械质量检查。

## 使用方式

使用时先读取 `SKILL.md`，并按其中步骤执行。所有引用路径都相对本目录，不依赖同级其他 Skill 目录。

启动预览服务示例：

```bash
node server.cjs --project-dir /path/to/project --port 3210
```

生成的页面应写入服务返回的 `screenDir`，浏览器会自动热更新。

## 上传前检查

上传或分发本目录前，确认：

- 根目录存在 `SKILL.md`。
- 目录内没有 `.git/`、`node_modules/`、`.env`、`__pycache__/`、`.DS_Store`。
- `SKILL.md` 和 `references/` 中只引用本目录内文件。
- 目录体积小于 100MB。

仓库内的 `npm run validate` 会检查这些条件。
