# Architecture
# CTF Methodology Trainer

**Version:** 0.1  
**Status:** MVP Technical Architecture  
**Purpose:** Technical source of truth for implementing the CTF Methodology Trainer described in `docs/PRD.md` and `docs/frontend.md`.

---

# 1. Architecture Goals

The architecture must support the product goals without introducing unnecessary complexity.

Primary goals:

- Local-first web application.
- Single-user MVP.
- Dynamic, schema-driven frontend.
- Deterministic PTES methodology engine.
- Machine-specific knowledge generated from uploaded writeups.
- Hidden solution data kept server-side.
- Spoiler-safe checklist activation.
- Dynamic service playbooks.
- Generic fallback for unknown services.
- AI-generated contextual extensions without allowing AI to control application state.
- Reliable session persistence.
- Explainable and deterministic progress/review metrics.
- Graceful degradation when Gemini is unavailable.
- Simple enough to build and maintain with Next.js as a monolith.

Non-goals for MVP:

- Microservices.
- Redis.
- Kafka.
- Kubernetes.
- Vector database.
- Separate frontend/backend repositories.
- Multi-user authentication.
- Real-time collaboration.
- VM orchestration.
- Automated exploitation.

---

# 2. High-Level Architecture

```text
                         USER
                          │
                          ▼
                ┌──────────────────┐
                │     Browser      │
                │   Next.js UI     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   Next.js App    │
                │ Server Boundary  │
                └────────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Methodology  │ │ Session      │ │ AI Pipeline  │
│ Engine       │ │ Services     │ │ Gemini       │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └──────────┬─────┴───────┬────────┘
                  │             │
                  ▼             ▼
           ┌──────────────┐  ┌──────────────┐
           │ PostgreSQL   │  │ File Storage │
           │ Drizzle ORM  │  │ local-first  │
           └──────────────┘  └──────────────┘
```

The application is a **modular monolith**.

Next.js handles:

- frontend;
- server rendering;
- route handlers;
- server-side application logic;
- database access;
- Gemini API calls.

The application should not introduce a separate Express/Fastify backend during MVP.

---

# 3. Technology Stack

## 3.1 Application

- Next.js
- App Router
- TypeScript

## 3.2 UI

- React
- Tailwind CSS
- shadcn/ui

## 3.3 Database

- PostgreSQL
- Drizzle ORM
- Drizzle migrations

## 3.4 Validation

- Zod

## 3.5 AI

- Gemini Developer API
- server-side only

## 3.6 Package Manager

- pnpm

## 3.7 Testing

Recommended:

- Vitest for domain/unit tests
- React Testing Library where useful
- Playwright for critical end-to-end flows

Testing should be introduced when the relevant domain exists rather than scaffolded excessively in advance.

---

# 4. Architectural Style

Use a layered modular monolith.

```text
UI / Route Layer
       │
       ▼
Application Services
       │
       ▼
Domain Logic
       │
       ▼
Repositories / Infrastructure
       │
       ▼
PostgreSQL / Gemini / File System
```

Responsibilities must remain separate.

## UI Layer

Responsible for:

- rendering;
- user interaction;
- forms;
- visual state;
- loading/error/empty states.

Must not contain machine-specific methodology logic.

## Application Layer

Responsible for use cases:

- create training;
- confirm finding;
- compose session checklist;
- move phase;
- request hint;
- complete session.

## Domain Layer

Responsible for deterministic rules:

- methodology state;
- context activation;
- checklist reconciliation;
- phase gates;
- progress calculation;
- spoiler policy;
- review metrics.

## Infrastructure Layer

Responsible for:

- PostgreSQL;
- Gemini;
- document parsing;
- local file storage.

---

# 5. Suggested Repository Structure

