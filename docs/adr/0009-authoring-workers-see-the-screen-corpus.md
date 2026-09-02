# Authoring workers see the screen corpus

An authoring worker receives the active product profile's complete production
screen corpus as read-only design evidence. Its write scope remains limited to
the prepared fragments for one workflow stage.

The context manifest assigns every source a role:

- the primary template is content authority for `rework` and the closest design
  reference for `compose`;
- product knowledge, product laws, tokens, components, and selected handoffs are
  authoritative sources;
- every other production template is a design reference;
- the worker brief is the instruction entrypoint.

Design references are precedent rather than requirements. Workers may borrow,
combine, or adapt their composition, hierarchy, spacing, interaction, and
component patterns. Reference-screen copy, values, assets, and actions do not
become task invariants unless the user intent or an authoritative source
independently requires them. Validation continues to enforce only the active
stage's declared invariants; it does not judge similarity to reference screens
or prescribe which patterns a solution must use.

Profile workflow contracts therefore use `authorityFiles` only for task-specific
product knowledge. Screen templates are discovered automatically and cannot be
declared as authorities. All context sources are hashed so a stage cannot silently
change after preparation. Deterministic promotion remains compact and does not
load the corpus because it dispatches no authoring worker.

This places the seam between content authority and design awareness, rather than
between the current page and the rest of the app. It preserves stage-local facts
and edit ownership while giving the worker the same app-wide pattern vocabulary a
human designer would consult.

We rejected limiting a worker to one template. Tokens and shared component CSS do
not contain every proven composition, so that approach forces avoidable invention
and conflicts with the screen corpus being the profile's main quality source.

We rejected treating the entire corpus as authority because unrelated business
content would contaminate the task. We also rejected manual secondary-template
configuration: the corpus is small, already canonical, and should be available
without parent-side curation. Context reporting separates bytes and files by role
so a future profile can justify a different selection implementation without
changing the worker interface.
