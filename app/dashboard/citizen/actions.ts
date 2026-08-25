"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyAdminAboutNewRide, notifyDriverAboutCitizenMessage } from "@/lib/email";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSuperSaaSBookings } from "@/lib/supersaas-calendar";
import { addMinutesToDateAndTime, busLabels, BusName, preferredBusForAddress, shiftsOverlap } from "@/lib/shifts";
import { rideRequestSchema } from "@/lib/validation";

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
    ...shifts.map((shift) => ({ startTime: shift.startTime, endTime: shift.endTime })),
    ...bookings.map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime })),
    ...events.map((event) => ({ startTime: event.startTime, endTime: event.endTime })),
    ...supersaasBookings
      .filter((booking) => booking.bus === data.bus)
      .map((booking) => ({ startTime: booking.startTime, endTime: booking.endTime }))
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));
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

export async function createRideRequestAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const parsed = rideRequestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/citizen?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (!user.citizenProfile) {
    redirect("/dashboard/citizen?error=Din%20borgerprofil%20mangler.%20Kontakt%20administrationen.");
  }

  const rideDate = new Date(`${parsed.data.date}T00:00:00`);
  const shiftStart = addMinutesToDateAndTime(rideDate, parsed.data.time, -30);
  const shiftEnd = addMinutesToDateAndTime(shiftStart.date, shiftStart.time, 120);
  const automaticShiftBus =
    shiftStart.date.toDateString() === shiftEnd.date.toDateString()
      ? await findAvailableBus({
          pickupAddress: parsed.data.pickupAddress,
          date: shiftStart.date,
          startTime: shiftStart.time,
          endTime: shiftEnd.time
        })
      : null;

  const { ride, shift } = await prisma.$transaction(async (tx) => {
    const createdRide = await tx.rideRequest.create({
      data: {
        citizenProfileId: user.citizenProfile!.id,
        pickupAddress: parsed.data.pickupAddress,
        destinationAddress: parsed.data.destinationAddress,
        rideDate,
        rideTime: parsed.data.time,
        passengers: parsed.data.passengers,
        purpose: parsed.data.purpose,
        includesMinors: parsed.data.includesMinors,
        parentalConsent: parsed.data.parentalConsent,
        guardianName: parsed.data.includesMinors ? parsed.data.guardianName : undefined,
        guardianPhone: parsed.data.includesMinors ? parsed.data.guardianPhone : undefined,
        notes: parsed.data.notes
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
            notes: `Automatisk oprettet fra turanmodning: ${user.name}, ${parsed.data.pickupAddress} til ${parsed.data.destinationAddress}.`
          }
        })
      : null;

    return { ride: createdRide, shift: createdShift };
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "RIDE_CREATED",
    entityType: "RIDE_REQUEST",
    entityId: ride.id,
    description: `${user.name} oprettede en tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} fra ${ride.pickupAddress} til ${ride.destinationAddress}.${shift ? " En tilhørende vagt blev oprettet automatisk." : " Der kunne ikke oprettes en automatisk vagt."}`
  });

  await notifyAdminAboutNewRide({
    citizenName: user.name,
    pickupAddress: ride.pickupAddress,
    destinationAddress: ride.destinationAddress,
    rideDate: ride.rideDate,
    rideTime: ride.rideTime,
    passengers: ride.passengers,
    purpose: ride.purpose,
    notes: ride.notes
  });

  await createNotification({
    userId: user.id,
    title: "Din tur er oprettet",
    body: `${ride.pickupAddress} til ${ride.destinationAddress} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
    href: "/dashboard/citizen#mine-ture"
  });

  await notifyAdmins(
    "Ny koerselsanmodning",
    shift
      ? `${user.name} ønsker en tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}. Der er automatisk oprettet en ledig vagt på ${busLabels[(shift.bus || "EAST") as BusName]} kl. ${shift.startTime}-${shift.endTime}.`
      : `${user.name} ønsker en tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}. Ingen bus var ledig til automatisk vagt.`,
    "/dashboard/admin"
  );

  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  redirect("/dashboard/citizen?success=Din%20tur%20er%20oprettet.");
}

export async function deleteRideRequestAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");

  if (!user.citizenProfile || !rideRequestId) {
    redirect("/dashboard/citizen?error=Turen%20kunne%20ikke%20slettes.");
  }

  const ride = await prisma.rideRequest.findFirst({
    where: {
      id: rideRequestId,
      citizenProfileId: user.citizenProfile.id
    }
  });

  if (!ride) {
    redirect("/dashboard/citizen?error=Du%20kan%20kun%20slette%20dine%20egne%20ture.");
  }

  if (ride.status === "COMPLETED") {
    redirect("/dashboard/citizen?error=Gennemf%C3%B8rte%20ture%20kan%20ikke%20slettes.");
  }

  await prisma.rideRequest.delete({
    where: { id: ride.id }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "RIDE_DELETED",
    entityType: "RIDE_REQUEST",
    entityId: ride.id,
    description: `${user.name} slettede sin tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} fra ${ride.pickupAddress} til ${ride.destinationAddress}. Den automatisk tilknyttede vagt blev også slettet.`
  });

  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/driver");
  redirect("/dashboard/citizen?success=Turen%20er%20slettet.");
}

export async function sendCitizenRideMessageAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!user.citizenProfile || !rideRequestId) {
    redirect("/dashboard/citizen?error=Beskeden%20kunne%20ikke%20sendes.");
  }

  if (message.length < 2) {
    redirect("/dashboard/citizen?error=Skriv%20en%20besked%20f%C3%B8rst.");
  }

  if (message.length > 500) {
    redirect("/dashboard/citizen?error=Beskeden%20m%C3%A5%20h%C3%B8jst%20v%C3%A6re%20500%20tegn.");
  }

  const ride = await prisma.rideRequest.findFirst({
    where: {
      id: rideRequestId,
      citizenProfileId: user.citizenProfile.id
    },
    include: {
      citizenProfile: { include: { user: true } },
      assignment: {
        include: {
          driverProfile: { include: { user: true } }
        }
      }
    }
  });

  if (!ride?.assignment?.driverProfile) {
    redirect("/dashboard/citizen?error=Der%20er%20ikke%20tildelt%20en%20chauff%C3%B8r%20endnu.");
  }

  const driverUser = ride.assignment.driverProfile.user;
  const driver = {
    email: driverUser.email,
    name: driverUser.name
  };
  const citizen = {
    email: user.email,
    name: user.name
  };
  const rideData = {
    citizenName: user.name,
    pickupAddress: ride.pickupAddress,
    destinationAddress: ride.destinationAddress,
    rideDate: ride.rideDate,
    rideTime: ride.rideTime,
    passengers: ride.passengers,
    purpose: ride.purpose,
    notes: ride.notes
  };

  await createNotification({
    userId: driverUser.id,
    title: "Svar fra borger",
    body: `${user.name}: ${message}`,
    href: "/dashboard/driver",
    driverType: "RIDE_CHANGES"
  });

  await notifyDriverAboutCitizenMessage(driver, rideData, citizen, message);

  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/citizen?success=Beskeden%20er%20sendt%20til%20chauff%C3%B8ren.");
}
