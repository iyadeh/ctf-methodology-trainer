# Product Requirements Document
# CTF Methodology Trainer

**Version:** 0.3  
**Status:** MVP Definition / Product Source of Truth  
**Product Type:** Local-first cybersecurity training companion  
**Primary User:** Individual cybersecurity learner / penetration tester  
**Primary Methodology:** PTES adapted for CTF  
**Primary AI Provider:** Gemini Developer API  
**Primary Platform:** Desktop-oriented local web application  

---

# 1. Product Summary

CTF Methodology Trainer adalah aplikasi pembelajaran cybersecurity yang membantu user menyelesaikan vulnerable machine atau CTF menggunakan workflow penetration testing yang sistematis.

Aplikasi tidak bertujuan memberikan walkthrough secara langsung.

User hanya mengunggah writeup sebuah machine.

Writeup kemudian dianalisis oleh AI secara tersembunyi untuk menghasilkan machine-specific hidden knowledge seperti:

- services;
- attack surface;
- vulnerabilities;
- credentials;
- dependencies;
- initial access;
- privilege escalation;
- attack path.

Hidden knowledge tersebut digunakan sebagai **answer key internal**, bukan sebagai roadmap yang langsung ditampilkan kepada user.

User tetap melakukan penetration testing sendiri menggunakan environment seperti Kali Linux.

Aplikasi bertugas menjaga agar user bekerja berdasarkan methodology, mencatat evidence, membangun hypothesis, menguji hypothesis, dan mendapatkan guidance secara progresif jika mengalami kebuntuan.

Core flow:

Writeup
→ AI Analysis
→ Hidden Machine Knowledge
→ PTES Methodology
→ Training Session
→ Evidence
→ Findings
→ Hypotheses
→ Attempts
→ Exploitation
→ Post Exploitation
→ Reporting
→ Session Review

---

# 2. Product Vision

Tujuan utama aplikasi bukan:

> membantu user mendapatkan root secepat mungkin.

Tujuan utama aplikasi adalah:

> membentuk kebiasaan penetration testing yang sistematis, evidence-driven, hypothesis-driven, tidak terburu-buru, dan dapat digunakan kembali pada machine lain.

Mental model yang ingin dibentuk:

Observe
→ Enumerate
→ Record Evidence
→ Analyze
→ Form Hypothesis
→ Validate
→ Exploit
→ Enumerate Again
→ Escalate
→ Document
→ Review

Bukan:

Nmap
→ Gobuster
→ Exploit
→ LinPEAS
→ Root

Machine boleh berubah.

Framework kerja user harus tetap konsisten.

---

# 3. Product Principles

## 3.1 Method Before Exploit

User harus memahami attack surface sebelum melakukan exploitation.

## 3.2 Evidence Before Action

Tindakan harus didasarkan pada evidence yang ditemukan.

## 3.3 Hypothesis Before Random Testing

User didorong menjelaskan:

- apa yang ditemukan;
- apa yang diduga;
- mengapa dugaan tersebut masuk akal;
- bagaimana dugaan akan diuji;
- hasil apa yang diharapkan.

## 3.4 Enumeration Before Assumption

User tidak boleh diarahkan langsung ke exploit hanya karena hidden solution sudah diketahui aplikasi.

## 3.5 Framework Over Machine

Machine-specific attack path dapat berubah.

Methodology tetap menjadi framework utama.

## 3.6 Guidance Without Spoilers

Aplikasi memberikan bantuan sekecil mungkin yang masih memungkinkan user melanjutkan proses belajar.

## 3.7 AI Assists, Methodology Decides

AI membantu:

- memahami writeup;
- menginterpretasikan context;
- memberi hint;
- menjelaskan konsep;
- memberikan contextual suggestion.

AI tidak menjadi source of truth application state.

## 3.8 Dynamic Knowledge, Stable Interface

Machine dan checklist dapat berubah.

Layout dan vocabulary frontend tetap stabil.

---

# 4. Problem Statement

Saat mengerjakan vulnerable machine atau CTF, learner sering:

- terburu-buru menuju exploitation;
- menggunakan tools tanpa memahami objective;
- melewatkan enumeration penting;
- melakukan random testing;
- tidak mencatat evidence;
- tidak membangun attack hypothesis;
- mencoba exploit sebelum memahami attack surface;
- bergantung pada walkthrough;
- menghafal command tanpa memahami methodology;
- sulit mentransfer pengalaman dari satu machine ke machine lain.

Guided Mode pada beberapa training platform dapat membantu, tetapi:

- tidak tersedia untuk semua machine;
- dapat membutuhkan subscription;
- hanya tersedia pada platform tertentu;
- machine retired dapat tidak dapat diakses;
- guidance biasanya dibuat manual untuk setiap machine.

CTF Methodology Trainer mengatasi masalah tersebut dengan menggunakan writeup sebagai hidden answer key dan methodology sebagai workflow utama.

---

# 5. Target User

MVP merupakan single-user application.

Primary persona:

- cybersecurity learner;
- aspiring penetration tester;
- software developer yang belajar security;
- security engineer;
- CTF learner.

User biasanya:

- menggunakan Kali Linux;
- menjalankan vulnerable VM melalui VirtualBox atau VMware;
- menggunakan HackMyVM, VulnHub, atau lab serupa;
- memiliki writeup machine;
- ingin belajar methodology tanpa membaca solution secara langsung.

---

# 6. Product Scope

MVP menangani:

- writeup ingestion;
- hidden machine knowledge generation;
- PTES-based training workflow;
- dynamic checklist;
- findings;
- hypotheses;
- attempts;
- notes;
- progressive hints;
- AI Mentor;
- phase gates;
- session progress;
- session review.

---

# 7. Non-Goals

MVP bukan:

- CTF hosting platform;
- vulnerable VM provider;
- virtualization manager;
- automatic exploitation framework;
- collaborative pentesting environment;
- public SaaS;
- social platform.

MVP tidak akan:

- mengupload VM;
- menjalankan VM;
- mengontrol VMware;
- mengontrol VirtualBox;
- mendownload machine otomatis;
- menjalankan attack command ke target;
- melakukan exploitation otomatis;
- menyediakan multi-user authentication;
- menyediakan leaderboard;
- menyediakan mobile application.

---

# 8. High-Level User Journey

Untuk satu machine:

