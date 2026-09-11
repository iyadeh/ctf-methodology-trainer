# CTF Methodology Trainer

CTF Methodology Trainer is a local-first cybersecurity training companion. It turns machine writeups into hidden knowledge and guides learners through a structured, evidence-driven penetration-testing methodology without revealing solutions prematurely.

Current repository state includes application UI and local database infrastructure. Domain schema and persistence are not implemented yet.

## Technology foundation

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL 17 through Docker Compose
- Drizzle ORM
- pnpm

Zod and Gemini integration belong to later stages.

## Requirements

- Node.js 20 or newer
- pnpm version declared in `package.json`
- Docker Desktop with Docker Compose

Enable pnpm through Corepack if needed:

```bash
corepack enable
```

## Development

Install dependencies:

```bash
pnpm install
```

Start development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database development

Copy `.env.example` to `.env.local`, then start PostgreSQL:

```bash
pnpm db:up
```

Verify the connection:

```bash
pnpm db:check
```

Stop PostgreSQL without deleting its named volume:

```bash
pnpm db:down
```

Next.js continues to run directly on Windows with `pnpm dev`.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Project documentation

- [`docs/PRD.md`](docs/PRD.md): product source of truth
- [`docs/frontend.md`](docs/frontend.md): frontend source of truth
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): technical architecture

Development must preserve server-side hidden knowledge, deterministic methodology rules, and schema-driven frontend rendering.
