import Link from "next/link";
import { BusFront, CalendarClock, MapPin, Plus, SlidersHorizontal, Users } from "lucide-react";
import { assignDriverAction, updateRideStatusAction } from "@/app/dashboard/admin/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { RideStatus, isRideStatus, rideStatuses } from "@/lib/domain";
import { rideStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { busLabels, BusName, isRideWithinShift } from "@/lib/shifts";

function shiftSummary(
  shifts: Array<{
    bus: string;
    startTime: string;
    endTime: string;
    driverProfile: { user: { name: string } } | null;
  }>
) {
  return shifts
    .map((shift) =>
      shift.driverProfile
        ? `${busLabels[(shift.bus || "EAST") as BusName]}: ${shift.driverProfile.user.name} ${shift.startTime}-${shift.endTime}`
        : `${busLabels[(shift.bus || "EAST") as BusName]}: ledig ${shift.startTime}-${shift.endTime}`
    )
    .join(", ");
}

export default async function AdminDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ status?: RideStatus; error?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;
  const selectedStatus = params.status && isRideStatus(params.status) ? params.status : undefined;

  const [rides, drivers, shifts] = await Promise.all([
    prisma.rideRequest.findMany({
      where: selectedStatus ? { status: selectedStatus } : {},
      orderBy: [{ rideDate: "asc" }, { rideTime: "asc" }],
      include: {
        citizenProfile: { include: { user: true } },
        assignment: { include: { driverProfile: { include: { user: true } } } }
      }
    }),
    prisma.driverProfile.findMany({
      where: { isActive: true },
      orderBy: { user: { name: "asc" } },
      include: { user: true }
    }),
    prisma.driverShift.findMany({
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
      include: { driverProfile: { include: { user: true } } }
    })
  ]);

  const pendingCount = rides.filter((ride) => ride.status === "PENDING").length;
  const assignedCount = rides.filter((ride) => ride.assignment).length;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-5 md:py-8">
      <section className="rounded-[32px] bg-ink px-5 py-6 text-white shadow-xl shadow-ink/10 md:px-8">
        <p className="text-sm font-bold uppercase text-white/75">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Planlæg ture</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Tildel chauffører, følg status og se hvor der mangler vagter.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Link href="/dashboard/admin/buses" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <BusFront size={18} />
            Buskalender
          </Link>
          <Link href="/dashboard/admin/shifts" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <CalendarClock size={18} />
            Vagter
          </Link>
          <Link href="/dashboard/admin/citizens" className="button gap-2 bg-white/12 text-white ring-1 ring-white/25 hover:bg-white/20">
            <Users size={18} />
            Borgere
          </Link>
          <Link href="/dashboard/admin/drivers" className="button gap-2 bg-bus text-white hover:bg-bus/90">
            <Plus size={18} />
            Chauffører
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] border-2 border-fjord/20 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Viste ture</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{rides.length}</p>
        </div>
        <div className="rounded-[24px] border-2 border-bus/20 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Afventer</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{pendingCount}</p>
        </div>
        <div className="rounded-[24px] border-2 border-fjord/20 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Tildelt chauffør</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{assignedCount}</p>
        </div>
      </section>

      <FormMessage message={params.error} />

      <form className="grid gap-3 rounded-[28px] border-2 border-fjord/25 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="grid gap-2">
          <label htmlFor="status" className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Filtrer efter status
          </label>
          <select id="status" name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">Alle statusser</option>
            {rideStatuses.map((status) => (
              <option key={status} value={status}>
                {rideStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
          Filtrer
        </button>
        <Link href="/dashboard/admin" className="button text-slate-700 hover:bg-slate-100">
          Nulstil
        </Link>
      </form>

      <section className="grid gap-4 md:hidden">
        {rides.map((ride) => {
          const rideDate = ride.rideDate.toDateString();
          const matchingShifts = shifts.filter(
            (shift) =>
              shift.shiftDate.toDateString() === rideDate &&
              isRideWithinShift(ride.rideTime, shift.startTime, shift.endTime)
          );
          const coveredShifts = matchingShifts.filter((shift) => shift.driverProfile);

          return (
            <article key={ride.id} className="rounded-[28px] border-2 border-fjord/20 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    {ride.rideDate.toLocaleDateString("da-DK")} kl. {ride.rideTime}
                  </p>
                  <h2 className="mt-2 text-lg font-extrabold text-ink">{ride.citizenProfile.user.name}</h2>
                  <p className="text-sm text-slate-600">{ride.passengers} passager(er)</p>
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
                <p>
                  <strong className="text-ink">Formål:</strong> {ride.purpose}
                </p>
                {coveredShifts.length > 0 ? (
                  <span className="w-fit rounded-full bg-fjord/25 px-3 py-1.5 text-xs font-bold text-ink">
                    {coveredShifts.length} matchende vagt(er)
                  </span>
                ) : (
                  <span className="w-fit rounded-full bg-bus/20 px-3 py-1.5 text-xs font-bold text-brown">Mangler vagt</span>
                )}
                {matchingShifts.length > 0 ? (
                  <div className="rounded-2xl bg-fjord/15 px-3 py-2 text-xs text-ink">
                    Matchende vagter: {shiftSummary(matchingShifts)}
                  </div>
                ) : null}
                {ride.includesMinors ? (
                  <div className="rounded-2xl bg-bus/15 px-3 py-2 text-xs text-brown">
                    Børn/unge: {ride.parentalConsent ? "forældresamtykke bekræftet" : "mangler samtykke"}
                    {ride.guardianName || ride.guardianPhone ? (
                      <span>
                        {" "}
                        ({ride.guardianName || "navn mangler"}
                        {ride.guardianPhone ? `, ${ride.guardianPhone}` : ""})
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {ride.notes ? <div className="text-slate-500">Note: {ride.notes}</div> : null}
              </div>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4">
                <form action={assignDriverAction} className="grid gap-2">
                  <input type="hidden" name="rideRequestId" value={ride.id} />
                  <label htmlFor={`driver-${ride.id}`}>Chauffør</label>
                  <select id={`driver-${ride.id}`} name="driverProfileId" defaultValue={ride.assignment?.driverProfileId ?? ""}>
                    <option value="">Vælg chauffør</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.user.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="bg-ink text-white hover:bg-brown">
                    Tildel
                  </button>
                </form>
                <form action={updateRideStatusAction} className="grid gap-2">
                  <input type="hidden" name="rideRequestId" value={ride.id} />
                  <label htmlFor={`status-${ride.id}`}>Status</label>
                  <select id={`status-${ride.id}`} name="status" defaultValue={ride.status}>
                    {rideStatuses.map((status) => (
                      <option key={status} value={status}>
                        {rideStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                    Gem status
                  </button>
                </form>
              </div>
            </article>
          );
        })}
        {rides.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-fjord/25 bg-white p-8 text-center text-slate-500">
            Ingen kørselsanmodninger matcher filteret.
          </div>
        ) : null}
      </section>

      <section className="hidden overflow-x-auto rounded-[32px] border-2 border-fjord/25 bg-white shadow-sm md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Dato</th>
              <th className="px-4 py-3">Borger</th>
              <th className="px-4 py-3">Tur</th>
              <th className="px-4 py-3">Formål</th>
              <th className="px-4 py-3">Chauffør</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rides.map((ride) => {
              const rideDate = ride.rideDate.toDateString();
              const matchingShifts = shifts.filter(
                (shift) =>
                  shift.shiftDate.toDateString() === rideDate &&
                  isRideWithinShift(ride.rideTime, shift.startTime, shift.endTime)
              );
              const coveredShifts = matchingShifts.filter((shift) => shift.driverProfile);

              return (
                <tr key={ride.id} className="align-top">
                  <td className="px-4 py-3">
                    {ride.rideDate.toLocaleDateString("da-DK")} kl. {ride.rideTime}
                    <div className="mt-2 text-xs">
                      {coveredShifts.length > 0 ? (
                        <span className="rounded-full bg-fjord/25 px-3 py-1.5 font-bold text-ink">
                          {coveredShifts.length} matchende vagt(er)
                        </span>
                      ) : (
                        <span className="rounded-full bg-bus/20 px-3 py-1.5 font-bold text-brown">Mangler vagt</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{ride.citizenProfile.user.name}</div>
                    <div className="text-slate-500">{ride.passengers} passager(er)</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{ride.pickupAddress}</div>
                    <div className="text-slate-600">til {ride.destinationAddress}</div>
                    {ride.includesMinors ? (
                      <div className="mt-2 rounded-2xl bg-bus/15 px-3 py-2 text-xs text-brown">
                        Børn/unge: {ride.parentalConsent ? "forældresamtykke bekræftet" : "mangler samtykke"}
                      </div>
                    ) : null}
                    {matchingShifts.length > 0 ? (
                      <div className="mt-2 rounded-2xl bg-fjord/15 px-3 py-2 text-xs text-ink">
                        Matchende vagter: {shiftSummary(matchingShifts)}
                      </div>
                    ) : null}
                    {ride.notes ? <div className="mt-1 text-slate-500">Note: {ride.notes}</div> : null}
                  </td>
                  <td className="px-4 py-3">{ride.purpose}</td>
                  <td className="px-4 py-3">
                    <form action={assignDriverAction} className="grid gap-2">
                      <input type="hidden" name="rideRequestId" value={ride.id} />
                      <select name="driverProfileId" defaultValue={ride.assignment?.driverProfileId ?? ""}>
                        <option value="">Vælg chauffør</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.user.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="bg-ink text-white hover:bg-brown">
                        Tildel
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ride.status} />
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateRideStatusAction} className="grid gap-2">
                      <input type="hidden" name="rideRequestId" value={ride.id} />
                      <select name="status" defaultValue={ride.status}>
                        {rideStatuses.map((status) => (
                          <option key={status} value={status}>
                            {rideStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="border-2 border-fjord/30 bg-white text-ink hover:bg-cream">
                        Gem status
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {rides.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Ingen kørselsanmodninger matcher filteret.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
