"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?success=Beskederne%20er%20markeret%20som%20l%C3%A6st.");
}
