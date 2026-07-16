# Brainstorm is the publishable skill directory

We decided `brainstorm/` is the publishable skill directory: it must contain its root `SKILL.md` plus every runtime file that `SKILL.md` references, so it can be uploaded on its own. The trade-off is deliberate duplication from shared assets and sibling workflows into `brainstorm/`, rather than depending on sibling skills.

This decision stands. Two facts in the original text went stale and have been corrected here: the directory was `plugins/wld-design/skills/brainstorm/` when this was written, and the repo then kept a multi-skill plugin structure around it. The repo was flattened in `e150252`; there is now no plugin wrapper and no provider adapters.

A consequence that outlived the original framing: because the directory must run standalone after being copied, anything a forked copy needs must live inside it. That rules out generating `SKILL.md` from a template kept outside the skill — see ADR 0003.
