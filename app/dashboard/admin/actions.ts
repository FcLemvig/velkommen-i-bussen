"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { driverIsUnavailable } from "@/lib/scheduling";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { isRideStatus, RideStatus } from "@/lib/domain";
import { notifyCitizenAboutAssignment, notifyCitizenAboutStatus, notifyDriverAboutAssignment } from "@/lib/email";
import { rideStatusLabels } from "@/lib/labels";
import { isMembershipActive } from "@/lib/membership";
import { createNotifications, notifyRideParticipants } from "@/lib/notifications";
import { prisma, scheduleTransaction } from "@/lib/prisma";
import { setRideBus } from "@/lib/ride-requests";
import { ensureRideSharingEvent, updateRideSharingEventStatus } from "@/lib/ride-sharing";
import { busLabels, busOptions, BusName } from "@/lib/shifts";

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
    notes: ride.notes,
  };
}

export async function updateRideStatusAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!rideRequestId || !isRideStatus(status)) {
    redirect("/dashboard/admin?error=Status%20kunne%20ikke%20opdateres.");
  }

  const { ride } = await scheduleTransaction(async () => {
    const before = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: { assignment: true, automaticShift: true },
    });
    if (!before) redirect("/dashboard/admin?error=" + encodeURIComponent("Turen findes ikke længere."));
    if (["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(status) && !before.assignment)
      redirect("/dashboard/admin?error=" + encodeURIComponent("Turen skal have en chauffør først."));
    if (before.status === "CANCELLED" && status !== "CANCELLED")
      redirect("/dashboard/admin?error=" + encodeURIComponent("Opret en ny tur for at genbooke en aflyst tur."));
    if (["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      const currentRide = await prisma.rideRequest.findUnique({
        where: { id: rideRequestId },
        include: { citizenProfile: { include: { user: { include: { membership: true } } } } },
      });

      if (!currentRide || !isMembershipActive(currentRide.citizenProfile.user.membership)) {
        redirect(
          "/dashboard/admin?error=Medlemskabet%20skal%20v%C3%A6re%20aktivt%2C%20f%C3%B8r%20turen%20kan%20godkendes.",
        );
      }
    }

    const ride = await prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: { status },
      include: {
        assignment: { include: { driverProfile: true } },
        citizenProfile: {
          include: { user: true },
        },
      },
    });

    if (status === "CANCELLED") {
      await prisma.driverShift.deleteMany({ where: { rideRequestId } });
      await prisma.rideAssignment.deleteMany({ where: { rideRequestId } });
    }
    if (["ASSIGNED", "IN_PROGRESS"].includes(status)) {
      await ensureRideSharingEvent(ride.id);
    } else {
      await updateRideSharingEventStatus(ride.id, status === "COMPLETED" ? "CLOSED" : "CANCELLED");
    }

    return { ride };
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "RIDE_STATUS_CHANGED",
    entityType: "RIDE_REQUEST",
    entityId: ride.id,
    description: `${admin.name} ændrede status på ${ride.citizenProfile.user.name}s tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} til ${rideStatusLabels[status as RideStatus]}.`,
  });

  await notifyRideParticipants(
    ride.id,
    `Status på din tur: ${rideStatusLabels[status as RideStatus]}`,
    `Turen den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} er opdateret.`,
    ride.assignment ? [ride.assignment.driverProfile.userId] : [],
  );

  await notifyCitizenAboutStatus(
    {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name,
    },
    toRideEmailData(ride),
    status as RideStatus,
  );

  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
}

