"use server";

import { redirect } from "next/navigation";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation";

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/dashboard/profile?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  });

  if (!currentUser || !(await verifyPassword(parsed.data.currentPassword, currentUser.passwordHash))) {
    redirect("/dashboard/profile?error=Den%20nuv%C3%A6rende%20adgangskode%20er%20forkert.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword)
    }
  });

  redirect("/dashboard/profile?success=Adgangskoden%20er%20%C3%A6ndret.");
}
