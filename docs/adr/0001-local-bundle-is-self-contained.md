# Local bundle is self-contained

We decided the Brainstorm skill must describe itself as a self-contained local bundle, not as something synchronized at runtime with external product repositories. The trade-off is that maintainers refresh bundled product knowledge deliberately, while users receive all files required to run the skill.

This decision stands within the current multi-skill plugin: `skills/brainstorm/` remains independently publishable, while `skills/setup-profile/` provides the optional authoring workflow for a workspace profile. Neither runtime path downloads or merges product knowledge.
