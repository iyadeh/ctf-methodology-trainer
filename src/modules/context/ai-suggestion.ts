import { z } from "zod";
import { isGeminiConfigured } from "../ai/client";
import { generateStructuredAI } from "../ai/structured";
import { normalizeContext } from "./engine";

// ============================================================================
// 1. Zod Schema Definition
// ============================================================================

export const contextSuggestionSchema = z.object({
  hasSuggestion: z
    .boolean()
    .describe("Whether a valid canonical context could be identified from the finding"),
  contextKind: z
    .enum(["service", "protocol", "os", "surface", "technology", "access"])
    .nullable()
    .describe("The canonical Context Kind"),
  contextValue: z
    .string()
    .nullable()
    .describe("The canonical Context Value matching system playbooks (e.g. http, ssh, local-shell, root-shell, linux, etc.)"),
  category: z
    .string()
    .optional()
    .describe("Suggested finding category if applicable"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the recommendation"),
  reasoning: z
    .string()
    .describe("Clear, concise explanation for learner of why this context was suggested and what it activates"),
  activatesPlaybook: z
    .string()
    .optional()
    .describe("Name of the playbook activated by this context, if any"),
});

export type ContextSuggestion = z.infer<typeof contextSuggestionSchema>;

export interface SuggestCanonicalContextInput {
  readonly title: string;
  readonly evidence: string;
  readonly category?: string;
  readonly currentContextKind?: string | null;
  readonly currentContextValue?: string | null;
}

// ============================================================================
// 2. Offline / Heuristic Fallback Analyzer (100% Deterministic)
// ============================================================================

export function detectContextHeuristically(
  input: SuggestCanonicalContextInput,
): ContextSuggestion {
  const combined = `${input.title} ${input.evidence} ${input.category ?? ""} ${input.currentContextValue ?? ""}`.toLowerCase();

  // 1. Root Access
  if (
    combined.includes("uid=0(root)") ||
    combined.includes("root@") ||
    combined.includes("cat /root/root.txt") ||
    combined.includes("root.txt")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "access",
      contextValue: "root-shell",
      category: "Privilege Escalation",
      confidence: "high",
      reasoning: "Evidence demonstrates root shell execution (uid=0). Setting access: root-shell completes local privilege escalation objectives.",
      activatesPlaybook: "Linux Post-Exploitation & Privilege Escalation",
    };
  }

  // 2. Local Shell / Command Execution / Sudo / User Switching
  if (
    combined.includes("sudo") ||
    combined.includes("nopasswd") ||
    combined.includes("uid=") ||
    combined.includes("groups=") ||
    combined.includes("chaoji") ||
    combined.includes("/bin/bash") ||
    combined.includes("/bin/sh") ||
    combined.includes("whoami") ||
    combined.includes("$ id") ||
    combined.includes("chaojibaolong@") ||
    combined.includes("chaojiwudilong@") ||
    combined.includes("linpeas") ||
    combined.includes("gtfobins")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "access",
      contextValue: "local-shell",
      category: "Local Privilege Escalation",
      confidence: "high",
      reasoning: "Terminal output shows local command execution and user privilege context. Setting access: local-shell immediately activates the Linux Post-Exploitation Playbook.",
      activatesPlaybook: "Linux Post-Exploitation & Privilege Escalation",
    };
  }

  // 3. Web / HTTP
  if (
    combined.includes("apache") ||
    combined.includes("nginx") ||
    combined.includes("http/") ||
    combined.includes("http://") ||
    combined.includes("https://") ||
    combined.includes("werkzeug") ||
    combined.includes("port 80") ||
    combined.includes("port 443") ||
    combined.includes("port 8080") ||
    combined.includes("curl ") ||
    combined.includes("gobuster dir") ||
    combined.includes("ffuf ")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "service",
      contextValue: "http",
      category: "Web Application",
      confidence: "high",
      reasoning: "Evidence relates to web server endpoints and HTTP responses. Setting service: http activates the HTTP Web Application Reconnaissance Playbook.",
      activatesPlaybook: "HTTP / Web Application",
    };
  }

  // 4. SSH
  if (
    combined.includes("openssh") ||
    combined.includes("port 22") ||
    combined.includes("ssh-") ||
    combined.includes("ssh2")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "service",
      contextValue: "ssh",
      category: "Remote Access",
      confidence: "high",
      reasoning: "Evidence reflects SSH service configuration and key authentication. Setting service: ssh activates the SSH Service Enumeration Playbook.",
      activatesPlaybook: "SSH Service Enumeration",
    };
  }

  // 5. SMB
  if (
    combined.includes("smb") ||
    combined.includes("samba") ||
    combined.includes("port 445") ||
    combined.includes("port 139") ||
    combined.includes("smbclient")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "service",
      contextValue: "smb",
      category: "File Sharing",
      confidence: "high",
      reasoning: "Evidence reflects SMB file sharing and share enumeration. Setting service: smb activates the SMB Enumeration Playbook.",
      activatesPlaybook: "SMB Enumeration",
    };
  }

  // 6. FTP
  if (
    combined.includes("ftp") ||
    combined.includes("vsftpd") ||
    combined.includes("proftpd") ||
    combined.includes("port 21") ||
    combined.includes("anonymous login")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "service",
      contextValue: "ftp",
      category: "File Transfer",
      confidence: "high",
      reasoning: "Evidence reflects FTP service interaction. Setting service: ftp activates the FTP Enumeration Playbook.",
      activatesPlaybook: "FTP Enumeration",
    };
  }

  // 7. Linux OS
  if (
    combined.includes("linux") ||
    combined.includes("ubuntu") ||
    combined.includes("debian") ||
    combined.includes("centos") ||
    combined.includes("arch") ||
    combined.includes("uname -a") ||
    combined.includes("/etc/os-release")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "os",
      contextValue: "linux",
      category: "Operating System",
      confidence: "high",
      reasoning: "Evidence confirms target operating system is Linux. Setting os: linux ensures Linux playbooks target this environment.",
    };
  }

  // 8. Windows OS
  if (
    combined.includes("windows") ||
    combined.includes("microsoft") ||
    combined.includes("powershell") ||
    combined.includes("cmd.exe")
  ) {
    return {
      hasSuggestion: true,
      contextKind: "os",
      contextValue: "windows",
      category: "Operating System",
      confidence: "high",
      reasoning: "Evidence confirms target operating system is Windows.",
      activatesPlaybook: "Windows Post-Exploitation",
    };
  }

  // Default: no confident heuristic match
  return {
    hasSuggestion: false,
    contextKind: null,
    contextValue: null,
    confidence: "low",
    reasoning: "Evidence did not match common service or access patterns. You can select a Context Kind and Value manually or choose a Smart Chip.",
  };
}

