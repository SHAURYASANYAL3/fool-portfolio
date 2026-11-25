# One-Prompt AI Portfolio Setup

Copy everything inside the prompt block below, paste your personal information (resume, LinkedIn, bio, projects, links) at the bottom, and send it to any AI coding assistant (Antigravity, Claude Code, Cursor, Windsurf, etc.).

---

## Prompt to Copy

```text
Personalize this portfolio template using my information below. Keep the exact same website design, layout, animations, and functionality — only replace the personal data and assets.

Follow these steps:
1. Read `portfolio.config.json` to see the exact schema.
2. Replace everything in `portfolio.config.json` with my details:
   - `identity`: my `name`, `barTitle` (uppercase), `terminalUser` (lowercase handle), `domain`, `tagline` (short 3-6 words), `github` username, and `storagePrefix`.
   - `about`: my `bio` and optional `extra` line (e.g. location or role).
   - `links`: my Email, GitHub, LinkedIn, X/Twitter, Blog, etc.
   - `work`: my work experience / roles / internships.
   - `projects`: my main projects (and mark older/smaller ones with `"more": true` so they appear under `more/`). If I have screenshots, reference them in `shots`; otherwise leave `shots: []`.
   - `talks`: my talks/events (or `[]` if none).
3. Run `node scripts/build-data.mjs` to sync my identity into `index.html`, `site/index.html`, `favicon.svg`, `glimpse.js`, `site/terminal.js`, `site/editor.js`, and regenerate `site/content.json`.
   - If `gh` CLI is installed and authenticated for my GitHub account, run `node scripts/build-data.mjs --fetch-github` instead so my real GitHub contribution calendar, language stack, and code wall are baked in.
   - If `gh` is not available for my account, update `github-snapshot.json`, `site/months.json`, and `site/stack.json` with my GitHub username and tech stack.
4. Start `python3 serve.py` and verify both `http://localhost:8767/` and `http://localhost:8767/site/` load cleanly with no console errors and show my personalized info.

Here is my information:
[PASTE YOUR RESUME / BIO / GITHUB USERNAME / LINKS / PROJECTS / WORK EXPERIENCE HERE]
```
