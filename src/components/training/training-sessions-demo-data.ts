export type TrainingSessionStatus =
  | "In Progress"
  | "Paused"
  | "Completed"
  | "Not Started";

export type TrainingSessionAction =
  | "Continue"
  | "Resume"
  | "Review"
  | "View Details";

export type TrainingSessionDemo = {
  id: string;
  name: string;
  description: string;
  methodology: "PTES";
  operatingSystem: "Linux" | "Windows";
  difficulty: "Easy" | "Medium" | "Hard";
  status: TrainingSessionStatus;
  progress: number;
  taskProgress: string;
  lastAccessed: string;
  lastAccessedOrder: number;
  createdOrder: number;
  action: TrainingSessionAction;
};

type TrainingSessionMetric = {
  label: "Total Sessions" | "In Progress" | "Paused" | "Completed";
  value: number;
  description: string;
};

type TrainingSessionsDemoData = {
  metrics: TrainingSessionMetric[];
  sessions: TrainingSessionDemo[];
};

export const trainingSessionsDemoData: TrainingSessionsDemoData = {
  metrics: [
    {
      label: "Total Sessions",
      value: 5,
      description: "Across all machines",
    },
    { label: "In Progress", value: 2, description: "Keep going" },
    {
      label: "Paused",
      value: 1,
      description: "Pick up where you left off",
    },
    { label: "Completed", value: 2, description: "Great progress!" },
  ],
  sessions: [
    {
      id: "friendly",
      name: "Friendly",
      description:
        "A beginner-friendly machine focused on basic enumeration and common misconfigurations.",
      methodology: "PTES",
      operatingSystem: "Linux",
      difficulty: "Easy",
      status: "In Progress",
      progress: 42,
      taskProgress: "3 of 6 tasks",
      lastAccessed: "12 minutes ago",
      lastAccessedOrder: 1,
      createdOrder: 3,
      action: "Continue",
    },
    {
      id: "baseme",
      name: "Baseme",
      description:
        "A Linux lab for practicing structured enumeration and evidence review.",
      methodology: "PTES",
      operatingSystem: "Linux",
      difficulty: "Medium",
      status: "Paused",
      progress: 28,
      taskProgress: "2 of 7 tasks",
      lastAccessed: "2 hours ago",
      lastAccessedOrder: 2,
      createdOrder: 1,
      action: "Resume",
    },
    {
      id: "cap",
      name: "Cap",
      description:
        "A completed Windows session ready for methodology review and path comparison.",
      methodology: "PTES",
      operatingSystem: "Windows",
      difficulty: "Hard",
      status: "Completed",
      progress: 100,
      taskProgress: "6 of 6 tasks",
      lastAccessed: "1 day ago",
      lastAccessedOrder: 3,
      createdOrder: 5,
      action: "Review",
    },
    {
      id: "planning",
      name: "Planning",
      description:
        "An early-stage Linux session focused on building a complete attack-surface map.",
      methodology: "PTES",
      operatingSystem: "Linux",
      difficulty: "Easy",
      status: "In Progress",
      progress: 14,
      taskProgress: "1 of 7 tasks",
      lastAccessed: "3 days ago",
      lastAccessedOrder: 4,
      createdOrder: 2,
      action: "Continue",
    },
    {
      id: "atlas",
      name: "Atlas",
      description:
        "A Windows machine prepared for a future methodology-guided assessment.",
      methodology: "PTES",
      operatingSystem: "Windows",
      difficulty: "Hard",
      status: "Not Started",
      progress: 0,
      taskProgress: "0 of 8 tasks",
      lastAccessed: "5 days ago",
      lastAccessedOrder: 5,
      createdOrder: 4,
      action: "View Details",
    },
  ],
};
