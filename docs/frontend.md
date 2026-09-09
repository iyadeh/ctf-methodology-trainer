# Frontend Specification
# CTF Methodology Trainer

**Version:** 0.1  
**Status:** UI Source of Truth  
**Purpose:** Mendefinisikan struktur, isi, hierarchy, dan behavior frontend untuk setiap halaman agar implementasi sesuai dengan mockup visual yang sudah dibuat.

---

## 1. Frontend Principles

Frontend harus terasa seperti **professional security tooling**, bukan generic SaaS dashboard atau cyberpunk UI.

### Visual Character

- Dark mode sebagai default.
- Technical, restrained, dense, dan readable.
- Accent utama: green.
- Border tipis dan surface hierarchy yang subtle.
- Sedikit rounded, tidak terlalu pill-heavy.
- Tidak menggunakan glow berlebihan.
- Tidak menggunakan glassmorphism.
- Tidak menggunakan gradient dekoratif.
- Tidak menggunakan background Matrix/cyberpunk.
- Tidak menggunakan oversized hero typography.
- Tidak menggunakan random chart yang tidak memiliki nilai fungsional.

### Layout Principles

Desktop-first.

Target utama:

```text
>= 1280px
```

Global layout:

```text
┌───────────────┬─────────────────────────────────────────────┐
│ Sidebar       │ Top Bar                                     │
│               ├─────────────────────────────────────────────┤
│               │ Main Content                                │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

Sidebar memiliki width stabil dan tidak berubah antar halaman.

Main content mengikuti max-width yang konsisten.

---

# 2. Global Application Shell

Semua halaman utama menggunakan shell yang sama.

## 2.1 Sidebar

Header:

```text
[ icon ] CTF Methodology Trainer
         Learn. Practice. Hack Smarter.
```

Primary navigation:

```text
Dashboard
Training Sessions
New Training
Methodology
Knowledge Base
Settings
```

Active navigation menggunakan green-tinted surface dan green icon/text.

Bagian bawah sidebar:

```text
Level Up
Consistent practice builds real skills.
```

Card ini bersifat informational dan tidak perlu terlalu menonjol.

---

## 2.2 Top Bar

Top bar berisi:

```text
[ Search machines, topics, or methodology... ]

                                      [ Notification ]
                                      [ Avatar ]
                                      Arga
                                      [ Dropdown ]
```

Search bar bersifat global.

MVP boleh belum mengimplementasikan global search penuh, tetapi visual dan interaction shell harus tersedia.

---

# 3. Shared UI Vocabulary

Frontend harus menggunakan reusable generic components.

Recommended component vocabulary:

```text
AppShell
Sidebar
TopBar
PageHeader
Breadcrumbs

StatusBadge
ProgressBar
MetricCard

SessionCard
PhaseStepper

ChecklistSection
ChecklistGroup
ChecklistItem

FindingCard
HypothesisCard
AttemptCard

MentorPanel
QuickActions

InfoPanel
EmptyState
LoadingState
ErrorState

SearchInput
FilterTabs
SelectField
```

Frontend **tidak boleh** membuat component seperti:

```text
HttpPage
SmbPage
RedisPage
FriendlyMachinePage
CapMachinePage
```

Machine-specific dan service-specific content harus data-driven.

---

# 4. Page 1 — Dashboard

**Route**

```text
/
```

## 4.1 Purpose

Memberikan overview singkat tentang aktivitas user dan jalur tercepat untuk melanjutkan training.

## 4.2 Page Header

Kiri:

```text
Welcome back,

Dashboard

Continue your training, track your progress,
and build your CTF skills.
```

Kanan:

```text
Mon, Apr 28, 2025

Keep learning.
Small steps make big progress.
```

Tanggal harus berasal dari current date.

Copy motivasional boleh tetap statis.

---

## 4.3 Continue Training Card

Section utama di kiri atas.

Header:

```text
Continue Training

[ In Progress ]
```

Content:

```text
Friendly

A beginner-friendly machine focused on basic
enumeration and common misconfigurations.

[ Easy ] [ Linux ] [ Enumeration ]

42% complete                     3 of 6 phases

[ progress bar ]

