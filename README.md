# CTF Methodology Trainer

CTF Methodology Trainer is a local-first cybersecurity training companion. It turns machine writeups into hidden knowledge and guides learners through a structured, evidence-driven penetration-testing methodology without revealing solutions prematurely.

Current repository state covers Stage 01 project foundation only. App Shell and application routes are not implemented yet.

## Technology foundation

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- pnpm

PostgreSQL, Drizzle ORM, Zod, and Gemini integration belong to later stages.

## Requirements

- Node.js 20 or newer
- pnpm version declared in `package.json`

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
