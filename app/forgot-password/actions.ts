"use server";

import { redirect } from "next/navigation";
import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken, PASSWORD_RESET_MAX_AGE_MS } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
    select: { id: true, email: true, name: true }
  });

  if (user) {
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) }
      }
    });

    if (!recentToken) {
      const { token, tokenHash } = createPasswordResetToken();

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_MAX_AGE_MS)
          }
        })
      ]);

      await sendPasswordResetEmail(user, token);
    }
  }

  redirect("/forgot-password?sent=1");
}
