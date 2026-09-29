import type { PlaybookDefinition } from "../types";

export const nfsPlaybook: PlaybookDefinition = {
  id: "native-nfs",
  slug: "nfs",
  name: "NFS Service",
  description:
    "Enumeration methodology for Network File System (NFS) exports, root squash settings, and share mounting.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:nfs"],
  activationRule: {
    requireAll: ["service:nfs"],
  },
  checks: [
    {
      semanticKey: "playbook.nfs.enumerate-exports",
      title: "Query exported mount shares and client restrictions",
      description:
        "Execute showmount -e or query rpcbind to enumerate all exported paths and authorized client subnet masks.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.nfs.mount-accessible-shares",
      title: "Mount accessible NFS exports locally",
      description:
        "Mount readable NFS exports to a local mountpoint using appropriate NFS version parameters (v3, v4).",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.nfs.inspect-files",
      title: "Inspect mounted shares for sensitive files and source code",
      description:
        "Recursively inspect the mounted filesystem for configuration files, source code, backup tarballs, and SSH keys.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.nfs.check-root-squash",
      title: "Check root squash configuration",
      description:
        "Verify whether the export permits no_root_squash, allowing root-owned SUID binary creation.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.nfs.check-uid-mapping",
      title: "Inspect file permissions and UID/GID mapping options",
      description:
        "Check ownership of files on the share to identify whether specific UIDs can be impersonated locally.",
      priority: "recommended",
      sortOrder: 4,
    },
  ],
};
