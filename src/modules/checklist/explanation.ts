import { z } from "zod";
import { isGeminiConfigured } from "../ai/client";
import { generateStructuredAI } from "../ai/structured";
import { phaseMetadataMap } from "../methodology/reference";
import type { FindingRecord, SessionCheckRecord, SessionPhaseSnapshot } from "../training/types";

// ============================================================================
// 1. Zod Schema Definition
// ============================================================================

export const checkExplanationSchema = z.object({
  why: z.object({
    principle: z
      .string()
      .describe("The core PTES methodology principle and rationale for this check"),
    importance: z
      .string()
      .describe("Why this step is essential before progressing and the concrete risks of skipping it"),
    mindset: z
      .string()
      .describe("The professional mindset or rule of thumb for this check"),
  }),
  what: z.object({
    contextSummary: z
      .string()
      .describe(
        "How this check relates to the learner's confirmed findings and current target state",
      ),
    applicableFindings: z
      .array(z.string())
      .describe(
        "List of specific confirmed findings or confirmed services this check directly targets",
      ),
    relevance: z
      .string()
      .describe("Why this check is currently active or recommended in this engagement"),
  }),
  how: z.object({
    approach: z
      .string()
      .describe("Step-by-step procedural approach to conduct this check manually"),
    commands: z
      .array(
        z.object({
          label: z.string().describe("Description of what this command does"),
          command: z
            .string()
            .describe(
              "The exact terminal command line ready to execute, with target IP/hostname/port populated if known",
            ),
          tool: z
            .string()
            .describe("Primary tool name, e.g., nmap, curl, gobuster, ssh, nikto, wpscan"),
          description: z
            .string()
            .optional()
            .describe("Explanation of key flags, syntax, or expected output"),
        }),
      )
      .min(1),
    expectedSignals: z
      .array(z.string())
      .describe("Key signs, banners, status codes, or indicators to look for in output"),
  }),
});

export type CheckExplanation = z.infer<typeof checkExplanationSchema>;

export interface CheckExplanationResult {
  readonly checkId: string;
  readonly semanticKey: string;
  readonly title: string;
  readonly priority: string;
  readonly phaseName: string;
  readonly phaseKey: string;
  readonly source: "ai" | "fallback";
  readonly explanation: CheckExplanation;
}

// ============================================================================
// 2. In-Memory Deterministic Cache
// ============================================================================

interface CacheEntry {
  readonly explanation: CheckExplanation;
  readonly source: "ai" | "fallback";
  readonly findingsHash: string;
  readonly cachedAt: number;
}

const explanationCache = new Map<string, CacheEntry>();

function computeFindingsHash(findings: FindingRecord[]): string {
  const sorted = findings
    .filter((f) => f.evidenceState === "confirmed")
    .map((f) => `${f.id}:${f.contextKind ?? ""}:${f.contextValue ?? ""}`)
    .sort()
    .join("|");
  return sorted || "none";
}

/**
 * Clears the explanation cache (useful for testing or cache invalidation).
 */
export function clearExplanationCache(): void {
  explanationCache.clear();
}

// ============================================================================
// 3. Curated Fallback Generators (Graceful Offline / Rate-Limit Degradation)
// ============================================================================

export interface FallbackContext {
  readonly check: SessionCheckRecord;
  readonly phase: SessionPhaseSnapshot;
  readonly targetIp: string;
  readonly confirmedFindings: FindingRecord[];
}

