---
name: brainstorm
tagline: 澄清想法 → 3 个方案 → 实时预览
stage: 发散
order: 1
prompt: /brainstorm 帮我设计一个微粒贷的新用户引导页，首次打开时推荐借款额度
deps: []
demo: screens
demoScreens: [欢迎页, 输入金额]
---

## 适用情况

脑中有一个想法，或已有设计稿想看看有没有更多可能性，想快速看到 3 个不同方向的实现。

## Prompt 示例

- `/brainstorm 帮我设计一个微粒贷的新用户引导页，首次打开时推荐借款额度`
- `/brainstorm 我想给"提前还清"页面加一个分期选择，你先给我三个方案`
- `/brainstorm 基于这个设计多出几个不同的方案：https://figma.com/design/xxxx`

## Agent 会做什么

1. 一次一个问题地澄清意图（核心动作 / 几屏 / 要展示哪些数据）
2. 读取最匹配的生产模版作为基础
3. 以 HTML 生成多个方案
4. 自动调用 `/simplify` 清理
5. 告诉你在浏览器打开以浏览方案

## 依赖项

无 — 自带热更新预览服务器。
