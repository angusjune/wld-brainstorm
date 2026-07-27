# Brainstorm 设计 Skill

交互式设计头脑风暴：澄清需求 → 生成多个方案 → 选择某个方案进行细化。适用于从零设计界面，或探索已有设计的其他可能性。

内置一套可运行的产品档案，开箱即用。换成别的产品，只需重写 `profile/` 一个目录 —— 见下面的「适配其他产品」。

## 目录结构

分三层。只有第一层是跟产品绑定的。

**产品档案 `profile/`** —— 换产品时你唯一要重写的目录

- `PROFILE.md`：模板表、路由表、产品铁律、设计语言、passes、可选 Branches 表与速查表。Step 3 会读它；文件头部的 frontmatter 是脚本读的配置（产品、平台、page class）。
- `branches/`：产品专属的后续分支文档（可选）；只需在 `PROFILE.md` 的 Branches 表中声明，不用修改 `SKILL.md`。
- `screens/`：生产页面模板（Ground Truth，直接决定输出质量）。
- `design-system/`：唯一 token 来源、组件样式和图标。
- `knowledge/`：产品知识桥接说明与只读快照（可选）。
- `quality/`：产品 QA 规则、passes、确定性工具和基准数据（可选）。
- `prototype/`：Prototype 分支使用的产品实现模板（`app.wxss` 的 token 段是**生成**的，别手改）。

**平台包 `platforms/`** —— 同平台的产品共用

- `wechat/`：微信预览外壳、小程序工具链与 Prototype 分支。
- `ios/`：iOS 预览外壳。
- 每个包就是一个 `chrome.html`（一段样式 + 导航结构，预览服务自动展开），要贡献分支就再放一个 `branches/` 目录。

**通用机制** —— 不认识任何产品和平台

- `SKILL.md`：主流程（澄清 → 多方案 → 精简 → 质检 → 定稿 → 分支）。
- `assets/`：规范页面壳 `page-template.html`，以及由预览服务自动链接的展示样式 `frame.css`、热更新和批注资源。
- `references/`：方案发散方法与共享 Push to Figma 分支；通用 Simplify pass 已内联在 `SKILL.md`。
- `scripts/serve-preview.cjs`、`assets/live-reload.js`、`assets/annotate.js`：本地热更新预览服务，以及浏览器端 SSE 与点选批注客户端。
- `scripts/run-qa-gate.mjs`：通用质量检查（产品规则由 `profile/quality/rules.mjs` 提供）。
- `quality-benchmark/`、`scripts/`、`package.json`：质量基准、维护命令与自测。

## 使用 Skill

### 如何安装

复制 `./brainstorm` 目录到 `skills` 文件夹下。

### Prompt 示例

```bash
/brainstorm 帮我为当前产品设计一个新用户引导页
```

```bash
/brainstorm 基于这个设计多出几个不同的方案：https://figma.com/design/xxxx
```

### Skill 会做什么

当你向 Brainstorm 提出需求时，Skill 会执行以下工作流：

1. **澄清需求**：与你进行多轮对话，澄清需求。
2. **启动本地预览服务**：启动 SSE 热更新的本地 Node 服务（`scripts/serve-preview.cjs`），让你可以在浏览器中实时预览界面修改。预览页右下角可进入批注模式：点手机屏幕内的元素写一句话，Agent 下一轮会读取并直接修改，不用再用文字描述是哪个元素。仅手机屏幕内可批注；顶部导航等平台外壳不可批注。
3. **基准模板与产品规则对齐**：先读 `profile/PROFILE.md`（模板表、路由、产品铁律、设计语言），再读 `profile/screens/` 的 HTML 模板。针对核心页面，还会通过 `profile/knowledge/README.md` 提取关联的业务逻辑和常见设计坑点，确保设计在视觉和逻辑上都不偏离产品规范。
4. **生产模板优先的多方案生成**：先复制统一的 `assets/page-template.html` 页面壳，再以最接近的生产模板 DOM 和 class 为起点，只生成各方向真正不同的部分；模板局部 CSS 在同一方案页只保留一份。预览服务会自动链接手机 mockup 样式并注入当前平台包的预览外壳，供用户直观对比。
5. **质检**：在交付设计前，内部调用 **Simplify（精简设计）** 以及产品档案声明的 pass，自我修正冗余元素、数值计算错漏及样式缺陷；若当前环境支持（如安装了 Playwright MCP、Chrome DevTools MCP 或其他浏览器自动化工具），还会自动访问页面并截图，完成真正的视觉 QA 自检与纠错。
6. **选择后续分支**：方案定稿后，Skill 会依次组合反馈、共享 Push to Figma、产品档案声明的分支，以及当前平台包提供的分支，再临时分配选项字母。默认档案可将页面**推送到 Figma 画布**，或通过平台分支**生成微信小程序 Demo**。

