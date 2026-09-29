import type { PlaybookDefinition } from "../types";

export const sshPlaybook: PlaybookDefinition = {
  id: "native-ssh",
  slug: "ssh",
  name: "SSH Service",
  description:
    "Enumeration methodology for Secure Shell (SSH) daemons, algorithm negotiation, and authentication surfaces.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:ssh"],
  activationRule: {
    requireAll: ["service:ssh"],
  },
  checks: [
    {
      semanticKey: "playbook.ssh.identify-version",
      title: "Record SSH server implementation and protocol version",
      description:
        "Inspect the SSH identification banner (e.g. OpenSSH 8.2p1 Ubuntu 4ubuntu0.5) to deduce OS distribution and patch level.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.ssh.audit-auth-methods",
      title: "Determine supported authentication methods",
      description:
        "Determine whether the daemon permits password authentication, publickey, keyboard-interactive, or GSSAPI.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.ssh.audit-algorithms",
      title: "Inspect supported key exchange algorithms and ciphers",
      description:
        "Check for legacy or weak ciphers (arcfour, 3des, diffie-hellman-group1-sha1) that could allow eavesdropping or downgrade attacks.",
      priority: "recommended",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.ssh.test-known-credentials",
      title: "Test known or discovered credentials if available",
      description:
        "Verify any usernames, passwords, or private keys recovered from other services against the SSH service.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.ssh.user-enumeration",
      title: "Check for timing or banner-based username enumeration",
      description:
        "Assess whether response timing or error variations distinguish between valid and invalid usernames.",
      priority: "recommended",
      sortOrder: 4,
    },
  ],
};
