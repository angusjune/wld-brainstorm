# Local bundle is self-contained

We decided this package must describe itself as a self-contained local bundle, not as something installed from or synchronized with public source-control infrastructure. The trade-off is that maintainers lose the convenience of documenting refresh commands in the public bundle, but users see only the packaged skill and the bundled product knowledge required to run it.

This decision stands, and ADR 0003 strengthens it: the skill is distributed by copying the directory, so there is no upstream to sync with by construction. The original text mentioned "packaged skills" (plural) and "generated provider adapters"; both describe a multi-skill plugin structure that no longer exists (flattened in `e150252`).
