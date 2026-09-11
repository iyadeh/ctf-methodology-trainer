import type { Metadata } from "next";
import { TrainingSessions } from "@/components/training/training-sessions";

export const metadata: Metadata = {
  title: "Training Sessions",
};

export default function TrainingSessionsPage() {
  const today = new Date();
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(today);

  return (
    <TrainingSessions
      currentDate={currentDate}
      currentDateTime={today.toISOString().slice(0, 10)}
    />
  );
}