// ============================================================================
// 3. AI Structured Context Suggestion (Gemini-Powered)
// ============================================================================

const CONTEXT_DETECTION_SYSTEM_PROMPT = `You are an expert penetration testing assistant specialized in context normalization and PTES methodology.
Your mission is to analyze finding details (title, evidence output, notes) and map them to the application's supported CANONICAL Context Kind and Context Value.

SUPPORTED CANONICAL CONTEXT CATALOG:
1. "service":
   - "http" (for web servers: Apache, Nginx, IIS, Werkzeug, Flask, web ports 80/443/8080/etc., curl output, gobuster/ffuf) -> Activates HTTP Playbook
   - "ssh" (OpenSSH, port 22, ssh banners) -> Activates SSH Playbook
   - "smb" (Samba, Microsoft SMB, ports 139/445, shares) -> Activates SMB Playbook
   - "ftp" (FTP daemons, vsftpd, proftpd, port 21) -> Activates FTP Playbook
   - "dns" (port 53, zone transfers) -> Activates DNS Playbook
   - "snmp" (port 161, community strings) -> Activates SNMP Playbook
   - "ldap" (ports 389/636) -> Activates LDAP Playbook
   - "nfs" (port 2049, exports) -> Activates NFS Playbook
   - "smtp" (port 25, mail server) -> Activates SMTP Playbook
   - other known service names: "mysql", "postgresql", "redis", "mongodb"
2. "access":
   - "local-shell" (IMPORTANT: any unprivileged local shell session, terminal command output, sudo -l, user pivoting, id, bash, sh, whoami) -> Activates Linux Post-Exploitation Playbook
   - "root-shell" (root/SYSTEM shell access, uid=0, root.txt) -> Completes privilege escalation
   - "remote-shell" (reverse shell listener established)
3. "os":
   - "linux" (Linux kernel, Ubuntu, Debian, CentOS, /etc/os-release)
   - "windows" (Windows Server, Active Directory, powershell)
4. "surface":
   - "web" (web application surface)
   - "authentication" (login forms, sudo rules, credentials)
   - "api" (REST API, GraphQL)
   - "file-sharing" (SMB, NFS, FTP shares)
5. "technology":
   - "wordpress", "drupal", "joomla"

CRITICAL RULES:
- If the user provides terminal output showing command execution on the target machine (such as 'sudo -l', 'id', 'whoami', switching users, or running scripts on the host), this represents SHELL ACCESS on the machine. You MUST suggest contextKind: "access" and contextValue: "local-shell" (or "root-shell" if uid=0 / root).
- If the user wrote a non-canonical context value (e.g. "sudo NOPASSWD" or "parser_core debug mode, chaojiwudilong"), map it to the proper canonical key: contextKind "access", contextValue "local-shell".
- Always provide clear reasoning explaining why this context fits and what playbook or methodology check it activates.
- If the finding does not correspond to any known canonical context, set hasSuggestion: false, contextKind: null, contextValue: null.
`;

