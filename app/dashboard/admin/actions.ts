"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isRideStatus } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function updateRideStatusAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!rideRequestId || !isRideStatus(status)) {
    redirect("/dashboard/admin?error=Status%20kunne%20ikke%20opdateres.");
  }

  await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status }
  });

  revalidatePath("/dashboard/admin");
}

export async function assignDriverAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const driverProfileId = String(formData.get("driverProfileId") ?? "");

  if (!rideRequestId || !driverProfileId) {
    redirect("/dashboard/admin?error=V%C3%A6lg%20en%20aktiv%20chauff%C3%B8r.");
  }

  await prisma.rideAssignment.upsert({
    where: { rideRequestId },
    create: { rideRequestId, driverProfileId },
    update: { driverProfileId }
  });

  await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status: "ASSIGNED" }
  });

  revalidatePath("/dashboard/admin");
}
