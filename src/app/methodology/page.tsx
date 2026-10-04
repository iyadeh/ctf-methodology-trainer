import { getMethodologyReferenceData } from "@/modules/methodology/reference";
import { MethodologyShell } from "@/components/methodology/methodology-shell";

interface MethodologyPageProps {
  readonly searchParams: Promise<{
    phase?: string;
  }>;
}

export default async function MethodologyPage({
  searchParams,
}: MethodologyPageProps) {
  const params = await searchParams;
  const data = getMethodologyReferenceData();

  return (
    <MethodologyShell
      data={data}
      initialPhase={params.phase}
    />
  );
}
