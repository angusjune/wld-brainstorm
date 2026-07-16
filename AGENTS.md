# Repo guide

This repo is for developing `brainstorm` skill.

## Project structure

- `./brainstorm`: the publishable skill directory
  - `profile/`: the product profile — the only directory a forking team rewrites
  - `platforms/`: platform packs (`wechat`, `ios`)
  - everything else: shared machinery, which never names a product or platform
- `./site`: an Astro 7 site introducing `brainstorm` skill

## Iron laws

- **External git is forbidden**: don't use external git (git submodule, published on GitHub, etc.)
- **Use Chinese on user-facing copy**: use Chinese in @site, `brainstorm/README.md`, `brainstorm/profile/README.md`, etc.
- **Shared machinery is product-neutral**: nothing outside `profile/` may name a product; nothing outside `profile/` and `platforms/` may assume a platform

## ADRs and glossary

@CONTEXT.md
@docs/adr/
