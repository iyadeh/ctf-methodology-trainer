import { getAllKnowledgeItems, getCategorySummaries } from "@/modules/knowledge";
import { KnowledgeShell } from "@/components/knowledge/knowledge-shell";

interface KnowledgePageProps {
  readonly searchParams: Promise<{
    item?: string;
    category?: string;
    tag?: string;
  }>;
}

export default async function KnowledgeBasePage({
  searchParams,
}: KnowledgePageProps) {
  const params = await searchParams;
  const allItems = getAllKnowledgeItems();
  const categorySummaries = getCategorySummaries();
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <KnowledgeShell
      allItems={allItems}
      categorySummaries={categorySummaries}
      initialSlug={params.item}
      initialCategory={params.category}
      initialTag={params.tag}
      formattedDate={formattedDate}
    />
  );
}
