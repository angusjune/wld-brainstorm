# wld-brainstorm

## 2.1.0

### Minor Changes

- Ground three-solution diversity in a declared archetype catalog instead of prose.
  
  `references/archetypes.json` defines ten solution archetypes on two axes — `focus`
  (what dominates the screen) and `commitment` (where the primary action sits) — chosen
  because they were the only axes that separated the bundled profile's 13-screen corpus.
  Each archetype carries the structural `moves` that produce it, not just a name.
  
  `prepare` gains `--diversity-mode` and `--archetype`, assigns one archetype per option,
  and enforces the diversity rule before any authoring starts: every ux archetype takes a
  distinct `focus`, and the set carries at least two distinct `commitment` values. The
  assignment reaches the worker through `worker-brief.md` and is checked back through a
  new `archetype` field on each caption, so an option cannot drift from its direction.
  
  In `rework`, an archetype the template already is gets excluded, read from the new
  optional `baselineAxes` in the profile's `workflow-contracts.json`. Because a visual
  archetype inherits both axes and the declared rule cannot separate it from a ux option,
  `validate` now measures each rendered screen's layout signature and blocks a visual
  option that reads identically to a ux option.
  
  A profile may extend the catalog with `profile/quality/archetypes.json`, merged by id.

## 2.0.0

### Major Changes

- 精简 Brainstorm 工作流和产品档案：移除产品知识快照与废弃的多阶段生成路径，收紧上下文契约，并复用共享运行时模块。

## 1.2.1

### Patch Changes

- Fix wrong display name and skill icon

## 1.2.0

### Minor Changes

- Publish as a plugin