1. User memilih New Training.
2. User mengunggah writeup.
3. Sistem mengekstrak document text.
4. Gemini mengekstrak machine facts.
5. Sistem membangun Hidden Attack Graph.
6. Automated Verifier mengecek graph.
7. Hidden knowledge disimpan.
8. Training Session dibuat.
9. User memasukkan target IP.
10. Reconnaissance dimulai.
11. User menemukan evidence.
12. Evidence menghasilkan context.
13. Context mengaktifkan relevant playbooks.
14. Dynamic checklist berkembang.
15. User mencatat findings.
16. User membuat hypotheses.
17. User melakukan attempts.
18. User berpindah phase melalui Phase Gate.
19. User dapat meminta progressive hints.
20. AI Mentor memberikan contextual assistance.
21. User memperoleh initial access.
22. Post Exploitation checklist aktif.
23. User memperoleh objective/root.
24. User menandai session selesai.
25. Hidden Reference Path dibuka.
26. User Path dibandingkan Reference Path.
27. Methodology Review ditampilkan.
28. Session disimpan ke Learning History.

---

# 9. New Training

User membuka:

Dashboard
→ New Training

UI minimal:

New Training

Upload Writeup

[ Drop PDF / TXT / MD here ]

Framework:
PTES — CTF Adapted

[ Generate Training ]

User tidak perlu memasukkan:

- machine file;
- OVA;
- VMDK;
- VDI;
- HackMyVM URL;
- VMware configuration;
- VirtualBox configuration.

---

# 10. Supported Writeup Formats

MVP mendukung:

- PDF;
- TXT;
- Markdown.

Future support dapat mencakup:

- DOCX;
- HTML;
- web URL import.

---

# 11. Writeup Processing Pipeline

Pipeline:

Writeup Upload
→ File Validation
→ Document Parser
→ Text Extraction
→ Text Normalization
→ Fact Extraction
→ Attack Graph Generation
→ Automated Verification
→ Hidden Knowledge Storage
→ Training Session Creation

User hanya melihat processing status.

Contoh:

Preparing Training

✓ Document parsed  
✓ Machine knowledge extracted  
✓ Attack path modeled  
✓ Guide verified  
✓ Training ready  

[ Start Training ]

Solution detail tidak ditampilkan.

---

# 12. AI Fact Extraction

Gemini mengekstrak structured machine facts.

Possible facts:

## Machine Metadata

- machine name;
- platform;
- operating system;
- difficulty;
- author.

## Network

- ports;
- protocols;
- services;
- service versions.

## Application

- web technologies;
- frameworks;
- CMS;
- authentication surfaces;
- APIs.

## Findings

- files;
- directories;
- endpoints;
- users;
- credentials;
- hashes;
- configuration files;
- sensitive resources.

## Vulnerabilities

- misconfigurations;
- known vulnerabilities;
- CVEs;
- access-control weaknesses;
- credential exposure;
- insecure permissions.

## Attack Path

- discovery dependencies;
- initial access;
- lateral movement if relevant;
- privilege escalation;
- final objective.

Output harus structured JSON.

---

# 13. AI Trust Boundary

Semua AI-generated structured data wajib melewati:

Gemini
→ Structured Output
→ Zod Validation
→ Application Logic
→ Database

AI output tidak boleh langsung menjadi trusted application state.

Jika validation gagal:

- repair;
- retry;
- atau tandai generation failed.

---

# 14. Hidden Machine Knowledge

Hidden Machine Knowledge merupakan internal knowledge hasil writeup analysis.

Terdiri dari:

- extracted facts;
- attack graph;
- solution checkpoints;
- attack dependencies;
- vulnerability relationships;
- reference attack path.

Hidden knowledge:

- server-side only;
- tidak dikirim penuh ke browser;
- tidak disimpan ke browser storage;
- tidak digunakan untuk langsung mengaktifkan visible checklist;
- hanya digunakan sesuai spoiler policy.

---

# 15. Hidden Attack Graph

Attack Graph merepresentasikan machine-specific solution dependency.

Contoh:

Port Discovery
→ HTTP Enumeration
→ Content Discovery
→ Sensitive Backup
→ Credential Exposure
→ SSH
→ Local Enumeration
→ Sudo Misconfiguration
→ Root

Graph dapat memiliki branching:

HTTP
├── Directory Enumeration
└── Client-Side Analysis
        ↓
   Credential Discovery
        ↓
       SSH

Attack Graph merupakan machine-specific source of truth.

Attack Graph bukan methodology source of truth.

---

# 16. Automated Graph Verification

User tidak melakukan manual review terhadap generated attack graph karena dapat menyebabkan spoiler.

Sistem menggunakan automated verification.

Verifier memeriksa:

- missing critical steps;
- unsupported nodes;
- incorrect dependencies;
- hallucinated findings;
- incorrect initial access;
- incorrect privilege escalation;
- inconsistent ordering.

Verifier menghasilkan:

- confidence score;
- missing_steps[];
- unsupported_steps[];
- conflicts[];
- verification status.

Possible statuses:

- Validated
- Low Confidence
- Failed

Training tidak boleh dibuat secara silently dari invalid graph.

---

# 17. Spoiler Levels

Progressive spoiler levels:

## Level 0 — Methodology

Memberikan framework guidance.

Example:

"Pastikan semua exposed services sudah dienumerasi sebelum berpindah ke exploitation."

## Level 1 — Concept

Example:

"Web application dapat memiliki resource yang tidak ditampilkan melalui navigasi utama."

## Level 2 — Technique

Example:

"Pertimbangkan melakukan content discovery."

## Level 3 — Tool

Example:

"Tool seperti ffuf, feroxbuster, atau gobuster dapat digunakan."

## Level 4 — Machine Context

Memberikan contextual machine-specific hint.

## Level 5 — Partial Solution

Memberikan sebagian solution path.

## Level 6 — Full Reveal

Memberikan explicit solution.

Default:

Spoiler Level 0.

---

# 18. PTES Methodology

MVP menggunakan PTES yang diadaptasi untuk CTF.

`Lab Setup / Pre-Engagement` adalah langkah persiapan lab dan target sebelum learner memasuki metodologi Training Session. Langkah ini tetap penting, tetapi bukan `FrameworkPhase` ketujuh dan tidak memiliki Phase Gate.

```text
Lab Setup / Pre-Engagement (persiapan)
        ↓
Training Session dimulai
        ↓
Enam FrameworkPhase kanonis
```

PTES — CTF Adapted menggunakan tepat enam `FrameworkPhase`, dalam urutan berikut:

1. Reconnaissance
2. Threat Modeling
3. Vulnerability Analysis
4. Exploitation
5. Post Exploitation
6. Reporting

Intelligence gathering termasuk pekerjaan Reconnaissance, bukan fase terpisah. Methodology Engine, Phase Gate, dan UI utama bekerja pada enam fase tersebut.

---

# 19. Methodology Engine

Methodology Engine harus deterministic.

Responsibilities:

- phase state;
- checklist priority;
- checklist status;
- phase completion;
- phase gates;
- progress calculation;
- methodology deviations;
- checklist lifecycle.

AI tidak boleh secara langsung mengubah methodology state.

---

# 20. Core Methodology Checklist

