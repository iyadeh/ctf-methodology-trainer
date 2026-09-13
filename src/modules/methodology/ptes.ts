export type CheckPriority = "required" | "recommended" | "suggested";

export type FrameworkCheckDefinition = Readonly<{
  semanticKey: string;
  title: string;
  priority: CheckPriority;
  sortOrder: number;
}>;

export type FrameworkPhaseDefinition = Readonly<{
  semanticKey: string;
  name: string;
  sortOrder: number;
  checks: readonly FrameworkCheckDefinition[];
}>;

export type FrameworkDefinition = Readonly<{
  slug: string;
  name: string;
  version: number;
  description: string;
  phases: readonly FrameworkPhaseDefinition[];
}>;

type CheckEntry = readonly [
  semanticKey: string,
  title: string,
  priority: CheckPriority,
];

function definePhase(
  semanticKey: string,
  name: string,
  sortOrder: number,
  entries: readonly CheckEntry[],
): FrameworkPhaseDefinition {
  return {
    semanticKey,
    name,
    sortOrder,
    checks: entries.map(([checkKey, title, priority], checkOrder) => ({
      semanticKey: `${semanticKey}.${checkKey}`,
      title,
      priority,
      sortOrder: checkOrder,
    })),
  };
}

export const ptesFramework: FrameworkDefinition = {
  slug: "ptes-ctf",
  name: "PTES — CTF Adapted",
  version: 1,
  description: "Deterministic, evidence-led PTES methodology for manual CTF practice.",
  phases: [
    definePhase("reconnaissance", "Reconnaissance", 0, [
      ["confirm-target-information", "Confirm target information", "required"],
      ["confirm-target-reachability", "Confirm target reachability", "required"],
      ["initial-port-enumeration", "Perform initial port enumeration", "required"],
      ["full-tcp-enumeration", "Perform full TCP enumeration", "required"],
      ["identify-exposed-services", "Identify exposed services", "required"],
      ["identify-service-versions", "Identify service versions", "required"],
      ["map-attack-surface", "Map the attack surface", "required"],
      [
        "summarize-reconnaissance-findings",
        "Summarize reconnaissance findings",
        "required",
      ],
      [
        "consider-udp-enumeration",
        "Consider UDP enumeration when relevant",
        "recommended",
      ],
      [
        "record-hostnames-and-naming-clues",
        "Record discovered hostnames and naming clues",
        "recommended",
      ],
    ]),
    definePhase("threat-modeling", "Threat Modeling", 1, [
      ["review-confirmed-attack-surface", "Review confirmed attack surface", "required"],
      ["identify-likely-entry-points", "Identify likely entry points", "required"],
      [
        "identify-authentication-and-trust-boundaries",
        "Identify authentication and trust boundaries",
        "required",
      ],
      [
        "prioritize-attack-surfaces",
        "Prioritize attack surfaces for further analysis",
        "required",
      ],
      [
        "identify-user-controlled-input-surfaces",
        "Identify user-controlled input surfaces",
        "recommended",
      ],
      [
        "identify-sensitive-resources",
        "Identify potentially sensitive resources",
        "recommended",
      ],
      ["record-initial-attack-hypotheses", "Record initial attack hypotheses", "recommended"],
    ]),
    definePhase("vulnerability-analysis", "Vulnerability Analysis", 2, [
      [
        "review-candidate-vulnerabilities",
        "Review findings for candidate vulnerabilities",
        "required",
      ],
      [
        "connect-vulnerabilities-to-evidence",
        "Connect candidate vulnerabilities to supporting evidence",
        "required",
      ],
      ["create-testable-hypotheses", "Create testable hypotheses", "required"],
      [
        "validate-before-exploitation",
        "Validate candidate vulnerabilities before exploitation",
        "required",
      ],
      [
        "consider-alternative-explanations",
        "Consider alternative explanations for observed behavior",
        "recommended",
      ],
      [
        "record-rejected-or-inconclusive-hypotheses",
        "Record rejected or inconclusive hypotheses",
        "recommended",
      ],
    ]),
    definePhase("exploitation", "Exploitation", 3, [
      [
        "select-evidence-supported-hypothesis",
        "Select an evidence-supported attack hypothesis",
        "required",
      ],
      ["record-test-approach", "Record the intended test approach", "required"],
      ["record-attempt-outcome", "Record exploitation attempt outcome", "required"],
      [
        "document-initial-access",
        "Document successful initial access when obtained",
        "required",
      ],
      [
        "minimize-repeated-attempts",
        "Minimize unnecessary repeated attempts",
        "recommended",
      ],
      [
        "preserve-successful-access-evidence",
        "Preserve evidence supporting successful access",
        "recommended",
      ],
    ]),
    definePhase("post-exploitation", "Post Exploitation", 4, [
      [
        "identify-user-and-privilege-context",
        "Identify current user and privilege context",
        "required",
      ],
      ["identify-os-context", "Identify operating system context", "required"],
      ["enumerate-local-attack-surface", "Enumerate local attack surface", "required"],
      [
        "review-credential-and-secret-exposure",
        "Review credential and secret exposure",
        "required",
      ],
      [
        "review-privilege-escalation-surfaces",
        "Review privilege escalation surfaces",
        "required",
      ],
      [
        "form-privilege-escalation-hypotheses",
        "Form privilege escalation hypotheses",
        "required",
      ],
      [
        "document-privilege-escalation",
        "Document successful privilege escalation when obtained",
        "required",
      ],
      ["review-network-context", "Review network context", "recommended"],
      [
        "review-running-processes-and-services",
        "Review running processes and services",
        "recommended",
      ],
      [
        "review-scheduled-execution",
        "Review scheduled execution mechanisms",
        "recommended",
      ],
    ]),
    definePhase("reporting", "Reporting", 5, [
      ["document-meaningful-findings", "Document meaningful findings", "required"],
      ["document-attack-path", "Document the attack path", "required"],
      ["document-initial-access", "Document initial access", "required"],
      ["document-privilege-escalation", "Document privilege escalation", "required"],
      ["document-root-cause", "Document root cause", "required"],
      ["document-impact", "Document impact", "required"],
      [
        "document-mitigation",
        "Document mitigation or remediation guidance",
        "required",
      ],
      ["summarize-methodology-lessons", "Summarize methodology lessons", "recommended"],
      [
        "record-alternative-paths",
        "Record alternative paths or unresolved observations",
        "recommended",
      ],
    ]),
  ],
};
