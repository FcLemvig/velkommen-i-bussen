import { prisma } from "@/lib/prisma";
import { shiftsOverlap } from "@/lib/shifts";

export async function driverIsUnavailable(
  driverProfileId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string,
  excludeRideId?: string,
) {
  const start = new Date(date.toISOString().slice(0, 10) + "T00:00:00Z");
  const end = new Date(start.getTime() + 86400000);
  const [driver, shifts, bookings, events, rides] = await Promise.all([
    prisma.driverProfile.findUnique({ where: { id: driverProfileId }, select: { isActive: true } }),
    prisma.driverShift.findMany({
      where: {
        driverProfileId,
        shiftDate: { gte: start, lt: end },
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
      },
    }),
    prisma.busBooking.findMany({
      where: { driverProfileId, bookingDate: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    }),
    prisma.event.findMany({
      where: { driverProfileId, eventDate: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    }),
    prisma.rideRequest.findMany({
      where: {
        assignment: { driverProfileId },
        automaticShift: null,
        rideDate: { gte: start, lt: end },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    }),
  ]);
  if (!driver?.isActive) return true;
  return (
    [
      ...shifts,
      ...bookings,
      ...events.filter((event) => !excludeRideId || event.sourceRideRequestId !== excludeRideId),
    ].some((item) => shiftsOverlap(startTime, endTime, item.startTime, item.endTime)) ||
    rides.some((ride) => ride.id !== excludeRideId && ride.rideTime >= startTime && ride.rideTime < endTime)
  );
}
