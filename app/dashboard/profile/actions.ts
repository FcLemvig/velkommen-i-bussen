"use server";

import { redirect } from "next/navigation";
import { createSession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, profileSchema } from "@/lib/validation";

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/profile?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!currentUser || !(await verifyPassword(parsed.data.currentPassword, currentUser.passwordHash))) {
    redirect("/dashboard/profile?error=Den%20nuv%C3%A6rende%20adgangskode%20er%20forkert.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);

  redirect("/dashboard/profile?success=Adgangskoden%20er%20%C3%A6ndret.");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/profile?error=" + encodeURIComponent(parsed.error.issues[0].message));
  await prisma.$transaction(async (tx) => {
    if (user.citizenProfile) await tx.citizenProfile.update({ where: { userId: user.id }, data: parsed.data });
    if (user.driverProfile)
      await tx.driverProfile.update({ where: { userId: user.id }, data: { phone: parsed.data.phone } });
    if (!user.citizenProfile && user.organizationProfile)
      await tx.organizationProfile.update({ where: { userId: user.id }, data: parsed.data });
  });
  redirect("/dashboard/profile?success=" + encodeURIComponent("Dine kontaktoplysninger er gemt."));
}
