import type { PlaybookDefinition } from "../types";

export const ftpPlaybook: PlaybookDefinition = {
  id: "native-ftp",
  slug: "ftp",
  name: "FTP Service",
  description:
    "Enumeration methodology for File Transfer Protocol (FTP) servers, anonymous access, and file permissions.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:ftp"],
  activationRule: {
    requireAll: ["service:ftp"],
  },
  checks: [
    {
      semanticKey: "playbook.ftp.banner-and-version",
      title: "Capture FTP server banner and determine exact version",
      description:
        "Capture the welcome banner to identify the FTP daemon (vsftpd, ProFTPD, Pure-FTPd, FileZilla) and search for known CVEs.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.ftp.test-anonymous-login",
      title: "Test anonymous login access",
      description:
        "Attempt authentication using username 'anonymous' or 'ftp' with an empty password or email address.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.ftp.enumerate-files",
      title: "List and recursively inspect accessible files and hidden directories",
      description:
        "List all visible directories and hidden files (using `ls -la`), looking for source code, configuration files, notes, or archives.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.ftp.test-upload-permissions",
      title: "Test file upload and write permissions",
      description:
        "Attempt to upload a benign test file across accessible directories to verify write permissions.",
      priority: "recommended",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.ftp.test-bounce-and-fxp",
      title: "Check for FTP bounce or FXP capabilities",
      description:
        "Check whether PORT command allows forwarding data connections to arbitrary hosts or ports (FTP bounce attack).",
      priority: "suggested",
      sortOrder: 4,
    },
  ],
};
