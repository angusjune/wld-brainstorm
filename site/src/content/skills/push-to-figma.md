---
name: push-to-figma
tagline: 确认的方案 → 可编辑 Figma 稿
stage: 交付
order: 3
prompt: /push-to-figma 把刚才 brainstorm 选中的方案 B 画到这个 Figma 页面：[URL]
deps: [Figma MCP]
---

## 适用情况

已经用 `/brainstorm` 确认了某个方案，想把它转成可编辑的 Figma 页面，供设计师继续调整。

## Prompt 示例

- `/push-to-figma 把刚才 brainstorm 选中的方案 B 画到这个 Figma 页面：https://figma.com/design/xxxx`
- `/push-to-figma 这个 .wld-brainstorm 目录里的借款流程已经确认了，推到我的 Figma 页面：[URL]`

## Agent 会做什么

1. 确认你提供了已确认的 brainstorm 输出和目标 Figma 页面链接
2. 优先连接本地 Figma desktop MCP（更容易保留 PingFang SC 等本地字体）
3. 读取 WLD 组件库，尽量用已有 Figma 组件实例来搭页面
4. 每个屏幕 / 状态创建一个可编辑 Figma frame
5. 对比源稿和 Figma 截图，修明显的层级、间距、字体和按钮状态问题
6. 汇报创建的 frame、使用的 MCP 类型，以及哪些元素只能用基础图层绘制

## 依赖项

Figma MCP（优先本地 desktop MCP）。
