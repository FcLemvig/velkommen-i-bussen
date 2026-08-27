import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { updateEventAction } from "@/app/dashboard/admin/events/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions } from "@/lib/shifts";

export default async function EditEventPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [event, drivers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: { signups: true }
    }),
    prisma.driverProfile.findMany({
      where: { isActive: true },
      orderBy: { user: { name: "asc" } },
      include: { user: true }
    })
  ]);

  if (!event) notFound();

  const action = updateEventAction.bind(null, event.id);
  const takenSeats = event.signups.reduce((sum, signup) => sum + signup.passengers, 0);

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-24 pt-5 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-bus">Administration</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">Rediger begivenhed</h1>
          <p className="mt-2 text-sm text-slate-600">Ændringer bliver vist for tilmeldte borgere og den valgte chauffør.</p>
        </div>
        <Link href="/dashboard/admin/events" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          <ArrowLeft size={16} />
          Tilbage
        </Link>
      </div>

      <form action={action} className="grid gap-5 rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <FormMessage message={query.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="title">Navn</label>
            <input id="title" name="title" defaultValue={event.title} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="location">Sted</label>
            <input id="location" name="location" defaultValue={event.location} required />
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="description">Kort beskrivelse</label>
          <textarea id="description" name="description" rows={3} defaultValue={event.description} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid min-w-0 gap-2">
            <label htmlFor="bus">Bus</label>
            <select id="bus" name="bus" defaultValue={event.bus || "EAST"} required>
              {busOptions.map((bus) => <option key={bus} value={bus}>{busLabels[bus]}</option>)}
            </select>
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="date">Dato</label>
            <input id="date" name="date" type="date" defaultValue={event.eventDate.toISOString().slice(0, 10)} required />
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="startTime">Start</label>
            <input id="startTime" name="startTime" type="time" defaultValue={event.startTime} required />
          </div>
          <div className="grid min-w-0 gap-2">
            <label htmlFor="endTime">Slut</label>
            <input id="endTime" name="endTime" type="time" defaultValue={event.endTime} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <label htmlFor="capacity">Pladser</label>
            <input id="capacity" name="capacity" type="number" min={Math.max(1, takenSeats)} max="6" defaultValue={event.capacity} required />
            {takenSeats > 0 ? <p className="text-xs text-slate-500">{takenSeats} plads(er) er allerede tilmeldt.</p> : null}
          </div>
          <div className="grid gap-2">
            <label htmlFor="driverProfileId">Chauffør</label>
            <select id="driverProfileId" name="driverProfileId" defaultValue={event.driverProfileId ?? ""}>
              <option value="">Afklares senere</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.user.name}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={event.status}>
              <option value="OPEN">Åben</option>
              <option value="CLOSED">Lukket</option>
              <option value="CANCELLED">Aflyst</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="pickupInfo">Opsamling</label>
          <textarea id="pickupInfo" name="pickupInfo" rows={3} defaultValue={event.pickupInfo ?? ""} />
        </div>

        <button type="submit" className="h-14 gap-2 bg-bus text-base text-white hover:bg-bus/90">
          <Save size={18} />
          Gem ændringer
        </button>
      </form>
    </main>
  );
}
