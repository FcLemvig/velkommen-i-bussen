import { CalendarClock, MapPin, Navigation, Trash2, UsersRound } from "lucide-react";
import { createRideRequestAction, deleteRideRequestAction } from "@/app/dashboard/citizen/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CitizenDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["CITIZEN"]);
  const rides = user.citizenProfile
    ? await prisma.rideRequest.findMany({
        where: { citizenProfileId: user.citizenProfile.id },
        orderBy: [{ rideDate: "desc" }, { rideTime: "desc" }],
        include: { assignment: { include: { driverProfile: { include: { user: true } } } } }
      })
    : [];

  const nextRide = rides.find((ride) => !["COMPLETED", "CANCELLED"].includes(ride.status));

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Min side</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hej {user.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Her kan du oprette en tur, følge status og se hvem der kører, når turen er tildelt.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href="#ny-tur" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <Navigation size={18} />
            Opret tur
          </a>
          <a href="#mine-ture" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarClock size={18} />
            Mine ture
          </a>
        </div>
      </section>

      {nextRide ? (
        <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase text-bus">Næste aktive tur</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">
                {nextRide.rideDate.toLocaleDateString("da-DK")} kl. {nextRide.rideTime}
              </h2>
            </div>
            <StatusBadge status={nextRide.status} />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p className="flex gap-2">
              <MapPin className="mt-0.5 shrink-0 text-bus" size={17} />
              <span>
                <strong className="text-ink">{nextRide.pickupAddress}</strong>
                <span className="block">til {nextRide.destinationAddress}</span>
              </span>
            </p>
          </div>
        </section>
      ) : null}

      <section id="ny-tur" className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-ink">Ny tur</h2>
          <p className="mt-1 text-sm text-slate-600">Udfyld oplysningerne, så kontoret kan planlægge turen.</p>
        </div>
        <form action={createRideRequestAction} className="grid gap-4">
          <FormMessage message={params.error} />
          {params.success ? (
            <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
              {params.success}
            </p>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="pickupAddress">Afhentningsadresse</label>
            <input id="pickupAddress" name="pickupAddress" autoComplete="street-address" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="destinationAddress">Destinationsadresse</label>
            <input id="destinationAddress" name="destinationAddress" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="time">Tidspunkt</label>
              <input id="time" name="time" type="time" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="passengers">Antal passagerer</label>
              <input id="passengers" name="passengers" type="number" min="1" max="8" defaultValue="1" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="purpose">Formål</label>
              <input id="purpose" name="purpose" placeholder="Fx læge, indkøb eller aktivitet" required />
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border-2 border-fjord/30 bg-cream p-4">
            <label className="flex items-start gap-3">
              <input className="mt-1 h-4 w-4" type="checkbox" name="includesMinors" />
              <span>
                Turen gælder børn eller unge
                <span className="block text-xs font-normal text-slate-600">
                  Ved kørsel med børn og unge skal forælder eller værge have givet samtykke.
                </span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="guardianName">Forælder/værge</label>
                <input id="guardianName" name="guardianName" placeholder="Navn" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="guardianPhone">Telefon til forælder/værge</label>
                <input id="guardianPhone" name="guardianPhone" type="tel" inputMode="tel" />
              </div>
            </div>
            <label className="flex items-start gap-3">
              <input className="mt-1 h-4 w-4" type="checkbox" name="parentalConsent" />
              <span>Forælder/værge har godkendt kørslen</span>
            </label>
          </div>
          <div className="grid gap-2">
            <label htmlFor="notes">Noter</label>
            <textarea id="notes" name="notes" rows={4} />
          </div>
          <button type="submit" className="h-14 bg-bus text-base text-white hover:bg-bus/90">
            Send anmodning
          </button>
        </form>
      </section>

      <section id="mine-ture" className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Mine ture</h2>
            <p className="text-sm text-slate-600">{rides.length} tur(e)</p>
          </div>
        </div>

        {rides.map((ride) => (
          <article key={ride.id} className="rounded-[28px] border-2 border-fjord/20 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <CalendarClock size={16} />
                  {ride.rideDate.toLocaleDateString("da-DK")} kl. {ride.rideTime}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-ink">{ride.purpose}</h3>
              </div>
              <StatusBadge status={ride.status} />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <p className="flex gap-2">
                <MapPin className="mt-0.5 shrink-0 text-bus" size={17} />
                <span>
                  <strong className="text-ink">{ride.pickupAddress}</strong>
                  <span className="block">til {ride.destinationAddress}</span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <UsersRound className="text-bus" size={17} />
                {ride.passengers} passager(er)
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              {ride.assignment?.driverProfile ? (
                <div className="flex items-center gap-3">
                  {ride.assignment.driverProfile.imageUrl ? (
                    <img
                      src={ride.assignment.driverProfile.imageUrl}
                      alt={ride.assignment.driverProfile.user.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bus text-sm font-bold text-ink">
                      {ride.assignment.driverProfile.user.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Chauffør</p>
                    <p className="font-bold text-ink">{ride.assignment.driverProfile.user.name}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-500">Chauffør ikke tildelt endnu</p>
              )}

              {ride.status !== "COMPLETED" ? (
                <form action={deleteRideRequestAction}>
                  <input type="hidden" name="rideRequestId" value={ride.id} />
                  <button type="submit" className="gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50">
                    <Trash2 size={16} />
                    Slet
                  </button>
                </form>
              ) : (
                <span className="text-sm text-slate-400">Låst</span>
              )}
            </div>
          </article>
        ))}

        {rides.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center">
            <CalendarClock className="mx-auto text-bus" size={34} />
            <h3 className="mt-3 text-xl font-extrabold text-ink">Ingen ture endnu</h3>
            <p className="mt-2 text-sm text-slate-600">Opret din første tur ovenfor.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
