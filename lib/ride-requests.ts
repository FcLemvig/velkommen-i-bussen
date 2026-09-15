import { prisma } from "@/lib/prisma";
import { getSuperSaaSBookings } from "@/lib/supersaas-calendar";
import { addMinutesToDateAndTime, BusName, preferredBusForAddress, shiftsOverlap } from "@/lib/shifts";

export type RideRequestInput = {
  pickupAddress: string;
  destinationAddress: string;
  date: string;
  time: string;
  passengers: number;
  purpose: string;
  isSharedRide: boolean;
  includesMinors: boolean;
  parentalConsent: boolean;
  guardianName?: string;
  guardianPhone?: string;
  notes?: string;
};

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function busIsAvailable(data: {
  bus: BusName;
  date: Date;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
  excludeRideRequestId?: string;
}) {
  const { start, end } = dayRange(data.date);
  const [shifts, bookings, events, supersaasBookings] = await Promise.all([
    prisma.driverShift.findMany({
      where: {
        bus: data.bus,
        shiftDate: { gte: start, lt: end }
      }
    }),
    prisma.busBooking.findMany({
      where: {
        bus: data.bus,
        bookingDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    }),
    prisma.event.findMany({
      where: {
        bus: data.bus,
        eventDate: { gte: start, lt: end },
        status: { not: "CANCELLED" }
      }
    }),
    getSuperSaaSBookings(start, end)
  ]);

  return ![
    ...shifts
      .filter((shift) => shift.id !== data.excludeShiftId)
      .map((shift) => ({ startTime: shift.startTime, endTime: shift.endTime })),
    ...bookings.map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime })),
    ...events
      .filter((event) => event.sourceRideRequestId !== data.excludeRideRequestId)
      .map((event) => ({ startTime: event.startTime, endTime: event.endTime })),
    ...supersaasBookings
      .filter((booking) => booking.bus === data.bus)
      .map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime }))
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));
}

export async function setRideBus(rideRequestId: string, bus: BusName) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: { automaticShift: true, assignment: true }
  });

  if (!ride) {
    return { error: "Turen kunne ikke findes." } as const;
  }

  const shiftStart = addMinutesToDateAndTime(ride.rideDate, ride.rideTime, -30);
  const shiftEnd = addMinutesToDateAndTime(shiftStart.date, shiftStart.time, 120);

  if (shiftStart.date.toDateString() !== shiftEnd.date.toDateString()) {
    return { error: "Turen går over midnat og skal planlægges manuelt." } as const;
  }

  const available = await busIsAvailable({
    bus,
    date: shiftStart.date,
    startTime: shiftStart.time,
    endTime: shiftEnd.time,
    excludeShiftId: ride.automaticShift?.id,
    excludeRideRequestId: ride.id
  });

  if (!available) {
    return { error: `${bus === "EAST" ? "Bus Øst" : "Bus Vest"} er optaget i det valgte tidsrum.` } as const;
  }

  const shift = ride.automaticShift
    ? await prisma.driverShift.update({
        where: { id: ride.automaticShift.id },
        data: {
          bus,
          shiftDate: shiftStart.date,
          startTime: shiftStart.time,
          endTime: shiftEnd.time,
          driverProfileId: ride.assignment?.driverProfileId ?? null
        }
      })
    : await prisma.driverShift.create({
        data: {
          rideRequestId: ride.id,
          bus,
          shiftDate: shiftStart.date,
          startTime: shiftStart.time,
          endTime: shiftEnd.time,
          driverProfileId: ride.assignment?.driverProfileId,
          notes: `Bus valgt af administrationen til tur fra ${ride.pickupAddress} til ${ride.destinationAddress}.`
        }
      });

  return { ride, shift } as const;
}

async function findAvailableBus(data: {
  pickupAddress: string;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  const preferredBus = preferredBusForAddress(data.pickupAddress);
  const busOrder: BusName[] = preferredBus === "EAST" ? ["EAST", "WEST"] : ["WEST", "EAST"];

  for (const bus of busOrder) {
    if (await busIsAvailable({ bus, date: data.date, startTime: data.startTime, endTime: data.endTime })) {
      return bus;
    }
  }

  return null;
}

export async function createRideWithAutomaticShift(data: {
  citizenProfileId: string;
  citizenName: string;
  ride: RideRequestInput;
}) {
  const rideDate = new Date(`${data.ride.date}T00:00:00`);
  const shiftStart = addMinutesToDateAndTime(rideDate, data.ride.time, -30);
  const shiftEnd = addMinutesToDateAndTime(shiftStart.date, shiftStart.time, 120);
  const automaticShiftBus =
    shiftStart.date.toDateString() === shiftEnd.date.toDateString()
      ? await findAvailableBus({
          pickupAddress: data.ride.pickupAddress,
          date: shiftStart.date,
          startTime: shiftStart.time,
          endTime: shiftEnd.time
        })
      : null;

  return prisma.$transaction(async (tx) => {
    const createdRide = await tx.rideRequest.create({
      data: {
        citizenProfileId: data.citizenProfileId,
        pickupAddress: data.ride.pickupAddress,
        destinationAddress: data.ride.destinationAddress,
        rideDate,
        rideTime: data.ride.time,
        passengers: data.ride.passengers,
        purpose: data.ride.purpose,
        isSharedRide: data.ride.isSharedRide,
        includesMinors: data.ride.includesMinors,
        parentalConsent: data.ride.parentalConsent,
        guardianName: data.ride.includesMinors ? data.ride.guardianName : undefined,
        guardianPhone: data.ride.includesMinors ? data.ride.guardianPhone : undefined,
        notes: data.ride.notes
      }
    });

    const createdShift = automaticShiftBus
      ? await tx.driverShift.create({
          data: {
            rideRequestId: createdRide.id,
            bus: automaticShiftBus,
            shiftDate: shiftStart.date,
            startTime: shiftStart.time,
            endTime: shiftEnd.time,
            notes: `Automatisk oprettet fra turanmodning: ${data.citizenName}, ${data.ride.pickupAddress} til ${data.ride.destinationAddress}.`
          }
        })
      : null;

    return { ride: createdRide, shift: createdShift };
  });
}
