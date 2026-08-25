import { prisma } from "@/lib/prisma";

export const BUS_PASSENGER_CAPACITY = 6;

function townFromAddress(address: string, fallback: string) {
  const postcodeTown = address.match(/\b\d{4}\s+([^,]+)$/);
  if (postcodeTown?.[1]?.trim()) {
    return postcodeTown[1].trim();
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return fallback;
  }

  const townPart = parts.at(-1) ?? fallback;
  const withoutPostcode = townPart.replace(/^\d{4}\s+/, "").trim();
  return withoutPostcode || fallback;
}

export async function ensureRideSharingEvent(rideRequestId: string) {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: {
      automaticShift: true,
      assignment: true
    }
  });

  if (!ride?.automaticShift || !ride.assignment || ["CANCELLED", "COMPLETED"].includes(ride.status)) {
    return null;
  }

  const fromTown = townFromAddress(ride.pickupAddress, "opsamlingsstedet");
  const toTown = townFromAddress(ride.destinationAddress, "destinationen");
  const availableSeats = Math.max(BUS_PASSENGER_CAPACITY - ride.passengers, 0);

  return prisma.event.upsert({
    where: { sourceRideRequestId: ride.id },
    create: {
      sourceRideRequestId: ride.id,
      title: `Samkørsel fra ${fromTown} til ${toTown}`,
      description: `Hop med på en allerede planlagt tur fra ${fromTown} til ${toTown}.`,
      location: toTown,
      eventDate: ride.rideDate,
      startTime: ride.rideTime,
      endTime: ride.automaticShift.endTime,
      pickupInfo: `Fast opsamling i ${fromTown}. Skriv en note, hvis du ønsker opsamling på ruten.`,
      capacity: availableSeats,
      bus: ride.automaticShift.bus,
      driverProfileId: ride.assignment.driverProfileId,
      status: availableSeats > 0 ? "OPEN" : "CLOSED"
    },
    update: {
      title: `Samkørsel fra ${fromTown} til ${toTown}`,
      description: `Hop med på en allerede planlagt tur fra ${fromTown} til ${toTown}.`,
      location: toTown,
      eventDate: ride.rideDate,
      startTime: ride.rideTime,
      endTime: ride.automaticShift.endTime,
      pickupInfo: `Fast opsamling i ${fromTown}. Skriv en note, hvis du ønsker opsamling på ruten.`,
      capacity: availableSeats,
      bus: ride.automaticShift.bus,
      driverProfileId: ride.assignment.driverProfileId,
      status: availableSeats > 0 ? "OPEN" : "CLOSED"
    }
  });
}

export async function updateRideSharingEventStatus(rideRequestId: string, status: "OPEN" | "CLOSED" | "CANCELLED") {
  return prisma.event.updateMany({
    where: { sourceRideRequestId: rideRequestId },
    data: { status }
  });
}
