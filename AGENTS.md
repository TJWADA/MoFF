# MoFF

## Cursor Cloud specific instructions

This repo is set up for Cursor Cloud Agents.

- Work on a feature branch. Do not commit directly to `main`.
- Do not commit secrets. Put credentials in Cursor Cloud Agent secrets, not in `.env` files.
- After you add an app stack, put install/test commands in `.cursor/environment.json` (`install`, `start`, or `terminals`) so future cloud runs can build and verify without extra setup.
- When the project has tests or a runnable app, run them before opening a pull request.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
