import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateShiftAction } from "@/app/dashboard/admin/shifts/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions } from "@/lib/shifts";

export default async function EditShiftPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [shift, drivers] = await Promise.all([
    prisma.driverShift.findUnique({
      where: { id },
      include: { driverProfile: { include: { user: true } } }
    }),
    prisma.driverProfile.findMany({
      where: { isActive: true },
      orderBy: { user: { name: "asc" } },
      include: { user: true }
    })
  ]);

  if (!shift) {
    notFound();
  }

  const action = updateShiftAction.bind(null, shift.id);

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 pb-24 pt-5 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Rediger vagt</h1>
          <p className="mt-2 text-slate-600">Opdater tidspunkt, bus, note eller hvilken chauffør der har vagten.</p>
        </div>
        <Link href="/dashboard/admin/shifts" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <form action={action} className="grid gap-4 rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <FormMessage message={query.error} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid min-w-0 gap-2">
            <label htmlFor="date">Dato</label>
            <input id="date" name="date" type="date" defaultValue={shift.shiftDate.toISOString().slice(0, 10)} required className="min-w-0" />
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="bus">Bus</label>
            <select id="bus" name="bus" defaultValue={shift.bus || "EAST"} required className="min-w-0">
              {busOptions.map((bus) => (
                <option key={bus} value={bus}>
                  {busLabels[bus]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="startTime">Start</label>
            <input id="startTime" name="startTime" type="time" defaultValue={shift.startTime} required className="min-w-0" />
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="endTime">Slut</label>
            <input id="endTime" name="endTime" type="time" defaultValue={shift.endTime} required className="min-w-0" />
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="driverProfileId">Chauffør</label>
          <select id="driverProfileId" name="driverProfileId" defaultValue={shift.driverProfileId ?? ""}>
            <option value="">Ingen chauffør</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="notes">Note</label>
          <textarea id="notes" name="notes" rows={4} defaultValue={shift.notes ?? ""} />
        </div>

        <button type="submit" className="w-full bg-bus text-white hover:bg-bus/90 sm:w-fit">
          Gem vagt
        </button>
      </form>
    </main>
  );
}