```text
ctf-methodology-trainer/
│
├── docs/
│   ├── PRD.md
│   ├── frontend.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── training/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx
│   │   │       └── review/
│   │   │           └── page.tsx
│   │   ├── methodology/
│   │   │   └── page.tsx
│   │   ├── knowledge/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── ...
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── training/
│   │   ├── methodology/
│   │   ├── knowledge/
│   │   └── ui/
│   ├── modules/
│   │   ├── training/
│   │   ├── methodology/
│   │   ├── playbooks/
│   │   ├── context/
│   │   ├── findings/
│   │   ├── hypotheses/
│   │   ├── review/
│   │   ├── writeups/
│   │   └── ai/
│   ├── lib/
│   │   ├── db/
│   │   ├── validation/
│   │   ├── files/
│   │   └── utils/
│   └── server/
│       ├── services/
│       └── repositories/
│
├── drizzle/
├── public/
├── package.json
└── ...
```

This structure is a target, not a requirement to create every directory immediately.

Avoid empty architecture scaffolding.

Add modules when their implementation begins.

---

# 6. Core Runtime Domains

The core runtime is divided into:

```text
Writeup Ingestion
Hidden Knowledge
Methodology
Context
Playbooks
Training Sessions
Findings
Hypotheses
Attempts
Guidance
Review
```

---

# 7. Writeup Ingestion

User input:

```text
PDF / TXT / MD
```

Pipeline:

```text
Upload
  ↓
File Validation
  ↓
Document Parser
  ↓
Normalized Text
  ↓
Generation Run
```

The parser only produces normalized text and metadata.

Supported MVP types:

- `.pdf`
- `.txt`
- `.md`

Validate server-side:

- MIME/type;
- extension;
- max size;
- empty file;
- parse failure.

Do not execute uploaded content.

---

# 8. Generation Run

Every processing operation creates a `GenerationRun`.

Purpose:

- idempotency;
- status tracking;
- retry handling;
- provenance;
- regeneration history.

States:

```text
pending
parsing
extracting
graph_building
verifying
completed
failed
```

Page reload must not restart generation.

Recommended fingerprint:

```text
SHA-256(normalized file bytes or normalized text)
```

A matching successful fingerprint may reuse prior output unless user explicitly selects `Regenerate`.

---

# 9. AI Generation Pipeline

Do not use one giant prompt.

```text
Normalized Writeup
       │
       ▼
Fact Extractor
       │
       ▼
Machine Facts
       │
       ▼
Attack Graph Generator
       │
       ▼
Attack Graph
       │
       ▼
Graph Verifier
       │
       ▼
Verification Result
       │
       ▼
Persist Hidden Knowledge
```

All structured AI output must pass Zod validation.

---

# 10. Hidden Machine Knowledge

Hidden knowledge includes:

- full writeup text;
- extracted machine facts;
- attack graph;
- exact credentials from solution;
- exact exploit chain;
- reference path.

It is server-side only.

Never store hidden solution in:

- localStorage;
- sessionStorage;
- client state;
- browser-readable embedded JSON.

Never pass entire hidden graph as props to Client Components.

---

# 11. Hidden Attack Graph

Conceptual structure:

```text
AttackGraph
├── AttackNode[]
└── AttackEdge[]
```

Example node types:

```text
port-discovery
http-enumeration
content-discovery
credential-discovery
ssh-access
sudo-enumeration
root
```

Conceptual node:

```ts
type AttackNode = {
  id: string
  type: string
  summary: string
  spoilerLevel: number
  confidence: number
}
```

Conceptual edge:

```ts
type AttackEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  relation: "requires" | "enables" | "supports"
}
```

---

# 12. Automated Graph Verification

Verifier input:

- normalized writeup;
- extracted facts;
- generated graph.

Checks:

- missing critical steps;
- unsupported nodes;
- wrong ordering;
- hallucinated findings;
- incorrect initial access;
- incorrect privilege escalation.

Result:

```ts
type GraphVerification = {
  status: "validated" | "low_confidence" | "failed"
  confidence: number
  missingSteps: string[]
  unsupportedSteps: string[]
  conflicts: string[]
}
```

`failed` blocks TrainingSession creation.

---

# 13. Methodology Architecture

PTES is structured application data.

```text
Framework
  ↓
FrameworkPhase
  ↓
FrameworkCheck
```

MVP phases:

```text
Reconnaissance
Threat Modeling
Vulnerability Analysis
Exploitation
Post Exploitation
Reporting
```