[ Resume ]
[ View Details ]
```

Jika tidak ada active session, gunakan empty state:

```text
No active training session.

Start a new training session to begin practicing.

[ New Training ]
```

---

## 4.4 New Training Card

Card kanan atas.

Content:

```text
New Training

Start a New Training

Upload a machine writeup and turn it into
a methodology-guided practice session.

[ Upload Writeup ]

Explore the methodology →
```

Catatan implementasi:

Mockup visual awal menampilkan label seperti "Browse Machines", tetapi behavior final harus mengikuti product flow aktual: **New Training dimulai dari upload writeup**.

---

## 4.5 Recent Sessions

Section:

```text
Recent Sessions                         View All →
```

Setiap row:

```text
Friendly
Last accessed 12 minutes ago

[ In Progress ]              42%
[ progress bar ]

[ Continue → ]
```

Contoh session lain:

```text
Baseme
Paused
28%

Cap
Completed
100%
```

Maksimal 3–5 item pada Dashboard.

---

## 4.6 Methodology Progress

Card kanan:

```text
Methodology Progress              View Methodology →
```

Rows:

```text
Reconnaissance            57%
Threat Modeling           23%
Vulnerability Analysis    31%
Exploitation              18%
Post Exploitation         12%
Reporting                 44%
```

Progress merupakan aggregate learning history.

Jika analytics belum tersedia di early MVP, tampilkan state berdasarkan session history yang tersedia.

---

## 4.7 Training Overview

Full-width lower card.

Metrics:

```text
1
In Progress
Active training sessions

1
Completed
Machines finished

1
Paused
Take a break, come back anytime

6
Hints Used
Across all sessions
```

Tidak perlu chart dekoratif.

---

# 5. Page 2 — Training Sessions

**Route**

```text
/training
```

## 5.1 Page Header

```text
Welcome back,

Training Sessions

Continue or review your practice sessions.
Track your progress across different machines
and methodologies.
```

Kanan:

```text
Current date

Keep learning.
Small steps make big progress.
```

---

## 5.2 Session Metrics

Top summary card:

```text
5
Total Sessions
Across all machines

2
In Progress
Keep going

1
Paused
Pick up where you left off

2
Completed
Great progress!
```

---

## 5.3 Search and Filters

Row:

```text
[ Search training sessions... ]

[ All ]
[ In Progress ]
[ Paused ]
[ Completed ]

[ + New Training ]
```

Secondary row:

```text
5 training sessions

Sort by: Last Accessed
```

Sort options:

```text
Last Accessed
Created Date
Progress
Name
```

---

## 5.4 Session List

Setiap session ditampilkan sebagai horizontal card.

Example:

```text
[ machine icon ]

Friendly
A beginner-friendly machine focused on basic
enumeration and common misconfigurations.

[ PTES ] [ Linux ] [ Easy ]

[ In Progress ]

[ progress bar ] 42%
3 of 6 tasks

Last accessed
12 minutes ago

[ Continue ]

[ ... ]
```

State button:

```text
In Progress → Continue
Paused      → Resume
Completed   → Review
Not Started → View Details
```

Overflow menu dapat berisi:

```text
Rename
Pause / Resume
Duplicate Training
Delete Session
```

Delete harus membutuhkan confirmation.

---

# 6. Page 3 — New Training

**Route**

```text
/training/new
```

## 6.1 Page Header

Breadcrumb:

```text
Training > New Training
```

Title:

```text
New Training

Upload a writeup to generate a methodology-guided
machine session.
```

Kanan:

```text
Current date

Turn writeups into hands-on learning.
```

---

## 6.2 Upload Writeup Panel

Card utama kiri.

Header:

```text
Upload Writeup
```

Secondary action:

```text
View Supported Formats →
```

Drop zone:

```text
Drag and drop your writeup here
or click to browse

Supports PDF, TXT, and Markdown (.md) files
Max file size: 10 MB
```

Setelah file dipilih:

```text
friendly-writeup.md
124 KB

[ remove ]
```

---

## 6.3 Methodology Framework

Field:

```text
Methodology Framework

[ PTES — CTF Adapted ▼ ]

