---
name: setup-profile
description: Manages the WLD design workspace profile. Use when the user wants to initialize it from the bundled profile, add HTML screen templates from supplied design sources, or edit templates or other files already in the workspace profile. Also use when Brainstorm needs a workspace profile before customization.
---

# Setup Profile

Resolve this skill directory as `setupSkillDir`, the current project root as `workspaceDir`, and the sibling Brainstorm skill as `brainstormSkillDir = setupSkillDir/../brainstorm`. The workspace profile always lives at `workspaceDir/wld-design-profile`.

Choose exactly one branch from the user's request. If user runs the skill with no other prompt, choose **Copy profile** branch:

- **Copy profile** — create the workspace profile from Brainstorm's bundled profile.
- **Add templates** — add one or more supplied designs to the workspace profile. This branch first creates the workspace profile when it is absent.
- **Edit profile files** — modify existing templates or other files in the workspace profile. This branch first creates the workspace profile when it is absent.

An existing workspace profile may be incomplete. Treat the copy script's `incomplete` status as diagnostics, not automatic failure: inspect the files that do exist and continue whenever the requested branch can still meet its completion criterion. Do not silently mix bundled files into the workspace profile.

Only when a reported gap makes the current task impossible, offer the user these choices:

1. Use Brainstorm's bundled profile for now by starting its server with `--use-bundled-profile`; leave the workspace untouched.
2. Fix the workspace profile first. If the user chooses this, run the copy command with `--repair`; it copies only missing required entries from the bundled profile and never overwrites existing entries. Then run `brainstormSkillDir/scripts/validate-skill.mjs --profile "<workspaceDir>/wld-design-profile"` and use its findings to finish the non-destructive repair. If a path has the wrong type or cannot be repaired safely, report the exact path and ask the user to correct or move it.

## Copy profile

Run:

```bash
node "<setupSkillDir>/scripts/copy-bundled-profile.mjs" \
  --workspace "<workspaceDir>" \
  --json
```

The script preserves an existing workspace profile. It reports `incomplete` plus exact issues when required entries are absent or have the wrong type. Continue with available content unless those issues block the user's requested outcome.

**Completion criterion:** the command reports `created`, `existing`, `repaired`, or `incomplete`; no existing profile content was overwritten; and any task-blocking issue has been resolved by the user's chosen bundled or repair path.

## Add templates

First run the copy command above. Read [`references/add-templates.md`](references/add-templates.md) completely and execute its source-to-template workflow for every design the user requested. If the command reports `incomplete`, use the available workspace files and source evidence first; invoke the choice above only when a missing or invalid entry prevents the template from being created, registered, validated, or previewed.

**Completion criterion:** every requested screen has a confirmed HTML template under `wld-design-profile/screens/`; its local assets resolve; `PROFILE.md` lists and routes it; `quality/workflow-contracts.json` declares its exact invariants; profile validation and the QA gate pass; and the user has reviewed the rendered result.

## Edit templates or other profile files

First run the copy command above. Resolve every requested target inside `<workspaceDir>/wld-design-profile`, then read each target completely before editing it. Also inspect the profile files that define or consume the target:

- For a screen template, read `PROFILE.md`, `quality/workflow-contracts.json`, the active design-system styles, referenced local assets, and any related templates needed to preserve established patterns. Treat `brandIdentitySelectors` as required identity anchors, not frozen visual implementations.
- For a shared file such as `PROFILE.md`, a token, component, asset, quality pass, or platform file, search the workspace profile for every reference and inspect each affected consumer.

Apply the requested changes only to the workspace profile and preserve unrelated content. Keep the bundled profile untouched. When a change adds, renames, or removes a screen, asset, token, class, rule, or route, update every affected workspace-profile reference in the same edit.

Run the workspace profile validator after all edits:

```bash
node "<brainstormSkillDir>/scripts/validate-skill.mjs" \
  --profile "<workspaceDir>/wld-design-profile"
```

For every changed or affected HTML template, also run the QA gate:

```bash
node "<brainstormSkillDir>/scripts/run-qa-gate.mjs" \
  --profile "<workspaceDir>/wld-design-profile" \
  "<workspaceDir>/wld-design-profile/screens/<template>.html"
```

Then start `brainstormSkillDir/scripts/serve-preview.cjs --project-dir "<workspaceDir>" --run-label "<change-purpose>-profile-preview"`, where `<change-purpose>` is a short lowercase kebab-case description of the requested change. Use the returned `runDir` with `brainstormSkillDir/scripts/workflow.mjs prepare --stage profile-preview --kind screen --template "<template>.html" --output "preview.html:1"`, replace its caption placeholder in the prepared content fragment, assemble, and validate. Inspect the returned screenshot for the requested change and regressions; apply corrections to the workspace template, recreate the preview run, and repeat until checks pass.

**Completion criterion:** the requested workspace-profile files contain the change; every affected reference and consumer remains consistent; profile validation and every applicable template QA check pass; and every visual change has been verified in the rendered preview.
