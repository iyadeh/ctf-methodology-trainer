import type { ExtractedMachineFacts } from "../facts/types";
import type { AttackGraph } from "../attack-graph/types";
import type { MilestoneStatus, MilestoneTaskType } from "./types";
import { hashAnswer } from "./milestone-verifier";

export interface SessionMilestoneDraft {
  sortOrder: number;
  title: string;
  question: string;
  taskType: MilestoneTaskType;
  phase: string;
  answerHash?: string;
  expectedAnswer?: string;
  formatHint?: string;
  hint?: string;
  status: MilestoneStatus;
}

/**
 * Generates structured, progressive milestone tasks based on extracted writeup facts and attack graph.
 */
export function generateMilestonesFromFactsAndGraph(
  facts: ExtractedMachineFacts,
  graph?: AttackGraph,
): SessionMilestoneDraft[] {
  const machineName = facts.profile.name || "the target";
  const milestones: SessionMilestoneDraft[] = [];
  const hasAttackGraph = Boolean(graph && graph.nodes.length > 0);

  let sortOrder = 1;

  // 1. Port Scanning Task
  const portCount = facts.services.length;
  const portCountAnswer = portCount > 0 ? `${portCount} | ${portCount} ports | ${portCount} port` : "2 | 2 ports";

  milestones.push({
    sortOrder: sortOrder++,
    title: "Open Ports Discovery",
    question: `How many open TCP ports are listening on ${machineName}?`,
    taskType: "question",
    phase: "reconnaissance",
    expectedAnswer: portCountAnswer,
    answerHash: hashAnswer(String(portCount > 0 ? portCount : 2)),
    formatHint: "Format: Angka (contoh: 2)",
    hint: hasAttackGraph
      ? "Perform an initial SYN port scan on the target IP using nmap (-sC -sV)."
      : "Perform an initial SYN port scan on the target IP.",
    status: "unlocked", // First task starts unlocked
  });

  // 2. Primary Web or Network Service
  const webService = facts.services.find(
    (s) =>
      s.service.toLowerCase().includes("http") ||
      s.port === 80 ||
      s.port === 443 ||
      s.port === 5000 ||
      s.port === 8080 ||
      s.port === 3000 ||
      s.port === 1881,
  );

  const selectedService = webService ?? facts.services[0];
  if (selectedService) {
    const serviceName = selectedService.service;
    const product = (selectedService as { product?: string }).product || "";
    const banner = selectedService.banner || selectedService.version || "";
    const serviceAliases = Array.from(
      new Set([serviceName, product, banner, selectedService.version].filter(Boolean)),
    );
    const expected = serviceAliases.join(" | ");

    milestones.push({
      sortOrder: sortOrder++,
      title: "Service Fingerprinting",
      question: `What service or server technology is running on port ${selectedService.port}?`,
      taskType: "question",
      phase: "reconnaissance",
      expectedAnswer: expected,
      answerHash: hashAnswer(serviceName),
      formatHint: `Format: Nama layanan (contoh: ${serviceName.toLowerCase()})`,
      hint: "Inspect the service banner, HTTP headers, or nmap service version scan output.",
      status: "locked",
    });
  }

  // 3. Application Surface / Endpoint Discovery
  const surface = facts.surfaces[0];
  if (surface) {
    const loc = surface.urlOrPath || surface.name;
    const locAliases = loc === "/" ? ["/", "root", "index", "home"] : [loc];
    const locExpected = locAliases.join(" | ");

    milestones.push({
      sortOrder: sortOrder++,
      title: "Surface Discovery",
      question: `What application surface, page, or endpoint was identified during web reconnaissance?`,
      taskType: "question",
      phase: "threat-modeling",
      expectedAnswer: locExpected,
      answerHash: hashAnswer(loc),
      formatHint: `Format: Path / Nama (contoh: ${loc})`,
      hint: "Enumerate directories and web parameters using gobuster, ffuf, or source code inspection.",
      status: "locked",
    });
  }

  // 4. Vulnerability Identification
  const vuln = facts.vulnerabilities[0];
  if (vuln) {
    const cve = (vuln as { cve?: string }).cve || "";
    const vulnAliases = Array.from(
      new Set([vuln.title, vuln.category, cve].filter(Boolean)),
    );
    const vulnAnswer = vulnAliases.join(" | ");

    milestones.push({
      sortOrder: sortOrder++,
      title: "Vulnerability Identification",
      question: `What vulnerability or misconfiguration was identified for ${vuln.affectedTarget || machineName}?`,
      taskType: "question",
      phase: "vulnerability-analysis",
      expectedAnswer: vulnAnswer,
      answerHash: hashAnswer(vuln.title),
      formatHint: `Format: Tipe kerentanan (contoh: ${vuln.category || "Command Injection"})`,
      hint: "Analyze how user inputs, cookies, or headers are processed by the backend.",
      status: "locked",
    });
  }

  // 5. Initial Access Credential / Account (if documented)
  const credentialFinding = facts.findings.find(
    (f) =>
      f.identifier.toLowerCase().includes("user") ||
      f.identifier.toLowerCase().includes("pass") ||
      f.identifier.toLowerCase().includes("cred") ||
      f.identifier.toLowerCase().includes("account") ||
      f.identifier.toLowerCase().includes("ssh") ||
      f.identifier.toLowerCase().includes("git"),
  );

  if (credentialFinding) {
    const credParts = credentialFinding.identifier.includes(":")
      ? credentialFinding.identifier.split(":")
      : [];
    const credAnswer = Array.from(
      new Set([credentialFinding.identifier, ...credParts].filter(Boolean)),
    ).join(" | ");

    milestones.push({
      sortOrder: sortOrder++,
      title: "Initial Foothold Credential",
      question: `What user account or credential was discovered for establishing initial access?`,
      taskType: "question",
      phase: "exploitation",
      expectedAnswer: credAnswer,
      answerHash: hashAnswer(credentialFinding.identifier),
      formatHint: `Format: Username / Kredensial (contoh: ${credentialFinding.identifier})`,
      hint: "Review leaked files, database dumps, or exploited services for valid user accounts.",
      status: "locked",
    });
  }

  // 6. User Flag Submission
  const userFlagObjective = facts.objectives.find((o) => o.type === "user_flag");
  const userFlagExpected = userFlagObjective ? userFlagObjective.name : undefined;

  milestones.push({
    sortOrder: sortOrder++,
    title: "Submit User Flag",
    question: "Submit the user flag obtained after establishing an initial foothold on the target.",
    taskType: "user_flag",
    phase: "exploitation",
    expectedAnswer: userFlagExpected,
    answerHash: userFlagExpected ? hashAnswer(userFlagExpected) : undefined,
    formatHint: "Format: Flag (HTB{...} atau string flag)",
    hint: "Look for user.txt in the user's home directory (e.g. /home/*/user.txt).",
    status: "locked",
  });

  // 7. Privilege Escalation Vector
  const privEscStep = facts.attackSteps.find(
    (s) => s.phase === "privilege_escalation",
  );
  const privEscVuln = facts.vulnerabilities.find(
    (v) =>
      v.title.toLowerCase().includes("sudo") ||
      v.title.toLowerCase().includes("privilege") ||
      v.category.toLowerCase().includes("privilege") ||
      v.category.toLowerCase().includes("sudo") ||
      v.title.toLowerCase().includes("command injection") ||
      v.title.toLowerCase().includes("bundle"),
  );

  const privEscCandidates = Array.from(
    new Set([privEscVuln?.title, privEscVuln?.category, privEscStep?.action].filter(Boolean)),
  );
  const privEscAnswer =
    privEscCandidates.length > 0
      ? privEscCandidates.join(" | ")
      : "sudo misconfiguration";

  milestones.push({
    sortOrder: sortOrder++,
    title: "Privilege Escalation Vector",
    question: "What misconfiguration, binary, or mechanism is leveraged for privilege escalation to root?",
    taskType: "question",
    phase: "post-exploitation",
    expectedAnswer: privEscAnswer,
    answerHash: hashAnswer(privEscAnswer),
    formatHint: "Format: Nama script/biner/vektor (contoh: sudo / check_parser / a.sh)",
    hint: "Enumerate local permissions using sudo -l, check SUID binaries, or inspect scheduled cron jobs.",
    status: "locked",
  });

  // 8. Root Flag Submission
  const rootFlagObjective = facts.objectives.find((o) => o.type === "root_flag");
  const rootFlagExpected = rootFlagObjective ? rootFlagObjective.name : undefined;

  milestones.push({
    sortOrder: sortOrder++,
    title: "Submit Root Flag",
    question: "Submit the root flag obtained after completing privilege escalation to root / SYSTEM.",
    taskType: "root_flag",
    phase: "post-exploitation",
    expectedAnswer: rootFlagExpected,
    answerHash: rootFlagExpected ? hashAnswer(rootFlagExpected) : undefined,
    formatHint: "Format: Flag (HTB{...} atau string flag)",
    hint: "Obtain an administrative/root shell and read /root/root.txt.",
    status: "locked",
  });

  return milestones;
}

