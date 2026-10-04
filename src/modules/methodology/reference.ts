import { getAllPlaybooks } from "../playbooks/registry";
import type { PlaybookDefinition } from "../playbooks/types";
import { ptesFramework, type FrameworkCheckDefinition } from "./ptes";

export interface PhaseMetadata {
  readonly tagLine: string;
  readonly purpose: string;
  readonly whyItMatters: string;
  readonly mindset: string;
  readonly keyDeliverables: readonly string[];
  readonly resourceLinks?: readonly { title: string; url: string; external?: boolean }[];
}

export const phaseMetadataMap: Record<string, PhaseMetadata> = {
  reconnaissance: {
    tagLine:
      "Gather information about the target to build a comprehensive understanding of the attack surface.",
    purpose:
      "Collect as much relevant information as possible about the target, without modifying it. The goal is to identify live hosts, open services, technologies, versions, and potential entry points that can be explored in later phases.",
    whyItMatters:
      "Reconnaissance sets the foundation for everything that follows. The more you know about the target, the more efficient and focused your analysis will be. Skipping recon leads directly to guesswork and missed attack paths.",
    mindset:
      "Be curious, methodical, and thorough. Look beyond the obvious port 80 and map all listening services and hostnames before forming conclusions.",
    keyDeliverables: [
      "Target IP and reachability confirmation",
      "Comprehensive TCP and top UDP open port list",
      "Accurate service banners, web servers, and software versions",
      "Discovered hostnames, subdomains, and virtual host mappings",
    ],
    resourceLinks: [
      { title: "PTES Intelligence Gathering Standard", url: "http://www.pentest-standard.org/index.php/Intelligence_Gathering", external: true },
      { title: "Nmap Network Scanning Guide", url: "https://nmap.org/book/man.html", external: true },
    ],
  },
  "threat-modeling": {
    tagLine:
      "Analyze the confirmed attack surface to identify trust boundaries and prioritize attack vectors.",
    purpose:
      "Transform raw reconnaissance findings into structured threat hypotheses. Map how user data flows into target applications, identify authentication barriers, and determine which surfaces offer the highest probability of initial access.",
    whyItMatters:
      "Threat modeling prevents aimless fuzzing and tool spam. It bridges passive enumeration with targeted vulnerability analysis by prioritizing where your testing effort should focus.",
    mindset:
      "Think like the system architect: Where does untrusted user input enter? What components hold sensitive data? What third-party dependencies might be out of date?",
    keyDeliverables: [
      "Categorized list of primary entry points (web portals, APIs, management ports)",
      "Identified authentication mechanisms and credential input surfaces",
      "Prioritized target services based on complexity and exposure",
      "Initial formulated attack hypotheses linked to confirmed findings",
    ],
    resourceLinks: [
      { title: "PTES Threat Modeling Standard", url: "http://www.pentest-standard.org/index.php/Threat_Modeling", external: true },
      { title: "OWASP Threat Modeling Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html", external: true },
    ],
  },
  "vulnerability-analysis": {
    tagLine:
      "Find, evaluate, and validate candidate vulnerabilities using evidence-backed hypotheses.",
    purpose:
      "Systematically analyze prioritized entry points for exploitable flaws. Correlate software versions against known CVEs, probe input parameters for injection vectors, and validate candidate flaws with minimal, controlled tests before full exploitation.",
    whyItMatters:
      "Exploitation without prior validation causes system crashes, triggers rate limits, or creates false positives. Rigorous analysis confirms that a vulnerability truly exists before attempting to gain access.",
    mindset:
      "Evidence before assumption. Never fire a public exploit without confirming that the target service and version are actually vulnerable.",
    keyDeliverables: [
      "Identified CVEs or application flaws supported by observed versions",
      "Validated input parameters exhibiting anomalous or vulnerable behavior",
      "Formulated testable hypotheses with defined approaches and expected results",
      "Documented inconclusive or rejected hypotheses to avoid repeating mistakes",
    ],
    resourceLinks: [
      { title: "PTES Vulnerability Analysis Standard", url: "http://www.pentest-standard.org/index.php/Vulnerability_Analysis", external: true },
      { title: "NIST National Vulnerability Database", url: "https://nvd.nist.gov/", external: true },
    ],
  },
  exploitation: {
    tagLine:
      "Execute targeted attacks to bypass security controls and establish initial access.",
    purpose:
      "Leverage validated vulnerabilities to breach the target system. Execute controlled payloads, authenticate with discovered credentials, or exploit software defects to achieve code execution or user-level access on the target host.",
    whyItMatters:
      "Exploitation proves the real-world impact of a vulnerability. In CTF and pentesting, achieving low-privilege initial access is the pivotal transition from external reconnaissance to internal post-exploitation.",
    mindset:
      "Hypothesis before random testing. Understand what the payload does before firing it. Minimize repeated attempts to keep execution clean.",
    keyDeliverables: [
      "Executed attack based on validated hypothesis",
      "Captured user shell or interactive command execution",
      "Recorded proof of access (user identity, IP address, user flag)",
      "Preserved exploitation notes detailing what succeeded and why",
    ],
    resourceLinks: [
      { title: "PTES Exploitation Standard", url: "http://www.pentest-standard.org/index.php/Exploitation", external: true },
      { title: "PayloadsAllTheThings Repository", url: "https://github.com/swisskyrepo/PayloadsAllTheThings", external: true },
    ],
  },
  "post-exploitation": {
    tagLine:
      "Enumerate the local system, escalate privileges to root/administrator, and assess impact.",
    purpose:
      "Gain full situational awareness inside the compromised host. Identify operating system details, user permissions, internal network interfaces, password stores, and misconfigurations (e.g. Sudo, SUID, Windows services) to escalate to administrative authority.",
    whyItMatters:
      "Initial access is rarely the final objective. The true security impact is measured by what a compromised account can access, whether privileges can be elevated, and how deeply internal systems can be pivoted to.",
    mindset:
      "Treat post-exploitation as a brand new reconnaissance phase. Do not rush to run noisy privilege escalation scripts without checking basic permissions like sudo -l or whoami /priv first.",
    keyDeliverables: [
      "Documented current user and operating system privilege level",
      "Audited local attack surfaces (scheduled jobs, internal ports, sensitive files)",
      "Identified and exploited privilege escalation vector",
      "Proof of full administrative compromise (root/SYSTEM access and root flag)",
    ],
    resourceLinks: [
      { title: "PTES Post Exploitation Standard", url: "http://www.pentest-standard.org/index.php/Post_Exploitation", external: true },
      { title: "GTFOBins Unix Binaries", url: "https://gtfobins.github.io/", external: true },
      { title: "LOLBAS Windows Binaries", url: "https://lolbas-project.github.io/", external: true },
    ],
  },
  reporting: {
    tagLine:
      "Document findings, attack paths, root causes, and remediation guidance for defense.",
    purpose:
      "Translate technical exploitation steps into clear, actionable security documentation. Record the complete attack path from external discovery to root compromise, explain root causes, and prescribe mitigation guidance.",
    whyItMatters:
      "A penetration test without a report has zero business value. In CTFs and certifications (OSCP, CPTS), thorough documentation proves mastery of the methodology and reinforces long-term retention.",
    mindset:
      "Clarity and reproducibility. Write as though another security professional needs to follow your exact steps and understand how to patch the underlying defect.",
    keyDeliverables: [
      "Complete chronological attack path narrative",
      "Root cause analysis for each exploited vulnerability",
      "Defensive remediation recommendations and patch guidance",
      "Personal methodology lessons and key takeaways",
    ],
    resourceLinks: [
      { title: "PTES Reporting Standard", url: "http://www.pentest-standard.org/index.php/Reporting", external: true },
    ],
  },
};