export function generateCuratedFallback(ctx: FallbackContext): CheckExplanation {
  const { check, phase, targetIp, confirmedFindings } = ctx;
  const ip = targetIp || "<target-ip>";
  const key = check.semanticKey.toLowerCase();
  const phaseMetadata = phaseMetadataMap[phase.semanticKey];

  const applicableFindings = confirmedFindings.map((f) => {
    const parts = [f.title];
    if (f.contextKind && f.contextValue) {
      parts.push(`[${f.contextKind}:${f.contextValue}]`);
    } else if (f.contextValue) {
      parts.push(`(${f.contextValue})`);
    }
    return parts.join(" ");
  });

  const findingsSummary =
    applicableFindings.length > 0
      ? `Engagement target is ${ip}. Confirmed evidence recorded: ${applicableFindings.slice(0, 3).join(", ")}${applicableFindings.length > 3 ? "..." : ""}.`
      : `Engagement target is ${ip}. No confirmed findings recorded yet for this phase.`;

  // 1. HTTP Playbook checks
  if (key.includes(".http.")) {
    if (key.includes("manual-inspection")) {
      return {
        why: {
          principle: "Manual inspection before automated fuzzing reveals application intent, structure, and state.",
          importance:
            "Automated tools lack intuition. Manually exploring the site in a browser exposes client-side logic, routing conventions, user workflows, and error messages that guide automated tooling.",
          mindset: "Explore like a curious user first; analyze source code and network requests for anomalies.",
        },
        what: {
          contextSummary: `${findingsSummary} This check initiates web application reconnaissance against confirmed HTTP/HTTPS services.`,
          applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("http") || f.toLowerCase().includes("port")),
          relevance: "HTTP service is confirmed reachable. Web attack surface must be mapped systematically before vulnerability scanning.",
        },
        how: {
          approach: "Open the site in a web browser with Developer Tools (F12) enabled, inspect network requests, HTML comments, and cookies.",
          commands: [
            {
              label: "Fetch web root and examine headers/HTML",
              command: `curl -s -v http://${ip}/`,
              tool: "curl",
              description: "-s silent, -v verbose output to see request and response headers along with raw HTML body.",
            },
            {
              label: "Quick technology and title fingerprinting",
              command: `whatweb http://${ip}/`,
              tool: "whatweb",
              description: "Detects server software, CMS, scripting languages, and HTML title banner.",
            },
          ],
          expectedSignals: [
            "Server banners (e.g. Apache/2.4.52, nginx/1.18.0, Werkzeug/2.2.2)",
            "HTML comments left by developers (e.g. <!-- TODO: check admin panel -->)",
            "Set-Cookie headers disclosing session technologies (e.g. PHPSESSID, connect.sid)",
          ],
        },
      };
    }

    if (key.includes("review-headers")) {
      return {
        why: {
          principle: "HTTP headers reveal technology stacks, server versions, and missing defensive headers.",
          importance:
            "Response headers often disclose exact server software, programming frameworks, and security mechanisms (or lack thereof) such as CSP, CORS, and HSTS.",
          mindset: "Headers are the server's handshake. Read every line before probing deeper.",
        },
        what: {
          contextSummary: `${findingsSummary} Examining HTTP headers on the confirmed web interface.`,
          applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("http")),
          relevance: "Essential for determining server platform, framework version, and identifying misconfigurations.",
        },
        how: {
          approach: "Send a HEAD or GET request to the root and common endpoints, logging all response headers.",
          commands: [
            {
              label: "Fetch HTTP response headers only",
              command: `curl -s -I http://${ip}/`,
              tool: "curl",
              description: "-I sends a HEAD request to display response status and headers without payload.",
            },
            {
              label: "Check SSL/TLS certificates and security headers (if HTTPS)",
              command: `curl -s -I -k https://${ip}/`,
              tool: "curl",
              description: "-k allows insecure/self-signed certificates common in lab environments.",
            },
          ],
          expectedSignals: [
            "Server header (e.g. Server: Apache, Server: Werkzeug/3.0.1)",
            "X-Powered-By header (e.g. PHP/8.1, Express)",
            "Absence of X-Frame-Options or Content-Security-Policy",
          ],
        },
      };
    }

    if (key.includes("content-discovery") || key.includes("fuzzing")) {
      return {
        why: {
          principle: "Forced browsing and wordlist fuzzing discover hidden paths, admin panels, and backup files.",
          importance:
            "Unlinked administrative endpoints, installation scripts, and backup files (.bak, .php.old) frequently bypass standard application security controls.",
          mindset: "Don't guess randomly; use structured, curated wordlists with status code filtering.",
        },
        what: {
          contextSummary: `${findingsSummary} Directory and file enumeration on the active web service.`,
          applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("http")),
          relevance: "Uncovers unlinked attack surfaces, API endpoints, and configuration files.",
        },
        how: {
          approach: "Execute directory and file enumeration using standard wordlists, filtering out 404 responses.",
          commands: [
            {
              label: "Directory enumeration with Gobuster",
              command: `gobuster dir -u http://${ip}/ -w /usr/share/wordlists/dirb/common.txt -t 30 -x php,html,txt,bak`,
              tool: "gobuster",
              description: "-u target URL, -w wordlist, -t concurrent threads, -x extensions to append.",
            },
            {
              label: "Fast fuzzing with FFuF",
              command: `ffuf -u http://${ip}/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -mc 200,204,301,302,307,401,403`,
              tool: "ffuf",
              description: "-mc filters response status codes to display only existing or redirected routes.",
            },
          ],
          expectedSignals: [
            "HTTP 200 OK on administrative routes (/admin, /dashboard, /console)",
            "HTTP 301/302 Redirects indicating sub-directories",
            "HTTP 403 Forbidden indicating restricted internal folders (/internal, /private)",
          ],
        },
      };
    }

    if (key.includes("vhost")) {
      return {
        why: {
          principle: "Virtual host routing maps multiple domains to a single IP address.",
          importance:
            "Web servers often host multiple internal or development sites on the same IP. Accessing via IP alone displays only the default site, hiding critical attack surfaces.",
          mindset: "An IP address is not the full web identity. Check for virtual hosts and domain names.",
        },
        what: {
          contextSummary: `${findingsSummary} Probing for vhosts and subdomains on the target host.`,
          applicableFindings: applicableFindings,
          relevance: "Identifies isolated administrative or staging environments hosted on the same server.",
        },
        how: {
          approach: "Fuzz the Host HTTP header against the target IP using domain wordlists, filtering by response size.",
          commands: [
            {
              label: "Virtual host fuzzing with FFuF",
              command: `ffuf -u http://${ip}/ -H "Host: FUZZ.target.local" -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs <default_size>`,
              tool: "ffuf",
              description: "Replace target.local with discovered domain and <default_size> with the baseline response size.",
            },
            {
              label: "Manual Host header probe with curl",
              command: `curl -s -H "Host: dev.target.local" http://${ip}/ | head -n 20`,
              tool: "curl",
              description: "Verifies if specific hostnames return different content than the IP directly.",
            },
          ],
          expectedSignals: [
            "Response size variation compared to default IP response",
            "Different HTTP status code or page title",
            "Authentication prompts on staging/dev vhosts",
          ],
        },
      };
    }

    // Generic HTTP check fallback
    return {
      why: {
        principle: "Web application enumeration requires systematic examination of all exposed functional layers.",
        importance:
          "Skipping structured web inspection leads to missing overlooked parameters, hidden endpoints, or subtle misconfigurations.",
        mindset: "Systematically record technologies, parameters, and routes before attempting exploit payloads.",
      },
      what: {
        contextSummary: `${findingsSummary} Web application methodology check.`,
        applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("http")),
        relevance: "Active web service confirmed; applying structured HTTP reconnaissance.",
      },
      how: {
        approach: "Combine passive banner inspection, active fuzzing, and client script analysis.",
        commands: [
          {
            label: "Inspect web server details and headers",
            command: `curl -s -I http://${ip}/`,
            tool: "curl",
            description: "Fetches HTTP headers to identify web server software and configured controls.",
          },
          {
            label: "Check common robots.txt and sitemap.xml files",
            command: `curl -s http://${ip}/robots.txt`,
            tool: "curl",
            description: "Robots.txt frequently points directly to restricted directories or endpoints.",
          },
        ],
        expectedSignals: [
          "Disallowed paths in robots.txt",
          "Web framework identifiers in HTML source or headers",
          "Dynamic parameters in forms or URL query strings",
        ],
      },
    };
  }

  // 2. SSH Playbook checks
  if (key.includes(".ssh.")) {
    return {
      why: {
        principle: "SSH enumeration determines supported authentication methods and host key algorithms without brute-forcing.",
        importance:
          "Premature brute-forcing triggers account lockouts or IP bans. Inspecting banners and authentication capabilities reveals exact OS distributions and password vs publickey requirements.",
        mindset: "Gather server details and accepted auth mechanisms before attempting any credentials.",
      },
      what: {
        contextSummary: `${findingsSummary} SSH service enumeration on port 22.`,
        applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("ssh") || f.toLowerCase().includes("22")),
        relevance: "SSH port confirmed open. Verifying daemon version and authentication surfaces.",
      },
      how: {
        approach: "Connect to the SSH port to extract version banner, supported authentication types, and cryptographic algorithms.",
        commands: [
          {
            label: "Grab SSH banner and OS signature",
            command: `nc -nv ${ip} 22`,
            tool: "netcat",
            description: "Connects to port 22 to read raw banner (e.g. SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6).",
          },
          {
            label: "Audit supported authentication methods",
            command: `ssh -o PreferredAuthentications=none -o StrictHostKeyChecking=no ${ip}`,
            tool: "ssh",
            description: "Forces SSH client to report allowed authentication methods (publickey, password, etc.).",
          },
          {
            label: "Enumerate supported SSH ciphers and algorithms",
            command: `nmap -p 22 --script ssh2-enum-algos ${ip}`,
            tool: "nmap",
            description: "Lists supported key exchange, host key, and encryption algorithms.",
          },
        ],
        expectedSignals: [
          "Permission denied (publickey,password) indicates password login is enabled",
          "Permission denied (publickey) indicates only SSH keys are accepted (passwords disabled)",
          "OS version clues in OpenSSH banner (e.g., Ubuntu, Debian, Alpine)",
        ],
      },
    };
  }

  // 3. Core PTES Reconnaissance checks
  if (phase.semanticKey === "reconnaissance") {
    if (key.includes("confirm-target-reachability")) {
      return {
        why: {
          principle: "Verification of network-layer reachability prevents futile scanning against unreachable hosts.",
          importance:
            "Starting extensive scans without verifying reachability wastes time and leads to misleading results if packets are filtered or dropped.",
          mindset: "Confirm target is alive and measure latency before executing intensive enumeration.",
        },
        what: {
          contextSummary: `${findingsSummary} Initial reachability check against target host ${ip}.`,
          applicableFindings: applicableFindings,
          relevance: "Target host must be verified active to proceed with port scanning.",
        },
        how: {
          approach: "Send ICMP echo requests and TCP SYN pings to verify host response and identify firewall filtering.",
          commands: [
            {
              label: "ICMP Echo ping test",
              command: `ping -c 3 ${ip}`,
              tool: "ping",
              description: "-c 3 sends 3 ICMP packets. Note TTL value (TTL ~64 usually Linux, ~128 usually Windows).",
            },
            {
              label: "TCP SYN ping fallback (if ICMP is blocked)",
              command: `nmap -sn -PS80,443,22 ${ip}`,
              tool: "nmap",
              description: "-sn skips port scan; -PS sends TCP SYN probes to common ports to check host state.",
            },
          ],
          expectedSignals: [
            "0% packet loss indicating direct connectivity",
            "TTL ~64 suggesting Linux/Unix OS; TTL ~128 suggesting Windows OS",
            "Round-trip time (RTT) latency baseline for timing templates (-T4)",
          ],
        },
      };
    }

    if (key.includes("initial-port-enumeration")) {
      return {
        why: {
          principle: "Rapid discovery of the top standard ports establishes fast situational awareness.",
          importance:
            "Full 65,535 port scans take several minutes. Scanning top 1,000 standard ports provides immediate feedback on primary attack vectors (Web, SSH, SMB, Database).",
          mindset: "Fast initial sweep first to uncover high-value targets, followed by exhaustive background scan.",
        },
        what: {
          contextSummary: `${findingsSummary} Initial port enumeration for ${ip}.`,
          applicableFindings: applicableFindings,
          relevance: "Identifies open listening daemons across standard networking ports.",
        },
        how: {
          approach: "Execute default Nmap TCP SYN scan with service banner detection and default scripts.",
          commands: [
            {
              label: "Top 1,000 TCP ports with service detection and default scripts",
              command: `nmap -sC -sV -oN nmap_initial.txt ${ip}`,
              tool: "nmap",
              description: "-sC runs safe default scripts, -sV detects service versions, -oN saves normal format output.",
            },
          ],
          expectedSignals: [
            "Open TCP ports with service names (e.g. 22/tcp open ssh, 80/tcp open http)",
            "Service version banners (e.g. Apache httpd 2.4.52, OpenSSH 8.9p1)",
            "OS guesses based on TCP/IP stack fingerprints",
          ],
        },
      };
    }

    if (key.includes("full-tcp-enumeration")) {
      return {
        why: {
          principle: "Non-standard high ports frequently host unhardened administrative and backend services.",
          importance:
            "Administrators often move sensitive applications to non-standard ports (e.g. 8080, 8443, 9001, 30000) thinking obscurity is security. Full scans ensure zero blind spots.",
          mindset: "Leave no port unchecked. An attacker only needs one unmonitored service.",
        },
        what: {
          contextSummary: `${findingsSummary} Full-range TCP enumeration for ${ip}.`,
          applicableFindings: applicableFindings,
          relevance: "Scans all 65,535 TCP ports to discover non-standard services.",
        },
        how: {
          approach: "Run an accelerated full-port sweep, then probe any newly discovered ports for version info.",
          commands: [
            {
              label: "Fast full-range TCP port scan (ports 1-65535)",
              command: `nmap -p- --min-rate 1000 -oN nmap_all_ports.txt ${ip}`,
              tool: "nmap",
              description: "-p- scans all 65,535 ports; --min-rate 1000 sends at least 1,000 packets per second.",
            },
            {
              label: "Follow-up service scan on newly discovered ports",
              command: `nmap -sC -sV -p <discovered-ports> -oN nmap_extra_services.txt ${ip}`,
              tool: "nmap",
              description: "Targeted detailed scan on the high ports found by the full scan.",
            },
          ],
          expectedSignals: [
            "Open ports above 1024 (e.g. 8000, 8080, 9090, 50000)",
            "Internal proxies or microservices listening on localhost or external interfaces",
            "Alternative remote access daemons",
          ],
        },
      };
    }

    if (key.includes("identify-service-versions")) {
      return {
        why: {
          principle: "Precise software version identification is the prerequisite for valid vulnerability correlation.",
          importance:
            "Guessing vulnerabilities based only on port numbers causes false positives and system crashes. Version identification anchors vulnerability research in empirical evidence.",
          mindset: "Evidence before assumption. Know the exact release and build before checking CVEs.",
        },
        what: {
          contextSummary: `${findingsSummary} Service version identification across discovered ports.`,
          applicableFindings: applicableFindings,
          relevance: "Discovers exact patch levels for correlation with public exploit databases.",
        },
        how: {
          approach: "Perform aggressive version probing and banner analysis across all confirmed open ports.",
          commands: [
            {
              label: "Intense version probing on open ports",
              command: `nmap -sV --version-intensity 8 -p <open-ports> ${ip}`,
              tool: "nmap",
              description: "--version-intensity 8 tests all probes to maximize banner identification accuracy.",
            },
            {
              label: "Manual banner grabbing via netcat",
              command: `nc -nv ${ip} <port>`,
              tool: "netcat",
              description: "Connects directly to the listening port and reads the raw initial service banner.",
            },
          ],
          expectedSignals: [
            "Specific software names and versions (e.g. ProFTPD 1.3.5, Apache 2.4.41)",
            "OS release strings (e.g. Ubuntu-3ubuntu0.4)",
            "Embedded technology clues (e.g. Werkzeug Python 3.10)",
          ],
        },
      };
    }
  }

  // 4. Core PTES Threat Modeling checks
  if (phase.semanticKey === "threat-modeling") {
    return {
      why: {
        principle: "Threat modeling organizes raw reconnaissance data into structured, prioritized attack surfaces.",
        importance:
          "Without threat modeling, testers randomly fuzz services. Modeling boundaries and entry points focuses effort on the highest-probability initial access paths.",
        mindset: "Think like the system architect: Where does untrusted user input cross the trust boundary?",
      },
      what: {
        contextSummary: `${findingsSummary} Threat modeling analysis based on confirmed findings.`,
        applicableFindings: applicableFindings,
        relevance: "Synthesizes reconnaissance findings into prioritized candidate targets.",
      },
      how: {
        approach: "Review all confirmed open ports and services, identify where user input enters, and rank attack priority.",
        commands: [
          {
            label: "Review open ports and matching services from recon notes",
            command: `grep -E "open|PORT" nmap_initial.txt`,
            tool: "grep",
            description: "Quickly filters Nmap results to list all open services and their versions for prioritization.",
          },
        ],
        expectedSignals: [
          "Services with wide input surfaces (Web apps, APIs, upload endpoints)",
          "Legacy services with known protocol weaknesses (FTP, Telnet, HTTP cleartext)",
          "Authentication gateways (SSH, admin login panels, VPNs)",
        ],
      },
    };
  }

  // 5. Core PTES Vulnerability Analysis checks
  if (phase.semanticKey === "vulnerability-analysis") {
    return {
      why: {
        principle: "Vulnerability analysis correlates verified software versions against known CVEs before exploitation.",
        importance:
          "Firing exploits blindly damages targets, creates noise, and often fails. Rigorous vulnerability analysis proves a flaw exists before attempting compromise.",
        mindset: "Hypothesis before random testing. Verify prerequisites and version compatibility first.",
      },
      what: {
        contextSummary: `${findingsSummary} Vulnerability analysis against confirmed software versions.`,
        applicableFindings: applicableFindings,
        relevance: "Searches for CVEs, public exploits, and misconfigurations matching confirmed assets.",
      },
      how: {
        approach: "Search exploit databases, CVE dictionaries, and run targeted vulnerability scripts.",
        commands: [
          {
            label: "Search Exploit-DB for confirmed service version",
            command: `searchsploit "<service_name> <version>"`,
            tool: "searchsploit",
            description: "Queries local Exploit-DB offline repository for known exploits matching software versions.",
          },
          {
            label: "Run targeted Nmap vulnerability scripts",
            command: `nmap --script "vuln and safe" -p <ports> ${ip}`,
            tool: "nmap",
            description: "Executes non-destructive vulnerability detection scripts against target ports.",
          },
        ],
        expectedSignals: [
          "Exact CVE matches corresponding to confirmed software builds",
          "Public PoC exploit availability in Exploit-DB or GitHub",
          "Anomalous error responses confirming protocol implementation flaws",
        ],
      },
    };
  }

  // 6. Core PTES Exploitation checks
  if (phase.semanticKey === "exploitation") {
    return {
      why: {
        principle: "Exploitation leverages validated vulnerabilities to establish initial access under controlled conditions.",
        importance:
          "Exploit execution must be deliberate. Review payloads and prerequisites to avoid system crashes or alerting defenses.",
        mindset: "Understand what the payload does before firing it. Keep execution controlled and repeatable.",
      },
      what: {
        contextSummary: `${findingsSummary} Exploitation phase check.`,
        applicableFindings: applicableFindings,
        relevance: "Executes verified attack hypothesis to establish initial user foothold.",
      },
      how: {
        approach: "Set up listener, prepare customized payload with local IP, and execute controlled exploit.",
        commands: [
          {
            label: "Start Netcat listener for reverse shell",
            command: "nc -lvnp 4444",
            tool: "netcat",
            description: "-l listen, -v verbose, -n numeric IP only, -p local listening port.",
          },
          {
            label: "Verify user foothold and privileges upon connection",
            command: "id; whoami; hostname; uname -a",
            tool: "sh",
            description: "Immediate situational awareness commands to confirm user identity and system details.",
          },
        ],
        expectedSignals: [
          "Inbound connection on Netcat listener",
          "Interactive command shell prompt (e.g. $ or #)",
          "Confirmation of current user context (e.g. uid=1000(user) gid=1000(user))",
        ],
      },
    };
  }

  // 7. Core PTES Post-Exploitation checks
  if (phase.semanticKey === "post-exploitation") {
    return {
      why: {
        principle: "Post-exploitation systematically maps internal system configurations to identify privilege escalation paths.",
        importance:
          "Jumping to random exploit scripts without situational awareness misses simple misconfigurations (e.g. sudo rights, weak permissions) and risks detection.",
        mindset: "Check simple local vectors first: sudo permissions, SUID binaries, cron jobs, and stored credentials.",
      },
      what: {
        contextSummary: `${findingsSummary} Post-exploitation and privilege escalation on compromised host.`,
        applicableFindings: applicableFindings,
        relevance: "Enumerates local OS, permissions, and services to elevate privileges to root/Administrator.",
      },
      how: {
        approach: "Execute local privilege enumeration commands covering user rights, SUID files, and system jobs.",
        commands: [
          {
            label: "Check allowed sudo commands for current user",
            command: "sudo -l",
            tool: "sudo",
            description: "Lists commands the current user can execute with elevated privileges (often passwordless).",
          },
          {
            label: "Search for SUID binaries owned by root",
            command: "find / -perm -4000 -type f -exec ls -la {} + 2>/dev/null",
            tool: "find",
            description: "Locates binaries that execute with root permissions when invoked by unprivileged users.",
          },
          {
            label: "Inspect active cron jobs and scheduled tasks",
            command: "cat /etc/crontab /etc/cron.d/* 2>/dev/null; ls -la /var/spool/cron/crontabs 2>/dev/null",
            tool: "cat",
            description: "Identifies recurring scripts or background tasks that may execute with elevated authority.",
          },
        ],
        expectedSignals: [
          "NOPASSWD entries in sudo -l output",
          "Unusual or custom SUID binaries outside standard coreutils",
          "Writable scripts executed periodically by root in crontab",
        ],
      },
    };
  }

  // 8. General Universal Fallback
  return {
    why: {
      principle: phaseMetadata?.tagLine || "Follow structured methodology to ensure repeatable, thorough security assessment.",
      importance:
        phaseMetadata?.whyItMatters ||
        "Conducting this step systematically prevents missed attack surfaces and maintains rigorous assessment coverage.",
      mindset: phaseMetadata?.mindset || "Evidence before action. Method before exploit.",
    },
    what: {
      contextSummary: `${findingsSummary} Methodology check: ${check.title}.`,
      applicableFindings: applicableFindings,
      relevance: check.description || "Required methodology check for the current engagement phase.",
    },
    how: {
      approach: `Systematically execute ${check.title.toLowerCase()} against target ${ip} in accordance with PTES principles.`,
      commands: [
        {
          label: `Perform ${check.title.toLowerCase()}`,
          command: `# Probe target ${ip} for ${check.semanticKey}`,
          tool: "terminal",
          description: check.description || "Execute relevant security assessment tool.",
        },
      ],
      expectedSignals: [
        "Consistent responses matching expected protocol specifications",
        "Empirical evidence that can be documented as a finding",
      ],
    },
  };
}

