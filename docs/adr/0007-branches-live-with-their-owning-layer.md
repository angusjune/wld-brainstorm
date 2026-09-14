# Branches live with their owning layer

A Step 5 product branch lives in `profile/branches/` and is declared by the optional Branches table in `profile/PROFILE.md`. Feedback remains part of the shared method.

The method assembles the offered list from the always-available Feedback path and profile table rows in table order. It assigns display letters only when presenting the list and loads only the branch the user selects.

This ownership allows a product team to add or remove its own branches by editing only its profile, while keeping product facts out of the shared method.

## Discovery conventions

Profile branches use an explicit table because their display name, order, and short description are product-owned editorial choices.

We rejected hard-coded display letters: contributions can change the list length, so letters are presentation details rather than stable branch identities.