export async function suggestCanonicalContext(
  input: SuggestCanonicalContextInput,
): Promise<ContextSuggestion> {
  const { title, evidence, category, currentContextKind, currentContextValue } = input;

  // If Gemini is not configured, fallback gracefully to deterministic heuristic
  if (!isGeminiConfigured()) {
    return detectContextHeuristically(input);
  }

  const prompt = `Analyze this penetration testing finding and determine the most appropriate Canonical Context Kind and Value:

Finding Information:
- Title: ${title || "(No title provided)"}
- Category: ${category || "(No category provided)"}
- Current Context Kind: ${currentContextKind || "(None)"}
- Current Context Value: ${currentContextValue || "(None)"}

Evidence / Terminal Output:
\`\`\`
${evidence || "(No evidence provided)"}
\`\`\`

Determine:
1. Can this be mapped to a canonical context (service, access, os, surface, technology)?
2. If so, which exact canonical contextKind and contextValue?
3. What is the reasoning for this suggestion and what playbook will it activate?`;

  try {
    const aiResult = await generateStructuredAI<ContextSuggestion>({
      systemInstruction: CONTEXT_DETECTION_SYSTEM_PROMPT,
      contents: prompt,
      schema: contextSuggestionSchema,
      temperature: 0.1,
    });

    // Verify if AI's suggested contextValue actually normalizes
    if (aiResult.hasSuggestion && aiResult.contextKind && aiResult.contextValue) {
      const canonical = normalizeContext(aiResult.contextKind, aiResult.contextValue);
      if (canonical.length > 0) {
        return aiResult;
      }
    }

    // If AI suggestion was invalid or did not normalize, fall back to heuristic
    const heuristic = detectContextHeuristically(input);
    if (heuristic.hasSuggestion) {
      return heuristic;
    }

    return aiResult;
  } catch (error) {
    console.warn(
      "[Context Suggestion] AI generation failed, falling back to heuristic:",
      error,
    );
    return detectContextHeuristically(input);
  }
}
