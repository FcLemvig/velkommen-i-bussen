import { Bus, CalendarClock, CheckCircle2, MapPin, Upload, UserRound } from "lucide-react";
import {
  claimShiftAction,
  completeRideAction,
  releaseShiftAction,
  updateDriverProfileImageAction
} from "@/app/dashboard/driver/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busLabels, BusName } from "@/lib/shifts";

export default async function DriverDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser(["DRIVER"]);

  const [assignments, myShifts, openShifts] = user.driverProfile
    ? await Promise.all([
        prisma.rideAssignment.findMany({
          where: { driverProfileId: user.driverProfile.id },
          orderBy: { rideRequest: { rideDate: "asc" } },
          include: {
            rideRequest: {
              include: {
                citizenProfile: { include: { user: true } }
              }
            }
          }
        }),
        prisma.driverShift.findMany({
          where: { driverProfileId: user.driverProfile.id },
          orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }]
        }),
        prisma.driverShift.findMany({
          where: { driverProfileId: null },
          orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }]
        })
      ])
    : [[], [], []];

  const nextRide = assignments.find(({ rideRequest }) => rideRequest.status !== "COMPLETED")?.rideRequest;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Chauffør</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Hej {user.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Her kan du se dine ture, tage ledige vagter og markere en tur som gennemført.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href="#mine-ture" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <MapPin size={18} />
            Mine ture
          </a>
          <a href="#vagter" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarClock size={18} />
            Vagter
          </a>
        </div>
      </section>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-2xl border border-fjord/30 bg-fjord/10 px-4 py-3 text-sm font-semibold text-ink">
          {params.success}
        </p>
      ) : null}

      {nextRide ? (
        <section className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase text-bus">Næste tur</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">
                {nextRide.rideDate.toLocaleDateString("da-DK")} kl. {nextRide.rideTime}
              </h2>
            </div>
            <StatusBadge status={nextRide.status} />
          </div>
          <p className="mt-4 flex gap-2 text-sm text-slate-700">
            <MapPin className="mt-0.5 shrink-0 text-bus" size={17} />
            <span>
              <strong className="text-ink">{nextRide.pickupAddress}</strong>
              <span className="block">til {nextRide.destinationAddress}</span>
            </span>
          </p>
        </section>
      ) : null}

      <section className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          {user.driverProfile?.imageUrl ? (
            <img src={user.driverProfile.imageUrl} alt={user.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bus text-2xl font-bold text-ink">
              {user.name.slice(0, 1)}
            </div>
          )}
          <form action={updateDriverProfileImageAction} className="grid flex-1 gap-3 sm:max-w-md">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Profilbillede</h2>
              <p className="mt-1 text-sm text-slate-600">Billedet vises for borgere, når du er tildelt deres tur.</p>
            </div>
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp" required />
            <button type="submit" className="w-full gap-2 bg-bus text-white hover:bg-bus/90 sm:w-fit">
              <Upload size={16} />
              Gem billede
            </button>
          </form>
        </div>
      </section>

      <section id="vagter" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-ink">Mine vagter</h2>
          <div className="mt-4 grid gap-3">
            {myShifts.map((shift) => (
              <article key={shift.id} className="rounded-2xl border border-slate-100 bg-cream/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-ink">{shift.shiftDate.toLocaleDateString("da-DK")}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {busLabels[(shift.bus || "EAST") as BusName]} · {shift.startTime} - {shift.endTime}
                    </div>
                    {shift.notes ? <div className="mt-1 text-sm text-slate-500">{shift.notes}</div> : null}
                  </div>
                  <form action={releaseShiftAction}>
                    <input type="hidden" name="shiftId" value={shift.id} />
                    <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                      Frigiv
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {myShifts.length === 0 ? <p className="text-sm text-slate-500">Du har ikke taget nogen vagter endnu.</p> : null}
          </div>
        </div>

        <div className="rounded-[32px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-ink">Ledige vagter</h2>
          <div className="mt-4 grid gap-3">
            {openShifts.map((shift) => (
              <article key={shift.id} className="rounded-2xl border border-bus/20 bg-bus/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-ink">{shift.shiftDate.toLocaleDateString("da-DK")}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {busLabels[(shift.bus || "EAST") as BusName]} · {shift.startTime} - {shift.endTime}
                    </div>
                    {shift.notes ? <div className="mt-1 text-sm text-slate-500">{shift.notes}</div> : null}
                  </div>
                  <form action={claimShiftAction}>
                    <input type="hidden" name="shiftId" value={shift.id} />
                    <button type="submit" className="bg-bus text-white hover:bg-bus/90">
                      Tag vagt
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {openShifts.length === 0 ? <p className="text-sm text-slate-500">Der er ingen ledige vagter lige nu.</p> : null}
          </div>
        </div>
      </section>

      <section id="mine-ture" className="grid gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Mine tildelte ture</h2>
          <p className="text-sm text-slate-600">{assignments.length} tur(e)</p>
        </div>
        {assignments.map(({ rideRequest }) => (
          <article key={rideRequest.id} className="rounded-[28px] border-2 border-fjord/25 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <CalendarClock size={16} />
                  {rideRequest.rideDate.toLocaleDateString("da-DK")} kl. {rideRequest.rideTime}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-ink">{rideRequest.purpose}</h3>
              </div>
              <StatusBadge status={rideRequest.status} />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <p className="flex gap-2">
                <MapPin className="mt-0.5 shrink-0 text-bus" size={17} />
                <span>
                  <strong className="text-ink">{rideRequest.pickupAddress}</strong>
                  <span className="block">til {rideRequest.destinationAddress}</span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <UserRound className="text-bus" size={17} />
                {rideRequest.citizenProfile.user.name} · {rideRequest.passengers} passager(er)
              </p>
            </div>

            {rideRequest.notes ? <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-slate-700">Note: {rideRequest.notes}</p> : null}
            {rideRequest.includesMinors ? (
              <p className="mt-4 rounded-2xl bg-bus/15 px-4 py-3 text-sm text-brown">
                Børn/unge på turen. Forældresamtykke er {rideRequest.parentalConsent ? "bekræftet" : "ikke bekræftet"}.
              </p>
            ) : null}

            {rideRequest.status !== "COMPLETED" ? (
              <form action={completeRideAction} className="mt-5">
                <input type="hidden" name="rideRequestId" value={rideRequest.id} />
                <button type="submit" className="h-12 w-full gap-2 bg-bus text-white hover:bg-bus/90 sm:w-fit">
                  <CheckCircle2 size={17} />
                  Markér som gennemført
                </button>
              </form>
            ) : (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-fjord/20 px-4 py-2 text-sm font-bold text-ink">
                <CheckCircle2 size={16} />
                Turen er gennemført
              </p>
            )}
          </article>
        ))}
        {assignments.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center text-slate-500">
            <Bus className="mx-auto text-bus" size={34} />
            <h3 className="mt-3 text-xl font-extrabold text-ink">Ingen ture lige nu</h3>
            <p className="mt-2 text-sm text-slate-600">Når admin tildeler dig en tur, vises den her.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
