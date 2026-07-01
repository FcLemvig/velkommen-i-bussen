"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveDriverImage } from "@/lib/uploads";
import { createDriverSchema, driverSchema } from "@/lib/validation";

export async function createDriverAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  let imageUrl: string | undefined;

  try {
    imageUrl = await saveDriverImage(formData.get("image") as File | null);
  } catch (error) {
    redirect(`/dashboard/admin/drivers/new?error=${encodeURIComponent(error instanceof Error ? error.message : "Billedet kunne ikke uploades.")}`);
  }

  const parsed = createDriverSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/drivers/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: "DRIVER",
        driverProfile: {
          create: {
            phone: parsed.data.phone,
            licenseNumber: parsed.data.licenseNumber,
            imageUrl,
            notes: parsed.data.notes,
            isActive: parsed.data.isActive
          }
        },
        membership: { create: { status: "ACTIVE" } }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/dashboard/admin/drivers/new?error=Emailen%20er%20allerede%20i%20brug.");
    }

    redirect("/dashboard/admin/drivers/new?error=Chauff%C3%B8ren%20kunne%20ikke%20oprettes.");
  }

  revalidatePath("/dashboard/admin/drivers");
  redirect("/dashboard/admin/drivers");
}

export async function updateDriverAction(driverProfileId: string, formData: FormData) {
  await requireUser(["ADMIN"]);
  let imageUrl: string | undefined;

  try {
    imageUrl = await saveDriverImage(formData.get("image") as File | null);
  } catch (error) {
    redirect(`/dashboard/admin/drivers/${driverProfileId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Billedet kunne ikke uploades.")}`);
  }

  const parsed = driverSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/drivers/${driverProfileId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  try {
    await prisma.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        phone: parsed.data.phone,
        licenseNumber: parsed.data.licenseNumber,
        ...(imageUrl ? { imageUrl } : {}),
        notes: parsed.data.notes,
        isActive: parsed.data.isActive,
        user: {
          update: {
            name: parsed.data.name,
            email: parsed.data.email.toLowerCase()
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/dashboard/admin/drivers/${driverProfileId}?error=Emailen%20er%20allerede%20i%20brug.`);
    }

    redirect(`/dashboard/admin/drivers/${driverProfileId}?error=Chauff%C3%B8ren%20kunne%20ikke%20opdateres.`);
  }

  revalidatePath("/dashboard/admin/drivers");
  redirect("/dashboard/admin/drivers");
}
