import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  href?: string;
};

export async function createNotification(input: NotificationInput) {
  try {
    await prisma.notification.create({
      data: input
    });
    await sendPushToUser(input.userId, input.title, input.body, input.href);
  } catch (error) {
    console.error("[notification error]", error);
  }
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: inputs
    });
    await Promise.all(inputs.map((input) => sendPushToUser(input.userId, input.title, input.body, input.href)));
  } catch (error) {
    console.error("[notification error]", error);
  }
}

export async function notifyAdmins(title: string, body: string, href = "/dashboard/admin") {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true }
  });

  await createNotifications(
    admins.map((admin) => ({
      userId: admin.id,
      title,
      body,
      href
    }))
  );
}

export async function notifyActiveDrivers(title: string, body: string, href = "/dashboard/driver") {
  const drivers = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      driverProfile: {
        isActive: true
      }
    },
    select: { id: true }
  });

  await createNotifications(
    drivers.map((driver) => ({
      userId: driver.id,
      title,
      body,
      href
    }))
  );
}
