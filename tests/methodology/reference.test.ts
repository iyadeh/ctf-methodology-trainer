import { describe, expect, it } from "vitest";
import { getMethodologyReferenceData } from "../../src/modules/methodology/reference";
import { ptesFramework } from "../../src/modules/methodology/ptes";

describe("Stage 26 — Methodology Page Framework Reuse (AGENTS.md Rule 34)", () => {
  it("renders all 6 canonical PTES phases from ptesFramework", () => {
    const data = getMethodologyReferenceData();

    expect(data.frameworkSlug).toBe(ptesFramework.slug);
    expect(data.phases.length).toBe(ptesFramework.phases.length);
    expect(data.phases.length).toBe(6);

    const expectedKeys = [
      "reconnaissance",
      "threat-modeling",
      "vulnerability-analysis",
      "exploitation",
      "post-exploitation",
      "reporting",
    ];

    for (let i = 0; i < expectedKeys.length; i++) {
      const phase = data.phases[i];
      expect(phase.semanticKey).toBe(expectedKeys[i]);
      expect(phase.phaseNumber).toBe(i + 1);
      expect(phase.name).toBe(ptesFramework.phases[i].name);
    }
  });

  it("directly reuses checks from ptesFramework without duplication", () => {
    const data = getMethodologyReferenceData();

    for (let i = 0; i < data.phases.length; i++) {
      const refPhase = data.phases[i];
      const ptesPhase = ptesFramework.phases[i];

      expect(refPhase.checks.length).toBe(ptesPhase.checks.length);
      expect(refPhase.checks).toEqual(ptesPhase.checks);

      // Verify check fields
      for (const check of refPhase.checks) {
        expect(check.semanticKey).toBeTruthy();
        expect(check.title).toBeTruthy();
        expect(["required", "recommended", "suggested"]).toContain(check.priority);
      }
    }
  });

  it("links related playbooks from the Playbook Registry", () => {
    const data = getMethodologyReferenceData();

    const recon = data.phases.find((p) => p.semanticKey === "reconnaissance");
    expect(recon).toBeDefined();
    expect(recon?.relatedPlaybooks.length).toBeGreaterThan(0);
    expect(recon?.relatedPlaybooks.some((pb) => pb.slug === "http")).toBe(true);
    expect(recon?.relatedPlaybooks.some((pb) => pb.slug === "smb")).toBe(true);

    const postExp = data.phases.find((p) => p.semanticKey === "post-exploitation");
    expect(postExp).toBeDefined();
    expect(postExp?.relatedPlaybooks.length).toBeGreaterThan(0);
    expect(postExp?.relatedPlaybooks.some((pb) => pb.slug === "linux-post-exploitation")).toBe(true);
  });

  it("contains rich educational metadata for each phase", () => {
    const data = getMethodologyReferenceData();

    for (const phase of data.phases) {
      expect(phase.tagLine.length).toBeGreaterThan(10);
      expect(phase.purpose.length).toBeGreaterThan(20);
      expect(phase.whyItMatters.length).toBeGreaterThan(20);
      expect(phase.mindset.length).toBeGreaterThan(10);
      expect(phase.keyDeliverables.length).toBeGreaterThan(0);
    }
  });
});
