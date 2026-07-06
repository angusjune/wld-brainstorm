# Brainstorm is the publishable skill directory

We decided `plugins/wld-design/skills/brainstorm/` is the publishable skill directory: it must contain its root `SKILL.md` plus every runtime file that `SKILL.md` references, so it can be uploaded on its own. The trade-off is deliberate duplication from shared assets and sibling workflows into `brainstorm/`, while the local bundle keeps its existing multi-skill plugin structure for development and provider compatibility.
