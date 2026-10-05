import { connectMongo, Design, Quote } from "@/lib/mongo";
import { requireStaff } from "@/lib/admin-guard";

export const dynamic = "force-dynamic"; // live numbers, never cached

type Stats = { newQuotes: number; quotes: number; designs: number; recent: { id: string; name: string; company?: string; product?: string; quantity?: number; status: string; createdAt: Date }[] };

async function loadStats(): Promise<Stats | null> {
  try {
    await connectMongo();
    const [newQuotes, quotes, designs, recent] = await Promise.all([
      Quote.countDocuments({ status: "new" }),
      Quote.countDocuments({}),
      Design.countDocuments({}),
      Quote.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    return {
      newQuotes,
      quotes,
      designs,
      recent: recent.map((q) => ({ id: String(q._id), name: q.name, company: q.company ?? undefined, product: q.product ?? undefined, quantity: q.quantity ?? undefined, status: q.status ?? "new", createdAt: q.createdAt })),
    };
  } catch {
    return null; // database unreachable: the page says so instead of crashing
  }
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-zinc-200 text-zinc-700",
};

export default async function AdminHome() {
  const staff = await requireStaff();
  const stats = await loadStats();
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand">Welcome, {staff.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">What needs attention at COTTSON today.</p>
      </div>

      {!stats ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Couldn&apos;t reach the database, so the numbers are unavailable. Check MONGODB_URI and your connection.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["New quote requests", stats.newQuotes, "waiting for a reply"],
              ["All quotes", stats.quotes, "since launch"],
              ["Saved designs", stats.designs, "customer logos + placements"],
              ["Orders", "—", "arrives with the Orders module"],
            ].map(([label, value, hint]) => (
              <div key={label as string} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-1 text-3xl font-bold text-brand">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
              </div>
            ))}
          </div>

          <section className="rounded-xl border bg-white shadow-sm">
            <h2 className="border-b px-5 py-3 font-semibold text-brand">Latest quote requests</h2>
            {stats.recent.length ? (
              <ul className="divide-y">
                {stats.recent.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{q.name}</span>
                      {q.company && <span className="text-muted-foreground"> · {q.company}</span>}
                      <span className="block text-xs text-muted-foreground">
                        {[q.product, q.quantity ? `${q.quantity} pcs` : null].filter(Boolean).join(" · ") || "No product given"}
                      </span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[q.status] ?? STATUS_STYLE.new}`}>{q.status}</span>
                    <time className="text-xs text-muted-foreground" dateTime={q.createdAt.toISOString()}>
                      {q.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No quote requests yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
