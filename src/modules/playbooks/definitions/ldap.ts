import type { PlaybookDefinition } from "../types";

export const ldapPlaybook: PlaybookDefinition = {
  id: "native-ldap",
  slug: "ldap",
  name: "LDAP / Active Directory",
  description:
    "Enumeration methodology for Lightweight Directory Access Protocol (LDAP) directories, naming contexts, and domain objects.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:ldap"],
  activationRule: {
    requireAll: ["service:ldap"],
  },
  checks: [
    {
      semanticKey: "playbook.ldap.test-anonymous-bind",
      title: "Test anonymous / unauthenticated LDAP bind",
      description:
        "Attempt connecting without credentials to determine if anonymous directory searches are permitted.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.ldap.query-naming-contexts",
      title: "Query root DSE and base naming contexts",
      description:
        "Retrieve the root DSE to identify defaultNamingContext, supportedSASLMechanisms, and domain controller functionality.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.ldap.enumerate-directory-objects",
      title: "Enumerate domain users, groups, and organizational units",
      description:
        "Query user objects (sAMAccountName, userPrincipalName) and group memberships (memberOf) to map directory hierarchy.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.ldap.search-sensitive-attributes",
      title: "Search for sensitive attributes and descriptions",
      description:
        "Search user and computer attributes (description, info, comment, userParameters) for cleartext credentials and reset codes.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.ldap.review-acls",
      title: "Review access control policies and permission delegations",
      description:
        "Inspect ACL delegations, LAPS configurations, and Kerberos delegation settings (constrained/unconstrained).",
      priority: "recommended",
      sortOrder: 4,
    },
  ],
};