/**
 * Generates generic methodology milestones when a training session has no associated writeup.
 */
export function generateGenericMethodologyMilestones(
  machineName = "the target",
): SessionMilestoneDraft[] {
  return [
    {
      sortOrder: 1,
      title: "Open Ports Discovery",
      question: `How many open TCP ports are listening on ${machineName}?`,
      taskType: "question",
      phase: "reconnaissance",
      formatHint: "Format: Angka (contoh: 2)",
      hint: "Run an initial nmap SYN scan on top 1000 ports.",
      status: "unlocked",
    },
    {
      sortOrder: 2,
      title: "Service Fingerprinting",
      question: "What primary web or application service was identified on the target?",
      taskType: "question",
      phase: "reconnaissance",
      formatHint: "Format: Nama layanan (contoh: http / ssh)",
      hint: "Check nmap service version scan (-sV) results.",
      status: "locked",
    },
    {
      sortOrder: 3,
      title: "Vulnerability Identification",
      question: "What vulnerability or misconfiguration was identified during analysis?",
      taskType: "question",
      phase: "vulnerability-analysis",
      formatHint: "Format: Tipe kerentanan (contoh: command injection / sqli)",
      hint: "Formulate a hypothesis based on your findings before attempting exploitation.",
      status: "locked",
    },
    {
      sortOrder: 4,
      title: "Submit User Flag",
      question: "Submit the user flag obtained after initial access.",
      taskType: "user_flag",
      phase: "exploitation",
      formatHint: "Format: Flag (HTB{...} atau string flag)",
      hint: "Find user.txt in the user home directory.",
      status: "locked",
    },
    {
      sortOrder: 5,
      title: "Privilege Escalation Vector",
      question: "What vector or misconfiguration was exploited to escalate privileges?",
      taskType: "question",
      phase: "post-exploitation",
      formatHint: "Format: Vektor privilege escalation (contoh: sudo / suid / cron)",
      hint: "Check internal sudo permissions (sudo -l) or kernel vulnerabilities.",
      status: "locked",
    },
    {
      sortOrder: 6,
      title: "Submit Root Flag",
      question: "Submit the root flag obtained after full compromise.",
      taskType: "root_flag",
      phase: "post-exploitation",
      formatHint: "Format: Flag (HTB{...} atau string flag)",
      hint: "Read /root/root.txt as root.",
      status: "locked",
    },
  ];
}
