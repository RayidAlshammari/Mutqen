import { redirect } from "next/navigation";

// The assistant became the guided brief. Old links keep working.
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/brief?q=${encodeURIComponent(q.slice(0, 2000))}` : "/brief");
}
