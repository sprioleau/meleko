<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Coding style

- Prefix boolean names with a verb such as `is`, `should`, `will`, or `has`.
- Declare named functions with the `function` keyword. Use arrow functions inline for anonymous callbacks.
- Use multiline block syntax for regular comments. Reserve JSDoc for tooling that requires it.
- Use Vitest for load-bearing behavior tests. Prefer accessible queries and use test IDs when an accessible query is unavailable.
