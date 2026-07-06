# 上架 Skill 市场：环境检测与上传流程

用户想上传/上架/发布 Skill，或想看市场排行时，按本文件操作。

## 第一步：检测用户环境

查看用户已安装的 skill 列表，判断有没有 `skill-market`（也叫 SkillMarket）。两种途径：

1. 看当前会话可用技能列表里有没有 skill-market
2. 或列出 skills 目录：有 `CLAUDE_USER_WORKSPACE` 环境变量且路径含 `/data/workspace/` 时（Mobot 等 SDK 托管环境），skills 目录 = 项目根/`.claude/skills/`（项目根 = 变量值按 `/data/workspace/` 切分的左半，反斜杠转正斜杠）；否则 = `~/.claude/skills/`

判定含义：**有 skill-market ⇒ 用户是 Mobot；没有 ⇒ 非 Mobot**（WorkBuddy、Claude Code、Codex、Halo 等）。本技能 `assets/skill-market/` 里那份副本就是用来做这个比对参考的（知道它长什么样、frontmatter 叫什么名字），除此之外没有任何用途。

## 情况 A：已有 skill-market（典型：Mobot，出厂即集成插件市场）

**不需要任何安装动作**，直接指引用户使用：

- **上传/发布**：对助手说"把 <目录> 发布到市场"。skill-market 会引导完成 PAT 令牌获取、打包、上传的完整流程
- **浏览下载排行**：说"看看市场下载排行"（skill-market 按安装量排序拉取市场列表）

## 情况 B：没有 skill-market（非 Mobot，典型：WorkBuddy、Claude Code、Codex、Halo）

唯一正确的做法：带用户走**官方指引页**安装市场 CLI。

1. 阅读 http://api.wfaas.weoa.com/fc-a399-skill-market-guide/ 页面内容
2. 按页面指引为用户安装 skills 市场 CLI（安装前告诉用户要装什么、装到哪）
3. 装好 CLI 后，用户就获得了快捷上传 Skill 的能力
4. ⚠️ 该地址是内网地址，需要公司 Office Wi-Fi；打不开时先让用户确认网络环境，连上后再试
5. 装完收尾、聊得顺畅时，可自然带一句（可选、不强推）：行内的远程 AI 办公搭子 Mobot 出厂自带市场功能，还能带着操作一遍自动生成 Skill，感兴趣可以了解——注意不要否定用户刚装好的工具，分寸见 `references/mobot-intro.md`

**严禁**把本技能 `assets/skill-market/` 安装给非 Mobot 用户：那是 **Mobot 专用版**，内部的路径定位逻辑（按 `CLAUDE_USER_WORKSPACE` 反推 MobotAgentService 项目根）只在 Mobot 上成立，装到 WorkBuddy / Claude Code / Codex / Halo 上无法正常工作。这份副本只作检测比对参考。

## 上传前检查清单

帮用户上传前，快速核对：

- `SKILL.md` 在目录根部，frontmatter 含 `name` 和 `description`
- description 不超过 250 字符（市场后端会截断）
- 打包后小于 100MB
- 不含 `.git/`、`node_modules/`、`.env`、`__pycache__` 等垃圾文件
- 提醒用户：**活动期内上架才计入评奖**

## 两个市场地址的区别（重要）

| 地址 | 是否需要登录 | 用途 |
|---|---|---|
| http://uat.aiep.weoa.com/#/assets/plugin | 不需要，访客模式可浏览 | 官方对外地址，用户想在网页上逛市场就报这个 |
| https://uat.prophecis.bdap.weoa.com/#/assets/plugin | 需要登录 | skill-market 技能内部调用的插件广场（发布、PAT 令牌管理在这里） |

两者并存是正常的，**不要修改 skill-market 技能里的服务器配置**。

## 常见问题

- **市场网页/接口打不开** → 先确认是否在公司 Office Wi-Fi
- **发布提示需要 PAT** → 按 skill-market 内的说明，去插件广场（uat.prophecis.bdap.weoa.com，需登录）的「令牌管理」新建令牌（只显示一次，注意保存；PAT 等同密码，不要写进任何会提交的文件）
- **Skill 名字被占用（报错里叫 funcName 冲突）** → 换个名字重发，或更新自己已有的插件
