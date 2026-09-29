import type { PlaybookDefinition } from "../types";

export const genericServicePlaybook: PlaybookDefinition = {
  id: "generic-service",
  slug: "generic-service",
  name: "Generic Service Enumeration",
  description:
    "Universal enumeration methodology applied when a confirmed service does not have a specialized native playbook.",
  version: 1,
  category: "generic",
  targetPhase: "reconnaissance",
  isGenericFallback: true,
  activationRule: {
    requireAny: [],
  },
  checks: [
    {
      semanticKey: "playbook.generic.confirm-identity",
      title: "Confirm service identity and implementation",
      description:
        "Verify the true daemon or service behind the open port through banner grabbing, raw probing, and protocol handshakes.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.generic.identify-version",
      title: "Identify service version and build metadata",
      description:
        "Determine the precise service version, patch level, and underlying architecture to identify known vulnerabilities.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.generic.understand-protocol",
      title: "Understand protocol purpose and default specifications",
      description:
        "Research the RFC, official documentation, or standard operational design of the service to comprehend expected communications.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.generic.determine-auth-requirements",
      title: "Determine authentication requirements and default credentials",
      description:
        "Inspect whether the service requires authentication, supports guest/anonymous access, or uses vendor default credentials.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.generic.determine-accessible-functionality",
      title: "Determine accessible functionality without authentication",
      description:
        "Probe for unauthenticated commands, information-disclosure endpoints, status metrics, or ping/echo utilities.",
      priority: "recommended",
      sortOrder: 4,
    },
    {
      semanticKey: "playbook.generic.enumerate-resources",
      title: "Enumerate exposed resources, shares, or data objects",
      description:
        "List all accessible directories, topics, database keys, queues, configuration parameters, or stored data artifacts.",
      priority: "required",
      sortOrder: 5,
    },
    {
      semanticKey: "playbook.generic.inspect-security-controls",
      title: "Inspect service configuration and security controls",
      description:
        "Evaluate transport encryption, access control lists, network restrictions, and rate-limiting behaviors.",
      priority: "recommended",
      sortOrder: 6,
    },
    {
      semanticKey: "playbook.generic.record-anomalies",
      title: "Record anomalous behavior, errors, and banners",
      description:
        "Document custom error messages, stack traces, unusual debug responses, or naming conventions revealed by the service.",
      priority: "recommended",
      sortOrder: 7,
    },
    {
      semanticKey: "playbook.generic.form-attack-hypotheses",
      title: "Formulate evidence-supported attack hypotheses",
      description:
        "Synthesize all observed service facts to establish testable hypotheses before attempting active exploitation.",
      priority: "required",
      sortOrder: 8,
    },
  ],
};