// ============================================================================
// 4. Gemini Structured Generation (Spoiler-Safe)
// ============================================================================

const EXPLANATION_SYSTEM_PROMPT = `You are a Senior Penetration Testing Instructor and Lead Auditor.
You adhere strictly to the Penetration Testing Execution Standard (PTES) and the core philosophy:
- METHOD BEFORE EXPLOIT
- EVIDENCE BEFORE ACTION
- ENUMERATION BEFORE ASSUMPTION
- HYPOTHESIS BEFORE RANDOM TESTING

Your mission is to provide an educational, clear, and actionable 3-layer explanation for a specific checklist item:
1. Layer 1 (Why): The PTES methodology principle, rationale, risks of skipping this step, and the professional mindset.
2. Layer 2 (What): Machine context grounded EXCLUSIVELY and STRICTLY in the learner's CONFIRMED findings provided in the prompt.
   CRITICAL SPOILER-SAFE SECURITY RULE:
   - You have ZERO knowledge of hidden machine writeups, future attack graphs, flags, or solution paths.
   - NEVER invent or guess ports, passwords, CVEs, or attack paths that are NOT present in the user's confirmed findings.
   - If the user has not confirmed relevant findings yet, state what has been observed so far and what this check is looking for.
3. Layer 3 (How): Concrete terminal action and tool examples.
   - Provide standard, realistic command-line examples using established tools (nmap, curl, gobuster, ffuf, ssh, netcat, etc.).
   - Substitute the actual target IP (or <target-ip> if not set) into the command lines.
   - For each command, give a short label, the exact runnable command, the primary tool name, and what key flags do.
   - Provide key signals or signs to look for in the output.

Output MUST strictly adhere to the requested JSON schema.`;

