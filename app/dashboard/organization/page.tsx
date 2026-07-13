import Link from "next/link";
import { Bus, CalendarClock, CalendarDays, Trash2, UserRound } from "lucide-react";
import { cancelOrganizationBookingAction, createOrganizationBookingAction } from "@/app/dashboard/organization/actions";
import { FormMessage } from "@/components/FormMessage";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

export default async function OrganizationDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["ORGANIZATION"]);

  const [drivers, bookings] = user.organizationProfile
    ? await Promise.all([
        prisma.driverProfile.findMany({
          where: { isActive: true },
          orderBy: { user: { name: "asc" } },
          include: { user: true }
        }),
        prisma.busBooking.findMany({
          where: { organizationProfileId: user.organizationProfile.id },
          orderBy: [{ bookingDate: "desc" }, { startTime: "desc" }],
          include: { driverProfile: { include: { user: true } } }
        })
      ])
    : [[], []];

  const nextBooking = bookings.find((booking) => booking.status !== "CANCELLED");

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Forening/institution</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hej {user.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Her kan I booke en frivilligbus, vælge chauffør og se jeres egne bookinger.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href="#ny-booking" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <Bus size={18} />
            Book bus
          </a>
          <Link href="/dashboard/organization/buses" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarDays size={18} />
            Buskalender
          </Link>
        </div>
      </section>

      {nextBooking ? (
        <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase text-bus">Næste booking</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">
                {nextBooking.bookingDate.toLocaleDateString("da-DK")} kl. {nextBooking.startTime}-{nextBooking.endTime}
              </h2>
            </div>
            <span className="rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">Bekræftet</span>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p className="flex items-center gap-2">
              <Bus className="text-bus" size={17} />
              {busLabels[(nextBooking.bus || "EAST") as BusName]}
            </p>
            <p className="flex items-center gap-2">
              <UserRound className="text-bus" size={17} />
              {nextBooking.driverProfile.user.name}
            </p>
          </div>
        </section>
      ) : null}

      <section id="ny-booking" className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-ink">Ny busbooking</h2>
          <p className="mt-1 text-sm text-slate-600">Vælg bus, tidspunkt og frivillig chauffør.</p>
        </div>
        <form action={createOrganizationBookingAction} className="grid gap-4">
          <FormMessage message={params.error} />
          {params.success ? (
            <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
              {params.success}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label htmlFor="driverProfileId">Frivillig chauffør</label>
              <select id="driverProfileId" name="driverProfileId" required>
                <option value="">Vælg chauffør</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="date">Dato</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="startTime">Start</label>
                <input id="startTime" name="startTime" type="time" required />
              </div>
              <div className="grid gap-2">
                <label htmlFor="endTime">Slut</label>
                <input id="endTime" name="endTime" type="time" required />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="purpose">Formål</label>
            <input id="purpose" name="purpose" placeholder="Fx aktivitet, udflugt eller arrangement" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="notes">Noter</label>
            <textarea id="notes" name="notes" rows={4} />
          </div>
          <button type="submit" className="h-14 bg-bus text-base text-white hover:bg-bus/90">
            Book bus
          </button>
        </form>
      </section>

      <section id="mine-bookinger" className="grid gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Mine bookinger</h2>
          <p className="text-sm text-slate-600">{bookings.length} booking(er)</p>
        </div>

        {bookings.map((booking) => (
          <article key={booking.id} className="rounded-[28px] border-2 border-fjord/20 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <CalendarClock size={16} />
                  {booking.bookingDate.toLocaleDateString("da-DK")} kl. {booking.startTime}-{booking.endTime}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-ink">{booking.purpose}</h3>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${booking.status === "CANCELLED" ? "bg-red-100 text-red-800" : "bg-fjord/25 text-ink"}`}>
                {booking.status === "CANCELLED" ? "Annulleret" : "Bekræftet"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Bus className="text-bus" size={17} />
                {busLabels[(booking.bus || "EAST") as BusName]}
              </p>
              <p className="flex items-center gap-2">
                <UserRound className="text-bus" size={17} />
                {booking.driverProfile.user.name}
              </p>
              {booking.notes ? <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-slate-700">Note: {booking.notes}</p> : null}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              {booking.status !== "CANCELLED" ? (
                <form action={cancelOrganizationBookingAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="w-full gap-2 border border-red-200 bg-white text-red-700 hover:bg-red-50 sm:w-fit">
                    <Trash2 size={16} />
                    Annuller
                  </button>
                </form>
              ) : (
                <span className="text-sm text-slate-400">Lukket</span>
              )}
            </div>
          </article>
        ))}

        {bookings.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center text-slate-500">
            <Bus className="mx-auto text-bus" size={34} />
            <h3 className="mt-3 text-xl font-extrabold text-ink">Ingen bookinger endnu</h3>
            <p className="mt-2 text-sm text-slate-600">Book jeres første tur ovenfor.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
