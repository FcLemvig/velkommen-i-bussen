"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

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

export async function savePushSubscriptionAction(subscription: BrowserPushSubscription, userAgent?: string) {
  const user = await requireUser();

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return {
      ok: false,
      message: "Push kunne ikke slås til på denne enhed."
    };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent
    },
    update: {
      userId: user.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent
    }
  });

  revalidatePath("/dashboard/notifications");

  return {
    ok: true,
    message: "Push-notifikationer er slået til på denne enhed."
  };
}

export async function updateDriverNotificationPreferencesAction(formData: FormData) {
  const user = await requireUser(["DRIVER"]);

  await prisma.driverNotificationPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      newShifts: formData.get("newShifts") === "on",
      assignedRides: formData.get("assignedRides") === "on",
      rideChanges: formData.get("rideChanges") === "on"
    },
    update: {
      newShifts: formData.get("newShifts") === "on",
      assignedRides: formData.get("assignedRides") === "on",
      rideChanges: formData.get("rideChanges") === "on"
    }
  });

  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?success=Indstillingerne%20er%20gemt.");
}
