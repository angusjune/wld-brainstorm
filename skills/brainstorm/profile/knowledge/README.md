# 内置产品知识快照

本目录保存随产品档案发布的只读知识。模板只通过 `profile/quality/workflow-contracts.json` 的 `authorityFiles` 获取任务确实需要遵循的文件；未声明的知识不会进入 worker 上下文。生产页面语料由 workflow 另行作为只读设计参考提供，不属于权威知识。

## 当前文件

| 文件 | 内容 |
|---|---|
| `profile/knowledge/memory-cache/product-patterns.yaml` | 已确认的产品规则 |
| `profile/knowledge/memory-cache/common-pitfalls.yaml` | 需要规避的产品体验问题 |

## 屏幕映射

| 模板 | COMP_ID |
|---|---|
| `输入金额.html` | `COMP_WLD_LOAN_AMOUNT` |

`输入金额.html` 的 workflow contract 同时声明本说明和两份 memory cache，因此 `compose` 与 `rework` 都读取相同的知识上下文。其他模板尚未声明产品知识时，仅使用生产模板、设计系统和产品规则。

## 过滤规则

只使用同时满足以下条件的条目：

- patterns 的 `product` 为 `WLD`；pitfalls 视为当前 WLD 档案内容。
- `source` 引用当前模板映射的 COMP_ID。
- `applicable_agents` 包含 `kb_generation`、`req_doc` 或 `test_case` 中至少一个。

将命中的原文作为背景约束，不扩写未声明的业务规则。若知识与生产模板冲突，以知识规则为准，并向用户指出冲突。

正常 brainstorm 运行只读这些文件。刷新快照属于档案维护任务，并需同步更新 workflow contract 与本页映射。
