import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { createShiftAction, deleteShiftAction } from "@/app/dashboard/admin/shifts/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          <p className="mt-2 text-slate-600">Opret 2-timers vagter, som chaufførerne selv kan tage.</p>
        </div>
        <Link href="/dashboard/admin" className="button gap-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{params.success}</p>
      ) : null}

      <form action={createShiftAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-[1fr_1fr_1fr_2fr_auto] md:items-end">
        <div className="grid gap-2">
          <label htmlFor="date">Dato</label>
          <input id="date" name="date" type="date" required />
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
        <button type="submit" className="bg-fjord text-white hover:bg-fjord/90">
          Opret vagt
        </button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Dato</th>
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
                  {shift.startTime} - {shift.endTime}
                </td>
                <td className="px-4 py-3">{shift.driverProfile?.user.name ?? "Ikke taget"}</td>
                <td className="px-4 py-3">{shift.notes || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${shift.driverProfile ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}>
                    {shift.driverProfile ? "Dækket" : "Mangler chauffør"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/admin/shifts/${shift.id}`} className="button gap-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
