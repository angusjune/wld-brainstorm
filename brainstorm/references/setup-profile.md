# 新建产品档案：Agent 分步向导

本文件供 AI Agent 执行。目标是在一份已经复制好的 Brainstorm skill 中，用新产品内容完整替换唯一的 `profile/`，而不是创建多个 profile、选择器或配置系统。

## 目录

- [启动方式](#启动方式)
- [Agent 交互协议](#agent-交互协议)
- [第 1 步：确认产品身份与替换范围](#第-1-步确认产品身份与替换范围)
- [第 2 步：建立生产页面模板语料](#第-2-步建立生产页面模板语料)
- [第 3 步：建立设计 Token](#第-3-步建立设计-token)
- [第 4 步：建立组件样式与图标](#第-4-步建立组件样式与图标)
- [第 5 步：重写产品档案入口](#第-5-步重写产品档案入口)
- [第 6 步：处理产品知识](#第-6-步处理产品知识)
- [第 7 步：处理产品质量规则](#第-7-步处理产品质量规则)
- [第 8 步：处理产品专属分支](#第-8-步处理产品专属分支)
- [第 9 步：处理 Prototype 产品模板](#第-9-步处理-prototype-产品模板)
- [第 10 步：处理研究材料](#第-10-步处理研究材料)
- [第 11 步：清理残留并完成验证](#第-11-步清理残留并完成验证)

## 启动方式

推荐用户在启动提示中同时给出主设计来源，这样 Agent 可以直接预填第 1、2 步：

```text
请读取 /绝对路径/brainstorm/references/setup-profile.md，使用这个 Figma 文件建立新的产品档案：https://figma.com/design/...?node-id=...
```

只说下面这句也可以；Agent 会在第 1 步只补问一个主来源：

```text
read <the_doc_path>, then start setup a new profile
```

## Agent 交互协议

0. 读取本文件后立即完成只读预检并启动第 1 步。不要先复述整份向导，也不要一次询问后续所有步骤。
1. 从本文件路径反推出 Brainstorm skill 根目录，记为 `skillDir`。先读取 `AGENTS.md`、`profile/README.md`、当前 `profile/PROFILE.md`，列出 `platforms/` 中已有的平台包，并检查工作区现状。
2. 把用户当作**预览者和决策者**，不是实现者。不要要求用户从零编写 YAML、页面清单、token、CSS、组件清单、规则或脚本。用户通常只需要提供 Agent 无法自行发现的来源、授权替换旧档案、预览结果，并回复“确认”或指出修正项。
3. 每一步在询问用户前先最大化自动处理：
   - 复用用户已经提供的所有来源，不要求重复上传；
   - 读取前面步骤已确认的产物；
   - 从 Figma 文件名、页面、frame、variables、styles、组件实例、文案和图层属性中提取事实；
   - 从生产页面、产品文档和本地代码中补充可验证事实；
   - 准备实现草稿、差异或视觉预览；
   - 把本步 YAML 的所有可推断字段填成具体值。
4. 不要向用户展示空白表单。每一步都展示一份**已预填 YAML**，并列出来源、推断项和无法确认项。下面各步骤中的 YAML 仅表示结构；实际对话时必须替换成当前产品的真实值，不能把尖括号、`auto`、示例值或可推断的空数组原样丢给用户。
5. 用户回复格式保持最小：

```text
确认
```

或只提供需要覆盖的字段：

```yaml
canonicalScreen: 确认页
exclude:
  - 探索稿
```

只有来源不可访问或关键事实完全不存在时，才要求用户额外提供一个路径、URL 或一句产品决定。使用 `unknown` 标记无法确认的字段，并同时写明已经检查过的来源和只需用户回答的一个最小问题。
6. 用户确认预填方案后，Agent 自行落盘、转换资源、实现代码并运行本步检查。完成后立即自动准备下一步的预填方案；不要问“是否继续？”。
7. 每一步完成后使用同一份简报格式：

```text
第 N 步已完成
- 已读取：
- 已写入/删除：
- 已检查：
- 已确认的决定：
- 留给后续步骤的问题：

第 N+1 步预填方案
<已填入真实值的 YAML>

来源：……
推断：……
无法确认：……
请回复“确认”，或只贴出需要修改的字段。
```

8. 不要猜产品事实、合规规则、金额或业务状态。视觉规律可以从生产材料中推断，但必须标出来源和置信度；产品铁律、合规文案和破坏性替换必须得到用户确认。
9. Agent 自行判断可选步骤的推荐 `mode`：有可信来源时预填 `create`，没有来源时预填 `skip`。用户只需确认或覆盖。选择跳过时删除旧产品对应内容和引用，不能把旧档案当占位符保留。
10. 只改 `profile/`。不要为新产品修改 `SKILL.md`、`assets/`、`scripts/`、`references/` 或 `platforms/`；不要创建 active profile、profile selector 或生成器。若发现真正的通用缺陷，单独向用户说明。
11. 禁止外部 git、submodule 和需要持续同步的上游仓库。可以读取用户明确提供的本地文件、设计链接或文档，但最终运行所需内容必须复制进 `profile/`，保持 skill 自包含。
12. 替换已有文件前先读取它们，保留用户已经完成且明确属于新产品的修改。涉及成批删除时列出精确目标；第 1 步的 `replaceCurrentProfile: true` 只授权替换 `profile/` 内旧产品内容。
13. 设置过程中允许暂时无法通过完整验证，但不得把中间状态说成可用。只有第 11 步全部通过后才能宣布新档案完成。

用户提供文件时，优先接受以下形式：

- 工作区内的绝对文件或目录路径；
- 带明确节点的 Figma URL 或其他可读取的设计来源；
- 一句自然语言说明；
- 只包含修正字段的 YAML；
- 少量内容直接粘贴在 fenced code block 中。

路径无法读取、链接无权限或文件格式不明时，立即指出具体条目，请用户修正当前步骤的输入。

## 第 1 步：确认产品身份与替换范围

### Agent 先预填，再请用户确认

先从用户当前提示、Figma 文件名、设计页面标题、产品文档和当前工作区推断全部字段。实际展示时填入真实候选值：

```yaml
productName: 已从来源推断的展示名
product: inferred-code
platform: wechat
pageClass: inferred-page
tokenPrefix: inferred
replaceCurrentProfile: true
primarySources:
  - https://figma.com/design/abc123/Product?node-id=1-2
```

- 上面的值只是结构示例；Agent 展示时必须替换为当前产品的推断结果。
- 如果用户的启动提示已经包含 Figma 或文档路径，自动填入 `primarySources`。
- 如果没有任何新产品来源，只向用户索取**一个**带节点的 Figma URL、可访问产品页面或绝对文档路径；不要同时要求产品名、代号、class 和 token 前缀。
- `replaceCurrentProfile: true` 可以因“开始建立新的产品档案”而预填，但必须由用户明确确认。
- 如果用户不确认替换，请停止；一份 skill 不能同时维护多个 profile。

### Agent 处理

1. 先读取主来源，再根据产品名与设计 surface 推断产品代号、平台、page class 和 token 前缀。
2. 确认 `platforms/<platform>/` 已存在。来源不足以判断平台时，结合 frame 尺寸、系统 chrome 和当前已有平台包给出推荐；只有确实无法判断时才让用户二选一。
3. 校验 `product`、`pageClass`、`tokenPrefix`；确保它们合法、稳定且不会与共享 class/token 混淆。
4. 向用户展示预填 YAML、每个推断的来源和低置信度项。用户只需回复“确认”或覆盖错误字段。
5. 用户确认后：
   - 盘点当前 `profile/`，记录旧产品名、短代号、class 前缀、token 前缀以及可选目录，供第 11 步使用；
   - 检查当前档案里是否已有属于新产品的未完成工作，避免盲目覆盖；
   - 将五个字段写入 `profile/PROFILE.md` frontmatter，但不把旧正文当成新产品事实。

### 完成标准

- 产品身份、平台、page class、token 前缀均已确认。
- 用户已经明确授权替换当前 `profile/`。
- 旧档案残留标记已经记录。

## 第 2 步：建立生产页面模板语料

### Agent 自动发现屏幕，再请用户预览范围

默认复用第 1 步的 Figma 文件或设计来源。Agent 必须先遍历指定节点下的页面、section 和 frame，自行识别生产屏、状态变体、探索稿和组件页，不要求用户逐屏填表。

先展示已预填的范围决策：

```yaml
source: https://figma.com/design/abc123/Product?node-id=1-2
scope: all-production-ready-frames-under-source
canonicalScreen: 首页
includeStates: true
exclude:
  - 组件陈列
  - 废弃探索稿
```

同时由 Agent 生成完整屏幕清单表，预填屏幕名称、节点 URL、用途/状态、基准屏判断、必须保留的文案/数据和置信度。用户只需预览后回复“确认”，或只列出要增删的 frame 和错误字段。

只有以下情况才向用户追问：

- 来源节点无法访问：只索取一个可访问 URL 或权限；
- 生产稿和探索稿无法区分：展示冲突 frame 的缩略图/名称，让用户选择；
- 没有任何代表性生产屏：请求一个基准屏节点。

### Agent 处理

1. 读取来源的元数据、设计上下文和截图；设计链接要读取指定节点及其子节点，不要只看整页缩略图。
2. 建立语义清晰的文件名，并在临时目录准备完整替换集，避免把新旧产品模板混放。
3. 将 Figma 中可导出的 icon 与插图按原始矢量或位图暂存为 `profile/design-system/assets/` 的候选资源；不要目测重画图标。
4. 将每个模板整理为 `profile/screens/` 下的 HTML 片段：
   - 顶部注释写明屏幕、用途/状态、结构和背景；
   - 恰好有一个以确认后 `pageClass` 为 class 的页面根容器；
   - 平台导航只使用当前平台模板支持的 `<preview-chrome>` 形式；
   - 资源只走 `/profile/`、`/platform/` 或 `/assets/` 挂载路径；
   - 保留产品文案、数据、状态、法律/合规信息和页面局部样式；
   - 不加入手机 mockup、gallery 或完整文档壳，这些属于生成与预览层。
5. 为自动识别的模板生成可视预览或截图，先让用户确认覆盖范围和明显转换错误，而不是让用户审查 HTML。
6. 用户确认后，用准备好的完整集合替换旧 `profile/screens/`，把已确认候选资源写入 `profile/design-system/assets/`，并记录模板路由、基准屏、CTA 形式与未覆盖状态，供后续步骤自动复用。

### 完成标准

- Agent 自动发现且用户确认范围内的每张屏都已经落成可读 HTML。
- 每个模板都使用新的 page class 和包内资源路径。
- 新旧产品模板不再混放。
- 用户已经通过清单和可视预览确认屏幕覆盖范围；用户没有被要求实现或逐屏填写表格。

## 第 3 步：建立设计 Token

### Agent 自动提取并预填

不要默认向用户索取 token 文件。先从第 2 步的 Figma variables、local styles、组件属性和实际屏幕节点中提取颜色、字体、字号、间距、圆角、阴影与尺寸；再合并此前提供的品牌规范或本地 token 文件。向用户展示已经填入真实值的摘要：

```yaml
sources:
  - figma:variables
  - figma:local-styles
  - figma:confirmed-screens
colors:
  primary: "#2F6BFF"
  surface: "#FFFFFF"
  background: "#F6F7F9"
  textPrimary: "#1F2329"
  danger: "#D92D20"
typography:
  family: '"Inter", "PingFang SC", sans-serif'
  numberFamily: '"Inter", sans-serif'
spacingBase: 4px
radii:
  button: 8px
  card: 12px
confidence: high
unresolved: []
```

上面的值只是结构示例。实际展示必须来自当前来源，并注明哪些值来自 variables、哪些由重复节点统计推断。只有 Figma 未暴露某项且屏幕中也没有稳定模式时，才将该项写成 `unknown` 并向用户索取一个品牌规范来源或一个决定。

### Agent 处理

1. 统计重复值、别名关系和使用场景，自动形成产品语义 token；不要把旧 token 仅改名后继续保留。
2. 在临时位置生成完整 `tokens.css` 草稿，并用它渲染已确认屏幕或 token 色板供用户预览。
3. 展示预填 YAML、来源、推断置信度和视觉预览。用户只需确认或改值。
4. 用户确认后，把唯一 token 来源写入 `profile/design-system/tokens.css`，统一使用第 1 步的产品 token 前缀。
5. 提供共享展示层使用的中性 hook，并让它们引用产品 token：`--brand-accent`、`--brand-accent-hover`、`--brand-accent-text`、`--brand-success`、`--brand-warning`、`--brand-error`、`--brand-selected-bg`、`--phone-screen-bg`、`--chrome-navbar-bg`。不要在 hook 中复制另一套品牌色字面量。
6. 如果第 9 步计划保留微信小程序 Prototype，至少准备 token 生成器需要的语义后缀：`theme-500`、`theme-100`、`theme-600`、`danger-500`、`text-primary`、`text-secondary`、`text-tertiary`、`text-on-theme`、`surface`、`bg`、`divider`、`radius-pill`、`radius-card`、`font-family`。
7. 搜索新模板中的硬编码样式，区分确属单屏例外的值与应当抽取的 token。

### 完成标准

- `profile/design-system/tokens.css` 是唯一品牌 token 来源。
- 文件中没有旧产品前缀或旧品牌值残留。
- 模板需要的 token 均存在，共享 hook 均能解析到产品 token。
- 所有推断值已经得到用户确认。

## 第 4 步：建立组件样式与图标

### Agent 自动提取组件与资源清单

复用已确认的 Figma 屏幕、组件实例、关联组件库和第 2 步导出的资源。先展示 Agent 已经识别并准备实现的清单：

```yaml
components:
  - name: Button
    source: figma:node/10:20
    states: [default, disabled, loading]
  - name: Cell
    source: inferred-from-6-screen-instances
    states: [default, selected]
icons:
  source: figma:confirmed-screens
  discovered: 14
  export: original-vector-or-bitmap
reuseFromScreens: true
externalLibraryAccess: available
unresolvedStates: []
```

上面的值只是结构示例。Agent 必须填入真实组件、状态、节点和资源数量。只有 Figma 指向无权访问的外部组件库且屏幕实例不足以还原时，才向用户索取一个库 URL 或访问权限。

### Agent 处理

1. 从跨屏重复实例和 Figma 组件属性生成 `components.css` 草稿；class 使用产品局部前缀，样式引用第 3 步 token。
2. 只抽取跨多屏重复的组件。只属于单屏的样式留在对应模板中。
3. 导出需要随 skill 运行的原始图标与插图到 `profile/design-system/assets/`，使用稳定语义文件名；不要目测重画，也不要使用 emoji 替代。
4. 自动生成组件状态预览页或截图，让用户检查视觉和状态覆盖；用户不需要审查 CSS。
5. 用户确认后写入组件 CSS 与资源，更新模板路径，删除未被新模板或组件引用的旧产品图标，并检查每个引用真实存在。
6. 没有来源的状态列为未覆盖，不擅自补产品规则。
design-system/assets
### 完成标准

- 组件 CSS、模板 class 和 token 前缀一致。
- 所有图标引用可解析，旧图标已经移除。
- 共用样式与单屏局部样式的归属清晰。
- 已知组件状态和未覆盖状态都有记录。

## 第 5 步：重写产品档案入口

### Agent 自动归纳并生成档案草稿

复用全部已确认屏幕、tokens、组件、Figma 文案、产品规范、内容规范和业务说明。Agent 先归纳来源事实与视觉推断，再展示已经填好的摘要：

```yaml
sources:
  - figma:confirmed-screens
  - /workspace/product-guidelines.md
designLanguage:
  tone: 克制、直接
  references: [原生系统设置页]
  antiReferences: [高饱和促销页]
productLaws:
  - 每屏只有一个主操作
canonicalActions:
  - screen: 首页
    action: 开始
requiredCopy:
  - screen: 确认页
    copy: 协议与费用说明不得删除
terminology:
  - canonical: 账户
    avoid: 钱包
figmaLibrary: none
inferredItems:
  - value: 每屏只有一个主操作
    confidence: high
unresolved: []
```

上面的值只是结构示例。实际摘要必须按来源预填，并把原文事实、跨屏稳定模式和低置信度推断分开。用户只需确认或修正。只有合规、金额、业务状态或强制术语无法从来源确认时，才提出一个最小问题。

### Agent 处理

先在临时位置生成完整 `PROFILE.md` 草稿和来源摘要，向用户展示可读预览；确认后再完整重写 `profile/PROFILE.md`：

1. 写入第 1 步确认的 frontmatter：`product`、`productName`、`platform`、`pageClass`、`tokenPrefix`。
2. 根据第 2 步磁盘实况生成 Screen templates 表；表中每个文件必须存在，每个模板也必须出现在表中。
3. 写清模板路由、基准屏选择规则、设计语言、产品铁律、canonical CTA、组件行为、平台 chrome 用法和单屏样式归属。
4. 只写有来源或已获用户确认的业务规则、必留文案和术语。
5. 为后续可选能力保留准确状态：
   - 第 6 步未完成前，不声称存在知识快照；
   - 第 7 步未完成前，Passes 表保持空白；
   - 第 8 步未完成前，Branches 表保持空白；
   - 不使用的部分写明跳过规则，不引用旧产品文件。
6. 速查表只总结 `profile/design-system/tokens.css` 中已有值，不再创造第二份来源。
7. 使用中文写维护说明，产品原有术语和界面文案按来源保留。

### 完成标准

- frontmatter 五个字段完整且与磁盘一致。
- 模板表与路由覆盖当前 `profile/screens/`。
- 所有产品铁律都有来源或用户确认。
- `PROFILE.md` 不再包含旧产品事实。

## 第 6 步：处理产品知识

### Agent 自动判断是否建立知识快照

先搜索所有已提供产品文档、Figma 标注、组件说明、业务状态和本地结构化规格。若有稳定、可追溯且模板本身表达不完整的产品知识，预填 `create`；否则预填 `skip`。不要让用户自己制作映射或 YAML。

```yaml
mode: create
reason: 产品规范包含跨屏状态机与默认选择规则
sources:
  - /workspace/product-specs/
componentMapping:
  首页: COMP_HOME
  确认页: COMP_CONFIRM
productPatterns: 6
commonPitfalls: 4
structuredSpecs: 2
snapshotDate: 2026-07-27
unresolved: []
```

若没有可信来源，Agent 应展示已经填好的跳过方案，而不是空表：

```yaml
mode: skip
reason: 已检查的来源没有模板之外的稳定业务知识
filesToRemove:
  - profile/knowledge/
```

用户只需确认推荐模式，或提供一个此前未知的产品规格路径。

### Agent 处理

- `mode: create`：
  1. Agent 自行从来源生成屏幕到组件 ID 的映射、产品规律、常见坑点和结构化规格。
  2. 重写 `profile/knowledge/README.md`，明确筛选规则、缺失时的行为和只读约束。
  3. 将稳定快照整理到 `profile/knowledge/`；校验组件 ID、产品代号、来源和映射目标。
  4. 更新 `profile/PROFILE.md` 的产品知识读取说明，并删除无法追溯来源的旧条目。
- `mode: skip`：
  1. 删除旧 cache 和旧映射。
  2. 删除整个 `profile/knowledge/`，或保留一份明确说明“无映射，静默跳过”的最小 `profile/knowledge/README.md`。
  3. 更新 `profile/PROFILE.md`，确保运行流程不会引用不存在的知识文件。

### 完成标准

- 知识目录要么只包含当前产品且映射可解析，要么已经明确清空。
- 运行时说明与实际文件状态一致。
- 不存在外部 git 或运行时同步依赖。

## 第 7 步：处理产品质量规则

### Agent 自动提出可机械执行的规则

从第 5 步已经确认的产品铁律、必留文案、token 和跨屏稳定模式中筛选**可确定性检查**的规则。Agent 自行决定推荐 `mode`、实现规则与测试；用户只预览规则意图和严重级别。

```yaml
mode: create
rules:
  - id: one-primary-action
    source: confirmed-product-law
    severity: error
  - id: required-confirm-copy
    source: confirmed-required-copy
    severity: error
passes:
  - name: Check Details
    source: generated-from-confirmed-rules
tools: []
benchmarkPrompts: skip
unresolved: []
```

没有足够产品规则时预填 `mode: skip` 并列出已检查来源。不要要求用户写规则，也不要为了让目录看起来完整而把视觉偏好伪装成 error。

### Agent 处理

- `mode: create`：
  1. 阅读 `scripts/run-qa-gate.mjs` 的当前 rule-pack 接口，再重写可选的 `profile/quality/rules.mjs`；不要复制旧产品判断后只换名。
  2. 将每个 pass 写到 `profile/quality/passes/`，写清必需输入、执行步骤、无法执行时的处理和完成标准。
  3. 将 pass 所需的确定性工具放到 `profile/quality/tools/` 并实际运行代表性用例。
  4. 只在有真实评估任务时建立 `profile/quality/benchmark/`；删除旧产品 prompts、fixtures 和 runs。
  5. 先向用户展示规则摘要和代表性 pass/fail 结果；确认后按执行顺序更新 `profile/PROFILE.md` 的 Passes 表。
- `mode: skip`：
  1. 删除旧 `profile/quality/`。
  2. 清空 `profile/PROFILE.md` 的 Passes 表和产品 rule-pack 描述。
  3. 不修改通用 QA gate 来迁就缺失的产品规则。

### 完成标准

- 产品规则只表达当前产品事实，并能通过代表性测试。
- Passes 表、文档、工具和磁盘路径一致。
- 跳过时没有旧规则继续拦截新产品页面。

## 第 8 步：处理产品专属分支

### Agent 自动识别定稿后流程

搜索产品规范、交付文档和当前产品工具，判断是否存在只有该产品需要的定稿后流程。共享 Push to Figma 和平台分支不属于这里。先展示已预填决策：

```yaml
mode: create
branches:
  - name: Export handoff
    purpose: 生成当前产品交付包
    source: /workspace/export-process.md
    completionCriterion: 交付包通过清单校验
unresolved: []
```

如果来源没有产品专属流程，预填 `mode: skip` 和删除目标。用户只需确认，或指出一个 Agent 未发现的流程来源。

### Agent 处理

- `mode: create`：
  1. Agent 自行从来源生成完整分支文档，写清适用条件、必需输入、执行步骤和完成标准。
  2. 将文档写入 `profile/branches/<name>.md`，使用相对 `skillDir` 的包内路径。
  3. 不在分支文档里写选项字母；字母由运行时临时分配。
  4. 向用户展示生成后的流程摘要；确认后按展示顺序更新 `profile/PROFILE.md` 的 Branches 表。
- `mode: skip`：
  1. 删除旧 `profile/branches/`。
  2. 删除或清空 `profile/PROFILE.md` 的 Branches 表，不编造占位流程。

### 完成标准

- 表中每个 Doc 路径都存在，每个产品分支都已声明。
- 分支说明满足输入、步骤和完成标准要求。
- 没有旧产品分支残留。

## 第 9 步：处理 Prototype 产品模板

### Agent 自动判断并生成 Prototype

检查当前平台包是否提供 Prototype 分支、已确认屏幕是否足以形成入口流程，以及主来源中是否已有可信实现。若平台支持且素材足够，默认预填 `create`：优先改造用户已有实现；没有实现时由 Agent 从已确认屏幕、tokens 和组件生成，不要求用户提供代码。

```yaml
mode: create
source: generated-from-confirmed-screens
targetPlatform: wechat
entryScreens:
  - 首页
  - 确认页
implementationSource: none
previewRequired: true
unresolved: []
```

如果当前平台没有 Prototype 分支或素材不足，预填 `mode: skip` 并说明原因。用户只需确认推荐模式，或提供一个现有实现路径。

### Agent 处理

- `mode: create`：
  1. 确认当前平台包确实提供 Prototype 分支。
  2. Agent 自行生成或改造当前产品实现，完整替换 `profile/prototype/`；不得保留旧产品组件、页面名、AppID 或资源。
  3. 让模板引用第 3、4 步确定的 token、组件和资源。
  4. 对微信小程序运行 `npm run gen:wxss-tokens`，不要手改生成的 token 区块；再运行平台包提供的静态验证。
  5. 启动可用的模拟器或预览，向用户展示实现结果；根据视觉反馈由 Agent 继续修改，用户不负责实现。
- `mode: skip`：
  1. 删除旧 `profile/prototype/`。
  2. 确认产品档案没有声称该产品拥有 Prototype 实现；平台分支可以存在，但选择后必须能说明缺少产品模板。

### 完成标准

- 保留时，Prototype 只包含当前产品且通过平台静态检查。
- 跳过时，旧产品实现已经删除，说明与磁盘一致。

## 第 10 步：处理研究材料

### Agent 自动分类已有来源

检查已经提供的文件，区分生产事实、产品规范和实验性研究。只有明确属于当前产品且适合随档案分发的研究材料才推荐 `keep` 或 `create`；否则默认 `skip`。

```yaml
mode: create
sources:
  - /workspace/research-note.md
classifiedAs: experimental
runtimeTruth: false
unresolved: []
```

Agent 展示已预填分类和保留理由。用户只需确认或修正分类，不需要整理文件。

### Agent 处理

1. `keep`：逐文件检查产品归属和运行时引用，移除旧产品或不确定材料。
2. `create`：将材料整理到 `profile/research/`，注明来源与日期；不要让实验结论冒充产品铁律。
3. `skip`：删除旧 `profile/research/`。
4. 研究材料默认不被 `PROFILE.md` 当作运行时真相；只有用户确认的稳定结论才回写第 5 步对应章节。

### 完成标准

- `profile/research/` 要么只含当前产品材料，要么不存在。
- 实验记录与运行时规则的边界明确。

## 第 11 步：清理残留并完成验证

### Agent 预填最终审计范围

根据第 1 步旧档案盘点、全部替换记录和仓库规则自动生成审计范围。不要让用户回忆旧前缀或手写检查清单：

```yaml
oldMarkers:
  - 旧产品展示名
  - OLD_CODE
  - old-page
  - --old-
  - old-figma-file-id
additionalChecks:
  - 新产品事实只能位于 profile/
  - 模板表与磁盘双向一致
  - 所有资源为包内路径
confidence: high
unresolved: []
```

上面的值只是结构示例。实际展示必须填入第 1 步记录的旧产品标记、后续发现的域名/AppID/资源名和 `AGENTS.md` 约束。用户只需确认，或补充 Agent 不可能知道的团队内部禁用词。

### Agent 处理

1. 在 `profile/` 内搜索全部旧产品名、代号、class/token 前缀、域名、Figma 文件 ID、AppID 和业务文案；逐项删除或替换。
2. 在 `profile/` 外搜索新产品名、新 class/token 前缀和新产品专属路径，确认没有产品事实泄漏进共享机制或平台包。
3. 检查 `profile/PROFILE.md` 模板表与 `profile/screens/` 双向一致。
4. 检查所有 Markdown 包内路径、HTML `src`/`href`、CSS token、图标和可选表格路径。
5. 在 `skillDir` 运行：

```bash
npm run validate
npm test
```

6. 若保留微信 Prototype，再运行：

```bash
npm run gen:wxss-tokens
node platforms/wechat/prototype/verify-miniprogram.mjs profile/prototype
```

7. 修复所有失败后重新运行对应命令。失败属于哪个步骤就回到该步骤索取准确缺失输入；不得通过放宽通用校验掩盖问题。
8. 输出最终清单：
   - 产品身份与平台；
   - 生产模板数量及基准屏；
   - token、组件和图标状态；
   - knowledge、quality、branches、prototype、research 的保留或跳过状态；
   - 运行过的验证命令与结果；
   - 用户明确接受的未覆盖范围。

### 完成标准

- 旧产品残留搜索为零，或每个命中都有经过确认的保留理由。
- 新产品事实只存在于 `profile/`。
- `npm run validate` 和 `npm test` 均通过。
- 所有可选能力的文档声明与磁盘状态一致。
- 只有满足以上条件后，向用户宣布新产品档案设置完成。