async function generateAIExplanation(
  ctx: FallbackContext,
): Promise<CheckExplanation> {
  const { check, phase, targetIp, confirmedFindings } = ctx;

  const confirmedFindingsText =
    confirmedFindings.length > 0
      ? confirmedFindings
          .map(
            (f) =>
              `- [${f.title}] Context: ${f.contextKind ? `${f.contextKind}:${f.contextValue ?? ""}` : "general"}. Evidence: ${f.evidence || "None"}`,
          )
          .join("\n")
      : "No confirmed findings recorded by user yet.";

  const prompt = `Provide a 3-layer explanation (Why, What, How) for the following methodology check:

Check Information:
- Title: ${check.title}
- Semantic Key: ${check.semanticKey}
- Description: ${check.description || "N/A"}
- Priority: ${check.priority}
- Provenance: ${check.provenance}
- Current Engagement Phase: ${phase.name} (${phase.semanticKey})

Engagement Context:
- Target IP: ${targetIp || "Not specified (use <target-ip>)"}
- Confirmed Findings from User:
${confirmedFindingsText}

Remember:
- Ground Layer 2 (What) ONLY in the confirmed findings above. Do NOT speculate or reveal hidden machine solutions.
- Provide runnable, realistic terminal commands in Layer 3 (How) with the actual target IP substituted.`;

  return generateStructuredAI<CheckExplanation>({
    systemInstruction: EXPLANATION_SYSTEM_PROMPT,
    contents: prompt,
    schema: checkExplanationSchema,
    temperature: 0.2,
  });
}