Core checklist relatif stabil lintas machine.

Example Reconnaissance:

- Confirm target reachability
- Perform initial port enumeration
- Perform full TCP enumeration
- Identify exposed services
- Identify service versions
- Map attack surface
- Record findings
- Summarize reconnaissance

Checklist mendeskripsikan objective atau technique.

Tidak harus memaksa tool tertentu.

Preferred:

"Perform content discovery."

Avoid:

"Run Gobuster."

---

# 21. Dynamic Checklist Composition

Checklist session tidak statis.

Checklist dapat berasal dari:

- core methodology;
- service playbook;
- OS playbook;
- contextual extension;
- AI-generated suggestion.

Composition:

PTES Core
+
Confirmed User Context
+
Relevant Playbooks
+
Contextual Extensions
=
Session Checklist

Checklist dapat berkembang selama assessment.

---

# 22. Schema-Driven Frontend

Frontend harus bersifat data-driven.

Frontend tidak memiliki dedicated machine-specific components.

Avoid:

- HttpChecklist.tsx
- SmbChecklist.tsx
- FtpChecklist.tsx
- RedisChecklist.tsx
- FriendlyMachinePage.tsx

Preferred generic components:

- PhaseSection
- ChecklistGroup
- ChecklistItem
- FindingCard
- HypothesisCard
- AttemptCard
- MentorPanel
- ProgressIndicator
- EvidenceBadge

Frontend hanya merender checklist schema.

Example:

session.checklistGroups.map(group =>
  render ChecklistGroup(group)
)

A previously unknown service must be displayable without frontend code changes.

---

# 23. Evidence Model

Tidak semua informasi dianggap sama.

Evidence dapat memiliki state:

## Observed

User mencatat observation.

## Inferred

AI atau system menyimpulkan sesuatu dari evidence.

## Confirmed

User atau deterministic validation mengonfirmasi information.

Hanya confirmed user-visible evidence yang boleh mengaktifkan machine-specific visible methodology.

---

# 24. Spoiler-Safe Checklist Activation

Hidden writeup knowledge tidak boleh langsung mengaktifkan checklist yang belum ditemukan user.

Example:

Hidden Graph knows:

HTTP exists.

User has not confirmed HTTP from learner-visible evidence.

Result:

HTTP playbook remains hidden.

Port 80 dapat menjadi clue untuk enumeration, tetapi nomor port saja bukan bukti identitas service.

Setelah learner memperoleh dan mengonfirmasi evidence service yang terstruktur:

```text
evidenceState = confirmed
contextKind = service
contextValue = HTTP
        ↓
Context Engine
        ↓
service:http
```

HTTP Playbook dapat menjadi applicable melalui Playbook Resolver. Hidden Graph dan nomor port tidak boleh mengonfirmasi service atau mengaktifkan playbook secara otomatis.

Flow:

Hidden Knowledge
    X
    |
Cannot directly activate UI


Confirmed User Evidence
→ Context Engine
→ Playbook Resolver
→ Visible Checklist

---

# 25. Context Engine

Context Engine mengubah confirmed evidence menjadi structured assessment context.

Possible context tags:

service:http
service:ssh
service:smb
service:redis

protocol:https

os:linux
os:windows

surface:authentication
surface:web
surface:file-sharing
surface:api

access:remote
access:local-shell

technology:wordpress

Context Engine merupakan penghubung antara Findings dan Dynamic Methodology.

---

# 26. Context Normalization

Raw service names harus dinormalisasi.

Examples:

ssl/http
https
Apache over TLS

may normalize into:

service:http
protocol:https
encrypted:true

Examples:

Microsoft-IIS
nginx
Apache

may still activate:

service:http

Playbook resolver tidak boleh bergantung pada raw string secara langsung.

---

# 27. Playbook Registry

Application memiliki reusable Playbook Registry.

Possible built-in playbooks:

- HTTP
- HTTPS
- SSH
- FTP
- SMB
- DNS
- SNMP
- LDAP
- NFS
- SMTP
- database services
- Linux Post Exploitation
- Windows Post Exploitation

Playbook merupakan structured methodology data.

Bukan frontend component.

---

# 28. Service Playbook Example

HTTP Playbook:

- Inspect application manually
- Inspect response headers
- Identify technology stack
- Review application functionality
- Inspect client-side resources
- Perform content discovery
- Consider virtual host enumeration
- Identify authentication surfaces
- Record findings

---

# 29. Playbook Resolver

Flow:

Confirmed Context
→ Playbook Resolver

If known playbook exists:
→ Load Playbook

If no playbook exists:
→ Generic Fallback
→ Optional AI Contextual Extension

---

# 30. Unknown Service Handling

Aplikasi harus tetap usable ketika service baru ditemukan.

Example:

1883/tcp MQTT

Jika MQTT playbook belum tersedia:

MQTT Enumeration
Generic Playbook

- Confirm protocol/service identity
- Identify implementation/version
- Determine authentication requirements
- Identify exposed functionality
- Identify accessible resources
- Inspect permissions/security controls
- Record interesting behavior
- Develop attack hypotheses

Frontend tidak perlu perubahan code.

---

# 31. Generic Service Enumeration Playbook

Fallback methodology:

- Confirm service identity
- Confirm implementation/version
- Understand protocol purpose
- Determine authentication requirements
- Determine accessible functionality
- Enumerate accessible resources
- Inspect security controls
- Record anomalous behavior
- Develop attack hypotheses

Generic fallback memastikan aplikasi tetap berguna bahkan untuk unknown technologies.

---

# 32. AI Contextual Playbook Extension

Gemini dapat menghasilkan additional suggested checks jika:

- native playbook tidak tersedia;
- native playbook belum mencakup discovered context;
- service memiliki unusual implementation;
- new application surface ditemukan.

AI-generated extension harus:

- structured;
- Zod validated;
- spoiler-safe;
- methodology-oriented;
- tidak mengambil hidden solution sebagai visible clue;
- default sebagai Suggested.

AI-generated check tidak boleh otomatis menjadi Required.

---

# 33. Checklist Priority

Checklist memiliki priority:

## Required

Minimum deterministic methodology requirement.

Dapat memblokir Phase Gate.

## Recommended

Strong methodology practice.

Tidak memblokir Phase Gate.

Mempengaruhi coverage metrics.

## Suggested

Contextual exploration.

Tidak memblokir Phase Gate.

AI-generated checks secara default adalah Suggested.

---

# 34. Checklist Provenance

Setiap Session Check harus memiliki provenance.

Possible sources:

- core;
- playbook;
- contextual;
- ai-generated.

Example:

CORE  
Perform full TCP enumeration.

PLAYBOOK — HTTP  
Perform content discovery.

CONTEXTUAL  
Enumerate discovered virtual host.

