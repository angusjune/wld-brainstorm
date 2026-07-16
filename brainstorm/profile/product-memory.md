# Product Memory Bridge

How the bundled `brainstorm` skill consumes product knowledge snapshots.

## Where the data lives

The skill reads from two cache directories that ship inside this self-contained package.

**Memory cache** — `profile/pm-memory-cache/` (consumed by the Step 3 injection flow):

| Cache file | Contains | Consumed by |
|---|---|---|
| `profile/pm-memory-cache/product-patterns.yaml` | validated product rules that must hold | brainstorm Step 3 + embedded Simplify Pass |
| `profile/pm-memory-cache/common-pitfalls.yaml` | design gotchas that must be avoided | brainstorm Step 3 + embedded Simplify Pass |

**Spec cache** — `profile/pm-spec-cache/` (bundled reference data, consulted on demand — not part of the core Step 3 flow):

| Cache file | Contains |
|---|---|
| `profile/pm-spec-cache/index.yaml` | global index: `component_name` -> `component_id` -> `spec_path` |
| `profile/pm-spec-cache/components/COMP_WLD_*.yaml` | per-component `state_machine`, `rules`, `ui_contract`, `data_dictionary` |

Only specs with `lifecycle_status: active` or `draft` are cached. `deprecated` and `archived` specs are excluded from the bundle.

Each cache file starts with `# Bundled product knowledge snapshot @ <id> (<date>)` so the packaged version is auditable.

## Why a cache

Agent plugin installs should be self-contained. Bundling the product knowledge snapshot makes each plugin package deterministic and runnable without extra setup.

For **consumers:** nothing to do. The cache is already included.
For **maintainers:** treat the cache as read-only unless explicitly preparing a refreshed local bundle.

## Screen ↔ COMP_ID mapping

| Screen file (in `profile/screens/`) | COMP_ID |
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

If the screen has no COMP_ID yet (mapped to _(not yet in bundled KB)_ above), skip — but tell the user in one line that no bundled product rules cover this screen, so the design relies on the visual template alone. Do not invent patterns or pitfalls to fill the gap.

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

If a product rule contradicts an `profile/screens/` template, **the rule wins**. Templates are visual snapshots; bundled product rules are validated constraints. Flag the conflict before changing the template.

## What NOT to do

- Don't hand-edit `profile/pm-memory-cache/*.yaml` or `profile/pm-spec-cache/**/*.yaml` during normal use.
- Don't paraphrase pattern/pitfall bodies; quote verbatim so the `source` field stays meaningful.
- Don't infer additional rules from the loaded entries; only use what's explicitly stated.
