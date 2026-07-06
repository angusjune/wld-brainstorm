---
name: beyblade-battle
tagline: 界面变陀螺，最后还在转的方案赢
stage: 彩蛋
order: 7
prompt: 用这几个 Figma 界面来一场爆旋陀螺大战
deps: [Figma MCP]
demo: arena
---

## 适用情况

想看看哪个方案更能打。把 2–7 个 Figma 界面变成以截图为皮肤的战斗陀螺，在本地竞技场里刚体碎裂混战。

## Prompt 示例

- `用这几个 Figma 界面来一场爆旋陀螺大战：[URL]`

## Agent 会做什么

1. 通过 Figma MCP 逐帧拉取界面（结构 + 截图）
2. 浏览器端从截图推导陀螺属性
3. 运行刚体碎裂模拟，最后一个还完整旋转的界面获胜

## 依赖项

Figma MCP。
