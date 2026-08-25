import Link from "next/link";
import { ArrowLeft, Bus, CalendarDays, MapPin, Trash2, UserRound, UsersRound } from "lucide-react";
import { createEventAction, deleteEventSignupAction, updateEventStatusAction } from "@/app/dashboard/admin/events/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

const eventStatusLabels: Record<string, string> = {
  OPEN: "Åben",
  CLOSED: "Lukket",
  CANCELLED: "Aflyst"
};

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  await requireUser(["ADMIN"]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minimumDate = today.toISOString().slice(0, 10);

  const [drivers, events] = await Promise.all([
    prisma.driverProfile.findMany({
      where: { isActive: true },
      orderBy: { user: { name: "asc" } },
      include: { user: true }
    }),
    prisma.event.findMany({
      where: { eventDate: { gte: today } },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      take: 50,
      include: {
        driverProfile: { include: { user: true } },
        signups: {
          orderBy: { createdAt: "asc" },
          include: {
            citizenProfile: { include: { user: true } }
          }
        }
      }
    })
  ]);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-white/75">Admin</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Begivenheder</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
              Opret fælles ture til arrangementer, reserver bus og følg tilmeldinger.
            </p>
          </div>
          <Link href="/dashboard/admin" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <ArrowLeft size={16} />
            Tilbage
          </Link>
        </div>
      </section>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
          {params.success}
        </p>
      ) : null}

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-ink">Ny begivenhed</h2>
          <p className="mt-1 text-sm text-slate-600">Vælg bus, tidspunkt, antal pladser og evt. chauffør.</p>
        </div>
        <form action={createEventAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="title">Navn</label>
              <input id="title" name="title" placeholder="Fx Kulturmødet Mors" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="location">Sted</label>
              <input id="location" name="location" placeholder="Fx Nykøbing Mors" required />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description">Kort beskrivelse</label>
            <textarea id="description" name="description" rows={3} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" min={minimumDate} required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="startTime">Start</label>
              <input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="endTime">Slut</label>
              <input id="endTime" name="endTime" type="time" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="capacity">Pladser</label>
              <input id="capacity" name="capacity" type="number" min="1" max="60" defaultValue="8" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="driverProfileId">Chauffør</label>
              <select id="driverProfileId" name="driverProfileId" defaultValue="">
                <option value="">Afklares senere</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="OPEN">
                <option value="OPEN">Åben</option>
                <option value="CLOSED">Lukket</option>
                <option value="CANCELLED">Aflyst</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="pickupInfo">Opsamling</label>
            <textarea id="pickupInfo" name="pickupInfo" rows={3} placeholder="Fx opsamling ved Frivilligcenter Lemvig kl. 09:00" />
          </div>
          <button type="submit" className="h-14 bg-bus text-base text-white hover:bg-bus/90">
            Opret begivenhed
          </button>
        </form>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Kommende begivenheder</h2>
          <p className="text-sm text-slate-600">{events.length} begivenhed(er)</p>
        </div>

        {events.map((event) => {
          const takenSeats = event.signups.reduce((sum, signup) => sum + signup.passengers, 0);

          return (
            <article key={event.id} className="rounded-[28px] border-2 border-fjord/20 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <CalendarDays size={16} />
                    {event.eventDate.toLocaleDateString("da-DK")} kl. {event.startTime}-{event.endTime}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-ink">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{event.description}</p>
                </div>
                <form action={updateEventStatusAction} className="grid min-w-40 gap-2">
                  <input type="hidden" name="eventId" value={event.id} />
                  <select name="status" defaultValue={event.status}>
                    <option value="OPEN">Åben</option>
                    <option value="CLOSED">Lukket</option>
                    <option value="CANCELLED">Aflyst</option>
                  </select>
                  <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                    Gem status
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <p className="flex items-center gap-2">
                  <MapPin className="text-bus" size={17} />
                  {event.location}
                </p>
                <p className="flex items-center gap-2">
                  <Bus className="text-bus" size={17} />
                  {busLabels[(event.bus || "EAST") as BusName]}
                </p>
                <p className="flex items-center gap-2">
                  <UsersRound className="text-bus" size={17} />
                  {takenSeats}/{event.capacity} pladser
                </p>
                <p className="flex items-center gap-2">
                  <UserRound className="text-bus" size={17} />
                  {event.driverProfile?.user.name ?? "Chauffør afklares"}
                </p>
              </div>

              {event.pickupInfo ? (
                <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-slate-700">{event.pickupInfo}</p>
              ) : null}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="font-extrabold text-ink">Tilmeldte</h4>
                <div className="mt-3 grid gap-2">
                  {event.signups.map((signup) => (
                    <div key={signup.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-cream/70 p-3 text-sm">
                      <div>
                        <p className="font-bold text-ink">{signup.citizenProfile.user.name}</p>
                        <p className="text-slate-600">
                          {signup.citizenProfile.user.email}
                          {signup.citizenProfile.phone ? ` · ${signup.citizenProfile.phone}` : ""}
                        </p>
                        <p className="mt-1 text-slate-700">
                          {signup.passengers} passager(er)
                          {signup.pickupAddress ? ` · ${signup.pickupAddress}` : ""}
                        </p>
                        {signup.notes ? <p className="mt-1 text-slate-500">Note: {signup.notes}</p> : null}
                      </div>
                      <form action={deleteEventSignupAction}>
                        <input type="hidden" name="signupId" value={signup.id} />
                        <button type="submit" className="gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                          <Trash2 size={15} />
                          Fjern
                        </button>
                      </form>
                    </div>
                  ))}
                  {event.signups.length === 0 ? <p className="text-sm text-slate-500">Ingen tilmeldte endnu.</p> : null}
                </div>
              </div>

              <p className="mt-4 w-fit rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">
                {eventStatusLabels[event.status] ?? event.status}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
