import { describe, expect, it } from "vitest";
import {
  hashAnswer,
  verifyMilestoneAnswer,
} from "./milestone-verifier";
import type { MilestoneStatus } from "./types";

describe("Milestone Service Domain Operations", () => {
  it("verifies and transitions task status sequentially", () => {
    // Simulate a sequence of 3 milestones
    const milestones = [
      {
        id: "m-1",
        sortOrder: 1,
        title: "Port Scan",
        question: "How many ports are open?",
        taskType: "question" as const,
        expectedAnswer: "2",
        answerHash: hashAnswer("2"),
        status: "unlocked" as MilestoneStatus,
        userAnswer: null as string | null,
      },
      {
        id: "m-2",
        sortOrder: 2,
        title: "Service Scan",
        question: "What service is on port 80?",
        taskType: "question" as const,
        expectedAnswer: "http | apache",
        answerHash: hashAnswer("http"),
        status: "locked" as MilestoneStatus,
        userAnswer: null as string | null,
      },
      {
        id: "m-3",
        sortOrder: 3,
        title: "Submit User Flag",
        question: "Submit the user flag",
        taskType: "user_flag" as const,
        expectedAnswer: "HTB{user_1234}",
        answerHash: hashAnswer("HTB{user_1234}"),
        status: "locked" as MilestoneStatus,
        userAnswer: null as string | null,
      },
    ];

    // 1. Submit wrong answer for Task 1
    const wrongAttempt = verifyMilestoneAnswer({
      userAnswer: "3",
      expectedAnswer: milestones[0].expectedAnswer,
      answerHash: milestones[0].answerHash,
    });
    expect(wrongAttempt.isCorrect).toBe(false);

    // 2. Submit correct answer for Task 1
    const correctAttempt = verifyMilestoneAnswer({
      userAnswer: "  2  ",
      expectedAnswer: milestones[0].expectedAnswer,
      answerHash: milestones[0].answerHash,
    });
    expect(correctAttempt.isCorrect).toBe(true);

    // Transition state
    milestones[0].status = "completed";
    milestones[1].status = "unlocked"; // unlocked next

    expect(milestones[0].status).toBe("completed");
    expect(milestones[1].status).toBe("unlocked");

    // 3. Submit alias answer for Task 2
    const aliasAttempt = verifyMilestoneAnswer({
      userAnswer: "Apache",
      expectedAnswer: milestones[1].expectedAnswer,
      answerHash: milestones[1].answerHash,
    });
    expect(aliasAttempt.isCorrect).toBe(true);

    // 4. Submit flag for Task 3
    const flagAttempt = verifyMilestoneAnswer({
      userAnswer: "HTB{user_1234}",
      expectedAnswer: milestones[2].expectedAnswer,
      taskType: "user_flag",
    });
    expect(flagAttempt.isCorrect).toBe(true);
  });

  it("handles empty or whitespace inputs gracefully", () => {
    const res = verifyMilestoneAnswer({
      userAnswer: "   ",
      expectedAnswer: "apache",
    });
    expect(res.isCorrect).toBe(false);
    expect(res.feedback).toBe("Answer cannot be empty.");
  });
});
