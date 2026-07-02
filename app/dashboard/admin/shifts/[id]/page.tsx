import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateShiftAction } from "@/app/dashboard/admin/shifts/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Rediger vagt</h1>
          <p className="mt-2 text-slate-600">Opdater tidspunkt, note eller hvilken chauffør der har vagten.</p>
        </div>
        <Link href="/dashboard/admin/shifts" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <form action={action} className="grid gap-4 rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm p-6">
        <FormMessage message={query.error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <label htmlFor="date">Dato</label>
            <input id="date" name="date" type="date" defaultValue={shift.shiftDate.toISOString().slice(0, 10)} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="startTime">Start</label>
            <input id="startTime" name="startTime" type="time" defaultValue={shift.startTime} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="endTime">Slut</label>
            <input id="endTime" name="endTime" type="time" defaultValue={shift.endTime} required />
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

        <button type="submit" className="w-fit bg-bus text-white hover:bg-bus/90">
          Gem vagt
        </button>
      </form>
    </main>
  );
}
