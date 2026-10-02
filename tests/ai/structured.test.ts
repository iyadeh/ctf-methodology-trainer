import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  cleanRawJsonText,
  generateStructuredAI,
  InvalidAIOutputError,
  parseAndValidateAIOutput,
} from "../../src/modules/ai";
import * as clientModule from "../../src/modules/ai/client";

describe("Structured AI Generation & Zod Validation", () => {
  describe("cleanRawJsonText", () => {
    it("returns plain JSON string trimmed without alteration", () => {
      const input = '  {"title": "Test Machine"}  ';
      expect(cleanRawJsonText(input)).toBe('{"title": "Test Machine"}');
    });

    it("strips ```json and ``` markdown code fences", () => {
      const input = `\`\`\`json
{
  "key": "value"
}
\`\`\``;
      expect(cleanRawJsonText(input)).toBe(`{\n  "key": "value"\n}`);
    });

    it("strips generic ``` code fences", () => {
      const input = `\`\`\`
{"status": "ok"}
\`\`\``;
      expect(cleanRawJsonText(input)).toBe('{"status": "ok"}');
    });

    it("handles trailing and leading whitespaces around code fences", () => {
      const input = `   \`\`\`json\n{"id": 1}\n\`\`\`   \n`;
      expect(cleanRawJsonText(input)).toBe('{"id": 1}');
    });
  });

  describe("parseAndValidateAIOutput", () => {
    const TestSchema = z.object({
      machineName: z.string(),
      os: z.enum(["linux", "windows"]),
      openPorts: z.array(z.number()),
    });

    it("successfully validates valid JSON matching schema", () => {
      const raw = JSON.stringify({
        machineName: "Baseme",
        os: "linux",
        openPorts: [22, 80],
      });

      const parsed = parseAndValidateAIOutput(raw, TestSchema);
      expect(parsed).toEqual({
        machineName: "Baseme",
        os: "linux",
        openPorts: [22, 80],
      });
    });

    it("successfully validates markdown-wrapped JSON", () => {
      const raw = `\`\`\`json\n{"machineName": "Friendly", "os": "windows", "openPorts": [80, 445]}\n\`\`\``;
      const parsed = parseAndValidateAIOutput(raw, TestSchema);
      expect(parsed).toEqual({
        machineName: "Friendly",
        os: "windows",
        openPorts: [80, 445],
      });
    });

    it("throws InvalidAIOutputError for empty output", () => {
      expect(() => parseAndValidateAIOutput("   ", TestSchema)).toThrow(
        InvalidAIOutputError,
      );
    });

    it("throws InvalidAIOutputError for malformed JSON syntax", () => {
      const malformed = '{"machineName": "Friendly", broken: }';
      expect(() => parseAndValidateAIOutput(malformed, TestSchema)).toThrow(
        InvalidAIOutputError,
      );
    });

    it("throws InvalidAIOutputError with issues when schema validation fails", () => {
      const invalidData = JSON.stringify({
        machineName: "Baseme",
        os: "macos", // not linux or windows
        openPorts: "not-an-array",
      });

      expect(() =>
        parseAndValidateAIOutput(invalidData, TestSchema),
      ).toThrowError(/AI output failed schema validation/);

      try {
        parseAndValidateAIOutput(invalidData, TestSchema);
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidAIOutputError);
        const aiErr = err as InvalidAIOutputError;
        expect(aiErr.zodIssues).toBeDefined();
        expect(aiErr.zodIssues?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("generateStructuredAI", () => {
    const SimpleSchema = z.object({
      summary: z.string(),
      score: z.number(),
    });

    it("generates and parses structured output using mocked Gemini client", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify({ summary: "Enumeration complete", score: 95 }),
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      };

      vi.spyOn(clientModule, "getGeminiClient").mockReturnValue(
        mockClient as unknown as ReturnType<typeof clientModule.getGeminiClient>,
      );

      const result = await generateStructuredAI({
        contents: "Analyze this Nmap output",
        schema: SimpleSchema,
        systemInstruction: "You are a methodology assistant.",
      });

      expect(result).toEqual({ summary: "Enumeration complete", score: 95 });
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-3.5-flash",
        contents: ["Analyze this Nmap output"],
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a methodology assistant.",
          temperature: 0.2,
        },
      });
    });

    it("classifies upstream 429 quota errors into GeminiRateLimitError", async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue(
        new Error("429 Resource has been exhausted (RESOURCE_EXHAUSTED)"),
      );

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      };

      vi.spyOn(clientModule, "getGeminiClient").mockReturnValue(
        mockClient as unknown as ReturnType<typeof clientModule.getGeminiClient>,
      );

      await expect(
        generateStructuredAI({
          contents: "Analyze this",
          schema: SimpleSchema,
        }),
      ).rejects.toThrowError(/Gemini quota or rate limit exceeded/);
    });
  });
});
