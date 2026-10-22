import { z } from "zod";
import { isGeminiConfigured } from "../ai/client";
import { generateStructuredAI } from "../ai/structured";
import { phaseMetadataMap, type PhaseMetadata } from "../methodology/reference";
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
// 3. Curated Fallback Generators (Deterministic, Granular, Offline-Ready)
// ============================================================================

export interface FallbackContext {
  readonly check: SessionCheckRecord;
  readonly phase: SessionPhaseSnapshot;
  readonly targetIp: string;
  readonly confirmedFindings: FindingRecord[];
}

// ----------------------------------------------------------------------------
// 3.1 Service Playbook Helpers
// ----------------------------------------------------------------------------

function getHttpPlaybookFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation {
  if (key.includes("manual-inspection")) {
    return {
      why: {
        principle: "Manual inspection before automated fuzzing reveals application intent, structure, and state.",
        importance:
          "Automated tools lack intuition. Manually exploring the site in a browser exposes client-side logic, routing conventions, user workflows, and error messages that guide automated tooling.",
        mindset: "Explore like a curious user first; analyze source code and network requests for anomalies.",
      },
      what: {
        contextSummary: `${findingsSummary} Initiating web application reconnaissance against confirmed HTTP/HTTPS services.`,
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
        applicableFindings,
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

function getSshPlaybookFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation {
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

function getSmbPlaybookFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation {
  return {
    why: {
      principle: "SMB enumeration investigates shares, domain membership, and null session permissions without authentication.",
      importance:
        "Misconfigured SMB shares frequently allow anonymous/guest reading of sensitive backups, scripts, or credentials, providing instant access.",
      mindset: "Always test for null sessions and guest access before attempting credential guessing.",
    },
    what: {
      contextSummary: `${findingsSummary} SMB enumeration on TCP ports 139/445.`,
      applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("smb") || f.toLowerCase().includes("445")),
      relevance: "SMB service is exposed. Must audit share accessibility and domain metadata.",
    },
    how: {
      approach: "Probe for anonymous access, list available shares, and query OS/domain information using standard SMB utilities.",
      commands: [
        {
          label: "List available shares anonymously with smbclient",
          command: `smbclient -L //${ip}/ -N`,
          tool: "smbclient",
          description: "-L lists shares, -N specifies no password (anonymous probe).",
        },
        {
          label: "Audit SMB shares and null session access with CrackMapExec / NetExec",
          command: `crackmapexec smb ${ip} -u '' -p '' --shares`,
          tool: "crackmapexec",
          description: "Tests anonymous null session access and outputs read/write permissions on all shares.",
        },
        {
          label: "Query domain info and users via RPC null session",
          command: `rpcclient -U "" -N ${ip} -c "enumdomusers; querydominfo"`,
          tool: "rpcclient",
          description: "Attempts null session RPC connection to extract domain user list and domain properties.",
        },
      ],
      expectedSignals: [
        "Share names like IPC$, C$, backup, internal, public, wwwroot",
        "READ or READ,WRITE access on non-standard shares",
        "Domain SID, domain controller name, and domain user list",
      ],
    },
  };
}

function getFtpPlaybookFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation {
  return {
    why: {
      principle: "FTP enumeration verifies version banners and checks for anonymous read/write permissions.",
      importance:
        "Anonymous FTP access allows attackers to download sensitive configuration files or upload malicious scripts/webshells.",
      mindset: "Check for anonymous login first, then check write permissions across all accessible folders.",
    },
    what: {
      contextSummary: `${findingsSummary} FTP service enumeration on port 21.`,
      applicableFindings: applicableFindings.filter((f) => f.toLowerCase().includes("ftp") || f.toLowerCase().includes("21")),
      relevance: "FTP service confirmed open. Checking for anonymous login and daemon vulnerabilities.",
    },
    how: {
      approach: "Connect to FTP port with anonymous credentials, list directories, and probe write permissions.",
      commands: [
        {
          label: "Probe anonymous FTP login via Nmap script",
          command: `nmap -p 21 --script ftp-anon,ftp-syst ${ip}`,
          tool: "nmap",
          description: "Runs safe scripts to check anonymous access and system status information.",
        },
        {
          label: "Connect interactively to FTP service",
          command: `ftp -n ${ip}`,
          tool: "ftp",
          description: "Connects without auto-login; run `user anonymous anonymous` inside the FTP prompt.",
        },
      ],
      expectedSignals: [
        "230 Login successful (Anonymous access enabled)",
        "220 Service ready banner disclosing exact daemon (e.g. vsftpd 3.0.3, ProFTPD 1.3.5)",
        "Files readable in directory listing (e.g. .conf, .txt, .zip)",
      ],
    },
  };
}

// ----------------------------------------------------------------------------
// 3.2 Core PTES Reconnaissance
// ----------------------------------------------------------------------------

function getReconnaissanceFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("confirm-target-information")) {
    return {
      why: {
        principle: "Scope validation ensures all security testing remains strictly within authorized boundaries.",
        importance:
          "Testing out-of-scope targets causes legal liability, unintended outages, and wasted assessment time.",
        mindset: "Verify twice, scan once. Confirm the target IP, hostname, and subnet before sending traffic.",
      },
      what: {
        contextSummary: `${findingsSummary} Validating engagement scope for target ${ip}.`,
        applicableFindings,
        relevance: "Essential legal and methodological baseline before active scanning commences.",
      },
      how: {
        approach: "Confirm local routing, network interface, and reverse DNS records to verify target ownership.",
        commands: [
          {
            label: "Verify network route to target",
            command: `ip route get ${ip}`,
            tool: "ip",
            description: "Verifies which local network interface and gateway traffic will flow through.",
          },
          {
            label: "Check reverse DNS resolution",
            command: `host ${ip}`,
            tool: "host",
            description: "Queries DNS to verify if a hostname or domain maps to the target IP address.",
          },
        ],
        expectedSignals: [
          "Valid routing interface (e.g. tun0 for VPN, eth0 for local lab)",
          "Associated hostname or domain name in DNS response",
        ],
      },
    };
  }

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
        applicableFindings,
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
        applicableFindings,
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
        applicableFindings,
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

  if (key.includes("identify-exposed-services")) {
    return {
      why: {
        principle: "Correlating open ports with listening daemon signatures determines the true protocol nature of each port.",
        importance:
          "Ports can run arbitrary protocols (e.g. HTTP on port 8080, SSH on 2222). Relying on default port numbers leads to wrong exploit attempts.",
        mindset: "Trust the protocol handshake, not the port number.",
      },
      what: {
        contextSummary: `${findingsSummary} Mapping daemon protocols to open ports.`,
        applicableFindings,
        relevance: "Confirms which application layer protocol governs each open port.",
      },
      how: {
        approach: "Probe each open port with Nmap protocol detection scripts and manual banner grabbing.",
        commands: [
          {
            label: "Detailed service protocol probe",
            command: `nmap -sV -sC -p <open-ports> -oN nmap_services.txt ${ip}`,
            tool: "nmap",
            description: "Probes all listening ports to identify daemon protocol signatures.",
          },
        ],
        expectedSignals: [
          "Protocol identifiers (http, ssh, smb, ftp, mysql, unknown-rpc)",
          "Service state: open, filtered, or open|filtered",
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
        applicableFindings,
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

  if (key.includes("map-attack-surface")) {
    return {
      why: {
        principle: "Consolidating all open ports, hostnames, and service technologies creates an integrated attack surface map.",
        importance:
          "Scattered notes cause testers to forget discovered ports. A unified map guides threat modeling and exploitation.",
        mindset: "Organize reconnaissance data before attacking: know every exposed service, version, and protocol.",
      },
      what: {
        contextSummary: `${findingsSummary} Synthesizing the complete attack surface map.`,
        applicableFindings,
        relevance: "Creates a single source of truth for all confirmed entry points.",
      },
      how: {
        approach: "Collate Nmap output, web technologies, and subdomains into documented findings.",
        commands: [
          {
            label: "Extract confirmed services and ports summary",
            command: `grep -E "open|PORT" nmap_initial.txt`,
            tool: "grep",
            description: "Filters Nmap results to list all open services and their versions.",
          },
        ],
        expectedSignals: [
          "Consolidated list of accessible endpoints",
          "Correlation between web ports, management ports, and backend services",
        ],
      },
    };
  }

  if (key.includes("consider-udp-enumeration")) {
    return {
      why: {
        principle: "UDP services often operate silently without TCP handshakes, hosting overlooked entry points (SNMP, DNS, TFTP).",
        importance:
          "Ignoring UDP leaves blind spots. SNMP community strings or TFTP files can disclose passwords or private keys.",
        mindset: "TCP is only half the transport layer. Probe high-value UDP services.",
      },
      what: {
        contextSummary: `${findingsSummary} Evaluating UDP attack surface on ${ip}.`,
        applicableFindings,
        relevance: "Discovers UDP daemons that do not appear in standard TCP scans.",
      },
      how: {
        approach: "Scan top UDP ports with Nmap and probe for standard SNMP community strings.",
        commands: [
          {
            label: "Fast top 20 UDP ports scan",
            command: `nmap -sU --top-ports 20 -oN nmap_udp.txt ${ip}`,
            tool: "nmap",
            description: "-sU scans UDP ports; tests DNS (53), SNMP (161), NTP (123), TFTP (69), etc.",
          },
          {
            label: "Probe SNMP community strings",
            command: `onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt ${ip}`,
            tool: "onesixtyone",
            description: "Fast SNMP community string scanner to discover readable MIB tables.",
          },
        ],
        expectedSignals: [
          "UDP open or open|filtered ports (e.g. 161/udp open snmp)",
          "Valid SNMP community string (e.g. 'public', 'private')",
        ],
      },
    };
  }

  if (key.includes("record-hostnames-and-naming-clues")) {
    return {
      why: {
        principle: "Discovered domain names and vhost clues unlock virtual host routing and Active Directory targets.",
        importance:
          "Accessing target via IP alone serves default web pages and hides internal apps. Resolving hostnames is essential for virtual hosting.",
        mindset: "An IP is a server; a hostname is an application. Add discovered names to /etc/hosts.",
      },
      what: {
        contextSummary: `${findingsSummary} Auditing hostnames, SSL certificates, and naming conventions.`,
        applicableFindings,
        relevance: "Maps domain names to target IP to enable correct virtual host routing.",
      },
      how: {
        approach: "Extract Common Name (CN) and Subject Alternative Names (SAN) from SSL certificates and SMB banners.",
        commands: [
          {
            label: "Extract hostname from SSL/TLS certificate",
            command: `nmap -p 443,8443 --script ssl-cert ${ip}`,
            tool: "nmap",
            description: "Reads the Subject Alternative Name and Common Name from the server's SSL certificate.",
          },
          {
            label: "Query SMB for NetBIOS and domain names",
            command: `nmap -p 445 --script smb-os-discovery ${ip}`,
            tool: "nmap",
            description: "Extracts computer name, domain name, and forest name from SMB negotiation.",
          },
        ],
        expectedSignals: [
          "Domain names in SSL certs (e.g. staging.target.htb, mail.target.htb)",
          "NetBIOS computer name and domain name in SMB discovery",
        ],
      },
    };
  }

  if (key.includes("summarize-reconnaissance-findings")) {
    return {
      why: {
        principle: "Consolidating all observed ports, services, banners, and routing details creates a complete reconnaissance baseline.",
        importance:
          "Proceeding to threat modeling without summarizing reconnaissance leads to fragmented notes and overlooked low-hanging fruit.",
        mindset: "Synthesize observations into clear, confirmed facts before moving forward.",
      },
      what: {
        contextSummary: `${findingsSummary} Consolidating reconnaissance findings into confirmed assets.`,
        applicableFindings,
        relevance: "Summarizes confirmed network ports, service banners, and software versions.",
      },
      how: {
        approach: "Review all port scan logs and ensure each discovered service is recorded as a confirmed finding in the workstation.",
        commands: [
          {
            label: "Extract confirmed services and ports summary",
            command: `grep -E "open|PORT" nmap_initial.txt nmap_all_ports.txt 2>/dev/null | sort -u`,
            tool: "grep",
            description: "Filters Nmap scan logs to provide a clean inventory of all accessible ports and services.",
          },
        ],
        expectedSignals: [
          "Complete list of open ports with matching daemon names and versions",
          "Verification that all accessible network services have corresponding findings",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.3 Core PTES Threat Modeling (Granular & Distinct Per Check)
// ----------------------------------------------------------------------------

function getThreatModelingFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("identify-likely-entry-points")) {
    return {
      why: {
        principle: "Mapping external entry points identifies where untrusted client data reaches server logic.",
        importance:
          "Without cataloging all entry points (web forms, file uploads, APIs, ports), testers miss the simplest access vectors or test non-interactive interfaces.",
        mindset: "Think like an attacker looking for an unlocked doorway: where can external input enter the system?",
      },
      what: {
        contextSummary: `${findingsSummary} Locating interactive input pathways across confirmed open services.`,
        applicableFindings,
        relevance: "Essential for determining which services accept client input and can be actively probed.",
      },
      how: {
        approach: "Examine discovered web routes, input forms, API endpoints, and network service banners to catalogue primary access pathways.",
        commands: [
          {
            label: "Extract HTML forms and input actions from web root",
            command: `curl -s -L http://${ip}/ | grep -E -i "action=|href=|form|input" | head -n 30`,
            tool: "curl",
            description: "Inspects client-side forms, submission endpoints, and links to identify interactive entry points.",
          },
          {
            label: "Fuzz common application entry routes and APIs",
            command: `gobuster dir -u http://${ip}/ -w /usr/share/wordlists/dirb/common.txt -x php,html,txt | grep -E "upload|api|login|search|admin"`,
            tool: "gobuster",
            description: "Discovers standard high-interest entry routes such as upload forms, APIs, and administrative portals.",
          },
        ],
        expectedSignals: [
          "Form action targets (e.g. action='/api/upload.php', action='/login')",
          "Interactive query parameters (e.g. ?page=, ?file=, ?id=, ?search=)",
          "API endpoints accepting JSON or XML payloads",
        ],
      },
    };
  }

  if (key.includes("identify-authentication-and-trust-boundaries")) {
    return {
      why: {
        principle: "Trust boundaries define where user privileges, authentication controls, and role transitions occur.",
        importance:
          "Testing authentication mechanisms (login forms, API tokens, default credentials, session cookies) reveals whether access controls can be bypassed before attempting complex code execution.",
        mindset: "Where does an unauthenticated user become authenticated? What separates guest privileges from administrative power?",
      },
      what: {
        contextSummary: `${findingsSummary} Analyzing authentication barriers and access tiers on confirmed targets.`,
        applicableFindings,
        relevance: "Identifies whether services permit anonymous access, default credentials, or weak authentication checks.",
      },
      how: {
        approach: "Check services for anonymous logins, unauthenticated admin dashboards, weak session validation, and password prompts.",
        commands: [
          {
            label: "Check unauthenticated access to admin portal",
            command: `curl -s -I http://${ip}/admin/`,
            tool: "curl",
            description: "Tests if administrative interfaces redirect to login or allow unauthenticated viewing.",
          },
          {
            label: "Audit anonymous and guest service access (FTP / SMB)",
            command: `nmap -p 21,445,139 --script "ftp-anon,smb-enum-shares" ${ip}`,
            tool: "nmap",
            description: "Probes for unauthenticated guest file shares or anonymous FTP permissions.",
          },
          {
            label: "Probe SSH authentication methods",
            command: `ssh -o PreferredAuthentications=none -o StrictHostKeyChecking=no ${ip}`,
            tool: "ssh",
            description: "Identifies whether SSH permits password-based login or strictly requires public key authentication.",
          },
        ],
        expectedSignals: [
          "HTTP 401 Unauthorized or 403 Forbidden vs HTTP 200 OK on admin routes",
          "Anonymous login allowed (230 Login successful on FTP)",
          "Password authentication accepted vs Publickey-only restriction on SSH",
        ],
      },
    };
  }

  if (key.includes("review-confirmed-attack-surface")) {
    return {
      why: {
        principle: "Systematic review of confirmed ports and services prevents premature tunnel vision on a single port.",
        importance:
          "Penetration testers frequently get stuck in rabbit holes by hyper-focusing on one complex port while an easy vector exists on another.",
        mindset: "Step back and review the complete picture: what services are running, which are old, which are complex?",
      },
      what: {
        contextSummary: `${findingsSummary} Reviewing the consolidated confirmed attack surface.`,
        applicableFindings,
        relevance: "Ensures all confirmed evidence is reviewed before formulating exploitation hypotheses.",
      },
      how: {
        approach: "Review all confirmed open ports and software versions from your reconnaissance findings.",
        commands: [
          {
            label: "List all confirmed open ports and software versions",
            command: `grep -E "open|PORT" nmap_initial.txt`,
            tool: "grep",
            description: "Summarizes all verified network daemons and versions from reconnaissance.",
          },
        ],
        expectedSignals: [
          "Complete inventory of confirmed ports, services, and versions",
          "Clear overview of external vs internal services",
        ],
      },
    };
  }

  if (key.includes("prioritize-attack-surfaces")) {
    return {
      why: {
        principle: "Prioritizing attack vectors focuses effort on high-probability, low-noise exploit paths first.",
        importance:
          "Randomly testing services wastes time, creates noise, and causes account lockouts. Structured prioritization ensures the fastest route to initial access.",
        mindset: "Rank by exploitability: Unauthenticated RCE > Known CVE with public PoC > Web parameter injection > Password brute-force.",
      },
      what: {
        contextSummary: `${findingsSummary} Ranking confirmed services and attack surfaces by feasibility and impact.`,
        applicableFindings,
        relevance: "Establishes a structured order of operation to avoid getting bogged down in low-yield services.",
      },
      how: {
        approach: "Group services into priority tiers based on known exploitability and input surface complexity.",
        commands: [
          {
            label: "Filter high-interest web and management services",
            command: `grep -E "http|apache|nginx|ssh|smb|ftp|mysql" nmap_initial.txt`,
            tool: "grep",
            description: "Isolates high-interest daemons to prioritize in the workstation.",
          },
        ],
        expectedSignals: [
          "Tier 1: Exposed web apps with upload/API functionality or outdated service versions",
          "Tier 2: Authenticated panels with potential default credentials",
          "Tier 3: Hardened remote access daemons with key-only auth",
        ],
      },
    };
  }

  if (key.includes("identify-user-controlled-input-surfaces")) {
    return {
      why: {
        principle: "Every injection vulnerability (SQLi, XSS, Command Injection, SSRF, SSTI) originates from user-controlled input.",
        importance:
          "Without cataloging all parameters and headers, testers test blind endpoints and miss injection flaws.",
        mindset: "Never trust client input. Follow data flow from URL parameter or form input into the backend.",
      },
      what: {
        contextSummary: `${findingsSummary} Identifying parameters and input surfaces across active web routes.`,
        applicableFindings,
        relevance: "Uncovers query parameters, form fields, and HTTP headers processed dynamically by backend applications.",
      },
      how: {
        approach: "Inspect page source for input names, and fuzz for hidden GET/POST parameters on dynamic scripts.",
        commands: [
          {
            label: "Fuzz hidden GET parameters with FFuF",
            command: `ffuf -u "http://${ip}/index.php?FUZZ=test" -w /usr/share/wordlists/seclists/Discovery/Web-Content/burp-parameter-names.txt -mc 200`,
            tool: "ffuf",
            description: "Discovers hidden GET parameters that alter response length or server status.",
          },
          {
            label: "Probe parameter response differential with curl",
            command: `curl -s "http://${ip}/search?query=test" -v`,
            tool: "curl",
            description: "Submits test input to observe how the server reflects or processes query values.",
          },
        ],
        expectedSignals: [
          "Parameters like id=, file=, page=, url=, cmd=, user=, query=",
          "Response size changes when specific parameter names are submitted",
        ],
      },
    };
  }

  if (key.includes("identify-sensitive-resources")) {
    return {
      why: {
        principle: "Sensitive configuration files, backup databases, and hidden repositories often leak credentials without needing an exploit.",
        importance:
          "Hardcoded database passwords, API keys, and backup scripts (.env, .git, config.php.bak) provide instant initial access if exposed.",
        mindset: "Look for what developers left behind: backups, git repositories, and temporary files.",
      },
      what: {
        contextSummary: `${findingsSummary} Searching for exposed backups, environment variables, and hidden configs.`,
        applicableFindings,
        relevance: "Discovers accidental exposure of configuration files containing credentials or cryptographic secrets.",
      },
      how: {
        approach: "Fuzz web directories specifically for sensitive file extensions (.env, .git, .bak, .sql, .conf).",
        commands: [
          {
            label: "Fuzz for backup files, database dumps, and environment configs",
            command: `gobuster dir -u http://${ip}/ -w /usr/share/wordlists/dirb/common.txt -x bak,old,sql,conf,env,db,git`,
            tool: "gobuster",
            description: "Searches for sensitive file extensions that developers commonly leave on web servers.",
          },
          {
            label: "Check directly for common sensitive files",
            command: `curl -s -I http://${ip}/.env; curl -s -I http://${ip}/.git/HEAD`,
            tool: "curl",
            description: "Quick probe for exposed environment files or root git directories.",
          },
        ],
        expectedSignals: [
          "HTTP 200 OK on /.env disclosing database credentials or API secrets",
          "HTTP 200 OK on /.git/HEAD confirming exposed source code repository",
          "Database backup files (.sql, .db, .sqlite)",
        ],
      },
    };
  }

  if (key.includes("record-initial-attack-hypotheses")) {
    return {
      why: {
        principle: "Formulating hypotheses bridges reconnaissance with execution, enforcing methodology before random action.",
        importance:
          "Testers who record hypotheses know what to test, what output proves success, and when to pivot. It eliminates aimless guessing.",
        mindset: "Hypothesis before random testing: If X is true, then running Y will yield Z.",
      },
      what: {
        contextSummary: `${findingsSummary} Converting threat modeling observations into actionable hypotheses.`,
        applicableFindings,
        relevance: "Ensures all exploitation attempts in the next phase are grounded in validated hypotheses.",
      },
      how: {
        approach: "Use the training session workstation to link confirmed findings into formulated attack hypotheses.",
        commands: [
          {
            label: "Formulate hypothesis in workstation",
            command: `# Click [+ Formulate Hypothesis] on any confirmed finding card in the Findings tab`,
            tool: "terminal",
            description: "State the hypothesis statement, reasoning, expected result, and test approach.",
          },
        ],
        expectedSignals: [
          "Documented hypotheses with testable expected outcomes",
          "Clear linkage between observed evidence and planned verification actions",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.4 Core PTES Vulnerability Analysis
// ----------------------------------------------------------------------------

function getVulnerabilityAnalysisFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("review-candidate-vulnerabilities")) {
    return {
      why: {
        principle: "Vulnerability analysis correlates verified software versions against known CVEs before exploitation.",
        importance:
          "Firing exploits blindly damages targets, creates noise, and often fails. Rigorous vulnerability analysis proves a flaw exists before attempting compromise.",
        mindset: "Hypothesis before random testing. Verify prerequisites and version compatibility first.",
      },
      what: {
        contextSummary: `${findingsSummary} Vulnerability research against confirmed software versions.`,
        applicableFindings,
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
        ],
        expectedSignals: [
          "Exact CVE matches corresponding to confirmed software builds",
          "Public PoC exploit availability in Exploit-DB or GitHub",
        ],
      },
    };
  }

  if (key.includes("connect-vulnerabilities-to-evidence")) {
    return {
      why: {
        principle: "Every claimed vulnerability must connect directly to empirical evidence gathered during reconnaissance.",
        importance:
          "Guessing vulnerabilities without supporting evidence causes testers to chase rabbit holes and attempt unviable exploits.",
        mindset: "Evidence before action: show me the version, configuration, or banner that proves this flaw is viable.",
      },
      what: {
        contextSummary: `${findingsSummary} Linking candidate vulnerabilities directly to confirmed evidence.`,
        applicableFindings,
        relevance: "Validates that proposed attack vectors align with actual discovered software builds and configurations.",
      },
      how: {
        approach: "Cross-reference target version numbers and banners against published CVE prerequisites and exploit requirements.",
        commands: [
          {
            label: "Examine detailed vulnerability notes for confirmed software",
            command: `searchsploit -x <exploit-id>`,
            tool: "searchsploit",
            description: "Reads full exploit script comments to verify vulnerable version ranges and necessary preconditions.",
          },
          {
            label: "Run targeted Nmap vulnerability script for confirmed service",
            command: `nmap --script "vuln and safe" -p <port> ${ip}`,
            tool: "nmap",
            description: "Runs safe Nmap vulnerability detection scripts against specific confirmed ports.",
          },
        ],
        expectedSignals: [
          "Exact software version falls inside the vulnerable range specified in CVE",
          "Required plugins, modules, or headers are confirmed present on the target",
        ],
      },
    };
  }

  if (key.includes("create-testable-hypotheses")) {
    return {
      why: {
        principle: "Attack hypotheses must be formulated as falsifiable, testable propositions with clear expected outcomes.",
        importance:
          "Vague testing leads to confusion when commands fail. Clear hypotheses define exactly what response confirms or refutes the vector.",
        mindset: "If vulnerability X exists, then sending input Y will produce observable response Z.",
      },
      what: {
        contextSummary: `${findingsSummary} Formulating testable hypotheses for candidate vulnerabilities.`,
        applicableFindings,
        relevance: "Structures potential vulnerabilities into concrete test cases before firing exploits.",
      },
      how: {
        approach: "Use the training session workstation to link confirmed findings into formulated attack hypotheses.",
        commands: [
          {
            label: "Formulate hypothesis in workstation",
            command: `# Click [+ Formulate Hypothesis] on a confirmed finding card in the Findings tab`,
            tool: "terminal",
            description: "Fill in hypothesis statement, rationale, expected signal, and planned verification tool.",
          },
        ],
        expectedSignals: [
          "Documented hypothesis with specific expected observable outcome",
          "Pre-defined tool and payload parameters",
        ],
      },
    };
  }

  if (key.includes("validate-before-exploitation")) {
    return {
      why: {
        principle: "Controlled pre-flight testing verifies vulnerability existence without risking system instability.",
        importance:
          "Full exploit payloads can crash web servers or lock accounts. Controlled probing confirms the vulnerability condition safely.",
        mindset: "Trigger an observable symptom first (e.g. echo, sleep, error differential) before dropping a payload.",
      },
      what: {
        contextSummary: `${findingsSummary} Validating candidate vulnerability prerequisites on ${ip}.`,
        applicableFindings,
        relevance: "Validates vulnerability hypothesis with non-destructive probes before executing real exploit payloads.",
      },
      how: {
        approach: "Send benign, non-destructive test inputs to observe whether the vulnerable code path executes.",
        commands: [
          {
            label: "Run safe vulnerability detection scripts",
            command: `nmap --script "vuln and safe" -p <ports> ${ip}`,
            tool: "nmap",
            description: "Executes non-destructive vulnerability detection scripts against target ports.",
          },
        ],
        expectedSignals: [
          "Time delay from sleep/benchmark commands indicating execution",
          "Error messages leaking database query syntax or stack traces",
        ],
      },
    };
  }

  if (key.includes("consider-alternative-explanations")) {
    return {
      why: {
        principle: "Unexpected responses (e.g. 403, 500, timeouts) may stem from WAFs, routing rules, or malformed requests rather than true security controls.",
        importance:
          "Testers frequently abandon valid exploit paths because a default curl request failed due to missing headers or rate limiting.",
        mindset: "Don't accept the first negative result as proof of security. Test alternative HTTP methods and headers.",
      },
      what: {
        contextSummary: `${findingsSummary} Evaluating alternative causes for unexpected or blocked target responses.`,
        applicableFindings,
        relevance: "Ensures valid attack paths are not discarded prematurely due to environment or transport quirks.",
      },
      how: {
        approach: "Vary HTTP request methods, user-agents, and bypass headers to determine if blocks are application-level or network-level.",
        commands: [
          {
            label: "Test HTTP verb tampering and IP spoofing headers",
            command: `curl -s -X POST http://${ip}/restricted -H "X-Forwarded-For: 127.0.0.1" -H "X-Custom-IP-Authorization: 127.0.0.1" -I`,
            tool: "curl",
            description: "Probes whether access controls are tied to HTTP GET verbs or inspect bypass headers.",
          },
          {
            label: "Test with alternative user agent",
            command: `curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" http://${ip}/ -I`,
            tool: "curl",
            description: "Verifies if the server behaves differently with a standard browser User-Agent compared to automated tools.",
          },
        ],
        expectedSignals: [
          "Status code changes from 403 Forbidden to 200 OK or 302 Redirect",
          "Differential response body or header behavior",
        ],
      },
    };
  }

  if (key.includes("record-rejected-or-inconclusive-hypotheses")) {
    return {
      why: {
        principle: "Recording rejected hypotheses prevents cyclical testing of dead ends and preserves forensic methodology.",
        importance:
          "In high-pressure assessments, testers often re-test failed exploits because they didn't record why the vector failed.",
        mindset: "A refuted hypothesis is valuable data. Document the error output and mark it closed.",
      },
      what: {
        contextSummary: `${findingsSummary} Documenting inconclusive or refuted attack vectors.`,
        applicableFindings,
        relevance: "Preserves testing history and eliminates redundant failed attempts.",
      },
      how: {
        approach: "Update the hypothesis status in the workstation and record the terminal output proving why the attempt was refuted.",
        commands: [
          {
            label: "Record hypothesis outcome in workstation",
            command: `# In the Hypotheses tab, mark the hypothesis as 'Refuted' and document the failure reason`,
            tool: "terminal",
            description: "Attach terminal evidence showing the patch level, error message, or lack of vulnerability.",
          },
        ],
        expectedSignals: [
          "Hypothesis status updated to 'Refuted' or 'Inconclusive'",
          "Documented terminal proof of why the attack vector is non-viable",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.5 Core PTES Exploitation
// ----------------------------------------------------------------------------

function getExploitationFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("select-evidence-supported-hypothesis")) {
    return {
      why: {
        principle: "Exploitation must proceed in order of evidence strength, prioritizing the highest-confidence formulated hypothesis.",
        importance:
          "Executing unverified exploits damages target services, creates unnecessary noise, and wastes time on speculative attack paths.",
        mindset: "Execute the strongest hypothesis first. Method before exploit.",
      },
      what: {
        contextSummary: `${findingsSummary} Selecting high-confidence hypothesis for initial exploitation.`,
        applicableFindings,
        relevance: "Establishes which attack vector has sufficient evidentiary backing to attempt initial access.",
      },
      how: {
        approach: "Review formulated hypotheses in the workstation and select the one with verified prerequisites and available exploits.",
        commands: [
          {
            label: "Review formulated hypotheses in workstation",
            command: `# Open Hypotheses tab and select the hypothesis with status 'Formulated' and strongest supporting evidence`,
            tool: "terminal",
            description: "Verifies payload requirements and target connectivity before execution.",
          },
        ],
        expectedSignals: [
          "Target hypothesis clearly identified with verified port, service, and payload approach",
        ],
      },
    };
  }

  if (key.includes("record-test-approach")) {
    return {
      why: {
        principle: "Pre-planning exploit parameters (callback IP, port, listener, staging directory) prevents fatal errors during execution.",
        importance:
          "Firing a reverse shell without an active listener, or using the wrong network interface IP, burns an exploit opportunity and alerts defenses.",
        mindset: "Plan the landing before jumping: where will the shell connect, and what payload avoids filtering?",
      },
      what: {
        contextSummary: `${findingsSummary} Planning exploitation methodology and payload delivery.`,
        applicableFindings,
        relevance: "Prepares network listener, payload staging, and execution parameters.",
      },
      how: {
        approach: "Verify local VPN/LAN IP address, prepare an active listener, and inspect exploit script options.",
        commands: [
          {
            label: "Check local tun0/VPN IP address for reverse shell callback",
            command: `ip -4 addr show tun0 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'`,
            tool: "ip",
            description: "Verifies local VPN IP address to use in reverse shell payloads.",
          },
          {
            label: "Start Netcat listener with line wrapping and verbose output",
            command: `nc -lvnp 4444`,
            tool: "netcat",
            description: "-l listen, -v verbose, -n numeric, -p local port 4444.",
          },
        ],
        expectedSignals: [
          "Active listener waiting for incoming connections on designated port",
          "Verified local IP address for payload configuration",
        ],
      },
    };
  }

  if (key.includes("record-attempt-outcome")) {
    return {
      why: {
        principle: "Every exploit execution must be recorded immediately with its raw command, status, and target response.",
        importance:
          "Unrecorded attempts destroy assessment auditability. Recording outcomes enables post-session analysis and methodology scoring.",
        mindset: "Document every execution: whether it returned a root shell or an error 500.",
      },
      what: {
        contextSummary: `${findingsSummary} Recording exploitation attempt in workstation.`,
        applicableFindings,
        relevance: "Preserves timestamped log of commands run and target responses.",
      },
      how: {
        approach: "Create an Attempt record in the Attempts tab, linking the hypothesis and pasting terminal command output.",
        commands: [
          {
            label: "Record attempt in workstation",
            command: `# Navigate to Attempts tab, click [+ Record Attempt], and link to the relevant hypothesis`,
            tool: "terminal",
            description: "Record command executed, status (Successful, Failed, Inconclusive), and response snippet.",
          },
        ],
        expectedSignals: [
          "Documented attempt with associated status and output logs",
        ],
      },
    };
  }

  if (key.includes("document-initial-access")) {
    return {
      why: {
        principle: "Capturing user context and proof of access marks the transition to post-exploitation.",
        importance:
          "Proving access requires documenting user identity (whoami), system host (hostname), and captured flags.",
        mindset: "Document immediately upon connection: capture whoami, id, and user flag before modifying the system.",
      },
      what: {
        contextSummary: `${findingsSummary} Documenting verified initial access.`,
        applicableFindings,
        relevance: "Records proof of compromised account and initial foothold.",
      },
      how: {
        approach: "Execute standard situational awareness commands upon receiving an interactive shell.",
        commands: [
          {
            label: "Document user identity and system details",
            command: "id; whoami; hostname; ip a; cat user.txt",
            tool: "sh",
            description: "Captures user identity, group memberships, host IP, and user flag for proof of access.",
          },
        ],
        expectedSignals: [
          "Interactive shell prompt ($ or #)",
          "User flag string (e.g. 32-character MD5/hex hash)",
        ],
      },
    };
  }

  if (key.includes("minimize-repeated-attempts")) {
    return {
      why: {
        principle: "Repeatedly firing failing exploits causes service crashes, socket exhaustion, or account lockouts.",
        importance:
          "If an exploit fails twice with identical parameters, firing it a third time rarely succeeds. Stop, analyze errors, and adapt.",
        mindset: "Two failures mean reassess: check firewall blocks, architecture mismatch, or payload corruption.",
      },
      what: {
        contextSummary: `${findingsSummary} Auditing exploit attempts to prevent repeated failures.`,
        applicableFindings,
        relevance: "Enforces disciplined testing without brute-force spamming or crashing target services.",
      },
      how: {
        approach: "Analyze why the attempt failed (e.g. check web server error logs, firewall drops, or syntax errors) before re-testing.",
        commands: [
          {
            label: "Verify target port is still listening and healthy",
            command: `nc -zvw3 ${ip} <port>`,
            tool: "netcat",
            description: "-z zero-I/O (port scan), -v verbose, -w3 3-second timeout to confirm daemon did not crash.",
          },
          {
            label: "Inspect exploit script for hardcoded paths or offsets",
            command: `grep -E "offset|payload|target|http" exploit.py | head -n 20`,
            tool: "grep",
            description: "Verifies if the exploit requires adjusting memory offsets, target paths, or architecture flags.",
          },
        ],
        expectedSignals: [
          "Confirmation that target service is still responsive",
          "Identification of missing payload dependencies or incorrect paths",
        ],
      },
    };
  }

  if (key.includes("preserve-successful-access-evidence")) {
    return {
      why: {
        principle: "Proof of initial foothold must be documented immediately before session drops or machine resets occur.",
        importance:
          "Reverse shells in CTF environments can disconnect unexpectedly. Capturing proofs immediately guarantees evidence preservation.",
        mindset: "First shell? Immediately run id, hostname, and read the user flag before running any risky commands.",
      },
      what: {
        contextSummary: `${findingsSummary} Capturing empirical proof of initial access.`,
        applicableFindings,
        relevance: "Saves proof of compromised account and initial interactive session.",
      },
      how: {
        approach: "Execute identification commands and read user proof file, copying output to local session notes.",
        commands: [
          {
            label: "Preserve initial access evidence commands",
            command: `id; whoami; hostname; ip a; cat /home/*/user.txt`,
            tool: "sh",
            description: "Runs non-destructive situational awareness commands to capture user identity and user flag.",
          },
          {
            label: "Upgrade to fully interactive TTY shell",
            command: `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
            tool: "python3",
            description: "Spawns pseudo-terminal to enable tab completion, clear command, and Ctrl+C safety.",
          },
        ],
        expectedSignals: [
          "Interactive shell prompt ($)",
          "32-character user flag hash (e.g. user.txt)",
          "UID and GID information proving account access",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.6 Core PTES Post-Exploitation
// ----------------------------------------------------------------------------

function getPostExploitationFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("identify-user-and-privilege-context")) {
    return {
      why: {
        principle: "Initial post-exploitation requires understanding the current user identity, group memberships, and security tokens.",
        importance: "Know who you are before executing commands. Group memberships (e.g. docker, lxd, disk) often lead directly to root.",
        mindset: "Examine group memberships and environment variables immediately upon landing on the target.",
      },
      what: {
        contextSummary: `${findingsSummary} Assessing user context on compromised target.`,
        applicableFindings,
        relevance: "Establishes starting privilege baseline for internal privilege escalation.",
      },
      how: {
        approach: "Query user ID, supplementary groups, and process environment variables.",
        commands: [
          {
            label: "Inspect user ID and groups",
            command: "id; whoami; groups",
            tool: "sh",
            description: "Prints current user ID, group IDs, and supplementary groups.",
          },
          {
            label: "Enumerate users with shell access",
            command: "grep -vE 'nologin|false' /etc/passwd",
            tool: "grep",
            description: "Filters /etc/passwd to list all accounts with valid interactive login shells.",
          },
        ],
        expectedSignals: [
          "Membership in sensitive groups (docker, lxd, adm, sudo, wheel, disk)",
          "List of non-standard user accounts on the machine",
        ],
      },
    };
  }

  if (key.includes("identify-os-context")) {
    return {
      why: {
        principle: "Knowing the exact OS distribution, architecture, and kernel version determines binary compatibility for local exploits.",
        importance:
          "Executing an x86 binary on an ARM system, or compiling against the wrong libc version, fails immediately or corrupts memory.",
        mindset: "Identify kernel release and OS distribution before compiling or transferring any binaries.",
      },
      what: {
        contextSummary: `${findingsSummary} Determining operating system and kernel specifications.`,
        applicableFindings,
        relevance: "Discovers kernel version, distribution release, and CPU architecture.",
      },
      how: {
        approach: "Execute OS release and kernel query commands on the compromised target.",
        commands: [
          {
            label: "Display kernel version and architecture",
            command: `uname -a; cat /etc/os-release 2>/dev/null`,
            tool: "uname",
            description: "Outputs Linux kernel version, architecture (x86_64, aarch64), and OS distribution name/version.",
          },
        ],
        expectedSignals: [
          "Kernel version (e.g. Linux 5.15.0-89-generic x86_64)",
          "Distribution details (e.g. Ubuntu 22.04 LTS, Debian 11)",
        ],
      },
    };
  }

  if (key.includes("enumerate-local-attack-surface")) {
    return {
      why: {
        principle: "Local enumeration uncovers internal attack surfaces: writable directories, installed compilers, and local scripts.",
        importance:
          "Attackers often assume the system has no tools. Finding Python, GCC, or writable /tmp directories enables custom tooling.",
        mindset: "Take inventory of available tools: what runtimes and compilers are installed? Where can we write files?",
      },
      what: {
        contextSummary: `${findingsSummary} Enumerating local tools, runtimes, and writable locations.`,
        applicableFindings,
        relevance: "Discovers available compilers, interpreters, and writable staging directories for privilege escalation.",
      },
      how: {
        approach: "Check for installed programming languages, compilers, transfer utilities, and writable filesystem locations.",
        commands: [
          {
            label: "Check installed runtimes and download tools",
            command: `which python python3 gcc perl ruby php curl wget nc busybox 2>/dev/null`,
            tool: "which",
            description: "Identifies available utilities for downloading files and executing local scripts.",
          },
          {
            label: "Find writable directories for payload staging",
            command: `find /tmp /var/tmp /dev/shm -maxdepth 2 -writable -type d 2>/dev/null`,
            tool: "find",
            description: "Identifies standard staging directories where unprivileged users have write permissions.",
          },
        ],
        expectedSignals: [
          "Installed interpreters (e.g. /usr/bin/python3, /usr/bin/curl)",
          "Writable directories (e.g. /dev/shm, /tmp)",
        ],
      },
    };
  }

  if (key.includes("review-credential-and-secret-exposure")) {
    return {
      why: {
        principle: "Stored credentials in bash history, web configuration files, and backups are the fastest route to privilege escalation.",
        importance:
          "Developers frequently hardcode database root passwords or leave cleartext credentials in scripts, rendering complex exploits unnecessary.",
        mindset: "Check bash history and configuration files before attempting kernel exploits.",
      },
      what: {
        contextSummary: `${findingsSummary} Searching for cleartext credentials and secret keys.`,
        applicableFindings,
        relevance: "Discovers stored passwords, private SSH keys, and database connection strings.",
      },
      how: {
        approach: "Search user home directories, shell histories, and web server configs for password patterns.",
        commands: [
          {
            label: "Inspect shell history files for passwords or sensitive commands",
            command: `cat ~/.bash_history ~/.zsh_history 2>/dev/null | grep -iE "pass|pwd|admin|ssh|mysql" | tail -n 20`,
            tool: "cat",
            description: "Searches past terminal commands for leaked credentials or administrative connection strings.",
          },
          {
            label: "Search web configuration files for database passwords",
            command: `grep -rnE "(password|passwd|DB_PASS|secret)" /var/www/ 2>/dev/null | head -n 20`,
            tool: "grep",
            description: "Extracts database credentials and API secrets from web application configuration files.",
          },
        ],
        expectedSignals: [
          "Database passwords in wp-config.php, .env, or config.php",
          "Passphrases entered in command lines in ~/.bash_history",
        ],
      },
    };
  }

  if (
    key.includes("review-privilege-escalation-surfaces") ||
    key.includes("sudo") ||
    key.includes("suid") ||
    key.includes("privilege-enumeration")
  ) {
    return {
      why: {
        principle: "Auditing Sudo rights and SUID binaries identifies misconfigurations that grant root privileges.",
        importance:
          "Sudo misconfigurations (e.g. NOPASSWD binaries in GTFOBins) and custom SUID executables are the most common privilege escalation vectors in Linux environments.",
        mindset: "Check simple local permissions before analyzing complex kernel exploits.",
      },
      what: {
        contextSummary: `${findingsSummary} Auditing local privilege escalation surfaces.`,
        applicableFindings,
        relevance: "Identifies commands or binaries executable with elevated root authority.",
      },
      how: {
        approach: "Check sudo permissions and search filesystem for SUID binaries owned by root.",
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
        ],
        expectedSignals: [
          "NOPASSWD entries in sudo -l output matching GTFOBins",
          "Custom SUID binaries in /usr/local/bin, /opt, or home directories",
        ],
      },
    };
  }

  if (key.includes("form-privilege-escalation-hypotheses")) {
    return {
      why: {
        principle: "Formulating a privilege escalation hypothesis ensures each escalation attempt has clear prerequisites and expected outcome.",
        importance:
          "Blindly running automated privesc scripts without hypotheses causes testers to miss subtle vectors or corrupt system binaries.",
        mindset: "Identify the vector (SUID, sudo, cron, kernel) and verify GTFOBins before running arbitrary exploit code.",
      },
      what: {
        contextSummary: `${findingsSummary} Formulating privilege escalation hypothesis based on local findings.`,
        applicableFindings,
        relevance: "Structures local findings into actionable privilege escalation plans.",
      },
      how: {
        approach: "Correlate discovered SUID binaries or sudo rights with GTFOBins, and formulate hypothesis in workstation.",
        commands: [
          {
            label: "Formulate privesc hypothesis in workstation",
            command: `# Click [+ Formulate Hypothesis] on the SUID or Sudo finding in Findings tab`,
            tool: "terminal",
            description: "Record the intended privilege escalation vector, prerequisite binary, and expected root shell.",
          },
        ],
        expectedSignals: [
          "Documented hypothesis linking local finding to elevated root privilege",
        ],
      },
    };
  }

  if (key.includes("document-privilege-escalation")) {
    return {
      why: {
        principle: "Capturing proof of root or SYSTEM access marks the completion of the target compromise.",
        importance:
          "Proof of root access (uid=0) and the root flag is the definitive requirement for CTF machine completion.",
        mindset: "Document root access immediately: whoami, id, and root.txt proof.",
      },
      what: {
        contextSummary: `${findingsSummary} Documenting successful privilege escalation to root.`,
        applicableFindings,
        relevance: "Records proof of complete system takeover.",
      },
      how: {
        approach: "Execute identification commands as root and capture the root flag content.",
        commands: [
          {
            label: "Capture root privilege evidence and root flag",
            command: `id; whoami; hostname; cat /root/root.txt`,
            tool: "sh",
            description: "Confirms uid=0(root) and retrieves root flag for assessment proof.",
          },
        ],
        expectedSignals: [
          "uid=0(root) gid=0(root) in id output",
          "32-character root flag string from /root/root.txt",
        ],
      },
    };
  }

  if (key.includes("review-network-context")) {
    return {
      why: {
        principle: "Internal listening ports bound to 127.0.0.1 host internal services not reachable from external port scans.",
        importance:
          "Internal databases (MySQL, Redis, MongoDB) or administrative proxies listening only on localhost often have default or no passwords.",
        mindset: "What is listening on 127.0.0.1? Local services are rarely hardened against local users.",
      },
      what: {
        contextSummary: `${findingsSummary} Auditing internal network interfaces, listening sockets, and routing.`,
        applicableFindings,
        relevance: "Discovers hidden internal daemons and secondary network interfaces.",
      },
      how: {
        approach: "Inspect active listening sockets and network routing tables on the compromised host.",
        commands: [
          {
            label: "List active listening TCP/UDP ports",
            command: `ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null`,
            tool: "ss",
            description: "Displays all listening ports, highlighting services bound to 127.0.0.1 or 0.0.0.0.",
          },
          {
            label: "Check network interfaces and ARP cache",
            command: `ip addr; arp -e 2>/dev/null || ip neigh`,
            tool: "ip",
            description: "Discovers secondary subnets (e.g. docker0, internal LAN) and neighboring host IPs.",
          },
        ],
        expectedSignals: [
          "Local-only ports (e.g. 127.0.0.1:3306 for MySQL, 127.0.0.1:6379 for Redis, 127.0.0.1:8080)",
          "Secondary network interfaces indicating internal subnets or container bridges",
        ],
      },
    };
  }

  if (key.includes("review-running-processes-and-services")) {
    return {
      why: {
        principle: "Auditing running processes identifies background services running with root privileges that may be vulnerable to injection.",
        importance:
          "Custom automation scripts, internal web servers, or unpatched monitoring daemons running as root provide direct privilege escalation vectors.",
        mindset: "Review what root is running. Are there custom scripts or binaries running out of /opt or /usr/local?",
      },
      what: {
        contextSummary: `${findingsSummary} Inspecting running processes and root-owned background daemons.`,
        applicableFindings,
        relevance: "Identifies processes running as root or specialized service accounts.",
      },
      how: {
        approach: "List running processes and look for custom applications or cron-driven executions.",
        commands: [
          {
            label: "List non-kernel running processes sorted by user",
            command: `ps aux | grep -v "\\[" | head -n 30`,
            tool: "ps",
            description: "Filters out kernel threads to display actual user and root user space processes.",
          },
          {
            label: "Monitor process creation in real-time with pspy (if uploaded)",
            command: `./pspy64 -pf -i 1000`,
            tool: "pspy",
            description: "Snoops on cron jobs and ephemeral process executions without requiring root permissions.",
          },
        ],
        expectedSignals: [
          "Processes running custom scripts (e.g. python3 /opt/backup.py, bash /var/scripts/cleanup.sh)",
          "High-privilege daemons with accessible local configuration files",
        ],
      },
    };
  }

  if (key.includes("review-scheduled-execution")) {
    return {
      why: {
        principle: "Cron jobs, at jobs, and systemd timers executing scripts as root are classic privilege escalation vectors if the script or directory is writable.",
        importance:
          "If root executes a script that a low-privileged user can edit, modifying the script grants instant root code execution.",
        mindset: "Find what runs periodically as root. Is the script writable? Is the PATH variable vulnerable to hijacking?",
      },
      what: {
        contextSummary: `${findingsSummary} Reviewing scheduled tasks, crontabs, and timers.`,
        applicableFindings,
        relevance: "Discovers recurring background tasks running with root privileges.",
      },
      how: {
        approach: "Check system-wide crontab files, /etc/cron.* directories, and systemd timers for writable scripts.",
        commands: [
          {
            label: "Inspect system crontabs and cron directories",
            command: `cat /etc/crontab /etc/cron.d/* 2>/dev/null; ls -la /etc/cron.daily /etc/cron.hourly 2>/dev/null`,
            tool: "cat",
            description: "Displays recurring scheduled tasks executed by the cron daemon.",
          },
          {
            label: "List active systemd timer units",
            command: `systemctl list-timers 2>/dev/null`,
            tool: "systemctl",
            description: "Lists systemd timers that execute periodic services on modern Linux systems.",
          },
        ],
        expectedSignals: [
          "Cron entries with wildcard (*) or root ownership",
          "Writable scripts executed periodically by root (check permissions with ls -la)",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.7 Core PTES Reporting
// ----------------------------------------------------------------------------

function getReportingFallback(
  key: string,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
): CheckExplanation | null {
  if (key.includes("document-meaningful-findings")) {
    return {
      why: {
        principle: "Meaningful findings consolidate verified vulnerabilities, affected assets, and evidence into an actionable risk catalog.",
        importance: "Without a structured catalog of findings, defenders cannot prioritize patch deployment or assess risk accurately.",
        mindset: "Quality over quantity. Document each confirmed flaw with proof and context.",
      },
      what: {
        contextSummary: `${findingsSummary} Consolidating verified findings into report-ready documentation.`,
        applicableFindings,
        relevance: "Ensures all confirmed evidence has corresponding structured vulnerability documentation.",
      },
      how: {
        approach: "Audit all findings in the Findings tab, ensuring each finding has accurate description, severity, and supporting evidence.",
        commands: [
          {
            label: "Review findings catalog in workstation",
            command: `# Open Findings tab and verify all discovered ports, services, and vulnerabilities are documented`,
            tool: "terminal",
            description: "Audit finding titles, categories, and evidence states to ensure completeness.",
          },
        ],
        expectedSignals: [
          "Complete inventory of confirmed vulnerabilities and exposed assets",
          "Accurate severity classifications based on potential impact",
        ],
      },
    };
  }

  if (key.includes("document-attack-path")) {
    return {
      why: {
        principle: "The end-to-end attack path illustrates how initial reconnaissance linked to exploitation and privilege escalation.",
        importance: "Clients need to visualize the complete kill chain to understand how minor misconfigurations cascaded into full compromise.",
        mindset: "Narrate the attack step-by-step: entry point -> initial access -> internal recon -> privilege escalation.",
      },
      what: {
        contextSummary: `${findingsSummary} Outlining the end-to-end attack path.`,
        applicableFindings,
        relevance: "Provides holistic visualization of the machine compromise sequence.",
      },
      how: {
        approach: "Review the attack graph and timeline in the Review tab to document the narrative kill chain.",
        commands: [
          {
            label: "Review attack graph and timeline in workstation",
            command: `# Open Review tab and examine the Attack Graph node progression and timeline`,
            tool: "terminal",
            description: "Summarize the sequence of actions that led from reconnaissance to root access.",
          },
        ],
        expectedSignals: [
          "Clear chronological kill-chain narrative",
          "Visual attack graph nodes corresponding to each confirmed stage",
        ],
      },
    };
  }

  if (key.includes("document-initial-access")) {
    return {
      why: {
        principle: "Documenting initial access provides exact, reproducible steps for the perimeter breach.",
        importance: "Defenders must be able to reproduce the initial compromise to verify that security controls or patches work.",
        mindset: "Provide exact commands, scripts, parameters, and flags that achieved first shell access.",
      },
      what: {
        contextSummary: `${findingsSummary} Documenting initial access reproduction steps.`,
        applicableFindings,
        relevance: "Provides technical proof and walkthrough for the initial breach vector.",
      },
      how: {
        approach: "Record the exact terminal commands, payload URLs, and listener settings used to obtain the user shell.",
        commands: [
          {
            label: "Document initial access command and payload",
            command: `# Paste exact exploit command, listener setup, and user.txt flag proof into session documentation`,
            tool: "terminal",
            description: "Ensure IP addresses, ports, and payload parameters are clearly specified.",
          },
        ],
        expectedSignals: [
          "Reproducible command line instructions",
          "User flag verification string",
        ],
      },
    };
  }

  if (key.includes("document-privilege-escalation")) {
    return {
      why: {
        principle: "Documenting privilege escalation explains how an unprivileged user escalated to root or SYSTEM authority.",
        importance: "Understanding internal privilege escalation allows system administrators to harden local permissions and sudo configurations.",
        mindset: "Document the exact misconfiguration, binary path, and commands that yielded root.",
      },
      what: {
        contextSummary: `${findingsSummary} Documenting internal privilege escalation steps.`,
        applicableFindings,
        relevance: "Details the local vulnerability that allowed complete system takeover.",
      },
      how: {
        approach: "Document the SUID binary, sudoers rule, or cron job exploited, along with the command that spawned root.",
        commands: [
          {
            label: "Document privesc exploit and root flag proof",
            command: `# Paste privilege escalation command sequence and root.txt flag into session documentation`,
            tool: "terminal",
            description: "Detail local exploit steps, GTFOBins references, and proof of root UID.",
          },
        ],
        expectedSignals: [
          "Step-by-step privesc reproduction guide",
          "Root flag verification string",
        ],
      },
    };
  }

  if (key.includes("document-root-cause")) {
    return {
      why: {
        principle: "Root cause analysis identifies the fundamental engineering or procedural defect that allowed the vulnerability to exist.",
        importance: "Fixing vulnerabilities without addressing the root cause guarantees similar flaws will reappear elsewhere in the codebase.",
        mindset: "Ask 'why' 5 times: why was input unvalidated? Why was sudo configured with NOPASSWD?",
      },
      what: {
        contextSummary: `${findingsSummary} Analyzing underlying root causes for discovered vulnerabilities.`,
        applicableFindings,
        relevance: "Explains fundamental architectural and configuration weaknesses.",
      },
      how: {
        approach: "Categorize each vulnerability by root cause: missing input validation, outdated dependency, or least-privilege violation.",
        commands: [
          {
            label: "Classify root causes in documentation",
            command: `# Document root causes (e.g. CWE-89 SQLi, CWE-78 Command Injection, or CWE-250 Least Privilege)`,
            tool: "terminal",
            description: "Map technical findings to industry-standard CWE categories.",
          },
        ],
        expectedSignals: [
          "Identified root cause category (architectural, operational, or code-level)",
          "Explanation of design failure leading to exploitation",
        ],
      },
    };
  }

  if (key.includes("document-impact")) {
    return {
      why: {
        principle: "Impact analysis translates technical flaws into potential damage to data confidentiality, system integrity, and service availability.",
        importance: "Executives and stakeholders prioritize remediation based on business impact, not technical complexity.",
        mindset: "Evaluate the CIA triad: what data could be leaked? What systems could be modified or knocked offline?",
      },
      what: {
        contextSummary: `${findingsSummary} Assessing overall security impact of the compromise.`,
        applicableFindings,
        relevance: "Quantifies business and technical damage resulting from full target compromise.",
      },
      how: {
        approach: "Document potential impact across Confidentiality, Integrity, and Availability (CIA triad).",
        commands: [
          {
            label: "Document CIA triad impact",
            command: `# Summarize Confidentiality (data exfiltration), Integrity (database alteration), and Availability (service denial)`,
            tool: "terminal",
            description: "Detail maximum potential attacker capabilities with root access.",
          },
        ],
        expectedSignals: [
          "Explicit CIA impact assessment",
          "Identification of sensitive assets exposed during compromise",
        ],
      },
    };
  }

  if (key.includes("document-mitigation")) {
    return {
      why: {
        principle: "Actionable mitigation advice provides concrete configuration and code changes to permanently resolve vulnerabilities.",
        importance: "Telling an organization they are vulnerable without practical remediation advice provides zero defensive value.",
        mindset: "Provide practical, copy-pasteable configuration and code patches that eliminate the vulnerability.",
      },
      what: {
        contextSummary: `${findingsSummary} Formulating remediation and hardening guidance.`,
        applicableFindings,
        relevance: "Provides defensive recommendations to prevent future exploitation.",
      },
      how: {
        approach: "Formulate short-term tactical fixes (e.g. patch software, restrict ports) and long-term strategic hardening.",
        commands: [
          {
            label: "Detail mitigation commands and configuration fixes",
            command: `# Document exact patch instructions, sudoers restrictions, and input sanitization code snippets`,
            tool: "terminal",
            description: "Provide explicit defensive recommendations for both initial access and privilege escalation.",
          },
        ],
        expectedSignals: [
          "Tactical patch recommendations (e.g. upgrade package to version >= X)",
          "Strategic hardening controls (e.g. remove NOPASSWD from sudoers, implement WAF)",
        ],
      },
    };
  }

  if (key.includes("summarize-methodology-lessons")) {
    return {
      why: {
        principle: "Reflecting on methodology adherence, deviations, and rabbit holes strengthens disciplined penetration testing habits.",
        importance: "Learning which assumptions failed and where methodology was skipped prevents repeated mistakes on future machines.",
        mindset: "Review your process: did you formulate hypotheses before attacking? Did you skip reconnaissance steps?",
      },
      what: {
        contextSummary: `${findingsSummary} Reflecting on methodology metrics and training discipline.`,
        applicableFindings,
        relevance: "Evaluates procedural discipline, Phase Gate compliance, and hypothesis formulation.",
      },
      how: {
        approach: "Review session metrics in the Review tab, noting gate deviations, hint reliance, and coverage scores.",
        commands: [
          {
            label: "Inspect session metrics and radar charts",
            command: `# Review radar charts, Phase Gate deviations, and coverage metrics in the Review tab`,
            tool: "terminal",
            description: "Identify strengths and areas for methodological improvement.",
          },
        ],
        expectedSignals: [
          "Analysis of Phase Gate compliance and deviations",
          "Self-reflection on time spent in rabbit holes vs structured enumeration",
        ],
      },
    };
  }

  if (key.includes("record-alternative-paths")) {
    return {
      why: {
        principle: "Documenting secondary services and rabbit holes preserves valuable intelligence for future testing and comprehensive defense.",
        importance: "Targets often have secondary vulnerabilities that were not needed for the primary path but still represent security risks.",
        mindset: "What else was running? Just because we didn't use SSH or FTP doesn't mean it is secure.",
      },
      what: {
        contextSummary: `${findingsSummary} Recording unexplored services, alternative vectors, and rabbit holes.`,
        applicableFindings,
        relevance: "Documents secondary attack surfaces not utilized in the primary exploitation path.",
      },
      how: {
        approach: "Record notes on unexploited open ports and why they were deprioritized during threat modeling.",
        commands: [
          {
            label: "Record alternative attack vectors in session notes",
            command: `# Note secondary open ports and potential alternative exploitation avenues in session notes`,
            tool: "terminal",
            description: "Preserve full audit trail of all explored and unexplored avenues.",
          },
        ],
        expectedSignals: [
          "List of deprioritized ports and services with rationale",
          "Identification of potential secondary vectors for future testing",
        ],
      },
    };
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3.8 Universal Smart Fallback
// ----------------------------------------------------------------------------

function getUniversalFallback(
  check: SessionCheckRecord,
  ip: string,
  findingsSummary: string,
  applicableFindings: string[],
  phaseMetadata?: PhaseMetadata,
): CheckExplanation {
  return {
    why: {
      principle: phaseMetadata?.tagLine || `Follow structured methodology for "${check.title}" to ensure thorough security coverage.`,
      importance:
        phaseMetadata?.whyItMatters ||
        `Performing "${check.title}" systematically prevents missed attack surfaces and maintains rigorous assessment standards.`,
      mindset: phaseMetadata?.mindset || "Evidence before action. Method before exploit.",
    },
    what: {
      contextSummary: `${findingsSummary} Methodology check: ${check.title}.`,
      applicableFindings,
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

// ----------------------------------------------------------------------------
// 3.9 Main Curated Fallback Dispatcher
// ----------------------------------------------------------------------------

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

  // 1. Service Playbook checks
  if (key.includes(".http.") || key.startsWith("service.http") || key.startsWith("playbook.http")) {
    return getHttpPlaybookFallback(key, ip, findingsSummary, applicableFindings);
  }
  if (key.includes(".ssh.") || key.startsWith("service.ssh") || key.startsWith("playbook.ssh")) {
    return getSshPlaybookFallback(key, ip, findingsSummary, applicableFindings);
  }
  if (key.includes(".smb.") || key.startsWith("service.smb") || key.startsWith("playbook.smb")) {
    return getSmbPlaybookFallback(key, ip, findingsSummary, applicableFindings);
  }
  if (key.includes(".ftp.") || key.startsWith("service.ftp") || key.startsWith("playbook.ftp")) {
    return getFtpPlaybookFallback(key, ip, findingsSummary, applicableFindings);
  }

  // 2. Core PTES Phases (checked by semanticKey prefix or phase.semanticKey)
  if (phase.semanticKey === "threat-modeling" || key.startsWith("threat-modeling.")) {
    const tm = getThreatModelingFallback(key, ip, findingsSummary, applicableFindings);
    if (tm) return tm;
  }

  if (phase.semanticKey === "reconnaissance" || key.startsWith("reconnaissance.")) {
    const recon = getReconnaissanceFallback(key, ip, findingsSummary, applicableFindings);
    if (recon) return recon;
  }

  if (phase.semanticKey === "vulnerability-analysis" || key.startsWith("vulnerability-analysis.")) {
    const va = getVulnerabilityAnalysisFallback(key, ip, findingsSummary, applicableFindings);
    if (va) return va;
  }

  if (phase.semanticKey === "exploitation" || key.startsWith("exploitation.")) {
    const exp = getExploitationFallback(key, ip, findingsSummary, applicableFindings);
    if (exp) return exp;
  }

  if (phase.semanticKey === "post-exploitation" || key.startsWith("post-exploitation.")) {
    const post = getPostExploitationFallback(key, ip, findingsSummary, applicableFindings);
    if (post) return post;
  }

  if (phase.semanticKey === "reporting" || key.startsWith("reporting.")) {
    const rep = getReportingFallback(key, ip, findingsSummary, applicableFindings);
    if (rep) return rep;
  }

  // 3. Universal Fallback
  return getUniversalFallback(check, ip, findingsSummary, applicableFindings, phaseMetadata);
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

REQUIRED JSON OUTPUT FORMAT:
You MUST respond with a valid JSON object matching this EXACT schema:
{
  "why": {
    "principle": "The core PTES methodology principle and rationale for this specific check",
    "importance": "Why this specific step is essential before progressing and concrete risks of skipping it",
    "mindset": "Professional mindset or rule of thumb for this check"
  },
  "what": {
    "contextSummary": "How this specific check relates to confirmed findings and current target state",
    "applicableFindings": ["List of specific confirmed findings or services this check directly targets"],
    "relevance": "Why this specific check is currently active or recommended in this engagement"
  },
  "how": {
    "approach": "Step-by-step procedural approach to conduct this check manually",
    "commands": [
      {
        "label": "Description of what this command does",
        "command": "The exact terminal command line ready to execute, with target IP substituted",
        "tool": "Primary tool name (e.g. nmap, curl, gobuster, ssh, etc.)",
        "description": "Explanation of key flags, syntax, or expected output"
      }
    ],
    "expectedSignals": ["Key signs, banners, status codes, or indicators to look for in output"]
  }
}

Remember:
- Ground Layer 2 (What) ONLY in the confirmed findings above. Do NOT speculate or reveal hidden machine solutions.
- Provide runnable, realistic terminal commands in Layer 3 (How) with the actual target IP substituted.
- Tailor the explanation SPECIFICALLY to "${check.title}" (${check.semanticKey}).`;

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
    } catch (error) {
      console.warn(
        `[Check Explanation] AI generation failed for check "${targetCheck.semanticKey}", falling back to curated:`,
        error,
      );
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
