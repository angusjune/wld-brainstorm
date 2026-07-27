# Branches live with their owning layer

A Step 6 branch belongs to the narrowest layer whose facts it needs:

- universal branches live in `references/branches/`;
- product-specific branches live in `profile/branches/` and are declared by the optional Branches table in `profile/PROFILE.md`;
- platform-specific branches live in `platforms/<platform>/branches/`.

The method assembles the offered list from the always-available Feedback path, shared branches, profile table rows in table order, and the active platform pack's branch documents. It assigns display letters only when presenting the list and loads only the branch the user selects.

This ownership keeps reusable procedures shared while allowing a forking product team to add or remove its own branches by editing only `profile/`. It also prevents product facts from leaking into shared branch documents and platform assumptions from leaking into the product profile.

## Discovery conventions

Profile branches use an explicit table because their display name, order, and short description are product-owned editorial choices. Platform branch documents are discovered from the active pack's `branches/` directory in filename order, with display names derived from filename stems. Shared branches remain explicit in the method because they are part of every copy's universal workflow.

We rejected moving every branch into the profile. That would make universal procedures appear product-owned, duplicate them across forks, and weaken the three-layer boundary. We also rejected hard-coded display letters: contributions can change the list length, so letters are presentation details rather than stable branch identities.
