# 产品档案

`profile/` 是内置默认产品档案，保存某一个产品的设计 token、组件样式、生产模板、产品规则、业务知识和确定性工具。共享机制不读取其他产品来源，也不会把内置档案与工作区档案混用。

项目自定义档案由同级 `setup-profile` Skill 写入项目根目录的 `wld-design-profile/`。该目录存在时，运行时优先选中它；本目录仍保持为显式 `--use-bundled-profile` 的完整后备档案。

## 目录地图

```text
profile/
├── PROFILE.md                  # 档案入口、模板路由、产品规则、passes 与分支表
├── screens/                    # 生产页面模板语料
├── design-system/              # tokens、组件样式和图标
├── knowledge/                  # 可选的产品知识说明与只读快照
└── quality/
    ├── workflow-contracts.json # 每个模板的权威知识文件与硬性不变量
    ├── rules.mjs               # 可选产品 QA 规则
    ├── passes/                 # 产品生成 pass
    └── tools/                  # pass 使用的确定性工具
```

## 完整替换档案

不要在旧档案上只替换产品名。按以下顺序完整审计：

1. 重写 `PROFILE.md` frontmatter：`product`、`productName`、`platform`、`pageClass`、`tokenPrefix`。
2. 替换 `screens/`，并保证模板表与磁盘文件一一对应。
3. 替换 `design-system/tokens.css`、`components.css` 和产品图标。
4. 为每个模板更新 `quality/workflow-contracts.json`，声明精确上下文、必需文案、必需资源、品牌锚点和方案差异锚点。
5. 重写或删除不属于新产品的 `knowledge/`、`quality/rules.mjs`、passes 和 tools。
6. 如需产品专属定稿后流程，将文档放入 `profile/branches/`，并在 `PROFILE.md` 的 Branches 表中声明；没有分支时不保留空目录。

## 关键约定

- `design-system/tokens.css` 是唯一 token 来源。
- 每个模板根节点必须真实使用 frontmatter 声明的 `pageClass`。
- 模板引用静态资源时使用 `/profile/`、`/platform/`、`/assets/` 挂载路径。
- `workflow-contracts.json` 的模板清单必须与 `screens/` 一一对应。
- `authorityFiles` 只声明当前模板生成时确实需要遵循的产品知识文件；缺失文件会阻断 stage preparation，页面模板不得放入该字段。
- `screens/` 中的完整生产页面语料会由 workflow 自动作为只读设计参考提供给 authoring worker；参考页的业务文案、数值和动作不会自动成为当前任务约束。
- `quality/rules.mjs` 只写当前产品规则；通用检查属于 `scripts/run-qa-gate.mjs`。
- 产品事实只存在于档案内。共享 `SKILL.md`、`scripts/`、`assets/` 和 `platforms/` 保持产品中立。

## 验证

在 `skills/brainstorm/` 目录运行：

```bash
bun run validate
bun run test
```

涉及模板、生成契约、passes 或规则时，还要通过真实 preview workflow 检查浏览器截图。
