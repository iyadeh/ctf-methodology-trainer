import type { PlaybookDefinition } from "../types";

export const smtpPlaybook: PlaybookDefinition = {
  id: "native-smtp",
  slug: "smtp",
  name: "SMTP Service",
  description:
    "Enumeration methodology for Simple Mail Transfer Protocol (SMTP) mail transfer agents, user verification, and open relays.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:smtp"],
  activationRule: {
    requireAll: ["service:smtp"],
  },
  checks: [
    {
      semanticKey: "playbook.smtp.banner-grab",
      title: "Grab SMTP banner and identify mail transfer agent",
      description:
        "Connect to SMTP/ESMTP and extract the banner to identify the MTA (Postfix, Sendmail, Exim, Microsoft Exchange).",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.smtp.enumerate-users",
      title: "Test VRFY, EXPN, and RCPT TO for user enumeration",
      description:
        "Probe SMTP commands (VRFY, EXPN, RCPT TO) with a user list to verify existing mailbox accounts.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.smtp.test-open-relay",
      title: "Test for open mail relay misconfiguration",
      description:
        "Check if the server accepts and relays messages addressed to external third-party domains without authentication.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.smtp.review-capabilities",
      title: "Review EHLO response capabilities and STARTTLS support",
      description:
        "Send EHLO and review supported extensions, authentication mechanisms (AUTH LOGIN, PLAIN), and TLS encryption support.",
      priority: "recommended",
      sortOrder: 3,
    },
  ],
};
