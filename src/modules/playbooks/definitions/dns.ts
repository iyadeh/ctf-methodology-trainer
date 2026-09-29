import type { PlaybookDefinition } from "../types";

export const dnsPlaybook: PlaybookDefinition = {
  id: "native-dns",
  slug: "dns",
  name: "DNS Service",
  description:
    "Enumeration methodology for Domain Name System (DNS) servers, zone transfers, and record discovery.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:dns"],
  activationRule: {
    requireAll: ["service:dns"],
  },
  checks: [
    {
      semanticKey: "playbook.dns.identify-version",
      title: "Identify DNS server implementation and version banner",
      description:
        "Query the TXT record for 'version.bind' in the CHAOS class to discover the daemon build and BIND version.",
      priority: "recommended",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.dns.test-zone-transfer",
      title: "Test for unrestricted zone transfer (AXFR)",
      description:
        "Attempt a full DNS zone transfer (AXFR) across discovered domain names to retrieve complete internal zone records.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.dns.reverse-lookup",
      title: "Perform reverse IP and PTR record lookups",
      description:
        "Query PTR records across internal IP ranges to discover hostnames and domain mappings.",
      priority: "recommended",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.dns.subdomain-enumeration",
      title: "Enumerate subdomains and common record types",
      description:
        "Query A, AAAA, CNAME, TXT, and MX records using common wordlists to identify staging environments, mail servers, and admin portals.",
      priority: "required",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.dns.check-recursion",
      title: "Check if open DNS recursion is enabled",
      description:
        "Test whether the DNS server resolves arbitrary external domains (open resolver vulnerability).",
      priority: "recommended",
      sortOrder: 4,
    },
  ],
};
