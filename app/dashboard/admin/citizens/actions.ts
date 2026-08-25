"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateMembershipAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("membershipStatus") ?? "");
  const type = String(formData.get("membershipType") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "citizens") === "organizations" ? "organizations" : "citizens";

  if (!userId || !["PENDING_PAYMENT", "ACTIVE", "PAUSED", "ENDED"].includes(status) || !["INDIVIDUAL", "FAMILY", "ORGANIZATION"].includes(type)) {
    redirect(`/dashboard/admin/${returnTo}?error=Medlemskabet%20kunne%20ikke%20opdateres.`);
  }

  await prisma.membership.upsert({
    where: { userId },
    create: {
      userId,
      status,
      type,
      startsAt: status === "ACTIVE" ? new Date() : undefined
    },
    update: {
      status,
      type,
      startsAt: status === "ACTIVE" ? new Date() : undefined
    }
  });

  revalidatePath("/dashboard/admin/citizens");
  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/profile");
  redirect(`/dashboard/admin/${returnTo}?success=Medlemskabet%20er%20opdateret.`);
}
