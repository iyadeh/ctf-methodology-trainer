import { describe, expect, it } from "vitest";
import {
  hashAnswer,
  normalizeAnswer,
  verifyMilestoneAnswer,
} from "./milestone-verifier";

describe("Milestone Verifier & Answer Normalizer", () => {
  describe("normalizeAnswer", () => {
    it("trims whitespace and converts to lower case", () => {
      expect(normalizeAnswer("  Werkzeug 2.2.2  ")).toBe("werkzeug 2.2.2");
      expect(normalizeAnswer("\tAPACHE\n")).toBe("apache");
    });

    it("strips surrounding single, double, and backtick quotes", () => {
      expect(normalizeAnswer('"check_parser"')).toBe("check_parser");
      expect(normalizeAnswer("'a.sh'")).toBe("a.sh");
      expect(normalizeAnswer("`sudo -l`")).toBe("sudo -l");
    });

    it("strips leading './' from commands or script paths", () => {
      expect(normalizeAnswer("./check_parser")).toBe("check_parser");
      expect(normalizeAnswer("./script.py")).toBe("script.py");
    });

    it("sorts comma-separated numeric lists consistently", () => {
      expect(normalizeAnswer("80, 22")).toBe("22, 80");
      expect(normalizeAnswer("5000, 22, 80")).toBe("22, 80, 5000");
      expect(normalizeAnswer("80,22")).toBe("22, 80");
    });

    it("sorts comma-separated text lists alphabetically", () => {
      expect(normalizeAnswer("ssh, http")).toBe("http, ssh");
      expect(normalizeAnswer("http, ftp, ssh")).toBe("ftp, http, ssh");
    });
  });

  describe("verifyMilestoneAnswer", () => {
    it("verifies by SHA-256 answerHash directly", () => {
      const answer = "2";
      const hash = hashAnswer(answer);

      const result = verifyMilestoneAnswer({
        userAnswer: "  2  ",
        answerHash: hash,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.normalizedUserAnswer).toBe("2");
    });

    it("accepts case-insensitive variations", () => {
      const result = verifyMilestoneAnswer({
        userAnswer: "WERKZEUG",
        expectedAnswer: "Werkzeug",
      });

      expect(result.isCorrect).toBe(true);
    });

    it("tolerates full path when expected is basename", () => {
      const result = verifyMilestoneAnswer({
        userAnswer: "/usr/local/bin/check_parser",
        expectedAnswer: "check_parser",
      });

      expect(result.isCorrect).toBe(true);
    });

    it("tolerates basename when expected is full path", () => {
      const result = verifyMilestoneAnswer({
        userAnswer: "a.sh",
        expectedAnswer: "/usr/local/bin/a.sh",
      });

      expect(result.isCorrect).toBe(true);
    });

    it("accepts multiple aliases separated by pipe |", () => {
      const aliases = "sql injection | sqli | blind sqli";

      expect(
        verifyMilestoneAnswer({
          userAnswer: "sqli",
          expectedAnswer: aliases,
        }).isCorrect,
      ).toBe(true);

      expect(
        verifyMilestoneAnswer({
          userAnswer: "SQL Injection",
          expectedAnswer: aliases,
        }).isCorrect,
      ).toBe(true);

      expect(
        verifyMilestoneAnswer({
          userAnswer: "xss",
          expectedAnswer: aliases,
        }).isCorrect,
      ).toBe(false);
    });

    it("matches comma-separated ports regardless of user entry order", () => {
      const expected = "22, 80";

      const result = verifyMilestoneAnswer({
        userAnswer: "80, 22",
        expectedAnswer: expected,
      });

      expect(result.isCorrect).toBe(true);
    });

    it("verifies CTF flag submissions accurately", () => {
      const flag = "HTB{p0wn3d_fr13ndly_m4ch1n3_2026}";

      const result = verifyMilestoneAnswer({
        userAnswer: "  HTB{p0wn3d_fr13ndly_m4ch1n3_2026}  ",
        expectedAnswer: flag,
        taskType: "user_flag",
      });

      expect(result.isCorrect).toBe(true);
    });

    it("rejects wrong answers and provides friendly feedback", () => {
      const result = verifyMilestoneAnswer({
        userAnswer: "nginx",
        expectedAnswer: "apache",
      });

      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe(
        "Incorrect answer. Check your evidence or format and try again.",
      );
    });

    it("rejects empty answers", () => {
      const result = verifyMilestoneAnswer({
        userAnswer: "   ",
        expectedAnswer: "2",
      });

      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe("Answer cannot be empty.");
    });
  });
});
