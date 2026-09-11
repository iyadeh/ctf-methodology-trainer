import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ListChecks,
  MessageSquare,
  MonitorCog,
  ShieldCheck,
} from "lucide-react";
import { WriteupUpload } from "@/components/training/writeup-upload";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New Training",
};

const generatedConcepts = [
  {
    title: "Machine Profile",
    description: "Organize machine details, difficulty, and tags from your writeup.",
    icon: MonitorCog,
  },
  {
    title: "Methodology-Guided Tasks",
    description: "Practice through PTES phases, with checks guided by evidence you confirm.",
    icon: ListChecks,
  },
  {
    title: "Hints and Guidance",
    description: "Get progressive help aligned with your methodology and spoiler level.",
    icon: MessageSquare,
  },
  {
    title: "Learning Resources",
    description: "Explore relevant concepts, techniques, and references for each phase.",
    icon: BookOpen,
  },
  {
    title: "Ready to Practice",
    description: "Work through a structured session while keeping the solution hidden.",
    icon: ShieldCheck,
  },
] as const;

export default function NewTrainingPage() {
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/training" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Training
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="size-3" strokeWidth={1.75} /></li>
              <li aria-current="page" className="text-foreground">New Training</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Training</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Turn a machine writeup into a methodology-guided training session.
          </p>
        </div>
        <p className="max-w-48 text-xs leading-5 text-muted-foreground sm:border-l sm:border-border sm:pl-5 sm:text-right">
          Turn writeups into hands-on learning.
        </p>
      </header>

      <WriteupUpload>
        <Card role="region" aria-labelledby="generated-concepts-title" className="min-w-0 self-start">
          <CardHeader className="border-b border-border">
            <h2 id="generated-concepts-title" className="text-base font-medium">What Gets Generated?</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              A training session combines hidden machine knowledge with structured methodology and progressive guidance.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-5">
              {generatedConcepts.map(({ title, description, icon: Icon }) => (
                <li key={title} className="flex gap-3">
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="py-3 text-xs leading-5 text-muted-foreground">
            Turn your CTF experience into a repeatable learning opportunity.
          </CardFooter>
        </Card>
      </WriteupUpload>
    </div>
  );
}
