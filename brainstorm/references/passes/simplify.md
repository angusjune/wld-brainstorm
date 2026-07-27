# Simplify Pass

Run after every generated `solutions.html` and after every flow screen.

All paths are relative to the `brainstorm/` skill directory.

Completion criterion: the file keeps all required product facts and legal/rate copy, has one clear primary action per screen, and contains no removable copy, decoration, or duplicate element that does not help the user complete the task.

1. Read the generated HTML.
2. Read `profile/knowledge/README.md` and load matching pitfalls from `profile/knowledge/memory-cache/common-pitfalls.yaml` when the screen has a COMP_ID. Treat loaded rules as must-keep product constraints.
3. Remove or merge anything that fails these checks:
   - The user does not need it to complete the task.
   - The text says something already obvious from nearby UI.
   - It competes with the one focal action or one focal number.
   - It is decorative rather than functional.
   - It can merge cleanly with an adjacent label, value, or row.
4. Never remove product rules, legal/compliance text, error states, navigation, selected user data, status indicators, tap targets, or the primary CTA.
5. Re-read the result and make sure the HTML still follows the production template's CTA form, background color, chrome, and tab bar rules.
