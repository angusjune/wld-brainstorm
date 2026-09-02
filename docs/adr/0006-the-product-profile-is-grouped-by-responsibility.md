# The product profile is grouped by responsibility

We organize `skills/brainstorm/profile/` by the responsibility and lifecycle of its contents:

- `screens/` is the production screen corpus and stays at the profile root because it is the primary authoring input and the most frequently read directory.
- `design-system/` owns tokens, reusable component styles, and icons.
- `knowledge/` owns the optional knowledge bridge plus its read-only memory cache.
- `quality/` owns workflow contracts, the optional product rule pack, passes, and deterministic tools.

The root keeps only the profile entry documents and high-value corpora. Runtime selection remains outside the profile contents at the one fixed workspace seam.

## Rejected alternatives

We rejected keeping every file at the profile root. That layout mixed design assets, read-only snapshots, executable rules, evaluation history, and production templates in one undifferentiated list.

We rejected merging `tokens.css` and `components.css`. Tokens have independent machine consumers in validation and workflow preparation, while component styles are the HTML implementation that consumes them.
