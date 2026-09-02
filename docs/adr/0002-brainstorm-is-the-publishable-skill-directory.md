# Brainstorm is the publishable skill directory

We decided `skills/brainstorm/` is the self-contained publishable Brainstorm skill directory: it must contain its root `SKILL.md` plus every runtime file that `SKILL.md` references, so it can be uploaded on its own. The trade-off is deliberate duplication when a runtime dependency would otherwise live outside the skill.

The repository may package sibling skills and provider manifests around it, but Brainstorm does not depend on those siblings at runtime. Repository tooling and the site stay outside the publishable directory.

A consequence that outlived the original framing: because the directory must run standalone after being copied, anything a forked copy needs must live inside it. That rules out generating `SKILL.md` from a template kept outside the skill — see ADR 0003.
