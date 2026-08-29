import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DriversPage() {
  await requireUser(["ADMIN"]);
  const drivers = await prisma.driverProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: { user: true, assignments: true }
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Chauffører</h1>
          <p className="mt-2 text-slate-600">Opret og rediger frivillige chaufførprofiler.</p>
        </div>
        <Link href="/dashboard/admin/drivers/new" className="button gap-2 bg-bus text-white hover:bg-bus/90">
          <Plus size={16} />
          Ny chauffør
        </Link>
      </div>

      <section className="grid gap-4 md:hidden">
        {drivers.map((driver) => (
          <article key={driver.id} className="rounded-[24px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              {driver.imageUrl ? (
                <img src={driver.imageUrl} alt={driver.user.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bus text-lg font-bold text-ink">
                  {driver.user.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-extrabold text-ink">{driver.user.name}</h2>
                <a href={`mailto:${driver.user.email}`} className="block truncate text-sm text-slate-600">{driver.user.email}</a>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Telefon</dt>
                <dd className="mt-1 text-ink">{driver.phone || "Ikke angivet"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Status</dt>
                <dd className="mt-1 font-bold text-ink">{driver.isActive ? "Aktiv" : "Inaktiv"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Ture</dt>
                <dd className="mt-1 text-ink">{driver.assignments.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Kørekort</dt>
                <dd className="mt-1 text-ink">{driver.licenseNumber || "Ikke angivet"}</dd>
              </div>
            </dl>
            <Link href={`/dashboard/admin/drivers/${driver.id}`} className="button mt-4 w-full bg-bus text-ink hover:bg-bus/90">
              Rediger chauffør
            </Link>
          </article>
        ))}
        {drivers.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-fjord/25 bg-white p-7 text-center text-slate-500">
            Der er ingen chauffører endnu.
          </div>
        ) : null}
      </section>

      <div className="hidden overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Navn</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Kørekort</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ture</th>
              <th className="px-4 py-3">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {driver.imageUrl ? (
                      <img src={driver.imageUrl} alt={driver.user.name} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bus text-sm font-bold text-ink">
                        {driver.user.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-ink">{driver.user.name}</div>
                      <div className="text-slate-500">{driver.user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{driver.phone || "Ikke angivet"}</td>
                <td className="px-4 py-3">{driver.licenseNumber || "Ikke angivet"}</td>
                <td className="px-4 py-3">{driver.isActive ? "Aktiv" : "Inaktiv"}</td>
                <td className="px-4 py-3">{driver.assignments.length}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/admin/drivers/${driver.id}`} className="font-semibold text-ink hover:text-bus">
                    Rediger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