The methodology is deterministic and independent from a specific machine.

---

# 14. Methodology Engine

Responsibilities:

- current phase;
- check priority;
- check lifecycle;
- phase gates;
- progress;
- methodology deviations.

AI cannot directly mutate methodology state.

Bad:

```text
Gemini says recon is finished
→ currentPhase = exploitation
```

Good:

```text
Required checks satisfy deterministic rule
→ transition allowed
```

---

# 15. Checklist Priority

Priorities:

```text
required
recommended
suggested
```

Rules:

- `required` can block Phase Gate.
- `recommended` affects coverage but not gate.
- `suggested` is exploration only.
- AI-generated checks default to `suggested`.

---

# 16. Checklist Lifecycle

States:

```text
inactive
active
completed
skipped
superseded
```

Do not delete old checks when context changes.

Historical state must remain reconstructable.

---

# 17. Evidence Model

Evidence states:

```text
observed
inferred
confirmed
```

Only confirmed user-visible evidence may activate machine-specific visible methodology.

---

# 18. Context Engine

Flow:

```text
Confirmed Evidence
       ↓
Context Engine
       ↓
Canonical Context Tags
```

Examples:

```text
service:http
service:ssh
service:smb
protocol:https
os:linux
os:windows
surface:authentication
surface:web
access:local-shell
technology:wordpress
```

Hidden writeup knowledge cannot directly create visible context.

---

# 19. Context Normalization

Raw observations must be normalized.

Examples:

```text
ssl/http
https
Apache over TLS
```

may normalize to:

```text
service:http
protocol:https
encrypted:true
```

Prefer deterministic rules.

AI may suggest normalization for unknown values, but confirmation is required before activation.

---

# 20. Playbook Registry

Playbooks are structured methodology knowledge, not React components.

Possible built-ins:

```text
HTTP
SSH
SMB
FTP
DNS
SNMP
LDAP
NFS
SMTP
Linux Post Exploitation
Windows Post Exploitation
Generic Service
```

Conceptual structure:

```ts
type Playbook = {
  id: string
  slug: string
  version: number
  title: string
  checks: PlaybookCheck[]
}
```

---

# 21. Playbook Resolver

Input:

- confirmed context tags.

Flow:

```text
Context Tags
    ↓
Playbook Resolver
    ├── known match → native playbook
    └── no match    → generic fallback
```

Example:

```text
service:http
→ HTTP playbook
```

---

# 22. Unknown Service Fallback

Unknown services must still work.

```text
Unknown Service
      ↓
Generic Service Playbook
      ↓
Optional AI Suggested Extensions
```

Generic checks:

- confirm service identity;
- identify implementation/version;
- understand protocol purpose;
- determine authentication requirements;
- enumerate accessible functionality;
- enumerate resources;
- inspect security controls;
- record interesting behavior;
- develop hypotheses.

No frontend code change is required.

---

# 23. AI Contextual Extensions

AI may generate extra checks when:

- no native playbook exists;
- current playbook is insufficient for confirmed context;
- implementation is unusual.

Rules:

- Zod validated;
- based only on user-visible context;
- spoiler-safe;
- methodology-oriented;
- default priority is `suggested`;
- cannot become Required automatically.

---

# 24. Checklist Composition

Visible checklist:

```text
Framework Core
+
Activated Playbooks
+
Contextual Checks
+
Validated AI Suggestions
```

Flow:

```text
Framework Definitions
        │
Confirmed Context
        │
        ▼
Playbook Resolver
        │
        ▼
Checklist Composer
        │
        ▼
Checklist Reconciler
        │
        ▼
Persisted Session Checks
```

---

# 25. Checklist Reconciliation

Prevent semantic duplicates.

Bad:

```text
Identify service version
Determine HTTP version
Check web server version
```

Use stable semantic keys, for example:

```text
service.http.version-identification
```

Reconciliation should prefer deterministic semantic keys and aliases.

---

# 26. Checklist Snapshotting

When a check activates, persist its session snapshot.

Store:

- semantic key;
- title;
- description;
- priority;
- provenance;
- playbook version;
- activation reason;
- activation time.

Future playbook changes must not rewrite old sessions.

---

# 27. Checklist Provenance

Possible sources:

```text
core
playbook
contextual
ai-generated
generic
```

Also track activation:

```text
activatedByFindingId
activatedByContextKey
```

Used for:

- UI explanation;
- debugging;
- review.

---

# 28. Spoiler-Safe Activation

Critical invariant:

```text
Hidden Writeup Fact
      X
      │
      └── must not directly activate visible checklist
```

Correct:

```text
Confirmed User Evidence
      ↓
Context Engine
      ↓
Playbook Resolver
      ↓
Visible Checklist
```

Hidden graph can influence hints only within spoiler policy.

---

# 29. TrainingSession Aggregate

Conceptually:

```text
TrainingSession
├── metadata
├── current phase
├── session phases
├── session checks
├── target IP
├── findings
├── hypotheses
├── attempts
├── notes
├── hints
├── context
├── deviations
└── completion state
```

TrainingSession is the main owner of user learning history.

---

# 30. Findings

Suggested fields:

```text
id
sessionId
title
category
evidence
state
importance
source
notes
createdAt
updatedAt
```

Confirmed Findings trigger Context Engine evaluation.

---

# 31. Hypotheses

Suggested fields:

```text
id
sessionId
basedOnFindingId?
hypothesis
reasoning
expectedResult
testApproach
outcome
createdAt
updatedAt
```

Outcomes:

```text
open
confirmed
rejected
inconclusive
```

---

# 32. Attempts

Attempts should belong to a hypothesis where possible.

```text
Attempt
├── hypothesisId
├── action
├── notes
├── result
└── timestamp
```

This supports deterministic Hypothesis Discipline metrics.

---

# 33. Phase Gate

Use deterministic domain logic.

Conceptual function:

```ts
canEnterPhase(session, targetPhase)
```

Returns:

```text
allowed
missingRequiredChecks
```

If blocked, user may override.

Override creates a `MethodologyDeviation`.

Frontend must not independently implement gate rules.

---

# 34. Progress

Deterministic.

Core progress:

```text
completed required
/
activated required
```

Coverage:

```text
completed required + recommended
/
activated required + recommended
```

Suggested checks do not reduce core progress.

---

# 35. Guidance Engine

The Guidance Engine mediates between deterministic state and Gemini.

Inputs:

- current phase;
- active visible checks;
- completed checks;
- findings;
- hypotheses;
- attempts;
- confirmed context;
- spoiler level;
- allowed hidden graph fragment.

Outputs:

- methodology guidance;
- hint;
- concept explanation.

---

# 36. Spoiler Policy Engine

Levels:

```text
0 methodology
1 concept
2 technique
3 tool
4 machine context
5 partial solution
6 full reveal
```

Control spoilers by **context minimization**, not prompt text alone.

Example:

```text
Level 0
→ no hidden graph node content

Level 4
→ limited relevant hidden summary

Level 6
→ explicit solution allowed
```

---

# 37. AI Mentor

The Mentor may:

- explain;
- interpret;
- suggest;
- hint.

It may not:

- complete checks;
- change phase;
- create confirmed findings automatically;
- set evidence state;
- mark session complete.

Avoid sending full writeup on each message.

Use structured relevant context only.

---

# 38. Hint Records

Persist every hint.

Fields:

```text
id
sessionId
level
phase
response
createdAt
```

This enables deterministic:

- hints used;
- machine-specific hints;
- full reveal counts.

---

# 39. AI Failure Degradation

If Gemini is unavailable, existing sessions still support:

- methodology;
- playbooks;
- findings;
- hypotheses;
- attempts;
- notes;
- progress;
- phase gates.

Unavailable temporarily:

- AI Mentor;
- AI contextual suggestions;
- AI concept explanations;
- new AI hints.

New Training generation may require retry.

---

# 40. Rate Limit Handling

For Gemini `429`:

- do not loop retries;
- preserve session state;
- show actionable error;
- provide explicit Retry;
- optionally respect provider retry-after information.