Structure the training session using the PTES
methodology, adapted for capture-the-flag scenarios.
```

MVP hanya perlu satu framework aktif.

Dropdown dipertahankan untuk future expansion.

---

## 6.4 Generate Button

Primary CTA:

```text
[ Generate Training ]
```

Disabled jika belum ada writeup valid.

---

## 6.5 What Gets Generated Panel

Card kanan:

```text
What Gets Generated?

We analyze your writeup and create a hands-on
training session with methodology guidance,
hints, and structured tasks.
```

Items:

```text
Machine Profile
Extract machine details, difficulty, and tags
from your writeup.

Methodology-Guided Tasks
Break down the attack path into structured
phases and learning objectives.

Hints and Guidance
Generate contextual hints based on the solution,
aligned with the selected framework.

Learning Resources
Suggest relevant topics, techniques, and
documentation for each phase.

Ready to Practice
Get a fully configured training session you
can work through step by step.
```

Footer message:

```text
Turn your CTF experience into a repeatable
learning opportunity.
```

---

## 6.6 Processing State

Processing tetap berada di route yang sama.

Panel bawah:

```text
Processing Writeup

Analyzing your document and generating
a training session...
```

Steps:

```text
1. Document parsed
   File uploaded and content extracted successfully.

2. Machine knowledge extracted
   Identifying machine details, flags, and key information.

3. Attack path modeled
   Analyzing solution and mapping to PTES phases.

4. Guide verified
   Generating hints and validating methodology alignment.

5. Training ready
   Finalizing session and preparing for practice.
```

Possible state:

```text
Completed
In Progress
Pending
Failed
```

Jika gagal:

```text
Generation failed.

[ Retry ]
```

Jangan silently restart generation.

---

# 7. Page 4 — Training Session

**Route**

```text
/training/[sessionId]
```

Ini halaman utama aplikasi.

## 7.1 Breadcrumb and Machine Header

Breadcrumb:

```text
Training Sessions > Friendly
```

Header:

```text
[ machine icon ]

Friendly

[ In Progress ]
[ Easy ]
[ Linux ]
[ 192.168.56.105 ]

A beginner-friendly machine focused on basic
enumeration and common misconfigurations.

[ View Machine Details → ]
```

Target IP harus berasal dari TrainingSession, bukan permanent Machine profile.

---

## 7.2 Phase Stepper

Horizontal:

```text
1 Reconnaissance
2 Threat Modeling
3 Vulnerability Analysis
4 Exploitation
5 Post Exploitation
6 Reporting
```

Current phase memakai green.

Completed phase memiliki completed state.

Future phases muted.

Jika phase gate belum lolos, clicking future phase memunculkan warning.

---

## 7.3 Session Tabs

```text
Training
Notes
Findings
Hypotheses
Progress
Resources
```

Default:

```text
Training
```

Tab tetap berada pada route yang sama.

Boleh menggunakan URL query state seperti:

```text
?tab=findings
```

tetapi tidak wajib.

---

# 8. Training Tab

Layout desktop:

```text
┌────────────────────────────────┬─────────────────────┐
│ Main Methodology               │ Session Context     │
│                                │ AI Mentor           │
│                                │ Quick Actions       │
└────────────────────────────────┴─────────────────────┘
```

---

## 8.1 Methodology Checklist

Header:

```text
Methodology Checklist

42% complete
6 of 14 tasks

[ progress bar ]
```

---

## 8.2 Core Reconnaissance Group

Group header:

```text
Core Reconnaissance

4 / 7 completed
```

Checks:

```text
✓ Confirm target reachability
✓ Perform initial port enumeration
✓ Perform full TCP enumeration
✓ Identify exposed services
□ Identify service versions
□ Map the attack surface
□ Summarize reconnaissance findings
```

Setiap checklist item memiliki overflow:

```text
Add Note
Add Finding
Skip
Why this matters
```

---

## 8.3 Dynamic Playbook Groups

Example:

```text
HTTP Enumeration

[ PLAYBOOK — HTTP ]
[ NEW ]

1 / 6 completed
```

Checks:

```text
✓ Inspect application manually
□ Inspect response headers
□ Identify technology stack
□ Perform content discovery
□ Consider virtual hosts
□ Identify authentication surfaces
```

SSH:

```text
SSH Enumeration

