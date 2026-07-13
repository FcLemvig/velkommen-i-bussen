"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { notifyAdminAboutNewRide } from "@/lib/email";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rideRequestSchema } from "@/lib/validation";

export async function createRideRequestAction(formData: FormData) {
  const user = await requireUser(["CITIZEN"]);
  const parsed = rideRequestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/citizen?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (!user.citizenProfile) {
    redirect("/dashboard/citizen?error=Din%20borgerprofil%20mangler.%20Kontakt%20administrationen.");
  }

  const ride = await prisma.rideRequest.create({
    data: {
      citizenProfileId: user.citizenProfile.id,
      pickupAddress: parsed.data.pickupAddress,
      destinationAddress: parsed.data.destinationAddress,
      rideDate: new Date(`${parsed.data.date}T00:00:00`),
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
    "Ny kørselsanmodning",
    `${user.name} ønsker en tur den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
    "/dashboard/admin"
  );

  revalidatePath("/dashboard/citizen");
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

  revalidatePath("/dashboard/citizen");
  redirect("/dashboard/citizen?success=Turen%20er%20slettet.");
}