export async function assignDriverAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const requestedBusValue = String(formData.get("bus") ?? "");
  const requestedBus = busOptions.find((bus) => bus === requestedBusValue) as BusName | undefined;

  if (!rideRequestId || !driverProfileId) {
    redirect("/dashboard/admin?error=V%C3%A6lg%20en%20aktiv%20chauff%C3%B8r.");
  }

  const rideBeforeAssignment = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    select: { status: true, automaticShift: { select: { id: true } } },
  });

  if (!rideBeforeAssignment) {
    redirect("/dashboard/admin?error=" + encodeURIComponent("Turen findes ikke længere."));
  }
  if (["CANCELLED", "COMPLETED"].includes(rideBeforeAssignment.status)) {
    redirect("/dashboard/admin?error=" + encodeURIComponent("En afsluttet tur kan ikke tildeles."));
  }
  if (!rideBeforeAssignment.automaticShift) {
    if (!requestedBus) {
      redirect("/dashboard/admin?error=" + encodeURIComponent("Vælg en bus til turen."));
    }

    const busResult = await setRideBus(rideRequestId, requestedBus);
    if ("error" in busResult && busResult.error) {
      redirect("/dashboard/admin?error=" + encodeURIComponent(busResult.error));
    }
  }

  const { currentRide, ride } = await scheduleTransaction(async () => {
    const currentRide = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: {
        citizenProfile: { include: { user: { include: { membership: true } } } },
        automaticShift: true,
      },
    });

    if (!currentRide || !isMembershipActive(currentRide.citizenProfile.user.membership)) {
      redirect(
        "/dashboard/admin?error=Medlemskabet%20skal%20v%C3%A6re%20aktivt%2C%20f%C3%B8r%20turen%20kan%20tildeles.",
      );
    }

    const driver = await prisma.driverProfile.findFirst({
      where: { id: driverProfileId, isActive: true },
      select: { id: true },
    });

    if (!driver) {
      redirect("/dashboard/admin?error=Den%20valgte%20chauff%C3%B8r%20er%20ikke%20aktiv.");
    }

    if (!currentRide.automaticShift || ["CANCELLED", "COMPLETED"].includes(currentRide.status)) {
      redirect("/dashboard/admin?error=" + encodeURIComponent("Vælg først en ledig bus til en aktiv tur."));
    }
    if (
      await driverIsUnavailable(
        driverProfileId,
        currentRide.automaticShift.shiftDate,
        currentRide.automaticShift.startTime,
        currentRide.automaticShift.endTime,
        currentRide.automaticShift.id,
        currentRide.id,
      )
    ) {
      redirect("/dashboard/admin?error=" + encodeURIComponent("Chaufføren er allerede optaget i tidsrummet."));
    }
    await prisma.$transaction([
      prisma.rideAssignment.upsert({
        where: { rideRequestId },
        create: { rideRequestId, driverProfileId },
        update: { driverProfileId },
      }),
      ...(currentRide.automaticShift
        ? [
            prisma.driverShift.update({
              where: { id: currentRide.automaticShift.id },
              data: { driverProfileId },
            }),
          ]
        : []),
      prisma.rideRequest.update({
        where: { id: rideRequestId },
        data: { status: "ASSIGNED" },
      }),
    ]);

    const ride = await prisma.rideRequest.findUniqueOrThrow({
      where: { id: rideRequestId },
      include: {
        citizenProfile: {
          include: { user: true },
        },
        assignment: {
          include: {
            driverProfile: {
              include: { user: true },
            },
          },
        },
      },
    });

    await ensureRideSharingEvent(ride.id);

    return { currentRide, ride };
  });

  if (ride.assignment?.driverProfile.user) {
    const rideData = toRideEmailData(ride);
    const citizen = {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name,
    };
    const driver = {
      email: ride.assignment.driverProfile.user.email,
      name: ride.assignment.driverProfile.user.name,
    };

    await notifyCitizenAboutAssignment(citizen, rideData, driver);
    await notifyDriverAboutAssignment(driver, rideData);
    await createNotifications([
      {
        userId: ride.citizenProfile.user.id,
        title: "Din tur er tildelt",
        body: `${driver.name} er sat på din tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/citizen#mine-ture",
      },
      {
        userId: ride.assignment.driverProfile.user.id,
        title: "Du har fået en tur",
        body: `${ride.citizenProfile.user.name}: ${ride.pickupAddress} til ${ride.destinationAddress} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/driver",
        driverType: "ASSIGNED_RIDES",
      },
    ]);

    await createAuditLog({
      actorUserId: admin.id,
      action: "RIDE_DRIVER_ASSIGNED",
      entityType: "RIDE_REQUEST",
      entityId: ride.id,
      description: `${admin.name} tildelte ${ride.assignment.driverProfile.user.name} til ${ride.citizenProfile.user.name}s tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.${currentRide.automaticShift ? " Den tilknyttede vagt blev opdateret samtidig." : " Turen har ingen tilknyttet automatisk vagt."}`,
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
  redirect(
    `/dashboard/admin?success=${currentRide.automaticShift ? "Chauff%C3%B8ren%20er%20%C3%A6ndret%20p%C3%A5%20turen%20og%20den%20tilknyttede%20vagt." : "Chauff%C3%B8ren%20er%20%C3%A6ndret%20p%C3%A5%20turen."}`,
  );
}

export async function updateRideBusAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const bus = String(formData.get("bus") ?? "") as BusName;

  if (!rideRequestId || !busOptions.includes(bus)) {
    redirect("/dashboard/admin?error=V%C3%A6lg%20en%20bus.");
  }

  const result = await setRideBus(rideRequestId, bus);

  if ("error" in result) {
    redirect(`/dashboard/admin?error=${encodeURIComponent(result.error ?? "Bussen kunne ikke ændres.")}`);
  }

  await ensureRideSharingEvent(rideRequestId);
  await createAuditLog({
    actorUserId: admin.id,
    action: "RIDE_BUS_CHANGED",
    entityType: "RIDE_REQUEST",
    entityId: rideRequestId,
    description: `${admin.name} valgte ${busLabels[bus]} til turen den ${result.ride.rideDate.toLocaleDateString("da-DK")} kl. ${result.ride.rideTime}.`,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/");
  redirect(`/dashboard/admin?success=${encodeURIComponent(`${busLabels[bus]} er valgt til turen.`)}`);
}
