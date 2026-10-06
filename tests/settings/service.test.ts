import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const {
  fetchAvailableGeminiModels,
  getAppSettings,
  maskApiKey,
  updateAiModel,
  updateCustomApiKey,
  updateInterfacePreferences,
  updateTrainingDefaults,
  VERIFIED_GEMINI_MODELS,
} = await import("../../src/modules/settings");

describe("Stage 27 — Settings Service & Security", () => {
  describe("maskApiKey", () => {
    it("returns 'Not Configured' for empty, undefined, or whitespace keys", () => {
      expect(maskApiKey(null)).toBe("Not Configured");
      expect(maskApiKey(undefined)).toBe("Not Configured");
      expect(maskApiKey("")).toBe("Not Configured");
      expect(maskApiKey("   ")).toBe("Not Configured");
    });

    it("masks Google Gemini keys starting with AIzaSy accurately without exposing full string", () => {
      const fullKey = "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q";
      const masked = maskApiKey(fullKey);

      expect(masked).toBe("AIzaSy••••••••5P6Q");
      expect(masked).not.toContain("C3D4E5F6");
      expect(masked.length).toBeLessThan(fullKey.length);
    });

    it("handles short or non-standard keys safely", () => {
      const shortKey = "abcdefgh";
      expect(maskApiKey(shortKey)).toBe("••••••••");

      const customKey = "my_custom_secret_key_12345";
      const masked = maskApiKey(customKey);
      expect(masked).toBe("my_c••••••••2345");
      expect(masked).not.toContain("secret");
    });
  });

  describe("getAppSettings", () => {
    it("returns complete application settings structure", async () => {
      const settings = await getAppSettings();

      expect(settings).toBeDefined();
      expect(settings.ai.provider).toBe("gemini");
      expect(settings.ai.model).toBeTruthy();
      expect(typeof settings.ai.isConnected).toBe("boolean");
      expect(typeof settings.ai.hasCustomKey).toBe("boolean");
      expect(settings.ai.maskedKey).toBeTruthy();

      expect(settings.trainingDefaults.frameworkSlug).toBe("ptes-ctf");
      expect(settings.trainingDefaults.frameworkName).toBe("PTES — CTF Adapted");
      expect(["methodology_only", "directional", "sub_objective"]).toContain(
        settings.trainingDefaults.defaultSpoilerLevel,
      );
      expect(["progressive", "strict", "on_demand"]).toContain(
        settings.trainingDefaults.hintBehavior,
      );

      expect(settings.interface.theme).toBe("dark");
      expect(settings.storage).toBeDefined();
      expect(typeof settings.storage.isDbConnected).toBe("boolean");
    });
  });

  describe("updateCustomApiKey validation", () => {
    it("rejects empty or whitespace-only keys", async () => {
      const resultEmpty = await updateCustomApiKey("");
      expect(resultEmpty.ok).toBe(false);
      expect(resultEmpty.message).toContain("empty");

      const resultWhitespace = await updateCustomApiKey("   ");
      expect(resultWhitespace.ok).toBe(false);
      expect(resultWhitespace.message).toContain("empty");
    });
  });

  describe("updateTrainingDefaults", () => {
    it("updates defaults without throwing error", async () => {
      await expect(
        updateTrainingDefaults({
          defaultSpoilerLevel: "directional",
          hintBehavior: "strict",
        }),
      ).resolves.not.toThrow();

      const updated = await getAppSettings();
      expect(updated.trainingDefaults.defaultSpoilerLevel).toBe("directional");
      expect(updated.trainingDefaults.hintBehavior).toBe("strict");

      // Reset back to defaults
      await updateTrainingDefaults({
        defaultSpoilerLevel: "methodology_only",
        hintBehavior: "progressive",
      });
    });
  });

  describe("fetchAvailableGeminiModels & Model Selection", () => {
    it("returns verified models presets when offline or configured", async () => {
      const models = await fetchAvailableGeminiModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === "gemini-3.5-flash")).toBe(true);
      expect(VERIFIED_GEMINI_MODELS.length).toBeGreaterThanOrEqual(3);
    });

    it("ensures getAppSettings does not return discontinued 2.5 models", async () => {
      const settings = await getAppSettings();
      expect(settings.ai.model).not.toContain("2.5");
      expect(settings.ai.model).toContain("gemini-3.");
    });
  });

  describe("updateInterfacePreferences persistence", () => {
    it("persists theme, density, and reducedMotion to local settings", async () => {
      await updateInterfacePreferences({
        theme: "dark",
        density: "compact",
        reducedMotion: true,
      });

      const settings = await getAppSettings();
      expect(settings.interface.theme).toBe("dark");
      expect(settings.interface.density).toBe("compact");
      expect(settings.interface.reducedMotion).toBe(true);

      // Revert back
      await updateInterfacePreferences({
        theme: "dark",
        density: "comfortable",
        reducedMotion: false,
      });
      const reverted = await getAppSettings();
      expect(reverted.interface.density).toBe("comfortable");
      expect(reverted.interface.reducedMotion).toBe(false);
    });
  });

  describe("updateAiModel persistence", () => {
    it("persists selected AI model without reverting", async () => {
      await updateAiModel("gemini-3.5-flash-lite");
      const settings = await getAppSettings();
      expect(settings.ai.model).toBe("gemini-3.5-flash-lite");

      // Revert to recommended
      await updateAiModel("gemini-3.5-flash");
      const reverted = await getAppSettings();
      expect(reverted.ai.model).toBe("gemini-3.5-flash");
    });
  });
});
