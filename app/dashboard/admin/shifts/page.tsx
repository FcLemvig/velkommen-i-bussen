import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { createShiftAction, deleteShiftAction } from "@/app/dashboard/admin/shifts/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

export default async function AdminShiftsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;

  const shifts = await prisma.driverShift.findMany({
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    include: { driverProfile: { include: { user: true } } }
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Vagter</h1>
          <p className="mt-2 text-slate-600">Opret 2-timers vagter, book en bus og lad chaufførerne selv tage vagten.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">{params.success}</p>
      ) : null}

      <form action={createShiftAction} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto] md:items-end">
        <div className="grid gap-2">
          <label htmlFor="date">Dato</label>
          <input id="date" name="date" type="date" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="bus">Bus</label>
          <select id="bus" name="bus" defaultValue="EAST" required>
            {busOptions.map((bus) => (
              <option key={bus} value={bus}>
                {busLabels[bus]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="startTime">Start</label>
          <input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="endTime">Slut</label>
          <input id="endTime" name="endTime" type="time" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="notes">Note</label>
          <input id="notes" name="notes" placeholder="Fx Lemvig, Harboøre eller særlige aftaler" />
        </div>
        <button type="submit" className="bg-bus text-white hover:bg-bus/90">
          Opret vagt
        </button>
      </form>

      <section className="overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Dato</th>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Tid</th>
              <th className="px-4 py-3">Chauffør</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="px-4 py-3">{shift.shiftDate.toLocaleDateString("da-DK")}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-bus/15 px-3 py-1.5 text-xs font-bold text-brown">
                    {busLabels[(shift.bus || "EAST") as BusName]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {shift.startTime} - {shift.endTime}
                </td>
                <td className="px-4 py-3">{shift.driverProfile?.user.name ?? "Ikke taget"}</td>
                <td className="px-4 py-3">{shift.notes || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${shift.driverProfile ? "bg-fjord/25 text-ink" : "bg-bus/20 text-brown"}`}>
                    {shift.driverProfile ? "Dækket" : "Mangler chauffør"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/admin/shifts/${shift.id}`} className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                      <Pencil size={15} />
                      Rediger
                    </Link>
                    <form action={deleteShiftAction}>
                      <input type="hidden" name="shiftId" value={shift.id} />
                      <button type="submit" className="gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                        <Trash2 size={15} />
                        Slet
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Der er ingen vagter endnu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
