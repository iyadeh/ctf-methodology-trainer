import type { Metadata } from "next";
import { TrainingSessions } from "@/components/training/training-sessions";
import { listTrainingSessions } from "@/modules/training/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Training Sessions",
};

export default async function TrainingSessionsPage() {
  const today = new Date();
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(today);

  const { sessions, metrics } = await listTrainingSessions();

  return (
    <TrainingSessions
      currentDate={currentDate}
      currentDateTime={today.toISOString().slice(0, 10)}
      sessions={sessions}
      metrics={metrics}
    />
  );
}