[ PLAYBOOK — SSH ]

1 / 2 completed

□ Review authentication surface
✓ Record protocol/version context
```

Frontend harus menampilkan group generik berdasarkan schema.

Tidak ada hardcoded HTTP/SSH UI component.

---

## 8.4 Session Context Panel

Header:

```text
Session Context

Edit Context
```

Target Information:

```text
Machine
Friendly

Status
In Progress

Difficulty
Easy

Operating System
Linux

Target IP
192.168.56.105
```

---

## 8.5 Discovered Services

```text
Discovered Services

22 / tcp       SSH       Open
80 / tcp       HTTP      Open

Rescan
```

"Rescan" pada MVP **tidak menjalankan scan otomatis**.

Action dapat berarti:

```text
Update discovered services
```

atau membuka dialog untuk menambah/confirm service manually.

Label final sebaiknya:

```text
Update Services
```

agar tidak menyiratkan automatic network scan.

---

## 8.6 Context Tags

```text
Context Tags

service:ssh
service:http
os:linux

[ + Add Tag ]
```

Tag yang dihasilkan AI dari unconfirmed evidence harus memiliki visual distinction dan tidak otomatis mengaktifkan playbook sampai confirmed.

---

## 8.7 AI Mentor Panel

Header:

```text
AI Mentor

Ask Another
```

Response example:

```text
Good progress! You've confirmed that SSH and HTTP
are available. Before moving to exploitation, make
sure to fully enumerate the exposed services.

Look for version information, additional endpoints,
and any misconfigurations. A complete understanding
of the attack surface will help you identify the most
relevant attack paths.
```

Footer guidance:

```text
Focus on gathering as much information as you can
before moving to the next phase.
```

Actions:

```text
Ask a Question
Get Hint
Explain Concept
```

---

## 8.8 Quick Actions

```text
Quick Actions

[ + Add Finding ]
[ New Hypothesis ]
[ Get Hint ]
[ Complete Check ]
```

No automatic exploitation action.

---

## 8.9 Recent Findings

Lower main panel:

```text
Recent Findings                       View All →
```

Example:

```text
Exposed SSH service
SSH service detected on port 22

[ Confirmed ]
12 minutes ago
```

```text
Exposed HTTP service
HTTP service detected on port 80

[ Confirmed ]
18 minutes ago
```

---

# 9. Notes Tab

Masih pada:

```text
/training/[sessionId]
```

Header:

```text
Notes
Keep temporary observations, commands, and reminders.
```

Actions:

```text
[ + New Note ]
```

Note card:

```text
Recon Notes

- Port 80 serves a custom web application.
- Check response headers.
- Need to review discovered hostnames.

Updated 10 minutes ago

[ Edit ]
[ Delete ]
```

Notes tidak otomatis dianggap Findings.

---

# 10. Findings Tab

Header:

```text
Findings

Document confirmed observations and meaningful evidence.

[ + Add Finding ]
```

Filter:

```text
All
Observed
Inferred
Confirmed
```

Finding card:

```text
Accessible HTTP Service

Category
Attack Surface

Evidence
TCP/80 HTTP

State
Confirmed

Source
Manual observation

Created
18 minutes ago
```

Actions:

```text
Create Hypothesis
Edit
Archive
```

---

# 11. Hypotheses Tab

Header:

```text
Hypotheses

Turn evidence into intentional tests.

[ + New Hypothesis ]
```

Card:

```text
Backup resources may expose sensitive configuration.

Based on
Accessible backup directory

Reasoning
Backup files may contain configuration or credentials.

Expected Result
Configuration data or credential material.

Test Approach
Inspect accessible backup content.

Outcome
In Progress
```

Nested attempts:

```text
Attempts

1. Inspect backup directory
   Confirmed

2. Analyze configuration file
   Inconclusive
```

---

# 12. Progress Tab

Header:

```text
Progress

Track methodology completion and session discipline.
```

Phase progress:

```text
Reconnaissance            57%
Threat Modeling            0%
Vulnerability Analysis     0%
Exploitation               0%
Post Exploitation          0%
Reporting                  0%
```

Secondary metrics:

```text
Required Checks Completed
Recommended Checks Completed
Suggested Checks Explored

