"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyActiveDrivers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { createRideWithAutomaticShift } from "@/lib/ride-requests";
import { busLabels, BusName } from "@/lib/shifts";
import { rideRequestSchema } from "@/lib/validation";

export async function createAdminRideAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const citizenProfileId = String(formData.get("citizenProfileId") ?? "");
  const parsed = rideRequestSchema.safeParse(Object.fromEntries(formData));

  if (!citizenProfileId) {
    redirect("/dashboard/admin/rides/new?error=V%C3%A6lg%20en%20borger.");
  }

  if (!parsed.success) {
    redirect(`/dashboard/admin/rides/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const citizen = await prisma.citizenProfile.findUnique({
    where: { id: citizenProfileId },
    include: { user: true }
  });

  if (!citizen) {
    redirect("/dashboard/admin/rides/new?error=Borgeren%20kunne%20ikke%20findes.");
  }

  const { ride, shift } = await createRideWithAutomaticShift({
    citizenProfileId: citizen.id,
    citizenName: citizen.user.name,
    ride: parsed.data
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "RIDE_CREATED_BY_ADMIN",
    entityType: "RIDE_REQUEST",
    entityId: ride.id,
    description: `${admin.name} oprettede en tur for ${citizen.user.name} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime} fra ${ride.pickupAddress} til ${ride.destinationAddress}.${shift ? " En tilhørende vagt blev oprettet automatisk." : " Der kunne ikke oprettes en automatisk vagt."}`
  });

  await createNotification({
    userId: citizen.user.id,
    title: "Kontoret har oprettet en tur til dig",
    body: `${ride.pickupAddress} til ${ride.destinationAddress} den ${ride.rideDate.toLocaleDateString("da-DK")} kl. ${ride.rideTime}.`,
    href: "/dashboard/citizen#mine-ture"
  });

  if (shift) {
    await notifyActiveDrivers(
      "Ny ledig vagt",
      `${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}. Formål: ${ride.purpose}.`,
      "/dashboard/driver#vagter"
    );
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/driver");

  const success = shift
    ? "Turen og den tilh%C3%B8rende vagt er oprettet."
    : "Turen er oprettet, men der var ingen ledig bus til en automatisk vagt.";
  redirect(`/dashboard/admin?success=${success}`);
}
