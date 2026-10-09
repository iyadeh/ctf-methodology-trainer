import type { Metadata } from "next";
import { TrainingSessions } from "@/components/training/training-sessions";
import { listTrainingSessions } from "@/modules/training/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Training Sessions",
};

interface TrainingSessionsPageProps {
  readonly searchParams: Promise<{ search?: string; q?: string }>;
}

export default async function TrainingSessionsPage({
  searchParams,
}: TrainingSessionsPageProps) {
  const params = await searchParams;
  const initialQuery = params?.search || params?.q || "";

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
      initialQuery={initialQuery}
    />
  );
}
