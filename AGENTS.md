# Repo guide

This repo is for developing `wld-brainstorm` plugin.

## Project structure

- `./skills/brainstorm`: the self-contained publishable Brainstorm skill directory
  - `profile/`: the product profile — the only directory a forking team rewrites
  - `platforms/`: platform packs selected by the active profile
  - everything else: shared machinery, which never names a product or platform
- `./skills/setup-profile`: the product-profile setup and maintenance skill
- `./skills/wtf`: the concise re-explanation skill
- `./site`: an Astro 7 site introducing the plugin and its three skills
- `./scripts`: repo dev tooling, outside the publishable skill
  - `npm run screens:dev` — previews `skills/brainstorm/profile/screens/` with live reload, for editing the corpus by hand

## Iron laws

- **Use Chinese on user-facing copy**: use Chinese in @site, `skills/brainstorm/README.md`, `skills/brainstorm/profile/README.md`, etc.
- **Shared machinery is product-neutral**: nothing outside `profile/` may name a product; nothing outside `profile/` and `platforms/` may assume a platform

## ADRs and glossary

@CONTEXT.md
@docs/adr/