Phase Overrides
Hints Used
Machine-Specific Hints
Full Reveals
```

Progress angka harus deterministic.

---

# 13. Resources Tab

Header:

```text
Resources

Reference material relevant to the current methodology.
```

Sections:

```text
Methodology
PTES Reference
Reconnaissance Guide

Activated Playbooks
HTTP Enumeration
SSH Enumeration

Concepts
Content Discovery
Service Enumeration
Attack Surface Mapping
```

Resources tidak boleh membocorkan hidden solution.

---

# 14. Page 5 — Session Review

**Route**

```text
/training/[sessionId]/review
```

## 14.1 Header

Breadcrumb:

```text
Training Sessions > Friendly > Session Review
```

Header:

```text
Friendly

[ Completed ]

Session completed on Apr 28, 2025 at 14:32.

Great work! You completed the machine.
Here's a detailed review of your approach
and performance.

[ View Machine Details → ]
```

---

## 14.2 Review Tabs

```text
Overview
Your Path
Comparison
Methodology
Notes
```

Default:

```text
Overview
```

---

## 14.3 Your Path

Card kiri:

```text
Your Path

The path you took to complete Friendly.

2h 18m
Total Time

7
Steps
```

Timeline:

```text
Reconnaissance
Discovered open ports and services
12m

HTTP Enumeration
Enumerated web service, found backup file
28m

Backup Analysis
Analyzed backup, found credentials
16m

Credential Access
Identified valid credentials
9m

SSH Access
Gained initial foothold via SSH
22m

Privilege Escalation
Found and exploited sudo misconfiguration
41m

Root Access
Captured root flag
10m
```

---

## 14.4 Reference Path

Card kanan:

```text
Reference Path

A recommended path based on the methodology.

~1h 45m
Estimated Time

7
Steps
```

Timeline:

```text
Reconnaissance
Identify target, enumerate services

HTTP Enumeration
Enumerate web service thoroughly

Backup Analysis
Find and analyze backup files

Credential Access
Extract and validate credentials

SSH Access
Gain initial access via SSH

Privilege Escalation
Identify and exploit sudo misconfiguration

Root Access
Capture root flag
```

Reference path baru terlihat setelah completion.

---

## 14.5 Methodology Review

Card:

```text
Methodology Review

How well you applied the methodology.
```

Metrics:

```text
Recon Coverage              92%
Phase Gate Compliance       83%
Hypothesis Discipline       76%
Documentation Coverage      88%
```

Secondary counters:

```text
3 Hints Used
1 Machine Hint
0 Full Reveals
0 Overrides
```

---

## 14.6 Areas to Improve

Card:

```text
Areas to Improve

Focus on these areas to strengthen your skills.
```

Example:

```text
1. Expand reconnaissance coverage

You found the key services, but missed some initial
enumeration opportunities that could reveal
additional context.

2. Stronger hypothesis documentation

Some steps lacked clear hypotheses. Documenting
your assumptions helps you stay intentional.

3. Explore alternative paths

You solved the machine efficiently, but consider
exploring alternative paths after completion to
deepen understanding.
```

Feedback harus grounded pada recorded session data.

---

# 15. Page 6 — Methodology

**Route**

```text
/methodology
```

## 15.1 Header

```text
Methodology

PTES — CTF Adapted

A practical, CTF-focused adaptation of the Penetration
Testing Execution Standard (PTES).

Follow a structured approach from initial reconnaissance
to reporting, with guidance, checklists, and playbooks
tailored for CTF environments.
```

Right info card:

```text
Structured. Practical. Effective.

A proven methodology, adapted for hands-on learning
and real-world skills.
```

---

## 15.2 Methodology Phase Navigation

Left card:

```text
Methodology Phases

1 Reconnaissance
  Gather information about the target

2 Threat Modeling
  Identify potential attack paths

3 Vulnerability Analysis
  Find and validate weaknesses

4 Exploitation
  Gain initial access

5 Post Exploitation
  Enumerate, escalate, persist

6 Reporting
  Document findings and learnings
```

Selecting a phase updates content panel without route change.

---

## 15.3 Phase Detail

Example:

```text
1 Reconnaissance

