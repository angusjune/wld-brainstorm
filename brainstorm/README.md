# 微粒贷设计 Brainstorm

微粒贷设计 Skill，可进行交互式头脑风暴：澄清需求 → 生成多个方案 → 选择某个方案进行细化。适用于从零设计微粒贷界面，或探索已有设计的其他可能性。

## 目录内容

- `SKILL.md`：主流程说明，覆盖三方案头脑风暴、精简、细节校验、反馈迭代、推送 Figma、小程序 Demo 和爆旋陀螺战斗。
- `assets/`：WLD 设计规范、CSS tokens、组件样式、微信预览 chrome、生产页面模板和产品知识快照。
- `references/`：方案发散方法、嵌入分支流程、Figma MCP 使用说明。
- `profile/tools/`：微粒贷借款金额、利息、还款额等细节校验工具（属于产品档案）。
- `platforms/wechat/prototype/`：微信小程序 Demo 模板、校验脚本、视觉对齐工具，以及可选的微信开发者工具驱动技能包（`references/miniprogram-dev-skill/`，安装 `wechatide` CLI 后可直接打开项目、编译、截图并推送真机预览）。
- `tools/beyblade/`：爆旋陀螺战斗所需的前端资源。
- `server.cjs`、`helper.js`：本地热更新预览服务。
- `qa-gate.mjs`：生成页面的质量检查。
- `quality-benchmark/`：`brainstorm` 输出质量基准，包含固定 prompt、qa-gate fixture 和报告脚本。
- `package.json`、`scripts/`：可独立运行的维护命令，包括 QA gate、质量基准报告和自测。

## 使用 Skill

### 如何安装

复制 `./brainstorm` 目录到 `skills` 文件夹下。

### Prompt 示例

```bash
/brainstorm 帮我设计一个微粒贷的新用户引导页，首次打开时推荐借款额度
```

```bash
/brainstorm 基于这个设计多出几个不同的方案：https://figma.com/design/xxxx
```

### Skill 会做什么

当你向 Brainstorm 提出需求时，Skill 会执行以下工作流：

1. **澄清需求**：与你进行多轮对话，澄清需求。
2. **启动本地预览服务**：启动 SSE 热更新的本地 Node 服务 (`server.cjs`)，让你可以在浏览器中实时预览界面修改。
3. **基准模板与产品规则对齐**：读取 `profile/screens/` 的 HTML 模板及 `DESIGN.md` 设计规范。针对核心页面，还会通过 `product-memory.md` 提取关联的业务逻辑和常见设计坑点，确保设计在视觉和逻辑上都不偏离微粒贷产品规范。
4. **多方案生成与 UI 装配**：依据需求生成 3 种不同方向（交互或视觉）的方案。页面会自动注入微信顶栏和手机外壳样式 (`phone-mockup.css`)，供用户直观对比。
5. **质检**：在交付设计前，内部调用 **Simplify（精简设计）** 和 **Fix Details（细节校验）** 流程来自我修正冗余元素、数值计算错漏及样式缺陷；若当前环境支持（如安装了 Playwright MCP、Chrome DevTools MCP 或其他浏览器自动化工具），还会自动访问页面并截图，完成真正的视觉 QA 自检与纠错。
6. **生成交互式demo或推送至figma**：方案定稿后，可直接通过内部指令将页面 **推送到 Figma 画布**、**生成微信小程序 Demo** 或 **开启爆旋陀螺战斗**。

## 开发与测试 Skill

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

## 适配其他产品

该 Skill 的底层工作流不仅限于微粒贷（WLD），只需替换核心资产与规则文件，也适配其他产品。

### 核心替换项

1. **样式与规范 (`assets/`)**：
   - 替换 `tokens.css` 和 `components.css` 为新产品的样式组件库。
   - 修改 `DESIGN.md` 以体现新产品的设计语言和约束。
2. **生产模板基准 (`profile/screens/`)**：
   - 清空原微粒贷的页面，放入新产品的核心页面模板（如首页、表单页、详情页等）。
   - **重要**：这些模板是模型生成界面的基准（Ground Truth），直接决定了模型的输出结构质量。
3. **业务知识库 (`profile/product-memory.md` 及 `pm-memory-cache/`)**：
   - 重新梳理新界面的业务规则（Patterns）与易错陷阱（Pitfalls）。如果不需要，可将相关内容清空。
4. **`SKILL.md`**：
   - 将文案中的 "WLD" 和微粒贷替换为新产品。
   - **重要** `Step 3: Read Production Templates` 里的表格，使之与你新放入的页面模板一一对应。

### 适配时的注意事项

- **提供纯净的参考模板**：不要喂给大模型随意拼凑的页面。请尽量从真实环境或 Figma Dev Mode 中提取结构完整、且使用全局 CSS Class 的 HTML 文件。
- **避免硬编码样式**：模型会模仿模板的写法，如果你的模板里有大量的内联 `<style>` 或硬编码颜色，生成的代码也会一样混乱，请尽量将它们抽象到 `tokens.css` 中。
- **同步调整 QA**：`qa-gate.mjs` 中内置了与微粒贷强绑定的自动化检查规则（例如必须存在微信假顶栏 `preview-chrome`、背景色必须是 `#F5F5F5` 等）。在适配新产品时必须同步删除或修改这些检查，否则会自动拦截生成的正常界面。