## 开发与测试 Skill

### 修改后

`quality-benchmark/` 用来评估 `brainstorm` 的真实产出质量，不是日常使用流程的一部分。适合在修改 `SKILL.md`、生产模板、设计资产、pass/分支流程或 `scripts/run-qa-gate.mjs` 后运行，用于比较改动前后的 gate 数字和截图表现；只改普通说明文档时通常不需要。

使用方式见 `quality-benchmark/README.md`。最小报告命令：

```bash
npm run benchmark:report -- profile/quality/benchmark/runs/<version>
```

与 baseline 对比：

```bash
npm run benchmark:report -- profile/quality/benchmark/runs/<new> --compare profile/quality/benchmark/runs/baseline
```

本目录内的自测命令：

```bash
npm test
```

这一个命令会依次检查发布结构、QA gate、会话遥测、点选批注、小程序 token 同步和质量基准报告。

每次本地 brainstorm 会话都会在返回的 `stateDir` 下写入 `session-events.jsonl`，记录服务启动、`solutions.html` 写入与改版、自动 QA gate 结果和页面读取时间。它不会自动记录 Simplify、产品 pass 或截图人工确认的完成时间。需要定位慢点时运行：

```bash
npm run session:report -- /path/to/session/state
```

### 发布前

上传或分发本目录前，运行：

```bash
npm run validate
```

脚本会进行以下检查：

- 根目录存在 `SKILL.md`。
- 目录内没有 `.git/`、`node_modules/`、`.env`、`__pycache__/`、`.DS_Store`。
- `SKILL.md`、产品档案文档、共享引用和各层分支文档中只引用本目录内文件。
- 目录体积小于 100MB。

## 适配其他产品

**重写 `profile/` 目录就行**，你可以选择 AI 辅助或人工重写：

### AI 辅助适配

Prompt：

```text
请读取 `@references/setup-profile.md`，然后开始建立新的产品档案。
```

### 人工适配

详细说明见 `profile/README.md`。按重要性排序，前两项决定输出质量：

1. `profile/screens/` —— 换成你产品的生产界面模板。模型是「照着模板改」而不是「凭空生成」，这批模板直接决定输出质量。
2. `profile/design-system/tokens.css` —— 换成你的色板、字体、间距。这是唯一的 token 来源。
3. `profile/PROFILE.md` —— 重写模板表、路由表、产品铁律、设计语言；frontmatter 改成你的 `product`、`platform`、`pageClass`、`tokenPrefix`。
4. 如需产品专属的定稿后流程，把文档放在 `profile/branches/`，并在 `PROFILE.md` 的 Branches 表中按展示顺序声明。没有就让表保持空白，不需要凑一个分支。
5. 其余（`design-system/components.css`、`quality/`、`knowledge/`、Prototype 实现模板）都可以边用边补，不需要的可选部分可以删除。

改完跑 `npm run validate && npm test`。

### 几个要点

- **`SKILL.md` 不用改。** 它只写方法，通过 `profile/PROFILE.md` 读取当前产品；产品名和平台事实不要写进共享方法。
- **增删产品分支也不用改 `SKILL.md`。** `PROFILE.md` 的 Branches 表是唯一入口；表格顺序就是 Step 6 的展示顺序。
- **不用动 `scripts/run-qa-gate.mjs`。** 它只跑通用检查；产品规则在 `profile/quality/rules.mjs` 里，是可选的。删掉这个文件，新产品的界面照样过检 —— 不会被上一个产品的规则拦下来。
- **class 前缀是 profile 自己的。** 选一个产品内一致的前缀即可；通用机制不依赖具体前缀。
- **不是微信？** 把 `PROFILE.md` frontmatter 里的 `platform` 改成 `ios`，预览外壳就跟着换，12 个页面模板一行都不用改。
- **提供纯净的参考模板**：不要喂给大模型随意拼凑的页面。尽量从真实环境或 Figma Dev Mode 中提取结构完整、且使用全局 CSS class 的 HTML。
- **避免硬编码样式**：模型会模仿模板的写法。模板里如果全是内联 `<style>` 和硬编码颜色，生成的代码也会一样混乱 —— 尽量抽到 `profile/design-system/tokens.css`。
