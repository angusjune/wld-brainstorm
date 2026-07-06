# WLD Design Local Bundle

This context describes the self-contained local distribution of the WLD Design plugin and the words maintainers should use when documenting it.

## Language

**Bundled Product Knowledge Snapshot**:
The product rules and structured specs packaged under `brainstorm/assets/pm-*-cache/`. It is treated as a read-only local artifact unless a maintainer intentionally prepares a refreshed bundle.
_Avoid_: Submodule, upstream PM repository, external knowledge base

**Publishable Skill Directory**:
A single self-contained skill directory with a root `SKILL.md` and every runtime file it references, suitable to upload on its own. For this bundle, `brainstorm/` is the publishable skill directory.
_Avoid_: Wrapper skill, plugin package, provider package

**Embedded Workflow**:
A sub-workflow packaged inside the publishable skill directory so the skill can run follow-up passes and branches without depending on sibling skills.
_Avoid_: Merged workflow, external workflow
