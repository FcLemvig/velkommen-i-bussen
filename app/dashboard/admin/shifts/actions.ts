"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
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

export async function createShiftAction(formData: FormData) {
  await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2)
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const overlap = await findOverlappingBusShift(parsed.data);

  if (overlap) {
    redirect("/dashboard/admin/shifts?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.");
  }

  await prisma.driverShift.create({
    data: {
      shiftDate: new Date(`${parsed.data.date}T00:00:00`),
      bus: parsed.data.bus,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes
    }
  });

  revalidatePath("/dashboard/admin/shifts");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20oprettet.");
}

export async function deleteShiftAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const shiftId = String(formData.get("shiftId") ?? "");

  if (!shiftId) {
    redirect("/dashboard/admin/shifts?error=Vagten%20kunne%20ikke%20slettes.");
  }

  await prisma.driverShift.delete({ where: { id: shiftId } });
  revalidatePath("/dashboard/admin/shifts");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20slettet.");
}

export async function updateShiftAction(shiftId: string, formData: FormData) {
  await requireUser(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = driverShiftSchema.safeParse({
    ...raw,
    endTime: raw.endTime || addHoursToTime(String(raw.startTime ?? ""), 2)
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const overlap = await findOverlappingBusShift({ ...parsed.data, excludeShiftId: shiftId });

  if (overlap) {
    redirect(`/dashboard/admin/shifts/${shiftId}?error=Den%20bus%20er%20allerede%20booket%20i%20det%20tidsrum.`);
  }

  await prisma.driverShift.update({
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

  revalidatePath("/dashboard/admin/shifts");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20opdateret.");
}
