import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Copenhagen"
  }).format(date);
}

export default async function AdminActivityPage() {
  await requireUser(["ADMIN"]);

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 250,
    include: { actor: { select: { name: true, email: true } } }
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-24 pt-5 md:py-8">
      <section className="rounded-[28px] bg-ink p-5 text-white shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-bus">Admin</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold">
              <History size={28} /> Aktivitetslog
            </h1>
            <p className="mt-2 text-sm text-white/75">Se hvem der har oprettet, ændret, taget, frigivet eller slettet ture og vagter.</p>
          </div>
          <Link href="/dashboard/admin" className="button gap-2 border border-white/25 bg-white/10 text-white hover:bg-white/15">
            <ArrowLeft size={16} /> Tilbage
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border-2 border-fjord/25 bg-white shadow-sm">
        <div className="hidden grid-cols-[180px_220px_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-600 md:grid">
          <span>Tidspunkt</span>
          <span>Udført af</span>
          <span>Handling</span>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[180px_220px_1fr] md:gap-4">
              <time className="font-semibold text-slate-600">{formatDateTime(entry.createdAt)}</time>
              <div>
                <p className="font-bold text-ink">{entry.actor?.name || "Systemet"}</p>
                {entry.actor?.email ? <p className="text-xs text-slate-500">{entry.actor.email}</p> : null}
              </div>
              <p className="leading-6 text-slate-700">{entry.description}</p>
            </article>
          ))}
          {entries.length === 0 ? <p className="px-5 py-10 text-center text-slate-500">Der er ingen registrerede aktiviteter endnu.</p> : null}
        </div>
      </section>
    </main>
  );
}
