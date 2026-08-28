# MoFF

## Cursor Cloud specific instructions

This repo is set up for Cursor Cloud Agents.

- Work on a feature branch. Do not commit directly to `main`.
- Do not commit secrets. Put credentials in Cursor Cloud Agent secrets, not in `.env` files.
- After you add an app stack, put install/test commands in `.cursor/environment.json` (`install`, `start`, or `terminals`) so future cloud runs can build and verify without extra setup.
- When the project has tests or a runnable app, run them before opening a pull request.