AI SUGGESTED  
Review unusual HTTP method behavior.

---

# 35. Checklist Activation Provenance

Setiap dynamic check juga harus mengetahui apa yang mengaktifkannya.

Example:

activated_by:
finding_123

atau:

activated_by:
context_service_http

Hal ini penting untuk:

- debugging;
- session review;
- explainability.

---

# 36. Checklist Reconciliation

Dynamic checklist dapat menghasilkan overlapping checks.

Methodology Engine harus melakukan reconciliation.

Avoid:

- Identify service version
- Determine HTTP version
- Check web server version

Jika secara semantic sama.

Setiap methodology check harus memiliki stable semantic identifier.

Example:

service.http.version-identification

UI title dapat berbeda.

Identity tetap stabil.

---

# 37. Checklist Lifecycle

Session Check tidak boleh tiba-tiba hilang tanpa history.

Possible states:

- inactive;
- active;
- completed;
- skipped;
- superseded.

Jika context berubah, existing check tidak langsung dihapus.

Hal ini menjaga session history tetap dapat direkonstruksi.

---

# 38. Session Checklist Snapshot

Ketika checklist diaktifkan untuk suatu session, definition disimpan sebagai snapshot.

Perubahan global playbook di masa depan tidak boleh mengubah session lama.

Benefit:

- historical consistency;
- reproducible session review;
- stable metrics.

---

# 39. Playbook Versioning

Playbook mendukung simple versioning.

Example:

http@1
http@2

Session menyimpan versi playbook yang digunakan.

MVP tidak membutuhkan complex dependency management.

---

# 40. Reconnaissance Phase

Example core checklist:

- Confirm target
- Confirm target reachability
- Initial TCP enumeration
- Full TCP enumeration
- Service identification
- Version identification
- Attack surface mapping
- Record findings
- Recon summary

---

# 41. Service-Specific Enumeration

Setelah confirmed service ditemukan, relevant playbook aktif.

Example:

Detected:

22 SSH
80 HTTP

Visible methodology may expand into:

Reconnaissance

CORE
✓ Port enumeration
✓ Service identification

HTTP Enumeration
□ Inspect web application
□ Identify technologies
□ Perform content discovery
□ Review authentication surface

SSH Enumeration
□ Identify authentication surface
□ Record version/context

---

# 42. Threat Modeling

Threat Modeling bertujuan membangun reasoning.

Possible prompts:

- Service mana yang paling menarik?
- Apa trust boundaries yang terlihat?
- Mana authentication surface?
- Mana user-controlled input?
- Mana resource sensitif?
- Mana finding yang dapat menjadi attack hypothesis?
- Attack surface mana yang memiliki highest potential impact?

Threat Modeling untuk CTF harus ringan tetapi tetap meaningful.

---

# 43. Vulnerability Analysis

User mengubah evidence menjadi potential vulnerability.

Possible categories:

- information disclosure;
- authentication weakness;
- authorization weakness;
- injection;
- exposed files;
- vulnerable software;
- insecure configuration;
- insecure permissions;
- credential exposure;
- service misconfiguration.

Aplikasi harus membantu membedakan:

Observation
≠
Finding
≠
Vulnerability
≠
Exploit

---

# 44. Findings

Finding schema:

- title;
- category;
- evidence;
- source;
- importance;
- notes;
- evidence_state;
- created_at.

Example:

Title:
Exposed HTTP Service

Evidence:
TCP/80 Apache

Category:
Attack Surface

State:
Confirmed

---

# 45. Hypotheses

Hypothesis schema:

- based_on;
- hypothesis;
- reasoning;
- expected_result;
- test_approach;
- outcome.

Example:

Evidence:
Accessible backup directory.

Hypothesis:
Backup resources may expose sensitive configuration.

Expected Result:
Credentials or configuration material.

Test:
Inspect accessible backup content.

---

# 46. Attempts

Flow:

Hypothesis
→ Attempt
→ Result

Possible outcomes:

- Confirmed;
- Rejected;
- Inconclusive.

Attempt records may contain:

- action;
- notes;
- result;
- timestamp.

Goal:

- prevent repeated random testing;
- preserve reasoning history;
- support session review.

---

# 47. Notes

Notes merupakan free-form information.

Notes dapat digunakan untuk:

- temporary observations;
- command references;
- questions;
- reminders;
- manual notes.

Notes tidak otomatis menjadi Findings.

---

# 48. Phase Gates

User tidak dianjurkan berpindah phase sebelum Required checks selesai.

Example:

Reconnaissance Gate

Completed:
✓ Port enumeration
✓ Service identification

Missing:
□ Attack surface documented

Status:
NOT READY FOR NEXT PHASE

User dapat:

[ Return to Recon ]

atau:

[ Continue Anyway ]

Jika Continue Anyway:

MethodologyDeviation dicatat.

---

# 49. Phase Gate Rules

Hanya Required deterministic checks yang boleh memblokir gate.

Recommended:

- tidak memblokir;
- mempengaruhi coverage.

Suggested:

- tidak memblokir;
- hanya exploration.

AI-generated checks tidak boleh mengubah Phase Gate secara langsung.

---

# 50. Progress Calculation

Progress dihitung secara deterministic.

AI tidak menentukan percentage.

Example:

Required Progress:
completed required checks
/
activated required checks

Coverage dapat memasukkan Recommended checks secara terpisah.

Suggested checks tidak perlu menurunkan core progress.

---

# 51. Exploitation Phase

Exploitation dilakukan ketika evidence dan hypothesis cukup.

Preferred workflow:

Evidence
→ Finding
→ Hypothesis
→ Test
→ Confirmed
→ Exploitation

Aplikasi tidak boleh mendorong user menuju exact hidden solution hanya karena attack graph mengetahuinya.

---

# 52. Initial Access

Setelah initial access diperoleh, user dapat mencatat:

- access method;
- user;
- privilege level;
- evidence;
- timestamp.

Initial Access dapat mengaktifkan:

access:local-shell

dan OS-specific Post Exploitation playbook.

---

# 53. Post Exploitation

Example Linux checklist:

- Identify current user
- Identify groups
- Identify OS
- Inspect network configuration
- Inspect processes
- Inspect services
- Inspect local credentials
- Inspect sudo privileges
- Inspect SUID
- Inspect capabilities
- Inspect scheduled tasks
- Inspect writable locations
- Inspect configuration
- Develop privilege escalation hypotheses

Example Windows checklist:

- Identify current user
- Identify groups
- Inspect privileges
- Inspect services
- Inspect scheduled tasks
- Inspect installed software
- Inspect registry
- Inspect credentials
- Identify escalation hypotheses

---

# 54. Reporting

Reporting minimum:

