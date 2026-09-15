"use server";

import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser } from "@/lib/auth";
import { sendDriverWelcomeEmail } from "@/lib/email";
import { createPasswordResetToken, DRIVER_INVITE_MAX_AGE_MS } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { saveDriverImage } from "@/lib/uploads";
import { driverSchema } from "@/lib/validation";

export async function createDriverAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  let imageUrl: string | undefined;

  try {
    imageUrl = await saveDriverImage(formData.get("image") as File | null);
  } catch (error) {
    redirect(`/dashboard/admin/drivers/new?error=${encodeURIComponent(error instanceof Error ? error.message : "Billedet kunne ikke uploades.")}`);
  }

  const parsed = driverSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    redirect(`/dashboard/admin/drivers/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { driverProfile: true }
  });

  if (existingUser?.driverProfile) {
    redirect("/dashboard/admin/drivers/new?error=Brugeren%20er%20allerede%20oprettet%20som%20chauff%C3%B8r.");
  }

  let setupToken: string | undefined;

  try {
    if (existingUser) {
      await prisma.driverProfile.create({
        data: {
          userId: existingUser.id,
          phone: parsed.data.phone,
          licenseNumber: parsed.data.licenseNumber,
          imageUrl,
          notes: parsed.data.notes,
          isActive: parsed.data.isActive
        }
      });
    } else {
      const invite = createPasswordResetToken();
      setupToken = invite.token;
      const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: parsed.data.name,
            email,
            passwordHash,
            role: "DRIVER",
            driverProfile: {
              create: {
                phone: parsed.data.phone,
                licenseNumber: parsed.data.licenseNumber,
                imageUrl,
                notes: parsed.data.notes,
                isActive: parsed.data.isActive
              }
            }
          }
        });

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: invite.tokenHash,
            expiresAt: new Date(Date.now() + DRIVER_INVITE_MAX_AGE_MS)
          }
        });
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/dashboard/admin/drivers/new?error=Emailen%20er%20allerede%20i%20brug.");
    }

    redirect("/dashboard/admin/drivers/new?error=Chauff%C3%B8ren%20kunne%20ikke%20oprettes.");
  }

  const emailSent = await sendDriverWelcomeEmail(
    { email, name: parsed.data.name },
    setupToken
  );

  revalidatePath("/dashboard/admin/drivers");
  const message = emailSent
    ? "Chaufføren er oprettet, og velkomstmailen er sendt."
    : "Chaufføren er oprettet, men velkomstmailen kunne ikke sendes. Kontroller emailopsætningen.";
  redirect(`/dashboard/admin/drivers?${emailSent ? "success" : "error"}=${encodeURIComponent(message)}`);
}

export async function addCitizenAccessAction(driverProfileId: string, formData: FormData) {
  await requireUser(["ADMIN"]);
  const phone = String(formData.get("citizenPhone") ?? "").trim();
  const address = String(formData.get("citizenAddress") ?? "").trim();
  const membershipType = String(formData.get("membershipType") ?? "INDIVIDUAL");

  if (phone.length < 8 || address.length < 3 || !["INDIVIDUAL", "FAMILY"].includes(membershipType)) {
    redirect(`/dashboard/admin/drivers/${driverProfileId}?error=Udfyld%20telefon%2C%20adresse%20og%20medlemskabstype.`);
  }

  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { user: { include: { citizenProfile: true } } }
  });

  if (!driver || driver.user.citizenProfile) {
    redirect(`/dashboard/admin/drivers/${driverProfileId}?error=Borgeradgangen%20kunne%20ikke%20tilf%C3%B8jes.`);
  }

  await prisma.$transaction([
    prisma.citizenProfile.create({
      data: { userId: driver.userId, phone, address }
    }),
    prisma.membership.upsert({
      where: { userId: driver.userId },
      create: { userId: driver.userId, type: membershipType, status: "PENDING_PAYMENT" },
      update: { type: membershipType, status: "PENDING_PAYMENT", endsAt: null }
    })
  ]);

  revalidatePath(`/dashboard/admin/drivers/${driverProfileId}`);
  revalidatePath("/dashboard/admin/citizens");
  redirect(`/dashboard/admin/drivers/${driverProfileId}?success=Borgeradgang%20og%20medlemskab%20er%20tilf%C3%B8jet.`);
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
            email: parsed.data.email.toLowerCase(),
            ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {})
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
