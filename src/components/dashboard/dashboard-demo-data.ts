export type DashboardSessionStatus = "In Progress" | "Paused" | "Completed";

export type DashboardSessionSummary = {
  id: string;
  lastAccessed: string;
  name: string;
  progress: number;
  status: DashboardSessionStatus;
};

type DashboardDemoData = {
  featuredSession: {
    completedPhases: number;
    description: string;
    name: string;
    progress: number;
    status: DashboardSessionStatus;
    tags: readonly string[];
    totalPhases: number;
  };
  methodologyProgress: readonly {
    name: string;
    progress: number;
  }[];
  overview: readonly {
    description: string;
    label: string;
    value: number;
  }[];
  recentSessions: readonly DashboardSessionSummary[];
};

// UI-only fixtures. Replace this object with a dashboard view model when persistence exists.
export const dashboardDemoData = {
  featuredSession: {
    name: "Friendly",
    description:
      "A beginner-friendly machine focused on basic enumeration and common misconfigurations.",
    status: "In Progress",
    tags: ["Easy", "Linux", "Enumeration"],
    progress: 42,
    completedPhases: 3,
    totalPhases: 6,
  },
  recentSessions: [
    {
      id: "friendly",
      name: "Friendly",
      lastAccessed: "Last accessed 12 minutes ago",
      status: "In Progress",
      progress: 42,
    },
    {
      id: "baseme",
      name: "Baseme",
      lastAccessed: "Last accessed yesterday",
      status: "Paused",
      progress: 28,
    },
    {
      id: "cap",
      name: "Cap",
      lastAccessed: "Last accessed 4 days ago",
      status: "Completed",
      progress: 100,
    },
  ],
  methodologyProgress: [
    { name: "Reconnaissance", progress: 57 },
    { name: "Threat Modeling", progress: 23 },
    { name: "Vulnerability Analysis", progress: 31 },
    { name: "Exploitation", progress: 18 },
    { name: "Post Exploitation", progress: 12 },
    { name: "Reporting", progress: 44 },
  ],
  overview: [
    {
      label: "In Progress",
      value: 1,
      description: "Active training sessions",
    },
    {
      label: "Completed",
      value: 1,
      description: "Machines finished",
    },
    {
      label: "Paused",
      value: 1,
      description: "Ready when you return",
    },
    {
      label: "Hints Used",
      value: 6,
      description: "Across all sessions",
    },
  ],
} as const satisfies DashboardDemoData;
