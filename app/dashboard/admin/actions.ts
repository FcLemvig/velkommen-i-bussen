"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isRideStatus, RideStatus } from "@/lib/domain";
import {
  notifyCitizenAboutAssignment,
  notifyCitizenAboutStatus,
  notifyDriverAboutAssignment
} from "@/lib/email";
import { rideStatusLabels } from "@/lib/labels";
import { isMembershipActive } from "@/lib/membership";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isRideWithinShift } from "@/lib/shifts";

function toRideEmailData(ride: {
  citizenProfile: { user: { name: string } };
  pickupAddress: string;
  destinationAddress: string;
  rideDate: Date;
  rideTime: string;
  passengers: number;
  purpose: string;
  notes: string | null;
}) {
  return {
    citizenName: ride.citizenProfile.user.name,
    pickupAddress: ride.pickupAddress,
    destinationAddress: ride.destinationAddress,
    rideDate: ride.rideDate,
    rideTime: ride.rideTime,
    passengers: ride.passengers,
    purpose: ride.purpose,
    notes: ride.notes
  };
}

export async function updateRideStatusAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!rideRequestId || !isRideStatus(status)) {
    redirect("/dashboard/admin?error=Status%20kunne%20ikke%20opdateres.");
  }

  if (["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    const currentRide = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: { citizenProfile: { include: { user: { include: { membership: true } } } } }
    });

    if (!currentRide || !isMembershipActive(currentRide.citizenProfile.user.membership)) {
      redirect("/dashboard/admin?error=Medlemskabet%20skal%20v%C3%A6re%20aktivt%2C%20f%C3%B8r%20turen%20kan%20godkendes.");
    }
  }

  const ride = await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status },
    include: {
      citizenProfile: {
        include: { user: true }
      }
    }
  });

  await notifyCitizenAboutStatus(
    {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name
    },
    toRideEmailData(ride),
    status as RideStatus
  );

  await createNotifications([
    {
      userId: ride.citizenProfile.user.id,
      title: `Status på din tur: ${rideStatusLabels[status as RideStatus]}`,
      body: `Din tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} er opdateret.`,
      href: "/dashboard/citizen#mine-ture"
    }
  ]);

  revalidatePath("/dashboard/admin");
}

export async function assignDriverAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");

  if (!rideRequestId || !driverProfileId) {
    redirect("/dashboard/admin?error=V%C3%A6lg%20en%20aktiv%20chauff%C3%B8r.");
  }

  const currentRide = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: { citizenProfile: { include: { user: { include: { membership: true } } } } }
  });

  if (!currentRide || !isMembershipActive(currentRide.citizenProfile.user.membership)) {
    redirect("/dashboard/admin?error=Medlemskabet%20skal%20v%C3%A6re%20aktivt%2C%20f%C3%B8r%20turen%20kan%20tildeles.");
  }

  await prisma.rideAssignment.upsert({
    where: { rideRequestId },
    create: { rideRequestId, driverProfileId },
    update: { driverProfileId }
  });

  const shifts = await prisma.driverShift.findMany({
    where: { shiftDate: currentRide.rideDate },
    select: { id: true, startTime: true, endTime: true }
  });
  const matchingShiftIds = shifts
    .filter((shift) => isRideWithinShift(currentRide.rideTime, shift.startTime, shift.endTime))
    .map((shift) => shift.id);

  if (matchingShiftIds.length > 0) {
    await prisma.driverShift.updateMany({
      where: { id: { in: matchingShiftIds } },
      data: { driverProfileId }
    });
  }

  const ride = await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status: "ASSIGNED" },
    include: {
      citizenProfile: {
        include: { user: true }
      },
      assignment: {
        include: {
          driverProfile: {
            include: { user: true }
          }
        }
      }
    }
  });

  if (ride.assignment?.driverProfile.user) {
    const rideData = toRideEmailData(ride);
    const citizen = {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name
    };
    const driver = {
      email: ride.assignment.driverProfile.user.email,
      name: ride.assignment.driverProfile.user.name
    };

    await notifyCitizenAboutAssignment(citizen, rideData, driver);
    await notifyDriverAboutAssignment(driver, rideData);
    await createNotifications([
      {
        userId: ride.citizenProfile.user.id,
        title: "Din tur er tildelt",
        body: `${driver.name} er sat på din tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/citizen#mine-ture"
      },
      {
        userId: ride.assignment.driverProfile.user.id,
        title: "Du har fået en tur",
        body: `${ride.citizenProfile.user.name}: ${ride.pickupAddress} til ${ride.destinationAddress} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/driver",
        driverType: "ASSIGNED_RIDES"
      }
    ]);
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/citizen");
  redirect("/dashboard/admin?success=Chauff%C3%B8ren%20er%20%C3%A6ndret%20p%C3%A5%20b%C3%A5de%20turen%20og%20vagten.");
}
