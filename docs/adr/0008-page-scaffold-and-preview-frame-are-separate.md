# Page scaffold and preview frame are separate

Every generated screen is assembled from one canonical HTML scaffold at
`brainstorm/assets/page-template.html`. The scaffold owns the document
structure, product design-system links, frame containers, and insertion markers
for screen content and local styles. Only `scripts/workflow.mjs assemble` reads
and fills this file; authoring workers edit prepared fragments rather than the scaffold or assembled output.

Preview-only presentation styles live separately at
`brainstorm/assets/frame.css`. The preview server links that stylesheet into
served pages together with its other runtime helpers. Generated files do not
copy or link the stylesheet themselves.

This places the authoring interface and preview implementation at different
seams. The scaffold is a deterministic assembly input, while frame
styling can change without rewriting generated files. The publish validator
checks both assets and their responsibilities so the contract cannot silently
drift.

We rejected direct worker edits to complete screen documents because they bypass
source hashing, fragment ownership, and deterministic validation. Complete generated
HTML remains inspectable and reusable, but assembly is its only writer.
