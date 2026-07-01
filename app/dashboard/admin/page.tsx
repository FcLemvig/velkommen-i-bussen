import Link from "next/link";
import { CalendarClock, Plus, Users } from "lucide-react";
import { assignDriverAction, updateRideStatusAction } from "@/app/dashboard/admin/actions";
import { FormMessage } from "@/components/FormMessage";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { RideStatus, isRideStatus, rideStatuses } from "@/lib/domain";
import { rideStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { isRideWithinShift } from "@/lib/shifts";

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

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Admindashboard</h1>
          <p className="mt-2 text-slate-600">Planlæg ture, tildel chauffører og opdater status.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/admin/shifts" className="button gap-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
            <CalendarClock size={16} />
            Vagter
          </Link>
          <Link href="/dashboard/admin/citizens" className="button gap-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
            <Users size={16} />
            Borgere
          </Link>
          <Link href="/dashboard/admin/drivers" className="button gap-2 bg-fjord text-white hover:bg-fjord/90">
            <Plus size={16} />
            Chauffører
          </Link>
        </div>
      </div>

      <FormMessage message={params.error} />

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid min-w-56 gap-2">
          <label htmlFor="status">Filtrer efter status</label>
          <select id="status" name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">Alle statusser</option>
            {rideStatuses.map((status) => (
              <option key={status} value={status}>
                {rideStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
          Filtrer
        </button>
        <Link href="/dashboard/admin" className="button text-slate-700 hover:bg-slate-100">
          Nulstil
        </Link>
      </form>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                        <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-900">
                          {coveredShifts.length} matchende vagt(er)
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900">
                          Mangler vagt
                        </span>
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
                      <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
                    {matchingShifts.length > 0 ? (
                      <div className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-900">
                        Matchende vagter:{" "}
                        {matchingShifts
                          .map((shift) =>
                            shift.driverProfile
                              ? `${shift.driverProfile.user.name} ${shift.startTime}-${shift.endTime}`
                              : `ledig ${shift.startTime}-${shift.endTime}`
                          )
                          .join(", ")}
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
                      <button type="submit" className="bg-slate-900 text-white hover:bg-slate-700">
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
                      <button type="submit" className="border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
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
