import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateMembershipAction } from "@/app/dashboard/admin/citizens/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { membershipLabel } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

function MembershipForm({ userId, status }: { userId: string; status?: string }) {
  return (
    <form action={updateMembershipAction} className="grid gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select name="membershipStatus" defaultValue={status ?? "PENDING_PAYMENT"} className="min-w-44">
        <option value="PENDING_PAYMENT">Afventer betaling</option>
        <option value="ACTIVE">Aktiv</option>
        <option value="PAUSED">Pause</option>
        <option value="ENDED">Afsluttet</option>
      </select>
      <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
        Gem
      </button>
    </form>
  );
}

export default async function CitizensPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;

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
          <p className="mt-2 text-slate-600">Oversigt over borgerprofiler, ture og medlemsbetaling.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
          {params.success}
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
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
                  <td className="px-4 py-3">
                    <div className="mb-2 font-bold text-ink">{membershipLabel(citizen.user.membership)}</div>
                    <MembershipForm userId={citizen.user.id} status={citizen.user.membership?.status} />
                  </td>
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
