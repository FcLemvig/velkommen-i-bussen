"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateMembershipAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("membershipStatus") ?? "");

  if (!userId || !["PENDING_PAYMENT", "ACTIVE", "PAUSED", "ENDED"].includes(status)) {
    redirect("/dashboard/admin/citizens?error=Medlemskabet%20kunne%20ikke%20opdateres.");
  }

  await prisma.membership.upsert({
    where: { userId },
    create: {
      userId,
      status,
      startsAt: status === "ACTIVE" ? new Date() : undefined
    },
    update: {
      status,
      startsAt: status === "ACTIVE" ? new Date() : undefined
    }
  });

  revalidatePath("/dashboard/admin/citizens");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin/citizens?success=Medlemskabet%20er%20opdateret.");
}