Gather information about the target to build an
understanding of the attack surface.

[ Previous ] [ Next ]
```

Purpose card:

```text
Purpose

Collect as much relevant information as possible
about the target, without modifying it.

The goal is to identify live hosts, open services,
technologies, and potential entry points that can
be explored in later phases.
```

---

## 15.4 Core Checks

```text
Core Checks

6 of 8 checks
```

Example:

```text
✓ Identify target reachability
✓ Perform network enumeration
✓ Discover open ports and services
✓ Identify service versions and banners
✓ Enumerate subdomains or virtual hosts if applicable
□ Discover exposed applications and interfaces
□ Search for public information (OSINT)
□ Document findings and map the attack surface
```

Pada halaman Methodology, checklist hanya bersifat reference.

Tidak mengubah session tertentu.

---

## 15.5 Why It Matters

Side card:

```text
Why It Matters

Reconnaissance sets the foundation for everything
that follows. The more you know about the target,
the more efficient and focused your attacks will be.
```

Mindset:

```text
Be curious, methodical, and thorough.
Look beyond the obvious.
```

---

## 15.6 Related Service Playbooks

```text
Related Service Playbooks                  View All Playbooks →
```

Cards:

```text
HTTP Enumeration
Techniques for discovering web content,
directories, virtual hosts, and technologies.

[ nmap ] [ gobuster ] [ whatweb ] [ ffuf ]

[ View Playbook → ]
```

```text
SMB Enumeration
Enumerate SMB shares, users, and configuration details.

[ smbclient ] [ enum4linux ] [ crackmapexec ]

[ View Playbook → ]
```

Tool tags bersifat reference, bukan required commands.

---

## 15.7 Methodology Resources

Left lower panel:

```text
Methodology Resources

PTES Official Standard
CTF Adaptation Guide
Tools Cheat Sheet
Example Reports
```

External references boleh dibuka di tab baru.

---

# 16. Page 7 — Knowledge Base

**Route**

```text
/knowledge
```

## 16.1 Header

```text
Knowledge Base

Reusable service playbooks, techniques,
and privilege-escalation references.
```

Right:

```text
Current date

Knowledge turns experience into advantage.
```

---

## 16.2 Search and Categories

Search:

```text
Search the knowledge base...
```

Type filter:

```text
All Content ▼
```

Category pills:

```text
All
Services
Techniques
Post Exploitation
Concepts
Enumeration
Privesc
Lateral Movement
Web
Windows
Linux
```

---

## 16.3 Knowledge Navigator

Left-side content grid.

Services:

```text
Services
5 items

HTTP
SMB
FTP
SSH
DNS
```

Techniques:

```text
Techniques
8 items

Content Discovery
Virtual Host Discovery
Credential Analysis
Password Spraying
Hash Cracking
```

Post Exploitation:

```text
Post Exploitation
6 items

Sudo
SUID
Capabilities
Cron
Service Misconfigurations
```

Concepts:

```text
Concepts
6 items

Enumeration
Privilege Escalation
Lateral Movement
Persistence
Logs & Forensics
```

---

## 16.4 Knowledge Detail Panel

Example selected item:

```text
HTTP

Web service enumeration and exploitation

[ Service ]
```

Tabs:

```text
Overview
Methodology
Tools
Cheatsheet
Related
```

Overview:

```text
About

HTTP (Hypertext Transfer Protocol) is a common web
service that often exposes valuable information such
as application versions, hidden directories, virtual
hosts, and misconfigurations.
```

Tags:

```text
Web
Enumeration
Misconfiguration
Initial Access
```

Key Checks:

```text
✓ Identify the web server and version
✓ Check for default pages and interesting content
✓ Enumerate directories and files
✓ Look for virtual hosts and subdomains
✓ Analyze headers and cookies
✓ Check for common vulnerabilities
✓ Review source code and hidden comments
✓ Test relevant application surfaces
```

Common Tools:

```text
nmap
gobuster
ffuf
dirsearch
curl
whatweb
nikto
wpscan
burpsuite
feroxbuster
```

CTA:

```text
[ View Full Playbook → ]
```

---

# 17. Page 8 — Settings

**Route**

```text
/settings
```

## 17.1 Header

```text
Settings

