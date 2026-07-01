import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CitizensPage() {
  await requireUser(["ADMIN"]);

  const citizens = await prisma.citizenProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: { include: { membership: true } },
      _count: { select: { rideRequests: true } },
      rideRequests: {
        orderBy: [{ rideDate: "desc" }, { rideTime: "desc" }],
        take: 1
      }
    }
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Borgere</h1>
          <p className="mt-2 text-slate-600">Oversigt over borgerprofiler og deres seneste kørselsaktivitet.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Borger</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Adresse</th>
              <th className="px-4 py-3">Medlemskab</th>
              <th className="px-4 py-3">Ture</th>
              <th className="px-4 py-3">Seneste tur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {citizens.map((citizen) => {
              const latestRide = citizen.rideRequests[0];

              return (
                <tr key={citizen.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{citizen.user.name}</div>
                    <div className="text-slate-500">{citizen.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{citizen.phone || "Ikke angivet"}</td>
                  <td className="px-4 py-3">{citizen.address || "Ikke angivet"}</td>
                  <td className="px-4 py-3">{citizen.user.membership?.status === "ACTIVE" ? "Aktiv" : "Ikke aktiv"}</td>
                  <td className="px-4 py-3">{citizen._count.rideRequests}</td>
                  <td className="px-4 py-3">
                    {latestRide ? (
                      <div className="grid gap-2">
                        <div>
                          {latestRide.rideDate.toLocaleDateString("da-DK")} kl. {latestRide.rideTime}
                        </div>
                        <div className="text-slate-600">
                          {latestRide.pickupAddress} til {latestRide.destinationAddress}
                        </div>
                        <StatusBadge status={latestRide.status} />
                      </div>
                    ) : (
                      "Ingen ture endnu"
                    )}
                  </td>
                </tr>
              );
            })}
            {citizens.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Der er ingen borgerprofiler endnu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
