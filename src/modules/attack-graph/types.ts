export type SpoilerLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AttackNodeKind =
  | "service_discovery"
  | "surface_discovery"
  | "vulnerability_identification"
  | "credential_access"
  | "initial_access"
  | "local_enumeration"
  | "privilege_escalation"
  | "objective_capture"
  | "lateral_movement";

export type AttackNodePhase =
  | "reconnaissance"
  | "threat_modeling"
  | "vulnerability_analysis"
  | "exploitation"
  | "post_exploitation"
  | "reporting";

export type DependencyType = "hard" | "soft";

export interface AttackNodeMetadata {
  readonly port?: number;
  readonly protocol?: "tcp" | "udp";
  readonly service?: string;
  readonly cve?: string;
  readonly toolsUsed?: readonly string[];
  readonly targetIp?: string;
  readonly provenance?: string;
  readonly location?: string;
}

export interface AttackNode {
  readonly id: string;
  readonly semanticKey: string;
  readonly title: string;
  readonly description: string;
  readonly phase: AttackNodePhase;
  readonly kind: AttackNodeKind;
  readonly spoilerLevel: SpoilerLevel;
  readonly isEntryPoint: boolean;
  readonly isTerminal: boolean;
  readonly metadata?: AttackNodeMetadata;
}

export interface AttackEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly dependencyType: DependencyType;
  readonly description?: string;
}

export interface AttackGraph {
  readonly id: string;
  readonly machineName: string;
  readonly nodes: readonly AttackNode[];
  readonly edges: readonly AttackEdge[];
  readonly referencePathNodeIds: readonly string[];
  readonly entryNodeIds: readonly string[];
  readonly terminalNodeIds: readonly string[];
  readonly createdAt: string;
}
