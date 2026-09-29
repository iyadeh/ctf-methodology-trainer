import { nativePlaybooks, getGenericServicePlaybook } from "./registry";
import type { PlaybookActivationRule, ResolvedPlaybook, ResolvePlaybooksResult } from "./types";

function isRuleSatisfied(
  rule: PlaybookActivationRule,
  activeKeys: ReadonlySet<string>,
): boolean {
  if (rule.requireAll && rule.requireAll.length > 0) {
    const allPresent = rule.requireAll.every((key) => activeKeys.has(key));
    if (!allPresent) {
      return false;
    }
  }

  if (rule.requireAny && rule.requireAny.length > 0) {
    const anyPresent = rule.requireAny.some((key) => activeKeys.has(key));
    if (!anyPresent) {
      return false;
    }
  }

  if (rule.requireNone && rule.requireNone.length > 0) {
    const anyForbidden = rule.requireNone.some((key) => activeKeys.has(key));
    if (anyForbidden) {
      return false;
    }
  }

  return true;
}

export function resolvePlaybooks(activeContextKeys: readonly string[]): ResolvePlaybooksResult {
  const activeKeys = new Set(activeContextKeys);
  const resolved: ResolvedPlaybook[] = [];
  const coveredServiceKeys = new Set<string>();

  // 1. Resolve matching native playbooks
  for (const playbook of nativePlaybooks) {
    if (isRuleSatisfied(playbook.activationRule, activeKeys)) {
      // Find the associated service key if applicable
      const triggeredBy = playbook.associatedServiceKeys?.find((key) => activeKeys.has(key));

      if (triggeredBy) {
        coveredServiceKeys.add(triggeredBy);
      }

      resolved.push({
        playbook,
        triggeredByServiceKey: triggeredBy,
        isFallback: false,
      });
    }
  }

  // 2. Identify confirmed services that have no native playbook coverage
  const genericPlaybook = getGenericServicePlaybook();
  const allServiceKeys = Array.from(activeKeys)
    .filter((key) => key.startsWith("service:"))
    .sort();

  for (const serviceKey of allServiceKeys) {
    if (!coveredServiceKeys.has(serviceKey)) {
      resolved.push({
        playbook: genericPlaybook,
        triggeredByServiceKey: serviceKey,
        isFallback: true,
      });
    }
  }

  return {
    matched: resolved,
  };
}