- target;
- attack surface;
- findings;
- initial access;
- privilege escalation;
- attack path;
- evidence;
- root cause;
- impact;
- mitigation;
- methodology notes.

Reporting tetap ringan untuk MVP.

---

# 55. AI Mentor

AI Mentor tersedia selama session.

Context:

- current phase;
- active checklist;
- completed checks;
- findings;
- hypotheses;
- attempts;
- context tags;
- relevant hidden knowledge;
- spoiler level.

Core instruction:

> Give the least revealing guidance that enables meaningful progress.

---

# 56. AI Mentor Example

User:

"Saya menemukan SSH dan HTTP. Apakah langsung coba SSH?"

Preferred response:

"Sebelum melakukan authentication attempts, pastikan exposed services sudah dienumerasi dengan cukup dan attack surface sudah dipahami."

Avoid:

"HTTP adalah jalur utama. Cari /backup."

---

# 57. Progressive Hint System

Hint progression:

1. Methodology Hint
2. Concept Hint
3. Technique Hint
4. Tool Hint
5. Machine Context Hint
6. Partial Solution
7. Full Reveal

Semua hint dicatat.

---

# 58. Explain Concept

User dapat meminta AI menjelaskan:

- content discovery;
- IDOR;
- SUID;
- sudo;
- capabilities;
- authentication;
- privilege escalation;
- virtual hosts;
- SMB shares;
- dan konsep lainnya.

Concept explanation harus sebisa mungkin machine-agnostic.

---

# 59. Paste Output

MVP+ dapat mendukung Paste Output.

Possible inputs:

- Nmap;
- ffuf;
- feroxbuster;
- gobuster;
- smbclient;
- sudo -l;
- id;
- ss;
- netstat;
- process listings.

AI menghasilkan Candidate Observations.

Candidate Observation:

inferred

User kemudian dapat:

[ Confirm Finding ]

baru context diaktifkan.

AI tidak boleh otomatis mengubah checklist dari unconfirmed pasted output.

---

# 60. Session States

TrainingSession status:

- Not Started
- In Progress
- Paused
- Completed

Session stores:

- target IP;
- started_at;
- completed_at;
- current phase;
- checklist snapshot;
- findings;
- hypotheses;
- attempts;
- notes;
- hints;
- methodology deviations;
- activated contexts.

Target IP merupakan Session data.

Bukan Machine permanent data.

---

# 61. Session Completion

MVP menggunakan manual completion confirmation.

Possible objective:

- User flag
- Root flag
- Administrator
- Challenge objective

User clicks:

[ Complete Machine ]

Setelah completion:

- session locked as completed;
- reference solution can be revealed;
- review generated.

---

# 62. Reference Path Reveal

Hidden Attack Graph tetap terkunci selama assessment.

After completion:

Reference Path
Unlocked

User dapat melihat writeup-derived attack path.

---

# 63. User Path

User Path direkonstruksi dari:

- findings;
- hypotheses;
- attempts;
- initial access;
- privilege escalation;
- timestamps.

User Path tidak harus identik dengan Reference Path.

Alternative valid path tetap dianggap legitimate.

---

# 64. Session Review

Session Review membandingkan:

User Process
vs
Reference Machine Path

Tujuan bukan menentukan:

"Apakah user mengikuti writeup?"

Tujuannya:

"Apakah user bekerja dengan methodology yang baik?"

---

# 65. Deterministic Review Metrics

Semua numeric score harus explainable.

AI tidak boleh membuat arbitrary scores.

Possible metrics:

## Recon Coverage

completed required/recommended recon checks
/
activated required/recommended recon checks

## Phase Gate Compliance

phases entered without override
/
total gated transitions

## Hypothesis Discipline

validated attack attempts associated with hypotheses
/
relevant attack attempts

## Documentation Coverage

documented meaningful findings
/
confirmed session findings

## Hint Usage

count from Hint records.

## Solution Reveal

count from spoiler level escalation.

AI boleh membuat narrative summary dari metrics.

Angka tetap deterministic.

---

# 66. Methodology Review Example

Recon Coverage:
92%

Phase Gate Compliance:
83%

Hypothesis Discipline:
76%

Documentation Coverage:
88%

Hints Used:
3

Machine-Specific Hints:
1

Full Solution Reveals:
0

Phase Overrides:
1

---

# 67. Improvement Feedback

System dapat menunjukkan:

Areas to Improve

- Full service enumeration completed late.
- Threat Modeling skipped before first authentication attempt.
- Scheduled task enumeration not completed.
- Multiple attempts were performed without recorded hypotheses.

Feedback harus grounded pada session data.

---

# 68. Learning History

Completed sessions disimpan.

Dashboard dapat menampilkan:

Friendly
Completed
100%

Baseme
In Progress
28%

Machine history menyimpan:

- findings;
- hypotheses;
- attempts;
- hints;
- notes;
- methodology metrics;
- reference path;
- report.

---

# 69. Dashboard

Primary Dashboard:

- New Training
- Continue Session
- Recent Sessions
- Completed Sessions
- Methodology Progress

---

# 70. Main Navigation

Suggested navigation:

- Dashboard
- Training Sessions
- New Training
- Methodology
- Knowledge Base
- Settings

---

# 71. Session Navigation

Session tabs:

- Training
- Notes
- Findings
- Hypotheses
- Progress
- Resources

---

# 72. Dynamic Frontend Requirement

Frontend layout harus tetap usable ketika:

- machine berbeda;
- jumlah phase checks berbeda;
- service berbeda;
- unknown service muncul;
- playbook baru ditambahkan;
- AI memberikan contextual suggestions.

Acceptance criterion:

> A previously unknown service can be rendered inside an existing Training Session without requiring a frontend code change.

---

# 73. Visual Direction

Primary theme:

Dark mode.

Character:

- professional;
- technical;
- restrained;
- readable;
- slightly rounded;
- information-dense;
- security-tool oriented.

Primary accent:

Green.

Secondary accents hanya untuk:

- status;
- warning;
- information;
- error.

Avoid:

- excessive gradients;
- neon cyberpunk;
- Matrix visual style;
- glow;
- glassmorphism;
- giant typography;
- excessive pill components;
- excessive rounded cards;
- generic AI SaaS visual patterns;
- decorative dashboard charts;
- heavy shadows.

---

# 74. UX for Dynamic Checklist Changes

Checklist yang baru aktif harus terlihat jelas.

Possible UI:

NEW

Context:
HTTP detected

+ 4 enumeration checks activated

Checklist tidak boleh berubah tanpa visual explanation.

---

# 75. Checklist UI Provenance

UI dapat secara subtle menunjukkan:

CORE

PLAYBOOK — HTTP

CONTEXTUAL

AI SUGGESTED

Tujuannya agar user memahami mengapa checklist tersebut muncul.

---

# 76. Technology Stack

## Application