Configure the application to match your
workflow and preferences.
```

Right:

```text
Current date

Good tools make great hackers.
```

---

## 17.2 AI Configuration

Card:

```text
AI Configuration

Configure the AI provider used for hints,
explanations, and feedback.
```

Fields:

```text
Provider

[ Gemini ▼ ]
```

```text
Model

[ Gemini Flash Lite ▼ ]
```

```text
Connection Status

● Connected

Successfully connected to Gemini.

[ Test Connection ]
```

Info:

```text
The AI is used to generate hints, explanations,
and guided learning content.

Your API key is stored securely and never shared.
```

API key tidak pernah ditampilkan penuh.

---

## 17.3 Training Defaults

Card:

```text
Training Defaults

Set your preferred defaults for new training sessions.
```

Fields:

```text
Methodology Framework

[ PTES — CTF ▼ ]
```

```text
Default Spoiler Level

[ Methodology Only ▼ ]
```

```text
Hint Behavior

[ Progressive Hints ▼ ]
```

---

## 17.4 Interface

Card:

```text
Interface

Customize the look and feel of the application.
```

Fields:

```text
Theme

[ Dark (Default) ▼ ]
```

```text
Density

[ Comfortable ▼ ]
```

```text
Reduced Motion

[ toggle ]

Enable reduced motion
```

MVP boleh hanya menyediakan Dark theme meskipun dropdown sudah tersedia.

---

## 17.5 Data / Storage

Card:

```text
Data / Storage

Manage your data, exports, and local storage.
```

Rows:

```text
Database Status

● Connected

Your training data is being saved automatically.
```

```text
Export Training Sessions

Download your training history as a JSON file.

[ Export Sessions ]
```

```text
Generation History

124 items

Stored prompts, hints, and AI responses.

[ Clear History ]
```

```text
Application Cache

28 MB

Clear locally stored cache data.

[ Clear Cache ]
```

Destructive actions harus menggunakan confirmation dialog.

---

# 18. Dynamic Checklist Behavior

Frontend harus mampu menangani dynamic groups.

Contoh initial state:

```text
Core Reconnaissance

□ Confirm target
□ Port enumeration
□ Service identification
```

User confirms HTTP:

```text
HTTP Enumeration

[ NEW ]

□ Inspect application
□ Identify technology
□ Perform content discovery
```

User kemudian confirms SSH:

```text
SSH Enumeration

[ NEW ]

□ Review authentication surface
□ Record protocol/version context
```

Tidak boleh ada page reload penuh.

Gunakan normal server/client state refresh sesuai architecture.

---

# 19. Unknown Service UI

Jika service belum punya native playbook:

```text
MQTT Enumeration

[ GENERIC PLAYBOOK ]

□ Confirm service identity
□ Identify implementation/version
□ Determine authentication requirements
□ Identify accessible functionality
□ Enumerate resources

AI Suggestions

[ SUGGESTED ]

□ Review anonymous subscription behavior
□ Inspect retained messages
```

Frontend tidak perlu mengetahui MQTT sebelumnya.

---

# 20. Checklist Provenance UI

Possible badges:

```text
CORE
PLAYBOOK — HTTP
CONTEXTUAL
AI SUGGESTED
GENERIC PLAYBOOK
NEW
```

Gunakan badge seperlunya.

Jangan menampilkan terlalu banyak badge pada setiap individual checklist item.

Lebih baik provenance utama ditampilkan pada group header.

---

# 21. Evidence State UI

Possible states:

```text
Observed
Inferred
Confirmed
```

Suggested visual hierarchy:

```text
Observed  → neutral
Inferred  → informational
Confirmed → green
```

Jangan hanya mengandalkan warna.

Selalu tampilkan text label.

---

# 22. Phase Gate Dialog

Ketika user mencoba berpindah phase sebelum Required checks selesai:

```text
Reconnaissance is not complete.

Required checks remaining:

□ Map the attack surface
□ Summarize reconnaissance findings

Moving forward now will be recorded as a
methodology deviation.

[ Return to Reconnaissance ]

[ Continue Anyway ]
```

`Continue Anyway` bukan primary green CTA.

Gunakan neutral/warning treatment.

---

# 23. Add Finding Dialog

Fields:

```text
Add Finding

