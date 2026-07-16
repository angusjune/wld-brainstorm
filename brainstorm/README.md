# Brainstorm 设计 Skill

交互式设计头脑风暴：澄清需求 → 生成多个方案 → 选择某个方案进行细化。适用于从零设计界面，或探索已有设计的其他可能性。

内置**微粒贷（WLD）产品档案**，开箱即用。换成别的产品，只需重写 `profile/` 一个目录 —— 见下面的「适配其他产品」。

## 目录结构

分三层。只有第一层是跟产品绑定的。

**产品档案 `profile/`** —— 换产品时你唯一要重写的目录

- `PROFILE.md`：模板表、路由表、产品铁律、passes、速查表。Step 3 会读它。
- `profile.json`：脚本读的配置（平台、page class、路径）。
- `tokens.css`：**唯一的 token 来源**。`components.css`、`DESIGN.md`：组件样式与设计语言。
- `screens/`：生产页面模板（Ground Truth，直接决定输出质量）。
- `rules.mjs`：产品 QA 规则（可选，删掉只跑通用检查）。
- `product-memory.md`、`pm-*-cache/`：产品知识快照（状态机、业务规律、历史坑点）。
- `passes/`、`tools/`：微粒贷细节校验（借款金额、利息、还款额）。
- `miniprogram/`：小程序 Demo 模板（`app.wxss` 的 token 段是**生成**的，别手改）。

**平台包 `platforms/`** —— 同平台的产品共用

- `wechat/`：微信预览外壳、小程序工具链与 Prototype 分支。
- `ios/`：iOS 预览外壳。
- 每个包用 `platform.json` 声明自己的 chrome、变体和贡献的分支。

**通用机制** —— 不认识任何产品和平台

- `SKILL.md`：主流程（澄清 → 多方案 → 精简 → 质检 → 定稿 → 分支）。
- `assets/`：预览框架、手机 mockup、reset。
- `references/`：方案发散方法、嵌入 pass/分支、Figma MCP 说明。
- `server.cjs`、`helper.js`：本地热更新预览服务。
- `qa-gate.mjs`：通用质量检查（产品规则由 `profile/rules.mjs` 提供）。
- `tools/beyblade/`：爆旋陀螺战斗资源。
- `quality-benchmark/`、`scripts/`、`package.json`：质量基准、维护命令与自测。

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
3. **基准模板与产品规则对齐**：先读 `profile/PROFILE.md`（模板表、路由、产品铁律），再读 `profile/screens/` 的 HTML 模板及 `profile/DESIGN.md`。针对核心页面，还会通过 `product-memory.md` 提取关联的业务逻辑和常见设计坑点，确保设计在视觉和逻辑上都不偏离产品规范。
4. **多方案生成与 UI 装配**：依据需求生成 3 种不同方向（交互或视觉）的方案。页面会自动注入当前平台包的预览外壳和手机 mockup 样式 (`phone-mockup.css`)，供用户直观对比。
5. **质检**：在交付设计前，内部调用 **Simplify（精简设计）** 以及产品档案声明的 pass（微粒贷档案提供 **Fix Details 细节校验**），自我修正冗余元素、数值计算错漏及样式缺陷；若当前环境支持（如安装了 Playwright MCP、Chrome DevTools MCP 或其他浏览器自动化工具），还会自动访问页面并截图，完成真正的视觉 QA 自检与纠错。
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
npm test              # 全部
npm run test:qa-gate
npm run test:wxss-tokens      # 小程序 token 段是否与 tokens.css 同步
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
- `SKILL.md`、产品档案文档和 `references/` 中只引用本目录内文件。
- 目录体积小于 100MB。

## 适配其他产品

**重写 `profile/` 一个目录就行**，别的地方基本不用动。详细步骤见 `profile/README.md`。

按重要性排序，前两项决定输出质量：

1. `profile/screens/` —— 换成你产品的生产界面模板。模型是「照着模板改」而不是「凭空生成」，这批模板直接决定输出质量。
2. `profile/tokens.css` —— 换成你的色板、字体、间距。这是唯一的 token 来源。
3. `profile/PROFILE.md` —— 重写模板表、路由表、产品铁律。
4. `profile/profile.json` —— 改 `product`、`platform`、`pageClass`。
5. 其余（`components.css`、`rules.mjs`、产品知识快照、小程序模板）都可以边用边补，删掉也能跑。

改完跑 `npm run validate && npm test`。

### 几个要点

- **`SKILL.md` 不用改。** 它只写方法，不认识任何产品。只有 frontmatter 里的 `description` 两行需要改成你的产品，好让 agent 认得出来。
- **不用动 `qa-gate.mjs`。** 它只跑通用检查；产品规则在 `profile/rules.mjs` 里，是可选的。删掉 `rules.mjs`，新产品的界面照样过检 —— 不会被上一个产品的规则拦下来。
- **class 前缀是 profile 自己的。** `wld-` 只是微粒贷的前缀，通用机制里没有任何地方写死它，换成 `acme-` 不会有别的东西跟着坏。
- **不是微信？** 把 `profile.json` 的 `platform` 改成 `ios`，预览外壳就跟着换，12 个页面模板一行都不用改。
- **提供纯净的参考模板**：不要喂给大模型随意拼凑的页面。尽量从真实环境或 Figma Dev Mode 中提取结构完整、且使用全局 CSS class 的 HTML。
- **避免硬编码样式**：模型会模仿模板的写法。模板里如果全是内联 `<style>` 和硬编码颜色，生成的代码也会一样混乱 —— 尽量抽到 `tokens.css`。
