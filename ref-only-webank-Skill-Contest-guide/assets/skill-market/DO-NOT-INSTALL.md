# 仅供检测参考，请勿安装

这份 skill-market 副本是 **Mobot 专用版**，打包在引导技能里只有一个用途：

- 让引导员知道 skill-market 长什么样（目录名、frontmatter 里的 name），便于检测用户是否已安装它，从而判断用户环境是不是 Mobot。

**不要把它安装给任何用户：**

- Mobot 用户出厂已内置 skill-market，无需再装
- 非 Mobot 用户（WorkBuddy / Claude Code / Codex / Halo）装了也无法正常工作——它内部按 `CLAUDE_USER_WORKSPACE` 反推 MobotAgentService 项目根的路径逻辑只在 Mobot 上成立。非 Mobot 用户请走官方指引页安装市场 CLI：http://api.wfaas.weoa.com/fc-a399-skill-market-guide/
