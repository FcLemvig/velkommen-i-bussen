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

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Chaufførdashboard</h1>
        <p className="mt-2 text-slate-600">Velkommen, {user.name}. Her er de ture, du er tildelt.</p>
      </div>

      <FormMessage message={params.error} />
      {params.success ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {params.success}
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
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
              <h2 className="text-lg font-semibold text-ink">Profilbillede</h2>
              <p className="mt-1 text-sm text-slate-600">Billedet vises for borgere, når du er tildelt deres tur.</p>
            </div>
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp" required />
            <button type="submit" className="w-fit bg-fjord text-white hover:bg-fjord/90">
              Gem profilbillede
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">Mine vagter</h2>
          <div className="mt-4 grid gap-3">
            {myShifts.map((shift) => (
              <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <div>
                  <div className="font-medium text-ink">{shift.shiftDate.toLocaleDateString("da-DK")}</div>
                  <div className="text-sm text-slate-600">
                    {shift.startTime} - {shift.endTime}
                    {shift.notes ? ` · ${shift.notes}` : ""}
                  </div>
                </div>
                <form action={releaseShiftAction}>
                  <input type="hidden" name="shiftId" value={shift.id} />
                  <button type="submit" className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                    Frigiv
                  </button>
                </form>
              </div>
            ))}
            {myShifts.length === 0 ? <p className="text-sm text-slate-500">Du har ikke taget nogen vagter endnu.</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">Ledige vagter</h2>
          <div className="mt-4 grid gap-3">
            {openShifts.map((shift) => (
              <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <div>
                  <div className="font-medium text-ink">{shift.shiftDate.toLocaleDateString("da-DK")}</div>
                  <div className="text-sm text-slate-600">
                    {shift.startTime} - {shift.endTime}
                    {shift.notes ? ` · ${shift.notes}` : ""}
                  </div>
                </div>
                <form action={claimShiftAction}>
                  <input type="hidden" name="shiftId" value={shift.id} />
                  <button type="submit" className="bg-fjord text-white hover:bg-fjord/90">
                    Tag vagt
                  </button>
                </form>
              </div>
            ))}
            {openShifts.length === 0 ? <p className="text-sm text-slate-500">Der er ingen ledige vagter lige nu.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold text-ink">Mine tildelte ture</h2>
        {assignments.map(({ rideRequest }) => (
          <article key={rideRequest.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">
                  {rideRequest.rideDate.toLocaleDateString("da-DK")} kl. {rideRequest.rideTime}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-ink">
                  {rideRequest.pickupAddress} til {rideRequest.destinationAddress}
                </h2>
              </div>
              <StatusBadge status={rideRequest.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-700">Borger</dt>
                <dd className="text-slate-600">{rideRequest.citizenProfile.user.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Passagerer</dt>
                <dd className="text-slate-600">{rideRequest.passengers}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Formål</dt>
                <dd className="text-slate-600">{rideRequest.purpose}</dd>
              </div>
            </dl>
            {rideRequest.notes ? <p className="mt-4 text-sm text-slate-600">Note: {rideRequest.notes}</p> : null}
            {rideRequest.includesMinors ? (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Børn/unge på turen. Forældresamtykke er {rideRequest.parentalConsent ? "bekræftet" : "ikke bekræftet"}.
              </p>
            ) : null}
            {rideRequest.status !== "COMPLETED" ? (
              <form action={completeRideAction} className="mt-5">
                <input type="hidden" name="rideRequestId" value={rideRequest.id} />
                <button type="submit" className="bg-fjord text-white hover:bg-fjord/90">
                  Markér som gennemført
                </button>
              </form>
            ) : null}
          </article>
        ))}
        {assignments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            Du har ingen tildelte ture lige nu.
          </div>
        ) : null}
      </section>
    </main>
  );
}
