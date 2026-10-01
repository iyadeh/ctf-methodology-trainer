import { describe, expect, it } from "vitest";
import { reconcileDynamicChecklist } from "./engine";
import { resolvePlaybooks } from "../playbooks/resolver";

describe("Dynamic Checklist Engine", () => {
  const sessionId = "00000000-0000-0000-0000-000000000001";
  const now = new Date("2026-10-01T10:00:00Z");

  const sessionPhases = [
    {
      id: "phase-recon",
      semanticKey: "reconnaissance",
      status: "active" as const,
      sortOrder: 0,
    },
    {
      id: "phase-post-exp",
      semanticKey: "post-exploitation",
      status: "locked" as const,
      sortOrder: 4,
    },
  ];

  const existingCoreChecks = [
    {
      id: "check-core-0",
      semanticKey: "reconnaissance.confirm-target-information",
      sessionPhaseId: "phase-recon",
      status: "active" as const,
      provenance: "core" as const,
      sortOrder: 0,
    },
    {
      id: "check-core-1",
      semanticKey: "reconnaissance.confirm-target-reachability",
      sessionPhaseId: "phase-recon",
      status: "active" as const,
      provenance: "core" as const,
      sortOrder: 1,
    },
  ];

  it("produces no changes when no playbooks are resolved and no dynamic checks exist", () => {
    const { matched } = resolvePlaybooks([]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingCoreChecks,
      now,
    });

    expect(result.checksToInsert).toHaveLength(0);
    expect(result.checksToReactivate).toHaveLength(0);
    expect(result.checksToSupersede).toHaveLength(0);
  });

  it("composes and appends native HTTP playbook checks when HTTP is confirmed", () => {
    const { matched } = resolvePlaybooks(["service:http"]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingCoreChecks,
      now,
    });

    expect(result.checksToInsert).toHaveLength(8);
    expect(result.checksToReactivate).toHaveLength(0);
    expect(result.checksToSupersede).toHaveLength(0);

    const first = result.checksToInsert[0];
    expect(first.semanticKey).toBe("playbook.http.manual-inspection");
    expect(first.sessionPhaseId).toBe("phase-recon");
    expect(first.provenance).toBe("playbook");
    expect(first.status).toBe("active");
    expect(first.activatedAt).toEqual(now);
    expect(first.sortOrder).toBe(2); // continues after core-1 (sortOrder 1)

    // Verify sequential sort orders
    const sortOrders = result.checksToInsert.map((c) => c.sortOrder);
    expect(sortOrders).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("marks checks inactive when target phase is locked", () => {
    const { matched } = resolvePlaybooks(["access:local-shell"]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingCoreChecks,
      now,
    });

    expect(result.checksToInsert).toHaveLength(9); // Linux post-exp
    for (const check of result.checksToInsert) {
      expect(check.sessionPhaseId).toBe("phase-post-exp");
      expect(check.status).toBe("inactive");
      expect(check.activatedAt).toBeNull();
    }
  });

  it("deduplicates existing active dynamic checks without re-inserting", () => {
    const { matched } = resolvePlaybooks(["service:http"]);
    const existingHttp = [
      ...existingCoreChecks,
      {
        id: "check-http-0",
        semanticKey: "playbook.http.manual-inspection",
        sessionPhaseId: "phase-recon",
        status: "active" as const,
        provenance: "playbook" as const,
        sortOrder: 2,
      },
    ];

    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingHttp,
      now,
    });

    // 7 checks to insert instead of 8, because manual-inspection already exists
    expect(result.checksToInsert).toHaveLength(7);
    expect(result.checksToInsert.some((c) => c.semanticKey === "playbook.http.manual-inspection")).toBe(false);
  });

  it("composes Generic Service fallback checks with unique service suffixes and titles", () => {
    const { matched } = resolvePlaybooks(["service:mqtt", "service:redis"]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingCoreChecks,
      now,
    });

    expect(result.checksToInsert).toHaveLength(18); // 9 for mqtt + 9 for redis
    const mqttChecks = result.checksToInsert.filter((c) => c.semanticKey.endsWith(".mqtt"));
    const redisChecks = result.checksToInsert.filter((c) => c.semanticKey.endsWith(".redis"));

    expect(mqttChecks).toHaveLength(9);
    expect(redisChecks).toHaveLength(9);
    expect(mqttChecks[0].provenance).toBe("generic");
    expect(mqttChecks[0].title).toContain("(MQTT)");
    expect(redisChecks[0].title).toContain("(REDIS)");
  });

  it("supersedes uncompleted dynamic checks when context is lost, but never supersedes core or completed checks", () => {
    const existingWithVarious = [
      ...existingCoreChecks,
      {
        id: "check-http-active",
        semanticKey: "playbook.http.manual-inspection",
        sessionPhaseId: "phase-recon",
        status: "active" as const,
        provenance: "playbook" as const,
        sortOrder: 2,
      },
      {
        id: "check-http-completed",
        semanticKey: "playbook.http.review-headers",
        sessionPhaseId: "phase-recon",
        status: "completed" as const,
        provenance: "playbook" as const,
        sortOrder: 3,
      },
      {
        id: "check-http-skipped",
        semanticKey: "playbook.http.analyze-client-resources",
        sessionPhaseId: "phase-recon",
        status: "skipped" as const,
        provenance: "playbook" as const,
        sortOrder: 4,
      },
    ];

    // Context is now empty (HTTP was retracted)
    const { matched } = resolvePlaybooks([]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingWithVarious,
      now,
    });

    expect(result.checksToInsert).toHaveLength(0);
    // Only the active uncompleted check is superseded! Completed and skipped are preserved.
    expect(result.checksToSupersede).toHaveLength(1);
    expect(result.checksToSupersede[0].id).toBe("check-http-active");
  });

  it("reactivates previously superseded checks when context is re-confirmed", () => {
    const existingWithSuperseded = [
      ...existingCoreChecks,
      {
        id: "check-http-superseded",
        semanticKey: "playbook.http.manual-inspection",
        sessionPhaseId: "phase-recon",
        status: "superseded" as const,
        provenance: "playbook" as const,
        sortOrder: 2,
      },
    ];

    const { matched } = resolvePlaybooks(["service:http"]);
    const result = reconcileDynamicChecklist({
      sessionId,
      sessionPhases,
      resolvedPlaybooks: matched,
      existingChecks: existingWithSuperseded,
      now,
    });

    // Check manual-inspection is reactivated rather than inserted as a duplicate
    expect(result.checksToReactivate).toHaveLength(1);
    expect(result.checksToReactivate[0]).toEqual({
      id: "check-http-superseded",
      status: "active",
      activatedAt: now,
    });

    // The other 7 HTTP checks are inserted
    expect(result.checksToInsert).toHaveLength(7);
  });
});