- Next.js
- App Router
- TypeScript

## UI

- Tailwind CSS
- shadcn/ui

## Database

- PostgreSQL

## ORM

- Drizzle ORM

## Validation

- Zod

## AI

- Gemini Developer API

## Package Manager

- pnpm

## Source Control

- Git
- GitHub

---

# 77. Development Tooling

Development menggunakan:

- Codex
- Caveman
- Taste Skill

Tool tersebut bukan runtime dependencies.

## Codex

Coding agent utama.

## Caveman

Digunakan untuk membuat agent output lebih ringkas dan focused.

## Taste Skill

Digunakan untuk menjaga visual quality dan menghindari generic AI frontend.

---

# 78. AI Architecture

AI responsibilities:

Gemini
├── Fact Extractor
├── Attack Graph Generator
├── Graph Verifier
├── Contextual Playbook Extender
├── Hint Generator
├── Concept Explainer
└── Mentor

Tidak menggunakan satu giant prompt.

---

# 79. Runtime AI Context

Mentor request dapat menggunakan:

Framework State
+
Session Checklist
+
Confirmed Context
+
Findings
+
Hypotheses
+
Attempts
+
Relevant Hidden Graph Portion
+
Spoiler Policy

Tidak perlu mengirim seluruh original writeup pada setiap request.

---

# 80. AI Usage Efficiency

Writeup diproses sekali.

Output structured disimpan.

Mentor menggunakan structured context.

Avoid:

sending full 20-page writeup on every mentor message.

---

# 81. Generation Idempotency

Writeup processing harus idempotent.

Generate:

Writeup Hash
→ Generation Run
→ Facts
→ Attack Graph
→ Verification

Reload page tidak boleh memicu regeneration otomatis.

---

# 82. Generation Caching

Jika writeup yang sama sudah pernah diproses:

system dapat menggunakan cached generation.

User dapat memilih:

[ Regenerate ]

Regeneration menghasilkan generation version baru.

---

# 83. AI Provenance

AI-generated knowledge harus memiliki provenance.

Example:

Fact:
Credential discovered

source:
writeup

confidence:
0.94

source_reference:
document section

Checklist:

source:
ai-generated

activated_by:
context_service_mqtt

Tujuannya:

- debugging;
- reliability;
- explainability.

---

# 84. AI Failure Handling

If Gemini unavailable:

Existing Training Session tetap usable.

Available features:

- PTES Core
- Built-in playbooks
- Findings
- Hypotheses
- Attempts
- Notes
- Progress
- Phase Gates

Temporarily unavailable:

- AI Mentor;
- AI-generated contextual extension;
- AI concept explanation;
- new AI hints.

Core methodology tidak boleh bergantung penuh pada AI.

---

# 85. New Training AI Dependency

New Training membutuhkan AI untuk:

- machine fact extraction;
- attack graph generation;
- automated verification.

Jika AI tidak tersedia:

Training generation dapat ditunda.

Existing sessions tetap usable.

---

# 86. Rate Limit Handling

Gemini rate limit dapat terjadi.

System harus:

- menangkap 429;
- menampilkan clear error;
- menyediakan Retry;
- tidak melakukan uncontrolled automatic retry;
- tidak kehilangan session state.

---

# 87. Security Requirements

Gemini API key:

server-side only.

Allowed:

GEMINI_API_KEY=...

Not allowed:

NEXT_PUBLIC_GEMINI_API_KEY=...

Hidden knowledge tidak boleh berada di:

- client bundle;
- localStorage;
- exposed API response;
- page source.

---

# 88. Trust Boundaries

Gunakan validation pada:

- uploaded file metadata;
- extracted document content;
- AI structured output;
- form input;
- API request;
- dynamic checklist definitions.

---

# 89. Core Domain Model

Primary entities:

Writeup

GenerationRun

MachineProfile

AttackGraph
- AttackNode
- AttackEdge

Framework
- FrameworkPhase
- FrameworkCheck

Playbook
- PlaybookCheck

TrainingSession
- SessionPhase
- SessionCheck

Finding

Hypothesis

Attempt

Hint

Note

MethodologyDeviation

ContextObservation

---

# 90. High-Level Domain Relationships

Writeup
→ GenerationRun
→ MachineProfile
→ AttackGraph

Framework
→ FrameworkPhase
→ FrameworkCheck

Playbook
→ PlaybookCheck

TrainingSession
├── SessionPhase
├── SessionCheck
├── Finding
├── Hypothesis
├── Attempt
├── Hint
├── Note
├── ContextObservation
└── MethodologyDeviation

---

# 91. Local-First Architecture

Primary deployment:

localhost.

Environment:

Windows Host
├── CTF Methodology Trainer
├── PostgreSQL
├── Browser
└── Virtualization
    ├── Kali Linux
    └── Vulnerable Target VM

Target VM tidak dikelola aplikasi.

---

# 92. Performance Requirements

Normal application interaction:

target perceived latency < 500 ms.

AI operations dapat lebih lambat.

AI operations harus memiliki:

- loading state;
- progress state jika relevan;
- failure state;
- retry.

---

# 93. Accessibility

Frontend harus memperhatikan:

- semantic HTML;
- keyboard navigation;
- visible focus state;
- readable contrast;
- accessible form labels;
- meaningful status text;
- status tidak hanya menggunakan warna.

---

# 94. Responsive Requirements

Primary target:

Desktop >= 1280px.

Secondary:

Tablet.

Mobile:

Not primary MVP target.

---

# 95. MVP Success Criteria

MVP dianggap berhasil jika user dapat:

1. membuka aplikasi lokal;
2. membuat New Training;
3. mengupload writeup;
4. Gemini mengekstrak machine facts;
5. Hidden Attack Graph dihasilkan;
6. graph diverifikasi;
7. Training Session dibuat;
8. user memasukkan target IP;
9. user mengikuti PTES workflow;
10. dynamic checklist bekerja;
11. service-specific playbook dapat aktif;
12. unknown service tetap dapat ditangani;
13. user mencatat finding;
14. user membuat hypothesis;
15. user mencatat attempt;
16. Context Engine bekerja;
17. spoiler-safe activation bekerja;
18. Phase Gate bekerja;
19. progressive hint bekerja;
20. AI Mentor memahami session context;
21. hidden solution tidak bocor secara default;
22. user menyelesaikan machine;
23. reference path dapat dibuka;
24. methodology metrics dihitung;
25. session review ditampilkan;
26. session tetap tersimpan setelah application restart.

---

# 96. Architecture Acceptance Criteria

Architecture dianggap benar jika:

- adding a new machine requires no frontend page;
- adding a new playbook requires no new frontend component;
- unknown service can render using generic fallback;
- AI-generated checklist does not directly control Phase Gate;
- hidden writeup facts cannot activate visible checklist;
- session history remains stable after playbook updates;
- AI downtime does not break existing session workflow;
- progress metrics remain deterministic.

