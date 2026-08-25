"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  notifyCitizenAboutAssignment,
  notifyCitizenAboutDriverMessage,
  notifyCitizenAboutStatus,
  notifyDriverAboutAssignment
} from "@/lib/email";
import { createNotification, createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { ensureRideSharingEvent, updateRideSharingEventStatus } from "@/lib/ride-sharing";
import { saveDriverImage } from "@/lib/uploads";

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

export async function completeRideAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");

  if (!user.driverProfile || !rideRequestId) {
    redirect("/dashboard/driver?error=Turen%20kunne%20ikke%20opdateres.");
  }

  const assignment = await prisma.rideAssignment.findFirst({
    where: {
      rideRequestId,
      driverProfileId: user.driverProfile.id
    }
  });

  if (!assignment) {
    redirect("/dashboard/driver?error=Du%20kan%20kun%20opdatere%20ture%2C%20der%20er%20tildelt%20dig.");
  }

  const ride = await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status: "COMPLETED" },
    include: {
      citizenProfile: {
        include: { user: true }
      }
    }
  });

  await updateRideSharingEventStatus(ride.id, "CLOSED");

  await notifyCitizenAboutStatus(
    {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name
    },
    toRideEmailData(ride),
    "COMPLETED"
  );

  await createNotification({
    userId: ride.citizenProfile.user.id,
    title: "Din tur er gennemført",
    body: `Turen den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} er markeret som gennemført.`,
    href: "/dashboard/citizen#mine-ture"
  });

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
}

export async function sendRideMessageAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!user.driverProfile || !rideRequestId) {
    redirect("/dashboard/driver?error=Beskeden%20kunne%20ikke%20sendes.");
  }

  if (message.length < 2) {
    redirect("/dashboard/driver?error=Skriv%20en%20besked%20f%C3%B8rst.");
  }

  if (message.length > 500) {
    redirect("/dashboard/driver?error=Beskeden%20m%C3%A5%20h%C3%B8jst%20v%C3%A6re%20500%20tegn.");
  }

  const assignment = await prisma.rideAssignment.findFirst({
    where: {
      rideRequestId,
      driverProfileId: user.driverProfile.id
    },
    include: {
      rideRequest: {
        include: {
          citizenProfile: { include: { user: true } }
        }
      }
    }
  });

  if (!assignment) {
    redirect("/dashboard/driver?error=Du%20kan%20kun%20skrive%20til%20borgere%20p%C3%A5%20dine%20egne%20ture.");
  }

  const ride = assignment.rideRequest;
  const citizen = {
    email: ride.citizenProfile.user.email,
    name: ride.citizenProfile.user.name
  };
  const driver = {
    email: user.email,
    name: user.name
  };

  await createNotification({
    userId: ride.citizenProfile.user.id,
    title: "Besked fra din chauffør",
    body: `${user.name}: ${message}`,
    href: "/dashboard/citizen#mine-ture"
  });

  await notifyCitizenAboutDriverMessage(citizen, toRideEmailData(ride), driver, message);

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/driver?success=Beskeden%20er%20sendt%20til%20borgeren.");
}

export async function updateDriverProfileImageAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);

  if (!user.driverProfile) {
    redirect("/dashboard/driver?error=Din%20chauff%C3%B8rprofil%20mangler.");
  }

  let imageUrl: string | undefined;

  try {
    imageUrl = await saveDriverImage(formData.get("image") as File | null);
  } catch (error) {
    redirect(`/dashboard/driver?error=${encodeURIComponent(error instanceof Error ? error.message : "Billedet kunne ikke uploades.")}`);
  }

  if (!imageUrl) {
    redirect("/dashboard/driver?error=V%C3%A6lg%20et%20billede%20f%C3%B8rst.");
  }

  await prisma.driverProfile.update({
    where: { id: user.driverProfile.id },
    data: { imageUrl }
  });

  revalidatePath("/dashboard/driver");
  redirect("/dashboard/driver?success=Profilbilledet%20er%20opdateret.");
}

