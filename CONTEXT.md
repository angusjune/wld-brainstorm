# WLD Design Local Bundle

This context describes the self-contained local distribution of the WLD Design plugin and the words maintainers should use when documenting it.

## Language

**Local Bundle**:
A self-contained copy of the WLD Design plugin. It includes the runtime skills, shared assets, generated provider manifests, and bundled product knowledge needed to install and evaluate the plugin locally.
_Avoid_: Fork, repo copy, public repository, remote package

**Bundled Product Knowledge Snapshot**:
The product rules and structured specs packaged under `plugins/wld-design/assets/pm-*-cache/`. It is treated as a read-only local artifact unless a maintainer intentionally prepares a refreshed bundle.
_Avoid_: Submodule, upstream PM repository, external knowledge base

**Provider Package**:
A generated adapter directory for a supported agent runtime, such as Claude, Codex, Cursor, or opencode. It points back to the canonical skills and assets in this bundle.
_Avoid_: Distribution repo, marketplace source
