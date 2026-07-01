"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { createSession, dashboardPathForRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  let dashboardPath = "/dashboard/citizen";

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: "CITIZEN",
        citizenProfile: { create: { phone: parsed.data.phone } },
        membership: { create: { status: "ACTIVE" } }
      }
    });

    await createSession(user.id);
    dashboardPath = dashboardPathForRole(user.role);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/register?error=Der%20findes%20allerede%20en%20profil%20med%20den%20email.");
    }

    redirect("/register?error=Profilen%20kunne%20ikke%20oprettes.%20Prøv%20igen.");
  }

  redirect(dashboardPath);
}
