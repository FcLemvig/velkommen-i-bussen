"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { addHoursToTime } from "@/lib/shifts";
import { prisma } from "@/lib/prisma";
import { driverShiftSchema } from "@/lib/validation";

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

  await prisma.driverShift.create({
    data: {
      shiftDate: new Date(`${parsed.data.date}T00:00:00`),
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

  await prisma.driverShift.update({
    where: { id: shiftId },
    data: {
      shiftDate: new Date(`${parsed.data.date}T00:00:00`),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes,
      driverProfileId: driverProfileId || null
    }
  });

  revalidatePath("/dashboard/admin/shifts");
  redirect("/dashboard/admin/shifts?success=Vagten%20er%20opdateret.");
}