// ============================================================================
// 5. Main Entry Point
// ============================================================================

export async function getCheckExplanation(
  sessionId: string,
  checkId: string,
): Promise<CheckExplanationResult> {
  const { getTrainingSession } = await import("../training/service");
  const sessionData = await getTrainingSession(sessionId);

  // Find the check in all phases
  let targetCheck: SessionCheckRecord | null = null;
  let targetPhase: SessionPhaseSnapshot | null = null;

  for (const phase of sessionData.phases) {
    const found = phase.checks.find((c) => c.id === checkId);
    if (found) {
      targetCheck = found;
      targetPhase = phase;
      break;
    }
  }

  if (!targetCheck || !targetPhase) {
    throw new Error(`Check ${checkId} not found in session ${sessionId}`);
  }

  const confirmedFindings = sessionData.findings.filter(
    (f) => f.evidenceState === "confirmed",
  );
  const targetIp = sessionData.session.targetIp ?? "";
  const findingsHash = computeFindingsHash(confirmedFindings);
  const cacheKey = `${checkId}:${findingsHash}:${targetIp}`;

  // Check cache for instant 0-token response
  const cached = explanationCache.get(cacheKey);
  if (cached) {
    return {
      checkId: targetCheck.id,
      semanticKey: targetCheck.semanticKey,
      title: targetCheck.title,
      priority: targetCheck.priority,
      phaseName: targetPhase.name,
      phaseKey: targetPhase.semanticKey,
      source: cached.source,
      explanation: cached.explanation,
    };
  }

  const ctx: FallbackContext = {
    check: targetCheck,
    phase: targetPhase,
    targetIp,
    confirmedFindings,
  };

  // If Gemini is configured, attempt AI generation
  if (isGeminiConfigured()) {
    try {
      const aiExplanation = await generateAIExplanation(ctx);
      explanationCache.set(cacheKey, {
        explanation: aiExplanation,
        source: "ai",
        findingsHash,
        cachedAt: Date.now(),
      });

      return {
        checkId: targetCheck.id,
        semanticKey: targetCheck.semanticKey,
        title: targetCheck.title,
        priority: targetCheck.priority,
        phaseName: targetPhase.name,
        phaseKey: targetPhase.semanticKey,
        source: "ai",
        explanation: aiExplanation,
      };
    } catch {
      // Graceful degradation: Fall back cleanly to curated static explanation
    }
  }

  // Fallback generation (offline or rate-limit or error)
  const fallbackExplanation = generateCuratedFallback(ctx);
  explanationCache.set(cacheKey, {
    explanation: fallbackExplanation,
    source: "fallback",
    findingsHash,
    cachedAt: Date.now(),
  });

  return {
    checkId: targetCheck.id,
    semanticKey: targetCheck.semanticKey,
    title: targetCheck.title,
    priority: targetCheck.priority,
    phaseName: targetPhase.name,
    phaseKey: targetPhase.semanticKey,
    source: "fallback",
    explanation: fallbackExplanation,
  };
}
