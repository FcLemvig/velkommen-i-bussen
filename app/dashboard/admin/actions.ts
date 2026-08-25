"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
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
  const admin = await requireUser(["ADMIN"]);
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

  await createAuditLog({
    actorUserId: admin.id,
    action: "RIDE_STATUS_CHANGED",
    entityType: "RIDE_REQUEST",
    entityId: ride.id,
    description: `${admin.name} ændrede status på ${ride.citizenProfile.user.name}s tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} til ${rideStatusLabels[status as RideStatus]}.`
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
  const admin = await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");

  if (!rideRequestId || !driverProfileId) {
    redirect("/dashboard/admin?error=V%C3%A6lg%20en%20aktiv%20chauff%C3%B8r.");
  }

  const currentRide = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: {
      citizenProfile: { include: { user: { include: { membership: true } } } },
      automaticShift: true
    }
  });

  if (!currentRide || !isMembershipActive(currentRide.citizenProfile.user.membership)) {
    redirect("/dashboard/admin?error=Medlemskabet%20skal%20v%C3%A6re%20aktivt%2C%20f%C3%B8r%20turen%20kan%20tildeles.");
  }

  const driver = await prisma.driverProfile.findFirst({
    where: { id: driverProfileId, isActive: true },
    select: { id: true }
  });

  if (!driver) {
    redirect("/dashboard/admin?error=Den%20valgte%20chauff%C3%B8r%20er%20ikke%20aktiv.");
  }

  await prisma.$transaction([
    prisma.rideAssignment.upsert({
      where: { rideRequestId },
      create: { rideRequestId, driverProfileId },
      update: { driverProfileId }
    }),
    ...(currentRide.automaticShift
      ? [
          prisma.driverShift.update({
            where: { id: currentRide.automaticShift.id },
            data: { driverProfileId }
          })
        ]
      : []),
    prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: { status: "ASSIGNED" }
    })
  ]);

  const ride = await prisma.rideRequest.findUniqueOrThrow({
    where: { id: rideRequestId },
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

    await createAuditLog({
      actorUserId: admin.id,
      action: "RIDE_DRIVER_ASSIGNED",
      entityType: "RIDE_REQUEST",
      entityId: ride.id,
      description: `${admin.name} tildelte ${ride.assignment.driverProfile.user.name} til ${ride.citizenProfile.user.name}s tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.${currentRide.automaticShift ? " Den tilknyttede vagt blev opdateret samtidig." : " Turen har ingen tilknyttet automatisk vagt."}`
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin/activity");
  redirect(`/dashboard/admin?success=${currentRide.automaticShift ? "Chauff%C3%B8ren%20er%20%C3%A6ndret%20p%C3%A5%20turen%20og%20den%20tilknyttede%20vagt." : "Chauff%C3%B8ren%20er%20%C3%A6ndret%20p%C3%A5%20turen."}`);
}
