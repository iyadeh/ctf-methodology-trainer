import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifyGeminiError,
  createMultimodalPart,
  GeminiConfigError,
  GeminiError,
  GeminiRateLimitError,
  GeminiUnavailableError,
  getGeminiClient,
  isGeminiConfigured,
} from "../../src/modules/ai";

describe("Gemini Client & Error Classification", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  describe("isGeminiConfigured", () => {
    it("returns false when GEMINI_API_KEY is undefined", () => {
      delete process.env.GEMINI_API_KEY;
      expect(isGeminiConfigured()).toBe(false);
    });

    it("returns false when GEMINI_API_KEY is empty or whitespace", () => {
      process.env.GEMINI_API_KEY = "   ";
      expect(isGeminiConfigured()).toBe(false);
    });

    it("returns true when GEMINI_API_KEY has a value", () => {
      process.env.GEMINI_API_KEY = "dummy-test-key-12345";
      expect(isGeminiConfigured()).toBe(true);
    });
  });

  describe("getGeminiClient", () => {
    it("throws GeminiConfigError when GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => getGeminiClient()).toThrow(GeminiConfigError);
    });
  });

  describe("createMultimodalPart", () => {
    it("encodes buffer to base64 with correct mimeType", () => {
      const buffer = Buffer.from("test image or document content");
      const part = createMultimodalPart(buffer, "image/png");

      expect(part).toEqual({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "image/png",
        },
      });
    });

    it("works with Uint8Array", () => {
      const uint8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const part = createMultimodalPart(uint8, "application/pdf");

      expect(part).toEqual({
        inlineData: {
          data: Buffer.from("Hello").toString("base64"),
          mimeType: "application/pdf",
        },
      });
    });
  });

  describe("classifyGeminiError", () => {
    it("preserves already structured GeminiError instances", () => {
      const err = new GeminiRateLimitError("Too many calls", 60);
      const classified = classifyGeminiError(err);
      expect(classified).toBe(err);
    });

    it("detects 429 and rate limit / quota strings as GeminiRateLimitError", () => {
      const err1 = new Error("Request failed with status code 429: Too Many Requests");
      const classified1 = classifyGeminiError(err1);
      expect(classified1).toBeInstanceOf(GeminiRateLimitError);

      const err2 = new Error("Resource has been exhausted (RESOURCE_EXHAUSTED): Quota exceeded");
      const classified2 = classifyGeminiError(err2);
      expect(classified2).toBeInstanceOf(GeminiRateLimitError);
    });

    it("detects 503 / network / timeout errors as GeminiUnavailableError", () => {
      const err1 = new Error("503 Service Unavailable: backend is down");
      const classified1 = classifyGeminiError(err1);
      expect(classified1).toBeInstanceOf(GeminiUnavailableError);

      const err2 = new Error("fetch failed: ECONNREFUSED 127.0.0.1:443");
      const classified2 = classifyGeminiError(err2);
      expect(classified2).toBeInstanceOf(GeminiUnavailableError);

      const err3 = new Error("Request timeout after 30000ms");
      const classified3 = classifyGeminiError(err3);
      expect(classified3).toBeInstanceOf(GeminiUnavailableError);
    });

    it("detects missing/invalid API key messages as GeminiConfigError", () => {
      const err = new Error("API_KEY_INVALID: API key not valid");
      const classified = classifyGeminiError(err);
      expect(classified).toBeInstanceOf(GeminiConfigError);
    });

    it("wraps generic unknown errors in GeminiError with generation_failed code", () => {
      const err = new Error("Unexpected token in response");
      const classified = classifyGeminiError(err);
      expect(classified).toBeInstanceOf(GeminiError);
      expect((classified as GeminiError).code).toBe("generation_failed");
    });
  });
});
