import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export type DriverNotificationType = "NEW_SHIFTS" | "ASSIGNED_RIDES" | "RIDE_CHANGES";

type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  href?: string;
  driverType?: DriverNotificationType;
};

function preferenceFieldForType(type: DriverNotificationType) {
  if (type === "NEW_SHIFTS") return "newShifts";
  if (type === "ASSIGNED_RIDES") return "assignedRides";
  return "rideChanges";
}

async function driverAllowsNotification(userId: string, type?: DriverNotificationType) {
  if (!type) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      driverNotificationPreference: true
    }
  });

  if (user?.role !== "DRIVER") return true;

  const preferences = user.driverNotificationPreference;
  if (!preferences) return true;

  return preferences[preferenceFieldForType(type)];
}

async function filterAllowedNotifications(inputs: NotificationInput[]) {
  const checks = await Promise.all(
    inputs.map(async (input) => ({
      input,
      allowed: await driverAllowsNotification(input.userId, input.driverType)
    }))
  );

  return checks.filter((check) => check.allowed).map((check) => check.input);
}

export async function createNotification(input: NotificationInput) {
  try {
    const allowed = await driverAllowsNotification(input.userId, input.driverType);
    if (!allowed) return;

    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href
      }
    });
    await sendPushToUser(input.userId, input.title, input.body, input.href);
  } catch (error) {
    console.error("[notification error]", error);
  }
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;

  try {
    const allowedInputs = await filterAllowedNotifications(inputs);
    if (allowedInputs.length === 0) return;

    await prisma.notification.createMany({
      data: allowedInputs.map((input) => ({
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href
      }))
    });
    await Promise.all(allowedInputs.map((input) => sendPushToUser(input.userId, input.title, input.body, input.href)));
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

export async function notifyActiveDrivers(
  title: string,
  body: string,
  href = "/dashboard/driver",
  driverType: DriverNotificationType = "NEW_SHIFTS"
) {
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
      href,
      driverType
    }))
  );
}
