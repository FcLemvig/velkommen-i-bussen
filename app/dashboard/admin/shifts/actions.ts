"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyActiveDrivers } from "@/lib/notifications";
import { busLabels, BusName } from "@/lib/shifts";
import { addHoursToTime, shiftsOverlap } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { driverShiftSchema } from "@/lib/validation";

async function findOverlappingBusShift(data: {
  bus: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}) {
  const shifts = await prisma.driverShift.findMany({
    where: {
      bus: data.bus,
      shiftDate: new Date(`${data.date}T00:00:00`),
      id: data.excludeShiftId ? { not: data.excludeShiftId } : undefined
    }
  });

  return shifts.find((shift) => shiftsOverlap(data.startTime, data.endTime, shift.startTime, shift.endTime));
}

function isBeforeToday(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) < today;
}

export async function createShiftAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2)
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (isBeforeToday(parsed.data.date)) {
    redirect("/dashboard/admin/shifts?error=Vagten%20kan%20ikke%20oprettes%20i%20fortiden.");
  }

  const overlap = await findOverlappingBusShift(parsed.data);

  if (overlap) {
    redirect("/dashboard/admin/shifts?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.");
  }

  const shift = await prisma.driverShift.create({
    data: {
      shiftDate: new Date(`${parsed.data.date}T00:00:00`),
      bus: parsed.data.bus,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes
    }
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_CREATED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} oprettede en ledig vagt på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`
  });

  await notifyActiveDrivers(
    "Ny ledig vagt",
    `${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`,
    "/dashboard/driver#vagter"
  );

  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/activity");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20oprettet.");
}

export async function deleteShiftAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const shiftId = String(formData.get("shiftId") ?? "");

  if (!shiftId) {
    redirect("/dashboard/admin/shifts?error=Vagten%20kunne%20ikke%20slettes.");
  }

  const shift = await prisma.driverShift.delete({ where: { id: shiftId } });
  if (shift.rideRequestId) {
    await prisma.$transaction([
      prisma.rideAssignment.deleteMany({ where: { rideRequestId: shift.rideRequestId } }),
      prisma.rideRequest.update({ where: { id: shift.rideRequestId }, data: { status: "PENDING" } })
    ]);
  }
  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_DELETED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} slettede vagten på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`
  });
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/activity");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20slettet.");
}

export async function updateShiftAction(shiftId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2)
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (isBeforeToday(parsed.data.date)) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=Vagten%20kan%20ikke%20gemmes%20i%20fortiden.`);
  }

  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const overlap = await findOverlappingBusShift({ ...parsed.data, excludeShiftId: shiftId });

  if (overlap) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.`);
  }

  const shift = await prisma.driverShift.update({
    where: { id: shiftId },
    data: {
      shiftDate: new Date(`${parsed.data.date}T00:00:00`),
      bus: parsed.data.bus,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes,
      driverProfileId: driverProfileId || null
    }
  });

  if (shift.rideRequestId) {
    if (driverProfileId) {
      await prisma.$transaction([
        prisma.rideAssignment.upsert({
          where: { rideRequestId: shift.rideRequestId },
          create: { rideRequestId: shift.rideRequestId, driverProfileId },
          update: { driverProfileId }
        }),
        prisma.rideRequest.update({ where: { id: shift.rideRequestId }, data: { status: "ASSIGNED" } })
      ]);
    } else {
      await prisma.$transaction([
        prisma.rideAssignment.deleteMany({ where: { rideRequestId: shift.rideRequestId } }),
        prisma.rideRequest.update({ where: { id: shift.rideRequestId }, data: { status: "PENDING" } })
      ]);
    }
  }

  const selectedDriver = driverProfileId
    ? await prisma.driverProfile.findUnique({ where: { id: driverProfileId }, include: { user: true } })
    : null;
  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_UPDATED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} ændrede vagten på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.${selectedDriver ? ` Chauffør: ${selectedDriver.user.name}.` : " Vagten er ledig."}`
  });

  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/activity");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20opdateret.");
}
