import { Container } from "@/components/ui";
import { Assistant } from "@/components/assistant";

export const metadata = { title: "المساعد الذكي" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <Container className="max-w-5xl py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand-700">✨ المساعد الذكي</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">قل لنا وش تبي، وإحنا نرتبه ونرشح لك</h1>
        <p className="mt-2 text-stone-600">اكتب بلهجتك. المساعد يحوّل كلامك لطلب واضح للمستقل، ويختار لك أنسب الخدمات الموثقة.</p>
      </div>
      <Assistant initial={q?.slice(0, 2000)} />
    </Container>
  );
}
