"use server";

import { danishToday } from "@/lib/dates";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { driverIsUnavailable } from "@/lib/scheduling";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyActiveDrivers, notifyRideParticipants } from "@/lib/notifications";
import { busLabels, BusName } from "@/lib/shifts";
import { addHoursToTime, shiftsOverlap } from "@/lib/shifts";
import { prisma, scheduleTransaction } from "@/lib/prisma";
import { ensureRideSharingEvent, updateRideSharingEventStatus } from "@/lib/ride-sharing";
import { driverShiftSchema } from "@/lib/validation";

async function findOverlappingBusShift(data: {
  bus: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
  excludeRideRequestId?: string;
}) {
  const date = new Date(`${data.date}T00:00:00Z`);
  const [shifts, bookings, events] = await Promise.all([
    prisma.driverShift.findMany({
      where: {
        bus: data.bus,
        shiftDate: date,
        id: data.excludeShiftId ? { not: data.excludeShiftId } : undefined,
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.busBooking.findMany({
      where: { bus: data.bus, bookingDate: date, status: { not: "CANCELLED" } },
      select: { startTime: true, endTime: true },
    }),
    prisma.event.findMany({
      where: { bus: data.bus, eventDate: date, status: { not: "CANCELLED" } },
      select: { startTime: true, endTime: true, sourceRideRequestId: true },
    }),
  ]);

  return [
    ...shifts,
    ...bookings,
    ...events.filter((event) => !data.excludeRideRequestId || event.sourceRideRequestId !== data.excludeRideRequestId),
  ].some((item) => shiftsOverlap(data.startTime, data.endTime, item.startTime, item.endTime));
}

function isBeforeToday(date: string) {
  const today = new Date(danishToday() + "T00:00:00Z");
  return new Date(`${date}T00:00:00Z`) < today;
}

export async function createShiftAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2),
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (isBeforeToday(parsed.data.date)) {
    redirect("/dashboard/admin/shifts?error=Vagten%20kan%20ikke%20oprettes%20i%20fortiden.");
  }

  const { shift } = await scheduleTransaction(async () => {
    const overlap = await findOverlappingBusShift(parsed.data);

    if (overlap) {
      redirect("/dashboard/admin/shifts?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.");
    }

    const shift = await prisma.driverShift.create({
      data: {
        shiftDate: new Date(`${parsed.data.date}T00:00:00Z`),
        bus: parsed.data.bus,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        notes: parsed.data.notes,
      },
    });

    return { shift };
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_CREATED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} oprettede en ledig vagt på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`,
  });

  await notifyActiveDrivers(
    "Ny ledig vagt",
    `${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`,
    "/dashboard/driver#vagter",
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

  const { shift } = await scheduleTransaction(async () => {
    const existing = await prisma.driverShift.findUnique({
      where: { id: shiftId },
      include: { rideRequest: true },
    });
    if (existing?.rideRequest && ["CANCELLED", "COMPLETED"].includes(existing.rideRequest.status))
      redirect(
        "/dashboard/admin/shifts?error=" +
          encodeURIComponent("Vagten tilhører en afsluttet tur og bevares i historikken."),
      );
    const shift = await prisma.driverShift.delete({
      where: { id: shiftId },
      include: { driverProfile: true },
    });
    if (shift.rideRequestId) {
      await prisma.$transaction([
        prisma.rideAssignment.deleteMany({
          where: { rideRequestId: shift.rideRequestId },
        }),
        prisma.rideRequest.update({
          where: { id: shift.rideRequestId },
          data: { status: "PENDING" },
        }),
      ]);
      await updateRideSharingEventStatus(shift.rideRequestId, "CANCELLED");
    }

    return { shift };
  });

  if (shift.rideRequestId)
    await notifyRideParticipants(
      shift.rideRequestId,
      "Vagten er fjernet",
      "Turen afventer ny planlægning fra kontoret.",
      shift.driverProfile ? [shift.driverProfile.userId] : [],
    );
  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_DELETED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} slettede vagten på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.`,
  });
  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20slettet.");
}

export async function updateShiftAction(shiftId: string, formData: FormData) {
  const admin = await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2),
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  if (isBeforeToday(parsed.data.date)) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=Vagten%20kan%20ikke%20gemmes%20i%20fortiden.`);
  }

  const { shift, driverProfileId } = await scheduleTransaction(async () => {
    const driverProfileId = String(formData.get("driverProfileId") ?? "");
    const existing = await prisma.driverShift.findUnique({
      where: { id: shiftId },
      include: { rideRequest: true },
    });
    if (!existing) redirect("/dashboard/admin/shifts?error=" + encodeURIComponent("Vagten findes ikke længere."));
    if (
      existing.rideRequestId &&
      (existing.shiftDate.toISOString().slice(0, 10) !== parsed.data.date ||
        existing.startTime !== parsed.data.startTime ||
        existing.endTime !== parsed.data.endTime ||
        existing.bus !== parsed.data.bus)
    ) {
      redirect(
        "/dashboard/admin/rides/" +
          existing.rideRequestId +
          "?error=" +
          encodeURIComponent("Ret dato, tidspunkt og bus på turen, så tur og vagt følges ad."),
      );
    }
    if (existing.rideRequest && ["CANCELLED", "COMPLETED"].includes(existing.rideRequest.status))
      redirect("/dashboard/admin/shifts?error=" + encodeURIComponent("En afsluttet tur kan ikke ændres via vagten."));
    if (
      driverProfileId &&
      (await driverIsUnavailable(
        driverProfileId,
        new Date(parsed.data.date + "T00:00:00Z"),
        parsed.data.startTime,
        parsed.data.endTime,
        shiftId,
        existing.rideRequestId ?? undefined,
      ))
    ) {
      redirect(
        "/dashboard/admin/shifts/" +
          shiftId +
          "?error=" +
          encodeURIComponent("Chaufføren er inaktiv eller allerede optaget."),
      );
    }
    const overlap = await findOverlappingBusShift({
      ...parsed.data,
      excludeShiftId: shiftId,
      excludeRideRequestId: existing.rideRequestId ?? undefined,
    });

    if (overlap) {
      redirect(`/dashboard/admin/shifts/${shiftId}?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.`);
    }

    const shift = await prisma.driverShift.update({
      where: { id: shiftId },
      data: {
        shiftDate: new Date(`${parsed.data.date}T00:00:00Z`),
        bus: parsed.data.bus,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        notes: parsed.data.notes,
        driverProfileId: driverProfileId || null,
      },
    });

    if (shift.rideRequestId) {
      if (driverProfileId) {
        await prisma.$transaction([
          prisma.rideAssignment.upsert({
            where: { rideRequestId: shift.rideRequestId },
            create: { rideRequestId: shift.rideRequestId, driverProfileId },
            update: { driverProfileId },
          }),
          prisma.rideRequest.update({
            where: { id: shift.rideRequestId },
            data: { status: "ASSIGNED" },
          }),
        ]);
        await ensureRideSharingEvent(shift.rideRequestId);
      } else {
        await prisma.$transaction([
          prisma.rideAssignment.deleteMany({
            where: { rideRequestId: shift.rideRequestId },
          }),
          prisma.rideRequest.update({
            where: { id: shift.rideRequestId },
            data: { status: "PENDING" },
          }),
        ]);
        await updateRideSharingEventStatus(shift.rideRequestId, "CANCELLED");
      }
    }

    return { shift, driverProfileId };
  });

  const selectedDriver = driverProfileId
    ? await prisma.driverProfile.findUnique({
        where: { id: driverProfileId },
        include: { user: true },
      })
    : null;
  await createAuditLog({
    actorUserId: admin.id,
    action: "SHIFT_UPDATED",
    entityType: "DRIVER_SHIFT",
    entityId: shift.id,
    description: `${admin.name} ændrede vagten på ${busLabels[(shift.bus || "EAST") as BusName]} den ${shift.shiftDate.toLocaleDateString("da-DK")} kl. ${shift.startTime}-${shift.endTime}.${selectedDriver ? ` Chauffør: ${selectedDriver.user.name}.` : " Vagten er ledig."}`,
  });

  revalidatePath("/dashboard/admin/shifts");
  revalidatePath("/dashboard/admin/buses");
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/admin/activity");
  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/citizen/events");
  revalidatePath("/");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20opdateret.");
}
