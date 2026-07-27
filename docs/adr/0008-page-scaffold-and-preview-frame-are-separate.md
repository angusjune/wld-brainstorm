# Page scaffold and preview frame are separate

Every generated screen starts from one canonical HTML scaffold at
`brainstorm/assets/page-template.html`. The scaffold owns the document
structure, product design-system links, frame containers, and insertion markers
for screen content and local styles. `SKILL.md` tells the agent to copy this
file instead of duplicating its markup inline.

Preview-only presentation styles live separately at
`brainstorm/assets/frame.css`. The preview server links that stylesheet into
served pages together with its other runtime helpers. Generated files do not
copy or link the stylesheet themselves.

This places the authoring interface and preview implementation at different
seams. The scaffold is inspectable and reusable by the agent, while frame
styling can change without rewriting generated files. The publish validator
checks both assets and their responsibilities so the contract cannot silently
drift.

We rejected keeping a complete HTML document around a `<style>` block and
having the server extract only that block. The unused document shell looked
canonical but was ignored at runtime. We also rejected having the server inject
the entire document shell: complete generated HTML remains easier to inspect,
run through the QA gate, benchmark, and reuse outside the preview response.
