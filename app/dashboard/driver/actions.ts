"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  notifyCitizenAboutAssignment,
  notifyCitizenAboutStatus,
  notifyDriverAboutAssignment
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isRideWithinShift } from "@/lib/shifts";
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

  await notifyCitizenAboutStatus(
    {
      email: ride.citizenProfile.user.email,
      name: ride.citizenProfile.user.name
    },
    toRideEmailData(ride),
    "COMPLETED"
  );

  revalidatePath("/dashboard/driver");
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

  const matchingRides = await prisma.rideRequest.findMany({
    where: {
      rideDate: shift.shiftDate,
      assignment: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] }
    },
    include: {
      citizenProfile: {
        include: { user: true }
      }
    }
  });

  const ridesInShift = matchingRides.filter((ride) => isRideWithinShift(ride.rideTime, shift.startTime, shift.endTime));

  await prisma.$transaction([
    prisma.driverShift.update({
      where: { id: shiftId },
      data: { driverProfileId: user.driverProfile.id }
    }),
    ...ridesInShift.map((ride) =>
      prisma.rideAssignment.create({
        data: {
          rideRequestId: ride.id,
          driverProfileId: user.driverProfile!.id
        }
      })
    ),
    ...ridesInShift.map((ride) =>
      prisma.rideRequest.update({
        where: { id: ride.id },
        data: { status: "ASSIGNED" }
      })
    )
  ]);

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
  }

  const rideText =
    ridesInShift.length === 1
      ? "Du%20har%20taget%20vagten%2C%20og%201%20tur%20blev%20tildelt%20dig."
      : `Du%20har%20taget%20vagten%2C%20og%20${ridesInShift.length}%20ture%20blev%20tildelt%20dig.`;

  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/citizen");
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

  await prisma.driverShift.update({
    where: { id: shift.id },
    data: { driverProfileId: null }
  });

  revalidatePath("/dashboard/driver");
  redirect("/dashboard/driver?success=Vagten%20er%20frigivet.");
}
