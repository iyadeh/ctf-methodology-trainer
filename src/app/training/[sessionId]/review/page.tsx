import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { getSessionReview } from "@/modules/review/service";
import { TrainingSessionError } from "@/modules/training/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewShell } from "@/components/training/review/review-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ReviewPageProps {
  readonly params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { sessionId } = await params;
  try {
    const review = await getSessionReview(sessionId);
    return {
      title: `${review.session.name} — Session Review`,
    };
  } catch {
    return {
      title: "Session Review",
    };
  }
}

export default async function SessionReviewPage({ params }: ReviewPageProps) {
  const { sessionId } = await params;

  let review;
  try {
    review = await getSessionReview(sessionId);
  } catch (error) {
    if (error instanceof TrainingSessionError && error.code === "not_found") {
      notFound();
    }
    throw error;
  }

  // If session is not yet completed, inform user to complete the machine first
  if (review.session.status !== "completed") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-lg p-6 text-center border-border bg-card">
          <Clock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">
            Session Not Yet Completed
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The full Session Review, Reference Path comparison, and methodology scores are unlocked once you complete the machine from the workspace.
          </p>

          <div className="mt-5 flex justify-center">
            <Link href={`/training/${sessionId}`}>
              <Button size="sm" className="gap-2 font-mono text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Workspace
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <ReviewShell review={review} />;
}