---

# 41. Database Architecture

Use PostgreSQL.

Suggested logical tables:

```text
writeups
generation_runs
machine_profiles

attack_graphs
attack_nodes
attack_edges
graph_verifications

frameworks
framework_phases
framework_checks

playbooks
playbook_checks

training_sessions
session_phases
session_checks

findings
hypotheses
attempts
notes
hints

context_observations
session_contexts

methodology_deviations
```

Exact columns belong to migrations, not this architecture document.

---

# 42. Repository/Data Access

Preferred dependency direction:

```text
Page / Server Action / Route Handler
        ↓
Application Service
        ↓
Domain Logic
        ↓
Repository
        ↓
Drizzle
        ↓
PostgreSQL
```

UI components should not contain Drizzle queries.

---

# 43. Transactions

Use transactions for multi-step state changes.

Example: Confirm Finding

```text
update finding
+
derive context
+
activate playbooks
+
persist session checks
```

should occur atomically where practical.

Example: Phase transition

```text
validate gate
+
update phase status
+
set next phase
```

should use a transaction when multiple records are affected.

---

# 44. Server and Client Components

Default to Server Components.

Use Client Components only for real interactivity:

- dialogs;
- tabs;
- local form state;
- optimistic check interaction;
- streamed mentor UI if implemented.

Do not make full pages client-side unnecessarily.

Hidden knowledge remains accessible only to server-side code.

---

# 45. Mutation Interfaces

Recommended:

## Server Actions

For:

- add/update finding;
- create hypothesis;
- add attempt;
- complete check;
- set target IP;
- phase transition.

## Route Handlers

For:

- file upload;
- AI generation;
- optional streamed mentor endpoints.

Keep conventions consistent.

---

# 46. Client State

Do not add Redux/Zustand by default.

Prefer:

- database/server state;
- URL state;
- local React state;
- React transitions.

Introduce global client state only if a real requirement appears.

---

# 47. Dynamic Frontend View Models

Frontend must receive safe view models.

Example:

```ts
type SessionChecklistGroupView = {
  id: string
  title: string
  provenanceLabel?: string
  isNew?: boolean
  completedCount: number
  totalCount: number
  checks: SessionCheckView[]
}
```

View models must never include hidden graph internals.

---

# 48. Session Review

Review combines:

## Deterministic data

- User Path;
- Reference Path;
- Recon Coverage;
- Phase Gate Compliance;
- Hypothesis Discipline;
- Documentation Coverage;
- Hint counts;
- Reveal counts;
- Overrides.

## Optional AI narrative

- concise improvement summary;
- explanation of patterns.

AI cannot author the numeric scores.

---

# 49. User Path Reconstruction

Build from persisted chronological data:

- findings;
- hypotheses;
- attempts;
- phase transitions;
- initial access;
- completion.

Do not rely on AI to invent the full user timeline.

---

# 50. Reference Path Reveal

Reference Path comes from validated Hidden Attack Graph.

It becomes visible only after completion.

Before completion:

- do not render it;
- do not preload it to client;
- do not expose it through normal API responses.

---

# 51. Knowledge Base Reuse

Knowledge Base should render Playbook Registry data.

```text
Playbook Registry
      ├── Methodology Engine
      └── Knowledge Base UI
```

Do not maintain duplicate service methodology content.

---

# 52. Methodology Page Reuse

Methodology page should render Framework definitions.

```text
Framework definitions
      ├── Session Engine
      └── Methodology UI
```

Avoid duplicate hardcoded phase content.

---

# 53. Settings

MVP settings may include:

- selected Gemini model;
- default framework;
- default spoiler level;
- hint behavior;
- theme;
- density;
- reduced motion.

Gemini API key should remain in environment configuration for MVP.

Do not store it in the database without a concrete need.

---

# 54. File Storage

Recommended MVP:

- parse uploaded file;
- store normalized text and metadata in PostgreSQL;
- original file persistence optional.

Avoid object storage infrastructure in MVP.

If original files are kept locally, use an application-managed directory and never expose arbitrary paths.

