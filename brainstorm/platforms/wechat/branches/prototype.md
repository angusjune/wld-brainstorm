# Prototype

A branch contributed by the `wechat` platform pack: it builds a WeChat Mini Program, so it only exists when the profile targets this platform. `SKILL.md` offers it at Step 6 because this pack ships it in `branches/`.

All paths are relative to the `brainstorm/` skill directory.

Use when the user selects this branch at Step 6.

Required input: an approved brainstorm screen/flow. If the user only has a text idea or external design source, return to Step 1 and generate/approve a brainstorm design first.

**WeChat DevTools driver (optional):** when the `wechatide` CLI is installed, drive WeChat DevTools directly — open the demo project, compile it, screenshot the running screens, and push a real-device preview — by following `platforms/wechat/prototype/references/miniprogram-dev-skill/SKILL.md`. That bundled skill-pack runs its own login/environment check (`check_devtools_status`) and routes each job to the right scene (initializer / compiler / automator / previewer). Treat it as a strict enhancement: if `wechatide` is missing, say so and degrade to the bundled scripts and manual steps below — never block the demo on it.

**Mini Program pitfalls:**
- No `100vh` inside the profile's page-shell component — use `height:100%`. The shell already owns viewport height, nav offset, safe-area padding, and scrolling; `100vh` overflows it and can clip bottom CTAs. (`verify-miniprogram.mjs` warns on this.)
- Don't draw the status bar or 胶囊 capsule (`··· ⊙`) — it is system chrome WeChat renders itself, and a hand-drawn copy sits under the real one. Set the title through the page-shell component and its props from `profile/prototype/template`. A brainstorm source draws a fake status bar + capsule (`<preview-chrome>`, expanded from the platform pack) — that is presentation chrome: reproduce only the title and drop the rest.

Workflow:

1. Confirm source, flow order, states, interactions, and copy. Ask only for missing decisions that affect implementation.
2. Read the design language in `profile/PROFILE.md`, the closest production templates in `profile/screens/`, and these template anchors from `profile/prototype/template`: `app.json`, `app.js`, `app.wxss`, `project.config.json`, `pages/prototype-home/`, `pages/prototype-loan-input/`, and relevant components.
3. Create a separate demo project named `brainstorm-miniprogram-demo-{slug}` under the current working directory unless the user gives another output path.
4. Copy the bundled Mini Program template into that demo project. Do not edit the bundled template, generated provider folders, product knowledge caches, or `node_modules`.
5. Implement real Mini Program files: `.wxml`, `.wxss`, `.js`, `.json`, `app.json`, `app.wxss`, and `project.config.json`. Use Mini Program components and APIs, not browser HTML/DOM code.
6. Match the approved design: hierarchy, spacing, typography, profile-defined primary actions, backgrounds, nav, safe area, bottom actions, sheets, keyboard states, empty/error/loading states, and clickable path with mocked local data.
7. Run `node platforms/wechat/prototype/verify-miniprogram.mjs <demo-project-dir>` and fix every static error until it passes. Report optional live-check warnings plainly. When the `wechatide` driver is available, prefer it as the live-verify channel — opening the project window through it is itself a real compile and needs no per-project `miniprogram-automator` install.
8. If WeChat DevTools is available and visual fidelity matters, follow `platforms/wechat/prototype/conform-design.md` for capture, reference rendering, comparison, and correction. When driving DevTools through the `wechatide` driver, the automator scene's screenshot is an equivalent source for the `.conform/impl/` frames.
9. Get the demo onto a phone. If the `wechatide` driver is available, push the preview yourself: confirm login via `check_devtools_status`, then use the previewer scene's `auto_preview` (sends the demo straight to the logged-in developer's WeChat, no QR scan) or `create_preview_qrcode`, and report exactly what you pushed and what the PM must still do. Otherwise finish with Chinese PM-facing phone-preview steps: open WeChat DevTools, import the project folder, choose test AppID if needed, compile, preview, scan with WeChat, and test on the phone.