export interface MethodologyPhaseReference {
  readonly phaseNumber: number;
  readonly semanticKey: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly tagLine: string;
  readonly purpose: string;
  readonly whyItMatters: string;
  readonly mindset: string;
  readonly keyDeliverables: readonly string[];
  readonly resourceLinks: readonly { title: string; url: string; external?: boolean }[];
  readonly checks: readonly FrameworkCheckDefinition[];
  readonly relatedPlaybooks: readonly PlaybookDefinition[];
}

export interface MethodologyReferenceData {
  readonly frameworkSlug: string;
  readonly frameworkName: string;
  readonly version: number;
  readonly description: string;
  readonly phases: readonly MethodologyPhaseReference[];
}

let cachedMethodologyData: MethodologyReferenceData | null = null;

/**
 * Builds the complete Methodology reference model by reusing the canonical ptesFramework
 * and Playbook Registry (AGENTS.md Rule 34).
 */
export function getMethodologyReferenceData(): MethodologyReferenceData {
  if (cachedMethodologyData) {
    return cachedMethodologyData;
  }

  const allPlaybooks = getAllPlaybooks();

  const phases: MethodologyPhaseReference[] = ptesFramework.phases.map(
    (phase, index) => {
      const meta = phaseMetadataMap[phase.semanticKey] || {
        tagLine: `Structured approach for ${phase.name}.`,
        purpose: `Execute required verification checks for ${phase.name}.`,
        whyItMatters: `Ensures thorough coverage of ${phase.name}.`,
        mindset: "Methodical and disciplined approach.",
        keyDeliverables: [],
        resourceLinks: [],
      };

      // Match related playbooks by targetPhase
      const relatedPlaybooks = allPlaybooks.filter((pb) => {
        if (phase.semanticKey === "reconnaissance") {
          return pb.category === "network_service" || pb.targetPhase === "reconnaissance";
        }
        if (phase.semanticKey === "post-exploitation") {
          return pb.category === "post_exploitation" || pb.targetPhase === "post-exploitation";
        }
        if (phase.semanticKey === "threat-modeling" || phase.semanticKey === "vulnerability-analysis") {
          return pb.slug === "http" || pb.slug === "generic";
        }
        return false;
      });

      return {
        phaseNumber: index + 1,
        semanticKey: phase.semanticKey,
        name: phase.name,
        sortOrder: phase.sortOrder,
        tagLine: meta.tagLine,
        purpose: meta.purpose,
        whyItMatters: meta.whyItMatters,
        mindset: meta.mindset,
        keyDeliverables: meta.keyDeliverables,
        resourceLinks: meta.resourceLinks ?? [],
        // CRITICAL: Checks reused directly from ptesFramework
        checks: phase.checks,
        relatedPlaybooks,
      };
    },
  );

  cachedMethodologyData = {
    frameworkSlug: ptesFramework.slug,
    frameworkName: ptesFramework.name,
    version: ptesFramework.version,
    description: ptesFramework.description,
    phases,
  };

  return cachedMethodologyData;
}
