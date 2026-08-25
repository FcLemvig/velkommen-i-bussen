import Link from "next/link";
import { ArrowLeft, Bus, CalendarDays, ChevronDown, MapPin, Trash2, UserRound, UsersRound } from "lucide-react";
import { cancelEventSignupAction, signupForEventAction } from "@/app/dashboard/citizen/events/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { departureTownFromSharingTitle } from "@/lib/ride-sharing";
import { busLabels, BusName } from "@/lib/shifts";

const eventStatusLabels: Record<string, string> = {
  OPEN: "Åben",
  CLOSED: "Lukket",
  CANCELLED: "Aflyst"
};

export default async function CitizenEventsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["CITIZEN"]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await prisma.event.findMany({
    where: {
      eventDate: { gte: today },
      status: { not: "CANCELLED" }
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    take: 40,
    include: {
      driverProfile: { include: { user: true } },
      signups: {
        include: {
          citizenProfile: true
        }
      }
    }
  });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-white/75">Begivenheder</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hop med på fælles ture</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
              Her kan du tilmelde dig fælles kørsel til arrangementer og aktiviteter.
            </p>
          </div>
          <Link href="/dashboard/citizen" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
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

      <section className="grid gap-4">
        {events.map((event) => {
          const takenSeats = event.signups.reduce((sum, signup) => sum + signup.passengers, 0);
          const remainingSeats = Math.max(event.capacity - takenSeats, 0);
          const mySignup = event.signups.find((signup) => signup.citizenProfileId === user.citizenProfile?.id);
          const canSignup = event.status === "OPEN" && remainingSeats > 0 && !mySignup;
          const departureTown = event.sourceRideRequestId ? departureTownFromSharingTitle(event.title) : null;

          return (
            <details key={event.id} className="group overflow-hidden rounded-[28px] border-2 border-fjord/20 bg-white shadow-sm">
              <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:content-none">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <CalendarDays size={16} />
                    {event.eventDate.toLocaleDateString("da-DK")}
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold text-ink">{event.title}</h2>
                  <p className="mt-1 text-sm font-bold text-brown">
                    {departureTown ? `Afgang fra ${departureTown} kl. ${event.startTime}` : `Kl. ${event.startTime}-${event.endTime}`}
                  </p>
                </div>
                <ChevronDown className="shrink-0 text-bus transition-transform group-open:rotate-180" size={24} />
              </summary>

              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-2xl text-sm leading-6 text-slate-700">{event.description}</p>
                  <span className="rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">
                    {eventStatusLabels[event.status] ?? event.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
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
                  {remainingSeats} ledige plads(er)
                </p>
                <p className="flex items-center gap-2">
                  <UserRound className="text-bus" size={17} />
                  {event.driverProfile?.user.name ?? "Chauffør afklares"}
                </p>
                </div>

                {event.pickupInfo ? (
                  <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-slate-700">
                    <strong className="text-ink">Afgang og opsamling:</strong> {event.pickupInfo}
                  </p>
                ) : null}

                {mySignup ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="rounded-full bg-fjord/25 px-4 py-2 text-sm font-bold text-ink">
                    Du er tilmeldt med {mySignup.passengers} passager(er)
                  </p>
                  <form action={cancelEventSignupAction}>
                    <input type="hidden" name="signupId" value={mySignup.id} />
                    <button type="submit" className="gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                      <Trash2 size={16} />
                      Frameld
                    </button>
                  </form>
                </div>
              ) : canSignup ? (
                <form action={signupForEventAction} className="mt-5 grid gap-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="grid max-w-44 gap-2">
                    <label htmlFor={`passengers-${event.id}`}>Antal passagerer</label>
                    <input id={`passengers-${event.id}`} name="passengers" type="number" min="1" max="6" defaultValue="1" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor={`notes-${event.id}`}>Note til chaufføren</label>
                    <textarea
                      id={`notes-${event.id}`}
                      name="notes"
                      rows={3}
                      placeholder="Skriv kun her, hvis du fx ønsker opsamling et sted på ruten."
                    />
                  </div>
                  <button type="submit" className="h-12 w-full bg-bus text-white hover:bg-bus/90 sm:w-fit">
                    Hop på
                  </button>
                </form>
              ) : (
                <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-slate-700">
                  Tilmelding er lukket eller fuldt booket.
                </p>
                )}
              </div>
            </details>
          );
        })}

        {events.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center">
            <CalendarDays className="mx-auto text-bus" size={34} />
            <h2 className="mt-3 text-xl font-extrabold text-ink">Ingen begivenheder lige nu</h2>
            <p className="mt-2 text-sm text-slate-600">Når der er fælles ture, vises de her.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
