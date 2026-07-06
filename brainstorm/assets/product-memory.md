# Product Memory Bridge

How `wld-design` skills consume bundled product knowledge snapshots.

## Where the data lives

Skills read from two cache directories that ship with this plugin version.

**Memory cache** — `assets/pm-memory-cache/`:

| Cache file | Contains | Used by |
|---|---|---|
| `assets/pm-memory-cache/product-patterns.yaml` | validated product rules that must hold | brainstorm, simplify, find-missing-states |
| `assets/pm-memory-cache/common-pitfalls.yaml` | design gotchas that must be avoided | brainstorm, simplify, find-missing-states |

**Spec cache** — `assets/pm-spec-cache/`:

| Cache file | Contains | Used by |
|---|---|---|
| `assets/pm-spec-cache/index.yaml` | global index: `component_name` -> `component_id` -> `spec_path` | find-missing-states |
| `assets/pm-spec-cache/components/COMP_WLD_*.yaml` | per-component `state_machine`, `rules`, `ui_contract`, `data_dictionary` | find-missing-states |

Only specs with `lifecycle_status: active` or `draft` are cached. `deprecated` and `archived` specs are excluded from the bundle.

Each cache file starts with `# Bundled product knowledge snapshot @ <id> (<date>)` so the packaged version is auditable.

## Why a cache

Agent plugin installs should be self-contained. Bundling the product knowledge snapshot makes each plugin package deterministic and runnable without extra setup.

For **consumers:** nothing to do. The cache is already included.
For **maintainers:** treat the cache as read-only unless explicitly preparing a refreshed local bundle.

## Screen ↔ COMP_ID mapping

| Screen file (in `assets/screens/`) | COMP_ID |
|---|---|
| `输入金额.html` | `COMP_WLD_LOAN_AMOUNT` |
| `个人中心.html` | _(not yet in bundled KB)_ |
| `个人中心-有借款.html` | _(not yet in bundled KB)_ |
| `个人中心-双offer.html` | _(not yet in bundled KB)_ |
| `个人中心-单offer.html` | _(not yet in bundled KB)_ |
| `提前还清.html` | _(not yet in bundled KB)_ |
| `本期应还.html` | _(not yet in bundled KB)_ |

When a new `COMP_WLD_*` entry is included in the bundled snapshot, append a row here.

## Filter rule

For a given screen, an entry is relevant when **all** of:

- `product == "WLD"` for patterns; pitfalls are not product-tagged, so treat all as WLD.
- the entry's `source` field references the screen's COMP_ID.
- `applicable_agents` includes at least one of `kb_generation`, `req_doc`, `test_case`; these three are treated as design-relevant.

If the screen has no COMP_ID yet, skip. There is nothing to load.

If the cache file is missing, skip with a one-line note that bundled product rules could not be loaded.

## Injection format

Read the cache YAML fresh each task. Quote loaded entries verbatim under labelled headers as background context before generating or reviewing:

```text
【Product rules — bundled memory】
- PAT-WLD-001 (confidence: high): <pattern body, verbatim>
- PAT-WLD-002 (confidence: high): <pattern body, verbatim>

【Pitfalls to avoid — bundled memory】
- PIT-001 (stage: <stage>): <description, verbatim>
  Detection: <detection, verbatim>
  Correction: <correction, verbatim>
```

## Conflict resolution

If a product rule contradicts an `assets/screens/` template, **the rule wins**. Templates are visual snapshots; bundled product rules are validated constraints. Flag the conflict before changing the template.

## What NOT to do

- Don't hand-edit `assets/pm-memory-cache/*.yaml` or `assets/pm-spec-cache/**/*.yaml` during normal use.
- Don't paraphrase pattern/pitfall bodies; quote verbatim so the `source` field stays meaningful.
- Don't infer additional rules from the loaded entries; only use what's explicitly stated.