---

# 55. Security Requirements

## Secrets

```env
GEMINI_API_KEY=...
```

Never:

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
```

## Uploads

Validate:

- type;
- extension;
- size;
- parser output.

## Markdown/HTML

Sanitize if rendered.

Prefer plain normalized text for internal processing.

## Hidden Data

Do not log entire hidden solution or credentials unnecessarily.

---

# 56. Logging

Use lightweight structured logs.

Log:

- GenerationRun transitions;
- AI failures;
- validation failures;
- rate limits;
- database failures.

Do not log:

- API key;
- unnecessary extracted credentials;
- entire writeup/solution graph by default.

---

# 57. Error Model

Suggested application errors:

```text
WriteupParseError
InvalidAIOutputError
GenerationVerificationError
PhaseGateBlockedError
GeminiRateLimitError
GeminiUnavailableError
```

Map these to user-friendly UI states.

Never expose stack traces in the browser.

---

# 58. Validation

Use Zod at trust boundaries:

- upload metadata;
- form input;
- route payloads;
- AI structured output;
- dynamic checklist definitions;
- imports/exports.

Avoid redundant validation deep inside already trusted domain objects.

---

# 59. Testing Strategy

## Unit Tests — highest priority

- Context Engine;
- Context Normalizer;
- Playbook Resolver;
- Checklist Composer;
- Checklist Reconciler;
- Phase Gate;
- progress metrics;
- spoiler policy;
- review metrics.

## Integration Tests

- confirmed finding → context → playbook activation;
- unknown service → generic fallback;
- AI-generated check stays Suggested;
- phase override creates deviation;
- completed session reveals reference path.

## E2E

Critical flow:

```text
New Training
→ Upload Writeup
→ Generate Session
→ Start
→ Add Finding
→ Activate Playbook
→ Complete Check
→ Create Hypothesis
→ Add Attempt
→ Complete Session
→ Review
```

---

# 60. Performance

Normal local interactions should feel immediate.

Target:

```text
< 500 ms perceived latency
```

AI calls can be slower but require:

- loading state;
- progress indication where useful;
- retryable failure state.

Do not repeatedly send the full writeup.

---

# 61. AI Context Efficiency

Writeup processing occurs once.

Persist:

- facts;
- graph;
- verification.

Mentor requests send only relevant structured context.

Good:

```text
phase
+ checks
+ findings
+ hypotheses
+ relevant hidden fragment
```

Bad:

```text
full original writeup every time
```

---

# 62. Cache Strategy

Do not add Redis.

Use:

- database as source of truth;
- writeup fingerprint reuse;
- normal Next.js caching only where safe.

Avoid caching hidden data into client-facing layers.

---

# 63. Critical Invariants

1. Hidden facts cannot directly activate visible machine-specific checks.
2. AI-generated checks cannot become Required automatically.
3. Frontend contains no machine-specific rendering logic.
4. New services do not require new frontend components.
5. Phase Gate is deterministic.
6. Numeric review metrics are deterministic.
7. Old sessions do not change after playbook updates.
8. Existing sessions remain usable when Gemini is unavailable.
9. Reference Path is not sent to client before completion.
10. Gemini API key never reaches client.
11. Session checklist changes remain historically traceable.
12. Confirmed user evidence is the source of visible machine context.

---

# 64. Architecture Decisions

## ADR-001 — Modular Monolith

Use one Next.js application.

Why:

- local single-user product;
- simpler development;
- no distributed-system need.

## ADR-002 — PostgreSQL

Why:

- relational domain;
- strong history/query requirements;
- good fit for sessions/findings/hypotheses.

## ADR-003 — Drizzle ORM

Why:

- typed;
- explicit;
- close to SQL;
- lightweight.

## ADR-004 — Server-Side Hidden Knowledge

Why:

- preserve spoiler boundary.

## ADR-005 — Deterministic Methodology

Why:

- reliability;
- explainability;
- consistent learning behavior.

## ADR-006 — Schema-Driven Frontend

Why:

- dynamic services and machines;
- unknown-service support.

## ADR-007 — Playbook Registry

Why:

- reusable service knowledge;
- Methodology + Knowledge Base share one source.

## ADR-008 — Generic Service Fallback

Why:

- unknown services remain supported without code changes.

## ADR-009 — AI Suggestions Default to Suggested

Why:

- AI must not control methodology gates.

## ADR-010 — Local-First MVP

Why:

- no auth/cloud complexity required for current product goal.

---

# 65. Core Request Flows

## New Training

```text
Browser
  ↓
