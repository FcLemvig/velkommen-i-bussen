"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { updateRideDetails } from "@/lib/ride-requests";
import { ensureRideSharingEvent, updateRideSharingEventStatus } from "@/lib/ride-sharing";
import { busOptions, BusName } from "@/lib/shifts";
import { rideRequestSchema } from "@/lib/validation";

export async function updateAdminRideAction(rideRequestId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const parsed = rideRequestSchema.safeParse(Object.fromEntries(formData));
  const busValue = String(formData.get("bus") ?? "");
  const bus = busOptions.includes(busValue as BusName) ? (busValue as BusName) : undefined;

  if (!parsed.success) {
    redirect(`/dashboard/admin/rides/${rideRequestId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const result = await updateRideDetails(rideRequestId, parsed.data, bus);
  if ("error" in result) {
    redirect(`/dashboard/admin/rides/${rideRequestId}?error=${encodeURIComponent(result.error ?? "Turen kunne ikke opdateres.")}`);
  }

  if (result.ride.isSharedRide && result.shift) {
    await ensureRideSharingEvent(result.ride.id);
  } else {
    await updateRideSharingEventStatus(result.ride.id, "CANCELLED");
  }

  const updatedRide = await prisma.rideRequest.findUniqueOrThrow({
    where: { id: result.ride.id },
    include: {
      citizenProfile: { include: { user: true } },
      assignment: { include: { driverProfile: true } },
      sharedEvent: { include: { signups: { include: { citizenProfile: true } } } }
    }
  });

  const recipientIds = new Set<string>([updatedRide.citizenProfile.userId]);
  if (updatedRide.assignment?.driverProfile.userId) {
    recipientIds.add(updatedRide.assignment.driverProfile.userId);
  }
  updatedRide.sharedEvent?.signups.forEach((signup) => recipientIds.add(signup.citizenProfile.userId));

  await createNotifications(
    Array.from(recipientIds).map((userId) => ({
      userId,
      title: "En tur er blevet ændret",
      body: `${updatedRide.rideDate.toLocaleDateString("da-DK")} kl. ${updatedRide.rideTime}: ${updatedRide.pickupAddress} til ${updatedRide.destinationAddress}.`,
      href: userId === updatedRide.assignment?.driverProfile.userId ? "/dashboard/driver#mine-ture" : "/dashboard/citizen#mine-ture"
    }))
  );

  await createAuditLog({
    actorUserId: admin.id,
    action: "RIDE_UPDATED",
    entityType: "RIDE_REQUEST",
    entityId: updatedRide.id,
    description: `${admin.name} redigerede ${updatedRide.citizenProfile.user.name}s tur den ${updatedRide.rideDate.toLocaleDateString("da-DK")} kl. ${updatedRide.rideTime}.`
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/citizen");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/dashboard/driver");
  revalidatePath("/");
  redirect("/dashboard/admin?success=Turen%20er%20opdateret.");
}
