# 🛡️ CTF Methodology Trainer

<p align="center">
  <strong>A local-first, evidence-driven cybersecurity training companion that turns CTF writeups into hidden machine knowledge and guides learners through a structured penetration-testing methodology — without premature spoilers.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat-square&logo=postgresql" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Gemini_API-Structured_Output-4285F4?style=flat-square&logo=google" alt="Gemini API" />
  <img src="https://img.shields.io/badge/Methodology-PTES_Canonical-22c55e?style=flat-square" alt="PTES" />
</p>

---

## 💡 The Problem & The Vision

When tackling Capture The Flag (CTF) machines or lab environments (Hack The Box, TryHackMe, Proving Grounds), learners often hit a wall. When they turn to walkthrough writeups, **disaster strikes**:

- **Accidental Spoilers**: A single glance reveals the exact exploit, CVE, or credential string.
- **The "Illusion of Competence"**: The learner copies the command, gets the flag, but learns *nothing* about the systematic enumeration process that discovered the vulnerability in the first place.
- **Random Guessing (Shotgun Pentesting)**: Without structured discipline, learners spray uncalibrated exploits instead of validating hypotheses with evidence.

**CTF Methodology Trainer fixes this permanently.**

The application ingests writeups, extracts structured machine knowledge, and stores the solution as an **internal server-side answer key (Attack Graph)**. It then guides the player through the standard **PTES (Penetration Testing Execution Standard)** methodology. 

Checklist items and playbooks only unlock when the learner **confirms real evidence**. AI assists with progressive hints without spoiling the machine, and the full canonical attack path is only revealed once the machine is completed.

> **Core Invariant**:  
> *Method Before Exploit • Evidence Before Action • Guidance Without Spoilers*

---

## 📸 Visual Tour

### 1. Interactive PTES Training Workspace & Dual Modes
The primary practice cockpit. Learners choose between **Guided Mode** (step-by-step milestone questions and answer verification) and **Adventure Mode** (pure PTES exploration), navigating through 6 PTES phases with clear phase gates, interactive retrospective phase inspection, reversible checklist checks, dynamic service-specific playbooks, evidence capture, hypothesis reasoning with AI auto-drafting, and an AI mentor bound by a monotonic spoiler penalty system (Levels 0–6).

![Training Workspace](docs/images/03-training-workspace.png)

---

### 2. Training Session Catalog & Lifecycle Management
Manage multiple training sessions with live progress bars, phase indicators, machine metadata (Linux/Windows, Easy/Medium/Hard, target IP), session renaming, progress reset, and cascading hard deletion.

![Training Sessions Browser](docs/images/01-sessions-browser.png)

---

### 3. Server-Side Writeup Ingestion & Pipeline Orchestration
Upload machine writeups in PDF, Markdown, or TXT formats. The system parses, normalizes whitespace, extracts technical facts (open ports, software versions, vulnerabilities, flags) via Google Gemini, and builds a dependency-checked directed attack graph.

![Writeup Upload & Parsing](docs/images/02-new-training-upload.png)

---

### 4. Post-Completion Evaluation & Objective Review
The complete reference attack chain remains strictly confidential on the server until the session objective is verified. Upon capture, the verified path is revealed step-by-step alongside deterministic review metrics comparing the user's path to the canonical path.

![Session Review](docs/images/04-session-review.png)

---

### 5. Built-in Knowledge Base & Playbook Registry
Explore comprehensive protocol playbooks and penetration-testing references directly within the app. Reuses identical playbook definitions powering the live methodology engine.

![Knowledge Base](docs/images/05-knowledge-base.png)

---

### 6. Workstation Preferences & AI Configuration
Configure custom Gemini API keys securely on the server, select reasoning models (Flash vs. Pro), test provider connectivity in real time, and toggle UI density (`Compact` vs. `Comfortable`).

![Settings Panel](docs/images/06-settings-configuration.png)

---

## 🧠 Core Mental Model & Architecture

