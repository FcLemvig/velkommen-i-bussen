import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
export const vapidPublicKey = vapidPrivateKey ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "" : "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://velkommen-i-bussen.vercel.app";

if (vapidPrivateKey && vapidPublicKey) {
  webPush.setVapidDetails(`mailto:info@frivilligcenterlemvig.dk`, vapidPublicKey, vapidPrivateKey);
}

export async function sendPushToUser(userId: string, title: string, body: string, href = "/dashboard/notifications") {
  if (!vapidPrivateKey || !vapidPublicKey) {
    console.info(`[push skipped] ${title} -> ${userId}`);
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title,
            body,
            href: new URL(href, appUrl).toString(),
          }),
        );
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
          return;
        }

        console.error("[push error]", error);
      }
    }),
  );
}