Upload
  ↓
File Validation
  ↓
Document Parser
  ↓
GenerationRun
  ↓
Fact Extractor
  ↓
Zod
  ↓
Graph Generator
  ↓
Zod
  ↓
Verifier
  ↓
Persist Hidden Knowledge
  ↓
Create TrainingSession
  ↓
Session Page
```

## Confirm Finding

```text
Browser
  ↓
Confirm Finding
  ↓
Application Service
  ↓
Update Finding
  ↓
Context Engine
  ↓
Normalizer
  ↓
Playbook Resolver
  ↓
Checklist Composer
  ↓
Reconciler
  ↓
Persist Session Snapshot
  ↓
Return Visible State
```

## Get Hint

```text
Browser
  ↓
Guidance Service
  ↓
Read Session State
  ↓
Apply Spoiler Policy
  ↓
Select Allowed Hidden Context
  ↓
Gemini
  ↓
Persist Hint
  ↓
Return Hint
```

## Phase Transition

```text
Browser
  ↓
Phase Gate
  ├── allowed → transition
  └── blocked → missing checks
                     ↓
               optional override
                     ↓
                 deviation
```

## Complete Session

```text
Browser
  ↓
Complete Machine
  ↓
Mark Completed
  ↓
Freeze Session State
  ↓
Calculate Review
  ↓
Enable Reference Path
  ↓
Review Page
```

---

# 66. Recommended Implementation Order

```text
1. App Shell
2. PostgreSQL + Drizzle
3. Framework definitions
4. TrainingSession core
5. Session checks
6. Phase Gate
7. Findings / Hypotheses / Attempts
8. Context Engine
9. Playbook Registry
10. Dynamic checklist composition
11. Writeup ingestion
12. Gemini generation pipeline
13. Hidden Attack Graph
14. Graph Verification
15. Guidance / spoiler engine
16. AI Mentor
17. Session completion
18. Review
19. Reliability / polish
```

Do not start with AI before deterministic session workflow exists.

---

# 67. Development Guardrails

Before meaningful changes are considered done:

```text
pnpm lint
pnpm typecheck
```

Run relevant tests when available.

Do not:

- add dependencies without clear need;
- scaffold future systems prematurely;
- expose hidden data for convenience;
- bypass Zod on AI output;
- hardcode service logic in frontend;
- allow AI to mutate methodology state directly.

---

# 68. Architecture Completion Criteria

The MVP architecture is successful when:

1. A writeup can produce a validated hidden solution model.
2. Generated sessions remain usable without Gemini afterward.
3. Confirmed evidence can activate context.
4. Context can activate native playbooks.
5. Unknown services use generic fallback.
6. AI can add Suggested contextual extensions.
7. Frontend renders dynamic checklist groups generically.
8. Hidden solution is not accessible from normal client state before completion.
9. Phase Gates work deterministically.
10. Historical sessions remain stable after playbook updates.
11. Review metrics are explainable and deterministic.
12. Completed sessions can reveal the reference path safely.

---

# 69. Final Architecture Rule

```text
WRITEUP
   ↓
Hidden Machine Knowledge
   ↓
Guidance Context Only


USER EVIDENCE
   ↓
Visible Context
   ↓
Methodology + Playbooks
   ↓
Dynamic Checklist
   ↓
Frontend


AI
   ↓
Interpret / Explain / Suggest

NOT

AI
   ↓
Control Application State
```

> Hidden knowledge knows the answer. Methodology defines the process. User evidence drives visible context. Playbooks provide reusable methodology knowledge. The frontend renders structured state. AI assists without becoming the workflow authority.