```text
Writeup Target (.pdf / .md / .txt)
       ↓
Server-Side Hidden Attack Graph (Answer Key)
       ↓
PTES Canonical Methodology (6 Ordered Phases)
       ↓
User Evidence (Observed → Confirmed Finding)
       ↓
Canonical Context Normalizer (Tags & Protocol Aliases)
       ↓
Dynamic Checklist Engine (Playbook Resolver + Snapshots)
       ↓
Reasoning Loop: Finding → Hypothesis → Attempt → Result
       ↓
Guidance Engine (Spoiler Levels 0–6 + Redaction)
       ↓
Session Completion (Objective Evidence Verification)
       ↓
Session Review (Deterministic Scoring + Reference Path Reveal)
```

### Architectural Guarantees:
1. **Server-Side Hidden Knowledge**: Attack graphs, reference steps, credentials, and flags are never sent to client components or accessible via DOM/localStorage prior to completion.
2. **Deterministic Authority**: AI suggests, but application logic decides. The AI never completes checklist items, changes phases, or overrides phase gates.
3. **Graceful Degradation**: Core methodology, built-in playbooks, reasoning capture, and progress metrics operate **100% offline and locally** even if Gemini API quota is exhausted or disconnected.
4. **Stable Snapshots**: Activated checklists are snapshotted per session. Global playbook updates never mutate historical training sessions.
5. **Schema-Driven UI**: Universal components render any machine and any service protocol without writing machine-specific or protocol-specific frontend components.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) | Modern React Server Components, Server Actions, zero-latency local navigation |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) | End-to-end type safety, domain modeling, zero `any` tolerance |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Dark, technical, restrained, high-density terminal-grade aesthetic |
| **Database** | [PostgreSQL 16/17](https://www.postgresql.org/) (Docker Compose) | Reliable relational persistence, cascading integrity, transactional workflows |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | Lightweight, type-safe SQL queries and schema migrations |
| **Validation** | [Zod v4](https://zod.dev/) | Strict schema validation at all trust boundaries (forms, routes, AI outputs) |
| **AI Engine** | [Google Gemini API](https://ai.google.dev/) (`@google/genai`) | Structured fact extraction, attack graph modeling, contextual progressive hints |
| **Document Parser** | `unpdf` | Robust in-memory PDF parsing and text normalization |
| **Testing** | [Vitest](https://vitest.dev/) | Ultra-fast unit testing & full end-to-end reliability suites (175+ tests) |
| **Package Manager**| [pnpm](https://pnpm.io/) | Fast, deterministic, disk-efficient package management |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **pnpm**: v9.x or newer (`corepack enable pnpm`)
- **Docker & Docker Compose**: For local PostgreSQL

### 2. Clone and Install
```bash
git clone https://github.com/prayoga/ctf-methodology-trainer.git
cd ctf-methodology-trainer
pnpm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ctf_trainer

# Google Gemini API Key (Server-Side Only)
GEMINI_API_KEY=AIzaSy...
```

### 4. Database Setup
Start the local PostgreSQL container and run migrations:
```bash
# Start Docker database
pnpm db:up

# Verify database connection
pnpm db:check

# Run migrations
pnpm db:migrate
```

### 5. Launch Development Server
```bash
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Verification & Quality Checks

The repository maintains an exhaustive suite of deterministic unit, integration, and end-to-end acceptance tests.

```bash
# Run unit tests across core modules
pnpm test

# Run reliability & end-to-end acceptance tests
pnpm test:reliability

# Run TypeScript typecheck
pnpm typecheck

# Run ESLint
pnpm lint

# Run Next.js production build
pnpm build
```

---

## 🔒 Security & Ethical Principles

- **Local-First Practice**: CTF Methodology Trainer is an educational methodology companion. It **does not execute automated attacks** or connect to remote target machines.
- **Server Boundary**: All secret writeup information stays on your local machine and server-side runtime. No data is sent to external third parties except for AI prompt processing when configured.
- **No Spoilers by Design**: The platform is built to cultivate disciplined penetration testers who understand *why* an attack vector works, rather than memorizing exploit scripts.

---

## 📄 Documentation

For deep technical specifications, design system guides, and architecture invariants:
- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document & Invariants
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Modular Monolith Architecture & Schema Specification
- [`docs/frontend.md`](docs/frontend.md) — Design System & Frontend Guidelines

---
