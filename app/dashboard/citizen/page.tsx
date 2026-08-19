import Link from "next/link";
import { Bell, CalendarClock, CalendarPlus, MapPin, MessageSquare, Navigation, Trash2, UsersRound } from "lucide-react";
import { createRideRequestAction, deleteRideRequestAction, sendCitizenRideMessageAction } from "@/app/dashboard/citizen/actions";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { isMembershipActive } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export default async function CitizenDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["CITIZEN"]);
  const [rides, latestNotifications] = user.citizenProfile
    ? await Promise.all([
        prisma.rideRequest.findMany({
          where: { citizenProfileId: user.citizenProfile.id },
          orderBy: [{ rideDate: "desc" }, { rideTime: "desc" }],
          take: 40,
          include: { assignment: { include: { driverProfile: { include: { user: true } } } } }
        }),
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3
        })
      ])
    : [[], []];

  const nextRide = rides.find((ride) => !["COMPLETED", "CANCELLED"].includes(ride.status));
  const hasActiveMembership = isMembershipActive(user.membership);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Min side</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hej {user.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Her kan du oprette en tur, følge status og se hvem der kører, når turen er tildelt.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <a href="#ny-tur" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <Navigation size={18} />
            Opret tur
          </a>
          <Link href="/dashboard/citizen/events" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarPlus size={18} />
            Begivenheder
          </Link>
          <a href="#mine-ture" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarClock size={18} />
            Mine ture
          </a>
          <Link href="/dashboard/notifications" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <Bell size={18} />
            Beskeder
          </Link>
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

      <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase text-bus">
              <Bell size={16} />
              Seneste beskeder
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-ink">Beskeder fra chauffør og kontor</h2>
          </div>
          <Link href="/dashboard/notifications" className="button gap-2 border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
            <Bell size={16} />
            Alle beskeder
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {latestNotifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-2xl border px-4 py-3 ${
                notification.readAt ? "border-fjord/15 bg-cream/60" : "border-bus/30 bg-bus/10"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-ink">{notification.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{notification.body}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {notification.createdAt.toLocaleDateString("da-DK")} kl.{" "}
                    {notification.createdAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!notification.readAt ? <span className="rounded-full bg-bus px-2.5 py-1 text-xs font-bold text-white">Ny</span> : null}
              </div>
            </article>
          ))}
          {latestNotifications.length === 0 ? (
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-slate-600">Du har ingen beskeder endnu.</p>
          ) : null}
        </div>
      </section>

      {!hasActiveMembership ? (
        <section className="rounded-[28px] border-2 border-bus/30 bg-bus/10 p-5 text-ink shadow-sm">
          <h2 className="text-xl font-extrabold">Medlemskab afventer betaling</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Du kan godt sende en turanmodning, men kontoret kan først godkende og planlægge turen, når medlemskabet er betalt og registreret.
          </p>
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
          <AddressAutocompleteInput
            id="pickupAddress"
            name="pickupAddress"
            label="Afhentningsadresse"
            autoComplete="street-address"
            initialValue={user.citizenProfile?.address ?? ""}
            required
          />
          <AddressAutocompleteInput
            id="destinationAddress"
            name="destinationAddress"
            label="Destinationsadresse"
            required
          />
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

            {ride.assignment?.driverProfile && ride.status !== "COMPLETED" && ride.status !== "CANCELLED" ? (
              <form action={sendCitizenRideMessageAction} className="mt-4 grid gap-3 rounded-2xl border-2 border-fjord/20 bg-cream/60 p-4">
                <input type="hidden" name="rideRequestId" value={ride.id} />
                <div>
                  <label htmlFor={`citizen-message-${ride.id}`} className="flex items-center gap-2 text-ink">
                    <MessageSquare size={16} />
                    Svar chaufføren
                  </label>
                  <p className="mt-1 text-xs font-normal text-slate-600">
                    Skriv fx hvor du eller barnet skal hentes.
                  </p>
                </div>
                <textarea
                  id={`citizen-message-${ride.id}`}
                  name="message"
                  rows={3}
                  maxLength={500}
                  placeholder="Fx Barnet hentes ved hovedindgangen."
                  required
                />
                <button type="submit" className="w-full gap-2 bg-ink text-white hover:bg-brown sm:w-fit">
                  <MessageSquare size={16} />
                  Send svar
                </button>
              </form>
            ) : null}
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