---

# 97. Explicit Anti-Patterns

Do not implement:

if service === "http"
  render HttpChecklist()

if service === "smb"
  render SmbChecklist()

Do not allow:

HiddenGraph
→ directly activate checklist

Do not allow:

Gemini
→ set phaseComplete = true

Do not allow:

AI suggested check
→ required Phase Gate check

Do not allow:

playbook update
→ silently rewrite old session checklist

---

# 98. Development Principles

- Prefer simple explicit architecture.
- Avoid premature abstraction.
- Avoid unnecessary dependencies.
- Separate domain logic from UI.
- Keep methodology deterministic.
- Keep hidden knowledge server-side.
- Validate AI output.
- Preserve session history.
- Prefer schema-driven rendering.
- Prefer stable semantic identifiers.
- Keep AI replaceable but do not overengineer provider abstraction.

---

# 99. MVP Development Roadmap

Roadmap ini menentukan **urutan delivery engineering**, bukan mengubah requirement produk pada bagian 1–98 dan 100–103. Stage yang disebut di sini adalah capability yang harus dibangun; status implementasi aktual dicatat pada `docs/IMPLEMENTATION_GUIDE.md`. Nomor Stage mengikuti urutan linear berikut.

## Stage 01 — Foundation

- Siapkan Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, pnpm, Git, design token dasar, dan quality scripts.
- Fondasi ini diperlukan sebelum halaman serta modul domain dibangun.

## Stage 02 — App Shell

- Buat root layout, sidebar, top bar, navigasi bersama, aksesibilitas dasar, dan route placeholder.
- Bergantung pada Foundation.

## Stage 03 — Dashboard

- Buat overview, tindakan New Training, recent sessions, dan tampilan progress menggunakan typed demo data sementara.
- Bergantung pada App Shell; data persisten dihubungkan pada Stage lanjutan.

## Stage 04 — Training Sessions

- Buat browser sesi dengan pencarian, filter, sort, status, progress, dan tindakan per sesi memakai typed demo data sementara.
- Bergantung pada App Shell; read model persisten tersedia setelah Stage 09 dan diintegrasikan pada Stage 14.

## Stage 05 — New Training UI

- Buat file drop zone PDF/TXT/MD, validasi browser, pemilihan PTES, serta state processing/error/ready sebagai presentasi UI.
- Upload server dan generation nyata baru dibuat pada Stage 15–20.

## Stage 06 — Database Foundation

- Jalankan PostgreSQL lokal melalui Docker Compose dengan volume persisten; siapkan koneksi Drizzle, environment, dan database scripts.
- Menjadi prasyarat schema relasional.

## Stage 07 — Core Domain Model

- Bentuk schema dan migration awal untuk Framework, FrameworkPhase, FrameworkCheck, TrainingSession, SessionPhase, SessionCheck, Finding, Hypothesis, Attempt, Note, dan MethodologyDeviation.
- Domain tambahan dibuat saat capability terkait diperlukan, bukan sebagai tabel kosong.

## Stage 08 — PTES Methodology Engine

- Definisikan PTES — CTF Adapted, enam fase UI utama, core checks, semantic keys, priorities, Phase Gate, progress deterministik, dan seed kanonis idempotent.
- Bergantung pada Framework schema Stage 07; AI tidak menentukan state metodologi.

## Stage 09 — Training Session Core

- Buat session dari snapshot Framework, lifecycle start/pause/resume, target IP, mutation checks, phase transition, override deviation, aggregate read, dan progress.
- Bergantung pada Stage 08; completion final tetap Stage 23.

## Stage 10 — Findings / Hypotheses / Attempts

- Simpan evidence dan reasoning learner, confirmation eksplisit, validasi Zod, ownership antarsesi, serta aggregate read.
- Bergantung pada Training Session Core; confirmation belum mengaktifkan playbook.

## Stage 11 — Context Engine

- Derivasi context kanonis dari confirmed structured user evidence, exact alias normalization, ContextObservation provenance, SessionContext, dan reconciliation multi-sumber.
- Bergantung pada Findings; hidden facts tidak boleh membuat visible context.

## Stage 12 — Playbook Registry

- Definisikan typed playbooks dan checks, activation requirements, versioning sederhana, resolver, serta Generic Service Enumeration fallback.
- Sediakan playbook native HTTP, SSH, SMB, FTP, DNS, SNMP, LDAP, NFS, SMTP, dan Linux/Windows Post Exploitation sesuai lingkup MVP.
- Bergantung pada canonical context; playbook adalah data metodologi, bukan komponen React.

## Stage 13 — Dynamic Checklist Engine

- Komposisikan PTES core, confirmed context, dan playbook menjadi SessionCheck snapshot dengan provenance, activation reason/time, lifecycle, semantic deduplication, dan reconciliation historis.
- Unknown service memakai Generic Service fallback; perubahan playbook global tidak menulis ulang sesi lama.
- Siapkan jalur menerima AI contextual extension yang tervalidasi dan `suggested`; generation AI-nya baru hadir pada Stage 22 setelah Gemini serta spoiler policy tersedia.

## Stage 14 — Training Session UI Integration

- Hubungkan halaman `/training/[sessionId]` dan daftar sesi ke server read/mutation use cases, generic checklist groups, Phase Gate dialog, progress, Findings, Hypotheses, Attempts, dan Notes.
- Tambahkan persistence/use case Notes yang belum tersedia; UI menampilkan provenance serta perubahan checklist tanpa full page reload.
- Bergantung pada session, evidence, context, dan dynamic checklist; hidden knowledge tidak dikirim ke client.

## Stage 15 — Writeup Upload & Parsing

- Implementasi upload server PDF/TXT/Markdown, validasi type/extension/size/empty content, document parsing, text extraction/normalization, dan metadata writeup.
- Jangan mengeksekusi konten unggahan; hasil normalized text menjadi input Stage 17.

## Stage 16 — Gemini Foundation

- Siapkan client Gemini server-side, model configuration, structured output contract, validasi Zod, error/429 handling, Retry eksplisit, dan batas secret.
- Existing sessions serta metodologi/playbook tetap berguna saat Gemini gagal.

## Stage 17 — Fact Extraction

- Ekstrak structured machine facts dari normalized writeup: profile, ports/services, vulnerabilities, credentials, dependencies, dan attack path evidence.
- Validasi Zod serta provenance/source references sebelum menyimpan hidden machine knowledge.

## Stage 18 — Hidden Attack Graph

- Bentuk AttackGraph, AttackNode, AttackEdge, dependency/branching, spoiler level, dan reference path dari facts tervalidasi.
- Graph tetap server-side; tidak langsung mengaktifkan visible checklist.