export async function claimShiftAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);
  const shiftId = String(formData.get("shiftId") ?? "");

  if (!user.driverProfile || !shiftId) {
    redirect("/dashboard/driver?error=Vagten%20kunne%20ikke%20tages.");
  }

  const shift = await prisma.driverShift.findUnique({ where: { id: shiftId } });

  if (!shift || shift.driverProfileId) {
    redirect("/dashboard/driver?error=Vagten%20er%20allerede%20taget.");
  }

  const ridesInShift = shift.rideRequestId
    ? await prisma.rideRequest.findMany({
        where: {
          id: shift.rideRequestId,
          status: { notIn: ["COMPLETED", "CANCELLED"] }
        },
        include: {
          citizenProfile: {
            include: { user: true }
          },
          assignment: {
            include: { driverProfile: { include: { user: true } } }
          }
        }
      })
    : [];

  await prisma.$transaction([
    prisma.driverShift.update({
      where: { id: shiftId },
      data: { driverProfileId: user.driverProfile.id }
    }),
    ...ridesInShift.map((ride) =>
      prisma.rideAssignment.upsert({
        where: { rideRequestId: ride.id },
        create: {
          rideRequestId: ride.id,
          driverProfileId: user.driverProfile!.id
        },
        update: { driverProfileId: user.driverProfile!.id }
      })
    ),
    ...ridesInShift.map((ride) =>
      prisma.rideRequest.update({
        where: { id: ride.id },
        data: { status: "ASSIGNED" }
      })
    )
  ]);

  await Promise.all(ridesInShift.map((ride) => ensureRideSharingEvent(ride.id)));

  await createAuditLog({
    actorUserId: user.id,
    action: "SHIFT_CLAIMED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${user.name} tog vagten den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}. ${ridesInShift.length} tilhørende tur(e) blev tildelt automatisk.`
  });

  const previousDrivers = new Map<string, { userId: string; name: string }>();
  for (const ride of ridesInShift) {
    const previousDriver = ride.assignment?.driverProfile;
    if (previousDriver && previousDriver.id !== user.driverProfile.id) {
      previousDrivers.set(previousDriver.user.id, {
        userId: previousDriver.user.id,
        name: previousDriver.user.name
      });
    }
  }

  await createNotifications(
    Array.from(previousDrivers.values()).map((driver) => ({
      userId: driver.userId,
      title: "Tur overdraget til en anden chauffør",
      body: `En tur i vagten ${shift.startTime}-${shift.endTime} er nu overdraget til ${user.name}.`,
      href: "/dashboard/driver",
      driverType: "RIDE_CHANGES" as const
    }))
  );

  for (const ride of ridesInShift) {
    const rideData = toRideEmailData(ride);
    const citizen = {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name
    };
    const driver = {
      email: user.email,
      name: user.name
    };

    await notifyCitizenAboutAssignment(citizen, rideData, driver);
    await notifyDriverAboutAssignment(driver, rideData);
    await createNotifications([
      {
        userId: ride.citizenProfile.user.id,
        title: "Din tur er tildelt",
        body: `${user.name} er sat på din tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/citizen#mine-ture"
      },
      {
        userId: user.id,
        title: "Du har fået en tur",
        body: `${ride.citizenProfile.user.name}: ${ride.pickupAddress} til ${ride.destinationAddress} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
        href: "/dashboard/driver",
        driverType: "ASSIGNED_RIDES"
      }
    ]);
  }

  const rideText =
    ridesInShift.length === 1
      ? "Du%20har%20taget%20vagten%2C%20og%201%20tur%20blev%20tildelt%20dig."
      : `Du%20har%20taget%20vagten%2C%20og%20${ridesInShift.length}%20ture%20blev%20tildelt%20dig.`;

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
  redirect(`/dashboard/driver?success=${rideText}`);
}

export async function releaseShiftAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);
  const shiftId = String(formData.get("shiftId") ?? "");

  if (!user.driverProfile || !shiftId) {
    redirect("/dashboard/driver?error=Vagten%20kunne%20ikke%20frigives.");
  }

  const shift = await prisma.driverShift.findFirst({
    where: {
      id: shiftId,
      driverProfileId: user.driverProfile.id
    }
  });

  if (!shift) {
    redirect("/dashboard/driver?error=Du%20kan%20kun%20frigive%20dine%20egne%20vagter.");
  }

  const linkedRide = shift.rideRequestId
    ? await prisma.rideRequest.findFirst({
        where: {
          id: shift.rideRequestId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          assignment: { driverProfileId: user.driverProfile.id }
        },
        select: { id: true }
      })
    : null;
  const rideIds = linkedRide ? [linkedRide.id] : [];

  await prisma.$transaction([
    prisma.driverShift.update({
      where: { id: shift.id },
      data: { driverProfileId: null }
    }),
    prisma.rideAssignment.deleteMany({ where: { rideRequestId: { in: rideIds } } }),
    prisma.rideRequest.updateMany({
      where: { id: { in: rideIds } },
      data: { status: "PENDING" }
    })
  ]);

  await Promise.all(rideIds.map((rideId) => updateRideSharingEventStatus(rideId, "CANCELLED")));

  await createAuditLog({
    actorUserId: user.id,
    action: "SHIFT_RELEASED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${user.name} frigav vagten den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}. ${rideIds.length} tilhørende tur(e) blev frigivet samtidig.`
  });

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
  redirect(`/dashboard/driver?success=Vagten%20og%20${rideIds.length}%20tilh%C3%B8rende%20tur(e)%20er%20frigivet.`);
}
