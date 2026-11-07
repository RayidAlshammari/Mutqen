import { Container, PageHeader } from "@/components/ui";
import { OrdersList } from "@/components/orders-list";
import { requireUser } from "@/lib/session";
import { listOrdersForUser } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "طلباتي" };

export default async function OrdersPage() {
  const user = await requireUser("/dashboard/orders");
  const [asBuyer, asSeller] = await Promise.all([listOrdersForUser(user.id, "buyer"), user.role === "seller" ? listOrdersForUser(user.id, "seller") : Promise.resolve([])]);
  return (
    <Container className="py-10">
      <PageHeader title="الطلبات" />
      {user.role === "seller" && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">طلبات واردة (كمستقل)</h2>
          <OrdersList rows={asSeller} as="seller" />
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">{user.role === "seller" ? "طلبات طلبتها أنا" : "طلباتي"}</h2>
        <OrdersList rows={asBuyer} as="buyer" />
      </section>
    </Container>
  );
}
