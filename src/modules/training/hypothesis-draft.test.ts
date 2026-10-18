import { describe, expect, it } from "vitest";
import {
  generateCuratedHypothesisFallback,
  hypothesisDraftSchema,
} from "./hypothesis-draft";

describe("training/hypothesis-draft", () => {
  describe("hypothesisDraftSchema", () => {
    it("validates a compliant hypothesis draft structure", () => {
      const valid = {
        reasoning: "Port 21 allows anonymous login with write permissions to public html directory.",
        expectedResult: "Uploading a test file results in HTTP 200 response when fetched via browser.",
        testApproach: "Connect with ftp client, upload harmless text file, and verify HTTP reachability.",
      };

      const result = hypothesisDraftSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reasoning).toBe(valid.reasoning);
      }
    });

    it("rejects drafts with missing or too-short fields", () => {
      const invalid = {
        reasoning: "bad",
        expectedResult: "",
        testApproach: "123",
      };

      const result = hypothesisDraftSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("generateCuratedHypothesisFallback", () => {
    it("generates deterministic hypothesis details from statement and finding context", () => {
      const fallback = generateCuratedHypothesisFallback({
        hypothesis: "Anonymous FTP upload allows creating a webshell",
        findingTitle: "Port 21 ProFTPD",
        contextValue: "ftp",
      });

      expect(fallback.reasoning).toContain("ftp");
      expect(fallback.reasoning).toContain("anonymous ftp upload allows creating a webshell");
      expect(fallback.expectedResult).toContain("verification test yields verifiable response anomalies");
      expect(fallback.testApproach).toContain("non-destructive probing against ftp");

      // Verify fallback satisfies the schema
      const validated = hypothesisDraftSchema.safeParse(fallback);
      expect(validated.success).toBe(true);
    });
  });
});
