import type { PlaybookDefinition } from "../types";

export const smbPlaybook: PlaybookDefinition = {
  id: "native-smb",
  slug: "smb",
  name: "SMB / Samba Service",
  description:
    "Enumeration methodology for Server Message Block (SMB) and Samba file sharing, null sessions, and RPC endpoints.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:smb"],
  activationRule: {
    requireAll: ["service:smb"],
  },
  checks: [
    {
      semanticKey: "playbook.smb.determine-version",
      title: "Identify SMB dialect and Samba/Windows server version",
      description:
        "Determine the supported SMB dialects (SMBv1, SMBv2, SMBv3), exact Samba build, or Windows OS build number.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.smb.test-null-session",
      title: "Test null session and anonymous guest access",
      description:
        "Attempt to connect using an unauthenticated null session (username '' and password '') or anonymous/guest account.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.smb.enumerate-shares",
      title: "Enumerate exposed shares and access permissions",
      description:
        "List all accessible network shares (including IPC$, C$, admin$, and custom shared folders) and check READ/WRITE permissions.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.smb.inspect-accessible-files",
      title: "Inspect accessible shares for sensitive documents and configs",
      description:
        "Recursively inspect readable shares for configuration files, backup archives, scripts, cleartext passwords, and SSH keys.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.smb.enumerate-domain-info",
      title: "Enumerate users, groups, and domain/workgroup information",
      description:
        "Query RPC endpoints (e.g. via samr, lsarpc) to enumerate domain or local usernames, group memberships, and password policies.",
      priority: "recommended",
      sortOrder: 4,
    },
    {
      semanticKey: "playbook.smb.check-signing",
      title: "Check SMB signing configuration",
      description:
        "Verify whether SMB message signing is required, enabled, or disabled to evaluate susceptibility to relay attacks.",
      priority: "recommended",
      sortOrder: 5,
    },
  ],
};
