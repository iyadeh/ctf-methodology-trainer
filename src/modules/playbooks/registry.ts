import type { PlaybookDefinition } from "./types";
import { genericServicePlaybook } from "./definitions/generic";
import { httpPlaybook } from "./definitions/http";
import { sshPlaybook } from "./definitions/ssh";
import { smbPlaybook } from "./definitions/smb";
import { ftpPlaybook } from "./definitions/ftp";
import { dnsPlaybook } from "./definitions/dns";
import { snmpPlaybook } from "./definitions/snmp";
import { ldapPlaybook } from "./definitions/ldap";
import { nfsPlaybook } from "./definitions/nfs";
import { smtpPlaybook } from "./definitions/smtp";
import { linuxPostExploitationPlaybook } from "./definitions/linux-post-exploitation";
import { windowsPostExploitationPlaybook } from "./definitions/windows-post-exploitation";

export const nativePlaybooks: readonly PlaybookDefinition[] = [
  httpPlaybook,
  sshPlaybook,
  smbPlaybook,
  ftpPlaybook,
  dnsPlaybook,
  snmpPlaybook,
  ldapPlaybook,
  nfsPlaybook,
  smtpPlaybook,
  linuxPostExploitationPlaybook,
  windowsPostExploitationPlaybook,
];

export const allPlaybooks: readonly PlaybookDefinition[] = [
  ...nativePlaybooks,
  genericServicePlaybook,
];

export function getAllPlaybooks(): readonly PlaybookDefinition[] {
  return allPlaybooks;
}

export function getNativePlaybooks(): readonly PlaybookDefinition[] {
  return nativePlaybooks;
}

export function getGenericServicePlaybook(): PlaybookDefinition {
  return genericServicePlaybook;
}

export function getPlaybookById(id: string): PlaybookDefinition | undefined {
  return allPlaybooks.find((playbook) => playbook.id === id);
}

export function getPlaybookBySlug(slug: string): PlaybookDefinition | undefined {
  return allPlaybooks.find((playbook) => playbook.slug === slug);
}
