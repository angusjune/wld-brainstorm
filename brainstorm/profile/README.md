# 产品档案（Product Profile）

这个目录装着**只属于某一个产品的东西**：设计 token、组件样式、生产模板、产品规则、业务知识快照。

其他目录（`assets/`、`scripts/`）是通用机制，不认识任何产品。平台相关的东西（微信预览外壳、小程序工具链）属于平台包，也跟产品无关。

**换一个产品 = 重写这个目录，别的地方基本不用动。**

---

## 目录地图

```text
profile/
├── PROFILE.md          # 产品档案入口：配置、模板路由、设计语言、产品铁律
├── branches/           # 可选的产品专属 Step 6 分支文档
├── screens/            # 生产页面模板语料，生成质量的主要来源
├── design-system/      # tokens、组件样式和图标
├── knowledge/          # 可选的产品知识桥接说明与只读快照
├── quality/            # 可选的规则、passes、确定性工具和质量基准数据
├── prototype/          # 可选的 Prototype 产品实现模板
├── research/           # 可选的当前产品研究记录
└── README.md           # 换产品与维护说明
```

目录按职责分组，不按文件格式分组。`screens/` 保持在根层，因为它是最常被读取、也最影响输出质量的语料；其余可选能力各自收进一个目录。

---

## 换产品要做什么

按重要性排序。前两项决定输出质量，后面的可以边用边补。

| 顺序 | 文件 | 要做什么 |
|------|------|----------|
| 1 | `screens/` | **最重要**。换成你自己产品的生产界面模板。模型是「照着模板改」，不是「凭空生成」，所以这批模板直接决定输出质量。 |
| 2 | `design-system/tokens.css` | 换成你的色板、字体、间距、圆角。这是**唯一的 token 来源**，别处不要再抄一份。 |
| 3 | `PROFILE.md` | 重写模板表、路由表、产品铁律、设计语言、速查表，frontmatter 改成你的字段（见下）。agent 读正文，脚本读 frontmatter，都是这一份。 |
| 4 | `design-system/components.css`、`design-system/icons/` | 换成你的组件样式和图标。组件样式可以先留空壳，等重复够多了再抽出来。 |
| 5 | `branches/` | **可选**。产品专属的定稿后流程；每个 Markdown 文档都要在 `PROFILE.md` 的 Branches 表中声明。 |
| 6 | `quality/` | **可选**。维护当前产品的 QA 规则、passes、确定性工具和基准数据；不用的部分直接删除。 |
| 7 | `knowledge/` | **可选**。产品状态机、业务规律、历史坑点；不用知识快照时清空映射并删除 cache。 |
| 8 | `prototype/` | 只有要用 Prototype 分支的产品实现模板时才需要。不用就删掉整个目录。 |
| 9 | `research/` | **可选**。只保留你自己产品的实验记录；换产品时删除或重写，避免把旧产品结论带进新档案。 |

改完跑一遍：

```bash
npm run validate   # 检查模板表和磁盘是否一致、有没有引用到不存在的文件
npm test           # 运行 QA、会话遥测、WXSS token 和质量基准等全部自测
```

---

## `PROFILE.md` frontmatter 字段

脚本（`scripts/serve-preview.cjs`、`scripts/run-qa-gate.mjs`、`npm run validate`、站点构建）读的机器配置，就是 `PROFILE.md` 头部 `---` 之间的几行：

| 字段 | 说明 |
|------|------|
| `product` | 产品短代号，用于产品知识快照的过滤（`knowledge/*-cache/` 里按这个字段筛条目） |
| `productName` | 产品全名，用于展示 |
| `platform` | 平台包的名字，决定预览外壳。目前是 `wechat` |
| `pageClass` | 包住每一屏的那个 class。`qa-gate` 靠它判断「这一屏是照模板做的，不是凭空编的」 |
| `tokenPrefix` | `design-system/tokens.css` 的自定义属性前缀，不带前导 `--`；小程序 token 生成器用它定位语义 token |

路径都是约定死的：`design-system/tokens.css`、`design-system/components.css`、`screens/`、`quality/rules.mjs`（可选，存在即加载），不用配置。

---

## `PROFILE.md` 的 Branches 表

产品专属的 Step 6 流程放在 `branches/`，再在 `PROFILE.md` 中用可选表格声明：

```markdown
| Branch | Doc | Notes |
|--------|-----|-------|
| Export handoff | `profile/branches/export-handoff.md` | 生成当前产品的交付包。 |
```

- `Branch` 是展示名称，`Doc` 是相对 `brainstorm/` 根目录的文档路径，`Notes` 是选择时给用户看的简述。
- 每份分支文档至少写清适用条件、必需输入、执行步骤和完成标准；文档里的路径都相对 `brainstorm/` 根目录。
- 表格顺序就是 Step 6 的展示顺序；选项字母由 `SKILL.md` 在展示时临时分配，不要写进分支文档。
- 没有产品分支时，让表保持空白或删除整张表，并删除 `branches/`。不要为了占位编造流程。
- 增删产品分支只改 `profile/`；共享 Push to Figma 和平台分支由各自目录负责。
- `npm run validate` 会检查 Branches 表中用反引号标出的 `Doc` 路径，也会检查现有分支文档里的包内路径。

---

## 两条容易踩的线

**class 前缀是这个 profile 自己的。** `wld-` 只是微粒贷的前缀，不是全局约定。通用机制里没有任何地方写死它，所以你换成 `acme-` 不会有别的东西跟着坏。

**token 只有一个来源，就是 `design-system/tokens.css`。** 小程序的 `app.wxss` 里那段 token 是**生成**出来的，不要手改。历史上这里手抄过一份，结果金色抄成了两个值（`#FFD143` 和 `#ffcd00`），这就是为什么现在要生成。
