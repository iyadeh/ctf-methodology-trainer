import type { PlaybookDefinition } from "../types";

export const snmpPlaybook: PlaybookDefinition = {
  id: "native-snmp",
  slug: "snmp",
  name: "SNMP Service",
  description:
    "Enumeration methodology for Simple Network Management Protocol (SNMP) community strings, MIB trees, and host intelligence.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:snmp"],
  activationRule: {
    requireAll: ["service:snmp"],
  },
  checks: [
    {
      semanticKey: "playbook.snmp.audit-community-strings",
      title: "Bruteforce common SNMP community strings",
      description:
        "Probe SNMPv1/v2c with standard community strings (public, private, manager, internal) to identify readable trees.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.snmp.mib-walk",
      title: "Perform SNMP MIB walk on readable communities",
      description:
        "Walk the Management Information Base (MIB) tree to extract configuration data, OIDs, and system variables.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.snmp.enumerate-system-info",
      title: "Extract system description, uptime, and hostnames",
      description:
        "Read sysDescr, sysName, and sysContact for OS kernel versions, architecture, and network naming conventions.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.snmp.enumerate-network-interfaces",
      title: "Enumerate network interfaces, IP addresses, and routing tables",
      description:
        "Query interface tables (ifDescr, ifPhysAddress, ipAdEntAddr) to map dual-homed networks or internal VLANs.",
      priority: "recommended",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.snmp.enumerate-running-processes",
      title: "Enumerate running processes, services, and installed software",
      description:
        "Examine hrSWRunName, hrSWRunParameters, and hrSWInstalledName for credentials passed in command-line arguments and vulnerable software.",
      priority: "required",
      sortOrder: 4,
    },
    {
      semanticKey: "playbook.snmp.enumerate-system-users",
      title: "Enumerate local system user accounts",
      description:
        "Query user enumeration OIDs to retrieve user lists for subsequent password attacks.",
      priority: "recommended",
      sortOrder: 5,
    },
  ],
};
