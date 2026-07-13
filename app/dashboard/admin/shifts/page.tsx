import Link from "next/link";
import { ArrowLeft, BusFront, CalendarPlus, Clock, Pencil, Trash2, UserCheck } from "lucide-react";
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

  const openShifts = shifts.filter((shift) => !shift.driverProfile).length;
  const coveredShifts = shifts.length - openShifts;

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-24 pt-5 md:py-8">
      <section className="rounded-[28px] bg-ink p-5 text-white shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bus">ADMIN</p>
            <h1 className="mt-2 text-3xl font-bold">Vagter</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Opret 2-timers vagter, book en bus og se hurtigt hvor der mangler chauffører.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/admin/buses" className="button gap-2 bg-white text-ink hover:bg-cream">
              <BusFront size={16} />
              Buskalender
            </Link>
            <Link href="/dashboard/admin" className="button gap-2 border border-white/25 bg-white/10 text-white hover:bg-white/15">
              <ArrowLeft size={16} />
              Tilbage
            </Link>
          </div>
        </div>
      </section>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">{params.success}</p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-fjord/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CalendarPlus size={16} className="text-bus" />
            Vagter i alt
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{shifts.length}</p>
        </div>
        <div className="rounded-2xl border border-fjord/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Clock size={16} className="text-bus" />
            Mangler chauffør
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{openShifts}</p>
        </div>
        <div className="rounded-2xl border border-fjord/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <UserCheck size={16} className="text-bus" />
            Dækket
          </div>
          <p className="mt-2 text-3xl font-bold text-ink">{coveredShifts}</p>
        </div>
      </section>

      <form action={createShiftAction} className="grid gap-4 rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto] lg:items-end">
        <div className="grid min-w-0 gap-2">
          <label htmlFor="date">Dato</label>
          <input id="date" name="date" type="date" required className="min-w-0" />
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="bus">Bus</label>
          <select id="bus" name="bus" defaultValue="EAST" required className="min-w-0">
            {busOptions.map((bus) => (
              <option key={bus} value={bus}>
                {busLabels[bus]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="startTime">Start</label>
          <input id="startTime" name="startTime" type="time" required className="min-w-0" />
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="endTime">Slut</label>
          <input id="endTime" name="endTime" type="time" className="min-w-0" />
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="notes">Note</label>
          <input id="notes" name="notes" placeholder="Fx Lemvig, Harboøre eller særlige aftaler" className="min-w-0" />
        </div>
        <button type="submit" className="w-full bg-bus text-white hover:bg-bus/90 lg:w-auto">
          Opret vagt
        </button>
      </form>

      <section className="grid gap-3 md:hidden">
        {shifts.map((shift) => (
          <article key={shift.id} className="rounded-[24px] border border-fjord/20 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">{shift.shiftDate.toLocaleDateString("da-DK")}</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  {shift.startTime} - {shift.endTime}
                </p>
              </div>
              <span className="rounded-full bg-bus/15 px-3 py-1.5 text-xs font-bold text-brown">
                {busLabels[(shift.bus || "EAST") as BusName]}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-ink">Chauffør:</span> {shift.driverProfile?.user.name ?? "Ikke taget"}
              </p>
              {shift.notes ? <p>{shift.notes}</p> : null}
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${shift.driverProfile ? "bg-fjord/25 text-ink" : "bg-bus/20 text-brown"}`}>
                {shift.driverProfile ? "Dækket" : "Mangler chauffør"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/dashboard/admin/shifts/${shift.id}`} className="button justify-center gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                <Pencil size={15} />
                Rediger
              </Link>
              <form action={deleteShiftAction}>
                <input type="hidden" name="shiftId" value={shift.id} />
                <button type="submit" className="w-full justify-center gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                  <Trash2 size={15} />
                  Slet
                </button>
              </form>
            </div>
          </article>
        ))}
        {shifts.length === 0 ? <p className="rounded-2xl bg-white p-5 text-center text-slate-500">Der er ingen vagter endnu.</p> : null}
      </section>

      <section className="hidden overflow-x-auto rounded-[28px] border-2 border-fjord/25 bg-white shadow-sm md:block">
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
