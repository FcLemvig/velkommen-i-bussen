"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation";

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const rawToken = formData.get("token");
    const token = typeof rawToken === "string" ? rawToken : "";
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true }
  });

  if (!resetToken || resetToken.expiresAt <= new Date()) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    redirect("/reset-password?invalid=1");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
    prisma.session.deleteMany({ where: { userId: resetToken.userId } })
  ]);

  redirect("/login?passwordReset=1");
}