## Stage 19 — Graph Verification

- Jalankan Automated Verification terhadap writeup, facts, dan graph: missing steps, unsupported nodes, conflicts, ordering, serta confidence/status.
- Graph `failed` tidak boleh diam-diam menghasilkan TrainingSession; verification mendahului orchestration Stage 20.

## Stage 20 — Training Generation Orchestration

- Orkestrasi parsing, extraction, graph, verification, hidden knowledge storage, dan session creation menjadi GenerationRun berstatus jelas.
- Terapkan fingerprint/idempotency, retry, generation history, reuse/cache bila sesuai, serta progress/error/ready state nyata.
- Bahan UI “Machine Profile”, methodology tasks, hints, dan learning resources disiapkan tanpa membuka solution ke browser.

## Stage 21 — Guidance / Spoiler Engine

- Implementasikan spoiler levels 0–6, context minimization, guidance policy, dan pemilihan hanya hidden graph fragment yang boleh terlihat.
- Metodologi tetap menentukan state; hint tidak membuat Finding confirmed atau check completed.
- Menjadi prasyarat AI Mentor dan extension yang spoiler-safe.

## Stage 22 — AI Mentor / Hints

- Sediakan AI Mentor, contextual question, concept explanation, progressive hints, explicit escalation, serta Hint records/counters.
- AI contextual playbook extension dari confirmed visible context melewati Zod dan spoiler policy; semua AI-generated checks default `suggested` dan tidak memblokir Phase Gate.
- Tangani kegagalan/rate limit tanpa merusak sesi yang sudah ada.

## Stage 23 — Session Completion

- Sediakan manual completion confirmation, objective evidence, timestamp/state selesai, dan penguncian assessment sesuai aturan produk.
- Reveal Reference Path hanya setelah completion; sebelum itu path tidak dirender, dipreload, atau dikirim ke browser.
- Bergantung pada validated hidden graph dan spoiler boundary.

## Stage 24 — Session Review

- Rekonstruksi User Path dari learner records, bandingkan dengan Reference Path setelah completion, hitung deterministic methodology/review metrics, hint/reveal/override counts, dan tampilkan improvement feedback.
- AI boleh membantu narrative review, bukan membuat angka atau menolak alternative valid path.

## Stage 25 — Knowledge Base

- Buat halaman referensi yang menggunakan Playbook Registry sebagai satu sumber konten runtime dan pembelajaran.
- Search/category/detail UI tidak menduplikasi definisi playbook secara manual.

## Stage 26 — Methodology Page

- Buat halaman referensi PTES yang merender Framework/FrameworkPhase/FrameworkCheck yang sama dengan Training Engine.
- Konten reference tidak mengubah SessionCheck historis.

## Stage 27 — Settings

- Sediakan pengaturan framework default, spoiler/hint behavior, Gemini model/status, tampilan/density/reduced motion, serta data/storage actions.
- API key tetap di environment server; operasi destruktif membutuhkan confirmation.

## Stage 28 — Reliability / Security / Polish

- Perkuat accessibility, responsive behavior, loading/empty/error/retry state, upload/AI failure handling, test penting, performance, security review, secret/hidden-data boundary, dan graceful AI degradation.
- Quality dan keamanan dasar tetap dijaga sejak Stage awal; tahap ini menguji keseluruhan alur.

## Stage 29 — MVP Acceptance

- Verifikasi end-to-end MVP Success Criteria (bagian 95), Architecture Acceptance Criteria (bagian 96), dan Core Product Rules (bagian 103).
- Buktikan unknown-service fallback serta penambahan playbook tanpa komponen frontend baru; hidden facts tidak mengaktifkan checklist; AI Suggested tidak memblokir gate; snapshot history stabil; sesi lama tetap berguna saat Gemini gagal; progress/review deterministik; Reference Path baru terbuka setelah completion; session persisten setelah restart.

### Keterlacakan capability yang digabung

| Capability produk | Stage delivery |
| --- | --- |
| Generic Service fallback dan Playbook Resolver | 12; aktivasi/snapshot pada 13 |
| Checklist provenance, lifecycle, reconciliation, spoiler-safe activation | 13; UI pada 14 |
| Notes use case dan UI | 14 |
| Writeup parsing serta normalized text | 15 |
| Structured Gemini output dan Zod | 16; Fact Extraction pada 17 |
| Hidden Attack Graph dan Automated Verification | 18–19 |
| GenerationRun, fingerprint, retry, serta generation history | 20 |
| Guidance policy dan spoiler levels | 21 |
| AI Contextual Playbook Extension, progressive hints, AI Mentor | 22 |
| Session Completion dan Reference Path Reveal | 23 |
| User Path, deterministic metrics, serta Session Review | 24 |
| Reusable Knowledge Base, Methodology Page, Settings | 25–27 |
| Accessibility, reliability, security review, dan MVP acceptance | 28–29 |

# 100. Future Features

Possible future additions:

## Additional Methodologies

- OWASP WSTG
- API Security Testing
- Active Directory
- Custom Web Pentest
- Cloud Security

## Paste Output Intelligence

Command Output
→ AI candidate observations
→ user confirmation
→ context activation

## Learning Analytics

Example:

"You frequently skip virtual host enumeration."

"You often enter exploitation before documenting the attack surface."

## Skill Tracking

HTTP Enumeration
80%

Linux Privilege Escalation
65%

SMB Enumeration
40%

## Local AI

Possible Ollama support.

## Reporting

Generate structured penetration-test style report from completed session.

---

# 101. Product Success Definition

The product is successful when repeated usage causes the user to naturally think:

"What phase am I currently in?"

"What evidence do I have?"

"What have I not enumerated yet?"

"What hypothesis am I testing?"

"What result do I expect?"

"What should I document?"

rather than:

"What tool should I run next?"

---

# 102. Product Definition

CTF Methodology Trainer is a methodology-driven cybersecurity training companion that converts machine writeups into hidden machine knowledge and uses that knowledge to guide learners through structured penetration-testing workflows without exposing the solution prematurely.

Simplified:

Writeup menjadi jawaban guru.

PTES menjadi framework kerja.

Playbooks menjadi knowledge methodology.

Evidence menentukan context.

AI menjadi mentor.

User tetap melakukan penetration testing sendiri.

---

# 103. Core Product Rules

METHOD BEFORE EXPLOIT

EVIDENCE BEFORE ACTION

ENUMERATION BEFORE ASSUMPTION

HYPOTHESIS BEFORE RANDOM TESTING

GUIDANCE WITHOUT SPOILERS

VISIBLE CONTEXT COMES FROM USER EVIDENCE

AI ASSISTS, METHODOLOGY DECIDES

FRONTEND RENDERS DATA, NOT MACHINE LOGIC