Title
[ _________________________ ]

Category
[ Attack Surface ▼ ]

Evidence
[ _________________________ ]

Evidence State
[ Observed ▼ ]

Importance
[ Medium ▼ ]

Notes
[ _________________________ ]

[ Cancel ]
[ Save Finding ]
```

---

# 24. Create Hypothesis Dialog

```text
New Hypothesis

Based On
[ Finding ▼ ]

Hypothesis
[ _________________________ ]

Reasoning
[ _________________________ ]

Expected Result
[ _________________________ ]

Test Approach
[ _________________________ ]

[ Cancel ]
[ Create Hypothesis ]
```

---

# 25. Get Hint Interaction

Default hint action:

```text
Need help?

Current hint level:
Methodology

[ Get Hint ]
```

After first hint:

```text
Methodology Hint

Before moving forward, review whether all discovered
services have been sufficiently enumerated.

[ That helped ]
[ Need another hint ]
```

Progressively increase spoiler level only by explicit user request.

---

# 26. Loading States

Gunakan skeleton atau progress state.

Avoid:

```text
blank screen
```

Important loading states:

```text
Dashboard data
Training session
Writeup generation
AI Mentor response
Session review
Knowledge content
```

---

# 27. Empty States

Examples:

## No Sessions

```text
No training sessions yet.

Upload your first writeup and start building
a repeatable penetration-testing workflow.

[ New Training ]
```

## No Findings

```text
No findings recorded yet.

Document meaningful evidence as you enumerate
the target.

[ Add Finding ]
```

## No Hypotheses

```text
No hypotheses yet.

Turn your findings into intentional tests.

[ Create Hypothesis ]
```

---

# 28. Error States

Errors harus actionable.

Example:

```text
Gemini is temporarily unavailable.

Your current training session is safe and can
still be used without AI assistance.

[ Retry AI Connection ]
```

Writeup failure:

```text
We couldn't generate this training session.

The uploaded file is still available.

[ Retry Generation ]
[ Replace File ]
```

---

# 29. Responsive Behavior

Desktop:

```text
Sidebar + main content + optional right rail
```

Tablet:

- Sidebar dapat collapse.
- Right rail pindah di bawah main content.
- Phase stepper boleh horizontal-scroll.

Mobile bukan primary target MVP.

Jangan mengorbankan desktop information density demi mobile.

---

# 30. Frontend Acceptance Criteria

Frontend dianggap sesuai specification jika:

1. Semua 8 main routes tersedia.
2. Semua halaman menggunakan shared AppShell.
3. Training Session bersifat schema-driven.
4. Tidak ada machine-specific React page.
5. Tidak ada service-specific React page requirement.
6. Unknown service dapat dirender melalui generic group.
7. Dynamic checklist dapat muncul tanpa full page reload.
8. Checklist provenance dapat dijelaskan ke user.
9. Hidden solution tidak dirender sebelum session completion.
10. Phase Gate memiliki explicit warning interaction.
11. Findings, Hypotheses, Notes, dan Attempts memiliki dedicated UI.
12. AI unavailable tidak menghancurkan existing Training Session UI.
13. Loading, error, dan empty states tersedia.
14. Layout sesuai dark technical visual language.
15. UI tidak menggunakan generic AI SaaS styling atau cyberpunk clichés.

---

# 31. Route Summary

```text
/
Dashboard

/training
Training Sessions

/training/new
New Training

/training/[sessionId]
Training Session

/training/[sessionId]/review
Session Review

/methodology
Methodology

/knowledge
Knowledge Base

/settings
Settings
```

---

# 32. Product UI Summary

Frontend harus mengkomunikasikan tiga hal secara konsisten:

```text
WHERE AM I?
→ Phase / session context

WHAT SHOULD I DO?
→ Methodology checklist

WHY AM I DOING IT?
→ Purpose / mentor / knowledge

WHAT DID I FIND?
→ Findings

WHAT DO I THINK?
→ Hypotheses

WHAT DID I TRY?
→ Attempts

HOW AM I DOING?
→ Progress / Review
```

Final frontend principle:

> The interface should make disciplined methodology feel easier than random experimentation.
