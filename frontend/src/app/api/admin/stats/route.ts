import { medusa, fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { connectMongo, Quote } from "@/lib/mongo";

type Order = { id: string; status: string; created_at: string; total: number; items: { product_title?: string | null; title: string; quantity: number; unit_price: number }[] };

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Numbers for the overview: the last 30 days against the 30 before, revenue and orders per day, best
// sellers, and how quotes are turning out. Cancelled orders are left out of every figure.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  try {
    const since = new Date(Date.now() - 60 * DAY);
    const orders: Order[] = [];
    for (let offset = 0; offset < 2000; offset += 200) {
      const { orders: page } = await medusa<{ orders: Order[] }>(
        `/admin/orders?limit=200&offset=${offset}&order=-created_at&created_at[$gte]=${encodeURIComponent(since.toISOString())}&fields=id,status,created_at,total,*items`,
        { token: session.token }
      );
      orders.push(...page);
      if (page.length < 200) break;
    }
    const live = orders.filter((o) => o.status !== "canceled");

    const now = Date.now();
    const inRange = (o: Order, fromDays: number, toDays: number) => {
      const age = now - new Date(o.created_at).getTime();
      return age >= fromDays * DAY && age < toDays * DAY;
    };
    const sum = (list: Order[]) => ({ revenue: list.reduce((n, o) => n + o.total, 0), orders: list.length });
    const current = sum(live.filter((o) => inRange(o, 0, 30)));
    const previous = sum(live.filter((o) => inRange(o, 30, 60)));

    const perDay = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i--) {
      const date = dayKey(new Date(now - i * DAY));
      perDay.set(date, { date, revenue: 0, orders: 0 });
    }
    for (const o of live) {
      const row = perDay.get(dayKey(new Date(o.created_at)));
      if (row) {
        row.revenue += o.total;
        row.orders += 1;
      }
    }

    const products = new Map<string, { title: string; units: number; revenue: number }>();
    for (const o of live.filter((o) => inRange(o, 0, 30)))
      for (const i of o.items) {
        const title = i.product_title ?? i.title;
        if (title === "Logo customization") continue; // a fee line, not a product
        const row = products.get(title) ?? { title, units: 0, revenue: 0 };
        row.units += i.quantity;
        row.revenue += i.quantity * i.unit_price;
        products.set(title, row);
      }

    await connectMongo();
    const counts = await Quote.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    const byStatus: Record<string, number> = { new: 0, contacted: 0, won: 0, lost: 0 };
    for (const c of counts) byStatus[String(c._id)] = c.n;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const closed = byStatus.won + byStatus.lost;

    return Response.json({
      current: { ...current, average: current.orders ? Math.round(current.revenue / current.orders) : 0 },
      previous: { ...previous, average: previous.orders ? Math.round(previous.revenue / previous.orders) : 0 },
      days: [...perDay.values()],
      topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      quotes: { total, ...byStatus, winRate: closed ? Math.round((byStatus.won / closed) * 100) : null, conversion: total ? Math.round((byStatus.won / total) * 100) : null },
    });
  } catch (e) {
    return fail(e);
  }
}
