"use server";

import { redirect } from "next/navigation";
import { createSession, dashboardPathForRole, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    redirect("/login?error=Email%20eller%20adgangskode%20er%20forkert.");
  }

  await createSession(user.id);
  redirect(dashboardPathForRole(user.role));
}
