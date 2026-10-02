import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrainingSession } from "@/modules/training/service";
import { TrainingSessionError, type TrainingSessionAggregate } from "@/modules/training/types";
import { SessionWorkspace } from "@/components/training/session/session-workspace";

interface SessionPageProps {
  readonly params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  try {
    const aggregate = await getTrainingSession(sessionId);
    return {
      title: `${aggregate.session.name} — Training Session`,
    };
  } catch {
    return {
      title: "Training Session",
    };
  }
}

export default async function TrainingSessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  let aggregate: TrainingSessionAggregate;
  try {
    aggregate = await getTrainingSession(sessionId);
  } catch (error) {
    if (error instanceof TrainingSessionError && error.code === "not_found") {
      notFound();
    }
    throw error;
  }

  return <SessionWorkspace aggregate={aggregate} />;
}
