import type { PlaybookDefinition } from "../types";

export const httpPlaybook: PlaybookDefinition = {
  id: "native-http",
  slug: "http",
  name: "HTTP / Web Application",
  description:
    "Systematic reconnaissance and attack surface enumeration for web servers, APIs, and web applications.",
  version: 1,
  category: "network_service",
  targetPhase: "reconnaissance",
  associatedServiceKeys: ["service:http"],
  activationRule: {
    requireAny: ["service:http", "protocol:https"],
  },
  checks: [
    {
      semanticKey: "playbook.http.manual-inspection",
      title: "Perform manual web application inspection",
      description:
        "Navigate the application through a web browser to understand user workflows, site structure, and visible features.",
      priority: "required",
      sortOrder: 0,
    },
    {
      semanticKey: "playbook.http.review-headers",
      title: "Review HTTP response headers and security controls",
      description:
        "Inspect Server, X-Powered-By, Set-Cookie, Content-Security-Policy, and other response headers for technology clues and misconfigurations.",
      priority: "required",
      sortOrder: 1,
    },
    {
      semanticKey: "playbook.http.identify-tech-stack",
      title: "Identify web technologies, CMS, and frameworks",
      description:
        "Identify backend languages, frameworks (Laravel, Express, Django), CMS (WordPress, Drupal), and component libraries.",
      priority: "required",
      sortOrder: 2,
    },
    {
      semanticKey: "playbook.http.analyze-client-resources",
      title: "Analyze client-side scripts, comments, and hidden fields",
      description:
        "Review HTML source code, developer comments, included JavaScript bundles, hidden form fields, and robots.txt / sitemap.xml.",
      priority: "recommended",
      sortOrder: 3,
    },
    {
      semanticKey: "playbook.http.content-discovery",
      title: "Perform content discovery and directory/file fuzzing",
      description:
        "Enumerate unlinked directories, files, hidden endpoints, and backup extensions (.bak, .old, .zip, .php.swp) using wordlists.",
      priority: "required",
      sortOrder: 4,
    },
    {
      semanticKey: "playbook.http.vhost-enumeration",
      title: "Check for virtual hosts and subdomain routing",
      description:
        "Perform Host header fuzzing and subdomain enumeration against the target IP to discover isolated virtual hosts.",
      priority: "recommended",
      sortOrder: 5,
    },
    {
      semanticKey: "playbook.http.authentication-surface",
      title: "Enumerate authentication endpoints and password policies",
      description:
        "Examine login portals, registration mechanisms, password reset flows, and session handling for design weaknesses.",
      priority: "required",
      sortOrder: 6,
    },
    {
      semanticKey: "playbook.http.input-parameter-review",
      title: "Review user input parameters, query strings, and API endpoints",
      description:
        "Map all dynamic input parameters, search bars, file upload vectors, and API parameters for subsequent vulnerability analysis.",
      priority: "recommended",
      sortOrder: 7,
    },
  ],
};
