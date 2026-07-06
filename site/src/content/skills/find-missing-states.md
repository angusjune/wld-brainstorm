---
name: find-missing-states
tagline: 改版交付前，找出漏画的状态
stage: 质检
order: 5
prompt: /find-missing-states 我在改输入金额页，这是我的 Figma：[URL] 我还漏了哪些状态？
deps: [Figma MCP]
---

## 适用情况

正在做某个已知页面的改版，想在交付前确认有没有漏画该页面应有的状态（空态、加载、错误、各种浮层、首借/非首借变体…）。

## Prompt 示例

- `/find-missing-states 我在改输入金额页，这是我的 Figma：https://figma.com/design/xxxx 我还漏了哪些状态？`
- `/find-missing-states 欢迎页改版完成了，对照下 spec 还缺什么`

## Agent 会做什么

1. 从页面中文名解析出组件 ID，读取缓存 Spec 的 `state_machine` 全量状态清单
2. 过滤出该组件的易错点（PIT-XXX）
3. 用 Figma MCP 读所有 frame
4. 分 4 桶归类：**Matched / Divergent / Missing / New**
5. 跑 PIT 检查，输出结构化报告，附可执行的 next actions

## 依赖项

Figma MCP。没有时会显式降级到「Spec-Only Walkthrough」模式，而不是静默产出误导的假 diff。
