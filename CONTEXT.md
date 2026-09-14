# Brainstorm Skill

This context describes the `brainstorm` skill: a self-contained design brainstorm workflow that ships with one product's design system in it, and is adopted by other teams by copying and editing.

## Language

### Distribution

**Fork**:
The way another team adopts this skill — copying the publishable skill directory once and editing it into their own, with no upstream, shared repository, or configuration between the two copies.
_Avoid_: Install, onboard, configure, tenant, instance

**Publishable Skill Directory**:
A single self-contained skill directory with a root `SKILL.md` and every runtime file it references, suitable to upload on its own. For this plugin, `skills/brainstorm/` is the publishable Brainstorm skill directory.
_Avoid_: Wrapper skill, plugin package, provider package

### Layers

**Product Profile**:
The single selected directory holding everything specific to one product — its tokens, component styles, screen corpus, product rules, workflow contracts, passes, and deterministic tools. Runtime uses the fixed project-root `wld-design-profile/` seam when it exists, otherwise the bundled `skills/brainstorm/profile/`; one run never mixes them.
_Avoid_: Theme, tenant, config, plugin, preset, brand pack

**Platform Pack**:
The preview furniture belonging to a surface rather than a product — its chrome and that chrome's variant vocabulary. Reusable across every product on that surface.
_Avoid_: Adapter, driver, target, renderer

**Shared Machinery**:
The parts that vary by nothing: the method in `SKILL.md`, the preview server, the QA engine, and the presentation frame. It never names a product or a platform.
_Avoid_: Core, framework, engine, runtime

**Page Scaffold**:
The canonical complete HTML document read only by the deterministic workflow assembler. It owns
the stable document shell, product design-system links, and insertion markers,
but no preview-only styles or runtime helpers.
_Avoid_: Frame template, example page

**Preview Frame**:
The presentation-only reset, page frame, phone mockup, and gallery styles linked
by the preview server. Generated screens use its class vocabulary but do not
copy or link its stylesheet themselves.
_Avoid_: Page template, product design system

### Workflow extension

**Pass**:
A step run inline during solution and flow generation, before anything is shown to the user. Simplify is the one shared pass; a product profile may contribute its own.
_Avoid_: Embedded workflow, filter, post-process, hook

**Branch**:
A path the user may choose after approving a design direction: continue Feedback or follow a product-specific workflow declared by the profile.
_Avoid_: Embedded workflow, mode, plugin, exporter

### Design evidence

**Screen Corpus**:
The production screen templates a profile ships. It is the ground truth the model copies from rather than inventing against, and it is what most determines output quality.
Every authoring worker receives the active corpus as read-only design evidence; stage-local authorities decide which facts and invariants apply to the current task.
_Avoid_: Examples, samples, fixtures, mockups
