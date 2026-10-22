import { describe, expect, it } from "vitest";
import type {
  MilestoneStatus,
  MilestoneTaskType,
  SessionMilestoneRecord,
  TrainingSessionAggregate,
  TrainingSessionMode,
} from "./types";

describe("Training Session Modes and Milestones Domain Model", () => {
  it("supports both guided and adventure training modes", () => {
    const guidedMode: TrainingSessionMode = "guided";
    const adventureMode: TrainingSessionMode = "adventure";

    expect(guidedMode).toBe("guided");
    expect(adventureMode).toBe("adventure");
  });

  it("supports valid milestone task types and status transitions", () => {
    const taskTypes: MilestoneTaskType[] = ["question", "user_flag", "root_flag"];
    const statuses: MilestoneStatus[] = ["locked", "unlocked", "completed", "skipped"];

    expect(taskTypes).toHaveLength(3);
    expect(statuses).toHaveLength(4);
  });

  it("structures session milestone records correctly for guided tasks", () => {
    const mockMilestone: SessionMilestoneRecord = {
      id: "11111111-2222-3333-4444-555555555555",
      trainingSessionId: "99999999-8888-7777-6666-555555555555",
      sortOrder: 1,
      title: "Port Discovery",
      question: "How many open TCP ports are listening on the target?",
      taskType: "question",
      phase: "scanning",
      answerHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
      expectedAnswer: "2",
      formatHint: "e.g. 2",
      hint: "Run an initial nmap SYN scan on top 1000 ports.",
      status: "unlocked",
      userAnswer: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockMilestone.taskType).toBe("question");
    expect(mockMilestone.status).toBe("unlocked");
    expect(mockMilestone.sortOrder).toBe(1);
    expect(mockMilestone.answerHash).toBeDefined();
  });

  it("includes milestones and mode within TrainingSessionAggregate", () => {
    const mockSession = {
      id: "99999999-8888-7777-6666-555555555555",
      frameworkId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "Headless Lab Test",
      status: "in_progress" as const,
      mode: "guided" as TrainingSessionMode,
      targetIp: "10.10.11.234",
      userFlag: null,
      userFlagSubmittedAt: null,
      rootFlag: null,
      rootFlagSubmittedAt: null,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAggregate: Partial<TrainingSessionAggregate> = {
      session: mockSession,
      milestones: [
        {
          id: "m-1",
          trainingSessionId: mockSession.id,
          sortOrder: 1,
          title: "Web Recon",
          question: "What service runs on port 5000?",
          taskType: "question",
          phase: "reconnaissance",
          answerHash: "somehash",
          expectedAnswer: "Werkzeug",
          formatHint: "e.g. werkzeug",
          hint: "Check HTTP Server response headers.",
          status: "unlocked",
          userAnswer: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    expect(mockAggregate.session?.mode).toBe("guided");
    expect(mockAggregate.milestones).toHaveLength(1);
    expect(mockAggregate.milestones?.[0].title).toBe("Web Recon");
  });
});
