# Repository Guidelines

## Project Overview

**ginTest** is a T3-stack full-stack application built with Next.js 15, tRPC 11, Drizzle ORM, and Tailwind CSS 4. It uses SQLite (via `@libsql/client`) as the database and Zod for validation. NextAuth.js was intentionally removed; there is no authentication layer.

All source code lives under `src/`. The project uses a mixed routing approach: the tRPC handler is served through Pages Router (`src/pages/api/trpc/[trpc].ts`), while application pages can use either App Router (`src/app/`) or Pages Router (`src/pages/`).

## Project Structure

```
src/
  app/                    # App Router directory (reserved for future pages)
  pages/
    _app.tsx               # App root with tRPC provider
    index.tsx              # Landing page
    api/trpc/[trpc].ts     # tRPC HTTP handler
  server/
    api/
      root.ts              # tRPC router registry
      trpc.ts              # tRPC init, context, procedures
      routers/post.ts      # Post router (example)
    db/
      index.ts             # DB client (libsql + drizzle)
      schema.ts            # Drizzle table definitions
  styles/globals.css       # Tailwind CSS v4 entry
  utils/api.ts             # tRPC client helpers
  env.js                   # Environment variable validation
```

New tRPC routers go in `src/server/api/routers/` and must be registered in `root.ts`. New Drizzle schema tables use the `createTable` helper with the `ginTest_` prefix.

## Build, Test & Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbo) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking only |
| `npm run db:push` | Push schema to the database |
| `npm run db:generate` | Generate SQL migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Launch Drizzle Studio (GUI) |

There is no test framework configured yet. Before submitting code, always run `npm run typecheck` to verify there are no type errors.

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces, no tabs.
- **Language**: TypeScript with strict mode and `verbatimModuleSyntax`.
- **Naming**:
  - Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for pages/components.
  - Variables/functions: `camelCase`.
  - Types/interfaces: `PascalCase`.
  - Exported components: `PascalCase`.
  - Drizzle table names: snake_case (e.g., `ginTest_post`).
- **Imports**: Path alias `~/*` maps to `./src/*`. Use `import type` for type-only imports.
- **Formatting**: No automated formatter is configured. Keep manual formatting consistent with existing code.
- **Comments**: Write them only when the code is not self-explanatory. Remove dead code rather than commenting it out.

## Commit & Pull Request Guidelines

No standard convention has been established yet. General expectations:

- Use clear, imperative Git commit messages that describe what changed and why.
- Keep commits focused on a single concern.
- For pull requests, include a description of the change, motivation, and any relevant context.

## Configuration & Security Notes

- Environment variables are validated at runtime by `src/env.js`. All new variables must be added there and to `.env.example`.
- The `.env` file is gitignored. Secrets are never committed.
- Database connection is configured in `drizzle.config.ts` and reads from `DATABASE_URL`.
- Use `SKIP_ENV_VALIDATION=1` to bypass env checks during Docker builds or CI.

## Agent-Specific Instructions

This repository uses three Markdown files for agent context persistence:

1. **`CLAUDE.md`** — Project steering guide with coding preferences, tech stack, and behavioral rules. Read first on every session start.
2. **`project-context.md`** — Live project state snapshot: key decisions, progress, and pending work. Updated manually at milestone boundaries.
3. **`AGENTS.md` (this file)** — Contributor-facing repository guidelines covering structure, commands, conventions, and onboarding.

**Session startup protocol**: At the start of every new session, the agent MUST read all three Markdown files (CLAUDE.md, project-context.md, and AGENTS.md) before responding, and confirm they have been loaded in the first message.
