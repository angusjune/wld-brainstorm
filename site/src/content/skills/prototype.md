---
name: prototype
tagline: 设计稿 → 高保真微信小程序 demo
stage: 交付
order: 2
prompt: /prototype 这是输入金额页的新流程 Figma：[URL]，帮我做成微信小程序 demo
deps: [微信开发者工具]
---

## 适用情况

已经有 Figma 页面 / 流程，或已经用 `/brainstorm` 做出了满意方案，想把它变成可以在微信开发者工具和手机微信里预览的高保真小程序 demo。

## Prompt 示例

- `/prototype 这是输入金额页的新流程 Figma：[URL]，帮我做成微信小程序 demo`
- `/prototype 把刚才 brainstorm 选中的方案 B 做成小程序 demo`

## Agent 会做什么

1. 确认你已经提供 Figma 或 `/brainstorm` 生成的设计
2. 读取插件自带的小程序模板作为实现参考
3. 新建一个独立的小程序 demo 项目
4. 用真实 `.wxml` / `.wxss` / `.js` / `.json` 文件还原页面和点击流程
5. 用内置校验器自动检查 demo
6. （可选）把每屏截图和设计稿对比并修改，反复对到两边一致
7. 告诉你怎么在微信开发者工具里导入、编译、预览，用手机微信扫码查看

## 依赖项

需先安装微信开发者工具。第 6 步自动对稿需额外配置（服务端口 + Chrome + miniprogram-automator）。
